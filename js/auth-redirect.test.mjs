import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLoginRedirectTarget, resolvePostLoginRedirectTarget } from './auth-redirect.mjs';

test('preserves analytics destination when redirecting to login', () => {
  assert.equal(resolveLoginRedirectTarget('https://example.com/Settings/analytics.html'), 'https://example.com/Settings/analytics.html');
});

test('defaults to settings after login when no redirect was requested', () => {
  assert.equal(resolvePostLoginRedirectTarget('', 'https://example.com/Settings/login.html'), './settings.html');
});

test('uses the requested analytics target after successful login', () => {
  assert.equal(resolvePostLoginRedirectTarget('./analytics.html', 'https://example.com/Settings/login.html'), 'https://example.com/Settings/analytics.html');
});

test('preserves a full protected URL when it is passed as the redirect target', () => {
  assert.equal(resolvePostLoginRedirectTarget('https://example.com/Settings/analytics.html', 'https://example.com/Settings/login.html'), 'https://example.com/Settings/analytics.html');
});
