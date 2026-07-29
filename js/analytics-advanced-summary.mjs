function formatDurationMs(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Sin datos';
  }

  if (value >= 1000) {
    const seconds = Math.round(value / 1000);
    return `${seconds} s`;
  }

  return `${Math.round(value)} ms`;
}

function formatPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Sin datos';
  }

  return `${Math.round(value)}%`;
}

function formatNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Sin datos';
  }

  return `${Math.round(value)}`;
}

function formatBoolean(value) {
  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  if (value && typeof value === 'object') {
    return 'Sí';
  }

  if (typeof value === 'number') {
    return value > 0 ? 'Sí' : 'No';
  }

  return 'Sin datos';
}

function formatMetricValue(value) {
  if (value == null || value === '') {
    return 'Sin datos';
  }

  if (typeof value === 'number') {
    return formatNumber(value);
  }

  if (typeof value === 'boolean') {
    return formatBoolean(value);
  }

  return String(value);
}

function normalizeBehaviorValue(value, fallbackValue = null) {
  if (value == null || value === '') {
    return fallbackValue;
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value.count ?? value.totalClicks ?? value.totalTaps ?? value.timeSinceLoadMs ?? value.visiblePercent ?? value.scrollY ?? value.distance ?? fallbackValue;
  }

  return value;
}

function isTruthyLike(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  if (value && typeof value === 'object') {
    return true;
  }

  return Boolean(value);
}

function readNumericValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const numericCandidates = [
      value.count,
      value.totalClicks,
      value.totalTaps,
      value.timeSinceLoadMs,
      value.visiblePercent,
      value.scrollY,
      value.distance,
      value.activeTimeMs,
      value.fcp,
      value.lcp,
      value.cls,
      value.readyAtMs,
      value.ready,
      value.error
    ];

    for (const candidate of numericCandidates) {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
  }

  return null;
}

