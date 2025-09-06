// Live Browser Debugging Script for Comment Threading & URL Navigation
// Execute this in browser console to diagnose the issues

console.log("🐛 Starting Live Browser Debug Session...");

// 1. Check if DOM elements exist
function checkDOMStructure() {
  console.log("\n=== 1. DOM STRUCTURE ANALYSIS ===");
  
  // Check if comments are loaded
  const commentElements = document.querySelectorAll('[id^="comment-"]');
  console.log(`Found ${commentElements.length} comment elements with IDs:`);
  
  commentElements.forEach((el, i) => {
    const id = el.id;
    const classList = [...el.classList];
    const threadLevel = classList.find(c => c.includes('comment-level-')) || 'none';
    const hasThreading = classList.includes('ml-6') && classList.includes('border-l');
    
    console.log(`  ${i + 1}. ID: ${id}`);
    console.log(`     Threading classes: ${hasThreading ? '✅' : '❌'} (ml-6 border-l)`);
    console.log(`     Thread level: ${threadLevel}`);
    console.log(`     All classes: ${classList.join(', ')}`);
  });
  
  // Check for buildCommentTree function
  console.log("\n--- Build Comment Tree Function Check ---");
  const buildCommentTreeExists = typeof window.buildCommentTree !== 'undefined';
  console.log(`buildCommentTree function: ${buildCommentTreeExists ? '✅ Available' : '❌ Missing'}`);
}

// 2. Test API Responses
async function checkAPIData() {
  console.log("\n=== 2. API DATA ANALYSIS ===");
  
  try {
    const response = await fetch('/api/v1/agent-posts/prod-post-1/comments');
    const data = await response.json();
    
    console.log(`API Response Status: ${response.status}`);
    console.log(`Comments loaded: ${data.data?.length || 0}`);
    
    if (data.data) {
      const parentComments = data.data.filter(c => !c.parentId);
      const childComments = data.data.filter(c => c.parentId);
      
      console.log(`Parent comments: ${parentComments.length}`);
      console.log(`Child comments: ${childComments.length}`);
      
      // Check thread structure
      console.log("\n--- Thread Structure Analysis ---");
      data.data.slice(0, 3).forEach((comment, i) => {
        console.log(`Comment ${i + 1}:`);
        console.log(`  ID: ${comment.id}`);
        console.log(`  Parent ID: ${comment.parentId || 'none'}`);
        console.log(`  Depth: ${comment.depth}`);
        console.log(`  Thread Path: ${comment.threadPath}`);
        console.log(`  Is Reply: ${comment.isReply}`);
      });
    }
  } catch (error) {
    console.error("❌ API Error:", error);
  }
}

// 3. Test URL Navigation
function testURLNavigation() {
  console.log("\n=== 3. URL NAVIGATION TEST ===");
  
  // Test specific problematic URL
  const testCommentId = "comment-1757127735674-dc8nox5mx";
  const testURL = `#comment-${testCommentId}`;
  
  console.log(`Testing URL: ${window.location.origin}${window.location.pathname}${testURL}`);
  
  // Check if element exists
  const element = document.getElementById(`comment-${testCommentId}`);
  console.log(`Target element exists: ${element ? '✅' : '❌'}`);
  
  if (element) {
    console.log(`Element classes: ${[...element.classList].join(', ')}`);
    console.log(`Element position:`, element.getBoundingClientRect());
  }
  
  // Test hash change handling
  console.log("\n--- Hash Change Event Testing ---");
  const originalHash = window.location.hash;
  
  // Listen for hash changes
  let hashChangeDetected = false;
  const hashChangeHandler = () => {
    hashChangeDetected = true;
    console.log(`Hash changed to: ${window.location.hash}`);
  };
  
  window.addEventListener('hashchange', hashChangeHandler);
  
  // Test navigation
  setTimeout(() => {
    window.location.hash = testURL;
    
    setTimeout(() => {
      console.log(`Hash change event fired: ${hashChangeDetected ? '✅' : '❌'}`);
      console.log(`Current hash: ${window.location.hash}`);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        console.log(`Element scrolled into view: ${isVisible ? '✅' : '❌'}`);
        console.log(`Element position after navigation:`, rect);
      }
      
      // Cleanup
      window.removeEventListener('hashchange', hashChangeHandler);
      window.location.hash = originalHash;
    }, 500);
  }, 100);
}

