/**
 * Change Verification Workflow
 * Manages user approval process for test changes and integrates with version control
 */

import { EventEmitter } from 'events';
import {
  ChangeVerification,
  Approval,
  VerificationStatus,
  TestExecution,
  TestResult
} from '../types';

interface WorkflowConfig {
  requireApprovals: number;
  approvers: string[];
  autoApprove: {
    enabled: boolean;
    conditions: {
      onlyNewTests?: boolean;
      maxFailureIncrease?: number;
      requiresAllPassing?: boolean;
    };
  };
  notifications: {
    enabled: boolean;
    channels: string[];
  };
}

interface AuditEntry {
  id: string;
  changeId: string;
  action: string;
  actor: string;
  timestamp: Date;
  details: Record<string, any>;
  metadata?: Record<string, any>;
}

export class ChangeVerificationWorkflow extends EventEmitter {
  private verifications = new Map<string, ChangeVerification>();
  private auditLog: AuditEntry[] = [];
  private config: WorkflowConfig;

  constructor(config?: Partial<WorkflowConfig>) {
    super();
    
    this.config = {
      requireApprovals: 1,
      approvers: ['pm', 'lead-dev', 'qa-lead'],
      autoApprove: {
        enabled: true,
        conditions: {
          onlyNewTests: true,
          maxFailureIncrease: 0,
          requiresAllPassing: false
        }
      },
      notifications: {
        enabled: true,
        channels: ['slack', 'email']
      },
      ...config
    };
  }

  /**
   * Initialize the workflow
   */
  async initialize(): Promise<void> {
    // Load existing verifications and audit log
    await this.loadPersistedData();
    this.emit('initialized');
  }

  /**
   * Create a new change verification
   */
  async createVerification(
    changeId: string,
    requester?: string,
    description?: string,
    impact?: string,
    testPlan?: string
  ): Promise<ChangeVerification> {
    // Check if verification already exists
    const existing = Array.from(this.verifications.values()).find(v => v.changeId === changeId);
    if (existing) {
      return existing;
    }

    const verification: ChangeVerification = {
      id: this.generateVerificationId(),
      changeId,
      requester: requester || 'system',
      description: description || `Change verification for ${changeId}`,
      impact: impact || 'Unknown impact',
      testPlan: testPlan || 'Standard regression test suite',
      status: VerificationStatus.PENDING,
      approvals: [],
      createdAt: new Date()
    };

    // Check for auto-approval
    if (await this.shouldAutoApprove(verification)) {
      verification.status = VerificationStatus.APPROVED;
      verification.approvedAt = new Date();
      
      this.logAudit(verification.id, 'auto-approved', 'system', {
        reason: 'Met auto-approval criteria'
      });
    } else {
      // Send notifications to approvers
      await this.sendNotifications(verification);
    }

    this.verifications.set(verification.id, verification);
    await this.persistVerification(verification);

    this.logAudit(verification.id, 'created', verification.requester, {
      changeId,
      description,
      status: verification.status
    });

    this.emit('verificationCreated', verification);
    return verification;
  }

  /**
   * Submit an approval or rejection
   */
  async submitApproval(
    verificationId: string,
    approver: string,
    approved: boolean,
    comments?: string
  ): Promise<ChangeVerification> {
    const verification = this.verifications.get(verificationId);
    if (!verification) {
      throw new Error(`Verification ${verificationId} not found`);
    }

    if (verification.status !== VerificationStatus.PENDING && 
        verification.status !== VerificationStatus.IN_REVIEW) {
      throw new Error(`Cannot modify verification in ${verification.status} status`);
    }

    // Check if approver is authorized
    if (!this.config.approvers.includes(approver)) {
      throw new Error(`${approver} is not authorized to approve changes`);
    }

    // Check if approver already submitted
    const existingApproval = verification.approvals.find(a => a.approver === approver);
    if (existingApproval) {
      throw new Error(`${approver} has already submitted an approval`);
    }

    // Add approval
    const approval: Approval = {
      approver,
      status: approved ? 'approved' : 'rejected',
      comments,
      timestamp: new Date()
    };

    verification.approvals.push(approval);
    verification.status = VerificationStatus.IN_REVIEW;

    // Check if we have enough approvals or any rejections
    const approvals = verification.approvals.filter(a => a.status === 'approved');
    const rejections = verification.approvals.filter(a => a.status === 'rejected');

    if (rejections.length > 0) {
      verification.status = VerificationStatus.REJECTED;
    } else if (approvals.length >= this.config.requireApprovals) {
      verification.status = VerificationStatus.APPROVED;
      verification.approvedAt = new Date();
    }

    await this.persistVerification(verification);

    this.logAudit(verification.id, approved ? 'approved' : 'rejected', approver, {
      comments,
      finalStatus: verification.status
    });

    // Send notifications on status change
    if (verification.status === VerificationStatus.APPROVED || 
        verification.status === VerificationStatus.REJECTED) {
      await this.sendStatusNotification(verification);
    }

    this.emit('approvalSubmitted', { verification, approval });
    this.emit('verificationUpdated', verification);

    return verification;
  }

