// Load environment variables from .env file
require('dotenv').config();

// Polyfills for Node.js environment
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill fetch for tests using undici (Node.js built-in in v18+)
// Jest doesn't provide fetch, so we need to polyfill it
if (typeof global.fetch === 'undefined') {
  const { fetch, Headers, Request, Response } = require('undici');
  global.fetch = fetch;
  global.Headers = Headers;
  global.Request = Request;
  global.Response = Response;
}
