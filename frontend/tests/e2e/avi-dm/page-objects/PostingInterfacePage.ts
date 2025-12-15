import { Page, Locator, expect } from '@playwright/test';
import { AviChatPage } from './AviChatPage';

export class PostingInterfacePage {
  readonly page: Page;
  readonly tabNavigation: Locator;
  readonly quickPostTab: Locator;
  readonly postTab: Locator;
  readonly aviDMTab: Locator;
  readonly tabContent: Locator;
  readonly aviChat: AviChatPage;

  constructor(page: Page) {
    this.page = page;
    this.tabNavigation = page.getByRole('navigation', { name: /posting tabs/i });
    this.quickPostTab = page.getByRole('button', { name: /quick post/i });
    this.postTab = page.getByRole('button', { name: /^post$/i });
    this.aviDMTab = page.getByRole('button', { name: /avi dm/i });
    this.tabContent = page.locator('.p-4').last();
    this.aviChat = new AviChatPage(page);
  }

  async navigateToPostingInterface() {
    await this.page.goto('/');
    await expect(this.tabNavigation).toBeVisible();
  }

  async switchToTab(tab: 'quick' | 'post' | 'avi') {
    const tabMap = {
      quick: this.quickPostTab,
      post: this.postTab,
      avi: this.aviDMTab
    };

    await tabMap[tab].click();
    await expect(tabMap[tab]).toHaveAttribute('aria-selected', 'true');
  }

  async isTabActive(tab: 'quick' | 'post' | 'avi') {
    const tabMap = {
      quick: this.quickPostTab,
      post: this.postTab,
      avi: this.aviDMTab
    };

    const ariaSelected = await tabMap[tab].getAttribute('aria-selected');
    return ariaSelected === 'true';
  }

  async getActiveTabContent() {
    return this.tabContent;
  }

  // Quick Post functionality
  async createQuickPost(content: string) {
    await this.switchToTab('quick');
    const quickPostInput = this.page.getByPlaceholder(/what's on your mind/i);
    const submitButton = this.page.getByRole('button', { name: /quick post/i });

    await quickPostInput.fill(content);
    await submitButton.click();
  }

  // Full Post functionality
  async createFullPost(title: string, content: string) {
    await this.switchToTab('post');
    const titleInput = this.page.getByPlaceholder(/post title/i);
    const contentInput = this.page.getByPlaceholder(/write your post/i);
    const publishButton = this.page.getByRole('button', { name: /publish/i });

    await titleInput.fill(title);
    await contentInput.fill(content);
    await publishButton.click();
  }

  // Avi DM functionality
  async startAviConversation(message: string) {
    await this.switchToTab('avi');
    await this.aviChat.sendMessage(message);
  }
}