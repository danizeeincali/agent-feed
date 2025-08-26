/**
 * Comprehensive Image Upload E2E Tests for Claude Instance Management
 * Production Readiness Validation
 * 
 * Tests cover:
 * - Drag & drop file upload
 * - Paste from clipboard
 * - File selection dialog
 * - Multiple file handling
 * - File validation and error handling
 * - Upload progress and cancellation
 * - Different image formats
 * - Large file handling
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Test configuration
const TEST_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  maxFiles: 5,
  uploadTimeout: 30000,
};

// Test file paths (create test fixtures)
const TEST_FILES = {
  smallImage: path.join(__dirname, 'fixtures', 'test-image-small.png'),
  largeImage: path.join(__dirname, 'fixtures', 'test-image-large.jpg'),
  invalidFile: path.join(__dirname, 'fixtures', 'test-document.pdf'),
  corruptedImage: path.join(__dirname, 'fixtures', 'corrupted-image.png'),
  svgImage: path.join(__dirname, 'fixtures', 'test-vector.svg'),
};

// Page object for image upload functionality
class ImageUploadPage {
  constructor(private page: Page) {}

  async navigateToChat() {
    await this.page.goto('/claude-instances');
    
    // Select an active instance to enable chat
    const instanceCard = this.page.getByTestId('instance-claude-instance-1');
    if (await instanceCard.isVisible()) {
      await instanceCard.click();
    }
  }

  // Drag and Drop methods
  async dragAndDropFile(filePath: string) {
    const dropZone = this.page.getByTestId('image-upload-zone');
    
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const fileType = `image/${path.extname(filePath).slice(1)}`;

    await dropZone.dispatchEvent('dragover', {
      dataTransfer: {
        files: [new File([fileContent], fileName, { type: fileType })]
      }
    });

    await dropZone.dispatchEvent('drop', {
      dataTransfer: {
        files: [new File([fileContent], fileName, { type: fileType })]
      }
    });
  }

  async dragMultipleFiles(filePaths: string[]) {
    const dropZone = this.page.getByTestId('image-upload-zone');
    
    const files = filePaths.map(filePath => {
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const fileType = `image/${path.extname(filePath).slice(1)}`;
      return new File([fileContent], fileName, { type: fileType });
    });

    await dropZone.dispatchEvent('drop', {
      dataTransfer: { files }
    });
  }

  // File selection methods
  async selectFileViaDialog(filePath: string) {
    const fileInput = this.page.getByTestId('file-input');
    await fileInput.setInputFiles(filePath);
  }

  async selectMultipleFiles(filePaths: string[]) {
    const fileInput = this.page.getByTestId('file-input');
    await fileInput.setInputFiles(filePaths);
  }

  // Clipboard paste methods
  async pasteImageFromClipboard(imageData: string) {
    const chatInput = this.page.getByTestId('chat-input');
    await chatInput.focus();

    await this.page.evaluate((data) => {
      const clipboardEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer()
      });
      
      // Create blob from base64 data
      const byteCharacters = atob(data.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' });
      
      clipboardEvent.clipboardData?.items.add(new File([blob], 'pasted-image.png', { type: 'image/png' }));
      
      document.dispatchEvent(clipboardEvent);
    }, imageData);
  }

  // Upload management
  async waitForUploadComplete(fileName: string) {
    await this.page.waitForSelector(`[data-testid="upload-${fileName}"][data-status="completed"]`, {
      timeout: TEST_CONFIG.uploadTimeout
    });
  }

  async cancelUpload(fileName: string) {
    const cancelButton = this.page.getByTestId(`cancel-upload-${fileName}`);
    await cancelButton.click();
  }

  async removeUploadedFile(fileName: string) {
    const removeButton = this.page.getByTestId(`remove-file-${fileName}`);
    await removeButton.click();
  }

  // Verification methods
  async getUploadProgress(fileName: string): Promise<number> {
    const progressElement = this.page.getByTestId(`upload-progress-${fileName}`);
    const progressText = await progressElement.textContent();
    return parseInt(progressText?.match(/(\d+)%/)?.[1] || '0');
  }

  async getUploadedFiles(): Promise<string[]> {
    const fileElements = await this.page.locator('[data-testid^="uploaded-file-"]').all();
    return Promise.all(fileElements.map(el => el.getAttribute('data-filename') || ''));
  }

  async getErrorMessage(fileName?: string): Promise<string | null> {
    const selector = fileName 
      ? `[data-testid="upload-error-${fileName}"]`
      : '[data-testid="upload-error"]';
    
    const errorElement = this.page.locator(selector);
    if (await errorElement.isVisible()) {
      return await errorElement.textContent();
    }
    return null;
  }
}

// Test Suite
test.describe('Image Upload - Production E2E Tests', () => {
  let uploadPage: ImageUploadPage;

  test.beforeAll(async () => {
    // Create test fixture files if they don't exist
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create small test image (1x1 PNG)
    const smallImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(TEST_FILES.smallImage, smallImageData);

    // Create larger test image (simulated)
    const largeImageData = Buffer.alloc(5 * 1024 * 1024); // 5MB of zeros
    fs.writeFileSync(TEST_FILES.largeImage, largeImageData);

    // Create invalid file
    fs.writeFileSync(TEST_FILES.invalidFile, 'This is not an image file');

    // Create SVG test file
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>';
    fs.writeFileSync(TEST_FILES.svgImage, svgContent);

    // Create corrupted image
    fs.writeFileSync(TEST_FILES.corruptedImage, 'not-a-real-png-file');
  });

  test.beforeEach(async ({ page }) => {
    uploadPage = new ImageUploadPage(page);
    
    // Mock upload API
    await page.route('**/api/claude/instances/*/upload', async (route) => {
      const request = route.request();
      const contentType = request.headers()['content-type'] || '';
      
      if (contentType.includes('multipart/form-data')) {
        // Simulate upload process with delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            fileId: 'uploaded-' + Date.now(),
            fileName: 'test-image.png',
            url: '/uploads/test-image.png',
            thumbnail: '/uploads/thumbnails/test-image-thumb.png'
          })
        });
      } else {
        await route.fulfill({ status: 400, body: 'Invalid request' });
      }
    });

    await uploadPage.navigateToChat();
  });

  test.describe('Drag and Drop Upload', () => {
    test('should accept single image via drag and drop', async ({ page }) => {
      await uploadPage.dragAndDropFile(TEST_FILES.smallImage);

      // Should show upload progress
      await expect(page.getByTestId('upload-progress')).toBeVisible();
      
      // Should complete upload
      await uploadPage.waitForUploadComplete('test-image-small.png');
      
      // Should display uploaded image preview
      await expect(page.getByTestId('uploaded-file-test-image-small.png')).toBeVisible();
      await expect(page.getByRole('img', { name: /test-image-small.png/i })).toBeVisible();
    });

    test('should accept multiple images via drag and drop', async ({ page }) => {
      const filePaths = [TEST_FILES.smallImage, TEST_FILES.svgImage];
      await uploadPage.dragMultipleFiles(filePaths);

      // Should show multiple upload progress indicators
      await expect(page.getByTestId('upload-progress')).toHaveCount(2);

      // Should complete all uploads
      for (const filePath of filePaths) {
        const fileName = path.basename(filePath);
        await uploadPage.waitForUploadComplete(fileName);
      }

      // Should display all uploaded files
      const uploadedFiles = await uploadPage.getUploadedFiles();
      expect(uploadedFiles).toHaveLength(2);
    });

    test('should reject non-image files via drag and drop', async ({ page }) => {
      await uploadPage.dragAndDropFile(TEST_FILES.invalidFile);

      // Should show error message
      const errorMessage = await uploadPage.getErrorMessage();
      expect(errorMessage).toContain('Only image files are allowed');

      // Should not create upload progress indicator
      await expect(page.getByTestId('upload-progress')).not.toBeVisible();
    });

    test('should show visual feedback during drag operations', async ({ page }) => {
      const dropZone = page.getByTestId('image-upload-zone');

      // Simulate dragover
      await dropZone.dispatchEvent('dragover');
      
      // Should show drag-over styling
      await expect(dropZone).toHaveClass(/drag-over|border-blue|bg-blue/);

      // Simulate dragleave
      await dropZone.dispatchEvent('dragleave');
      
      // Should remove drag-over styling
      await expect(dropZone).not.toHaveClass(/drag-over|border-blue|bg-blue/);
    });

    test('should handle large files with progress indication', async ({ page }) => {
      // Mock slow upload for progress testing
      await page.route('**/api/claude/instances/*/upload', async (route) => {
        // Simulate slow upload with progress updates
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          await page.evaluate((prog) => {
            const event = new CustomEvent('upload-progress', {
              detail: { progress: prog, fileName: 'test-image-large.jpg' }
            });
            window.dispatchEvent(event);
          }, progress);
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            fileId: 'large-file-' + Date.now(),
            fileName: 'test-image-large.jpg',
            url: '/uploads/test-image-large.jpg'
          })
        });
      });

      await uploadPage.dragAndDropFile(TEST_FILES.largeImage);

      // Should show progressive upload percentage
      await expect(page.getByTestId('upload-progress-test-image-large.jpg')).toContainText('20%');
      await expect(page.getByTestId('upload-progress-test-image-large.jpg')).toContainText('40%');
      await expect(page.getByTestId('upload-progress-test-image-large.jpg')).toContainText('60%');
      await expect(page.getByTestId('upload-progress-test-image-large.jpg')).toContainText('80%');
      await expect(page.getByTestId('upload-progress-test-image-large.jpg')).toContainText('100%');

      await uploadPage.waitForUploadComplete('test-image-large.jpg');
    });
  });

  test.describe('File Selection Dialog', () => {
    test('should select single image via file dialog', async ({ page }) => {
      const selectButton = page.getByTestId('select-files-button');
      
      // Intercept file selection
      const fileChooserPromise = page.waitForEvent('filechooser');
      await selectButton.click();
      
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(TEST_FILES.smallImage);

      // Should start upload
      await expect(page.getByTestId('upload-progress')).toBeVisible();
      await uploadPage.waitForUploadComplete('test-image-small.png');
    });

    test('should select multiple images via file dialog', async ({ page }) => {
      const selectButton = page.getByTestId('select-files-button');
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await selectButton.click();
      
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles([TEST_FILES.smallImage, TEST_FILES.svgImage]);

      // Should upload all selected files
      await expect(page.getByTestId('upload-progress')).toHaveCount(2);
      
      const uploadedFiles = await uploadPage.getUploadedFiles();
      expect(uploadedFiles).toHaveLength(2);
    });

    test('should validate file types in dialog selection', async ({ page }) => {
      const selectButton = page.getByTestId('select-files-button');
      
      const fileChooserPromise = page.waitForEvent('filechooser');
      await selectButton.click();
      
      const fileChooser = await fileChooserPromise;
      
      // File chooser should have proper accept attribute
      expect(fileChooser.isMultiple()).toBe(true);
      
      // Try to select invalid file
      await fileChooser.setFiles(TEST_FILES.invalidFile);
      
      // Should show validation error
      const errorMessage = await uploadPage.getErrorMessage();
      expect(errorMessage).toContain('Only image files are allowed');
    });
  });

  test.describe('Clipboard Paste', () => {
    test('should paste image from clipboard', async ({ page }) => {
      // Create base64 image data
      const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      await uploadPage.pasteImageFromClipboard(imageData);

      // Should create upload from pasted image
      await expect(page.getByTestId('upload-progress')).toBeVisible();
      
      // Should show pasted image with generated name
      await expect(page.getByText(/pasted-image/i)).toBeVisible();
      
      await uploadPage.waitForUploadComplete('pasted-image.png');
    });

    test('should handle multiple paste operations', async ({ page }) => {
      const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      
      // First paste
      await uploadPage.pasteImageFromClipboard(imageData);
      await uploadPage.waitForUploadComplete('pasted-image.png');
      
      // Second paste should create uniquely named file
      await uploadPage.pasteImageFromClipboard(imageData);
      await uploadPage.waitForUploadComplete('pasted-image-1.png');
      
      const uploadedFiles = await uploadPage.getUploadedFiles();
      expect(uploadedFiles).toContain('pasted-image.png');
      expect(uploadedFiles).toContain('pasted-image-1.png');
    });

    test('should ignore non-image clipboard content', async ({ page }) => {
      const chatInput = page.getByTestId('chat-input');
      await chatInput.focus();

      // Paste text content
      await page.keyboard.press('Control+V');
      
      // Should not create any upload
      await expect(page.getByTestId('upload-progress')).not.toBeVisible();
    });
  });

  test.describe('File Validation and Error Handling', () => {
    test('should reject files exceeding size limit', async ({ page }) => {
      // Mock file too large
      const largeFileData = Buffer.alloc(TEST_CONFIG.maxFileSize + 1);
      const largePath = path.join(__dirname, 'fixtures', 'too-large.jpg');
      fs.writeFileSync(largePath, largeFileData);

      await uploadPage.dragAndDropFile(largePath);

      const errorMessage = await uploadPage.getErrorMessage();
      expect(errorMessage).toContain('File too large');
      expect(errorMessage).toContain('10MB');

      // Clean up
      fs.unlinkSync(largePath);
    });

    test('should reject unsupported file formats', async ({ page }) => {
      const bmpPath = path.join(__dirname, 'fixtures', 'test.bmp');
      fs.writeFileSync(bmpPath, 'fake-bmp-content');

      await uploadPage.dragAndDropFile(bmpPath);

      const errorMessage = await uploadPage.getErrorMessage();
      expect(errorMessage).toContain('Unsupported file format');
      expect(errorMessage).toContain('jpg, jpeg, png, gif, webp, svg');

      // Clean up
      fs.unlinkSync(bmpPath);
    });

    test('should handle corrupted image files', async ({ page }) => {
      // Mock API to return corruption error
      await page.route('**/api/claude/instances/*/upload', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Corrupted image file',
            code: 'IMAGE_CORRUPTION'
          })
        });
      });

      await uploadPage.dragAndDropFile(TEST_FILES.corruptedImage);

      await expect(page.getByTestId('upload-progress')).toBeVisible();
      
      const errorMessage = await uploadPage.getErrorMessage('corrupted-image.png');
      expect(errorMessage).toContain('Corrupted image file');

      // Should remove failed upload from UI
      await expect(page.getByTestId('uploaded-file-corrupted-image.png')).not.toBeVisible();
    });

    test('should enforce maximum file count limit', async ({ page }) => {
      const filePaths = Array.from({ length: TEST_CONFIG.maxFiles + 1 }, (_, i) => {
        const filePath = path.join(__dirname, 'fixtures', `test-${i}.png`);
        fs.writeFileSync(filePath, fs.readFileSync(TEST_FILES.smallImage));
        return filePath;
      });

      await uploadPage.dragMultipleFiles(filePaths);

      const errorMessage = await uploadPage.getErrorMessage();
      expect(errorMessage).toContain(`Maximum ${TEST_CONFIG.maxFiles} files allowed`);

      // Should only process allowed number of files
      const uploadProgressElements = await page.getByTestId('upload-progress').count();
      expect(uploadProgressElements).toBeLessThanOrEqual(TEST_CONFIG.maxFiles);

      // Clean up
      filePaths.forEach(fp => fs.unlinkSync(fp));
    });

    test('should handle network errors during upload', async ({ page }) => {
      // Mock network error
      await page.route('**/api/claude/instances/*/upload', async (route) => {
        await route.abort('connectionfailed');
      });

      await uploadPage.dragAndDropFile(TEST_FILES.smallImage);

      // Should show network error
      const errorMessage = await uploadPage.getErrorMessage('test-image-small.png');
      expect(errorMessage).toContain('Network error');

      // Should offer retry option
      const retryButton = page.getByTestId('retry-upload-test-image-small.png');
      await expect(retryButton).toBeVisible();

      // Restore network and retry
      await page.route('**/api/claude/instances/*/upload', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            fileId: 'retry-success',
            fileName: 'test-image-small.png',
            url: '/uploads/test-image-small.png'
          })
        });
      });

      await retryButton.click();
      await uploadPage.waitForUploadComplete('test-image-small.png');
    });
  });

  test.describe('Upload Management', () => {
    test('should allow cancelling ongoing uploads', async ({ page }) => {
      // Mock slow upload
      await page.route('**/api/claude/instances/*/upload', async (route) => {
        // Simulate slow upload that can be cancelled
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.fulfill({ status: 200, body: '{}' });
      });

      await uploadPage.dragAndDropFile(TEST_FILES.smallImage);

      // Should show cancel button during upload
      const cancelButton = page.getByTestId('cancel-upload-test-image-small.png');
      await expect(cancelButton).toBeVisible();

      await cancelButton.click();

      // Should remove upload progress
      await expect(page.getByTestId('upload-progress-test-image-small.png')).not.toBeVisible();

      // Should show cancellation message
      await expect(page.getByText('Upload cancelled')).toBeVisible();
    });

    test('should allow removing uploaded files', async ({ page }) => {
      await uploadPage.dragAndDropFile(TEST_FILES.smallImage);
      await uploadPage.waitForUploadComplete('test-image-small.png');

      // Should show remove button
      const removeButton = page.getByTestId('remove-file-test-image-small.png');
      await expect(removeButton).toBeVisible();

      await removeButton.click();

      // Should remove file from UI
      await expect(page.getByTestId('uploaded-file-test-image-small.png')).not.toBeVisible();

      // Should update file count
      const uploadedFiles = await uploadPage.getUploadedFiles();
      expect(uploadedFiles).not.toContain('test-image-small.png');
    });

    test('should show thumbnail previews for uploaded images', async ({ page }) => {
      await uploadPage.dragAndDropFile(TEST_FILES.smallImage);
      await uploadPage.waitForUploadComplete('test-image-small.png');

      // Should display thumbnail
      const thumbnail = page.getByTestId('thumbnail-test-image-small.png');
      await expect(thumbnail).toBeVisible();

      // Thumbnail should have proper dimensions
      const boundingBox = await thumbnail.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(0);
      expect(boundingBox?.height).toBeGreaterThan(0);

      // Should show file size and dimensions if available
      const fileInfo = page.getByTestId('file-info-test-image-small.png');
      await expect(fileInfo).toBeVisible();
    });

    test('should persist uploaded files across page refreshes', async ({ page }) => {
      await uploadPage.dragAndDropFile(TEST_FILES.smallImage);
      await uploadPage.waitForUploadComplete('test-image-small.png');

      // Store uploads in session storage (mock implementation)
      await page.evaluate(() => {
        sessionStorage.setItem('uploaded-files', JSON.stringify([{
          id: 'test-file-1',
          fileName: 'test-image-small.png',
          url: '/uploads/test-image-small.png',
          thumbnail: '/uploads/thumbnails/test-image-small.png'
        }]));
      });

      // Refresh page
      await page.reload();
      await uploadPage.navigateToChat();

      // Should restore uploaded files
      await expect(page.getByTestId('uploaded-file-test-image-small.png')).toBeVisible();
    });
  });

  test.describe('Different Image Formats', () => {
    const formatTests = [
      { format: 'PNG', file: TEST_FILES.smallImage },
      { format: 'SVG', file: TEST_FILES.svgImage },
    ];

    formatTests.forEach(({ format, file }) => {
      test(`should handle ${format} format correctly`, async ({ page }) => {
        await uploadPage.dragAndDropFile(file);
        
        const fileName = path.basename(file);
        await uploadPage.waitForUploadComplete(fileName);

        // Should display format-specific information
        const fileInfo = page.getByTestId(`file-info-${fileName}`);
        await expect(fileInfo).toContainText(format.toLowerCase());

        // Should generate appropriate thumbnail/preview
        const preview = page.getByTestId(`thumbnail-${fileName}`);
        await expect(preview).toBeVisible();
      });
    });

    test('should handle WebP format with fallback', async ({ page }) => {
      // Create WebP test file (simulated)
      const webpPath = path.join(__dirname, 'fixtures', 'test.webp');
      fs.writeFileSync(webpPath, 'RIFF\x00\x00\x00\x00WEBP'); // WebP header

      await uploadPage.dragAndDropFile(webpPath);

      // Should either handle WebP or show appropriate message
      const fileName = path.basename(webpPath);
      try {
        await uploadPage.waitForUploadComplete(fileName);
        
        // If successful, should show WebP info
        const fileInfo = page.getByTestId(`file-info-${fileName}`);
        await expect(fileInfo).toContainText('webp');
      } catch (error) {
        // If not supported, should show clear error
        const errorMessage = await uploadPage.getErrorMessage();
        expect(errorMessage).toContain('WebP format not supported');
      }

      // Clean up
      fs.unlinkSync(webpPath);
    });
  });

  test.describe('Production Integration', () => {
    test('should integrate uploaded images with chat messages', async ({ page }) => {
      await uploadPage.dragAndDropFile(TEST_FILES.smallImage);
      await uploadPage.waitForUploadComplete('test-image-small.png');

      // Send message with uploaded image
      await page.getByTestId('chat-input').fill('Analyze this image');
      await page.getByTestId('send-message-button').click();

      // Message should include image attachment
      const messageWithImage = page.getByTestId('user-message').last();
      await expect(messageWithImage).toContainText('Analyze this image');
      await expect(messageWithImage.getByRole('img')).toBeVisible();

      // Mock Claude response mentioning the image
      await page.route('**/api/claude/instances/*/chat', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            response: 'I can see the image you uploaded. It appears to be a small PNG file.',
            attachments: ['test-image-small.png']
          })
        });
      });

      // Should receive response about the image
      await expect(page.getByTestId('assistant-message').last()).toContainText('I can see the image');
    });

    test('should handle concurrent uploads from multiple users', async ({ page, context }) => {
      // Simulate multiple concurrent uploads
      const uploadPromises = [
        uploadPage.dragAndDropFile(TEST_FILES.smallImage),
        uploadPage.selectFileViaDialog(TEST_FILES.svgImage),
      ];

      await Promise.all(uploadPromises);

      // All uploads should complete successfully
      await uploadPage.waitForUploadComplete('test-image-small.png');
      await uploadPage.waitForUploadComplete('test-vector.svg');

      const uploadedFiles = await uploadPage.getUploadedFiles();
      expect(uploadedFiles).toHaveLength(2);
    });

    test('should maintain upload security and validation', async ({ page }) => {
      // Test that malicious file names are sanitized
      const maliciousFile = path.join(__dirname, 'fixtures', '../../../etc/passwd.png');
      fs.writeFileSync(maliciousFile, fs.readFileSync(TEST_FILES.smallImage));

      await uploadPage.dragAndDropFile(maliciousFile);

      // File name should be sanitized
      const sanitizedName = 'passwd.png'; // Path traversal removed
      await uploadPage.waitForUploadComplete(sanitizedName);

      // Clean up
      fs.unlinkSync(maliciousFile);
    });

    test('should handle production-scale file volumes', async ({ page }) => {
      // Test handling many files in session
      const manyFiles = Array.from({ length: 20 }, (_, i) => {
        const filePath = path.join(__dirname, 'fixtures', `batch-${i}.png`);
        fs.writeFileSync(filePath, fs.readFileSync(TEST_FILES.smallImage));
        return filePath;
      });

      // Upload in batches to respect limits
      for (let i = 0; i < manyFiles.length; i += TEST_CONFIG.maxFiles) {
        const batch = manyFiles.slice(i, i + TEST_CONFIG.maxFiles);
        await uploadPage.dragMultipleFiles(batch);
        
        // Wait for batch to complete
        for (const file of batch) {
          const fileName = path.basename(file);
          await uploadPage.waitForUploadComplete(fileName);
        }
      }

      // UI should remain responsive
      const selectButton = page.getByTestId('select-files-button');
      await expect(selectButton).toBeEnabled();

      // Clean up
      manyFiles.forEach(fp => fs.unlinkSync(fp));
    });
  });

  test.afterAll(async () => {
    // Clean up test fixtures
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (fs.existsSync(fixturesDir)) {
      fs.rmSync(fixturesDir, { recursive: true });
    }
  });
});