function aggregatePayloads(payloads = []) {
  const normalizedPayloads = (Array.isArray(payloads) ? payloads : [payloads]).filter((item) => item && typeof item === 'object');
  if (!normalizedPayloads.length) {
    return {};
  }

  const count = normalizedPayloads.length;
  const landingReadyValues = normalizedPayloads.map((payload) => payload.landingReady).filter((value) => value != null);
  const buttonReadyValues = normalizedPayloads.map((payload) => payload.buttonReady).filter((value) => value && typeof value === 'object');

  const heroVisiblePercent = normalizedPayloads
    .map((payload) => readNumericValue(payload?.behavior?.hero?.visiblePercent))
    .filter((value) => value != null);
  const buttonVisiblePercent = normalizedPayloads
    .map((payload) => readNumericValue(payload?.behavior?.buttonVisible?.visiblePercent))
    .filter((value) => value != null);
  const buttonVisibleScrollY = normalizedPayloads
    .map((payload) => readNumericValue(payload?.behavior?.buttonVisible?.scrollY))
    .filter((value) => value != null);
  const firstScrollDistance = normalizedPayloads
    .map((payload) => readNumericValue(payload?.behavior?.firstScroll?.distance))
    .filter((value) => value != null);
  const firstScrollDirections = normalizedPayloads
    .map((payload) => payload?.behavior?.firstScroll?.direction)
    .filter((value) => value != null && value !== '');
  const maxScrollPercent = normalizedPayloads
    .map((payload) => readNumericValue(payload?.behavior?.maxScrollPercent))
    .filter((value) => value != null);
  const activeTimeMs = normalizedPayloads
    .map((payload) => readNumericValue(payload?.exit?.activeTimeMs))
    .filter((value) => value != null);
  const whatsappTime = normalizedPayloads
    .map((payload) => readNumericValue(payload?.behavior?.whatsappClick?.timeSinceLoadMs))
    .filter((value) => value != null);
  const rageClicks = normalizedPayloads
    .map((payload) => readNumericValue(payload?.behavior?.rageClicks?.count ?? payload?.behavior?.rageClicks))
    .filter((value) => value != null);
  const totalClicks = normalizedPayloads
    .map((payload) => readNumericValue(payload?.behavior?.totalClicks?.totalClicks ?? payload?.behavior?.totalClicks))
    .filter((value) => value != null);
  const totalTaps = normalizedPayloads
    .map((payload) => readNumericValue(payload?.behavior?.totalTaps?.totalTaps ?? payload?.behavior?.totalTaps))
    .filter((value) => value != null);
  const performanceFcp = normalizedPayloads
    .map((payload) => readNumericValue(payload?.performance?.fcp))
    .filter((value) => value != null);
  const performanceLcp = normalizedPayloads
    .map((payload) => readNumericValue(payload?.performance?.lcp))
    .filter((value) => value != null);
  const performanceCls = normalizedPayloads
    .map((payload) => readNumericValue(payload?.performance?.cls))
    .filter((value) => value != null);

  const landingReadyRate = landingReadyValues.length
    ? (landingReadyValues.filter((value) => isTruthyLike(value)).length / landingReadyValues.length) * 100
    : null;
  const buttonReadyRate = buttonReadyValues.length
    ? (buttonReadyValues.filter((value) => isTruthyLike(value.ready)).length / buttonReadyValues.length) * 100
    : null;
  const buttonErrorRate = buttonReadyValues.length
    ? (buttonReadyValues.filter((value) => isTruthyLike(value.error)).length / buttonReadyValues.length) * 100
    : null;

  const directionFrequency = firstScrollDirections.reduce((accumulator, direction) => {
    const safeDirection = String(direction).trim();
    if (!safeDirection) {
      return accumulator;
    }
    accumulator[safeDirection] = (accumulator[safeDirection] || 0) + 1;
    return accumulator;
  }, {});
  const dominantDirection = Object.entries(directionFrequency).sort((left, right) => right[1] - left[1])[0]?.[0] || null;

  return {
    landingReady: landingReadyRate,
    behavior: {
      hero: {
        visiblePercent: heroVisiblePercent.length ? heroVisiblePercent.reduce((sum, value) => sum + value, 0) / heroVisiblePercent.length : null
      },
      buttonVisible: {
        visiblePercent: buttonVisiblePercent.length ? buttonVisiblePercent.reduce((sum, value) => sum + value, 0) / buttonVisiblePercent.length : null,
        scrollY: buttonVisibleScrollY.length ? buttonVisibleScrollY.reduce((sum, value) => sum + value, 0) / buttonVisibleScrollY.length : null
      },
      firstScroll: {
        distance: firstScrollDistance.length ? firstScrollDistance.reduce((sum, value) => sum + value, 0) / firstScrollDistance.length : null,
        direction: dominantDirection
      },
      maxScrollPercent: maxScrollPercent.length ? maxScrollPercent.reduce((sum, value) => sum + value, 0) / maxScrollPercent.length : null,
      whatsappClick: {
        timeSinceLoadMs: whatsappTime.length ? whatsappTime.reduce((sum, value) => sum + value, 0) / whatsappTime.length : null
      },
      rageClicks: rageClicks.length ? rageClicks.reduce((sum, value) => sum + value, 0) / rageClicks.length : null,
      totalClicks: totalClicks.length ? totalClicks.reduce((sum, value) => sum + value, 0) / totalClicks.length : null,
      totalTaps: totalTaps.length ? totalTaps.reduce((sum, value) => sum + value, 0) / totalTaps.length : null
    },
    performance: {
      fcp: performanceFcp.length ? performanceFcp.reduce((sum, value) => sum + value, 0) / performanceFcp.length : null,
      lcp: performanceLcp.length ? performanceLcp.reduce((sum, value) => sum + value, 0) / performanceLcp.length : null,
      cls: performanceCls.length ? performanceCls.reduce((sum, value) => sum + value, 0) / performanceCls.length : null
    },
    exit: {
      activeTimeMs: activeTimeMs.length ? activeTimeMs.reduce((sum, value) => sum + value, 0) / activeTimeMs.length : null
    },
    buttonReady: {
      ready: buttonReadyRate,
      error: buttonErrorRate
    },
    _count: count
  };
}

