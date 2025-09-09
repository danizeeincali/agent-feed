import React, { useState } from 'react';
import { MentionInput, MentionSuggestion } from './MentionInput';

/**
 * Debug test component for @ mention functionality
 * This helps isolate and test the mention system independently
 */
export const MentionDebugTest: React.FC = () => {
  const [content, setContent] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleMentionSelect = (mention: MentionSuggestion) => {
    addLog(`✅ Mention selected: ${mention.displayName} (@${mention.name})`);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    addLog(`📝 Content changed: "${newContent}" (cursor at ${newContent.length})`);
  };

  const clearLogs = () => {
    setLogs([]);
    console.clear();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6 bg-white rounded-lg shadow-sm border">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🐛 Mention System Debug Test</h2>
        <p className="text-gray-600">Type @ to test mention dropdown functionality</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Input (try typing @)
          </label>
          <MentionInput
            value={content}
            onChange={handleContentChange}
            onMentionSelect={handleMentionSelect}
            placeholder="Type @ to test mention dropdown..."
            className="w-full p-3 border border-gray-300 rounded-lg"
            rows={3}
            mentionContext="comment"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div><strong>Content:</strong> "{content}"</div>
            <div><strong>Length:</strong> {content.length}</div>
            <div><strong>Contains @:</strong> {content.includes('@') ? '✅' : '❌'}</div>
            <div><strong>Last Char:</strong> {content.slice(-1) || 'none'}</div>
          </div>
          <div className="space-y-1">
            <div><strong>Test Status:</strong></div>
            <div>• Type @ to trigger dropdown</div>
            <div>• Type @c to search for "Chief"</div>
            <div>• Use arrow keys to navigate</div>
            <div>• Press Enter or click to select</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Debug Logs</h3>
            <button
              onClick={clearLogs}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              Clear Logs
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto font-mono text-xs">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <div key={index} className="text-gray-700">{log}</div>
              ))
            ) : (
              <div className="text-gray-500 italic">No logs yet. Try typing @ in the input above.</div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-1">Expected Behavior:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. Type @ - dropdown should appear immediately</li>
            <li>2. Type letters after @ - should filter suggestions</li>
            <li>3. Arrow keys should navigate suggestions</li>
            <li>4. Enter/click should insert mention and close dropdown</li>
          </ul>
        </div>
      </div>
    </div>
  );
};