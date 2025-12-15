/**
 * Type definitions for TicketStatusBadge component
 */

import { FC } from 'react';

export type TicketStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TicketStatusBadgeProps {
  /**
   * Status type of the ticket
   */
  status: TicketStatus;

  /**
   * Array of agent IDs associated with the ticket
   * @default []
   */
  agents?: string[];

  /**
   * Total number of tickets
   * @default 1
   */
  count?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export interface Ticket {
  /**
   * Status of the ticket
   */
  status: TicketStatus;

  /**
   * Agent ID handling the ticket
   */
  agent: string;
}

export interface TicketStatusListProps {
  /**
   * Array of ticket objects to display
   */
  tickets: Ticket[];

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * TicketStatusBadge Component
 *
 * Displays ticket status with visual indicators for posts.
 *
 * @example
 * ```tsx
 * <TicketStatusBadge
 *   status="processing"
 *   agents={["link-logger-agent"]}
 *   count={1}
 * />
 * ```
 */
export const TicketStatusBadge: FC<TicketStatusBadgeProps>;

/**
 * TicketStatusList Component
 *
 * Displays multiple ticket status badges grouped by status.
 *
 * @example
 * ```tsx
 * <TicketStatusList
 *   tickets={[
 *     { status: 'processing', agent: 'link-logger-agent' },
 *     { status: 'completed', agent: 'analyzer-agent' }
 *   ]}
 * />
 * ```
 */
export const TicketStatusList: FC<TicketStatusListProps>;

export default TicketStatusBadge;
