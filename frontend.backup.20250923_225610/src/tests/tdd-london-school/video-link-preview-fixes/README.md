# TDD London School: Video and Link Preview Fixes

## Overview

This test suite implements Test-Driven Development using the London School (mockist) approach to address critical video and link preview functionality issues. The tests are designed to **fail with the current implementation** and **pass once the issues are properly fixed**.

## 🚨 Failing Functionality Addressed

### 1. **Video Autoplay Issues**
- Videos not auto-playing when expanded after user interaction
- Double-click requirement for video playback instead of single-click
- Missing browser autoplay policy compliance

### 2. **YouTube Metadata Problems**
- Generic "YouTube Video" placeholders instead of real video titles
- Missing channel information, view counts, and durations
- No integration with YouTube oEmbed API

### 3. **Site Image Extraction Failures**
- Non-video links showing generic placeholder images
- CORS errors not handled with proxy fallbacks
- Open Graph and Twitter Card parsing not working
- Site-specific extraction patterns missing

### 4. **Component Integration Issues**
- Poor coordination between LinkPreview and YouTubeEmbed components
- State management problems during video expansion
- Event handling conflicts and missing accessibility features

## 🏗 London School TDD Approach

### Core Principles Applied

1. **Outside-In Development**: Tests drive development from user behavior down to implementation details
2. **Mock-Driven Design**: Use mocks to define contracts and isolate components  
3. **Behavior Verification**: Focus on how objects collaborate, not internal state
4. **Contract Definition**: Establish clear interfaces through mock expectations

### Mock-First Strategy

```typescript
// Example: Testing video autoplay contracts
const mockIFrame = createMockIFrameElement();
const mockUserInteraction = createMockUserInteraction();

// Test defines the contract: after user interaction, autoplay should be enabled
expect(mockIFrame.src).toContain('autoplay=1');
```

## 📁 Test Suite Structure

```
video-link-preview-fixes/
├── MockFactories.ts              # Reusable mock creation utilities
├── VideoAutoplayFailures.test.tsx        # Autoplay and interaction tests
├── YouTubeMetadataFailures.test.tsx      # Metadata extraction tests
├── SiteImageExtractionFailures.test.tsx  # Image and CORS handling tests
├── ComponentIntegrationFailures.test.tsx # Integration and coordination tests
├── TestRunner.test.tsx                   # Test validation and contracts
└── README.md                             # This documentation
```

## 🧪 Test Categories

### VideoAutoplayFailures.test.tsx
Tests that **will fail** until autoplay issues are fixed:
- `should START VIDEO IMMEDIATELY when expanded with user interaction`
- `should RESPECT BROWSER AUTOPLAY POLICIES with user gesture tracking`
- `should PLAY VIDEO on FIRST CLICK, not second`
- `should SET CORRECT AUTOPLAY PARAMETERS in iframe src`

### YouTubeMetadataFailures.test.tsx  
Tests that **will fail** until metadata extraction is implemented:
- `should EXTRACT REAL VIDEO TITLE from YouTube API, not generic placeholder`
- `should USE OEMBED API as primary metadata source`
- `should DISPLAY PUBLISH DATE and channel information`
- `should NEVER show generic "YouTube Video" when real title is available`

### SiteImageExtractionFailures.test.tsx
Tests that **will fail** until image extraction is improved:
- `should EXTRACT REAL IMAGES from Wired.com articles, not generic placeholders`
- `should HANDLE CORS ERRORS and fallback to proxy services`
- `should PRIORITIZE OPEN GRAPH IMAGES over other sources`
- `should EXTRACT SITE-SPECIFIC IMAGES with domain-aware patterns`

### ComponentIntegrationFailures.test.tsx
Tests that **will fail** until integration is improved:
- `should COORDINATE STATE between preview and video components`
- `should PREVENT EVENT CONFLICTS between overlapping components`
- `should MANAGE COMPONENT LIFECYCLES during content updates`
- `should HONOR CONTRACTS between all service layers`

