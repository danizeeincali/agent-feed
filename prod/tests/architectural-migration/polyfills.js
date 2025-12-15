/**
 * Polyfills for Architectural Migration Tests
 *
 * PURPOSE: Provide browser API polyfills for Node.js test environment
 * SCOPE: Ensure all browser APIs are available during testing
 */

// TextEncoder/TextDecoder polyfill for Node.js
if (!global.TextEncoder) {
  global.TextEncoder = require('util').TextEncoder;
}

if (!global.TextDecoder) {
  global.TextDecoder = require('util').TextDecoder;
}

// AbortController polyfill for fetch cancellation
if (!global.AbortController) {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onabort: null,
      };
    }

    abort() {
      this.signal.aborted = true;
      if (this.signal.onabort) {
        this.signal.onabort();
      }
    }
  };
}

// DOMRect polyfill for getBoundingClientRect
if (!global.DOMRect) {
  global.DOMRect = class DOMRect {
    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.top = y;
      this.left = x;
      this.bottom = y + height;
      this.right = x + width;
    }
  };
}

// MutationObserver polyfill
if (!global.MutationObserver) {
  global.MutationObserver = class MutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.observations = [];
    }

    observe(target, options) {
      this.observations.push({ target, options });
    }

    disconnect() {
      this.observations = [];
    }

    takeRecords() {
      return [];
    }
  };
}

// CustomEvent polyfill
if (!global.CustomEvent) {
  global.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail;
    }
  };
}

// EventTarget polyfill
if (!global.EventTarget) {
  global.EventTarget = class EventTarget {
    constructor() {
      this.listeners = {};
    }

    addEventListener(type, listener) {
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(listener);
    }

    removeEventListener(type, listener) {
      if (this.listeners[type]) {
        this.listeners[type] = this.listeners[type].filter(l => l !== listener);
      }
    }

    dispatchEvent(event) {
      if (this.listeners[event.type]) {
        this.listeners[event.type].forEach(listener => listener(event));
      }
      return true;
    }
  };
}

// getComputedStyle polyfill
if (!global.getComputedStyle) {
  global.getComputedStyle = (element) => {
    return {
      getPropertyValue: (property) => '',
      setProperty: jest.fn(),
      removeProperty: jest.fn(),
    };
  };
}

// Range polyfill for text selection
if (!global.Range) {
  global.Range = class Range {
    constructor() {
      this.startContainer = null;
      this.startOffset = 0;
      this.endContainer = null;
      this.endOffset = 0;
      this.collapsed = true;
    }

    setStart(node, offset) {
      this.startContainer = node;
      this.startOffset = offset;
    }

    setEnd(node, offset) {
      this.endContainer = node;
      this.endOffset = offset;
    }

    collapse(toStart) {
      this.collapsed = true;
    }

    selectNode(node) {
      this.startContainer = node.parentNode;
      this.endContainer = node.parentNode;
    }

    getBoundingClientRect() {
      return new DOMRect(0, 0, 0, 0);
    }
  };
}

// Selection polyfill
if (!global.Selection) {
  global.Selection = class Selection {
    constructor() {
      this.rangeCount = 0;
      this.anchorNode = null;
      this.focusNode = null;
    }

    addRange(range) {
      this.rangeCount = 1;
    }

    removeAllRanges() {
      this.rangeCount = 0;
    }

    getRangeAt(index) {
      return new Range();
    }
  };
}

// document.getSelection polyfill
if (typeof document !== 'undefined' && !document.getSelection) {
  document.getSelection = () => new Selection();
}

