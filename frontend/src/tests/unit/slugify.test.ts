import { describe, it, expect } from 'vitest';
import { generateSlug } from '@/utils/slugify';

describe('generateSlug', () => {
  it('should convert APIIntegrator to apiintegrator (no hyphens needed)', () => {
    expect(generateSlug('APIIntegrator')).toBe('apiintegrator');
  });

  it('should convert "Chief of Staff" to "chief-of-staff"', () => {
    expect(generateSlug('Chief of Staff')).toBe('chief-of-staff');
  });

  it('should convert "Data Analyzer 2.0" to "data-analyzer-2-0"', () => {
    expect(generateSlug('Data Analyzer 2.0')).toBe('data-analyzer-2-0');
  });

  it('should convert "Test@Agent#123" to "test-agent-123"', () => {
    expect(generateSlug('Test@Agent#123')).toBe('test-agent-123');
  });

  it('should handle multiple spaces: "  Multiple   Spaces  " to "multiple-spaces"', () => {
    expect(generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });

  it('should return empty string for empty input', () => {
    expect(generateSlug('')).toBe('');
  });

  it('should return empty string for special chars only "@@##"', () => {
    expect(generateSlug('@@##')).toBe('');
  });

  it('should handle mixed special characters and alphanumeric', () => {
    expect(generateSlug('Hello!@#World$%^123')).toBe('hello-world-123');
  });

  it('should remove consecutive hyphens', () => {
    expect(generateSlug('test---multiple---hyphens')).toBe('test-multiple-hyphens');
  });

  it('should trim leading and trailing hyphens', () => {
    expect(generateSlug('-leading-and-trailing-')).toBe('leading-and-trailing');
  });

  it('should handle unicode characters by removing them', () => {
    expect(generateSlug('Hello 世界 World')).toBe('hello-world');
  });

  it('should handle underscores as separators', () => {
    expect(generateSlug('test_with_underscores')).toBe('test-with-underscores');
  });
});
