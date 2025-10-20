/**
 * SessionManager - Manages conversation sessions
 */

import { ConversationSession, ConversationMessage } from '../types/claude-integration';

export class SessionManager {
  private sessions: Map<string, ConversationSession> = new Map();
  private messages: Map<string, ConversationMessage[]> = new Map();

  async createSession(sessionId: string, session: ConversationSession): Promise<void> {
    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, []);
  }

  async endSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.messages.delete(sessionId);
  }

  async saveSession(sessionId: string): Promise<void> {
    // Stub implementation
  }

  async addMessage(sessionId: string, message: ConversationMessage): Promise<void> {
    const sessionMessages = this.messages.get(sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(sessionId, sessionMessages);
  }

  async getMessages(sessionId: string, limit?: number): Promise<ConversationMessage[]> {
    const messages = this.messages.get(sessionId) || [];
    return limit ? messages.slice(-limit) : messages;
  }

  dispose(): void {
    this.sessions.clear();
    this.messages.clear();
  }
}
