import { ReactNode } from 'react';

export interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export type ErrorFallbackComponent = React.ComponentType<FallbackProps>;

export const createErrorFallback = (component: React.ComponentType<FallbackProps>): React.ComponentType<FallbackProps> => {
  return component;
};