/**
 * Analytics Page Object Model
 * Handles feed analytics, performance metrics, and intelligence dashboards
 */

import { BasePage } from './base-page.js';

export class AnalyticsPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      // Main analytics components
      analyticsHeader: '[data-testid="analytics-header"]',
      overviewMetrics: '[data-testid="overview-metrics"]',
      performanceCharts: '[data-testid="performance-charts"]',
      
      // Overview metrics
      totalEngagement: '[data-testid="total-engagement"]',
      reachMetrics: '[data-testid="reach-metrics"]',
      conversionRate: '[data-testid="conversion-rate"]',
      growthRate: '[data-testid="growth-rate"]',
      
      // Time period selector
      timePeriodSelector: '[data-testid="time-period-selector"]',
      dateRangePicker: '[data-testid="date-range-picker"]',
      
      // Chart containers
      engagementChart: '[data-testid="engagement-chart"]',
      reachChart: '[data-testid="reach-chart"]',
      contentPerformanceChart: '[data-testid="content-performance-chart"]',
      audienceChart: '[data-testid="audience-chart"]',
      
      // Performance tables
      topPostsTable: '[data-testid="top-posts-table"]',
      platformPerformance: '[data-testid="platform-performance"]',
      agentPerformance: '[data-testid="agent-performance"]',
      
      // Intelligence features
      intelligencePanel: '[data-testid="intelligence-panel"]',
      trendAnalysis: '[data-testid="trend-analysis"]',
      audienceInsights: '[data-testid="audience-insights"]',
      optimizationRecommendations: '[data-testid="optimization-recommendations"]',
      
      // Filters
      filterPanel: '[data-testid="filter-panel"]',
      platformFilter: '[data-testid="platform-filter"]',
      agentFilter: '[data-testid="agent-filter"]',
      contentTypeFilter: '[data-testid="content-type-filter"]',
      
      // Export/Report
      exportButton: '[data-testid="export-button"]',
      reportGenerator: '[data-testid="report-generator"]',
      
      // Real-time data
      realTimeIndicator: '[data-testid="real-time-indicator"]',
      lastUpdated: '[data-testid="last-updated"]'
    };
  }

  /**
   * Navigate to analytics page
   */
  async navigate() {
    await this.navigateTo('/analytics');
    await this.waitForElement(this.selectors.analyticsHeader);
    await this.waitForDataLoad();
  }

  /**
   * Get overview metrics
   */
  async getOverviewMetrics() {
    await this.waitForElement(this.selectors.overviewMetrics);
    
    return {
      totalEngagement: await this.getMetricValue(this.selectors.totalEngagement),
      reach: await this.getMetricValue(this.selectors.reachMetrics),
      conversionRate: await this.getMetricValue(this.selectors.conversionRate),
      growthRate: await this.getMetricValue(this.selectors.growthRate)
    };
  }

  /**
   * Set time period for analytics
   * @param {string} period - Time period (7d, 30d, 90d, 1y)
   */
  async setTimePeriod(period) {
    await this.click(this.selectors.timePeriodSelector);
    await this.click(`[data-testid="period-${period}"]`);
    
    // Wait for data to refresh
    await this.waitForDataLoad();
  }

  /**
   * Set custom date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  async setDateRange(startDate, endDate) {
    await this.click(this.selectors.dateRangePicker);
    
    // Set start date
    await this.fill('[data-testid="start-date-input"]', this.formatDate(startDate));
    
    // Set end date
    await this.fill('[data-testid="end-date-input"]', this.formatDate(endDate));
    
    // Apply date range
    await this.click('[data-testid="apply-date-range"]');
    
    await this.waitForDataLoad();
  }

  /**
   * Get engagement chart data
   */
  async getEngagementChartData() {
    await this.waitForElement(this.selectors.engagementChart);
    
    return await this.evaluateScript(() => {
      const chart = document.querySelector('[data-testid="engagement-chart"] canvas');
      if (!chart) return null;
      
      // Extract chart data from chart.js or similar library
      const chartInstance = chart.chart || chart._chart;
      return chartInstance ? chartInstance.data : null;
    });
  }

  /**
   * Get top performing posts
   * @param {number} limit - Number of top posts to retrieve
   */
  async getTopPosts(limit = 10) {
    await this.waitForElement(this.selectors.topPostsTable);
    
    const rows = await this.page.locator(this.selectors.topPostsTable + ' tbody tr').all();
    const posts = [];
    
    const actualLimit = Math.min(limit, rows.length);
    
    for (let i = 0; i < actualLimit; i++) {
      const row = rows[i];
      const cells = await row.locator('td').all();
      
      const post = {
        title: await cells[0]?.textContent(),
        platform: await cells[1]?.textContent(),
        engagement: await cells[2]?.textContent(),
        reach: await cells[3]?.textContent(),
        date: await cells[4]?.textContent()
      };
      
      posts.push(post);
    }
    
    return posts;
  }

  /**
   * Get platform performance comparison
   */
  async getPlatformPerformance() {
    await this.waitForElement(this.selectors.platformPerformance);
    
    const platformCards = await this.page.locator(this.selectors.platformPerformance + ' .platform-card').all();
    const performance = [];
    
    for (const card of platformCards) {
      const platform = await card.locator('.platform-name').textContent();
      const engagement = await card.locator('.engagement-rate').textContent();
      const reach = await card.locator('.reach-count').textContent();
      const posts = await card.locator('.posts-count').textContent();
      
      performance.push({
        platform: platform?.trim(),
        engagement: this.parseMetric(engagement),
        reach: this.parseMetric(reach),
        posts: this.parseMetric(posts)
      });
    }
    
    return performance;
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformance() {
    await this.waitForElement(this.selectors.agentPerformance);
    
    const agentRows = await this.page.locator(this.selectors.agentPerformance + ' tbody tr').all();
    const performance = [];
    
    for (const row of agentRows) {
      const cells = await row.locator('td').all();
      
      const agent = {
        name: await cells[0]?.textContent(),
        posts: this.parseMetric(await cells[1]?.textContent()),
        engagement: this.parseMetric(await cells[2]?.textContent()),
        reach: this.parseMetric(await cells[3]?.textContent()),
        efficiency: this.parseMetric(await cells[4]?.textContent())
      };
      
      performance.push(agent);
    }
    
    return performance;
  }

  /**
   * Get intelligence insights
   */
  async getIntelligenceInsights() {
    await this.waitForElement(this.selectors.intelligencePanel);
    
    const insights = {
      trends: await this.getTrendAnalysis(),
      audience: await this.getAudienceInsights(),
      recommendations: await this.getOptimizationRecommendations()
    };
    
    return insights;
  }

  /**
   * Get trend analysis
   */
  async getTrendAnalysis() {
    const trendElements = await this.page.locator(this.selectors.trendAnalysis + ' .trend-item').all();
    const trends = [];
    
    for (const element of trendElements) {
      const trend = await element.locator('.trend-title').textContent();
      const direction = await element.locator('.trend-direction').textContent();
      const impact = await element.locator('.trend-impact').textContent();
      
      trends.push({
        trend: trend?.trim(),
        direction: direction?.trim(),
        impact: impact?.trim()
      });
    }
    
    return trends;
  }

  /**
   * Get audience insights
   */
  async getAudienceInsights() {
    const insightElements = await this.page.locator(this.selectors.audienceInsights + ' .insight-item').all();
    const insights = [];
    
    for (const element of insightElements) {
      const category = await element.locator('.insight-category').textContent();
      const value = await element.locator('.insight-value').textContent();
      const description = await element.locator('.insight-description').textContent();
      
      insights.push({
        category: category?.trim(),
        value: value?.trim(),
        description: description?.trim()
      });
    }
    
    return insights;
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations() {
    const recommendationElements = await this.page.locator(this.selectors.optimizationRecommendations + ' .recommendation-item').all();
    const recommendations = [];
    
    for (const element of recommendationElements) {
      const title = await element.locator('.recommendation-title').textContent();
      const description = await element.locator('.recommendation-description').textContent();
      const priority = await element.locator('.recommendation-priority').textContent();
      
      recommendations.push({
        title: title?.trim(),
        description: description?.trim(),
        priority: priority?.trim()
      });
    }
    
    return recommendations;
  }

  /**
   * Apply filters
   * @param {Object} filters - Filter configuration
   */
  async applyFilters(filters) {
    await this.click(this.selectors.filterPanel);
    
    if (filters.platforms) {
      await this.selectMultipleOptions(this.selectors.platformFilter, filters.platforms);
    }
    
    if (filters.agents) {
      await this.selectMultipleOptions(this.selectors.agentFilter, filters.agents);
    }
    
    if (filters.contentTypes) {
      await this.selectMultipleOptions(this.selectors.contentTypeFilter, filters.contentTypes);
    }
    
    // Apply filters
    await this.click('[data-testid="apply-filters"]');
    await this.waitForDataLoad();
  }

  /**
   * Export analytics data
   * @param {string} format - Export format (pdf, csv, xlsx)
   */
  async exportData(format = 'pdf') {
    await this.click(this.selectors.exportButton);
    
    // Select export format
    await this.click(`[data-testid="export-${format}"]`);
    
    // Wait for export to complete
    await this.waitForElement('[data-testid="export-complete"]');
    
    // Return download information
    return {
      format,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
  }

  /**
   * Generate custom report
   * @param {Object} reportConfig - Report configuration
   */
  async generateReport(reportConfig) {
    await this.click(this.selectors.reportGenerator);
    
    // Configure report
    if (reportConfig.title) {
      await this.fill('[data-testid="report-title-input"]', reportConfig.title);
    }
    
    if (reportConfig.metrics) {
      for (const metric of reportConfig.metrics) {
        await this.click(`[data-testid="metric-${metric}"]`);
      }
    }
    
    if (reportConfig.includeCharts) {
      await this.click('[data-testid="include-charts-checkbox"]');
    }
    
    if (reportConfig.includeTables) {
      await this.click('[data-testid="include-tables-checkbox"]');
    }
    
    // Generate report
    await this.click('[data-testid="generate-report-button"]');
    
    // Wait for generation to complete
    await this.waitForElement('[data-testid="report-generated"]');
    
    return {
      title: reportConfig.title,
      timestamp: new Date().toISOString(),
      status: 'generated'
    };
  }

  /**
   * Check if real-time data is active
   */
  async isRealTimeActive() {
    return await this.isVisible(this.selectors.realTimeIndicator + '.active');
  }

  /**
   * Get last updated timestamp
   */
  async getLastUpdated() {
    if (await this.isVisible(this.selectors.lastUpdated)) {
      return await this.getTextContent(this.selectors.lastUpdated);
    }
    return null;
  }

  /**
   * Wait for analytics data to load
   */
  async waitForDataLoad() {
    // Wait for loading spinners to disappear
    await this.waitForElementHidden('[data-testid="analytics-loading"]');
    
    // Wait for main metrics to be visible
    await this.waitForElement(this.selectors.overviewMetrics);
    
    // Wait for charts to render
    await this.page.waitForFunction(() => {
      const charts = document.querySelectorAll('[data-testid*="chart"] canvas');
      return charts.length > 0;
    }, { timeout: 30000 });
  }

  /**
   * Helper method to get metric value from element
   * @param {string} selector - Element selector
   */
  async getMetricValue(selector) {
    const text = await this.getTextContent(selector);
    return this.parseMetric(text);
  }

  /**
   * Helper method to parse metric text
   * @param {string} text - Metric text
   */
  parseMetric(text) {
    if (!text) return null;
    
    // Remove commas and extract numbers
    const cleanText = text.replace(/,/g, '');
    const match = cleanText.match(/([\d.]+)([%KMB]?)/);
    
    if (!match) return text.trim();
    
    let value = parseFloat(match[1]);
    const unit = match[2];
    
    // Convert units
    switch (unit) {
      case 'K': value *= 1000; break;
      case 'M': value *= 1000000; break;
      case 'B': value *= 1000000000; break;
      case '%': break; // Keep as percentage
      default: break;
    }
    
    return unit === '%' ? `${value}%` : Math.round(value);
  }

  /**
   * Helper method to format date
   * @param {Date} date - Date to format
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Helper method to select multiple options
   * @param {string} selector - Select element selector
   * @param {Array<string>} options - Options to select
   */
  async selectMultipleOptions(selector, options) {
    for (const option of options) {
      await this.click(`${selector} [data-value="${option}"]`);
    }
  }
}