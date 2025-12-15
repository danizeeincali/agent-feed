import React from 'react';
import { TicketStatusBadge, TicketStatusList } from '../TicketStatusBadge';

/**
 * Visual Examples for TicketStatusBadge Component
 *
 * This file demonstrates all possible states and configurations
 * of the TicketStatusBadge component for documentation and testing.
 */

export const TicketStatusBadgeExamples = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TicketStatusBadge Component Examples
          </h1>
          <p className="text-gray-600">
            Visual examples of all ticket status states and configurations
          </p>
        </div>

        {/* Single Agent Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Single Agent Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">Pending:</span>
              <TicketStatusBadge
                status="pending"
                agents={['link-logger-agent']}
                count={1}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">Processing:</span>
              <TicketStatusBadge
                status="processing"
                agents={['link-logger-agent']}
                count={1}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">Completed:</span>
              <TicketStatusBadge
                status="completed"
                agents={['link-logger-agent']}
                count={1}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">Failed:</span>
              <TicketStatusBadge
                status="failed"
                agents={['link-logger-agent']}
                count={1}
              />
            </div>
          </div>
        </section>

        {/* Multiple Agents Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Multiple Agents
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">2 Agents:</span>
              <TicketStatusBadge
                status="processing"
                agents={['link-logger-agent', 'analyzer-agent']}
                count={1}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">3+ Agents:</span>
              <TicketStatusBadge
                status="pending"
                agents={['link-logger-agent', 'analyzer-agent', 'moderator-agent']}
                count={1}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">5 Agents:</span>
              <TicketStatusBadge
                status="completed"
                agents={[
                  'link-logger-agent',
                  'analyzer-agent',
                  'moderator-agent',
                  'sentiment-agent',
                  'content-agent'
                ]}
                count={1}
              />
            </div>
          </div>
        </section>

        {/* Ticket Count Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Multiple Tickets (Count Badge)
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">2 Tickets:</span>
              <TicketStatusBadge
                status="processing"
                agents={['link-logger-agent']}
                count={2}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">5 Tickets:</span>
              <TicketStatusBadge
                status="pending"
                agents={['analyzer-agent']}
                count={5}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">10+ Tickets:</span>
              <TicketStatusBadge
                status="completed"
                agents={['moderator-agent']}
                count={12}
              />
            </div>
          </div>
        </section>

        {/* Combined Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Multiple Agents + Multiple Tickets
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">Complex:</span>
              <TicketStatusBadge
                status="processing"
                agents={['link-logger-agent', 'analyzer-agent', 'moderator-agent']}
                count={3}
              />
            </div>

            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">Very Complex:</span>
              <TicketStatusBadge
                status="pending"
                agents={[
                  'link-logger-agent',
                  'analyzer-agent',
                  'moderator-agent',
                  'sentiment-agent',
                  'content-agent'
                ]}
                count={8}
              />
            </div>
          </div>
        </section>

        {/* Agent Name Formatting */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Agent Name Formatting
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">With -agent:</span>
              <TicketStatusBadge
                status="processing"
                agents={['link-logger-agent']}
                count={1}
              />
              <span className="text-xs text-gray-500">(suffix removed)</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">With hyphens:</span>
              <TicketStatusBadge
                status="completed"
                agents={['my-custom-bot-agent']}
                count={1}
              />
              <span className="text-xs text-gray-500">(hyphens replaced with spaces)</span>
            </div>

            <div className="flex items-center gap-4">
              <span className="w-32 text-sm text-gray-600">Simple name:</span>
              <TicketStatusBadge
                status="pending"
                agents={['analyzer']}
                count={1}
              />
              <span className="text-xs text-gray-500">(displayed as-is)</span>
            </div>
          </div>
        </section>

        {/* TicketStatusList Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            TicketStatusList Component
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Shows multiple statuses grouped together
          </p>
          <div className="space-y-6">
            <div>
              <span className="text-sm text-gray-600 mb-2 block">
                Mixed Status Tickets:
              </span>
              <TicketStatusList
                tickets={[
                  { status: 'processing', agent: 'link-logger-agent' },
                  { status: 'completed', agent: 'analyzer-agent' },
                  { status: 'pending', agent: 'moderator-agent' }
                ]}
              />
            </div>

            <div>
              <span className="text-sm text-gray-600 mb-2 block">
                Multiple Same Status:
              </span>
              <TicketStatusList
                tickets={[
                  { status: 'processing', agent: 'link-logger-agent' },
                  { status: 'processing', agent: 'analyzer-agent' },
                  { status: 'processing', agent: 'moderator-agent' }
                ]}
              />
            </div>

            <div>
              <span className="text-sm text-gray-600 mb-2 block">
                Complex Mixed:
              </span>
              <TicketStatusList
                tickets={[
                  { status: 'completed', agent: 'link-logger-agent' },
                  { status: 'completed', agent: 'analyzer-agent' },
                  { status: 'processing', agent: 'moderator-agent' },
                  { status: 'pending', agent: 'sentiment-agent' },
                  { status: 'pending', agent: 'content-agent' },
                  { status: 'failed', agent: 'error-agent' }
                ]}
              />
            </div>
          </div>
        </section>

        {/* Usage in Post Context */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Usage in Post Card Context
          </h2>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">Sample Post Title</h3>
                <p className="text-sm text-gray-600">Posted 2h ago</p>
              </div>
            </div>
            <p className="text-gray-700 mb-3">
              This is a sample post with content that might have links for analysis...
            </p>
            <div className="pt-3 border-t border-gray-100">
              <TicketStatusBadge
                status="processing"
                agents={['link-logger-agent']}
                count={1}
              />
            </div>
          </div>
        </section>

        {/* Accessibility Features */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Accessibility Features
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>role="status"</strong> - Proper ARIA role for status indicators</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>aria-live="polite"</strong> - Screen reader announcements on status changes</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>aria-label</strong> - Descriptive labels including agent names</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>aria-hidden="true"</strong> on icons - Icons are decorative only</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>Color + Icon</strong> - Status conveyed through multiple channels</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span><strong>Semantic text</strong> - Clear, descriptive status messages</span>
            </li>
          </ul>
        </section>

        {/* Design Features */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Design Features
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Icons:</strong> Lucide React icons (NO emojis)</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Animation:</strong> Spinning loader for processing state</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Color Coding:</strong> Amber (pending), Blue (processing), Green (completed), Red (failed)</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Responsive:</strong> Flexible sizing with proper text wrapping</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Agent Formatting:</strong> Removes suffixes and replaces hyphens for readability</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Compact Display:</strong> Shows "+N more" for multiple agents</span>
            </li>
          </ul>
        </section>

        {/* Icon Reference */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Icon Reference
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border border-amber-200 rounded-lg bg-amber-50">
              <div className="flex justify-center mb-2">
                <div className="w-8 h-8 text-amber-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
              </div>
              <span className="text-xs font-medium text-amber-900">Clock</span>
              <div className="text-xs text-amber-700 mt-1">Pending</div>
            </div>

            <div className="text-center p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex justify-center mb-2">
                <div className="w-8 h-8 text-blue-600 animate-spin">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                  </svg>
                </div>
              </div>
              <span className="text-xs font-medium text-blue-900">Loader2</span>
              <div className="text-xs text-blue-700 mt-1">Processing</div>
            </div>

            <div className="text-center p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="flex justify-center mb-2">
                <div className="w-8 h-8 text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
              </div>
              <span className="text-xs font-medium text-green-900">CheckCircle</span>
              <div className="text-xs text-green-700 mt-1">Completed</div>
            </div>

            <div className="text-center p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex justify-center mb-2">
                <div className="w-8 h-8 text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
              </div>
              <span className="text-xs font-medium text-red-900">XCircle</span>
              <div className="text-xs text-red-700 mt-1">Failed</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TicketStatusBadgeExamples;
