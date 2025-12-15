/**
 * Loading Animation System
 * Provides sparkle animations and loading indicators for Claude processing
 */

class LoadingAnimator {
  constructor() {
    this.loadingMessages = [
      "✨ Thinking...",
      "🔍 Analyzing...", 
      "⚙️ Processing...",
      "🧠 Computing...",
      "💭 Contemplating...",
      "🔬 Examining...",
      "📊 Evaluating...",
      "🎯 Focusing...",
      "⚡ Energizing...",
      "🌟 Sparkling...",
      "🔮 Divining...",
      "🎪 Orchestrating...",
      "🚀 Launching...",
      "💫 Twinkling...",
      "🎭 Preparing..."
    ];
    
    this.complexLoadingMessages = [
      "🔄 Claude is working hard...",
      "⏳ Complex operation in progress...",
      "🎨 Crafting the perfect response...",
      "🧪 Mixing some AI magic...",
      "🔬 Deep analysis mode engaged...",
      "🎯 Precision targeting engaged...",
      "🌊 Riding the data waves...",
      "🎪 Orchestrating multiple tools...",
      "🚀 Launching advanced algorithms..."
    ];

    this.activeAnimations = new Map();
  }

  /**
   * Get a random loading message
   */
  getRandomMessage(isComplex = false) {
    const messages = isComplex ? this.complexLoadingMessages : this.loadingMessages;
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Start a loading animation for an instance
   */
  startAnimation(instanceId, isComplex = false) {
    if (this.activeAnimations.has(instanceId)) {
      this.stopAnimation(instanceId);
    }

    const messages = isComplex ? this.complexLoadingMessages : this.loadingMessages;
    let messageIndex = 0;
    let dotCount = 0;

    const interval = setInterval(() => {
      const baseMessage = messages[messageIndex % messages.length];
      const dots = '.'.repeat((dotCount % 3) + 1);
      const animatedMessage = `${baseMessage}${dots}`;

      // Broadcast the animated message
      this.broadcastAnimation(instanceId, animatedMessage);

      dotCount++;
      if (dotCount % 6 === 0) { // Change message every 6 dot cycles (2 seconds)
        messageIndex++;
      }
    }, 333); // Update every 333ms for smooth animation

    this.activeAnimations.set(instanceId, {
      interval,
      startTime: Date.now(),
      messageCount: 0
    });

    // Return initial message
    return this.getRandomMessage(isComplex);
  }

  /**
   * Stop animation for an instance
   */
  stopAnimation(instanceId) {
    const animation = this.activeAnimations.get(instanceId);
    if (animation) {
      clearInterval(animation.interval);
      this.activeAnimations.delete(instanceId);
      
      // Send completion indicator
      this.broadcastAnimation(instanceId, "✅ Ready", true);
    }
  }

  /**
   * Broadcast animation update (override this method to integrate with your WebSocket system)
   */
  broadcastAnimation(instanceId, message, isComplete = false) {
    // This will be overridden by the main system
    console.log(`🎭 Animation [${instanceId}]: ${message}`);
  }

  /**
   * Get loading statistics
   */
  getStats() {
    const activeCount = this.activeAnimations.size;
    const stats = [];
    
    for (const [instanceId, animation] of this.activeAnimations.entries()) {
      stats.push({
        instanceId,
        duration: Date.now() - animation.startTime,
        messageCount: animation.messageCount
      });
    }

    return { activeCount, animations: stats };
  }

  /**
   * Generate a loading message based on the query complexity
   */
  getLoadingMessageForQuery(query) {
    const complexKeywords = ['search', 'find', 'create', 'write', 'build', 'generate', 'analyze', 'process', 'tool'];
    const isComplex = complexKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );

    return {
      message: this.getRandomMessage(isComplex),
      isComplex
    };
  }

  /**
   * Create a sparkle effect message
   */
  createSparkleMessage(text) {
    const sparkles = ['✨', '💫', '⭐', '🌟', '💥', '✴️'];
    const randomSparkle = sparkles[Math.floor(Math.random() * sparkles.length)];
    return `${randomSparkle} ${text} ${randomSparkle}`;
  }
}

// Export singleton
const loadingAnimator = new LoadingAnimator();

module.exports = {
  LoadingAnimator,
  loadingAnimator
};