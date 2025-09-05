/**
 * Post Creation Page Object Model
 * Handles post composition, template selection, and content optimization
 */

import { BasePage } from './base-page.js';

export class PostCreationPage extends BasePage {
  constructor(page) {
    super(page);
    
    this.selectors = {
      // Main components
      postCreationHeader: '[data-testid="post-creation-header"]',
      contentEditor: '[data-testid="content-editor"]',
      templateSelector: '[data-testid="template-selector"]',
      platformSelector: '[data-testid="platform-selector"]',
      
      // Content editor
      titleInput: '[data-testid="post-title-input"]',
      contentTextarea: '[data-testid="post-content-textarea"]',
      hashtagInput: '[data-testid="hashtag-input"]',
      mediaUpload: '[data-testid="media-upload"]',
      
      // Template system
      templateGrid: '[data-testid="template-grid"]',
      templateCard: '[data-testid="template-card"]',
      templatePreview: '[data-testid="template-preview"]',
      useTemplateButton: '[data-testid="use-template-button"]',
      
      // Platform selection
      platformOptions: '[data-testid="platform-options"]',
      platformCard: '[data-testid="platform-card"]',
      selectedPlatforms: '[data-testid="selected-platforms"]',
      
      // Optimization features
      contentOptimizer: '[data-testid="content-optimizer"]',
      optimizationSuggestions: '[data-testid="optimization-suggestions"]',
      aiSuggestions: '[data-testid="ai-suggestions"]',
      sentimentAnalysis: '[data-testid="sentiment-analysis"]',
      keywordSuggestions: '[data-testid="keyword-suggestions"]',
      
      // Quality assessment
      qualityScore: '[data-testid="quality-score"]',
      engagementPrediction: '[data-testid="engagement-prediction"]',
      readabilityScore: '[data-testid="readability-score"]',
      
      // Scheduling
      schedulingOptions: '[data-testid="scheduling-options"]',
      publishNowButton: '[data-testid="publish-now-button"]',
      scheduleButton: '[data-testid="schedule-button"]',
      saveDraftButton: '[data-testid="save-draft-button"]',
      
      // Preview
      previewPanel: '[data-testid="preview-panel"]',
      previewContent: '[data-testid="preview-content"]',
      previewPlatform: '[data-testid="preview-platform"]',
      
      // Success states
      publishSuccess: '[data-testid="publish-success"]',
      scheduleSuccess: '[data-testid="schedule-success"]',
      draftSaved: '[data-testid="draft-saved"]'
    };
  }

  /**
   * Navigate to post creation page
   */
  async navigate() {
    await this.navigateTo('/create-post');
    await this.waitForElement(this.selectors.postCreationHeader);
  }

  /**
   * Create a basic post
   * @param {Object} postData - Post content and settings
   */
  async createPost(postData) {
    await this.waitForElement(this.selectors.contentEditor);
    
    // Fill in basic content
    if (postData.title) {
      await this.fill(this.selectors.titleInput, postData.title);
    }
    
    if (postData.content) {
      await this.fill(this.selectors.contentTextarea, postData.content);
    }
    
    // Add hashtags
    if (postData.hashtags) {
      const hashtagsText = Array.isArray(postData.hashtags) 
        ? postData.hashtags.join(' ') 
        : postData.hashtags;
      await this.fill(this.selectors.hashtagInput, hashtagsText);
    }
    
    // Upload media if provided
    if (postData.mediaFiles) {
      await this.uploadMedia(postData.mediaFiles);
    }
    
    // Select platforms
    if (postData.platforms) {
      await this.selectPlatforms(postData.platforms);
    }
    
    // Wait for content optimization to complete
    await this.waitForOptimization();
  }