export function buildAdvancedSummaryCards(payload = {}) {
  const isAggregated = Array.isArray(payload);
  const aggregatedPayload = isAggregated ? aggregatePayloads(payload) : payload;
  const behavior = aggregatedPayload.behavior || {};
  const performance = aggregatedPayload.performance || {};
  const exit = aggregatedPayload.exit || {};
  const buttonReady = aggregatedPayload.buttonReady || {};
  const landingReadyValue = aggregatedPayload.landingReady != null ? aggregatedPayload.landingReady : (payload && payload.landingReady != null ? payload.landingReady : null);
  const buttonReadyState = isAggregated
    ? buttonReady.ready
    : (typeof buttonReady.ready === 'boolean'
      ? buttonReady.ready
      : (buttonReady.readyAtMs != null || buttonReady.error == null) && buttonReady.error !== true);
  const behaviorHeroVisiblePercent = normalizeBehaviorValue(behavior.hero?.visiblePercent, behavior.hero?.visiblePercent);
  const behaviorButtonVisiblePercent = normalizeBehaviorValue(behavior.buttonVisible?.visiblePercent, behavior.buttonVisible?.visiblePercent);
  const behaviorButtonVisibleScrollY = normalizeBehaviorValue(behavior.buttonVisible?.scrollY, behavior.buttonVisible?.scrollY);
  const behaviorFirstScrollDistance = normalizeBehaviorValue(behavior.firstScroll?.distance, behavior.firstScroll?.distance);
  const behaviorFirstScrollDirection = behavior.firstScroll?.direction ?? behavior.firstScroll?.direction;
  const behaviorMaxScrollPercent = normalizeBehaviorValue(behavior.maxScrollPercent, behavior.maxScrollPercent);
  const behaviorWhatsappTime = normalizeBehaviorValue(behavior.whatsappClick?.timeSinceLoadMs, behavior.whatsappClick?.timeSinceLoadMs);
  const behaviorRageClicks = normalizeBehaviorValue(behavior.rageClicks?.count ?? behavior.rageClicks, behavior.rageClicks?.count ?? behavior.rageClicks);
  const behaviorTotalClicks = normalizeBehaviorValue(behavior.totalClicks?.totalClicks ?? behavior.totalClicks, behavior.totalClicks?.totalClicks ?? behavior.totalClicks);
  const behaviorTotalTaps = normalizeBehaviorValue(behavior.totalTaps?.totalTaps ?? behavior.totalTaps, behavior.totalTaps?.totalTaps ?? behavior.totalTaps);

  return [
    {
      title: 'Landing cargada completamente',
      value: isAggregated ? formatPercent(landingReadyValue) : formatBoolean(landingReadyValue)
    },
    {
      title: 'Hero visible',
      value: formatPercent(behaviorHeroVisiblePercent)
    },
    {
      title: 'Botón WhatsApp visible',
      value: `${formatPercent(behaviorButtonVisiblePercent)} · ${formatNumber(behaviorButtonVisibleScrollY)} px`
    },
    {
      title: 'Primer scroll',
      value: `${formatNumber(behaviorFirstScrollDistance)} px · ${formatMetricValue(behaviorFirstScrollDirection)}`
    },
    {
      title: 'Scroll máximo',
      value: formatPercent(behaviorMaxScrollPercent)
    },
    {
      title: 'Tiempo activo',
      value: formatDurationMs(exit.activeTimeMs)
    },
    {
      title: 'Click WhatsApp',
      value: formatDurationMs(behaviorWhatsappTime)
    },
    {
      title: 'Rage clicks',
      value: formatNumber(behaviorRageClicks)
    },
    {
      title: 'Clicks',
      value: formatNumber(behaviorTotalClicks)
    },
    {
      title: 'Taps',
      value: formatNumber(behaviorTotalTaps)
    },
    {
      title: 'Performance real',
      value: `FCP ${formatNumber(performance.fcp)} · LCP ${formatNumber(performance.lcp)} · CLS ${formatMetricValue(performance.cls)}`
    },
    {
      title: 'Estado del botón',
      value: isAggregated
        ? `${formatPercent(buttonReady.ready)} · ${formatPercent(buttonReady.error)}`
        : `${formatBoolean(buttonReadyState)} · ${formatBoolean(Boolean(buttonReady.error))}`
    }
  ];
}
