/**
 * Unit tests for validators
 */

import { describe, it, expect } from 'vitest';
import {
  validateUrl,
  validateLevel,
  validateFormat,
  validateTimeout,
  validateOutputPath
} from '../../src/utils/validators.js';

describe('validateUrl', () => {
  it('accepts valid HTTPS URLs', () => {
    const result = validateUrl('https://example.com');
    expect(result.valid).toBe(true);
    expect(result.url.href).toBe('https://example.com/');
  });

  it('accepts valid HTTP URLs', () => {
    const result = validateUrl('http://example.com');
    expect(result.valid).toBe(true);
  });

  it('adds https:// if protocol is missing', () => {
    const result = validateUrl('example.com');
    expect(result.valid).toBe(true);
    expect(result.url.protocol).toBe('https:');
  });

  it('accepts URLs with paths', () => {
    const result = validateUrl('https://example.com/path/to/page');
    expect(result.valid).toBe(true);
    expect(result.url.pathname).toBe('/path/to/page');
  });

  it('accepts URLs with query parameters', () => {
    const result = validateUrl('https://example.com?foo=bar');
    expect(result.valid).toBe(true);
  });

  it('accepts localhost', () => {
    const result = validateUrl('http://localhost:3000');
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it('rejects empty input', () => {
    const result = validateUrl('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('URL is required');
  });

  it('rejects null input', () => {
    const result = validateUrl(null);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid URLs', () => {
    const result = validateUrl('not a url');
    expect(result.valid).toBe(false);
  });

  it('rejects non-http protocols', () => {
    const result = validateUrl('ftp://example.com');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('HTTP and HTTPS');
  });
});

describe('validateLevel', () => {
  it('accepts "A"', () => {
    const result = validateLevel('A');
    expect(result.valid).toBe(true);
    expect(result.level).toBe('A');
  });

  it('accepts "AA"', () => {
    const result = validateLevel('AA');
    expect(result.valid).toBe(true);
    expect(result.level).toBe('AA');
  });

  it('accepts "AAA"', () => {
    const result = validateLevel('AAA');
    expect(result.valid).toBe(true);
    expect(result.level).toBe('AAA');
  });

  it('normalizes lowercase input', () => {
    const result = validateLevel('aa');
    expect(result.valid).toBe(true);
    expect(result.level).toBe('AA');
  });

  it('rejects invalid levels', () => {
    const result = validateLevel('B');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('A, AA, AAA');
  });

  it('rejects empty input', () => {
    const result = validateLevel('');
    expect(result.valid).toBe(false);
  });
});

describe('validateFormat', () => {
  it('accepts "json"', () => {
    const result = validateFormat('json');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('json');
  });

  it('accepts "html"', () => {
    const result = validateFormat('html');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('html');
  });

  it('accepts "md"', () => {
    const result = validateFormat('md');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('md');
  });

  it('normalizes uppercase input', () => {
    const result = validateFormat('JSON');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('json');
  });

  it('rejects invalid formats', () => {
    const result = validateFormat('pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('json, html, md');
  });
});

describe('validateTimeout', () => {
  it('accepts valid timeout', () => {
    const result = validateTimeout(30000);
    expect(result.valid).toBe(true);
    expect(result.timeout).toBe(30000);
  });

  it('accepts string numbers', () => {
    const result = validateTimeout('60000');
    expect(result.valid).toBe(true);
    expect(result.timeout).toBe(60000);
  });

  it('rejects timeout below 1000ms', () => {
    const result = validateTimeout(500);
    expect(result.valid).toBe(false);
  });

  it('rejects timeout above 5 minutes', () => {
    const result = validateTimeout(400000);
    expect(result.valid).toBe(false);
  });

  it('rejects non-numeric input', () => {
    const result = validateTimeout('abc');
    expect(result.valid).toBe(false);
  });
});

describe('validateOutputPath', () => {
  it('accepts valid path', () => {
    const result = validateOutputPath('./report.json', 'json');
    expect(result.valid).toBe(true);
    expect(result.path).toBe('./report.json');
  });

  it('adds extension if missing', () => {
    const result = validateOutputPath('./report', 'json');
    expect(result.valid).toBe(true);
    expect(result.path).toBe('./report.json');
  });

  it('preserves correct extension', () => {
    const result = validateOutputPath('./report.html', 'html');
    expect(result.valid).toBe(true);
    expect(result.path).toBe('./report.html');
  });

  it('rejects empty path', () => {
    const result = validateOutputPath('', 'json');
    expect(result.valid).toBe(false);
  });
});
