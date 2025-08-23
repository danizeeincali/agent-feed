/**
 * TDD London School Mock for BroadcastChannel
 * 
 * Mocks BroadcastChannel behavior for cross-tab synchronization testing
 * with focus on interaction verification and message flow validation.
 */

export interface MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage: jest.MockedFunction<(message: any) => void>;
  close: jest.MockedFunction<() => void>;
  addEventListener: jest.MockedFunction<(type: string, listener: EventListener) => void>;
  removeEventListener: jest.MockedFunction<(type: string, listener: EventListener) => void>;
  dispatchEvent: jest.MockedFunction<(event: Event) => boolean>;
}

export interface BroadcastChannelManager {
  createChannel: (name: string) => MockBroadcastChannel;
  getChannel: (name: string) => MockBroadcastChannel | undefined;
  getAllChannels: () => MockBroadcastChannel[];
  simulateMessage: (channelName: string, message: any) => void;
  simulateMessageAcrossChannels: (channelName: string, message: any) => void;
  clearChannelHistory: () => void;
  getChannelMessageHistory: (channelName: string) => any[];
  isChannelActive: (channelName: string) => boolean;
}

// Track all created channels and their message history
const channels: Map<string, MockBroadcastChannel[]> = new Map();
const messageHistory: Map<string, any[]> = new Map();

function createMockBroadcastChannel(name: string): MockBroadcastChannel {
  const channel: MockBroadcastChannel = {
    name,
    onmessage: null,
    onmessageerror: null,
    
    postMessage: jest.fn().mockImplementation((message: any) => {
      // Record message in history
      const history = messageHistory.get(name) || [];
      history.push({
        message,
        timestamp: new Date().toISOString(),
        sender: channel
      });
      messageHistory.set(name, history);
      
      // Simulate message delivery to other channels with the same name
      const sameNameChannels = channels.get(name) || [];
      sameNameChannels.forEach(otherChannel => {
        if (otherChannel !== channel && otherChannel.onmessage) {
          // Simulate async message delivery
          setTimeout(() => {
            const messageEvent = new MessageEvent('message', {
              data: message,
              origin: window.location.origin,
              source: null,
              ports: []
            });
            otherChannel.onmessage!(messageEvent);
          }, 0);
        }
      });
    }),
    
    close: jest.fn().mockImplementation(() => {
      // Remove from active channels
      const sameNameChannels = channels.get(name) || [];
      const index = sameNameChannels.indexOf(channel);
      if (index > -1) {
        sameNameChannels.splice(index, 1);
      }
      
      // Clear event handlers
      channel.onmessage = null;
      channel.onmessageerror = null;
    }),
    
    addEventListener: jest.fn().mockImplementation((type: string, listener: EventListener) => {
      if (type === 'message') {
        channel.onmessage = listener as any;
      } else if (type === 'messageerror') {
        channel.onmessageerror = listener as any;
      }
    }),
    
    removeEventListener: jest.fn().mockImplementation((type: string, listener: EventListener) => {
      if (type === 'message' && channel.onmessage === listener) {
        channel.onmessage = null;
      } else if (type === 'messageerror' && channel.onmessageerror === listener) {
        channel.onmessageerror = null;
      }
    }),
    
    dispatchEvent: jest.fn().mockImplementation((event: Event) => {
      // Simple implementation - in practice would need more sophisticated event handling
      return true;
    })
  };
  
  // Track this channel
  const sameNameChannels = channels.get(name) || [];
  sameNameChannels.push(channel);
  channels.set(name, sameNameChannels);
  
  // Initialize message history for this channel name if not exists
  if (!messageHistory.has(name)) {
    messageHistory.set(name, []);
  }
  
  return channel;
}

// Mock BroadcastChannel constructor
export const MockBroadcastChannelConstructor = jest.fn().mockImplementation((name: string) => {
  return createMockBroadcastChannel(name);
});

// Manager for test control
export const broadcastChannelManager: BroadcastChannelManager = {
  createChannel: createMockBroadcastChannel,
  
  getChannel: (name: string) => {
    const sameNameChannels = channels.get(name);
    return sameNameChannels && sameNameChannels.length > 0 ? sameNameChannels[0] : undefined;
  },
  
  getAllChannels: () => {
    const allChannels: MockBroadcastChannel[] = [];
    channels.forEach(channelList => {
      allChannels.push(...channelList);
    });
    return allChannels;
  },
  
  simulateMessage: (channelName: string, message: any) => {
    const sameNameChannels = channels.get(channelName) || [];
    sameNameChannels.forEach(channel => {
      if (channel.onmessage) {
        const messageEvent = new MessageEvent('message', {
          data: message,
          origin: window.location.origin,
          source: null,
          ports: []
        });
        channel.onmessage(messageEvent);
      }
    });
  },
  
  simulateMessageAcrossChannels: (channelName: string, message: any) => {
    // This simulates a message being sent from an external source to all channels
    broadcastChannelManager.simulateMessage(channelName, message);
  },
  
  clearChannelHistory: () => {
    channels.clear();
    messageHistory.clear();
  },
  
  getChannelMessageHistory: (channelName: string) => {
    return messageHistory.get(channelName) || [];
  },
  
  isChannelActive: (channelName: string) => {
    const sameNameChannels = channels.get(channelName);
    return sameNameChannels ? sameNameChannels.length > 0 : false;
  }
};

// Global setup for BroadcastChannel mock
(global as any).BroadcastChannel = MockBroadcastChannelConstructor;

export { MockBroadcastChannelConstructor as BroadcastChannel };