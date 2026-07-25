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

test('truncates today range to the current time', () => {
  const range = createAnalyticsRange('today', new Date('2026-07-25T10:00:00'));
  assert.equal(range.start.getHours(), 0);
  assert.equal(range.end.getHours(), 10);
  assert.equal(range.end.getMinutes(), 0);
});

test('truncates week range to the current time on today', () => {
  const range = createAnalyticsRange('week', new Date('2026-07-25T10:00:00'));
  assert.equal(range.end.getHours(), 10);
  assert.equal(range.end.getMinutes(), 0);
  assert.equal(range.end.getDate(), 25);
});

test('truncates month range to the current time on today', () => {
  const range = createAnalyticsRange('month', new Date('2026-07-25T14:35:00'));
  assert.equal(range.end.getHours(), 14);
  assert.equal(range.end.getMinutes(), 35);
  assert.equal(range.end.getDate(), 25);
});
