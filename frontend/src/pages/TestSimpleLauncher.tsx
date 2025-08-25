import React from 'react';
import { SimpleLauncher } from '../components/SimpleLauncher';

export const TestSimpleLauncher: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple Launcher Test Page</h1>
      <p>Testing the new 4-button terminal auto-command feature</p>
      <SimpleLauncher />
    </div>
  );
};

export default TestSimpleLauncher;