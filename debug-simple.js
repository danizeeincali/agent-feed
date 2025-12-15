/**
 * Simple debug test for YouTube oEmbed API
 */
import fetch from 'node-fetch';

async function testYouTubeOEmbedDirect() {
    console.log('🔍 Testing YouTube oEmbed API Direct');
    console.log('===================================\n');
    
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(testUrl)}&format=json&maxwidth=640&maxheight=360`;
    
    try {
        console.log(`Calling: ${oembedUrl}`);
        const response = await fetch(oembedUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AgentFeed/1.0)',
                'Accept': 'application/json'
            },
            timeout: 10000
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('\n✅ SUCCESS: YouTube oEmbed API Response:');
            console.log(`   Title: "${data.title}"`);
            console.log(`   Author: "${data.author_name}"`);
            console.log(`   Channel URL: "${data.author_url}"`);
            console.log(`   Provider: "${data.provider_name}"`);
            console.log(`   Thumbnail: "${data.thumbnail_url}"`);
            console.log(`   Width x Height: ${data.width} x ${data.height}`);
            console.log(`   Thumbnail Size: ${data.thumbnail_width} x ${data.thumbnail_height}`);
            
            console.log('\n📝 Full JSON:');
            console.log(JSON.stringify(data, null, 2));
            
            return data;
        } else {
            console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
        return null;
    }
}

// Test multiple URLs
async function testMultipleUrls() {
    const urls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
        'https://youtu.be/9bZkp7q19f0', // Gangnam Style 
        'https://www.youtube.com/watch?v=LDU_Txk06tM', // My Heart Will Go On
    ];
    
    console.log('\n🎬 Testing Multiple YouTube URLs');
    console.log('================================\n');
    
    for (const url of urls) {
        console.log(`Testing: ${url}`);
        const result = await testYouTubeOEmbedDirect();
        if (result) {
            console.log(`  ✅ "${result.title}" by ${result.author_name}`);
        } else {
            console.log(`  ❌ Failed`);
        }
        console.log('');
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function runTests() {
    await testYouTubeOEmbedDirect();
    await testMultipleUrls();
    console.log('✅ All tests completed!');
}

runTests().catch(console.error);