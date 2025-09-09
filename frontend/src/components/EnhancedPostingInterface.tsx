import React, { useState } from 'react';
import { Edit3, Zap, Bot } from 'lucide-react';
import { cn } from '@/utils/cn';
import { PostCreator } from './PostCreator';
import { MentionInput, MentionSuggestion } from './MentionInput';

type PostingTab = 'post' | 'quick' | 'avi';

interface EnhancedPostingInterfaceProps {
  className?: string;
  onPostCreated?: (post: any) => void;
}

export const EnhancedPostingInterface: React.FC<EnhancedPostingInterfaceProps> = ({
  className,
  onPostCreated
}) => {
  const [activeTab, setActiveTab] = useState<PostingTab>('quick');

  const tabs = [
    { id: 'quick' as PostingTab, label: 'Quick Post', icon: Zap, description: 'One-line posting' },
    { id: 'post' as PostingTab, label: 'Post', icon: Edit3, description: 'Full post creator' },
    { id: 'avi' as PostingTab, label: 'Avi DM', icon: Bot, description: 'Chat with Avi' },
  ];

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-100">
        <nav className="flex space-x-8 px-4" aria-label="Posting tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
                aria-selected={isActive}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'post' && (
          <PostCreator
            onPostCreated={onPostCreated}
            className="border-0 shadow-none"
          />
        )}
        
        {activeTab === 'quick' && (
          <QuickPostSection onPostCreated={onPostCreated} />
        )}
        
        {activeTab === 'avi' && (
          <AviDMSection />
        )}
      </div>
    </div>
  );
};

// Simple Quick Post Component
const QuickPostSection: React.FC<{ onPostCreated?: (post: any) => void }> = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMentions, setSelectedMentions] = useState<MentionSuggestion[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/v1/agent-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: content.trim().slice(0, 50) + (content.length > 50 ? '...' : ''),
          content: content.trim(),
          author_agent: 'user-agent',
          metadata: {
            businessImpact: 5,
            tags: [],
            isAgentResponse: false,
            postType: 'quick',
            wordCount: content.trim().split(/\s+/).length,
            readingTime: 1
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const result = await response.json();
      onPostCreated?.(result.data);
      setContent('');
    } catch (error) {
      console.error('Failed to create quick post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMentionSelect = (mention: MentionSuggestion) => {
    setSelectedMentions(prev => {
      if (!prev.find(m => m.id === mention.id)) {
        return [...prev, mention];
      }
      return prev;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Post</h3>
        <p className="text-sm text-gray-600">Share a quick thought or update</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <MentionInput
            value={content}
            onChange={setContent}
            onMentionSelect={handleMentionSelect}
            placeholder="What's on your mind? (One line works great!)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={500}
            mentionContext="quick-post"
          />
          <div className="text-xs text-gray-500 mt-1">
            {content.length}/500 characters
          </div>
        </div>
        
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            content.trim() && !isSubmitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Posting...' : 'Quick Post'}
        </button>
      </form>
    </div>
  );
};

// Simple Avi DM Placeholder
const AviDMSection: React.FC = () => {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'avi'; content: string }>>([
    { role: 'avi', content: 'Hi! I\'m Avi, your development assistant. How can I help you today?' }
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Add user message
    const newConversation = [
      ...conversation,
      { role: 'user' as const, content: message },
      { role: 'avi' as const, content: `I received your message: "${message}". Avi DM integration with Claude Code will be available soon! For now, you can use the regular Post or Quick Post features.` }
    ];
    
    setConversation(newConversation);
    setMessage('');
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chat with Avi</h3>
        <p className="text-sm text-gray-600">Direct message with your AI assistant</p>
      </div>
      
      <div className="h-64 border border-gray-200 rounded-lg p-4 overflow-y-auto bg-gray-50">
        {conversation.map((msg, index) => (
          <div key={index} className={cn(
            'mb-3 p-2 rounded-lg max-w-xs',
            msg.role === 'user' 
              ? 'bg-blue-500 text-white ml-auto' 
              : 'bg-white border border-gray-200'
          )}>
            <div className="text-sm">{msg.content}</div>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSendMessage} className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message Avi..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            message.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          )}
        >
          Send
        </button>
      </form>
      
      <div className="text-xs text-gray-500 text-center p-2 bg-yellow-50 rounded">
        💡 Note: This will integrate with Claude Code in production (/prod directory)
      </div>
    </div>
  );
};

export default EnhancedPostingInterface;