  /**
   * Select and use a template
   * @param {string} templateName - Name of the template to use
   */
  async selectTemplate(templateName) {
    await this.waitForElement(this.selectors.templateSelector);
    await this.click(this.selectors.templateSelector);
    
    // Wait for template grid to load
    await this.waitForElement(this.selectors.templateGrid);
    
    // Find and select the template
    const templateCard = await this.page.locator(this.selectors.templateCard)
      .filter({ hasText: templateName });
    
    if (await templateCard.count() === 0) {
      throw new Error(`Template "${templateName}" not found`);
    }
    
    await templateCard.click();
    
    // Preview the template
    await this.waitForElement(this.selectors.templatePreview);
    
    // Use the template
    await this.click(this.selectors.useTemplateButton);
    
    // Wait for template to be applied
    await this.waitForElement('[data-testid="template-applied"]');
  }

  /**
   * Select platforms for posting
   * @param {Array<string>} platforms - Array of platform names
   */
  async selectPlatforms(platforms) {
    await this.waitForElement(this.selectors.platformOptions);
    
    for (const platform of platforms) {
      const platformCard = await this.page.locator(this.selectors.platformCard)
        .filter({ hasText: platform });
      
      if (await platformCard.count() > 0) {
        await platformCard.click();
      }
    }
    
    // Verify platforms are selected
    const selectedCount = await this.page.locator(this.selectors.selectedPlatforms + ' .platform-selected').count();
    if (selectedCount !== platforms.length) {
      console.warn(`Expected ${platforms.length} platforms selected, got ${selectedCount}`);
    }
  }

  /**
   * Upload media files
   * @param {Array<string>} filePaths - Paths to media files
   */
  async uploadMedia(filePaths) {
    const fileInput = await this.page.locator(this.selectors.mediaUpload + ' input[type="file"]');
    
    if (Array.isArray(filePaths)) {
      await fileInput.setInputFiles(filePaths);
    } else {
      await fileInput.setInputFiles([filePaths]);
    }
    
    // Wait for upload to complete
    await this.waitForElement('[data-testid="media-upload-complete"]');
  }

  /**
   * Get optimization suggestions
   */
  async getOptimizationSuggestions() {
    await this.waitForElement(this.selectors.contentOptimizer);
    
    const suggestions = {
      ai: [],
      keywords: [],
      sentiment: null,
      quality: null
    };
    
    // Get AI suggestions
    const aiSuggestionElements = await this.page.locator(this.selectors.aiSuggestions + ' .suggestion-item').all();
    for (const element of aiSuggestionElements) {
      suggestions.ai.push(await element.textContent());
    }
    
    // Get keyword suggestions
    const keywordElements = await this.page.locator(this.selectors.keywordSuggestions + ' .keyword-item').all();
    for (const element of keywordElements) {
      suggestions.keywords.push(await element.textContent());
    }
    
    // Get sentiment analysis
    if (await this.isVisible(this.selectors.sentimentAnalysis)) {
      suggestions.sentiment = await this.getTextContent(this.selectors.sentimentAnalysis + ' .sentiment-value');
    }
    
    return suggestions;
  }

  /**
   * Get quality assessment scores
   */
  async getQualityAssessment() {
    const assessment = {};
    
    if (await this.isVisible(this.selectors.qualityScore)) {
      const scoreText = await this.getTextContent(this.selectors.qualityScore);
      assessment.quality = this.parseScore(scoreText);
    }
    
    if (await this.isVisible(this.selectors.engagementPrediction)) {
      const engagementText = await this.getTextContent(this.selectors.engagementPrediction);
      assessment.engagement = this.parseScore(engagementText);
    }
    
    if (await this.isVisible(this.selectors.readabilityScore)) {
      const readabilityText = await this.getTextContent(this.selectors.readabilityScore);
      assessment.readability = this.parseScore(readabilityText);
    }
    
    return assessment;
  }

  /**
   * Apply optimization suggestion
   * @param {number} suggestionIndex - Index of suggestion to apply
   */
  async applyOptimizationSuggestion(suggestionIndex) {
    const suggestionElements = await this.page.locator(this.selectors.optimizationSuggestions + ' .suggestion-item').all();
    
    if (suggestionIndex >= suggestionElements.length) {
      throw new Error(`Suggestion index ${suggestionIndex} out of range`);
    }
    
    const suggestion = suggestionElements[suggestionIndex];
    const applyButton = await suggestion.locator('.apply-suggestion-button');
    await applyButton.click();
    
    // Wait for suggestion to be applied
    await this.waitForElement('[data-testid="suggestion-applied"]');
  }

