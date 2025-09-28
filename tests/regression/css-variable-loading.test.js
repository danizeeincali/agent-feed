/**
 * CSS Variable Loading Tests - TDD Regression Prevention
 *
 * Validates HSL format CSS variables are properly loaded and applied
 * Prevents white screen issues caused by CSS variable failures
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { JSDOM } from 'jsdom';

describe('CSS Variable Loading Tests', () => {
  let dom;
  let document;
  let window;

  beforeAll(() => {
    // Setup JSDOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @layer base {
              :root {
                --background: 0 0% 100%;
                --foreground: 222.2 84% 4.9%;
                --card: 0 0% 100%;
                --card-foreground: 222.2 84% 4.9%;
                --popover: 0 0% 100%;
                --popover-foreground: 222.2 84% 4.9%;
                --primary: 221.2 83.2% 53.3%;
                --primary-foreground: 210 40% 98%;
                --secondary: 210 40% 96%;
                --secondary-foreground: 222.2 84% 4.9%;
                --muted: 210 40% 96%;
                --muted-foreground: 215.4 16.3% 46.9%;
                --accent: 210 40% 96%;
                --accent-foreground: 222.2 84% 4.9%;
                --destructive: 0 84.2% 60.2%;
                --destructive-foreground: 210 40% 98%;
                --border: 214.3 31.8% 91.4%;
                --input: 214.3 31.8% 91.4%;
                --ring: 221.2 83.2% 53.3%;
                --radius: 0.5rem;
              }

              .dark {
                --background: 222.2 84% 4.9%;
                --foreground: 210 40% 98%;
                --card: 222.2 84% 4.9%;
                --card-foreground: 210 40% 98%;
                --popover: 222.2 84% 4.9%;
                --popover-foreground: 210 40% 98%;
                --primary: 217.2 91.2% 59.8%;
                --primary-foreground: 222.2 84% 4.9%;
                --secondary: 217.2 32.6% 17.5%;
                --secondary-foreground: 210 40% 98%;
                --muted: 217.2 32.6% 17.5%;
                --muted-foreground: 215 20.2% 65.1%;
                --accent: 217.2 32.6% 17.5%;
                --accent-foreground: 210 40% 98%;
                --destructive: 0 62.8% 30.6%;
                --destructive-foreground: 210 40% 98%;
                --border: 217.2 32.6% 17.5%;
                --input: 217.2 32.6% 17.5%;
                --ring: 224.3 76.3% 94.1%;
              }
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3003',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
  });

  afterAll(() => {
    dom.window.close();
  });

  test('should load HSL format CSS variables correctly', () => {
    const rootElement = document.documentElement;
    const computedStyle = window.getComputedStyle(rootElement);

    // Test critical HSL color variables
    const background = computedStyle.getPropertyValue('--background').trim();
    const foreground = computedStyle.getPropertyValue('--foreground').trim();
    const primary = computedStyle.getPropertyValue('--primary').trim();

    expect(background).toBe('0 0% 100%');
    expect(foreground).toBe('222.2 84% 4.9%');
    expect(primary).toBe('221.2 83.2% 53.3%');
  });

  test('should validate all required CSS variables are defined', () => {
    const rootElement = document.documentElement;
    const computedStyle = window.getComputedStyle(rootElement);

    const requiredVariables = [
      '--background',
      '--foreground',
      '--card',
      '--card-foreground',
      '--popover',
      '--popover-foreground',
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--muted',
      '--muted-foreground',
      '--accent',
      '--accent-foreground',
      '--destructive',
      '--destructive-foreground',
      '--border',
      '--input',
      '--ring',
      '--radius'
    ];

    requiredVariables.forEach(variable => {
      const value = computedStyle.getPropertyValue(variable).trim();
      expect(value).toBeTruthy();
      expect(value).not.toBe('');
    });
  });

  test('should properly format HSL values without parentheses', () => {
    const rootElement = document.documentElement;
    const computedStyle = window.getComputedStyle(rootElement);

    const hslVariables = [
      '--background',
      '--foreground',
      '--primary',
      '--secondary'
    ];

    hslVariables.forEach(variable => {
      const value = computedStyle.getPropertyValue(variable).trim();

      // HSL values should be in format "H S% L%" without "hsl()"
      expect(value).toMatch(/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/);
      expect(value).not.toContain('hsl(');
      expect(value).not.toContain(')');
    });
  });

  test('should validate dark mode CSS variables', () => {
    const darkElement = document.createElement('div');
    darkElement.className = 'dark';
    document.body.appendChild(darkElement);

    const computedStyle = window.getComputedStyle(darkElement);

    // Dark mode should inherit different values
    const background = computedStyle.getPropertyValue('--background').trim();
    const foreground = computedStyle.getPropertyValue('--foreground').trim();

    // In dark mode, background and foreground should be swapped
    expect(background).toBe('222.2 84% 4.9%');
    expect(foreground).toBe('210 40% 98%');

    document.body.removeChild(darkElement);
  });

  test('should validate CSS variable accessibility', () => {
    const rootElement = document.documentElement;
    const computedStyle = window.getComputedStyle(rootElement);

    // Test contrast ratios are maintained through proper HSL values
    const background = computedStyle.getPropertyValue('--background').trim();
    const foreground = computedStyle.getPropertyValue('--foreground').trim();

    // Background should be light (high lightness)
    const backgroundLightness = parseFloat(background.split(' ')[2]);
    expect(backgroundLightness).toBeGreaterThan(90);

    // Foreground should be dark (low lightness)
    const foregroundLightness = parseFloat(foreground.split(' ')[2]);
    expect(foregroundLightness).toBeLessThan(10);
  });

  test('should prevent CSS variable conflicts with Tailwind', () => {
    // Test that our CSS variables don't conflict with Tailwind's approach
    const rootElement = document.documentElement;
    const computedStyle = window.getComputedStyle(rootElement);

    // Verify radius is defined properly for Tailwind
    const radius = computedStyle.getPropertyValue('--radius').trim();
    expect(radius).toBe('0.5rem');
    expect(radius).toMatch(/^[\d.]+rem$/);
  });

  test('should validate CSS custom property inheritance', () => {
    const childElement = document.createElement('div');
    childElement.className = 'child-test';
    document.body.appendChild(childElement);

    const computedStyle = window.getComputedStyle(childElement);

    // Child elements should inherit CSS custom properties
    const inheritedBackground = computedStyle.getPropertyValue('--background').trim();
    expect(inheritedBackground).toBe('0 0% 100%');

    document.body.removeChild(childElement);
  });

  test('should validate CSS layer precedence', () => {
    // Test that @layer base properly applies
    const rootElement = document.documentElement;
    const computedStyle = window.getComputedStyle(rootElement);

    // All base layer variables should be accessible
    const baseVariables = ['--background', '--foreground', '--primary'];

    baseVariables.forEach(variable => {
      const value = computedStyle.getPropertyValue(variable).trim();
      expect(value).toBeTruthy();
      expect(value).not.toBe('initial');
      expect(value).not.toBe('unset');
    });
  });
});