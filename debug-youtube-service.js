/**
 * Debug YouTube Service Integration
 * Tests the YouTube oEmbed service in isolation
 */

import { linkPreviewService } from './src/services/LinkPreviewService.js';

// Test the YouTube service in isolation
async function debugYouTubeService() {
    console.log('🔍 Debugging YouTube Service Integration');
    console.log('=====================================\n');

    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    
    try {
        // Check if the service recognizes YouTube URLs
        console.log('1. Testing YouTube URL detection:');
        const isYouTube = linkPreviewService.isYouTubeUrl(testUrl);
        console.log(`   isYouTubeUrl("${testUrl}") = ${isYouTube}`);
        
        // Test the YouTube service directly
        console.log('\n2. Testing YouTube metadata extraction:');
        if (linkPreviewService.youtubeService) {
            console.log('   ✅ YouTube service is initialized');
            
            try {
                const videoId = linkPreviewService.youtubeService.extractVideoId(testUrl);
                console.log(`   Video ID extracted: ${videoId}`);
                
                if (videoId) {
                    console.log('   Fetching oEmbed metadata...');
                    const metadata = await linkPreviewService.youtubeService.getYouTubeMetadata(testUrl);
                    console.log('   ✅ YouTube metadata result:');
                    console.log(`      Title: "${metadata.title}"`);
                    console.log(`      Author: "${metadata.author}"`);
                    console.log(`      Description: "${metadata.description}"`);
                    console.log(`      Thumbnail: ${metadata.thumbnail ? 'Available' : 'Missing'}`);
                    console.log(`      Fallback used: ${metadata.fallback ? 'YES' : 'NO'}`);
                } else {
                    console.log('   ❌ Failed to extract video ID');
                }
            } catch (error) {
                console.log(`   ❌ YouTube service error: ${error.message}`);
            }
        } else {
            console.log('   ❌ YouTube service is NOT initialized');
        }
        
        // Test the full link preview process
        console.log('\n3. Testing full link preview process:');
        const preview = await linkPreviewService.getLinkPreview(testUrl);
        console.log('   Full preview result:');
        console.log(`      Title: "${preview.title}"`);
        console.log(`      Description: "${preview.description}"`);
        console.log(`      Author: "${preview.author || preview.site_name}"`);
        console.log(`      Type: ${preview.type}`);
        console.log(`      Image: ${preview.image ? 'Available' : 'Missing'}`);
        console.log(`      Video ID: ${preview.videoId || 'Not available'}`);
        console.log(`      Fallback: ${preview.fallback ? 'YES' : 'NO'}`);
        
        // Analyze the results
        console.log('\n4. Analysis:');
        const hasRealMetadata = preview.title !== 'YouTube Video' && 
                              preview.description !== 'Click to play video' &&
                              preview.description !== 'Video content on YouTube';
        
        if (hasRealMetadata) {
            console.log('   🎉 SUCCESS: Real YouTube metadata extracted!');
        } else {
            console.log('   ⚠️  WARNING: Still using generic/fallback data');
            console.log('   This suggests the oEmbed API call failed or returned empty data');
        }
        
    } catch (error) {
        console.error('   ❌ Debug process failed:', error);
    }
}

// Test multiple video formats
async function testVideoFormats() {
    console.log('\n🎬 Testing Multiple Video URL Formats');
    console.log('=====================================\n');
    
    const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=9bZkp7q19f0',
    ];
    
    for (const url of testUrls) {
        console.log(`Testing: ${url}`);
        try {
            if (linkPreviewService.youtubeService) {
                const videoId = linkPreviewService.youtubeService.extractVideoId(url);
                console.log(`  Video ID: ${videoId}`);
                
                if (videoId) {
                    const metadata = await linkPreviewService.youtubeService.getYouTubeMetadata(url);
                    console.log(`  Title: "${metadata.title}"`);
                    console.log(`  Real metadata: ${!metadata.fallback && metadata.title !== 'YouTube Video'}`);
                }
            }
        } catch (error) {
            console.log(`  Error: ${error.message}`);
        }
        console.log('');
    }
}

// Run debug tests
async function runDebugTests() {
    try {
        await debugYouTubeService();
        await testVideoFormats();
        
        console.log('\n✅ Debug tests completed!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Debug tests failed:', error);
        process.exit(1);
    }
}

runDebugTests();