import { test, expect } from '@playwright/test';
import { AviChatPage } from '../page-objects/AviChatPage';
import { PostingInterfacePage } from '../page-objects/PostingInterfacePage';
import { TestHelpers } from '../utils/test-helpers';
import { testImages, performanceThresholds } from '../fixtures/test-data';
import path from 'path';

test.describe('Avi DM Image Upload', () => {
  let chatPage: AviChatPage;
  let postingInterface: PostingInterfacePage;

  test.beforeEach(async ({ page }) => {
    chatPage = new AviChatPage(page);
    postingInterface = new PostingInterfacePage(page);

    await TestHelpers.setupMockAPI(page, 'success');
    await postingInterface.navigateToPostingInterface();
    await postingInterface.switchToTab('avi');
  });

  test.afterEach(async ({ page }) => {
    await TestHelpers.clearMockAPI(page);
  });

  test('should display image upload button', async () => {
    await expect(chatPage.imageUploadButton).toBeVisible();
    await expect(chatPage.imageUploadButton).toHaveAttribute('title', /add images?/i);
  });

  test('should open file picker on image button click', async ({ page }) => {
    // Listen for file input interaction
    const fileChooserPromise = page.waitForEvent('filechooser');

    await chatPage.imageUploadButton.click();

    const fileChooser = await fileChooserPromise;
    expect(fileChooser.isMultiple()).toBeTruthy();
  });

  test('should upload single image successfully', async ({ page }) => {
    // Create a test image file
    const testImageBuffer = await TestHelpers.createTestImage(200, 200);
    const testImagePath = path.join(__dirname, '../fixtures/test-image.png');

    // Mock file upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await chatPage.imageUploadButton.click();
    const fileChooser = await fileChooserPromise;

    // Simulate selecting a file
    await fileChooser.setFiles([{
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: testImageBuffer
    }]);

    // Verify image appears in selected images
    await expect(chatPage.selectedImagesContainer).toBeVisible();
    await expect(chatPage.selectedImagesContainer).toContainText('test-image.png');
  });

  test('should upload multiple images', async ({ page }) => {
    const imageFiles = [
      { name: 'image1.png', mimeType: 'image/png', buffer: await TestHelpers.createTestImage(100, 100) },
      { name: 'image2.jpg', mimeType: 'image/jpeg', buffer: await TestHelpers.createTestImage(150, 150) },
      { name: 'image3.gif', mimeType: 'image/gif', buffer: await TestHelpers.createTestImage(120, 120) }
    ];

    const fileChooserPromise = page.waitForEvent('filechooser');
    await chatPage.imageUploadButton.click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles(imageFiles);

    // Verify all images appear
    for (const file of imageFiles) {
      await expect(chatPage.selectedImagesContainer).toContainText(file.name);
    }
  });

  test('should remove selected images', async ({ page }) => {
    // Upload an image first
    const testImageBuffer = await TestHelpers.createTestImage(100, 100);
    const fileChooserPromise = page.waitForEvent('filechooser');

    await chatPage.imageUploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([{
      name: 'test-image.png',
      mimeType: 'image/png',
      buffer: testImageBuffer
    }]);

    // Verify image is selected
    await expect(chatPage.selectedImagesContainer).toContainText('test-image.png');

    // Remove the image
    await chatPage.removeSelectedImage(0);

    // Verify image is removed
    await expect(chatPage.selectedImagesContainer).not.toContainText('test-image.png');
  });

  test('should send message with images', async ({ page }) => {
    const testImageBuffer = await TestHelpers.createTestImage(100, 100);
    const message = 'Please analyze this image';

    // Upload image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await chatPage.imageUploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([{
      name: 'analysis-image.png',
      mimeType: 'image/png',
      buffer: testImageBuffer
    }]);

    // Send message with image
    await chatPage.sendMessage(message);

    // Verify message contains both text and image reference
    const lastMessage = await chatPage.getLastMessage();
    await expect(lastMessage).toContainText(message);
    await expect(lastMessage).toContainText('analysis-image.png');

    // Verify selected images are cleared after sending
    await expect(chatPage.selectedImagesContainer).not.toBeVisible();
  });

  test('should validate image file types', async ({ page }) => {
    // Try to upload a non-image file
    const invalidFile = {
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF content')
    };

    const fileChooserPromise = page.waitForEvent('filechooser');
    await chatPage.imageUploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([invalidFile]);

    // Verify error message appears
    await expect(chatPage.errorDisplay).toBeVisible();
    await expect(chatPage.errorDisplay).toContainText(/only image files are allowed/i);
  });

  test('should limit maximum number of images', async ({ page }) => {
    // Try to upload 6 images (limit is 5)
    const imageFiles = Array.from({ length: 6 }, (_, i) => ({
      name: `image${i + 1}.png`,
      mimeType: 'image/png',
      buffer: Buffer.from(`image${i + 1}`)
    }));

    const fileChooserPromise = page.waitForEvent('filechooser');
    await chatPage.imageUploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imageFiles);

    // Verify error message for too many images
    await expect(chatPage.errorDisplay).toBeVisible();
    await expect(chatPage.errorDisplay).toContainText(/maximum 5 images allowed/i);
  });

  test('should handle large image files', async ({ page }) => {
    // Create a large image buffer (simulate large file)
    const largeImageBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB

    const fileChooserPromise = page.waitForEvent('filechooser');
    await chatPage.imageUploadButton.click();
    const fileChooser = await fileChooserPromise;

    const startTime = Date.now();
    await fileChooser.setFiles([{
      name: 'large-image.png',
      mimeType: 'image/png',
      buffer: largeImageBuffer
    }]);

    // Check upload performance
    const uploadDuration = Date.now() - startTime;
    expect(uploadDuration).toBeLessThan(performanceThresholds.imageUpload);
  });

  test('should maintain image preview consistency', async ({ page }) => {
    const testImages = [
      { name: 'preview1.png', mimeType: 'image/png', buffer: await TestHelpers.createTestImage(80, 80) },
      { name: 'preview2.jpg', mimeType: 'image/jpeg', buffer: await TestHelpers.createTestImage(90, 90) }
    ];

    const fileChooserPromise = page.waitForEvent('filechooser');
    await chatPage.imageUploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testImages);

    // Verify consistent preview styling
    const previewElements = chatPage.selectedImagesContainer.locator('.relative');
    const count = await previewElements.count();
    expect(count).toBe(testImages.length);

    // Check each preview has required elements
    for (let i = 0; i < count; i++) {
      const preview = previewElements.nth(i);
      await expect(preview.locator('[class*="w-4 h-4"]')).toBeVisible(); // Icon
      await expect(preview.locator('span')).toBeVisible(); // Filename
      await expect(preview.locator('button')).toBeVisible(); // Remove button
    }
  });

  test('should handle image upload errors gracefully', async ({ page }) => {
    // Simulate network error during upload
    await page.route('**/api/claude-code/streaming-chat', route => {
      route.abort('failed');
    });

    const testImageBuffer = await TestHelpers.createTestImage(100, 100);

    // Upload image and send message
    const fileChooserPromise = page.waitForEvent('filechooser');
    await chatPage.imageUploadButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([{
      name: 'error-test.png',
      mimeType: 'image/png',
      buffer: testImageBuffer
    }]);

    await chatPage.sendMessage('Test with image');

    // Verify error handling
    await expect(chatPage.errorDisplay).toBeVisible();
    await chatPage.waitForConnectionStatus('error');
  });

  test('should support different image formats', async ({ page }) => {
    const supportedFormats = [
      { name: 'test.png', mimeType: 'image/png' },
      { name: 'test.jpg', mimeType: 'image/jpeg' },
      { name: 'test.gif', mimeType: 'image/gif' },
      { name: 'test.webp', mimeType: 'image/webp' }
    ];

    for (const format of supportedFormats) {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await chatPage.imageUploadButton.click();
      const fileChooser = await fileChooserPromise;

      await fileChooser.setFiles([{
        name: format.name,
        mimeType: format.mimeType,
        buffer: await TestHelpers.createTestImage(50, 50)
      }]);

      // Verify format is accepted
      await expect(chatPage.selectedImagesContainer).toContainText(format.name);

      // Clear for next test
      await chatPage.removeSelectedImage(0);
    }
  });
});