## 🎯 Implementation Guidance

Each test provides specific guidance for fixes:

### For Video Autoplay Issues:
1. Add user interaction tracking with `document.wasLastActivatedByUser`
2. Update iframe parameters dynamically based on user interaction state
3. Implement proper autoplay policy compliance
4. Add single-click handlers that prevent double-click requirements

### For YouTube Metadata:
1. Integrate YouTube oEmbed API: `https://www.youtube.com/oembed?url=...`
2. Add fallback to YouTube Data API for rich metadata
3. Parse and format video durations, view counts, channel info
4. Replace generic placeholders with extracted real data

### For Site Image Extraction:
1. Parse Open Graph (`og:image`) and Twitter Card (`twitter:image`) meta tags
2. Implement CORS proxy fallback chain (images.weserv.nl, etc.)
3. Add site-specific extraction patterns (GitHub avatars, Medium images, etc.)
4. Validate image URLs and handle loading errors gracefully

### For Component Integration:
1. Improve state management between preview and video components
2. Add proper event handling and prevent conflicts
3. Implement component lifecycle management
4. Define and honor service contracts

## 🚀 Running the Tests

```bash
# Run all video/link preview tests
npm test video-link-preview-fixes

# Run specific test suites
npm test VideoAutoplayFailures.test.tsx
npm test YouTubeMetadataFailures.test.tsx
npm test SiteImageExtractionFailures.test.tsx
npm test ComponentIntegrationFailures.test.tsx
```

## ⚡ Expected Test Results

### Before Fixes (Current State):
```
❌ VideoAutoplayFailures: 8/8 tests failing
❌ YouTubeMetadataFailures: 9/9 tests failing  
❌ SiteImageExtractionFailures: 10/10 tests failing
❌ ComponentIntegrationFailures: 10/10 tests failing
```

### After Proper Implementation:
```
✅ VideoAutoplayFailures: 8/8 tests passing
✅ YouTubeMetadataFailures: 9/9 tests passing
✅ SiteImageExtractionFailures: 10/10 tests passing  
✅ ComponentIntegrationFailures: 10/10 tests passing
```

## 🔧 Mock Contracts

The test suite defines clear contracts for all collaborators:

```typescript
interface VideoPlayerContract {
  initializePlayer(config: any): Promise<void>;
  handleUserInteraction(): void;
  updateAutoplayParameters(enabled: boolean): void;
}

interface ImageExtractionContract {
  extractOpenGraphImage(html: string): string | null;
  tryProxyServices(originalUrl: string): Promise<string | null>;
  validateImageUrl(url: string): boolean;
}

interface YouTubeApiContract {
  fetchVideoMetadata(videoId: string): Promise<VideoMetadata>;
  extractVideoId(url: string): string | null;
  formatDuration(isoDuration: string): string;
}
```

## 🎬 Usage Example

```typescript
// Example test that will FAIL until autoplay is fixed
it('should START VIDEO IMMEDIATELY when expanded with user interaction', async () => {
  // Arrange: Mock user interaction
  mockUserInteraction.simulateUserClick();
  
  // Act: Render expanded video
  render(<YouTubeEmbed videoId="test" expandedMode={true} autoplay={true} />);
  
  // Assert: Should autoplay immediately
  expect(mockIFrame.src).toContain('autoplay=1');
});
```

## 🏆 Success Criteria

Tests pass when:
- ✅ Videos autoplay after user interaction without double-clicking
- ✅ Real YouTube titles and metadata replace generic placeholders
- ✅ Article images load from sites like Wired, GitHub, Medium
- ✅ CORS errors gracefully fallback to proxy services
- ✅ Components coordinate state and handle events properly

## 🤝 Contributing

When implementing fixes:
1. Run tests to see current failures
2. Implement minimal code to make one test pass
3. Refactor while keeping tests green
4. Move to next failing test
5. Ensure all tests pass before considering complete

This TDD approach ensures that fixes actually resolve the user-facing issues while maintaining code quality and proper architecture.