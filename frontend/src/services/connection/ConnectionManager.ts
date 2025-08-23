/**
 * Terminal Connection Manager Implementation
 * 
 * Manages WebSocket connection lifecycle
 */

import { TerminalConnectionState, IConnectionManager } from '../../types/terminal';

export class TerminalConnectionManager implements IConnectionManager {
  private websocket: WebSocket | null = null;
  private connectionState: TerminalConnectionState = 'disconnected';
  private connectionPromise: Promise<WebSocket> | null = null;

  async connect(url: string): Promise<WebSocket> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionState = 'connecting';
    
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);
        
        const onOpen = () => {
          this.websocket = ws;
          this.connectionState = 'connected';
          cleanup();
          resolve(ws);
        };

        const onError = (error: Event) => {
          this.connectionState = 'error';
          cleanup();
          reject(new Error('WebSocket connection failed'));
        };

        const onClose = () => {
          this.connectionState = 'disconnected';
          cleanup();
          reject(new Error('WebSocket connection closed unexpectedly'));
        };

        const cleanup = () => {
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('error', onError);
          ws.removeEventListener('close', onClose);
          this.connectionPromise = null;
        };

        ws.addEventListener('open', onOpen);
        ws.addEventListener('error', onError);
        ws.addEventListener('close', onClose);
      } catch (error) {
        this.connectionState = 'error';
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  async disconnect(): Promise<void> {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.connectionState = 'disconnected';
    this.connectionPromise = null;
  }

  getConnectionState(): TerminalConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected' && 
           this.websocket?.readyState === WebSocket.OPEN;
  }
}