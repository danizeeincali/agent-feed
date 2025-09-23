import React, { useState, useRef } from 'react';
import { MentionInput, MentionInputRef, MentionSuggestion } from './MentionInput';
import { Send, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * Demo component for testing MentionInput functionality
 * This component demonstrates all the features of MentionInput including:
 * - @ symbol detection
 * - Agent autocomplete with filtering
 * - Keyboard navigation
 * - Click to select
 * - Submit functionality
 */
export const MentionInputDemo: React.FC = () => {
  const [message, setMessage] = useState('');
  const [submittedMessages, setSubmittedMessages] = useState<string[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<MentionSuggestion[]>([]);
  const mentionInputRef = useRef<MentionInputRef>(null);

  const handleSubmit = (value: string) => {
    if (value.trim()) {
      setSubmittedMessages(prev => [value, ...prev]);
      setMessage('');
      setSelectedMentions([]);
    }
  };

  const handleMentionSelect = (mention: MentionSuggestion) => {
    setSelectedMentions(prev => {
      // Avoid duplicates
      if (!prev.find(m => m.id === mention.id)) {
        return [...prev, mention];
      }
      return prev;
    });
  };

  const handleReset = () => {
    setMessage('');
    setSelectedMentions([]);
    setSubmittedMessages([]);
    mentionInputRef.current?.focus();
  };

  const handleFocusInput = () => {
    mentionInputRef.current?.focus();
  };

  // Mock API function for testing async suggestions
  const fetchMockSuggestions = async (query: string): Promise<MentionSuggestion[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Mock filtered results
    const mockResults: MentionSuggestion[] = [
      {
        id: 'search-agent',
        name: 'search-specialist',
        displayName: 'Search Specialist',
        description: `Expert in finding information related to: ${query}`,
        type: 'specialist'
      },
      {
        id: 'data-analyst',
        name: 'data-analyst-pro',
        displayName: 'Data Analyst Pro',
        description: `Analyzing data patterns for: ${query}`,
        type: 'analyst'
      }
    ];

    return query.length > 2 ? mockResults : [];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          MentionInput Demo
        </h1>
        <p className="text-gray-600">
          Type @ to mention agents. Use arrow keys to navigate, Enter to select.
        </p>
      </div>

      {/* Demo Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Compose Message
          </h2>
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        {/* MentionInput Component */}
        <div className="space-y-4">
          <MentionInput
            ref={mentionInputRef}
            value={message}
            onChange={setMessage}
            onSubmit={handleSubmit}
            onMentionSelect={handleMentionSelect}
            placeholder="Type your message here... Use @ to mention agents"
            maxLength={500}
            rows={6}
            autoFocus
            className="border-2 border-blue-200 focus:border-blue-500"
            aria-label="Demo message input with agent mentions"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleFocusInput}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Focus Input
              </button>
              {message.includes('@') && (
                <span className="text-sm text-green-600 font-medium">
                  @ detected - try typing agent names!
                </span>
              )}
            </div>
            
            <button
              onClick={() => handleSubmit(message)}
              disabled={!message.trim()}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors",
                message.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Mentions */}
      {selectedMentions.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Selected Mentions ({selectedMentions.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedMentions.map((mention) => (
              <div
                key={mention.id}
                className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full border border-blue-300"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {mention.displayName.charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-medium text-blue-900">
                  {mention.displayName}
                </span>
                <span className="text-xs text-blue-600">
                  @{mention.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message History */}
      {submittedMessages.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Message History ({submittedMessages.length})
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {submittedMessages.map((msg, index) => (
              <div
                key={index}
                className="bg-white p-3 rounded-lg border border-gray-200"
              >
                <div className="text-xs text-gray-500 mb-1">
                  Message #{submittedMessages.length - index}
                </div>
                <div className="text-gray-900 whitespace-pre-wrap">
                  {msg.split(/(@[\w-]+)/g).map((part, partIndex) => (
                    <span
                      key={partIndex}
                      className={part.startsWith('@') ? 'font-semibold text-blue-600 bg-blue-50 px-1 rounded' : ''}
                    >
                      {part}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
        <h3 className="text-sm font-semibold text-yellow-900 mb-2">
          Usage Instructions
        </h3>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>Type @ followed by agent name to trigger mention autocomplete</li>
          <li>Use ↑/↓ arrow keys to navigate suggestions</li>
          <li>Press Enter or Tab to select highlighted suggestion</li>
          <li>Press Escape to close the dropdown</li>
          <li>Click on suggestions to select them</li>
          <li>Press Enter (without Shift) to submit message</li>
          <li>Shift+Enter adds a new line</li>
        </ul>
      </div>
    </div>
  );
};

export default MentionInputDemo;