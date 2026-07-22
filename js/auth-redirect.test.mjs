import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLoginRedirectTarget, resolvePostLoginRedirectTarget } from './auth-redirect.mjs';

test('preserves analytics destination when redirecting to login', () => {
  assert.equal(resolveLoginRedirectTarget('https://example.com/settings/analytics.html'), './analytics.html');
});

test('defaults to settings after login when no redirect was requested', () => {
  assert.equal(resolvePostLoginRedirectTarget('', 'https://example.com/settings/login.html'), './settings.html');
});

test('uses the requested analytics target after successful login', () => {
  assert.equal(resolvePostLoginRedirectTarget('redirect=./analytics.html', 'https://example.com/settings/login.html'), '/settings/analytics.html');
});
