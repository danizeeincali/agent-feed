/**
 * Test Comment Counter Fix
 *
 * This script verifies that the parseEngagement and getCommentCount utility functions
 * correctly handle JSON string engagement data from the backend.
 */

// Mock post data from backend (engagement as JSON string)
const mockPost1 = {
  id: 'post-1761317277425',
  title: 'Test Post with Comments',
  comments: null,
  engagement: '{"comments":1,"likes":0,"shares":0,"views":0}'
};

const mockPost2 = {
  id: 'post-1761288063230',
  title: 'Test Post without Comments',
  comments: null,
  engagement: '{"comments":0,"likes":0,"shares":0,"views":0}'
};

const mockPost3 = {
  id: 'post-no-engagement',
  title: 'Test Post missing engagement',
  comments: null,
  engagement: null
};

const mockPost4 = {
  id: 'post-already-parsed',
  title: 'Test Post with parsed engagement',
  comments: 5,
  engagement: { comments: 3, likes: 0, shares: 0, views: 0 }
};

// Utility function from fix
function parseEngagement(engagement) {
  if (!engagement) return { comments: 0, likes: 0, shares: 0, views: 0 };
  if (typeof engagement === 'string') {
    try {
      return JSON.parse(engagement);
    } catch (e) {
      console.error('Failed to parse engagement data:', e);
      return { comments: 0, likes: 0, shares: 0, views: 0 };
    }
  }
  return engagement;
}

// Utility function from fix
function getCommentCount(post) {
  // Parse engagement if it's a string
  const engagement = parseEngagement(post.engagement);

  // Priority: engagement.comments > root comments > 0
  if (engagement && typeof engagement.comments === 'number') {
    return engagement.comments;
  }
  if (typeof post.comments === 'number') {
    return post.comments;
  }
  return 0;
}

// Run tests
console.log('\n=== Comment Counter Fix Tests ===\n');

console.log('Test 1: Post with engagement.comments = 1');
const count1 = getCommentCount(mockPost1);
console.log(`  Expected: 1, Got: ${count1}`, count1 === 1 ? '✅' : '❌');

console.log('\nTest 2: Post with engagement.comments = 0');
const count2 = getCommentCount(mockPost2);
console.log(`  Expected: 0, Got: ${count2}`, count2 === 0 ? '✅' : '❌');

console.log('\nTest 3: Post with null engagement');
const count3 = getCommentCount(mockPost3);
console.log(`  Expected: 0, Got: ${count3}`, count3 === 0 ? '✅' : '❌');

console.log('\nTest 4: Post with already parsed engagement');
const count4 = getCommentCount(mockPost4);
console.log(`  Expected: 3, Got: ${count4}`, count4 === 3 ? '✅' : '❌');

console.log('\n=== Parse Engagement Tests ===\n');

console.log('Test 5: Parse JSON string engagement');
const parsed1 = parseEngagement(mockPost1.engagement);
console.log(`  Type: ${typeof parsed1}, comments: ${parsed1.comments}`,
  typeof parsed1 === 'object' && parsed1.comments === 1 ? '✅' : '❌');

console.log('\nTest 6: Handle null engagement');
const parsed2 = parseEngagement(null);
console.log(`  Type: ${typeof parsed2}, comments: ${parsed2.comments}`,
  typeof parsed2 === 'object' && parsed2.comments === 0 ? '✅' : '❌');

console.log('\nTest 7: Handle already parsed engagement');
const parsed3 = parseEngagement(mockPost4.engagement);
console.log(`  Type: ${typeof parsed3}, comments: ${parsed3.comments}`,
  typeof parsed3 === 'object' && parsed3.comments === 3 ? '✅' : '❌');

console.log('\n=== All Tests Complete ===\n');