  /**
   * Mark verification as implemented
   */
  async markImplemented(verificationId: string, implementer: string): Promise<ChangeVerification> {
    const verification = this.verifications.get(verificationId);
    if (!verification) {
      throw new Error(`Verification ${verificationId} not found`);
    }

    if (verification.status !== VerificationStatus.APPROVED) {
      throw new Error(`Cannot implement verification that is not approved`);
    }

    verification.status = VerificationStatus.IMPLEMENTED;
    await this.persistVerification(verification);

    this.logAudit(verification.id, 'implemented', implementer, {
      implementationDate: new Date()
    });

    this.emit('verificationImplemented', verification);
    return verification;
  }

  /**
   * Get verification by ID
   */
  async getVerification(verificationId: string): Promise<ChangeVerification | undefined> {
    return this.verifications.get(verificationId);
  }

  /**
   * Get verifications by status
   */
  async getVerificationsByStatus(status: VerificationStatus): Promise<ChangeVerification[]> {
    return Array.from(this.verifications.values()).filter(v => v.status === status);
  }

  /**
   * Get pending approvals for a specific approver
   */
  async getPendingApprovals(approver: string): Promise<ChangeVerification[]> {
    return Array.from(this.verifications.values()).filter(verification => {
      if (verification.status !== VerificationStatus.PENDING && 
          verification.status !== VerificationStatus.IN_REVIEW) {
        return false;
      }

      // Check if this approver has already responded
      const hasResponded = verification.approvals.some(a => a.approver === approver);
      return !hasResponded;
    });
  }

