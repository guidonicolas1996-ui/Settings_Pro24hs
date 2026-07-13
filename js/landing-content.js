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

export { buildLandingContentState, cloneLandingContentState };
