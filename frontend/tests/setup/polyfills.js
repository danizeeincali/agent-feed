/**
 * Polyfills for Test Environment
 * 
 * Ensures browser APIs are available in test environment
 */

// TextEncoder/TextDecoder polyfill
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Blob polyfill
if (typeof Blob === 'undefined') {
  global.Blob = require('blob-polyfill').Blob;
}

// URL polyfill
if (typeof URL === 'undefined') {
  global.URL = require('url').URL;
}

// AbortController polyfill
if (typeof AbortController === 'undefined') {
  global.AbortController = require('abort-controller').AbortController;
  global.AbortSignal = require('abort-controller').AbortSignal;
}

// structuredClone polyfill for older Node versions
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Custom event polyfill
if (typeof CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
      this.bubbles = options.bubbles || false;
      this.cancelable = options.cancelable || false;
    }
  };
}

// PointerEvent polyfill
if (typeof PointerEvent === 'undefined') {
  global.PointerEvent = class PointerEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.pointerId = options.pointerId || 1;
      this.pointerType = options.pointerType || 'mouse';
    }
  };
}

// Touch events polyfill
if (typeof TouchEvent === 'undefined') {
  global.TouchEvent = class TouchEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.touches = options.touches || [];
      this.changedTouches = options.changedTouches || [];
    }
  };
}

// MutationObserver polyfill
if (typeof MutationObserver === 'undefined') {
  global.MutationObserver = class MutationObserver {
    constructor(callback) {
      this.callback = callback;
    }
    
    observe() {
      // Mock implementation
    }
    
    disconnect() {
      // Mock implementation
    }
    
    takeRecords() {
      return [];
    }
  };
}

// RequestAnimationFrame polyfill
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16);
  };
}

if (typeof cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

// Crypto polyfill for random values
if (typeof crypto === 'undefined') {
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

// IndexedDB polyfill (basic mock)
if (typeof indexedDB === 'undefined') {
  global.indexedDB = {
    open: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    deleteDatabase: () => Promise.resolve(),
  };
}

// File polyfill
if (typeof File === 'undefined') {
  global.File = class File {
    constructor(chunks, name, options = {}) {
      this.name = name;
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    }
  };
}

// FileReader polyfill
if (typeof FileReader === 'undefined') {
  global.FileReader = class FileReader {
    constructor() {
      this.readyState = 0;
      this.result = null;
      this.error = null;
    }
    
    readAsText(file) {
      setTimeout(() => {
        this.result = file.toString();
        this.readyState = 2;
        if (this.onload) this.onload();
      }, 0);
    }
    
    readAsDataURL(file) {
      setTimeout(() => {
        this.result = 'data:text/plain;base64,dGVzdA==';
        this.readyState = 2;
        if (this.onload) this.onload();
      }, 0);
    }
    
    addEventListener(event, handler) {
      this[`on${event}`] = handler;
    }
  };
}

// FormData polyfill
if (typeof FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this.data = new Map();
    }
    
    append(name, value) {
      this.data.set(name, value);
    }
    
    get(name) {
      return this.data.get(name);
    }
    
    has(name) {
      return this.data.has(name);
    }
    
    delete(name) {
      this.data.delete(name);
    }
    
    entries() {
      return this.data.entries();
    }
  };
}

// Headers polyfill
if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init = {}) {
      this.headers = new Map();
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }
    
    append(name, value) {
      this.headers.set(name.toLowerCase(), value);
    }
    
    get(name) {
      return this.headers.get(name.toLowerCase());
    }
    
    has(name) {
      return this.headers.has(name.toLowerCase());
    }
    
    delete(name) {
      this.headers.delete(name.toLowerCase());
    }
    
    entries() {
      return this.headers.entries();
    }
  };
}

// Response polyfill
if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body = null, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Headers(init.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body || '{}'));
    }
    
    text() {
      return Promise.resolve(this.body || '');
    }
    
    blob() {
      return Promise.resolve(new Blob([this.body || '']));
    }
    
    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers,
      });
    }
  };
}

// Request polyfill
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers);
      this.body = init.body || null;
    }
    
    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body,
      });
    }
  };
}

// WebRTC polyfills (basic mocks)
if (typeof RTCPeerConnection === 'undefined') {
  global.RTCPeerConnection = class RTCPeerConnection {
    constructor() {
      this.onicecandidate = null;
      this.ontrack = null;
    }
    
    createOffer() {
      return Promise.resolve({ type: 'offer', sdp: 'mock-offer' });
    }
    
    createAnswer() {
      return Promise.resolve({ type: 'answer', sdp: 'mock-answer' });
    }
    
    setLocalDescription() {
      return Promise.resolve();
    }
    
    setRemoteDescription() {
      return Promise.resolve();
    }
    
    addIceCandidate() {
      return Promise.resolve();
    }
    
    close() {
      // Mock implementation
    }
  };
}

// MediaDevices polyfill
if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
  navigator.mediaDevices = {
    getUserMedia: () => Promise.reject(new Error('Not supported in test environment')),
    getDisplayMedia: () => Promise.reject(new Error('Not supported in test environment')),
    enumerateDevices: () => Promise.resolve([]),
  };
}

// Geolocation polyfill
if (typeof navigator !== 'undefined' && !navigator.geolocation) {
  navigator.geolocation = {
    getCurrentPosition: (success, error) => {
      if (error) {
        error({ code: 1, message: 'Not supported in test environment' });
      }
    },
    watchPosition: () => 1,
    clearWatch: () => {},
  };
}

// Battery API polyfill
if (typeof navigator !== 'undefined' && !navigator.getBattery) {
  navigator.getBattery = () => Promise.resolve({
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    level: 1,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}

// Vibration API polyfill
if (typeof navigator !== 'undefined' && !navigator.vibrate) {
  navigator.vibrate = () => false;
}

// Web Speech API polyfills
if (typeof SpeechRecognition === 'undefined') {
  global.SpeechRecognition = class SpeechRecognition {
    start() {}
    stop() {}
    abort() {}
  };
}

if (typeof SpeechSynthesis === 'undefined') {
  global.SpeechSynthesis = class SpeechSynthesis {
    speak() {}
    cancel() {}
    pause() {}
    resume() {}
    getVoices() { return []; }
  };
}

// Notification API polyfill
if (typeof Notification === 'undefined') {
  global.Notification = class Notification {
    constructor(title, options = {}) {
      this.title = title;
      this.body = options.body || '';
      this.icon = options.icon || '';
    }
    
    static requestPermission() {
      return Promise.resolve('granted');
    }
    
    close() {}
  };
  
  Notification.permission = 'granted';
}

console.log('Test polyfills loaded successfully');