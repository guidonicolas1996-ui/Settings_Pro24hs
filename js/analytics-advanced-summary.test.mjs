import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdvancedSummaryCards } from './analytics-advanced-summary.mjs';

test('buildAdvancedSummaryCards extracts behavior metrics from landing payload', () => {
  const cards = buildAdvancedSummaryCards({
    landingReady: true,
    behavior: {
      hero: { visiblePercent: 92 },
      buttonVisible: { visiblePercent: 100, scrollY: 420 },
      firstScroll: { distance: 250, direction: 'down' },
      maxScrollPercent: 78,
      whatsappClick: { timeSinceLoadMs: 4300, scrollY: 600 },
      rageClicks: { count: 2 },
      totalClicks: { totalClicks: 11 },
      totalTaps: { totalTaps: 4 }
    },
    performance: { fcp: 800, lcp: 1200, cls: 0.12, inp: 90 },
    exit: { activeTimeMs: 184000, reason: 'pagehide' },
    buttonReady: { ready: true, error: false }
  });

  assert.equal(cards[0].title, 'Landing cargada completamente');
  assert.equal(cards[0].value, 'Sí');
  assert.equal(cards[1].value, '92%');
  assert.equal(cards[3].value, '250 px · down');
  assert.equal(cards[5].value, '184 s');
  assert.equal(cards[8].title, 'Clicks');
  assert.equal(cards[8].value, '11');
  assert.equal(cards[9].title, 'Taps');
  assert.equal(cards[9].value, '4');
});

test('buildAdvancedSummaryCards accepts session-style payload values', () => {
  const cards = buildAdvancedSummaryCards({
    landingReady: { timestamp: '2026-07-27T10:00:00.000Z', firebaseReadyMs: 1500 },
    behavior: {
      hero: { visiblePercent: 92 },
      buttonVisible: { visiblePercent: 100, scrollY: 420 },
      firstScroll: { distance: 250, direction: 'down' },
      maxScrollPercent: 78,
      whatsappClick: { timeSinceLoadMs: 4300 },
      rageClicks: 2,
      totalClicks: 11,
      totalTaps: 4
    },
    performance: { fcp: 800, lcp: 1200, cls: 0.12 },
    exit: { activeTimeMs: 184000 },
    buttonReady: { readyAtMs: 5000, error: null }
  });

  assert.equal(cards[0].value, 'Sí');
  assert.equal(cards[5].value, '184 s');
  assert.equal(cards[6].value, '4 s');
  assert.equal(cards[7].value, '2');
  assert.equal(cards[8].value, '11');
  assert.equal(cards[9].value, '4');
});

test('buildAdvancedSummaryCards aggregates across multiple sessions', () => {
  const cards = buildAdvancedSummaryCards([
    {
      landingReady: true,
      behavior: {
        hero: { visiblePercent: 90 },
        buttonVisible: { visiblePercent: 100, scrollY: 300 },
        firstScroll: { distance: 200, direction: 'down' },
        maxScrollPercent: 60,
        whatsappClick: { timeSinceLoadMs: 3000 },
        rageClicks: { count: 1 },
        totalClicks: { totalClicks: 5 },
        totalTaps: { totalTaps: 2 }
      },
      performance: { fcp: 700, lcp: 1000, cls: 0.05 },
      exit: { activeTimeMs: 120000 },
      buttonReady: { ready: true, error: false }
    },
    {
      landingReady: false,
      behavior: {
        hero: { visiblePercent: 70 },
        buttonVisible: { visiblePercent: 80, scrollY: 500 },
        firstScroll: { distance: 400, direction: 'up' },
        maxScrollPercent: 80,
        whatsappClick: { timeSinceLoadMs: 5000 },
        rageClicks: { count: 3 },
        totalClicks: { totalClicks: 7 },
        totalTaps: { totalTaps: 4 }
      },
      performance: { fcp: 1300, lcp: 1700, cls: 0.15 },
      exit: { activeTimeMs: 180000 },
      buttonReady: { ready: false, error: true }
    }
  ]);

  assert.equal(cards[0].value, '50%');
  assert.equal(cards[1].value, '80%');
  assert.equal(cards[2].value, '90% · 400 px');
  assert.match(cards[3].value, /300 px/);
  assert.equal(cards[6].value, '4 s');
  assert.equal(cards[7].value, '2');
  assert.equal(cards[8].value, '6');
  assert.equal(cards[9].value, '3');
});

test('buildAdvancedSummaryCards falls back to empty values when data is missing', () => {
  const cards = buildAdvancedSummaryCards({});

  assert.equal(cards[0].value, 'Sin datos');
  assert.equal(cards[6].value, 'Sin datos');
});
