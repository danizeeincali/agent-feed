/**
 * TDD Test Suite for OAuthConsent OAuth Detection Fix
 *
 * Testing Requirements:
 * 1. API key detected - Should pre-populate key field
 * 2. OAuth detected (no API key) - Should show green banner with helpful message
 * 3. Nothing detected - Should show yellow warning banner
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import OAuthConsent from '../../../frontend/src/pages/OAuthConsent';

// Mock fetch globally
global.fetch = jest.fn();

describe('OAuthConsent OAuth Detection Fix', () => {
  const defaultOAuthParams = '?client_id=test-client&redirect_uri=http://localhost:5173/settings&scope=inference&state=test-state';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Scenario 1: API Key Detected (encryptedKey present)', () => {
    it('should pre-populate API key field when encrypted key is detected', async () => {
      // Mock API response with encrypted key
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          method: 'api-key',
          email: 'test@example.com',
          encryptedKey: 'sk-ant-api03-encrypted-test-key-12345'
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      // Wait for detection to complete
      await waitFor(() => {
        expect(screen.queryByText('Detecting CLI...')).not.toBeInTheDocument();
      });

      // Verify API key was pre-populated
      const apiKeyInput = screen.getByPlaceholderText('sk-ant-api03-...') as HTMLInputElement;
      expect(apiKeyInput.value).toBe('sk-ant-api03-encrypted-test-key-12345');
    });

    it('should show green banner with "detected your API key" message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          method: 'api-key',
          email: 'test@example.com',
          encryptedKey: 'sk-ant-api03-encrypted-test-key'
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Detecting CLI...')).not.toBeInTheDocument();
      });

      // Should show green banner with API key detected message
      expect(screen.getByText(/We detected your Claude CLI login/)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/Click Authorize to continue, or edit the key below/)).toBeInTheDocument();

      // Should NOT show yellow warning banner
      expect(screen.queryByText(/Anthropic doesn't currently offer public OAuth/)).not.toBeInTheDocument();
    });

    it('should set cliDetected state to true', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          method: 'api-key',
          email: 'max@example.com',
          encryptedKey: 'sk-ant-api03-test'
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Green banner should be visible (cliDetected = true)
        expect(screen.getByText(/We detected your Claude CLI login/)).toBeInTheDocument();
      });
    });
  });

  describe('Scenario 2: OAuth Detected (NO encryptedKey)', () => {
    it('should NOT pre-populate API key field when only OAuth is detected', async () => {
      // Mock API response - OAuth detected but NO encryptedKey
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          method: 'oauth',
          email: 'max',
          message: 'Claude CLI OAuth login detected'
          // NO encryptedKey field
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Detecting CLI...')).not.toBeInTheDocument();
      });

      // API key field should be EMPTY
      const apiKeyInput = screen.getByPlaceholderText('sk-ant-api03-...') as HTMLInputElement;
      expect(apiKeyInput.value).toBe('');
    });

    it('should show green banner with "logged in via Claude CLI" message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          method: 'oauth',
          email: 'max',
          message: 'Claude CLI OAuth login detected'
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Detecting CLI...')).not.toBeInTheDocument();
      });

      // Should show green banner with OAuth-specific message
      expect(screen.getByText(/You're logged in to Claude CLI via max subscription/)).toBeInTheDocument();
      expect(screen.getByText(/Please enter your API key from/)).toBeInTheDocument();

      // Should have link to console.anthropic.com
      const consoleLink = screen.getByText('console.anthropic.com');
      expect(consoleLink).toHaveAttribute('href', 'https://console.anthropic.com/settings/keys');
      expect(consoleLink).toHaveAttribute('target', '_blank');

      // Should NOT show yellow warning banner
      expect(screen.queryByText(/Anthropic doesn't currently offer public OAuth/)).not.toBeInTheDocument();
    });

    it('should set cliDetected state to true even without encryptedKey', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          method: 'oauth',
          email: 'oauth-user'
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Green banner should be visible (cliDetected = true)
        expect(screen.getByText(/You're logged in to Claude CLI/)).toBeInTheDocument();
      });
    });

    it('should display correct email in OAuth-only detection', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          method: 'oauth',
          email: 'john.doe@example.com'
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/john.doe@example.com/)).toBeInTheDocument();
      });
    });
  });

  describe('Scenario 3: No Detection', () => {
    it('should show yellow warning banner when nothing is detected', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: false,
          message: 'No Claude CLI login detected'
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Detecting CLI...')).not.toBeInTheDocument();
      });

      // Should show yellow warning banner
      expect(screen.getByText(/Anthropic doesn't currently offer public OAuth/)).toBeInTheDocument();
      expect(screen.getByText(/Please enter your API key directly/)).toBeInTheDocument();

      // Should NOT show green banner
      expect(screen.queryByText(/We detected your Claude CLI login/)).not.toBeInTheDocument();
      expect(screen.queryByText(/You're logged in to Claude CLI/)).not.toBeInTheDocument();
    });

    it('should have empty API key field when nothing detected', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: false
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Detecting CLI...')).not.toBeInTheDocument();
      });

      const apiKeyInput = screen.getByPlaceholderText('sk-ant-api03-...') as HTMLInputElement;
      expect(apiKeyInput.value).toBe('');
    });
  });

  describe('Detection Endpoint Error Handling', () => {
    it('should show yellow banner when detection endpoint fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Detecting CLI...')).not.toBeInTheDocument();
      });

      // Should fall back to yellow warning banner
      expect(screen.getByText(/Anthropic doesn't currently offer public OAuth/)).toBeInTheDocument();
    });

    it('should allow manual API key entry when detection fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API error'));

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Detecting CLI...')).not.toBeInTheDocument();
      });

      const apiKeyInput = screen.getByPlaceholderText('sk-ant-api03-...') as HTMLInputElement;
      expect(apiKeyInput).toBeEnabled();
      expect(apiKeyInput.value).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle detection response with no email field', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          method: 'oauth'
          // No email field
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Detecting CLI...')).not.toBeInTheDocument();
      });

      // Should still show green banner with 'Unknown' email
      expect(screen.getByText(/Unknown/)).toBeInTheDocument();
    });

    it('should handle detection response with empty encryptedKey', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          method: 'api-key',
          email: 'test@example.com',
          encryptedKey: '' // Empty string
        })
      });

      render(
        <MemoryRouter initialEntries={[`/oauth/consent${defaultOAuthParams}`]}>
          <OAuthConsent />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByText('Detecting CLI...')).not.toBeInTheDocument();
      });

      // Should NOT pre-populate if encryptedKey is empty
      const apiKeyInput = screen.getByPlaceholderText('sk-ant-api03-...') as HTMLInputElement;
      expect(apiKeyInput.value).toBe('');

      // But should still show OAuth message
      expect(screen.getByText(/You're logged in to Claude CLI/)).toBeInTheDocument();
    });
  });
});
