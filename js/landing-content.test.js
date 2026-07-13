import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLandingContentState } from './landing-content.js';

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
