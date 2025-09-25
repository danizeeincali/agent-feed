/**
 * Bulletproof wrapper components for all major route components
 * Each wrapper includes defensive coding, error boundaries, and fallbacks
 */

import React, { memo, Suspense } from 'react';
import { ComponentErrorBoundary } from './ErrorBoundary';
import { withSafetyWrapper, safeRender } from '@/utils/safetyUtils';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import FallbackComponents from './FallbackComponents';

// Import original components
import SocialMediaFeedOriginal from './SocialMediaFeed';
import DualInstanceDashboardOriginal from './DualInstanceDashboard';
import AgentManagerOriginal from './AgentManager';
import SystemAnalyticsOriginal from './SystemAnalytics';
// ClaudeCodePanel import removed - component cleaned up
import AgentDashboardOriginal from './AgentDashboard';
import WorkflowVisualizationFixedOriginal from './WorkflowVisualizationFixed';
import AgentProfileOriginal from './AgentProfile';
import ActivityPanelOriginal from './ActivityPanel';

// Higher-order component for bulletproofing route components
const withBulletproofWrapper = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  FallbackComponent: React.ComponentType<any>
) => {
  const BulletproofComponent = memo((props: P) => {
    const { errorState, handleError, resetError } = useErrorHandler({
      maxRetries: 3,
      enableLogging: true,
      onError: (error) => {
        console.error(`${componentName} error:`, error);
      }
    });

    // If component has persistent errors, show fallback
    if (errorState.hasError && errorState.retryCount >= 3) {
      return (
        <FallbackComponents.ComponentErrorFallback
          componentName={componentName}
          error={errorState.error ?? undefined}
          retry={resetError}
        />
      );
    }

    return (
      <ComponentErrorBoundary
        componentName={componentName}
        fallback={
          <FallbackComponent
            error={errorState.error ?? undefined}
            retry={resetError}
            componentName={componentName}
          />
        }
      >
        <Suspense fallback={<FallbackComponent />}>
          <WrappedComponent {...props} />
        </Suspense>
      </ComponentErrorBoundary>
    );
  });

  BulletproofComponent.displayName = `Bulletproof${componentName}`;
  return BulletproofComponent;
};

// Bulletproof SocialMediaFeed
export const BulletproofSocialMediaFeed = withBulletproofWrapper(
  withSafetyWrapper(SocialMediaFeedOriginal, 'SocialMediaFeed'),
  'SocialMediaFeed',
  FallbackComponents.FeedFallback
);

// Bulletproof DualInstanceDashboard
export const BulletproofDualInstanceDashboard = withBulletproofWrapper(
  withSafetyWrapper(DualInstanceDashboardOriginal, 'DualInstanceDashboard'),
  'DualInstanceDashboard',
  FallbackComponents.DashboardFallback
);

// Bulletproof AgentManager
export const BulletproofAgentManager = withBulletproofWrapper(
  withSafetyWrapper(AgentManagerOriginal, 'AgentManager'),
  'AgentManager',
  FallbackComponents.AgentManagerFallback
);

// Bulletproof SystemAnalytics
export const BulletproofSystemAnalytics = withBulletproofWrapper(
  withSafetyWrapper(SystemAnalyticsOriginal, 'SystemAnalytics'),
  'SystemAnalytics',
  FallbackComponents.AnalyticsFallback
);

// BulletproofClaudeCodePanel removed - component cleaned up

// Bulletproof AgentDashboard
export const BulletproofAgentDashboard = withBulletproofWrapper(
  withSafetyWrapper(AgentDashboardOriginal, 'AgentDashboard'),
  'AgentDashboard',
  FallbackComponents.DashboardFallback
);

// Bulletproof WorkflowVisualizationFixed
export const BulletproofWorkflowVisualization = withBulletproofWrapper(
  withSafetyWrapper(WorkflowVisualizationFixedOriginal, 'WorkflowVisualization'),
  'WorkflowVisualization',
  FallbackComponents.WorkflowFallback
);

// Bulletproof AgentProfile
export const BulletproofAgentProfile = withBulletproofWrapper(
  withSafetyWrapper(AgentProfileOriginal, 'AgentProfile'),
  'AgentProfile',
  (props: any) => (
    <FallbackComponents.LoadingFallback message="Loading agent profile..." />
  )
);

// Bulletproof ActivityPanel
export const BulletproofActivityPanel = withBulletproofWrapper(
  withSafetyWrapper(ActivityPanelOriginal, 'ActivityPanel'),
  'ActivityPanel',
  FallbackComponents.ActivityFallback
);

// Generic component wrapper for any component
export const BulletproofWrapper: React.FC<{
  children: React.ReactNode;
  componentName: string;
  fallback?: React.ComponentType<any>;
}> = ({ children, componentName, fallback: CustomFallback }) => {
  const { errorState, resetError } = useErrorHandler();

  const FallbackComponent = CustomFallback || (() => (
    <FallbackComponents.ComponentErrorFallback
      componentName={componentName}
      error={errorState.error ?? undefined}
      retry={resetError}
    />
  ));

  return (
    <ComponentErrorBoundary
      componentName={componentName}
      fallback={<FallbackComponent />}
    >
      <Suspense fallback={<FallbackComponents.LoadingFallback />}>
        {safeRender(children, <FallbackComponent />)}
      </Suspense>
    </ComponentErrorBoundary>
  );
};

// Safe component props validator
export const validateComponentProps = <T extends object>(
  props: T,
  requiredProps: (keyof T)[],
  componentName: string
): boolean => {
  if (!props || typeof props !== 'object') {
    console.error(`${componentName}: Invalid props object`);
    return false;
  }

  const missingProps = requiredProps.filter(prop => 
    props[prop] === undefined || props[prop] === null
  );

  if (missingProps.length > 0) {
    console.error(`${componentName}: Missing required props:`, missingProps);
    return false;
  }

  return true;
};

// Safe component state validator
export const validateComponentState = <T extends object>(
  state: T,
  requiredState: (keyof T)[],
  componentName: string
): boolean => {
  if (!state || typeof state !== 'object') {
    console.error(`${componentName}: Invalid state object`);
    return false;
  }

  const invalidState = requiredState.filter(key => 
    state[key] === undefined
  );

  if (invalidState.length > 0) {
    console.error(`${componentName}: Invalid state properties:`, invalidState);
    return false;
  }

  return true;
};

// Safe event handler wrapper
export const createSafeHandler = <T extends any[]>(
  handler: (...args: T) => void,
  componentName: string,
  fallback?: () => void
) => {
  return (...args: T) => {
    try {
      handler(...args);
    } catch (error) {
      console.error(`${componentName} event handler error:`, error);
      fallback?.();
    }
  };
};

// Safe async handler wrapper
export const createSafeAsyncHandler = <T extends any[]>(
  handler: (...args: T) => Promise<void>,
  componentName: string,
  fallback?: () => void
) => {
  return async (...args: T) => {
    try {
      await handler(...args);
    } catch (error) {
      console.error(`${componentName} async handler error:`, error);
      fallback?.();
    }
  };
};

export default {
  BulletproofSocialMediaFeed,
  BulletproofDualInstanceDashboard,
  BulletproofAgentManager,
  BulletproofSystemAnalytics,
  // BulletproofClaudeCodePanel removed - component cleaned up
  BulletproofAgentDashboard,
  BulletproofWorkflowVisualization,
  BulletproofAgentProfile,
  BulletproofActivityPanel,
  BulletproofWrapper,
  validateComponentProps,
  validateComponentState,
  createSafeHandler,
  createSafeAsyncHandler
};