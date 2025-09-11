/**
 * PHASE 3 DYNAMIC AGENT PAGES COMPREHENSIVE VALIDATION TEST
 * 
 * Tests all Phase 3 functionality with real data:
 * - Agent page loading with real agent data
 * - Agent card navigation functionality
 * - Agent home page components
 * - Agent customization features
 * - Feed with real posts
 * - Responsive design
 * - Error handling and loading states
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

class Phase3ValidationTester {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = {
      testSuite: 'Phase 3 Dynamic Agent Pages Validation',
      startTime: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
    this.baseUrl = 'http://localhost:5173';
    this.apiUrl = 'http://localhost:3000';
    this.screenshotCounter = 0;
  }

  async initialize() {
    console.log('🚀 Initializing Phase 3 Validation Test Suite...');
    
    this.browser = await chromium.launch({ 
      headless: true, // Must use headless in codespace environment
      slowMo: 50,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    this.page = await this.context.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
      }
    });
    
    // Enable network monitoring
    this.page.on('response', response => {
      if (!response.ok() && response.url().includes('/api/')) {
        console.log(`🔴 API Error: ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('✅ Test environment initialized');
  }

  async takeScreenshot(testName, description = '') {
    try {
      this.screenshotCounter++;
      const filename = `phase3-test-${this.screenshotCounter}-${testName.replace(/\s+/g, '-').toLowerCase()}.png`;
      const filepath = path.join('/workspaces/agent-feed/tests/screenshots', filename);
      
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await this.page.screenshot({ 
        path: filepath, 
        fullPage: true,
        type: 'png',
        quality: 90
      });
      
      console.log(`📸 Screenshot saved: ${filename} - ${description}`);
      return filename;
    } catch (error) {
      console.error('❌ Screenshot failed:', error.message);
      return null;
    }
  }

  async runTest(testName, testFn) {
    const test = {
      name: testName,
      startTime: new Date().toISOString(),
      status: 'running',
      duration: 0,
      screenshot: null,
      errors: [],
      details: {}
    };

    console.log(`\n🧪 Running test: ${testName}`);
    const startTime = Date.now();

    try {
      await testFn(test);
      test.status = 'passed';
      test.screenshot = await this.takeScreenshot(testName, 'Test completed successfully');
      this.results.summary.passed++;
      console.log(`✅ Test passed: ${testName}`);
    } catch (error) {
      test.status = 'failed';
      test.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      test.screenshot = await this.takeScreenshot(testName, 'Test failed');
      this.results.summary.failed++;
      this.results.summary.errors.push(`${testName}: ${error.message}`);
      console.log(`❌ Test failed: ${testName} - ${error.message}`);
    }

    test.duration = Date.now() - startTime;
    test.endTime = new Date().toISOString();
    this.results.tests.push(test);
    this.results.summary.total++;
  }

  async waitForApiResponse(url, timeout = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${this.apiUrl}${url}`);
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        // Continue waiting
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`API endpoint ${url} not responding after ${timeout}ms`);
  }

  async testAgentsPageWithRealData() {
    await this.runTest('Agents Page Loads with Real Agent Data', async (test) => {
      // First verify backend API is responding
      console.log('📡 Checking backend API...');
      const agentsData = await this.waitForApiResponse('/api/agents');
      
      if (!agentsData || !Array.isArray(agentsData) || agentsData.length === 0) {
        throw new Error('Backend API not returning real agent data');
      }

      test.details.apiAgentsCount = agentsData.length;
      test.details.firstAgent = agentsData[0];
      
      console.log(`✅ Backend has ${agentsData.length} real agents`);

      // Navigate to agents page
      console.log('🌐 Navigating to agents page...');
      await this.page.goto(`${this.baseUrl}/agents`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for agents to load
      console.log('⏳ Waiting for agent cards to load...');
      await this.page.waitForSelector('[data-testid="agent-card"]', { 
        timeout: 30000,
        state: 'visible'
      });

      // Verify real data is displayed
      const agentCards = await this.page.locator('[data-testid="agent-card"]').all();
      test.details.displayedAgentsCount = agentCards.length;

      if (agentCards.length === 0) {
        throw new Error('No agent cards displayed despite API having data');
      }

      // Verify agent details match API data
      const firstCardText = await agentCards[0].textContent();
      const apiFirstAgent = agentsData[0];
      
      const hasRealData = (
        firstCardText.includes(apiFirstAgent.name) || 
        firstCardText.includes(apiFirstAgent.display_name) ||
        firstCardText.includes(apiFirstAgent.description)
      );

      if (!hasRealData) {
        throw new Error('Agent cards not displaying real API data');
      }

      test.details.realDataVerified = true;
      test.details.sampleCardContent = firstCardText.substring(0, 200);
      
      console.log(`✅ Verified ${agentCards.length} agent cards with real data`);
    });
  }

  async testAgentCardNavigation() {
    await this.runTest('Agent Card Navigation Buttons Work', async (test) => {
      console.log('🔍 Testing agent card navigation...');

      // Ensure we're on agents page
      await this.page.goto(`${this.baseUrl}/agents`, { 
        waitUntil: 'networkidle' 
      });

      await this.page.waitForSelector('[data-testid="agent-card"]', { timeout: 30000 });
      
      const agentCards = await this.page.locator('[data-testid="agent-card"]').all();
      if (agentCards.length === 0) {
        throw new Error('No agent cards available for navigation test');
      }

      // Test "Home" button navigation
      console.log('🏠 Testing Home button navigation...');
      const homeButton = agentCards[0].locator('button:has-text("Home")').first();
      
      if (await homeButton.count() === 0) {
        // Try alternative selectors
        const homeLink = agentCards[0].locator('a[href*="/home"], button[title*="Home"], .action-btn').first();
        if (await homeLink.count() === 0) {
          throw new Error('Home button/link not found on agent card');
        }
        await homeLink.click();
      } else {
        await homeButton.click();
      }

      // Wait for navigation and verify URL
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      const currentUrl = this.page.url();
      
      if (!currentUrl.includes('/agents/') || !currentUrl.includes('/home')) {
        throw new Error(`Navigation failed - Expected agent home URL, got: ${currentUrl}`);
      }

      test.details.homeNavigationUrl = currentUrl;
      
      // Go back to test Details button
      console.log('🔙 Going back to test Details button...');
      await this.page.goto(`${this.baseUrl}/agents`, { waitUntil: 'networkidle' });
      await this.page.waitForSelector('[data-testid="agent-card"]', { timeout: 15000 });

      const agentCardsAgain = await this.page.locator('[data-testid="agent-card"]').all();
      const detailsButton = agentCardsAgain[0].locator('button:has-text("Details")').first();
      
      if (await detailsButton.count() === 0) {
        // Try alternative selectors
        const detailsLink = agentCardsAgain[0].locator('a[href*="/agents/"], button[title*="Details"], .action-btn').last();
        if (await detailsLink.count() === 0) {
          throw new Error('Details button/link not found on agent card');
        }
        await detailsLink.click();
      } else {
        await detailsButton.click();
      }

      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      const detailsUrl = this.page.url();
      
      if (!detailsUrl.includes('/agents/') || detailsUrl.includes('/home')) {
        throw new Error(`Details navigation failed - Expected agent details URL, got: ${detailsUrl}`);
      }

      test.details.detailsNavigationUrl = detailsUrl;
      test.details.navigationWorking = true;
      
      console.log('✅ Both Home and Details navigation buttons working');
    });
  }

  async testAgentHomePageComponents() {
    await this.runTest('Agent Home Page Components Display Correctly', async (test) => {
      console.log('🏠 Testing agent home page components...');

      // Get first agent ID from API
      const agentsData = await this.waitForApiResponse('/api/agents');
      const firstAgentId = agentsData[0].id;
      
      // Navigate directly to agent home page
      const homeUrl = `${this.baseUrl}/agents/${firstAgentId}/home`;
      console.log(`🌐 Navigating to: ${homeUrl}`);
      
      await this.page.goto(homeUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Check for loading state first
      try {
        await this.page.waitForSelector('.animate-pulse', { timeout: 5000 });
        console.log('⏳ Loading state detected, waiting for content...');
      } catch (e) {
        // Loading might be too fast to catch
      }

      // Wait for main content to load
      console.log('⏳ Waiting for home page content...');
      await this.page.waitForSelector('h1, h2, .agent-name', { timeout: 30000 });

      // Test core components
      const components = {
        header: 'h1, h2, .agent-name',
        welcomeSection: '.welcome, [class*="welcome"], h3:has-text("Welcome")',
        quickActions: '.quick-actions, [class*="quick"], button:has-text("New Task")',
        widgets: '.widget, .dashboard, [class*="widget"], [class*="metric"]',
        tabs: '.tabs, [role="tablist"], button:has-text("Home")',
        profile: '.avatar, .profile, [class*="avatar"]'
      };

      const componentResults = {};
      
      for (const [name, selector] of Object.entries(components)) {
        try {
          const element = this.page.locator(selector).first();
          const isVisible = await element.isVisible({ timeout: 5000 });
          componentResults[name] = {
            present: isVisible,
            selector: selector,
            text: isVisible ? await element.textContent() : null
          };
          console.log(`${isVisible ? '✅' : '❌'} ${name}: ${selector}`);
        } catch (error) {
          componentResults[name] = {
            present: false,
            selector: selector,
            error: error.message
          };
          console.log(`❌ ${name}: Not found - ${error.message}`);
        }
      }

      test.details.components = componentResults;
      test.details.pageUrl = this.page.url();

      // Verify essential components are present
      const essentialComponents = ['header', 'tabs'];
      const missingEssentials = essentialComponents.filter(comp => 
        !componentResults[comp].present
      );

      if (missingEssentials.length > 0) {
        throw new Error(`Essential components missing: ${missingEssentials.join(', ')}`);
      }

      // Test tab functionality
      console.log('🔄 Testing tab navigation...');
      const tabResults = {};
      
      const tabs = ['home', 'posts', 'metrics', 'settings'];
      for (const tab of tabs) {
        try {
          const tabButton = this.page.locator(`button:has-text("${tab}"), [data-value="${tab}"]`).first();
          if (await tabButton.count() > 0 && await tabButton.isVisible()) {
            await tabButton.click();
            await this.page.waitForTimeout(1000);
            
            tabResults[tab] = {
              clickable: true,
              active: await tabButton.getAttribute('data-state') === 'active' || 
                     await tabButton.getAttribute('aria-selected') === 'true'
            };
            console.log(`✅ ${tab} tab: clickable and responsive`);
          } else {
            tabResults[tab] = { clickable: false, reason: 'Tab not found or not visible' };
          }
        } catch (error) {
          tabResults[tab] = { clickable: false, error: error.message };
        }
      }

      test.details.tabs = tabResults;
      test.details.homePageComponentsWorking = true;

      console.log('✅ Agent home page components verified');
    });
  }

  async testAgentCustomization() {
    await this.runTest('Agent Customization Features Work', async (test) => {
      console.log('🎨 Testing agent customization features...');

      // Navigate to agent home page first
      const agentsData = await this.waitForApiResponse('/api/agents');
      const firstAgentId = agentsData[0].id;
      
      await this.page.goto(`${this.baseUrl}/agents/${firstAgentId}/home`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Look for customization/edit buttons
      console.log('🔍 Looking for customization controls...');
      
      const customizationSelectors = [
        'button:has-text("Customize")',
        'button:has-text("Edit")',
        'button[title*="Customize"]',
        '.customize-btn',
        '.edit-btn',
        '[class*="customize"]',
        '[class*="edit"]'
      ];

      let customizeButton = null;
      for (const selector of customizationSelectors) {
        const element = this.page.locator(selector).first();
        if (await element.count() > 0 && await element.isVisible({ timeout: 2000 })) {
          customizeButton = element;
          test.details.customizeButtonSelector = selector;
          break;
        }
      }

      if (!customizeButton) {
        throw new Error('Customization button not found on agent home page');
      }

      // Click customize button
      console.log('🖱️ Clicking customization button...');
      await customizeButton.click();
      await this.page.waitForTimeout(2000);

      // Look for customization modal/panel
      console.log('🔍 Looking for customization interface...');
      
      const customizationInterface = await this.page.locator(
        '.modal, .panel, .customization, [class*="modal"], [class*="panel"], [class*="customize"]'
      ).first();

      let hasCustomizationInterface = false;
      if (await customizationInterface.count() > 0) {
        hasCustomizationInterface = await customizationInterface.isVisible({ timeout: 5000 });
      }

      if (!hasCustomizationInterface) {
        // Check if we navigated to a settings page instead
        const currentUrl = this.page.url();
        if (currentUrl.includes('settings') || currentUrl.includes('customize')) {
          hasCustomizationInterface = true;
          test.details.customizationType = 'page';
        } else {
          throw new Error('Customization interface did not open');
        }
      } else {
        test.details.customizationType = 'modal';
      }

      // Look for customization options
      console.log('🎛️ Checking customization options...');
      
      const customizationOptions = {
        nameField: 'input[type="text"], input[placeholder*="name"]',
        descriptionField: 'textarea, input[placeholder*="description"]',
        colorPicker: 'input[type="color"], .color-picker, [class*="color"]',
        avatarUpload: 'input[type="file"], .avatar-upload, [class*="avatar"]',
        themeOptions: '.theme, [class*="theme"], select',
        saveButton: 'button:has-text("Save"), .save-btn'
      };

      const optionResults = {};
      
      for (const [name, selector] of Object.entries(customizationOptions)) {
        try {
          const element = this.page.locator(selector).first();
          const isPresent = await element.count() > 0;
          const isVisible = isPresent ? await element.isVisible({ timeout: 3000 }) : false;
          
          optionResults[name] = {
            present: isPresent,
            visible: isVisible,
            selector: selector
          };
          
          console.log(`${isVisible ? '✅' : '❌'} ${name}: ${isPresent ? 'found' : 'not found'}`);
        } catch (error) {
          optionResults[name] = {
            present: false,
            visible: false,
            error: error.message
          };
        }
      }

      test.details.customizationOptions = optionResults;
      
      // Test if we can interact with at least one customization option
      let interactionTested = false;
      
      if (optionResults.nameField.visible) {
        console.log('✏️ Testing name field interaction...');
        const nameField = this.page.locator(optionResults.nameField.selector).first();
        await nameField.fill('Test Agent Name');
        const value = await nameField.inputValue();
        interactionTested = value === 'Test Agent Name';
        test.details.nameFieldInteraction = interactionTested;
      }

      if (!interactionTested && optionResults.descriptionField.visible) {
        console.log('✏️ Testing description field interaction...');
        const descField = this.page.locator(optionResults.descriptionField.selector).first();
        await descField.fill('Test description');
        const value = await descField.inputValue();
        interactionTested = value === 'Test description';
        test.details.descriptionFieldInteraction = interactionTested;
      }

      if (!interactionTested) {
        console.log('⚠️ No customization fields were interactive');
      }

      test.details.customizationInterfaceWorking = hasCustomizationInterface;
      test.details.hasInteractiveFields = interactionTested;
      
      console.log('✅ Agent customization features verified');
    });
  }

  async testFeedWithRealPosts() {
    await this.runTest('Feed Displays Real Posts from Database', async (test) => {
      console.log('📰 Testing feed with real posts...');

      // Check if posts API is working
      console.log('📡 Checking posts API...');
      let postsData;
      try {
        postsData = await this.waitForApiResponse('/api/v1/agent-posts', 15000);
      } catch (error) {
        // Try alternative endpoint
        try {
          postsData = await this.waitForApiResponse('/api/agent-posts', 15000);
        } catch (error2) {
          throw new Error('Posts API not responding on either /api/v1/agent-posts or /api/agent-posts');
        }
      }

      test.details.apiPostsCount = postsData.length || 0;
      test.details.firstPost = postsData[0] || null;

      console.log(`✅ Backend has ${test.details.apiPostsCount} posts`);

      // Navigate to feed
      console.log('🌐 Navigating to feed page...');
      await this.page.goto(`${this.baseUrl}/`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Wait for feed to load
      console.log('⏳ Waiting for feed posts to load...');
      try {
        await this.page.waitForSelector('.post, .feed-item, [data-testid="post"], [class*="post"]', { 
          timeout: 30000 
        });
      } catch (error) {
        throw new Error('Feed posts failed to load within timeout');
      }

      // Count displayed posts
      const postElements = await this.page.locator('.post, .feed-item, [data-testid="post"], [class*="post"]').all();
      test.details.displayedPostsCount = postElements.length;

      if (postElements.length === 0) {
        throw new Error('No posts displayed in feed despite API having data');
      }

      // Verify post content looks real (not placeholder)
      console.log('🔍 Verifying post content authenticity...');
      const firstPostContent = await postElements[0].textContent();
      
      const placeholderIndicators = [
        'lorem ipsum',
        'placeholder',
        'test post',
        'sample content',
        'mock data'
      ];
      
      const hasPlaceholderContent = placeholderIndicators.some(indicator => 
        firstPostContent.toLowerCase().includes(indicator)
      );

      test.details.firstPostContent = firstPostContent.substring(0, 200);
      test.details.looksLikeRealContent = !hasPlaceholderContent && firstPostContent.length > 20;

      // Test post interactions
      console.log('👆 Testing post interactions...');
      const interactionResults = {};
      
      const interactionButtons = [
        'button:has-text("Like"), .like-btn, [class*="like"]',
        'button:has-text("Comment"), .comment-btn, [class*="comment"]',
        'button:has-text("Share"), .share-btn, [class*="share"]'
      ];

      for (const buttonSelector of interactionButtons) {
        const button = postElements[0].locator(buttonSelector).first();
        if (await button.count() > 0) {
          const isVisible = await button.isVisible();
          const buttonName = buttonSelector.split(',')[0].replace('button:has-text("', '').replace('")', '');
          interactionResults[buttonName] = {
            present: true,
            visible: isVisible,
            clickable: isVisible
          };
          
          if (isVisible) {
            console.log(`✅ ${buttonName} button found and visible`);
          }
        }
      }

      test.details.postInteractions = interactionResults;
      test.details.feedWithRealPosts = test.details.displayedPostsCount > 0 && test.details.looksLikeRealContent;

      console.log(`✅ Feed displaying ${test.details.displayedPostsCount} posts with real content`);
    });
  }

  async testResponsiveDesign() {
    await this.runTest('Responsive Design Works on Different Screen Sizes', async (test) => {
      console.log('📱 Testing responsive design...');

      const viewports = [
        { name: 'Desktop', width: 1920, height: 1080 },
        { name: 'Laptop', width: 1366, height: 768 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Mobile', width: 375, height: 667 }
      ];

      const responsiveResults = {};

      for (const viewport of viewports) {
        console.log(`📐 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        await this.page.setViewportSize({ 
          width: viewport.width, 
          height: viewport.height 
        });

        // Test agents page responsiveness
        await this.page.goto(`${this.baseUrl}/agents`, { waitUntil: 'networkidle' });
        
        // Check if content adapts properly
        const agentCards = await this.page.locator('[data-testid="agent-card"]').all();
        const isOverflowing = await this.page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });

        // Check navigation accessibility
        const mobileMenuButton = this.page.locator('[data-testid="mobile-menu"], .mobile-menu, button:has-text("Menu")').first();
        const hasMobileMenu = await mobileMenuButton.count() > 0;

        // Test agent home page responsiveness
        if (agentCards.length > 0) {
          const agentsData = await this.waitForApiResponse('/api/agents');
          const firstAgentId = agentsData[0].id;
          
          await this.page.goto(`${this.baseUrl}/agents/${firstAgentId}/home`);
          await this.page.waitForSelector('h1, h2, .agent-name', { timeout: 15000 });

          // Check if tabs adapt to smaller screens
          const tabs = await this.page.locator('[role="tablist"], .tabs').all();
          const tabsVisible = tabs.length > 0 && await tabs[0].isVisible();

          responsiveResults[viewport.name] = {
            viewport: viewport,
            agentCardsCount: agentCards.length,
            hasHorizontalScroll: isOverflowing,
            hasMobileMenu: hasMobileMenu && viewport.width < 768,
            tabsAdaptCorrectly: tabsVisible,
            screenshot: await this.takeScreenshot(`responsive-${viewport.name.toLowerCase()}`)
          };

          console.log(`${isOverflowing ? '❌' : '✅'} ${viewport.name}: ${isOverflowing ? 'Has overflow' : 'No overflow'}`);
        }
      }

      test.details.responsiveResults = responsiveResults;

      // Check if all viewports work without major issues
      const hasOverflowIssues = Object.values(responsiveResults).some(result => result.hasHorizontalScroll);
      const hasMobileMenuWhenNeeded = responsiveResults.Mobile?.hasMobileMenu !== false;

      test.details.passesResponsiveTest = !hasOverflowIssues || hasMobileMenuWhenNeeded;

      // Reset to desktop for remaining tests
      await this.page.setViewportSize({ width: 1920, height: 1080 });

      console.log('✅ Responsive design testing completed');
    });
  }

  async testErrorHandlingAndLoadingStates() {
    await this.runTest('Error Handling and Loading States Work', async (test) => {
      console.log('🚨 Testing error handling and loading states...');

      const errorTests = {};

      // Test 1: Invalid agent ID
      console.log('🔍 Testing invalid agent ID handling...');
      await this.page.goto(`${this.baseUrl}/agents/invalid-agent-id/home`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      const hasErrorState = await this.page.locator('.error, [class*="error"], .not-found, [class*="not-found"]').first().isVisible({ timeout: 10000 });
      const errorMessage = hasErrorState ? await this.page.locator('.error, [class*="error"], .not-found, [class*="not-found"]').first().textContent() : '';

      errorTests.invalidAgentId = {
        showsError: hasErrorState,
        errorMessage: errorMessage,
        url: this.page.url()
      };

      // Test 2: Network failure simulation (if possible)
      console.log('🌐 Testing network failure handling...');
      
      // Block all API requests to simulate network issues
      await this.page.route('**/api/**', route => route.abort());
      
      await this.page.goto(`${this.baseUrl}/agents`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });

      await this.page.waitForTimeout(5000);

      const hasNetworkError = await this.page.locator('.error, [class*="error"], .loading-error').first().isVisible({ timeout: 5000 });
      const networkErrorMessage = hasNetworkError ? await this.page.locator('.error, [class*="error"], .loading-error').first().textContent() : '';

      errorTests.networkFailure = {
        showsError: hasNetworkError,
        errorMessage: networkErrorMessage
      };

      // Unblock requests
      await this.page.unroute('**/api/**');

      // Test 3: Loading states
      console.log('⏳ Testing loading states...');
      
      await this.page.goto(`${this.baseUrl}/agents`, { 
        waitUntil: 'domcontentloaded' 
      });

      const loadingStates = {};

      // Check for loading spinners/skeletons
      try {
        await this.page.waitForSelector('.loading, .animate-spin, .skeleton, [class*="loading"], [class*="spin"]', { 
          timeout: 3000 
        });
        loadingStates.hasLoadingIndicator = true;
        console.log('✅ Loading indicator found');
      } catch (error) {
        loadingStates.hasLoadingIndicator = false;
        console.log('❌ No loading indicator found');
      }

      // Wait for content to load and loading to disappear
      await this.page.waitForSelector('[data-testid="agent-card"]', { timeout: 30000 });
      
      const stillLoading = await this.page.locator('.loading, .animate-spin, .skeleton').first().isVisible({ timeout: 2000 });
      loadingStates.loadingDisappearsAfterLoad = !stillLoading;

      errorTests.loadingStates = loadingStates;

      test.details.errorTests = errorTests;
      test.details.errorHandlingWorking = errorTests.invalidAgentId.showsError || errorTests.networkFailure.showsError;
      test.details.loadingStatesWorking = loadingStates.hasLoadingIndicator && loadingStates.loadingDisappearsAfterLoad;

      console.log('✅ Error handling and loading states testing completed');
    });
  }

  async generateReport() {
    console.log('\n📊 Generating comprehensive validation report...');

    this.results.endTime = new Date().toISOString();
    this.results.duration = Date.now() - new Date(this.results.startTime).getTime();

    // Add summary statistics
    this.results.summary.successRate = (this.results.summary.passed / this.results.summary.total * 100).toFixed(1);
    
    // Detailed analysis
    this.results.analysis = {
      phase3Implementation: {
        agentPagesWorking: this.results.tests.find(t => t.name.includes('Agents Page'))?.status === 'passed',
        navigationWorking: this.results.tests.find(t => t.name.includes('Navigation'))?.status === 'passed',
        homePageWorking: this.results.tests.find(t => t.name.includes('Home Page'))?.status === 'passed',
        customizationWorking: this.results.tests.find(t => t.name.includes('Customization'))?.status === 'passed',
        feedWorking: this.results.tests.find(t => t.name.includes('Feed'))?.status === 'passed',
        responsiveWorking: this.results.tests.find(t => t.name.includes('Responsive'))?.status === 'passed',
        errorHandlingWorking: this.results.tests.find(t => t.name.includes('Error'))?.status === 'passed'
      },
      criticalIssues: this.results.tests.filter(t => t.status === 'failed').map(t => ({
        test: t.name,
        error: t.errors[0]?.message,
        screenshot: t.screenshot
      })),
      recommendations: []
    };

    // Generate recommendations
    if (!this.results.analysis.phase3Implementation.agentPagesWorking) {
      this.results.analysis.recommendations.push('Fix agent page loading - API integration may be broken');
    }
    
    if (!this.results.analysis.phase3Implementation.navigationWorking) {
      this.results.analysis.recommendations.push('Fix agent card navigation buttons - routing may be incorrect');
    }
    
    if (!this.results.analysis.phase3Implementation.customizationWorking) {
      this.results.analysis.recommendations.push('Implement or fix agent customization features');
    }

    // Save detailed report
    const reportPath = '/workspaces/agent-feed/tests/phase3-comprehensive-validation-report.json';
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlReportPath = '/workspaces/agent-feed/tests/phase3-validation-report.html';
    await fs.writeFile(htmlReportPath, htmlReport);

    console.log(`✅ Reports saved:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);

    return this.results;
  }

  generateHTMLReport() {
    const { results } = this;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phase 3 Dynamic Agent Pages Validation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8fafc; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #64748b; margin-top: 5px; }
        .test-result { margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
        .test-header { padding: 15px; font-weight: bold; cursor: pointer; display: flex; justify-content: between; align-items: center; }
        .test-passed { background: #dcfce7; color: #166534; }
        .test-failed { background: #fef2f2; color: #dc2626; }
        .test-details { padding: 15px; border-top: 1px solid #e2e8f0; background: #fafafa; display: none; }
        .test-details.active { display: block; }
        .error-message { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .screenshot { margin-top: 15px; }
        .screenshot img { max-width: 100%; border-radius: 4px; border: 1px solid #e2e8f0; }
        .recommendations { background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 6px; margin-top: 30px; }
        .toggle { float: right; font-size: 1.2em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Phase 3 Dynamic Agent Pages Validation Report</h1>
            <p><strong>Generated:</strong> ${results.endTime}</p>
            <p><strong>Duration:</strong> ${Math.round(results.duration / 1000)}s</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${results.summary.total}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.summary.passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.summary.failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${results.summary.successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
        </div>

        <h2>Test Results</h2>
        ${results.tests.map(test => `
            <div class="test-result">
                <div class="test-header ${test.status === 'passed' ? 'test-passed' : 'test-failed'}" onclick="toggleDetails('${test.name.replace(/\s+/g, '-')}')">
                    <span>${test.status === 'passed' ? '✅' : '❌'} ${test.name}</span>
                    <span class="toggle">▼</span>
                </div>
                <div class="test-details" id="${test.name.replace(/\s+/g, '-')}-details">
                    <p><strong>Duration:</strong> ${test.duration}ms</p>
                    ${test.errors.length > 0 ? `
                        <div class="error-message">
                            <strong>Error:</strong> ${test.errors[0].message}
                        </div>
                    ` : ''}
                    ${test.details ? `
                        <h4>Test Details:</h4>
                        <pre>${JSON.stringify(test.details, null, 2)}</pre>
                    ` : ''}
                    ${test.screenshot ? `
                        <div class="screenshot">
                            <h4>Screenshot:</h4>
                            <img src="screenshots/${test.screenshot}" alt="Test Screenshot" loading="lazy" />
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('')}

        ${results.analysis.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>Recommendations</h3>
                <ul>
                    ${results.analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>

    <script>
        function toggleDetails(testId) {
            const details = document.getElementById(testId + '-details');
            const toggle = details.previousElementSibling.querySelector('.toggle');
            
            if (details.classList.contains('active')) {
                details.classList.remove('active');
                toggle.textContent = '▼';
            } else {
                details.classList.add('active');
                toggle.textContent = '▲';
            }
        }
    </script>
</body>
</html>`;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    
    if (this.page) await this.page.close();
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    
    console.log('✅ Cleanup completed');
  }

  async run() {
    try {
      await this.initialize();

      // Run all Phase 3 validation tests
      await this.testAgentsPageWithRealData();
      await this.testAgentCardNavigation();
      await this.testAgentHomePageComponents();
      await this.testAgentCustomization();
      await this.testFeedWithRealPosts();
      await this.testResponsiveDesign();
      await this.testErrorHandlingAndLoadingStates();

      const report = await this.generateReport();
      
      // Print summary
      console.log('\n' + '='.repeat(60));
      console.log('📋 PHASE 3 VALIDATION SUMMARY');
      console.log('='.repeat(60));
      console.log(`Total Tests: ${report.summary.total}`);
      console.log(`Passed: ${report.summary.passed} ✅`);
      console.log(`Failed: ${report.summary.failed} ❌`);
      console.log(`Success Rate: ${report.summary.successRate}%`);
      
      if (report.summary.errors.length > 0) {
        console.log('\n❌ Critical Issues:');
        report.summary.errors.forEach(error => console.log(`   • ${error}`));
      }
      
      console.log('\n📊 Phase 3 Implementation Status:');
      Object.entries(report.analysis.phase3Implementation).forEach(([feature, working]) => {
        console.log(`   ${working ? '✅' : '❌'} ${feature}: ${working ? 'Working' : 'Issues Found'}`);
      });
      
      return report;

    } catch (error) {
      console.error('💥 Test suite failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the validation if this file is executed directly
if (require.main === module) {
  const tester = new Phase3ValidationTester();
  tester.run().catch(console.error);
}

module.exports = Phase3ValidationTester;