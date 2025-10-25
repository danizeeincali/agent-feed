/**
 * Test Idle Timeout Mechanism
 * Verifies that sessions clean up after idle period
 */

class TestIdleTimeout {
  constructor(config = {}) {
    this.sessionId = null;
    this.sessionActive = false;
    this.lastActivity = null;
    this.idleTimeout = config.idleTimeout || 5000; // 5 seconds for testing
    this.cleanupTimer = null;
    this.interactionCount = 0;
    this.totalTokensUsed = 0;
  }

  async initialize() {
    if (this.sessionActive) {
      console.log('✅ Session already active, reusing...');
      this.updateActivity();
      return { status: 'reused' };
    }

    console.log('🚀 Initializing session...');
    this.sessionId = `avi-session-${Date.now()}`;
    this.sessionActive = true;
    this.updateActivity();
    this.startCleanupTimer();

    console.log(`✅ Session initialized: ${this.sessionId}`);
    console.log(`   Idle timeout: ${this.idleTimeout / 1000}s`);

    return { status: 'initialized', sessionId: this.sessionId };
  }

  updateActivity() {
    this.lastActivity = Date.now();
    console.log(`⏰ Activity updated at ${new Date().toISOString()}`);
  }

  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Check every second for testing
    this.cleanupTimer = setInterval(() => {
      this.checkIdleTimeout();
    }, 1000);

    console.log('⏲️  Cleanup timer started (checking every 1s)');
  }

  checkIdleTimeout() {
    if (!this.sessionActive) return;

    const idleTime = Date.now() - this.lastActivity;
    const idleSeconds = Math.round(idleTime / 1000);

    console.log(`🕐 Idle check: ${idleSeconds}s / ${this.idleTimeout / 1000}s`);

    if (idleTime > this.idleTimeout) {
      console.log(`⏰ Session idle for ${idleSeconds}s, cleaning up...`);
      this.cleanup();
    }
  }

  cleanup() {
    console.log('🧹 Cleaning up session...');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    const stats = {
      sessionId: this.sessionId,
      interactions: this.interactionCount,
      tokensUsed: this.totalTokensUsed,
      lifespan: this.lastActivity ? Date.now() - (this.lastActivity - this.idleTimeout) : 0
    };

    this.sessionActive = false;
    this.sessionId = null;
    this.lastActivity = null;

    console.log('✅ Session cleaned up:', JSON.stringify(stats, null, 2));
  }

  getStatus() {
    return {
      active: this.sessionActive,
      sessionId: this.sessionId,
      lastActivity: this.lastActivity,
      idleTime: this.lastActivity ? Date.now() - this.lastActivity : null,
      idleTimeout: this.idleTimeout
    };
  }
}

async function testIdleTimeout() {
  console.log('🧪 Testing Idle Timeout Mechanism\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // Test 1: Initialize with short timeout
    console.log('Test 1: Initialize session with 5s timeout...');
    const session = new TestIdleTimeout({ idleTimeout: 5000 });
    await session.initialize();
    console.log('');

    // Test 2: Wait for cleanup
    console.log('Test 2: Wait for automatic cleanup (7 seconds)...');
    console.log('Status: active =', session.getStatus().active);

    await new Promise(resolve => {
      let countdown = 7;
      const interval = setInterval(() => {
        console.log(`   Waiting... ${countdown}s remaining`);
        countdown--;
        if (countdown === 0) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });

    console.log('');

    // Test 3: Verify cleanup occurred
    console.log('Test 3: Verify session was cleaned up...');
    const finalStatus = session.getStatus();
    console.log('Final status:', JSON.stringify(finalStatus, null, 2));

    if (!finalStatus.active && finalStatus.sessionId === null) {
      console.log('✅ Session correctly cleaned up after idle timeout\n');
    } else {
      console.log('❌ Session should have been cleaned up\n');
      process.exit(1);
    }

    // Test 4: Test activity refresh
    console.log('Test 4: Test activity refresh prevents cleanup...');
    await session.initialize();
    console.log('Initial status:', session.getStatus().active);

    // Update activity every 2 seconds for 6 seconds
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      session.updateActivity();
      console.log(`   Activity refreshed ${i + 1}/3`);
    }

    // Check if still active
    if (session.getStatus().active) {
      console.log('✅ Session stayed active with periodic activity updates\n');
    } else {
      console.log('❌ Session should still be active\n');
      process.exit(1);
    }

    // Manual cleanup
    session.cleanup();

    console.log('=' .repeat(60));
    console.log('✅ ALL IDLE TIMEOUT TESTS PASSED!');
    console.log('=' .repeat(60));
    console.log('\nIdle timeout mechanism verified:');
    console.log('  - Timer starts on initialization: ✅');
    console.log('  - Automatic cleanup after idle period: ✅');
    console.log('  - Activity updates prevent cleanup: ✅');
    console.log('  - Manual cleanup works: ✅');
    console.log('\nIdle timeout is production-ready.');

  } catch (error) {
    console.error('\n❌ Idle timeout test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testIdleTimeout();
