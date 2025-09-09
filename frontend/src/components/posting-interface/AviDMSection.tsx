import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  Search,
  MessageCircle,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Loader,
  Paperclip,
  Smile
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  agentName?: string;
}

interface Conversation {
  id: string;
  agentId: string;
  agentName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'online' | 'away' | 'offline';
}

interface AviDMSectionProps {
  onMessageSent?: (message: any) => void;
  isMobile?: boolean;
  className?: string;
}

// Mock agents for DM
const AVAILABLE_AGENTS = [
  { id: 'tech-reviewer', name: 'TechReviewer', status: 'online', avatar: 'T', expertise: 'Code Review & Architecture' },
  { id: 'system-validator', name: 'SystemValidator', status: 'online', avatar: 'S', expertise: 'System Testing & Validation' },
  { id: 'code-auditor', name: 'CodeAuditor', status: 'away', avatar: 'C', expertise: 'Security & Code Quality' },
  { id: 'quality-assurance', name: 'QualityAssurance', status: 'online', avatar: 'Q', expertise: 'QA & Testing' },
  { id: 'performance-analyst', name: 'PerformanceAnalyst', status: 'offline', avatar: 'P', expertise: 'Performance Optimization' },
];

const QUICK_REPLIES = [
  "Can you review this?",
  "What's your opinion on...",
  "Need help with...",
  "Can you validate this approach?",
  "Status update please",
  "Quick question:"
];

