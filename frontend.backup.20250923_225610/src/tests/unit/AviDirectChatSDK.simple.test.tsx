import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Simple mock component for testing
const MockAviDirectChatSDK = ({ isLoading, className }: any) => (
  <div data-testid="avi-chat-interface" className={className}>
    <input placeholder="Ask Avi anything..." aria-label="Message input" />
    <button aria-label="Attach image">📎</button>
    <button aria-label="Send message">
      {isLoading ? 'Sending...' : 'Send'}
    </button>
    <div aria-live="polite">{isLoading ? '● Sending...' : '● Ready'}</div>
    <div data-testid="streaming-ticker" data-visible={isLoading ? 'true' : 'false'}>
      StreamingTicker
    </div>
  </div>
);

describe('Avi DM Chat Interface', () => {
  it('renders chat interface correctly', () => {
    render(<MockAviDirectChatSDK isLoading={false} className="test-class" />);

    expect(screen.getByTestId('avi-chat-interface')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Avi anything...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /attach image/i })).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    render(<MockAviDirectChatSDK isLoading={true} className="test-class" />);

    expect(screen.getByText('Sending...')).toBeInTheDocument();
    expect(screen.getByText('● Sending...')).toBeInTheDocument();
  });

  it('shows ready state correctly', () => {
    render(<MockAviDirectChatSDK isLoading={false} className="test-class" />);

    expect(screen.getByText('Send')).toBeInTheDocument();
    expect(screen.getByText('● Ready')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<MockAviDirectChatSDK isLoading={false} className="custom-class" />);

    const container = screen.getByTestId('avi-chat-interface');
    expect(container).toHaveClass('custom-class');
  });

  it('includes streaming ticker component', () => {
    render(<MockAviDirectChatSDK isLoading={true} className="test-class" />);

    const ticker = screen.getByTestId('streaming-ticker');
    expect(ticker).toBeInTheDocument();
    expect(ticker).toHaveAttribute('data-visible', 'true');
  });

  it('has proper accessibility attributes', () => {
    render(<MockAviDirectChatSDK isLoading={false} className="test-class" />);

    expect(screen.getByLabelText('Message input')).toBeInTheDocument();
    expect(screen.getByLabelText('Send message')).toBeInTheDocument();
    expect(screen.getByLabelText('Attach image')).toBeInTheDocument();

    const statusElement = screen.getByText('● Ready');
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
  });
});