  /**
   * Get audit log for a verification
   */
  async getAuditLog(verificationId?: string): Promise<AuditEntry[]> {
    if (verificationId) {
      return this.auditLog.filter(entry => 
        entry.changeId === verificationId || 
        entry.details.verificationId === verificationId
      );
    }
    return [...this.auditLog].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Analyze verification patterns
   */
  async analyzeVerificationPatterns(): Promise<{
    averageApprovalTime: number;
    approvalRate: number;
    commonRejectionReasons: Array<{ reason: string; count: number }>;
    approverStats: Array<{ approver: string; approved: number; rejected: number }>;
  }> {
    const completedVerifications = Array.from(this.verifications.values()).filter(v => 
      v.status === VerificationStatus.APPROVED || v.status === VerificationStatus.REJECTED
    );

    if (completedVerifications.length === 0) {
      return {
        averageApprovalTime: 0,
        approvalRate: 0,
        commonRejectionReasons: [],
        approverStats: []
      };
    }

    // Calculate average approval time
    const approvedVerifications = completedVerifications.filter(v => v.status === VerificationStatus.APPROVED);
    const approvalTimes = approvedVerifications
      .filter(v => v.approvedAt)
      .map(v => v.approvedAt!.getTime() - v.createdAt.getTime());
    
    const averageApprovalTime = approvalTimes.length > 0 ? 
      approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length : 0;

    // Calculate approval rate
    const approvalRate = approvedVerifications.length / completedVerifications.length * 100;

    // Analyze rejection reasons
    const rejectionReasons = new Map<string, number>();
    const approverStats = new Map<string, { approved: number; rejected: number }>();

    for (const verification of completedVerifications) {
      for (const approval of verification.approvals) {
        // Update approver stats
        if (!approverStats.has(approval.approver)) {
          approverStats.set(approval.approver, { approved: 0, rejected: 0 });
        }
        const stats = approverStats.get(approval.approver)!;
        if (approval.status === 'approved') {
          stats.approved++;
        } else {
          stats.rejected++;
          
          // Track rejection reasons
          const reason = approval.comments || 'No reason provided';
          rejectionReasons.set(reason, (rejectionReasons.get(reason) || 0) + 1);
        }
      }
    }

    const commonRejectionReasons = Array.from(rejectionReasons.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    const approverStatsList = Array.from(approverStats.entries())
      .map(([approver, stats]) => ({ approver, ...stats }));

    return {
      averageApprovalTime,
      approvalRate,
      commonRejectionReasons,
      approverStats: approverStatsList
    };
  }

  /**
   * Clean up old verifications
   */
  async cleanup(retentionDays = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldVerifications = Array.from(this.verifications.entries()).filter(([_, verification]) =>
      verification.createdAt < cutoffDate &&
      (verification.status === VerificationStatus.APPROVED || 
       verification.status === VerificationStatus.REJECTED ||
       verification.status === VerificationStatus.IMPLEMENTED)
    );

    let cleanedCount = 0;
    for (const [id, verification] of oldVerifications) {
      this.verifications.delete(id);
      await this.removePersistentVerification(id);
      cleanedCount++;
    }

    // Clean up audit log
    this.auditLog = this.auditLog.filter(entry => entry.timestamp >= cutoffDate);

    this.emit('cleanupCompleted', { removedVerifications: cleanedCount });
    return cleanedCount;
  }

  // Private helper methods
  private async shouldAutoApprove(verification: ChangeVerification): Promise<boolean> {
    if (!this.config.autoApprove.enabled) return false;

    const { conditions } = this.config.autoApprove;
    
    // Check conditions based on change analysis
    // This would typically involve analyzing the actual changes
    // For now, we'll use simple heuristics

    // If only new tests are being added (would require git analysis)
    if (conditions.onlyNewTests) {
      const isOnlyNewTests = await this.analyzeChangeForNewTestsOnly(verification.changeId);
      if (!isOnlyNewTests) return false;
    }

    // If change has minimal impact
    if (verification.impact === 'Low' || verification.impact === 'Minimal') {
      return true;
    }

    return false;
  }

  private async analyzeChangeForNewTestsOnly(changeId: string): Promise<boolean> {
    // This would typically analyze git changes
    // For now, return false to be conservative
    return false;
  }

  private async sendNotifications(verification: ChangeVerification): Promise<void> {
    if (!this.config.notifications.enabled) return;

    const message = this.buildNotificationMessage(verification);
    
    // Send to configured channels
    for (const channel of this.config.notifications.channels) {
      await this.sendNotificationToChannel(channel, message, verification);
    }
  }

  private async sendStatusNotification(verification: ChangeVerification): Promise<void> {
    if (!this.config.notifications.enabled) return;

    const message = this.buildStatusNotificationMessage(verification);
    
    for (const channel of this.config.notifications.channels) {
      await this.sendNotificationToChannel(channel, message, verification);
    }
  }

  private buildNotificationMessage(verification: ChangeVerification): string {
    return `
🔍 **Change Verification Required**

**Change ID:** ${verification.changeId}
**Requester:** ${verification.requester}
**Description:** ${verification.description}
**Impact:** ${verification.impact}

**Approvals Required:** ${this.config.requireApprovals}
**Approvers:** ${this.config.approvers.join(', ')}

Please review and approve/reject this change verification.
`;
  }

  private buildStatusNotificationMessage(verification: ChangeVerification): string {
    const statusEmoji = verification.status === VerificationStatus.APPROVED ? '✅' : '❌';
    
    return `
${statusEmoji} **Change Verification ${verification.status}**

**Change ID:** ${verification.changeId}
**Status:** ${verification.status}
**Approvals:** ${verification.approvals.length}/${this.config.requireApprovals}

${verification.approvals.map(approval => 
  `- ${approval.approver}: ${approval.status} ${approval.comments ? `(${approval.comments})` : ''}`
).join('\n')}
`;
  }

  private async sendNotificationToChannel(
    channel: string, 
    message: string, 
    verification: ChangeVerification
  ): Promise<void> {
    // Implementation would depend on the notification system
    // For now, just emit an event
    this.emit('notificationSent', { channel, message, verification });
  }

  private logAudit(
    changeId: string, 
    action: string, 
    actor: string, 
    details: Record<string, any>
  ): void {
    const auditEntry: AuditEntry = {
      id: this.generateAuditId(),
      changeId,
      action,
      actor,
      timestamp: new Date(),
      details
    };

    this.auditLog.push(auditEntry);
    this.emit('auditLogged', auditEntry);
  }

  private generateVerificationId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadPersistedData(): Promise<void> {
    // Implementation would load from persistent storage
    // For now, this is a placeholder
  }

  private async persistVerification(verification: ChangeVerification): Promise<void> {
    // Implementation would persist to storage
    // For now, this is a placeholder
  }

  private async removePersistentVerification(verificationId: string): Promise<void> {
    // Implementation would remove from persistent storage
    // For now, this is a placeholder
  }
}