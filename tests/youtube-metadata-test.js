/**
 * YouTube Metadata Extraction Test
 * Tests the real YouTube metadata extraction vs generic placeholders
 */

import { linkPreviewService } from '../src/services/LinkPreviewService.js';

const testYouTubeUrls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  'https://youtu.be/dQw4w9WgXcQ', // Short URL format
  'https://www.youtube.com/watch?v=9bZkp7q19f0', // Gangnam Style
  'https://www.youtube.com/embed/dQw4w9WgXcQ' // Embed format
];

async function testYouTubeMetadataExtraction() {
  console.log('🎬 Testing YouTube Metadata Extraction');
  console.log('=====================================\n');

  for (const url of testYouTubeUrls) {
    try {
      console.log(`Testing: ${url}`);
      console.log('⏳ Fetching metadata...');
      
      const start = Date.now();
      const preview = await linkPreviewService.getLinkPreview(url);
      const duration = Date.now() - start;
      
      console.log('✅ Results:');
      console.log(`   📺 Title: "${preview.title}"`);
      console.log(`   📝 Description: "${preview.description}"`);
      console.log(`   👤 Author/Channel: "${preview.author || preview.site_name}"`);
      console.log(`   🖼️  Image: ${preview.image ? '✅ Available' : '❌ Missing'}`);
      console.log(`   🎬 Video ID: ${preview.videoId || 'Not extracted'}`);
      console.log(`   ⚡ Fetch time: ${duration}ms`);
      console.log(`   🔄 Fallback used: ${preview.fallback ? 'YES' : 'NO'}`);
      
      // Check for generic placeholder patterns
      const isGeneric = preview.title === 'YouTube Video' || 
                       preview.description === 'Click to play video' ||
                       preview.site_name === 'youtube.com';
      
      if (isGeneric) {
        console.log('⚠️  WARNING: Generic placeholder detected!');
      } else {
        console.log('🎉 SUCCESS: Real metadata extracted!');
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.error(`❌ Error testing ${url}:`, error.message);
      console.log('---\n');
    }
  }
}

async function testOEmbedAPIDirectly() {
  console.log('🔧 Testing YouTube oEmbed API Directly');
  console.log('=====================================\n');
  
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(testUrl)}&format=json`;
  
  try {
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Direct oEmbed API Response:');
      console.log(`   Title: "${data.title}"`);
      console.log(`   Author: "${data.author_name}"`);
      console.log(`   Channel URL: "${data.author_url}"`);
      console.log(`   Thumbnail: ${data.thumbnail_url ? '✅' : '❌'}`);
      console.log(`   Provider: "${data.provider_name}"`);
      console.log('');
    } else {
      console.log(`❌ oEmbed API returned status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Direct oEmbed test failed:', error.message);
  }
}

async function compareBehavior() {
  console.log('🔍 Comparing Before vs After Implementation');
  console.log('==========================================\n');
  
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  // Simulate old behavior
  const oldBehavior = {
    title: 'YouTube Video',
    description: 'Click to play video',
    site_name: 'youtube.com'
  };
  
  // New behavior
  const newBehavior = await linkPreviewService.getLinkPreview(testUrl);
  
  console.log('📊 Comparison Results:');
  console.log('\n🔴 OLD (Generic):');
  console.log(`   Title: "${oldBehavior.title}"`);
  console.log(`   Description: "${oldBehavior.description}"`);
  console.log(`   Site: "${oldBehavior.site_name}"`);
  
  console.log('\n🟢 NEW (Real Metadata):');
  console.log(`   Title: "${newBehavior.title}"`);
  console.log(`   Description: "${newBehavior.description}"`);
  console.log(`   Channel: "${newBehavior.author || newBehavior.site_name}"`);
  
  const improvement = newBehavior.title !== 'YouTube Video' && 
                     newBehavior.description !== 'Click to play video';
  
  console.log(`\n${improvement ? '🎉 IMPROVEMENT CONFIRMED!' : '⚠️ Still using generic data'}`);
}

// Run all tests
async function runAllTests() {
  try {
    await testOEmbedAPIDirectly();
    await testYouTubeMetadataExtraction();
    await compareBehavior();
    
    console.log('✅ All YouTube metadata tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { testYouTubeMetadataExtraction, testOEmbedAPIDirectly, compareBehavior };