// 4. Check React Component State
function checkReactState() {
  console.log("\n=== 4. REACT COMPONENT STATE ===");
  
  // Find React root
  const rootElement = document.getElementById('root');
  if (rootElement && rootElement._reactInternalInstance) {
    console.log("React instance found ✅");
  } else {
    console.log("React instance not found or different structure ❌");
  }
  
  // Check for CommentThread component in console
  console.log("Check React DevTools for CommentThread component state");
  console.log("Look for: threadState.expanded, threadState.highlighted");
}

// 5. Test buildCommentTree function directly
function testCommentTreeBuilding() {
  console.log("\n=== 5. COMMENT TREE BUILDING TEST ===");
  
  // Mock data that matches API structure
  const mockComments = [
    {
      id: "comment-1",
      parentId: null,
      content: "Parent comment",
      author: "User1",
      depth: 0,
      threadDepth: 0,
      repliesCount: 2
    },
    {
      id: "comment-2", 
      parentId: "comment-1",
      content: "Child comment 1",
      author: "User2", 
      depth: 1,
      threadDepth: 1,
      repliesCount: 0
    },
    {
      id: "comment-3",
      parentId: "comment-1", 
      content: "Child comment 2",
      author: "User3",
      depth: 1, 
      threadDepth: 1,
      repliesCount: 0
    }
  ];
  
  console.log("Mock comments:", mockComments);
  
  // Try to access buildCommentTree from global scope or component
  if (typeof window.buildCommentTree === 'function') {
    const tree = window.buildCommentTree(mockComments);
    console.log("Built tree:", tree);
  } else {
    console.log("❌ buildCommentTree not accessible - this may be the issue!");
  }
}

// 6. Comprehensive CSS Analysis
function checkCSSStyles() {
  console.log("\n=== 6. CSS THREADING STYLES ANALYSIS ===");
  
  const commentElements = document.querySelectorAll('[id^="comment-"]');
  
  commentElements.forEach((el, i) => {
    const computedStyle = window.getComputedStyle(el);
    const hasMarginLeft = computedStyle.marginLeft !== '0px';
    const hasBorderLeft = computedStyle.borderLeftWidth !== '0px';
    
    console.log(`Comment ${i + 1} (${el.id}):`);
    console.log(`  Margin Left: ${computedStyle.marginLeft} ${hasMarginLeft ? '✅' : '❌'}`);
    console.log(`  Border Left: ${computedStyle.borderLeftWidth} ${hasBorderLeft ? '✅' : '❌'}`);
    console.log(`  Position: ${computedStyle.position}`);
    console.log(`  Display: ${computedStyle.display}`);
  });
}

// Main debug execution
async function runFullDebug() {
  console.log("🚀 Running Complete Browser Debug Session");
  console.log("==========================================");
  
  checkDOMStructure();
  await checkAPIData();
  testURLNavigation();
  checkReactState();
  testCommentTreeBuilding();
  checkCSSStyles();
  
  console.log("\n🏁 Debug Session Complete!");
  console.log("Check above output for issues marked with ❌");
}

// Auto-run after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runFullDebug);
} else {
  runFullDebug();
}

// Export for manual execution
window.debugCommentThreading = runFullDebug;
window.checkDOMStructure = checkDOMStructure;
window.checkAPIData = checkAPIData;
window.testURLNavigation = testURLNavigation;

console.log("🎯 Debug functions available:");
console.log("  - window.debugCommentThreading() - Run full debug");
console.log("  - window.checkDOMStructure() - Check DOM only");
console.log("  - window.checkAPIData() - Check API only"); 
console.log("  - window.testURLNavigation() - Test URL nav only");