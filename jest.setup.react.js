// Load environment variables
require('dotenv').config();

// Setup DOM testing environment
require('@testing-library/jest-dom');

// Polyfills
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Simple fetch mock (jsdom doesn't include fetch by default)
global.fetch = jest.fn();

// Note: window.location mocking is done per-test as needed