  /**
   * Preview post for specific platform
   * @param {string} platform - Platform to preview for
   */
  async previewPost(platform) {
    await this.waitForElement(this.selectors.previewPanel);
    
    // Select platform for preview
    if (platform) {
      const platformSelector = await this.page.locator(this.selectors.previewPlatform);
      await platformSelector.selectOption(platform);
    }
    
    // Wait for preview to update
    await this.waitForElement(this.selectors.previewContent);
    
    return {
      content: await this.getTextContent(this.selectors.previewContent),
      platform: await this.page.locator(this.selectors.previewPlatform).inputValue()
    };
  }

  /**
   * Publish post immediately
   */
  async publishNow() {
    await this.click(this.selectors.publishNowButton);
    
    // Confirm publication if needed
    const confirmButton = '[data-testid="confirm-publish-button"]';
    if (await this.isVisible(confirmButton)) {
      await this.click(confirmButton);
    }
    
    // Wait for success confirmation
    await this.waitForElement(this.selectors.publishSuccess);
    
    return await this.getTextContent(this.selectors.publishSuccess);
  }

  /**
   * Schedule post for later
   * @param {Date|string} scheduledTime - When to schedule the post
   */
  async schedulePost(scheduledTime) {
    await this.click(this.selectors.scheduleButton);
    
    // Wait for scheduling modal
    await this.waitForElement('[data-testid="scheduling-modal"]');
    
    // Set scheduled time
    if (scheduledTime instanceof Date) {
      await this.setScheduleDateTime(scheduledTime);
    } else {
      await this.fill('[data-testid="schedule-time-input"]', scheduledTime);
    }
    
    // Confirm scheduling
    await this.click('[data-testid="confirm-schedule-button"]');
    
    // Wait for success confirmation
    await this.waitForElement(this.selectors.scheduleSuccess);
    
    return await this.getTextContent(this.selectors.scheduleSuccess);
  }

  /**
   * Save post as draft
   */
  async saveDraft() {
    await this.click(this.selectors.saveDraftButton);
    
    // Wait for save confirmation
    await this.waitForElement(this.selectors.draftSaved);
    
    return await this.getTextContent(this.selectors.draftSaved);
  }

  /**
   * Wait for content optimization to complete
   */
  async waitForOptimization() {
    // Wait for optimization spinner to disappear
    await this.waitForElementHidden('[data-testid="optimization-loading"]');
    
    // Wait for quality scores to be calculated
    await this.waitForElement(this.selectors.qualityScore);
  }

  /**
   * Set scheduled date and time
   * @param {Date} dateTime - Date and time to schedule
   */
  async setScheduleDateTime(dateTime) {
    const dateInput = '[data-testid="schedule-date-input"]';
    const timeInput = '[data-testid="schedule-time-input"]';
    
    const dateStr = dateTime.toISOString().split('T')[0];
    const timeStr = dateTime.toTimeString().slice(0, 5);
    
    await this.fill(dateInput, dateStr);
    await this.fill(timeInput, timeStr);
  }

  /**
   * Parse score from text (e.g., "Quality Score: 85%" -> 85)
   * @param {string} scoreText - Text containing score
   */
  parseScore(scoreText) {
    const match = scoreText.match(/(\d+)%?/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Get current post content
   */
  async getCurrentContent() {
    return {
      title: await this.page.locator(this.selectors.titleInput).inputValue(),
      content: await this.page.locator(this.selectors.contentTextarea).inputValue(),
      hashtags: await this.page.locator(this.selectors.hashtagInput).inputValue()
    };
  }

  /**
   * Check if post has unsaved changes
   */
  async hasUnsavedChanges() {
    return await this.isVisible('[data-testid="unsaved-changes-indicator"]');
  }
}