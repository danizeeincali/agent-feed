import React from 'react';
import { Clock, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    label: 'Waiting for'
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    label: 'analyzing...',
    animate: true
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50 border-green-200',
    label: 'Analyzed by'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600 bg-red-50 border-red-200',
    label: 'Analysis failed'
  }
};

/**
 * TicketStatusBadge Component
 *
 * Displays ticket status with visual indicators for posts.
 *
 * @param {Object} props
 * @param {string} props.status - Status type: 'pending' | 'processing' | 'completed' | 'failed'
 * @param {string[]} props.agents - Array of agent IDs associated with the ticket
 * @param {number} props.count - Total number of tickets
 * @param {string} [props.className] - Additional CSS classes
 *
 * @example
 * <TicketStatusBadge
 *   status="processing"
 *   agents={["link-logger-agent"]}
 *   count={1}
 * />
 */
export const TicketStatusBadge = ({
  status,
  agents = [],
  count = 1,
  className
}) => {
  const config = STATUS_CONFIG[status];

  if (!config) {
    console.warn(`Invalid ticket status: ${status}`);
    return null;
  }

  const Icon = config.icon;
  const displayAgent = agents.length > 0 ? agents[0] : 'agent';
  const additionalAgents = agents.length > 1 ? agents.length - 1 : 0;

  // Format agent name for display (remove -agent suffix if present)
  const formatAgentName = (agentId) => {
    return agentId.replace(/-agent$/, '').replace(/-/g, ' ');
  };

  // Build the display text based on status
  const getDisplayText = () => {
    switch (status) {
      case 'pending':
        return (
          <>
            {config.label}{' '}
            <span className="font-semibold">{formatAgentName(displayAgent)}</span>
            {additionalAgents > 0 && (
              <span className="text-xs ml-1">+{additionalAgents} more</span>
            )}
          </>
        );

      case 'processing':
        return (
          <>
            <span className="font-semibold">{formatAgentName(displayAgent)}</span>
            {additionalAgents > 0 && (
              <span className="text-xs ml-1">+{additionalAgents} more</span>
            )}{' '}
            {config.label}
          </>
        );

      case 'completed':
        return (
          <>
            {config.label}{' '}
            <span className="font-semibold">{formatAgentName(displayAgent)}</span>
            {additionalAgents > 0 && (
              <span className="text-xs ml-1">+{additionalAgents} more</span>
            )}
          </>
        );

      case 'failed':
        return (
          <>
            {config.label}
            {agents.length > 0 && (
              <>
                {' - '}
                <span className="font-semibold">{formatAgentName(displayAgent)}</span>
                {additionalAgents > 0 && (
                  <span className="text-xs ml-1">+{additionalAgents} more</span>
                )}
              </>
            )}
          </>
        );

      default:
        return config.label;
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all duration-200',
        config.color,
        className
      )}
      role="status"
      aria-label={`Ticket ${status}: ${agents.join(', ')}`}
      aria-live="polite"
    >
      <Icon
        className={cn(
          'w-3.5 h-3.5 flex-shrink-0',
          config.animate && 'animate-spin'
        )}
        aria-hidden="true"
      />
      <span className="leading-none">
        {getDisplayText()}
      </span>
      {count > 1 && (
        <span
          className="ml-1 px-1.5 py-0.5 bg-white bg-opacity-50 rounded-full font-medium"
          aria-label={`${count} total tickets`}
        >
          {count}
        </span>
      )}
    </div>
  );
};

/**
 * TicketStatusList Component
 *
 * Displays multiple ticket status badges for a post with multiple tickets.
 * Groups tickets by status and shows a summary.
 *
 * @param {Object} props
 * @param {Array} props.tickets - Array of ticket objects with status and agent properties
 * @param {string} [props.className] - Additional CSS classes
 *
 * @example
 * <TicketStatusList
 *   tickets={[
 *     { status: 'processing', agent: 'link-logger-agent' },
 *     { status: 'completed', agent: 'analyzer-agent' }
 *   ]}
 * />
 */
export const TicketStatusList = ({ tickets = [], className }) => {
  if (!tickets || tickets.length === 0) return null;

  // Group tickets by status
  const groupedTickets = tickets.reduce((acc, ticket) => {
    if (!acc[ticket.status]) {
      acc[ticket.status] = [];
    }
    acc[ticket.status].push(ticket.agent);
    return acc;
  }, {});

  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      role="region"
      aria-label="Ticket statuses"
    >
      {Object.entries(groupedTickets).map(([status, agents]) => (
        <TicketStatusBadge
          key={status}
          status={status}
          agents={agents}
          count={agents.length}
        />
      ))}
    </div>
  );
};

export default TicketStatusBadge;