export const AviDMSection: React.FC<AviDMSectionProps> = ({
  onMessageSent,
  isMobile = false,
  className
}) => {
  // State management
  const [selectedAgent, setSelectedAgent] = useState<typeof AVAILABLE_AGENTS[0] | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAgentSearch, setShowAgentSearch] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Filter agents based on search
  const filteredAgents = AVAILABLE_AGENTS.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.expertise.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Auto-resize message textarea
  useEffect(() => {
    const textarea = messageRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Load conversation when agent is selected
  useEffect(() => {
    if (selectedAgent) {
      loadConversation(selectedAgent.id);
      setShowAgentSearch(false);
    }
  }, [selectedAgent]);
  
  // Load conversation history
  const loadConversation = useCallback(async (agentId: string) => {
    try {
      // In a real app, this would fetch from API
      // For now, simulate conversation history
      const mockMessages: Message[] = [
        {
          id: '1',
          content: `Hello! I'm ${AVAILABLE_AGENTS.find(a => a.id === agentId)?.name}. How can I help you today?`,
          sender: 'agent',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'read',
          agentName: AVAILABLE_AGENTS.find(a => a.id === agentId)?.name
        }
      ];
      
      setMessages(mockMessages);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }, []);
  
  // Send message
  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!message.trim() || !selectedAgent || isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        content: message.trim(),
        sender: 'user',
        timestamp: new Date(),
        status: 'sent'
      };
      
      // Add user message to UI
      setMessages(prev => [...prev, newMessage]);
      
      // Prepare DM data for backend
      const dmData = {
        title: `DM to ${selectedAgent.name}`,
        content: message.trim(),
        author_agent: 'user-agent',
        metadata: {
          isDM: true,
          targetAgent: selectedAgent.id,
          targetAgentName: selectedAgent.name,
          conversationId: `conv-${selectedAgent.id}`,
          postType: 'direct-message',
          isPrivate: true,
          timestamp: new Date().toISOString()
        }
      };
      
      // Send to API
      const response = await fetch('/api/v1/agent-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dmData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      const result = await response.json();
      
      // Update message status
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id 
          ? { ...msg, status: 'delivered' as const }
          : msg
      ));
      
      // Clear message input
      setMessage('');
      
      // Simulate agent typing response (in real app, this would be WebSocket)
      setIsTyping(true);
      setTimeout(() => {
        const agentResponse: Message = {
          id: `agent-${Date.now()}`,
          content: `Thanks for the message! I'll review this and get back to you shortly.`,
          sender: 'agent',
          timestamp: new Date(),
          status: 'read',
          agentName: selectedAgent.name
        };
        
        setMessages(prev => [...prev, agentResponse]);
        setIsTyping(false);
      }, 2000 + Math.random() * 3000);
      
      // Notify parent component
      onMessageSent?.(result.data);
      
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // Remove failed message from UI
      setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
    } finally {
      setIsSubmitting(false);
    }
  }, [message, selectedAgent, isSubmitting, onMessageSent]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);
  
  // Use quick reply
  const useQuickReply = (reply: string) => {
    setMessage(reply);
    setTimeout(() => {
      messageRef.current?.focus();
    }, 0);
  };
  
  // Render agent selector
  const renderAgentSelector = () => {
    if (selectedAgent && !showAgentSearch) {
      return (
        <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
                selectedAgent.status === 'online' ? "bg-green-500" :
                selectedAgent.status === 'away' ? "bg-yellow-500" : "bg-gray-500"
              )}>
                {selectedAgent.avatar}
              </div>
              <div className={cn(
                "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                selectedAgent.status === 'online' ? "bg-green-400" :
                selectedAgent.status === 'away' ? "bg-yellow-400" : "bg-gray-400"
              )} />
            </div>
            <div>
              <div className="font-medium text-gray-900">{selectedAgent.name}</div>
              <div className="text-xs text-gray-500">{selectedAgent.expertise}</div>
            </div>
          </div>
          
          <button
            onClick={() => setShowAgentSearch(true)}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Change
          </button>
        </div>
      );
    }
    
    return (
      <div className="p-4 border-b border-gray-100">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Agent to Message
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents by name or expertise..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className={cn(
          "grid gap-2",
          isMobile ? "grid-cols-1" : "grid-cols-2"
        )}>
          {filteredAgents.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="relative">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold",
                  agent.status === 'online' ? "bg-green-500" :
                  agent.status === 'away' ? "bg-yellow-500" : "bg-gray-500"
                )}>
                  {agent.avatar}
                </div>
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white",
                  agent.status === 'online' ? "bg-green-400" :
                  agent.status === 'away' ? "bg-yellow-400" : "bg-gray-400"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{agent.name}</div>
                <div className="text-xs text-gray-500 truncate">{agent.expertise}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };
  
  // Render conversation
  const renderConversation = () => {
    if (!selectedAgent) return null;
    
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-80">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.sender === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-xs lg:max-w-sm px-3 py-2 rounded-lg",
                msg.sender === 'user'
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              )}>
                <div className="text-sm">{msg.content}</div>
                <div className={cn(
                  "flex items-center justify-between mt-1 text-xs",
                  msg.sender === 'user' ? "text-blue-100" : "text-gray-500"
                )}>
                  <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.sender === 'user' && (
                    <div className="flex items-center space-x-1">
                      {msg.status === 'sent' && <Check className="w-3 h-3" />}
                      {msg.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                      {msg.status === 'read' && <CheckCheck className="w-3 h-3 text-blue-300" />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-3 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <span className="text-xs text-gray-500 ml-2">{selectedAgent.name} is typing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Quick replies */}
        {!isMobile && messages.length <= 1 && (
          <div className="px-4 py-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-2">Quick Replies:</div>
            <div className="flex flex-wrap gap-1">
              {QUICK_REPLIES.map(reply => (
                <button
                  key={reply}
                  onClick={() => useQuickReply(reply)}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-600 transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render message input
  const renderMessageInput = () => {
    if (!selectedAgent) return null;
    
    return (
      <div className="p-4 border-t border-gray-100">
        {error && (
          <div className="flex items-center space-x-2 p-2 mb-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={messageRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${selectedAgent.name}...`}
              className={cn(
                "w-full p-3 pr-20 border border-gray-300 rounded-lg resize-none",
                "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                isMobile && "text-base" // Prevent zoom on mobile
              )}
              rows={1}
              maxLength={1000}
            />
            
            {/* Input actions */}
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
              <button
                type="button"
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!message.trim() || isSubmitting}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2",
              !message.trim() || isSubmitting
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
          >
            {isSubmitting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {!isMobile && <span>Send</span>}
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500">
          Press ⌘+Enter to send • Direct messages are private
        </div>
      </div>
    );
  };
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {renderAgentSelector()}
      {selectedAgent && renderConversation()}
      {renderMessageInput()}
    </div>
  );
};