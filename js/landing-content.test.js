import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLandingContentState, buildLandingContentStateForLabels, getLandingContentFieldKeys } from './landing-content.js';

test('buildLandingContentState preserves alternative label and active state', () => {
  const previous = {
    general: { heroTitle: 'General title' },
    alternatives: {
      alt1: { heroTitle: 'Alt title', active: false, label: 'old' }
    }
  };

  const result = buildLandingContentState(previous, {
    configName: 'alt1',
    formValues: { heroTitle: 'Alt title updated' },
    active: true,
    label: 'new label'
  });

  assert.equal(result.landingContent.general.heroTitle, 'General title');
  assert.equal(result.landingContent.alternatives.alt1.heroTitle, 'Alt title updated');
  assert.equal(result.landingContent.alternatives.alt1.active, true);
  assert.equal(result.landingContent.alternatives.alt1.label, 'new label');
});

test('buildLandingContentState writes general content without losing alternate entries', () => {
  const previous = {
    general: { heroTitle: 'General title' },
    alternatives: {
      alt1: { heroTitle: 'Alt title', active: true, label: 'old' }
    }
  };

  const result = buildLandingContentState(previous, {
    configName: 'general',
    formValues: { heroTitle: 'General updated' }
  });

  assert.equal(result.landingContent.general.heroTitle, 'General updated');
  assert.equal(result.landingContent.alternatives.alt1.label, 'old');
});

test('buildLandingContentStateForLabels updates every alternative label in one pass', () => {
  const previous = {
    general: { heroTitle: 'General title' },
    alternatives: {
      alt1: { active: true, label: 'old alt1' },
      alt2: { active: false, label: 'old alt2' }
    }
  };

  const result = buildLandingContentStateForLabels(previous, {
    alt1: 'new alt1',
    alt2: 'new alt2'
  });

  assert.equal(result.landingContent.alternatives.alt1.label, 'new alt1');
  assert.equal(result.landingContent.alternatives.alt2.label, 'new alt2');
  assert.equal(result.landingContent.alternatives.alt1.active, true);
});

test('getLandingContentFieldKeys includes the bonus line field', () => {
  const fieldKeys = getLandingContentFieldKeys();

  assert.ok(fieldKeys.includes('heroBonusLine'));
});
