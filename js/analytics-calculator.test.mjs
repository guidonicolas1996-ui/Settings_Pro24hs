import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCampaignCalculatorMetrics, calculateConversionPercent, calculateWindowMultiplier } from './analytics-calculator.mjs';

test('calculates the daily window multiplier for one hour', () => {
  const start = new Date('2026-07-25T10:00:00');
  const end = new Date('2026-07-25T11:00:00');

  assert.equal(calculateWindowMultiplier(start, end), 1 / 24);
});

test('calculates the daily window multiplier for two days', () => {
  const start = new Date('2026-07-25T10:00:00');
  const end = new Date('2026-07-27T10:00:00');

  assert.equal(calculateWindowMultiplier(start, end), 2);
});

test('calculates conversion rates and per-unit cost', () => {
  const metrics = calculateCampaignCalculatorMetrics({
    dailyCost: 120,
    uniqueVisits: 1000,
    uniqueWhatsapp: 200,
    arrived: 40,
    derived: 10,
    rangeStart: new Date('2026-07-25T00:00:00'),
    rangeEnd: new Date('2026-07-25T23:59:59.999')
  });

  assert.equal(metrics.periodCost, 120);
  assert.equal(metrics.arrivedRatePercent, 20);
  assert.equal(metrics.derivedRatePercent, 25);
  assert.equal(metrics.costPerArrived, 3);
  assert.equal(metrics.costPerDerived, 12);
});

test('returns zero when there is no prior base', () => {
  assert.equal(calculateConversionPercent(10, 0), 0);
});
