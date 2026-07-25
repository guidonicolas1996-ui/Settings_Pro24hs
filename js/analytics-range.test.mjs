import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyticsRange } from './analytics-range.mjs';

const baseDate = new Date('2026-07-25T14:35:00');

test('creates a range for the current hour', () => {
  const range = createAnalyticsRange('current-hour', baseDate);
  assert.equal(range.label, 'Hora actual');
  assert.equal(range.start.getHours(), 14);
  assert.equal(range.end.getHours(), 14);
});

test('creates a range for the current shift', () => {
  const range = createAnalyticsRange('current-shift', baseDate);
  assert.equal(range.label, 'Turno actual');
  assert.equal(range.start.getHours(), 8);
  assert.equal(range.end.getHours(), 15);
});

test('creates a range for yesterday', () => {
  const range = createAnalyticsRange('yesterday', baseDate);
  assert.equal(range.label, 'Ayer');
  assert.equal(range.start.getDate(), 24);
  assert.equal(range.end.getDate(), 24);
});
