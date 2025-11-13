/**
 * API Key Encryption Service
 * Implements secure encryption/decryption for Anthropic API keys
 *
 * Matches TDD contract from ApiKeyEncryption.test.js
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts an Anthropic API key using AES-256-CBC encryption
 * @param {string} apiKey - Plain text API key
 * @returns {string} Encrypted data in format: iv:encryptedData
 * @throws {Error} If API key is invalid or encryption secret is missing
 */
function encryptApiKey(apiKey) {
  // Validate input
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API key is required for encryption');
  }

  // Check encryption secret
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable is required');
  }

  if (secret.length < 32) {
    throw new Error('Encryption secret must be at least 32 characters');
  }

  // Create encryption key (SHA-256 hash of secret for consistent 32-byte key)
  const key = crypto.createHash('sha256').update(secret).digest();

  // Generate random IV
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Return in format: iv:encryptedData
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted API key
 * @param {string} encryptedData - Encrypted data in format: iv:encryptedData
 * @returns {string} Decrypted API key
 * @throws {Error} If encrypted data is invalid or decryption fails
 */
function decryptApiKey(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') {
    throw new Error('Invalid encrypted data format');
  }

  // Split IV and encrypted data
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format - must be iv:encryptedData');
  }

  const [ivHex, encrypted] = parts;

  // Get encryption secret
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable is required');
  }

  // Create decryption key
  const key = crypto.createHash('sha256').update(secret).digest();

  // Create decipher
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  // Decrypt
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Validates Anthropic API key format
 * Format: sk-ant-api03-[95 alphanumeric characters]AA
 * Total length: 108 characters
 *
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Check exact format: sk-ant-api03- (13 chars) + 95 alphanumeric chars
  // Total: 108 characters
  const regex = /^sk-ant-api03-[A-Za-z0-9]{95}$/;
  return regex.test(apiKey);
}

/**
 * Gets the encryption algorithm being used
 * @returns {string} Algorithm name
 */
function getEncryptionAlgorithm() {
  return ALGORITHM;
}

module.exports = {
  encryptApiKey,
  decryptApiKey,
  isValidApiKey,
  getEncryptionAlgorithm
};
