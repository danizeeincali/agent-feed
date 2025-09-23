import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  'cmd+enter': () => void;
  'cmd+s': () => void;
  'cmd+b': () => void;
  'cmd+i': () => void;
  'cmd+k': () => void;
  'cmd+shift+p': () => void;
  'escape': () => void;
  'cmd+/': () => void;
  [key: string]: () => void;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: Partial<KeyboardShortcuts>;
  enabled?: boolean;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
  preventDefault = true
}: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, metaKey, ctrlKey, shiftKey, altKey } = event;
    
    // Normalize for cross-platform (Cmd on Mac, Ctrl on Windows/Linux)
    const cmdKey = metaKey || ctrlKey;
    
    // Build shortcut string
    let shortcut = '';
    if (cmdKey) shortcut += 'cmd+';
    if (shiftKey) shortcut += 'shift+';
    if (altKey) shortcut += 'alt+';
    shortcut += key.toLowerCase();

    // Also check without modifiers for simple keys
    const simpleKey = key.toLowerCase();

    // Execute shortcut if it exists
    const handler = shortcuts[shortcut] || shortcuts[simpleKey];
    if (handler) {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      handler();
    }
  }, [shortcuts, enabled, preventDefault]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  // Return a list of available shortcuts for UI display
  const availableShortcuts = Object.keys(shortcuts).map(shortcut => ({
    key: shortcut,
    description: getShortcutDescription(shortcut)
  }));

  return { availableShortcuts };
};

const getShortcutDescription = (shortcut: string): string => {
  const descriptions: Record<string, string> = {
    'cmd+enter': 'Publish post',
    'cmd+s': 'Save draft',
    'cmd+b': 'Bold text',
    'cmd+i': 'Italic text',
    'cmd+k': 'Insert link',
    'cmd+shift+p': 'Toggle preview',
    'escape': 'Close modal/picker',
    'cmd+/': 'Show shortcuts'
  };
  
  return descriptions[shortcut] || shortcut;
};

// Hook for displaying keyboard shortcuts help
export const useShortcutsHelp = () => {
  const shortcuts = [
    { key: '⌘ + Enter', description: 'Publish post' },
    { key: '⌘ + S', description: 'Save draft' },
    { key: '⌘ + B', description: 'Bold text' },
    { key: '⌘ + I', description: 'Italic text' },
    { key: '⌘ + K', description: 'Insert link' },
    { key: '⌘ + Shift + P', description: 'Toggle preview' },
    { key: 'Escape', description: 'Close modal/picker' },
    { key: '⌘ + /', description: 'Show this help' }
  ];

  return shortcuts;
};