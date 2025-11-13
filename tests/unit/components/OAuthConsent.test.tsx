/**
 * OAuthConsent Component Tests
 *
 * Tests for CLI auto-detection and OAuth consent flow
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OAuthConsent from '../../../frontend/src/pages/OAuthConsent';

// Mock react-router-dom
const mockNavigate = jest.fn();
let mockSearchParams = new URLSearchParams('redirect_uri=http://localhost:3000/callback&state=test-state&client_id=test-client');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams]
}));

describe('OAuthConsent Component', () => {
  let originalLocation: Location;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    // Reset search params
    mockSearchParams = new URLSearchParams('redirect_uri=http://localhost:3000/callback&state=test-state&client_id=test-client');

    // Store original location
    originalLocation = window.location;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore original location if changed
    if (window.location !== originalLocation) {
      Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation
      });
    }
  });

  describe('CLI Auto-Detection', () => {
    test('should call detection endpoint on mount', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detected: false })
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/claude-code/oauth/detect-cli');
      });
    });

    test('should show success message when CLI detected', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          encryptedKey: 'encrypted-sk-ant-api03-test',
          email: 'test@example.com'
        })
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/We detected your Claude CLI login/i)).toBeInTheDocument();
        expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
      });
    });

    test('should pre-populate API key when CLI detected', async () => {
      const testKey = 'sk-ant-api03-encrypted-test-key';
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          encryptedKey: testKey,
          email: 'test@example.com'
        })
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/sk-ant-api03/i) as HTMLInputElement;
        expect(input.value).toBe(testKey);
      });
    });

    test('should show manual entry message when CLI not detected', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detected: false })
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Please enter your API key directly/i)).toBeInTheDocument();
      });
    });

    test('should handle detection endpoint failure gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      // Should still render the form
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/sk-ant-api03/i)).toBeInTheDocument();
      });

      // Should show manual entry message
      expect(screen.getByText(/Please enter your API key directly/i)).toBeInTheDocument();
    });

    test('should allow manual key entry even when CLI detected', async () => {
      const detectedKey = 'sk-ant-api03-detected-key';
      const manualKey = 'sk-ant-api03-manual-key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          detected: true,
          encryptedKey: detectedKey,
          email: 'test@example.com'
        })
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/sk-ant-api03/i) as HTMLInputElement;
        expect(input.value).toBe(detectedKey);
      });

      // User can still edit the key
      const input = screen.getByPlaceholderText(/sk-ant-api03/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: manualKey } });

      expect(input.value).toBe(manualKey);
    });
  });

  describe('OAuth Flow', () => {
    test('should validate API key format on submit', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detected: false })
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/sk-ant-api03/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/sk-ant-api03/i);
      const submitButton = screen.getByText('Authorize');

      // Invalid format
      fireEvent.change(input, { target: { value: 'invalid-key' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid API key format/i)).toBeInTheDocument();
      });
    });

    test('should redirect with API key on successful authorization', async () => {
      const testKey = 'sk-ant-api03-valid-test-key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detected: false })
      });

      // Mock window.location.href
      const mockLocationHref = jest.fn();
      Object.defineProperty(window, 'location', {
        writable: true,
        value: {
          href: '',
          toString: () => ''
        }
      });

      Object.defineProperty(window.location, 'href', {
        set: mockLocationHref,
        get: () => ''
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/sk-ant-api03/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/sk-ant-api03/i);
      const submitButton = screen.getByText('Authorize');

      fireEvent.change(input, { target: { value: testKey } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalled();
        const redirectUrl = mockLocationHref.mock.calls[0][0];
        expect(redirectUrl).toContain('api_key=');
        expect(redirectUrl).toContain('state=test-state');
      });
    });

    test('should handle cancel button', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detected: false })
      });

      // Mock window.location.href
      const mockLocationHref = jest.fn();
      Object.defineProperty(window, 'location', {
        writable: true,
        value: {
          href: '',
          toString: () => ''
        }
      });

      Object.defineProperty(window.location, 'href', {
        set: mockLocationHref,
        get: () => ''
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalled();
        const redirectUrl = mockLocationHref.mock.calls[0][0];
        expect(redirectUrl).toContain('error=access_denied');
      });
    });
  });

  describe('UI State Management', () => {
    test('should show loading state during authorization', async () => {
      const testKey = 'sk-ant-api03-valid-test-key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detected: false })
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/sk-ant-api03/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/sk-ant-api03/i);
      const submitButton = screen.getByText('Authorize');

      fireEvent.change(input, { target: { value: testKey } });
      fireEvent.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Authorizing...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    test('should disable authorize button when no API key entered', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detected: false })
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/sk-ant-api03/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByText('Authorize');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Security', () => {
    test('should validate OAuth parameters', async () => {
      // Mock missing redirect_uri
      mockSearchParams = new URLSearchParams('state=test-state');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detected: false })
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Invalid OAuth request/i)).toBeInTheDocument();
      });
    });

    test('should show encrypted storage notice', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detected: false })
      });

      render(
        <BrowserRouter>
          <OAuthConsent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/AES-256-GCM encryption/i)).toBeInTheDocument();
      });
    });
  });
});
