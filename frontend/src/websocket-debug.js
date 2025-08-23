/**
 * Frontend WebSocket Debug Helper
 * Add this to browser console to test WebSocket connection
 */

function testWebSocket() {
  console.log('🔍 Testing WebSocket Connection from Frontend...');
  
  // Load Socket.IO from CDN if not available
  if (typeof io === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.4/socket.io.min.js';
    script.onload = () => {
      console.log('📦 Socket.IO loaded, retrying connection...');
      setTimeout(testConnection, 1000);
    };
    document.head.appendChild(script);
    return;
  }
  
  testConnection();
}

// Make available globally
window.testWebSocket = testWebSocket;

function testConnection() {
  const urls = [
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3001'
  ];
  
  console.log('🧪 Testing multiple WebSocket URLs...');
  
  urls.forEach((url, index) => {
    setTimeout(() => {
      console.log(`\n📡 Attempting connection to: ${url}`);
      
      const socket = io(url, {
        timeout: 5000,
        transports: ['websocket', 'polling'],
        forceNew: true
      });
      
      socket.on('connect', () => {
        console.log(`✅ Connected to ${url}!`);
        console.log(`   Socket ID: ${socket.id}`);
        
        // Register as frontend
        socket.emit('registerFrontend', {
          type: 'frontend',
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        });
        
        // Disconnect after 3 seconds
        setTimeout(() => {
          socket.disconnect();
          console.log(`🔌 Disconnected from ${url}`);
        }, 3000);
      });
      
      socket.on('hubRegistered', (data) => {
        console.log(`🎯 Registered with hub:`, data);
      });
      
      socket.on('connect_error', (error) => {
        console.log(`❌ Failed to connect to ${url}:`, error.message);
      });
      
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Disconnected from ${url}:`, reason);
      });
      
    }, index * 1000);
  });
}

// Auto-test when script loads
console.log('💡 WebSocket Debug Helper Loaded!');
console.log('💡 Run: testWebSocket() to test connections');
console.log('💡 Or visit: http://localhost:3002/health to check hub status');

// Auto-run test
setTimeout(() => {
  console.log('\n🚀 Auto-running WebSocket test...');
  window.testWebSocket();
}, 1000);

export { testWebSocket };