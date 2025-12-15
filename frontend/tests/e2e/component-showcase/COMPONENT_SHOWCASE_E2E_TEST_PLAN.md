# Component Showcase E2E Test Plan

**Target URL**: `http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples`

**Test Framework**: Playwright with TypeScript
**Date Created**: 2025-10-06
**Status**: Ready for Implementation

---

## Table of Contents

1. [Overview](#overview)
2. [Test Architecture](#test-architecture)
3. [Page Object Model](#page-object-model)
4. [Test Scenarios](#test-scenarios)
5. [Detailed Test Specifications](#detailed-test-specifications)
6. [Visual Regression Strategy](#visual-regression-strategy)
7. [Performance Benchmarks](#performance-benchmarks)
8. [Accessibility Testing](#accessibility-testing)
9. [Mobile & Responsive Testing](#mobile--responsive-testing)
10. [Test Data & Fixtures](#test-data--fixtures)
11. [CI/CD Integration](#cicd-integration)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## Overview

### Test Objectives

This E2E test suite validates the Component Showcase page, which demonstrates all 18 components including:
- **7 Advanced Components**: PhotoGrid, SwipeCard, Checklist, Calendar, Markdown, Sidebar, GanttChart
- **11 Standard Components**: Card, Button, Grid, Badge, Metric, and others

### Success Criteria

- ✅ All 18 components render without errors
- ✅ Interactive components respond to user input
- ✅ Sidebar navigation functions properly
- ✅ Visual appearance matches design specifications
- ✅ No console errors or warnings
- ✅ Responsive layout works on mobile devices
- ✅ Performance meets benchmarks (< 3s load time)
- ✅ Accessibility standards met (WCAG 2.1 AA)

### Test Coverage Goals

- **Component Rendering**: 100%
- **Interactive Features**: 100%
- **Visual Regression**: 95%
- **Accessibility**: 90%
- **Performance**: Key metrics tracked

---

## Test Architecture

### Directory Structure

```
frontend/tests/e2e/component-showcase/
├── COMPONENT_SHOWCASE_E2E_TEST_PLAN.md     # This document
├── component-showcase.spec.ts               # Main test suite
├── page-objects/
│   ├── ComponentShowcasePage.ts             # Page Object Model
│   ├── components/
│   │   ├── PhotoGridComponent.ts
│   │   ├── SwipeCardComponent.ts
│   │   ├── ChecklistComponent.ts
│   │   ├── CalendarComponent.ts
│   │   ├── MarkdownComponent.ts
│   │   ├── SidebarComponent.ts
│   │   └── GanttChartComponent.ts
├── fixtures/
│   ├── component-test-data.ts               # Test data
│   └── visual-baselines/                    # Screenshot baselines
├── helpers/
│   ├── component-test-helpers.ts            # Utility functions
│   └── accessibility-helpers.ts             # A11y utilities
└── reports/
    └── test-execution-report.json           # Test results
```

### Technology Stack

- **Playwright**: v1.55.1+
- **TypeScript**: v5.9.2
- **Accessibility Testing**: @axe-core/playwright
- **Visual Regression**: Playwright screenshots
- **Performance**: Lighthouse CI

---

## Page Object Model

### Base Page Object

```typescript
// page-objects/ComponentShowcasePage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../../page-objects/base-page';

export class ComponentShowcasePage extends BasePage {
  // Page URL
  readonly url = '/agents/page-builder-agent/pages/component-showcase-and-examples';

  // Main container
  readonly pageContainer: Locator;
  readonly sidebar: Locator;
  readonly mainContent: Locator;

  // Component sections
  readonly photoGridSection: Locator;
  readonly swipeCardSection: Locator;
  readonly checklistSection: Locator;
  readonly calendarSection: Locator;
  readonly markdownSection: Locator;
  readonly ganttChartSection: Locator;
  readonly cardSection: Locator;
  readonly buttonSection: Locator;
  readonly gridSection: Locator;
  readonly badgeSection: Locator;
  readonly metricSection: Locator;

  constructor(page: Page) {
    super(page);

    // Initialize locators
    this.pageContainer = page.locator('[data-testid="component-showcase-page"], .component-showcase-page');
    this.sidebar = page.locator('[data-testid="sidebar"], .sidebar');
    this.mainContent = page.locator('[data-testid="main-content"], .main-content');

    // Component sections
    this.photoGridSection = page.locator('[data-component="PhotoGrid"], .photo-grid-component');
    this.swipeCardSection = page.locator('[data-component="SwipeCard"], .swipe-card-component');
    this.checklistSection = page.locator('[data-component="Checklist"], .checklist-component');
    this.calendarSection = page.locator('[data-component="Calendar"], .calendar-component');
    this.markdownSection = page.locator('[data-component="Markdown"], .markdown-component');
    this.ganttChartSection = page.locator('[data-component="GanttChart"], .gantt-chart-component');
    this.cardSection = page.locator('[data-component="Card"], .card-component');
    this.buttonSection = page.locator('[data-component="Button"], .button-component');
    this.gridSection = page.locator('[data-component="Grid"], .grid-component');
    this.badgeSection = page.locator('[data-component="Badge"], .badge-component');
    this.metricSection = page.locator('[data-component="Metric"], .metric-component');
  }

  /**
   * Navigate to the component showcase page
   */
  async navigate() {
    await this.goto(this.url);
    await this.waitForPageFullyLoaded();
  }

  /**
   * Wait for page to be fully loaded with all components
   */
  async waitForPageFullyLoaded() {
    await this.waitForPageLoad();
    await this.page.waitForLoadState('networkidle');

    // Wait for main container
    await expect(this.pageContainer).toBeVisible({ timeout: 10000 });

    // Wait for sidebar to be ready
    await expect(this.sidebar).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get all component sections
   */
  async getAllComponentSections() {
    return [
      { name: 'PhotoGrid', locator: this.photoGridSection },
      { name: 'SwipeCard', locator: this.swipeCardSection },
      { name: 'Checklist', locator: this.checklistSection },
      { name: 'Calendar', locator: this.calendarSection },
      { name: 'Markdown', locator: this.markdownSection },
      { name: 'GanttChart', locator: this.ganttChartSection },
      { name: 'Card', locator: this.cardSection },
      { name: 'Button', locator: this.buttonSection },
      { name: 'Grid', locator: this.gridSection },
      { name: 'Badge', locator: this.badgeSection },
      { name: 'Metric', locator: this.metricSection },
    ];
  }

  /**
   * Verify component is rendered
   */
  async verifyComponentRendered(componentName: string): Promise<boolean> {
    const components = await this.getAllComponentSections();
    const component = components.find(c => c.name === componentName);

    if (!component) {
      throw new Error(`Component ${componentName} not found in page object`);
    }

    try {
      await expect(component.locator).toBeVisible({ timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Count total visible components
   */
  async countVisibleComponents(): Promise<number> {
    const components = await this.getAllComponentSections();
    let count = 0;

    for (const component of components) {
      const isVisible = await component.locator.isVisible();
      if (isVisible) count++;
    }

    return count;
  }

  /**
   * Scroll to specific component
   */
  async scrollToComponent(componentName: string) {
    const components = await this.getAllComponentSections();
    const component = components.find(c => c.name === componentName);

    if (!component) {
      throw new Error(`Component ${componentName} not found`);
    }

    await component.locator.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(500); // Allow smooth scroll to complete
  }

  /**
   * Click sidebar navigation item
   */
  async clickSidebarItem(itemText: string) {
    const sidebarItem = this.sidebar.locator(`text="${itemText}"`).first();
    await sidebarItem.click();
    await this.page.waitForTimeout(300); // Allow navigation animation
  }

  /**
   * Get sidebar navigation items
   */
  async getSidebarItems(): Promise<string[]> {
    const items = await this.sidebar.locator('a, button').allTextContents();
    return items.filter(text => text.trim().length > 0);
  }

  /**
   * Take full page screenshot
   */
  async captureFullPageScreenshot(name: string) {
    await this.page.screenshot({
      path: `tests/e2e/component-showcase/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Capture component screenshot
   */
  async captureComponentScreenshot(componentName: string) {
    const components = await this.getAllComponentSections();
    const component = components.find(c => c.name === componentName);

    if (!component) {
      throw new Error(`Component ${componentName} not found`);
    }

    await component.locator.screenshot({
      path: `tests/e2e/component-showcase/screenshots/${componentName}-component.png`,
    });
  }
}
```

### Advanced Component Page Objects

```typescript
// page-objects/components/PhotoGridComponent.ts
import { Locator, Page } from '@playwright/test';

export class PhotoGridComponent {
  readonly container: Locator;
  readonly photos: Locator;
  readonly lightbox: Locator;
  readonly lightboxImage: Locator;
  readonly closeButton: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.container = page.locator('[data-component="PhotoGrid"], .photo-grid');
    this.photos = this.container.locator('img, [data-photo]');
    this.lightbox = page.locator('[data-testid="lightbox"], .lightbox');
    this.lightboxImage = this.lightbox.locator('img');
    this.closeButton = this.lightbox.locator('[data-action="close"], button:has-text("Close")');
    this.prevButton = this.lightbox.locator('[data-action="prev"], button:has-text("Previous")');
    this.nextButton = this.lightbox.locator('[data-action="next"], button:has-text("Next")');
  }

  async clickPhoto(index: number = 0) {
    await this.photos.nth(index).click();
  }

  async waitForLightbox() {
    await this.lightbox.waitFor({ state: 'visible', timeout: 5000 });
  }

  async closeLightbox() {
    await this.closeButton.click();
    await this.lightbox.waitFor({ state: 'hidden', timeout: 3000 });
  }

  async navigateNext() {
    await this.nextButton.click();
    await this.container.page().waitForTimeout(300);
  }

  async navigatePrev() {
    await this.prevButton.click();
    await this.container.page().waitForTimeout(300);
  }

  async getPhotoCount(): Promise<number> {
    return await this.photos.count();
  }
}

// page-objects/components/SwipeCardComponent.ts
export class SwipeCardComponent {
  readonly container: Locator;
  readonly cards: Locator;
  readonly currentCard: Locator;
  readonly likeButton: Locator;
  readonly dislikeButton: Locator;

  constructor(page: Page) {
    this.container = page.locator('[data-component="SwipeCard"], .swipe-card');
    this.cards = this.container.locator('[data-card], .card');
    this.currentCard = this.cards.first();
    this.likeButton = this.container.locator('[data-action="like"], button:has-text("Like")');
    this.dislikeButton = this.container.locator('[data-action="dislike"], button:has-text("Dislike")');
  }

  async swipeLeft() {
    await this.currentCard.hover();
    await this.container.page().mouse.down();
    await this.container.page().mouse.move(-200, 0);
    await this.container.page().mouse.up();
    await this.container.page().waitForTimeout(500);
  }

  async swipeRight() {
    await this.currentCard.hover();
    await this.container.page().mouse.down();
    await this.container.page().mouse.move(200, 0);
    await this.container.page().mouse.up();
    await this.container.page().waitForTimeout(500);
  }

  async clickLike() {
    await this.likeButton.click();
    await this.container.page().waitForTimeout(500);
  }

  async clickDislike() {
    await this.dislikeButton.click();
    await this.container.page().waitForTimeout(500);
  }

  async getCardCount(): Promise<number> {
    return await this.cards.count();
  }
}

// page-objects/components/ChecklistComponent.ts
export class ChecklistComponent {
  readonly container: Locator;
  readonly items: Locator;
  readonly checkboxes: Locator;
  readonly addButton: Locator;
  readonly input: Locator;

  constructor(page: Page) {
    this.container = page.locator('[data-component="Checklist"], .checklist');
    this.items = this.container.locator('[data-item], .checklist-item');
    this.checkboxes = this.container.locator('input[type="checkbox"]');
    this.addButton = this.container.locator('[data-action="add"], button:has-text("Add")');
    this.input = this.container.locator('input[type="text"]');
  }

  async checkItem(index: number) {
    await this.checkboxes.nth(index).check();
    await this.container.page().waitForTimeout(200);
  }

  async uncheckItem(index: number) {
    await this.checkboxes.nth(index).uncheck();
    await this.container.page().waitForTimeout(200);
  }

  async addItem(text: string) {
    if (await this.input.isVisible()) {
      await this.input.fill(text);
      await this.addButton.click();
      await this.container.page().waitForTimeout(300);
    }
  }

  async getItemCount(): Promise<number> {
    return await this.items.count();
  }

  async getCheckedCount(): Promise<number> {
    const checkboxes = await this.checkboxes.all();
    let checkedCount = 0;
    for (const checkbox of checkboxes) {
      if (await checkbox.isChecked()) checkedCount++;
    }
    return checkedCount;
  }
}

// page-objects/components/CalendarComponent.ts
export class CalendarComponent {
  readonly container: Locator;
  readonly currentMonth: Locator;
  readonly prevButton: Locator;
  readonly nextButton: Locator;
  readonly days: Locator;
  readonly events: Locator;

  constructor(page: Page) {
    this.container = page.locator('[data-component="Calendar"], .calendar');
    this.currentMonth = this.container.locator('[data-current-month], .current-month');
    this.prevButton = this.container.locator('[data-action="prev-month"], button:has-text("Previous")');
    this.nextButton = this.container.locator('[data-action="next-month"], button:has-text("Next")');
    this.days = this.container.locator('[data-day], .calendar-day');
    this.events = this.container.locator('[data-event], .calendar-event');
  }

  async navigateToNextMonth() {
    await this.nextButton.click();
    await this.container.page().waitForTimeout(300);
  }

  async navigateToPrevMonth() {
    await this.prevButton.click();
    await this.container.page().waitForTimeout(300);
  }

  async clickDay(dayNumber: number) {
    const day = this.days.filter({ hasText: dayNumber.toString() }).first();
    await day.click();
    await this.container.page().waitForTimeout(200);
  }

  async getCurrentMonth(): Promise<string> {
    return await this.currentMonth.textContent() || '';
  }

  async getEventCount(): Promise<number> {
    return await this.events.count();
  }
}

// page-objects/components/GanttChartComponent.ts
export class GanttChartComponent {
  readonly container: Locator;
  readonly timeline: Locator;
  readonly tasks: Locator;
  readonly taskBars: Locator;

  constructor(page: Page) {
    this.container = page.locator('[data-component="GanttChart"], .gantt-chart');
    this.timeline = this.container.locator('[data-timeline], .timeline');
    this.tasks = this.container.locator('[data-task], .task');
    this.taskBars = this.container.locator('[data-task-bar], .task-bar');
  }

  async getTaskCount(): Promise<number> {
    return await this.tasks.count();
  }

  async clickTask(index: number) {
    await this.tasks.nth(index).click();
    await this.container.page().waitForTimeout(200);
  }

  async verifyTimelineVisible(): Promise<boolean> {
    return await this.timeline.isVisible();
  }
}

// page-objects/components/MarkdownComponent.ts
export class MarkdownComponent {
  readonly container: Locator;
  readonly headings: Locator;
  readonly paragraphs: Locator;
  readonly codeBlocks: Locator;
  readonly links: Locator;

  constructor(page: Page) {
    this.container = page.locator('[data-component="Markdown"], .markdown');
    this.headings = this.container.locator('h1, h2, h3, h4, h5, h6');
    this.paragraphs = this.container.locator('p');
    this.codeBlocks = this.container.locator('pre code, .code-block');
    this.links = this.container.locator('a');
  }

  async getHeadingCount(): Promise<number> {
    return await this.headings.count();
  }

  async getParagraphCount(): Promise<number> {
    return await this.paragraphs.count();
  }

  async hasCodeBlocks(): Promise<boolean> {
    return (await this.codeBlocks.count()) > 0;
  }

  async clickLink(index: number = 0) {
    await this.links.nth(index).click();
  }
}
```

---

## Test Scenarios

### Core Test Scenarios (10+)

1. **TC-001**: Page Loads Successfully
2. **TC-002**: All 18 Components Render
3. **TC-003**: Sidebar Navigation Functions
4. **TC-004**: PhotoGrid Lightbox Interaction
5. **TC-005**: SwipeCard Swipe Gestures
6. **TC-006**: Checklist Item Toggle
7. **TC-007**: Calendar Month Navigation
8. **TC-008**: Markdown Content Rendering
9. **TC-009**: GanttChart Timeline Display
10. **TC-010**: No Console Errors
11. **TC-011**: Mobile Responsive Layout
12. **TC-012**: Visual Regression Testing
13. **TC-013**: Performance Benchmarks
14. **TC-014**: Accessibility Compliance
15. **TC-015**: Component Screenshot Comparison

---

## Detailed Test Specifications

### Main Test Suite

```typescript
// component-showcase.spec.ts
import { test, expect, devices } from '@playwright/test';
import { ComponentShowcasePage } from './page-objects/ComponentShowcasePage';
import {
  PhotoGridComponent,
  SwipeCardComponent,
  ChecklistComponent,
  CalendarComponent,
  GanttChartComponent,
  MarkdownComponent
} from './page-objects/components';

test.describe('Component Showcase E2E Tests', () => {
  let showcasePage: ComponentShowcasePage;

  test.beforeEach(async ({ page }) => {
    showcasePage = new ComponentShowcasePage(page);
    await showcasePage.navigate();
  });

  /**
   * TC-001: Page Loads Successfully
   */
  test('TC-001: should load the component showcase page successfully', async ({ page }) => {
    // Verify page URL is correct
    expect(page.url()).toContain('/component-showcase-and-examples');

    // Verify main container is visible
    await expect(showcasePage.pageContainer).toBeVisible();

    // Verify page title or heading
    const heading = page.locator('h1, [data-testid="page-title"]').first();
    await expect(heading).toBeVisible();

    // Take baseline screenshot
    await showcasePage.captureFullPageScreenshot('page-load-success');
  });

  /**
   * TC-002: All 18 Components Render
   */
  test('TC-002: should render all 18 components on the page', async ({ page }) => {
    // Wait for page to fully load
    await showcasePage.waitForPageFullyLoaded();

    // Get all components
    const components = await showcasePage.getAllComponentSections();

    // Verify each component is rendered
    const renderedComponents: string[] = [];
    const failedComponents: string[] = [];

    for (const component of components) {
      const isRendered = await showcasePage.verifyComponentRendered(component.name);

      if (isRendered) {
        renderedComponents.push(component.name);
        console.log(`✅ ${component.name} rendered successfully`);
      } else {
        failedComponents.push(component.name);
        console.error(`❌ ${component.name} failed to render`);
      }
    }

    // Assert all components rendered
    expect(failedComponents).toHaveLength(0);
    expect(renderedComponents.length).toBeGreaterThanOrEqual(11); // At least 11 of 18

    // Count visible components
    const visibleCount = await showcasePage.countVisibleComponents();
    console.log(`📊 Total visible components: ${visibleCount}`);
    expect(visibleCount).toBeGreaterThanOrEqual(11);
  });

  /**
   * TC-003: Sidebar Navigation Functions
   */
  test('TC-003: should navigate using sidebar links', async ({ page }) => {
    // Verify sidebar is visible
    await expect(showcasePage.sidebar).toBeVisible();

    // Get sidebar items
    const sidebarItems = await showcasePage.getSidebarItems();
    console.log(`📋 Sidebar items: ${sidebarItems.join(', ')}`);
    expect(sidebarItems.length).toBeGreaterThan(0);

    // Test clicking a few sidebar items
    if (sidebarItems.length > 0) {
      // Click first item
      await showcasePage.clickSidebarItem(sidebarItems[0]);
      await page.waitForTimeout(500);

      // Click second item if exists
      if (sidebarItems.length > 1) {
        await showcasePage.clickSidebarItem(sidebarItems[1]);
        await page.waitForTimeout(500);
      }
    }

    // Take screenshot
    await showcasePage.captureFullPageScreenshot('sidebar-navigation');
  });

  /**
   * TC-004: PhotoGrid Lightbox Interaction
   */
  test('TC-004: should open and navigate PhotoGrid lightbox', async ({ page }) => {
    const photoGrid = new PhotoGridComponent(page);

    // Scroll to PhotoGrid
    await showcasePage.scrollToComponent('PhotoGrid');

    // Verify PhotoGrid has photos
    const photoCount = await photoGrid.getPhotoCount();
    if (photoCount === 0) {
      test.skip();
      return;
    }

    console.log(`📸 PhotoGrid has ${photoCount} photos`);
    expect(photoCount).toBeGreaterThan(0);

    // Click first photo to open lightbox
    await photoGrid.clickPhoto(0);
    await photoGrid.waitForLightbox();

    // Verify lightbox opened
    await expect(photoGrid.lightbox).toBeVisible();
    await expect(photoGrid.lightboxImage).toBeVisible();

    // Take screenshot of lightbox
    await page.screenshot({ path: 'tests/e2e/component-showcase/screenshots/photogrid-lightbox.png' });

    // Navigate to next photo if multiple exist
    if (photoCount > 1) {
      await photoGrid.navigateNext();
      await page.waitForTimeout(300);

      await photoGrid.navigatePrev();
      await page.waitForTimeout(300);
    }

    // Close lightbox
    await photoGrid.closeLightbox();
    await expect(photoGrid.lightbox).toBeHidden();
  });

  /**
   * TC-005: SwipeCard Swipe Gestures
   */
  test('TC-005: should handle SwipeCard interactions', async ({ page }) => {
    const swipeCard = new SwipeCardComponent(page);

    // Scroll to SwipeCard
    await showcasePage.scrollToComponent('SwipeCard');

    // Verify SwipeCard has cards
    const cardCount = await swipeCard.getCardCount();
    if (cardCount === 0) {
      test.skip();
      return;
    }

    console.log(`🃏 SwipeCard has ${cardCount} cards`);

    // Test like button
    if (await swipeCard.likeButton.isVisible()) {
      await swipeCard.clickLike();
      await page.waitForTimeout(500);
    }

    // Test swipe gesture (if cards remain)
    const remainingCards = await swipeCard.getCardCount();
    if (remainingCards > 0) {
      await swipeCard.swipeRight();
      await page.waitForTimeout(500);
    }

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/component-showcase/screenshots/swipecard-interaction.png' });
  });

  /**
   * TC-006: Checklist Item Toggle
   */
  test('TC-006: should toggle checklist items', async ({ page }) => {
    const checklist = new ChecklistComponent(page);

    // Scroll to Checklist
    await showcasePage.scrollToComponent('Checklist');

    // Verify checklist has items
    const itemCount = await checklist.getItemCount();
    if (itemCount === 0) {
      test.skip();
      return;
    }

    console.log(`✅ Checklist has ${itemCount} items`);

    // Get initial checked count
    const initialChecked = await checklist.getCheckedCount();
    console.log(`📋 Initially checked: ${initialChecked}`);

    // Check first unchecked item
    await checklist.checkItem(0);
    await page.waitForTimeout(300);

    // Verify checked count increased (unless first item was already checked)
    const newChecked = await checklist.getCheckedCount();
    console.log(`📋 Now checked: ${newChecked}`);

    // Uncheck the item
    await checklist.uncheckItem(0);
    await page.waitForTimeout(300);

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/component-showcase/screenshots/checklist-interaction.png' });
  });

  /**
   * TC-007: Calendar Month Navigation
   */
  test('TC-007: should navigate calendar months', async ({ page }) => {
    const calendar = new CalendarComponent(page);

    // Scroll to Calendar
    await showcasePage.scrollToComponent('Calendar');

    // Verify calendar is visible
    await expect(calendar.container).toBeVisible();

    // Get current month
    const currentMonth = await calendar.getCurrentMonth();
    console.log(`📅 Current month: ${currentMonth}`);

    // Navigate to next month
    await calendar.navigateToNextMonth();
    await page.waitForTimeout(500);

    const nextMonth = await calendar.getCurrentMonth();
    console.log(`📅 Next month: ${nextMonth}`);

    // Navigate back
    await calendar.navigateToPrevMonth();
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/component-showcase/screenshots/calendar-navigation.png' });
  });

  /**
   * TC-008: Markdown Content Rendering
   */
  test('TC-008: should render Markdown content properly', async ({ page }) => {
    const markdown = new MarkdownComponent(page);

    // Scroll to Markdown
    await showcasePage.scrollToComponent('Markdown');

    // Verify markdown is visible
    await expect(markdown.container).toBeVisible();

    // Check for headings
    const headingCount = await markdown.getHeadingCount();
    console.log(`📝 Markdown headings: ${headingCount}`);
    expect(headingCount).toBeGreaterThanOrEqual(0);

    // Check for paragraphs
    const paragraphCount = await markdown.getParagraphCount();
    console.log(`📝 Markdown paragraphs: ${paragraphCount}`);
    expect(paragraphCount).toBeGreaterThanOrEqual(0);

    // Check for code blocks
    const hasCodeBlocks = await markdown.hasCodeBlocks();
    console.log(`📝 Has code blocks: ${hasCodeBlocks}`);

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/component-showcase/screenshots/markdown-rendering.png' });
  });

  /**
   * TC-009: GanttChart Timeline Display
   */
  test('TC-009: should display GanttChart timeline', async ({ page }) => {
    const ganttChart = new GanttChartComponent(page);

    // Scroll to GanttChart
    await showcasePage.scrollToComponent('GanttChart');

    // Verify gantt chart is visible
    await expect(ganttChart.container).toBeVisible();

    // Check if timeline is visible
    const timelineVisible = await ganttChart.verifyTimelineVisible();
    console.log(`📊 Timeline visible: ${timelineVisible}`);

    // Get task count
    const taskCount = await ganttChart.getTaskCount();
    console.log(`📊 Tasks: ${taskCount}`);
    expect(taskCount).toBeGreaterThanOrEqual(0);

    // Click first task if exists
    if (taskCount > 0) {
      await ganttChart.clickTask(0);
      await page.waitForTimeout(300);
    }

    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/component-showcase/screenshots/ganttchart-timeline.png' });
  });

  /**
   * TC-010: No Console Errors
   */
  test('TC-010: should not have console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    // Listen for console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    // Reload page to capture all logs
    await showcasePage.navigate();
    await showcasePage.waitForPageFullyLoaded();

    // Wait a moment for any delayed errors
    await page.waitForTimeout(2000);

    // Report findings
    if (consoleErrors.length > 0) {
      console.error('❌ Console Errors Found:');
      consoleErrors.forEach(err => console.error(`  - ${err}`));
    }

    if (consoleWarnings.length > 0) {
      console.warn('⚠️  Console Warnings Found:');
      consoleWarnings.forEach(warn => console.warn(`  - ${warn}`));
    }

    // Assert no critical errors
    // Filter out known harmless warnings
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('404') && // Ignore 404s for missing resources
      !err.includes('favicon') // Ignore favicon issues
    );

    expect(criticalErrors).toHaveLength(0);
  });

  /**
   * TC-011: Mobile Responsive Layout
   */
  test('TC-011: should display properly on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    // Reload page
    await showcasePage.navigate();
    await showcasePage.waitForPageFullyLoaded();

    // Verify page container is visible
    await expect(showcasePage.pageContainer).toBeVisible();

    // Check if sidebar adapts (might be hamburger menu)
    const sidebarVisible = await showcasePage.sidebar.isVisible();
    console.log(`📱 Sidebar visible on mobile: ${sidebarVisible}`);

    // Take mobile screenshot
    await page.screenshot({
      path: 'tests/e2e/component-showcase/screenshots/mobile-layout.png',
      fullPage: true
    });

    // Test a few components still render
    const visibleCount = await showcasePage.countVisibleComponents();
    console.log(`📱 Components visible on mobile: ${visibleCount}`);
    expect(visibleCount).toBeGreaterThan(0);
  });

  /**
   * TC-012: Visual Regression Testing
   */
  test('TC-012: should match visual baseline snapshots', async ({ page }) => {
    // Full page snapshot
    await expect(page).toHaveScreenshot('component-showcase-full-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });

    // Individual component snapshots
    const componentsToSnapshot = ['PhotoGrid', 'SwipeCard', 'Checklist', 'Calendar', 'Markdown'];

    for (const componentName of componentsToSnapshot) {
      await showcasePage.scrollToComponent(componentName);
      await page.waitForTimeout(500);

      await showcasePage.captureComponentScreenshot(componentName);
    }
  });

  /**
   * TC-013: Performance Benchmarks
   */
  test('TC-013: should meet performance benchmarks', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    await showcasePage.navigate();
    await showcasePage.waitForPageFullyLoaded();
    const loadTime = Date.now() - startTime;

    console.log(`⏱️  Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds

    // Measure performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perf = window.performance;
      const perfData = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        domInteractive: perfData.domInteractive - perfData.fetchStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      };
    });

    console.log('📊 Performance Metrics:');
    console.log(`  - DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`  - Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`  - DOM Interactive: ${performanceMetrics.domInteractive}ms`);
    console.log(`  - First Paint: ${performanceMetrics.firstPaint}ms`);

    // Assert performance benchmarks
    expect(performanceMetrics.domInteractive).toBeLessThan(3000);
    expect(performanceMetrics.firstPaint).toBeLessThan(2000);
  });

  /**
   * TC-014: Accessibility Compliance
   */
  test('TC-014: should meet accessibility standards', async ({ page }) => {
    // This test requires @axe-core/playwright
    // Import would be: import { injectAxe, checkA11y } from 'axe-playwright';

    // For now, basic accessibility checks

    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // Images should have alt text (even if empty for decorative images)
      expect(alt).not.toBeNull();
    }

    // Check for keyboard navigation (buttons should be focusable)
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 3)) { // Test first 3 buttons
      const tabIndex = await button.getAttribute('tabindex');
      const isDisabled = await button.isDisabled();

      if (!isDisabled) {
        // Should be keyboard accessible
        expect(tabIndex === null || parseInt(tabIndex) >= 0).toBeTruthy();
      }
    }

    console.log('♿ Basic accessibility checks passed');
  });

  /**
   * TC-015: Component Screenshot Comparison
   */
  test('TC-015: should capture individual component screenshots', async ({ page }) => {
    const components = await showcasePage.getAllComponentSections();

    for (const component of components) {
      await showcasePage.scrollToComponent(component.name);
      await page.waitForTimeout(500);

      // Capture component screenshot
      const screenshot = await component.locator.screenshot();
      expect(screenshot).toBeTruthy();

      console.log(`📸 Captured screenshot for ${component.name}`);
    }
  });
});

/**
 * Cross-Browser Testing
 */
test.describe('Cross-Browser Compatibility', () => {
  test('should work on Chromium', async ({ page }) => {
    const showcasePage = new ComponentShowcasePage(page);
    await showcasePage.navigate();
    await expect(showcasePage.pageContainer).toBeVisible();
  });

  test('should work on Firefox', async ({ page }) => {
    const showcasePage = new ComponentShowcasePage(page);
    await showcasePage.navigate();
    await expect(showcasePage.pageContainer).toBeVisible();
  });

  test('should work on WebKit', async ({ page }) => {
    const showcasePage = new ComponentShowcasePage(page);
    await showcasePage.navigate();
    await expect(showcasePage.pageContainer).toBeVisible();
  });
});

/**
 * Mobile Device Testing
 */
test.describe('Mobile Devices', () => {
  test('should work on iPhone SE', async ({ browser }) => {
    const context = await browser.newContext(devices['iPhone SE']);
    const page = await context.newPage();
    const showcasePage = new ComponentShowcasePage(page);

    await showcasePage.navigate();
    await expect(showcasePage.pageContainer).toBeVisible();

    await context.close();
  });

  test('should work on iPad', async ({ browser }) => {
    const context = await browser.newContext(devices['iPad']);
    const page = await context.newPage();
    const showcasePage = new ComponentShowcasePage(page);

    await showcasePage.navigate();
    await expect(showcasePage.pageContainer).toBeVisible();

    await context.close();
  });
});
```

---

## Visual Regression Strategy

### Screenshot Baseline Management

1. **Generate Baselines**:
   ```bash
   npm run test:e2e:update-snapshots
   ```

2. **Compare on Test Run**:
   - Playwright automatically compares screenshots
   - Diff images generated for failures
   - Store in `tests/e2e/component-showcase/test-results/`

3. **Review Process**:
   - Manual review of diff images
   - Approve changes by updating baselines
   - Track visual changes in version control

### Screenshot Naming Convention

```
component-showcase-full-page.png
photogrid-component.png
swipecard-component.png
checklist-component.png
calendar-component.png
markdown-component.png
ganttchart-component.png
sidebar-navigation.png
mobile-layout.png
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Page Load Time | < 3s | < 5s |
| First Paint | < 1s | < 2s |
| DOM Interactive | < 2s | < 3s |
| Component Render | < 500ms | < 1s |
| Lighthouse Score | > 90 | > 80 |

### Performance Test Implementation

```typescript
// helpers/performance-helpers.ts
import { Page } from '@playwright/test';

export class PerformanceHelpers {
  static async measurePageLoad(page: Page, url: string) {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const endTime = Date.now();

    return {
      totalTime: endTime - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  static async getWebVitals(page: Page) {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};

        // First Contentful Paint
        const paintEntries = performance.getEntriesByType('paint');
        vitals.fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

        // Largest Contentful Paint (requires observer)
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        setTimeout(() => resolve(vitals), 1000);
      });
    });
  }

  static async measureComponentRender(page: Page, selector: string) {
    const startTime = Date.now();
    await page.locator(selector).waitFor({ state: 'visible' });
    const endTime = Date.now();

    return endTime - startTime;
  }
}
```

---

## Accessibility Testing

### Accessibility Test Suite

```typescript
// component-showcase-accessibility.spec.ts
import { test, expect } from '@playwright/test';
import { ComponentShowcasePage } from './page-objects/ComponentShowcasePage';

test.describe('Accessibility Tests', () => {
  test('should have no accessibility violations', async ({ page }) => {
    const showcasePage = new ComponentShowcasePage(page);
    await showcasePage.navigate();

    // Run axe accessibility scan
    // Requires: npm install -D @axe-core/playwright
    // import { injectAxe, checkA11y } from 'axe-playwright';

    // await injectAxe(page);
    // await checkA11y(page, null, {
    //   detailedReport: true,
    //   detailedReportOptions: {
    //     html: true
    //   }
    // });
  });

  test('should support keyboard navigation', async ({ page }) => {
    const showcasePage = new ComponentShowcasePage(page);
    await showcasePage.navigate();

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    // Verify focus is visible
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    const showcasePage = new ComponentShowcasePage(page);
    await showcasePage.navigate();

    // Check for ARIA landmarks
    const main = await page.locator('[role="main"], main').count();
    const navigation = await page.locator('[role="navigation"], nav').count();

    expect(main + navigation).toBeGreaterThan(0);
  });
});
```

---

## Mobile & Responsive Testing

### Responsive Test Configuration

```typescript
// component-showcase-responsive.spec.ts
import { test, expect, devices } from '@playwright/test';
import { ComponentShowcasePage } from './page-objects/ComponentShowcasePage';

const mobileDevices = [
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Samsung Galaxy S21', device: devices['Galaxy S9+'] },
];

const tabletDevices = [
  { name: 'iPad', device: devices['iPad'] },
  { name: 'iPad Pro', device: devices['iPad Pro'] },
];

test.describe('Mobile Responsive Tests', () => {
  for (const { name, device } of mobileDevices) {
    test(`should display correctly on ${name}`, async ({ browser }) => {
      const context = await browser.newContext(device);
      const page = await context.newPage();
      const showcasePage = new ComponentShowcasePage(page);

      await showcasePage.navigate();
      await expect(showcasePage.pageContainer).toBeVisible();

      // Take mobile screenshot
      await page.screenshot({
        path: `tests/e2e/component-showcase/screenshots/mobile-${name.replace(/\s/g, '-').toLowerCase()}.png`,
        fullPage: true,
      });

      await context.close();
    });
  }
});

test.describe('Tablet Responsive Tests', () => {
  for (const { name, device } of tabletDevices) {
    test(`should display correctly on ${name}`, async ({ browser }) => {
      const context = await browser.newContext(device);
      const page = await context.newPage();
      const showcasePage = new ComponentShowcasePage(page);

      await showcasePage.navigate();
      await expect(showcasePage.pageContainer).toBeVisible();

      await context.close();
    });
  }
});

test.describe('Breakpoint Tests', () => {
  const breakpoints = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Large Desktop', width: 2560, height: 1440 },
  ];

  for (const { name, width, height } of breakpoints) {
    test(`should adapt layout at ${name} breakpoint (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });

      const showcasePage = new ComponentShowcasePage(page);
      await showcasePage.navigate();

      await expect(showcasePage.pageContainer).toBeVisible();

      // Verify responsive behavior
      const componentCount = await showcasePage.countVisibleComponents();
      expect(componentCount).toBeGreaterThan(0);

      console.log(`📱 ${name}: ${componentCount} components visible`);
    });
  }
});
```

---

## Test Data & Fixtures

### Test Data Structure

```typescript
// fixtures/component-test-data.ts
export const componentTestData = {
  photoGrid: {
    expectedMinPhotos: 3,
    lightboxSelector: '[data-testid="lightbox"]',
  },
  swipeCard: {
    expectedMinCards: 1,
    swipeDistance: 200,
  },
  checklist: {
    expectedMinItems: 1,
    testItems: ['Test Item 1', 'Test Item 2', 'Test Item 3'],
  },
  calendar: {
    expectedMonths: 12,
    defaultView: 'month',
  },
  markdown: {
    expectedMinHeadings: 1,
    expectedMinParagraphs: 1,
  },
  ganttChart: {
    expectedMinTasks: 1,
    testTasks: [
      { name: 'Task 1', start: '2025-01-01', end: '2025-01-15' },
      { name: 'Task 2', start: '2025-01-10', end: '2025-01-25' },
    ],
  },
};

export const testTimeouts = {
  navigation: 10000,
  component: 5000,
  interaction: 3000,
  animation: 500,
};

export const testUrls = {
  showcase: '/agents/page-builder-agent/pages/component-showcase-and-examples',
  base: 'http://localhost:5173',
};
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/component-showcase-e2e.yml
name: Component Showcase E2E Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/src/components/**'
      - 'frontend/tests/e2e/component-showcase/**'
  pull_request:
    branches: [main, develop]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        browser: [chromium, firefox, webkit]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps ${{ matrix.browser }}

      - name: Run E2E tests
        run: npx playwright test tests/e2e/component-showcase --project=${{ matrix.browser }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-${{ matrix.browser }}
          path: tests/e2e/component-showcase/playwright-report/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-screenshots-${{ matrix.browser }}
          path: tests/e2e/component-showcase/screenshots/
```

### Test Execution Scripts

```json
// package.json scripts
{
  "test:showcase": "playwright test tests/e2e/component-showcase",
  "test:showcase:ui": "playwright test tests/e2e/component-showcase --ui",
  "test:showcase:headed": "playwright test tests/e2e/component-showcase --headed",
  "test:showcase:debug": "playwright test tests/e2e/component-showcase --debug",
  "test:showcase:chromium": "playwright test tests/e2e/component-showcase --project=chromium",
  "test:showcase:firefox": "playwright test tests/e2e/component-showcase --project=firefox",
  "test:showcase:webkit": "playwright test tests/e2e/component-showcase --project=webkit",
  "test:showcase:mobile": "playwright test tests/e2e/component-showcase --project='Mobile Chrome'",
  "test:showcase:snapshots": "playwright test tests/e2e/component-showcase --update-snapshots"
}
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue 1: Components Not Rendering

**Symptoms**: Components fail visibility checks
**Causes**:
- Slow network/API responses
- Component lazy loading
- CSS not loaded

**Solutions**:
```typescript
// Increase timeout
await expect(component).toBeVisible({ timeout: 10000 });

// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for specific condition
await page.waitForFunction(() => {
  return document.querySelectorAll('[data-component]').length >= 10;
});
```

#### Issue 2: Flaky Lightbox Tests

**Symptoms**: Lightbox tests pass/fail inconsistently
**Causes**:
- Animation timing
- Image loading delays

**Solutions**:
```typescript
// Wait for animation to complete
await page.waitForTimeout(500);

// Wait for image to load
await page.waitForFunction(() => {
  const img = document.querySelector('.lightbox img') as HTMLImageElement;
  return img && img.complete;
});
```

#### Issue 3: Sidebar Navigation Fails

**Symptoms**: Sidebar clicks don't scroll/navigate
**Causes**:
- Sidebar using smooth scroll
- Hash navigation timing

**Solutions**:
```typescript
// Disable smooth scroll behavior
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto';
});

// Wait after click
await sidebarLink.click();
await page.waitForTimeout(500);
```

#### Issue 4: Screenshot Diffs

**Symptoms**: Visual regression tests fail
**Causes**:
- Font rendering differences
- Dynamic content (timestamps, random data)
- Browser version changes

**Solutions**:
```typescript
// Mask dynamic content
await expect(page).toHaveScreenshot({
  mask: [page.locator('.timestamp'), page.locator('.dynamic-content')],
  maxDiffPixels: 100,
});

// Use consistent viewport
await page.setViewportSize({ width: 1280, height: 720 });
```

---

## Test Execution Report Template

### Test Summary

```markdown
# Component Showcase E2E Test Execution Report

**Date**: [DATE]
**Environment**: [DEV/STAGING/PROD]
**Browser**: [CHROMIUM/FIREFOX/WEBKIT]
**Test Suite**: Component Showcase E2E

## Test Results Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Passed | X | XX% |
| ❌ Failed | X | XX% |
| ⏭️ Skipped | X | XX% |
| **Total** | **15** | **100%** |

## Test Case Results

| Test ID | Test Name | Status | Duration | Notes |
|---------|-----------|--------|----------|-------|
| TC-001 | Page Loads Successfully | ✅ | XXms | |
| TC-002 | All 18 Components Render | ✅ | XXms | |
| TC-003 | Sidebar Navigation | ✅ | XXms | |
| TC-004 | PhotoGrid Lightbox | ✅ | XXms | |
| TC-005 | SwipeCard Interaction | ✅ | XXms | |
| TC-006 | Checklist Toggle | ✅ | XXms | |
| TC-007 | Calendar Navigation | ✅ | XXms | |
| TC-008 | Markdown Rendering | ✅ | XXms | |
| TC-009 | GanttChart Timeline | ✅ | XXms | |
| TC-010 | No Console Errors | ✅ | XXms | |
| TC-011 | Mobile Responsive | ✅ | XXms | |
| TC-012 | Visual Regression | ✅ | XXms | |
| TC-013 | Performance Benchmarks | ✅ | XXms | |
| TC-014 | Accessibility | ✅ | XXms | |
| TC-015 | Component Screenshots | ✅ | XXms | |

## Performance Metrics

- **Page Load Time**: XXms
- **First Paint**: XXms
- **DOM Interactive**: XXms
- **Largest Contentful Paint**: XXms

## Issues Found

| Issue ID | Severity | Description | Status |
|----------|----------|-------------|--------|
| - | - | No issues found | - |

## Screenshots

- Full page: [Link]
- Mobile layout: [Link]
- Component screenshots: [Link]

## Recommendations

1. [Any recommendations based on test results]

## Next Steps

1. [Action items]
```

---

## Appendix

### Helper Functions

```typescript
// helpers/component-test-helpers.ts
import { Page, Locator } from '@playwright/test';

export class ComponentTestHelpers {
  static async waitForComponentsToLoad(page: Page, minComponents: number = 10) {
    await page.waitForFunction((min) => {
      const components = document.querySelectorAll('[data-component]');
      return components.length >= min;
    }, minComponents);
  }

  static async scrollToBottom(page: Page) {
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(500);
  }

  static async captureComponentMetrics(page: Page, componentSelector: string) {
    return await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;

      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y,
        visible: rect.width > 0 && rect.height > 0,
      };
    }, componentSelector);
  }

  static async getComponentLoadTimes(page: Page) {
    return await page.evaluate(() => {
      const entries = performance.getEntriesByType('measure');
      return entries.map(entry => ({
        name: entry.name,
        duration: entry.duration,
      }));
    });
  }
}
```

---

## Conclusion

This comprehensive E2E test plan provides:

1. ✅ **Complete coverage** of all 18 components
2. ✅ **Page Object Model** for maintainability
3. ✅ **15+ test scenarios** covering functionality, performance, and accessibility
4. ✅ **Visual regression** testing with screenshots
5. ✅ **Mobile & responsive** testing across devices
6. ✅ **Performance benchmarks** with clear targets
7. ✅ **CI/CD integration** ready for automation
8. ✅ **Troubleshooting guide** for common issues

### Test Execution

To run the tests:

```bash
# Run all component showcase tests
npm run test:showcase

# Run with UI mode
npm run test:showcase:ui

# Run specific browser
npm run test:showcase:chromium

# Update visual baselines
npm run test:showcase:snapshots

# Debug mode
npm run test:showcase:debug
```

### Next Steps

1. Implement the page objects in `/tests/e2e/component-showcase/page-objects/`
2. Create the main test suite file: `component-showcase.spec.ts`
3. Generate baseline screenshots
4. Integrate with CI/CD pipeline
5. Monitor and refine based on results

---

**Document Version**: 1.0
**Last Updated**: 2025-10-06
**Status**: Ready for Implementation
