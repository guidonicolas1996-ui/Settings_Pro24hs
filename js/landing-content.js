function getLandingContentFieldKeys() {
  return [
    'heroBonusLine',
    'accessBadge',
    'heroTitle',
    'heroCopy',
    'promoLabel',
    'promoTitle',
    'promoNote',
    'ctaLabel',
    'helperText',
    'footerText1',
    'footerText2',
    'whatsappUrl'
  ];
}

function cloneLandingContentState(landingContent = {}) {
  const source = landingContent && typeof landingContent === 'object' ? landingContent : {};
  const general = source.general && typeof source.general === 'object' ? { ...source.general } : {};
  const alternatives = source.alternatives && typeof source.alternatives === 'object' ? { ...source.alternatives } : {};

  return {
    general,
    alternatives: Object.fromEntries(
      Object.entries(alternatives).map(([key, value]) => [key, value && typeof value === 'object' ? { ...value } : {}])
    )
  };
}

function buildLandingContentState(previousLandingContent = {}, options = {}) {
  const nextState = cloneLandingContentState(previousLandingContent);
  const configName = options.configName || 'general';
  const formValues = options.formValues || {};

  if (configName === 'general') {
    nextState.general = {
      ...nextState.general,
      ...formValues
    };
  } else {
    const existingAlt = nextState.alternatives[configName] && typeof nextState.alternatives[configName] === 'object'
      ? nextState.alternatives[configName]
      : {};

    nextState.alternatives[configName] = {
      ...existingAlt,
      ...formValues,
      ...(options.active !== undefined ? { active: Boolean(options.active) } : {}),
      ...(options.label !== undefined ? { label: options.label } : {})
    };
  }

  return { landingContent: nextState };
}

function buildLandingContentStateForLabels(previousLandingContent = {}, labelsByAlt = {}) {
  const nextState = cloneLandingContentState(previousLandingContent);
  Object.entries(labelsByAlt || {}).forEach(([altName, label]) => {
    if (!altName || !altName.startsWith('alt')) return;
    const existingAlt = nextState.alternatives[altName] && typeof nextState.alternatives[altName] === 'object'
      ? nextState.alternatives[altName]
      : {};
    nextState.alternatives[altName] = {
      ...existingAlt,
      label: String(label ?? '')
    };
  });

  return { landingContent: nextState };
}

export { buildLandingContentState, buildLandingContentStateForLabels, cloneLandingContentState, getLandingContentFieldKeys };