// Crypto polyfill for random values
if (!global.crypto) {
  global.crypto = {
    getRandomValues: (array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };
}

// Headers polyfill for fetch
if (!global.Headers) {
  global.Headers = class Headers {
    constructor(init) {
      this.map = new Map();
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => this.set(key, value));
        } else if (init instanceof Headers) {
          init.forEach((value, key) => this.set(key, value));
        } else {
          Object.entries(init).forEach(([key, value]) => this.set(key, value));
        }
      }
    }

    append(name, value) {
      const existing = this.get(name);
      if (existing) {
        this.set(name, `${existing}, ${value}`);
      } else {
        this.set(name, value);
      }
    }

    delete(name) {
      this.map.delete(name.toLowerCase());
    }

    get(name) {
      return this.map.get(name.toLowerCase()) || null;
    }

    has(name) {
      return this.map.has(name.toLowerCase());
    }

    set(name, value) {
      this.map.set(name.toLowerCase(), String(value));
    }

    forEach(callback) {
      this.map.forEach((value, key) => callback(value, key, this));
    }

    *entries() {
      yield* this.map.entries();
    }

    *keys() {
      yield* this.map.keys();
    }

    *values() {
      yield* this.map.values();
    }

    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

// Request polyfill for fetch
if (!global.Request) {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers);
      this.body = init.body || null;
      this.credentials = init.credentials || 'same-origin';
      this.cache = init.cache || 'default';
      this.redirect = init.redirect || 'follow';
    }

    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body,
        credentials: this.credentials,
        cache: this.cache,
        redirect: this.redirect
      });
    }
  };
}

// Response polyfill for fetch
if (!global.Response) {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Headers(init.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }

    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }

    async text() {
      return String(this.body);
    }

    async blob() {
      return new Blob([this.body]);
    }

    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers
      });
    }
  };
}

// FormData polyfill
if (!global.FormData) {
  global.FormData = class FormData {
    constructor() {
      this.data = new Map();
    }

    append(name, value) {
      if (!this.data.has(name)) {
        this.data.set(name, []);
      }
      this.data.get(name).push(value);
    }

    delete(name) {
      this.data.delete(name);
    }

    get(name) {
      const values = this.data.get(name);
      return values ? values[0] : null;
    }

    getAll(name) {
      return this.data.get(name) || [];
    }

    has(name) {
      return this.data.has(name);
    }

    set(name, value) {
      this.data.set(name, [value]);
    }

    forEach(callback) {
      this.data.forEach((values, name) => {
        values.forEach(value => callback(value, name, this));
      });
    }

    *entries() {
      for (const [name, values] of this.data) {
        for (const value of values) {
          yield [name, value];
        }
      }
    }

    *keys() {
      yield* this.data.keys();
    }

    *values() {
      for (const values of this.data.values()) {
        yield* values;
      }
    }

    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

// URLSearchParams polyfill
if (!global.URLSearchParams) {
  global.URLSearchParams = class URLSearchParams {
    constructor(init) {
      this.params = new Map();
      if (typeof init === 'string') {
        this.parseString(init);
      } else if (init instanceof URLSearchParams) {
        init.forEach((value, key) => this.append(key, value));
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.append(key, value));
      } else if (init) {
        Object.entries(init).forEach(([key, value]) => this.append(key, value));
      }
    }

    parseString(str) {
      str.replace(/^\?/, '').split('&').forEach(pair => {
        if (pair) {
          const [key, value = ''] = pair.split('=');
          this.append(decodeURIComponent(key), decodeURIComponent(value));
        }
      });
    }

    append(name, value) {
      if (!this.params.has(name)) {
        this.params.set(name, []);
      }
      this.params.get(name).push(String(value));
    }

    delete(name) {
      this.params.delete(name);
    }

    get(name) {
      const values = this.params.get(name);
      return values ? values[0] : null;
    }

    getAll(name) {
      return this.params.get(name) || [];
    }

    has(name) {
      return this.params.has(name);
    }

    set(name, value) {
      this.params.set(name, [String(value)]);
    }

    toString() {
      const pairs = [];
      this.params.forEach((values, name) => {
        values.forEach(value => {
          pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
        });
      });
      return pairs.join('&');
    }

    forEach(callback) {
      this.params.forEach((values, name) => {
        values.forEach(value => callback(value, name, this));
      });
    }

    *entries() {
      for (const [name, values] of this.params) {
        for (const value of values) {
          yield [name, value];
        }
      }
    }

    *keys() {
      yield* this.params.keys();
    }

    *values() {
      for (const values of this.params.values()) {
        yield* values;
      }
    }

    [Symbol.iterator]() {
      return this.entries();
    }
  };
}

console.info('🔧 Browser API polyfills loaded for architectural migration tests');