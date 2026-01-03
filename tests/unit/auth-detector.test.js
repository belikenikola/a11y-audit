/**
 * Unit tests for auth detector
 */

import { describe, it, expect } from 'vitest';
import {
  AUTH_URL_PATTERNS,
  AUTH_FORM_SELECTORS,
  AUTH_TEXT_PATTERNS,
  AUTH_HTTP_CODES
} from '../../src/core/auth-detector.js';

describe('AUTH_URL_PATTERNS', () => {
  it('contains common login paths', () => {
    expect(AUTH_URL_PATTERNS).toContain('/login');
    expect(AUTH_URL_PATTERNS).toContain('/signin');
    expect(AUTH_URL_PATTERNS).toContain('/auth');
  });

  it('contains SSO patterns', () => {
    expect(AUTH_URL_PATTERNS).toContain('/sso');
    expect(AUTH_URL_PATTERNS).toContain('/oauth');
    expect(AUTH_URL_PATTERNS).toContain('/saml');
  });
});

describe('AUTH_FORM_SELECTORS', () => {
  it('includes password input selectors', () => {
    expect(AUTH_FORM_SELECTORS).toContain('input[type="password"]');
  });

  it('includes autocomplete selectors', () => {
    expect(AUTH_FORM_SELECTORS.some(s => s.includes('autocomplete'))).toBe(true);
  });
});

describe('AUTH_TEXT_PATTERNS', () => {
  it('matches "sign in" text', () => {
    const signInPattern = AUTH_TEXT_PATTERNS.find(p => p.test('Sign In'));
    expect(signInPattern).toBeDefined();
  });

  it('matches "log in" text', () => {
    const logInPattern = AUTH_TEXT_PATTERNS.find(p => p.test('Log In'));
    expect(logInPattern).toBeDefined();
  });

  it('matches "enter your password" text', () => {
    const passwordPattern = AUTH_TEXT_PATTERNS.find(p => p.test('Enter your password'));
    expect(passwordPattern).toBeDefined();
  });

  it('is case insensitive', () => {
    const signInPattern = AUTH_TEXT_PATTERNS.find(p => p.test('SIGN IN'));
    expect(signInPattern).toBeDefined();
  });
});

describe('AUTH_HTTP_CODES', () => {
  it('includes 401 Unauthorized', () => {
    expect(AUTH_HTTP_CODES).toContain(401);
  });

  it('includes 403 Forbidden', () => {
    expect(AUTH_HTTP_CODES).toContain(403);
  });
});
