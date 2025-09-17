/**
 * Billing Service for Claude Code SDK Cost Tracking
 *
 * Handles accurate billing calculation, prevents double-charging,
 * manages billing periods, and generates invoices
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { CostTracker, TokenUsage, CostSession } from './CostTracker';
import { CostDatabaseManager } from '../database/models/CostModel';

export interface BillingConfig {
  pricing: {
    inputTokenPrice: number;    // per 1M tokens
    outputTokenPrice: number;   // per 1M tokens
    cacheCreationPrice: number; // per 1M tokens
    cacheReadPrice: number;     // per 1M tokens
  };
  billing: {
    cyclePeriod: 'monthly' | 'weekly' | 'daily';
    gracePeriod: number; // milliseconds
    minimumCharge: number;
    roundingPrecision: number;
  };
  deduplication: {
    enabled: boolean;
    retentionPeriod: number; // milliseconds
  };
  invoicing: {
    autoGenerate: boolean;
    emailEnabled: boolean;
    webhookUrl?: string;
  };
}

export interface BillingPeriod {
  id: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  status: 'active' | 'closed' | 'billed' | 'disputed' | 'cancelled';
  usage: {
    totalCost: number;
    totalTokens: TokenUsage;
    sessionCount: number;
    stepCount: number;
    averageCostPerSession: number;
    averageCostPerStep: number;
  };
  billing: {
    subtotal: number;
    taxes: number;
    discounts: number;
    total: number;
    currency: string;
  };
  invoiceId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  billingPeriodId: string;
  userId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  lineItems: InvoiceLineItem[];
  summary: {
    subtotal: number;
    taxes: number;
    discounts: number;
    total: number;
    currency: string;
  };
  paymentTerms: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  metadata?: Record<string, any>;
}

export interface ChargeRecord {
  id: string;
  messageId: string;
  sessionId: string;
  userId: string;
  stepId: string;
  billingPeriodId: string;
  cost: number;
  tokens: TokenUsage;
  chargedAt: Date;
  reversedAt?: Date;
  reversalReason?: string;
  metadata?: Record<string, any>;
}

export interface DeduplicationRecord {
  messageId: string;
  sessionId: string;
  chargeRecordId: string;
  processedAt: Date;
  cost: number;
}

export class BillingService extends EventEmitter {
  private config: BillingConfig;
  private costTracker: CostTracker;
  private dbManager: CostDatabaseManager;
  private chargeRecords: Map<string, ChargeRecord> = new Map();
  private deduplicationMap: Map<string, DeduplicationRecord> = new Map();
  private activeBillingPeriods: Map<string, BillingPeriod> = new Map();
  private billingInterval?: NodeJS.Timeout;

  constructor(
    costTracker: CostTracker,
    dbManager: CostDatabaseManager,
    config: Partial<BillingConfig> = {}
  ) {
    super();

    this.costTracker = costTracker;
    this.dbManager = dbManager;
    this.config = {
      pricing: {
        inputTokenPrice: 3.00,
        outputTokenPrice: 15.00,
        cacheCreationPrice: 3.75,
        cacheReadPrice: 0.30
      },
      billing: {
        cyclePeriod: 'monthly',
        gracePeriod: 86400000, // 24 hours
        minimumCharge: 0.01,
        roundingPrecision: 4
      },
      deduplication: {
        enabled: true,
        retentionPeriod: 2592000000 // 30 days
      },
      invoicing: {
        autoGenerate: true,
        emailEnabled: false
      },
      ...config
    };

    this.setupEventListeners();
    this.loadActiveBillingPeriods();
    this.startBillingCycle();
  }

  private setupEventListeners(): void {
    // Listen for step tracking events to create charges
    this.costTracker.on('stepTracked', async (stepUsage) => {
      try {
        await this.processCharge(stepUsage);
      } catch (error) {
        console.error('Error processing charge:', error);
        this.emit('chargeProcessingError', { stepUsage, error });
      }
    });

    // Listen for session events
    this.costTracker.on('sessionStarted', (session) => {
      this.ensureBillingPeriod(session.userId);
    });

    this.costTracker.on('sessionEnded', async (sessionInfo) => {
      try {
        await this.finalizeSessionCharges(sessionInfo.sessionId);
      } catch (error) {
        console.error('Error finalizing session charges:', error);
      }
    });
  }

  /**
   * Process a charge for step usage with deduplication
   */
  private async processCharge(stepUsage: any): Promise<ChargeRecord | null> {
    const { messageId, sessionId, userId, stepId, tokens, cost } = stepUsage;

    // Check for deduplication
    if (this.config.deduplication.enabled && this.isChargeProcessed(messageId)) {
      console.log(`Charge for message ${messageId} already processed, skipping...`);
      return null;
    }

    // Ensure billing period exists
    const billingPeriod = this.ensureBillingPeriod(userId);

    // Calculate precise cost
    const preciseTokens: TokenUsage = {
      inputTokens: tokens.inputTokens || 0,
      outputTokens: tokens.outputTokens || 0,
      totalTokens: (tokens.inputTokens || 0) + (tokens.outputTokens || 0),
      cacheCreationTokens: tokens.cacheCreationTokens || 0,
      cacheReadTokens: tokens.cacheReadTokens || 0
    };

    const preciseCost = this.calculatePreciseCost(preciseTokens);

    // Create charge record
    const chargeRecord: ChargeRecord = {
      id: uuidv4(),
      messageId,
      sessionId,
      userId,
      stepId,
      billingPeriodId: billingPeriod.id,
      cost: this.roundCost(preciseCost),
      tokens: preciseTokens,
      chargedAt: new Date(),
      metadata: {
        originalCost: cost,
        calculatedCost: preciseCost,
        model: stepUsage.model,
        tool: stepUsage.tool,
        stepType: stepUsage.stepType
      }
    };

    // Store charge record
    this.chargeRecords.set(chargeRecord.id, chargeRecord);

    // Add to deduplication map
    this.deduplicationMap.set(messageId, {
      messageId,
      sessionId,
      chargeRecordId: chargeRecord.id,
      processedAt: new Date(),
      cost: chargeRecord.cost
    });

    // Update billing period
    this.updateBillingPeriod(billingPeriod, chargeRecord);

    // Emit events
    this.emit('chargeProcessed', chargeRecord);

    // Check for billing thresholds
    this.checkBillingThresholds(billingPeriod);

    return chargeRecord;
  }

  /**
   * Check if a charge has already been processed
   */
  private isChargeProcessed(messageId: string): boolean {
    if (this.deduplicationMap.has(messageId)) {
      return true;
    }

    // Check database for existing charge
    return this.dbManager.isMessageProcessed(messageId);
  }

  /**
   * Calculate precise cost based on token usage
   */
  private calculatePreciseCost(tokens: TokenUsage): number {
    const inputCost = (tokens.inputTokens / 1_000_000) * this.config.pricing.inputTokenPrice;
    const outputCost = (tokens.outputTokens / 1_000_000) * this.config.pricing.outputTokenPrice;
    const cacheCreationCost = (tokens.cacheCreationTokens / 1_000_000) * this.config.pricing.cacheCreationPrice;
    const cacheReadCost = (tokens.cacheReadTokens / 1_000_000) * this.config.pricing.cacheReadPrice;

    return inputCost + outputCost + cacheCreationCost + cacheReadCost;
  }

  /**
   * Round cost to specified precision
   */
  private roundCost(cost: number): number {
    const factor = Math.pow(10, this.config.billing.roundingPrecision);
    return Math.round(cost * factor) / factor;
  }

  /**
   * Ensure billing period exists for user
   */
  private ensureBillingPeriod(userId: string): BillingPeriod {
    // Check if active billing period exists
    const existingPeriod = Array.from(this.activeBillingPeriods.values())
      .find(period => period.userId === userId && period.status === 'active');

    if (existingPeriod) {
      return existingPeriod;
    }

    // Create new billing period
    const now = new Date();
    const periodStart = this.calculatePeriodStart(now);
    const periodEnd = this.calculatePeriodEnd(periodStart);

    const billingPeriod: BillingPeriod = {
      id: uuidv4(),
      userId,
      periodStart,
      periodEnd,
      status: 'active',
      usage: {
        totalCost: 0,
        totalTokens: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cacheCreationTokens: 0,
          cacheReadTokens: 0
        },
        sessionCount: 0,
        stepCount: 0,
        averageCostPerSession: 0,
        averageCostPerStep: 0
      },
      billing: {
        subtotal: 0,
        taxes: 0,
        discounts: 0,
        total: 0,
        currency: 'USD'
      },
      createdAt: now,
      updatedAt: now
    };

    this.activeBillingPeriods.set(billingPeriod.id, billingPeriod);

    // Store in database
    this.dbManager.insertBillingPeriod({
      id: billingPeriod.id,
      user_id: userId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      total_cost: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cache_creation_tokens: 0,
      total_cache_read_tokens: 0,
      session_count: 0,
      step_count: 0,
      status: 'active'
    });

    this.emit('billingPeriodCreated', billingPeriod);

    return billingPeriod;
  }

  /**
   * Update billing period with new charge
   */
  private updateBillingPeriod(billingPeriod: BillingPeriod, chargeRecord: ChargeRecord): void {
    billingPeriod.usage.totalCost += chargeRecord.cost;
    billingPeriod.usage.totalTokens.inputTokens += chargeRecord.tokens.inputTokens;
    billingPeriod.usage.totalTokens.outputTokens += chargeRecord.tokens.outputTokens;
    billingPeriod.usage.totalTokens.cacheCreationTokens += chargeRecord.tokens.cacheCreationTokens;
    billingPeriod.usage.totalTokens.cacheReadTokens += chargeRecord.tokens.cacheReadTokens;
    billingPeriod.usage.totalTokens.totalTokens =
      billingPeriod.usage.totalTokens.inputTokens + billingPeriod.usage.totalTokens.outputTokens;
    billingPeriod.usage.stepCount++;

    // Update averages
    if (billingPeriod.usage.sessionCount > 0) {
      billingPeriod.usage.averageCostPerSession = billingPeriod.usage.totalCost / billingPeriod.usage.sessionCount;
    }
    billingPeriod.usage.averageCostPerStep = billingPeriod.usage.totalCost / billingPeriod.usage.stepCount;

    // Update billing totals
    billingPeriod.billing.subtotal = billingPeriod.usage.totalCost;
    billingPeriod.billing.total = billingPeriod.billing.subtotal + billingPeriod.billing.taxes - billingPeriod.billing.discounts;

    billingPeriod.updatedAt = new Date();

    this.emit('billingPeriodUpdated', billingPeriod);
  }

  /**
   * Finalize charges for a completed session
   */
  private async finalizeSessionCharges(sessionId: string): Promise<void> {
    const sessionCharges = Array.from(this.chargeRecords.values())
      .filter(charge => charge.sessionId === sessionId);

    if (sessionCharges.length === 0) return;

    const billingPeriodId = sessionCharges[0].billingPeriodId;
    const billingPeriod = this.activeBillingPeriods.get(billingPeriodId);

    if (billingPeriod) {
      billingPeriod.usage.sessionCount++;
      this.updateBillingPeriod(billingPeriod, { cost: 0 } as ChargeRecord);
    }

    this.emit('sessionChargesFinalized', {
      sessionId,
      chargeCount: sessionCharges.length,
      totalCost: sessionCharges.reduce((sum, charge) => sum + charge.cost, 0)
    });
  }

  /**
   * Reverse a charge (for corrections or refunds)
   */
  public async reverseCharge(chargeId: string, reason: string): Promise<boolean> {
    const chargeRecord = this.chargeRecords.get(chargeId);
    if (!chargeRecord || chargeRecord.reversedAt) {
      return false;
    }

    // Mark as reversed
    chargeRecord.reversedAt = new Date();
    chargeRecord.reversalReason = reason;

    // Update billing period
    const billingPeriod = this.activeBillingPeriods.get(chargeRecord.billingPeriodId);
    if (billingPeriod) {
      billingPeriod.usage.totalCost -= chargeRecord.cost;
      billingPeriod.usage.totalTokens.inputTokens -= chargeRecord.tokens.inputTokens;
      billingPeriod.usage.totalTokens.outputTokens -= chargeRecord.tokens.outputTokens;
      billingPeriod.usage.totalTokens.cacheCreationTokens -= chargeRecord.tokens.cacheCreationTokens;
      billingPeriod.usage.totalTokens.cacheReadTokens -= chargeRecord.tokens.cacheReadTokens;
      billingPeriod.usage.totalTokens.totalTokens =
        billingPeriod.usage.totalTokens.inputTokens + billingPeriod.usage.totalTokens.outputTokens;
      billingPeriod.usage.stepCount--;

      this.updateBillingPeriod(billingPeriod, { cost: 0 } as ChargeRecord);
    }

    // Remove from deduplication map
    this.deduplicationMap.delete(chargeRecord.messageId);

    this.emit('chargeReversed', { chargeRecord, reason });

    return true;
  }

  /**
   * Close billing period and generate invoice
   */
  public async closeBillingPeriod(billingPeriodId: string): Promise<Invoice | null> {
    const billingPeriod = this.activeBillingPeriods.get(billingPeriodId);
    if (!billingPeriod || billingPeriod.status !== 'active') {
      return null;
    }

    // Check minimum charge
    if (billingPeriod.usage.totalCost < this.config.billing.minimumCharge) {
      console.log(`Billing period ${billingPeriodId} below minimum charge, skipping invoice generation`);
      billingPeriod.status = 'closed';
      return null;
    }

    billingPeriod.status = 'closed';
    billingPeriod.updatedAt = new Date();

    // Generate invoice if auto-generate is enabled
    let invoice: Invoice | null = null;
    if (this.config.invoicing.autoGenerate) {
      invoice = await this.generateInvoice(billingPeriod);
    }

    this.emit('billingPeriodClosed', { billingPeriod, invoice });

    return invoice;
  }

  /**
   * Generate invoice for billing period
   */
  public async generateInvoice(billingPeriod: BillingPeriod): Promise<Invoice> {
    const invoiceNumber = this.generateInvoiceNumber(billingPeriod);
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create line items
    const lineItems: InvoiceLineItem[] = [
      {
        id: uuidv4(),
        description: `Claude Code SDK Usage - ${this.formatPeriod(billingPeriod.periodStart, billingPeriod.periodEnd)}`,
        quantity: 1,
        unitPrice: billingPeriod.billing.subtotal,
        total: billingPeriod.billing.subtotal,
        metadata: {
          tokenUsage: billingPeriod.usage.totalTokens,
          sessionCount: billingPeriod.usage.sessionCount,
          stepCount: billingPeriod.usage.stepCount
        }
      }
    ];

    // Add detailed token breakdown if significant usage
    if (billingPeriod.usage.totalTokens.inputTokens > 0) {
      lineItems.push({
        id: uuidv4(),
        description: `Input Tokens (${billingPeriod.usage.totalTokens.inputTokens.toLocaleString()})`,
        quantity: billingPeriod.usage.totalTokens.inputTokens,
        unitPrice: this.config.pricing.inputTokenPrice / 1_000_000,
        total: (billingPeriod.usage.totalTokens.inputTokens / 1_000_000) * this.config.pricing.inputTokenPrice
      });
    }

    if (billingPeriod.usage.totalTokens.outputTokens > 0) {
      lineItems.push({
        id: uuidv4(),
        description: `Output Tokens (${billingPeriod.usage.totalTokens.outputTokens.toLocaleString()})`,
        quantity: billingPeriod.usage.totalTokens.outputTokens,
        unitPrice: this.config.pricing.outputTokenPrice / 1_000_000,
        total: (billingPeriod.usage.totalTokens.outputTokens / 1_000_000) * this.config.pricing.outputTokenPrice
      });
    }

    if (billingPeriod.usage.totalTokens.cacheCreationTokens > 0) {
      lineItems.push({
        id: uuidv4(),
        description: `Cache Creation Tokens (${billingPeriod.usage.totalTokens.cacheCreationTokens.toLocaleString()})`,
        quantity: billingPeriod.usage.totalTokens.cacheCreationTokens,
        unitPrice: this.config.pricing.cacheCreationPrice / 1_000_000,
        total: (billingPeriod.usage.totalTokens.cacheCreationTokens / 1_000_000) * this.config.pricing.cacheCreationPrice
      });
    }

    if (billingPeriod.usage.totalTokens.cacheReadTokens > 0) {
      lineItems.push({
        id: uuidv4(),
        description: `Cache Read Tokens (${billingPeriod.usage.totalTokens.cacheReadTokens.toLocaleString()})`,
        quantity: billingPeriod.usage.totalTokens.cacheReadTokens,
        unitPrice: this.config.pricing.cacheReadPrice / 1_000_000,
        total: (billingPeriod.usage.totalTokens.cacheReadTokens / 1_000_000) * this.config.pricing.cacheReadPrice
      });
    }

    const invoice: Invoice = {
      id: uuidv4(),
      billingPeriodId: billingPeriod.id,
      userId: billingPeriod.userId,
      invoiceNumber,
      issueDate,
      dueDate,
      status: 'draft',
      lineItems,
      summary: {
        subtotal: billingPeriod.billing.subtotal,
        taxes: billingPeriod.billing.taxes,
        discounts: billingPeriod.billing.discounts,
        total: billingPeriod.billing.total,
        currency: billingPeriod.billing.currency
      },
      paymentTerms: 'Net 30',
      notes: `Invoice for Claude Code SDK usage during ${this.formatPeriod(billingPeriod.periodStart, billingPeriod.periodEnd)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Update billing period with invoice reference
    billingPeriod.invoiceId = invoice.id;
    billingPeriod.status = 'billed';

    this.emit('invoiceGenerated', invoice);

    return invoice;
  }

  private generateInvoiceNumber(billingPeriod: BillingPeriod): string {
    const year = billingPeriod.periodStart.getFullYear();
    const month = String(billingPeriod.periodStart.getMonth() + 1).padStart(2, '0');
    const userId = billingPeriod.userId.substring(0, 8).toUpperCase();
    return `CC-${year}${month}-${userId}`;
  }

  private formatPeriod(start: Date, end: Date): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  }

  private calculatePeriodStart(date: Date): Date {
    const start = new Date(date);

    switch (this.config.billing.cyclePeriod) {
      case 'monthly':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        break;
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
    }

    return start;
  }

  private calculatePeriodEnd(start: Date): Date {
    const end = new Date(start);

    switch (this.config.billing.cyclePeriod) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'daily':
        end.setHours(23, 59, 59, 999);
        break;
    }

    return end;
  }

  private checkBillingThresholds(billingPeriod: BillingPeriod): void {
    // Check if period should be closed
    const now = new Date();
    if (now >= billingPeriod.periodEnd) {
      this.closeBillingPeriod(billingPeriod.id);
    }

    // Check cost thresholds for alerts
    const costThresholds = [100, 500, 1000, 5000];
    for (const threshold of costThresholds) {
      if (billingPeriod.usage.totalCost >= threshold) {
        this.emit('billingThresholdReached', {
          billingPeriod,
          threshold,
          currentCost: billingPeriod.usage.totalCost
        });
        break;
      }
    }
  }

  private loadActiveBillingPeriods(): void {
    // In a real implementation, load from database
    console.log('Loading active billing periods from database...');
  }

  private startBillingCycle(): void {
    // Check for period closures every hour
    this.billingInterval = setInterval(() => {
      this.processBillingCycle();
    }, 3600000); // 1 hour
  }

  private processBillingCycle(): void {
    const now = new Date();

    for (const billingPeriod of this.activeBillingPeriods.values()) {
      if (billingPeriod.status === 'active' && now >= billingPeriod.periodEnd) {
        this.closeBillingPeriod(billingPeriod.id);
      }
    }

    // Clean up old deduplication records
    this.cleanupDeduplicationRecords();
  }

  private cleanupDeduplicationRecords(): void {
    if (!this.config.deduplication.enabled) return;

    const cutoff = new Date(Date.now() - this.config.deduplication.retentionPeriod);

    for (const [messageId, record] of this.deduplicationMap.entries()) {
      if (record.processedAt < cutoff) {
        this.deduplicationMap.delete(messageId);
      }
    }
  }

  // Public API methods

  public getBillingPeriod(userId: string): BillingPeriod | null {
    return Array.from(this.activeBillingPeriods.values())
      .find(period => period.userId === userId && period.status === 'active') || null;
  }

  public getBillingHistory(userId: string, limit = 12): BillingPeriod[] {
    // In a real implementation, query database
    return Array.from(this.activeBillingPeriods.values())
      .filter(period => period.userId === userId)
      .sort((a, b) => b.periodStart.getTime() - a.periodStart.getTime())
      .slice(0, limit);
  }

  public getChargeRecords(sessionId: string): ChargeRecord[] {
    return Array.from(this.chargeRecords.values())
      .filter(charge => charge.sessionId === sessionId && !charge.reversedAt);
  }

  public getUserCharges(userId: string, startDate?: Date, endDate?: Date): ChargeRecord[] {
    return Array.from(this.chargeRecords.values())
      .filter(charge => {
        if (charge.userId !== userId || charge.reversedAt) return false;
        if (startDate && charge.chargedAt < startDate) return false;
        if (endDate && charge.chargedAt > endDate) return false;
        return true;
      });
  }

  public getBillingStats(userId?: string): {
    totalCharges: number;
    totalCost: number;
    averageChargeAmount: number;
    chargesThisMonth: number;
    costThisMonth: number;
    activeBillingPeriods: number;
  } {
    const charges = userId
      ? Array.from(this.chargeRecords.values()).filter(c => c.userId === userId && !c.reversedAt)
      : Array.from(this.chargeRecords.values()).filter(c => !c.reversedAt);

    const totalCost = charges.reduce((sum, charge) => sum + charge.cost, 0);
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyCharges = charges.filter(charge => charge.chargedAt >= thisMonth);
    const monthlyCost = monthlyCharges.reduce((sum, charge) => sum + charge.cost, 0);

    return {
      totalCharges: charges.length,
      totalCost,
      averageChargeAmount: charges.length > 0 ? totalCost / charges.length : 0,
      chargesThisMonth: monthlyCharges.length,
      costThisMonth: monthlyCost,
      activeBillingPeriods: this.activeBillingPeriods.size
    };
  }

  public updatePricing(pricing: Partial<BillingConfig['pricing']>): void {
    this.config.pricing = { ...this.config.pricing, ...pricing };
    this.emit('pricingUpdated', this.config.pricing);
  }

  public previewInvoice(billingPeriodId: string): Partial<Invoice> | null {
    const billingPeriod = this.activeBillingPeriods.get(billingPeriodId);
    if (!billingPeriod) return null;

    return {
      billingPeriodId,
      userId: billingPeriod.userId,
      summary: {
        subtotal: billingPeriod.billing.subtotal,
        taxes: billingPeriod.billing.taxes,
        discounts: billingPeriod.billing.discounts,
        total: billingPeriod.billing.total,
        currency: billingPeriod.billing.currency
      },
      lineItems: [{
        id: 'preview',
        description: `Claude Code SDK Usage - ${this.formatPeriod(billingPeriod.periodStart, billingPeriod.periodEnd)}`,
        quantity: 1,
        unitPrice: billingPeriod.billing.subtotal,
        total: billingPeriod.billing.subtotal
      }]
    };
  }

  public getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    details: Record<string, any>;
  } {
    const activeCharges = this.chargeRecords.size;
    const activePeriods = this.activeBillingPeriods.size;
    const deduplicationEntries = this.deduplicationMap.size;
    const totalCost = Array.from(this.chargeRecords.values())
      .reduce((sum, charge) => sum + (charge.reversedAt ? 0 : charge.cost), 0);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (activePeriods > 1000 || deduplicationEntries > 100000) {
      status = 'critical';
    } else if (activePeriods > 500 || deduplicationEntries > 50000) {
      status = 'warning';
    }

    return {
      status,
      details: {
        activeCharges,
        activePeriods,
        deduplicationEntries,
        totalCost,
        deduplicationEnabled: this.config.deduplication.enabled,
        autoInvoicing: this.config.invoicing.autoGenerate
      }
    };
  }

  public stop(): void {
    if (this.billingInterval) {
      clearInterval(this.billingInterval);
    }
    this.removeAllListeners();
  }
}