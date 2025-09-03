/**
 * TDD London School: Terminal Command History Hook
 * 
 * Following behavioral contracts from tests
 */

import { useState, useCallback, useEffect } from 'react';

export interface TerminalCommandHistory {
  commands: string[];
  currentIndex: number;
  maxHistory: number;
  
  // Behavioral contracts
  addCommand(command: string): void;
  getNextCommand(): string | null;
  getPreviousCommand(): string | null;
  clearHistory(): void;
  
  // Persistence contracts
  saveToStorage(): void;
  loadFromStorage(): void;
}

export class TerminalCommandHistoryImpl implements TerminalCommandHistory {
  commands: string[] = [];
  currentIndex: number = -1;
  maxHistory: number = 100;

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory;
    this.loadFromStorage();
  }

  addCommand(command: string): void {
    if (!command.trim()) return;
    
    // Remove duplicate consecutive commands
    if (this.commands[this.commands.length - 1] === command) return;
    
    this.commands.push(command);
    
    // Maintain max history limit
    if (this.commands.length > this.maxHistory) {
      this.commands.shift();
    }
    
    // Reset index to end
    this.currentIndex = this.commands.length;
    this.saveToStorage();
  }

  getPreviousCommand(): string | null {
    if (this.commands.length === 0) return null;
    
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
    
    return this.commands[this.currentIndex] || null;
  }

  getNextCommand(): string | null {
    if (this.commands.length === 0) return null;
    
    if (this.currentIndex < this.commands.length - 1) {
      this.currentIndex++;
      return this.commands[this.currentIndex];
    } else {
      // Move past end to allow new input
      this.currentIndex = this.commands.length;
      return '';
    }
  }

  clearHistory(): void {
    this.commands = [];
    this.currentIndex = -1;
    this.saveToStorage();
  }

  saveToStorage(): void {
    try {
      localStorage.setItem('claude_terminal_history', JSON.stringify({
        commands: this.commands,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save command history to localStorage:', error);
    }
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('claude_terminal_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.commands = parsed.commands || [];
        this.currentIndex = this.commands.length;
      }
    } catch (error) {
      console.warn('Failed to load command history from localStorage:', error);
    }
  }
}

export const useTerminalCommandHistory = (maxHistory = 100) => {
  const [history] = useState(() => new TerminalCommandHistoryImpl(maxHistory));
  const [currentCommand, setCurrentCommand] = useState('');

  // Arrow key navigation
  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    let command: string | null;
    
    if (direction === 'up') {
      command = history.getPreviousCommand();
    } else {
      command = history.getNextCommand();
    }
    
    if (command !== null) {
      setCurrentCommand(command);
      return command;
    }
    
    return currentCommand;
  }, [history, currentCommand]);

  // Add command to history
  const addCommand = useCallback((command: string) => {
    history.addCommand(command);
    setCurrentCommand('');
  }, [history]);

  // Clear all history
  const clearHistory = useCallback(() => {
    history.clearHistory();
    setCurrentCommand('');
  }, [history]);

  // Handle arrow key events
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const command = navigateHistory('up');
      if (event.currentTarget) {
        event.currentTarget.value = command;
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const command = navigateHistory('down');
      if (event.currentTarget) {
        event.currentTarget.value = command;
      }
    }
  }, [navigateHistory]);

  return {
    history,
    currentCommand,
    navigateHistory,
    addCommand,
    clearHistory,
    handleKeyDown,
    commands: history.commands,
    hasHistory: history.commands.length > 0
  };
};