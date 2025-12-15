import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LiveActivityFeed } from '../components/LiveActivityFeed';
import { useSSE } from '../hooks/useSSE';

// Mock the useSSE hook
vi.mock('../hooks/useSSE', () => ({
  useSSE: vi.fn(),
}));

describe('LiveActivityFeed Component', () => {
  const mockUseSSE = useSSE as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render without crashing', () => {
    mockUseSSE.mockReturnValue({
      connected: false,
      events: [],
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText('Live Activity')).toBeInTheDocument();
  });

  it('should show connected status when connected', () => {
    mockUseSSE.mockReturnValue({
      connected: true,
      events: [],
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should show disconnected status when not connected', () => {
    mockUseSSE.mockReturnValue({
      connected: false,
      events: [],
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should render filter buttons', () => {
    mockUseSSE.mockReturnValue({
      connected: true,
      events: [],
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Tool')).toBeInTheDocument();
  });

  it('should display "No activity yet" message when no events', () => {
    mockUseSSE.mockReturnValue({
      connected: true,
      events: [],
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText(/No activity yet/i)).toBeInTheDocument();
  });

  it('should display tool execution events', () => {
    const mockEvents = [
      {
        type: 'tool_execution',
        data: {
          tool: 'Bash',
          action: 'execute',
          status: 'success',
          duration: 150,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
    ];

    mockUseSSE.mockReturnValue({
      connected: true,
      events: mockEvents,
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText('Bash')).toBeInTheDocument();
    expect(screen.getByText('execute')).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument();
  });

  it('should display agent events', () => {
    const mockEvents = [
      {
        type: 'agent_spawn',
        data: {
          agent_type: 'coder',
          action: 'spawned',
          tokens_used: 1000,
          cost: 0.0025,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
    ];

    mockUseSSE.mockReturnValue({
      connected: true,
      events: mockEvents,
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText('coder')).toBeInTheDocument();
    expect(screen.getByText('spawned')).toBeInTheDocument();
    expect(screen.getByText('1000 tokens')).toBeInTheDocument();
    expect(screen.getByText('$0.0025')).toBeInTheDocument();
  });

  it('should display error message when error occurs', () => {
    const mockReconnect = vi.fn();
    mockUseSSE.mockReturnValue({
      connected: false,
      events: [],
      error: 'Connection failed',
      reconnect: mockReconnect,
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(screen.getByText('Reconnect')).toBeInTheDocument();
  });

  it('should display session metrics when available', () => {
    const mockEvents = [
      {
        type: 'session_metrics',
        data: {
          session_id: 'test-session-12345',
          request_count: 10,
          total_tokens: 5000,
          total_cost: 0.0125,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
    ];

    mockUseSSE.mockReturnValue({
      connected: true,
      events: mockEvents,
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    waitFor(() => {
      expect(screen.getByText('test-sess...')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('5,000')).toBeInTheDocument();
      expect(screen.getByText('$0.0125')).toBeInTheDocument();
    });
  });

  it('should display progress bars when progress data is available', () => {
    const mockEvents = [
      {
        type: 'tool_execution',
        data: {
          tool: 'Read',
          action: 'reading',
          progress: {
            current_step: 3,
            total_steps: 10,
            percentage: 30,
          },
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
    ];

    mockUseSSE.mockReturnValue({
      connected: true,
      events: mockEvents,
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText('3/10 (30%)')).toBeInTheDocument();
  });

  it('should display error details when event has error', () => {
    const mockEvents = [
      {
        type: 'tool_execution',
        data: {
          tool: 'Bash',
          action: 'execute',
          status: 'failed',
          error: 'Command not found',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
    ];

    mockUseSSE.mockReturnValue({
      connected: true,
      events: mockEvents,
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText(/Command not found/i)).toBeInTheDocument();
  });

  it('should display file path when available', () => {
    const mockEvents = [
      {
        type: 'tool_execution',
        data: {
          tool: 'Read',
          action: 'read',
          file_path: '/workspaces/agent-feed/src/index.ts',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
    ];

    mockUseSSE.mockReturnValue({
      connected: true,
      events: mockEvents,
      error: null,
      reconnect: vi.fn(),
      clearEvents: vi.fn(),
    });

    render(<LiveActivityFeed />);

    expect(screen.getByText('/workspaces/agent-feed/src/index.ts')).toBeInTheDocument();
  });
});
