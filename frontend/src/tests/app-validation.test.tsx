/**
 * SPARC Completion Test - App.tsx Integration Validation
 * Tests that the main App component loads without import errors
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock WebSocket and SSE connections to prevent network calls during testing
vi.mock('../context/WebSocketSingletonContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../contexts/VideoPlaybackContext', () => ({
  VideoPlaybackProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock components that might cause network requests
vi.mock('../components/RealTimeNotifications', () => ({
  RealTimeNotifications: () => <div data-testid="notifications">Notifications</div>,
}));

vi.mock('../components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connected</div>,
}));

// Mock react-router-dom to avoid Router conflicts
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useLocation: () => ({ pathname: '/' }),
    Routes: ({ children }: { children: React.ReactNode }) => <div data-testid="routes">{children}</div>,
    Route: ({ element }: { element: React.ReactNode }) => <div data-testid="route">{element}</div>,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  };
});

describe('SPARC App Integration', () => {
  it('should load App component without import errors', async () => {
    const { default: App } = await import('../App');

    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
  });

  it('should render App component with sidebar navigation', async () => {
    const { default: App } = await import('../App');

    render(<App />);

    // Check that main structural elements are present
    expect(screen.getByTestId('app-root')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();

    // Check that the AgentLink branding is present
    expect(screen.getByText('AgentLink')).toBeInTheDocument();
    expect(screen.getByText('AgentLink - Claude Instance Manager')).toBeInTheDocument();
  });

  it('should have all required navigation links', async () => {
    const { default: App } = await import('../App');

    render(<App />);

    // Check for key navigation items
    expect(screen.getByText('Interactive Control')).toBeInTheDocument();
    expect(screen.getByText('Claude Manager')).toBeInTheDocument();
    expect(screen.getByText('Feed')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should include error boundaries for robustness', async () => {
    const { default: App } = await import('../App');

    // This test ensures the component can be instantiated without throwing
    expect(() => {
      render(<App />);
    }).not.toThrow();
  });
});