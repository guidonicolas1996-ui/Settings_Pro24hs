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

function formatMetricSummary(mean, median, unit = '') {
  const meanText = mean != null ? `${Math.round(mean)}${unit}` : 'Sin datos';
  const medianText = median != null ? `${Math.round(median)}${unit}` : 'Sin datos';
  return `
    <div class="metric-summary">
      <span class="metric-summary__label">Media:</span> <span class="metric-summary__value">${meanText}</span>
      <span class="metric-summary__label">Mediana:</span> <span class="metric-summary__value">${medianText}</span>
    </div>
  `;
}

function hasMetricData(mean, median) {
  return mean != null || median != null;
}

function formatConfidenceLevel(totalSessions) {
  if (totalSessions < 10) {
    return 'Baja';
  }
  if (totalSessions < 30) {
    return 'Media';
  }
  return 'Alta';
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

function mean(values = []) {
  const numbers = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function median(values = []) {
  const numbers = values.filter((value) => typeof value === 'number' && Number.isFinite(value)).sort((a, b) => a - b);
  if (!numbers.length) return null;
  const middle = Math.floor(numbers.length / 2);
  return numbers.length % 2 === 0
    ? (numbers[middle - 1] + numbers[middle]) / 2
    : numbers[middle];
}

function clampPercent(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, value));
}

function formatPercentValue(value) {
  const percent = clampPercent(value);
  return percent == null ? 'Sin datos' : `${Math.round(percent)}%`;
}

function formatMeanMedian(meanValue, medianValue, unit = '') {
  if (meanValue == null && medianValue == null) {
    return 'Sin datos';
  }
  const meanText = meanValue != null ? `${Math.round(meanValue)}${unit}` : '—';
  const medianText = medianValue != null ? `${Math.round(medianValue)}${unit}` : '—';
  return `${meanText} / ${medianText}`;
}

function groupBy(items = [], keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    const bucket = String(key ?? 'unknown');
    acc[bucket] = acc[bucket] || [];
    acc[bucket].push(item);
    return acc;
  }, {});
}

function getExposureBucketKey(durationMs, hasExposureData) {
  if (!hasExposureData) {
    return 'unknownExposure';
  }
  if (durationMs == null || durationMs === 0) {
    return 'neverExposed';
  }
  if (durationMs < 500) {
    return 'exposedLt0_5s';
  }
  if (durationMs < 1000) {
    return 'exposed0_5_1s';
  }
  if (durationMs < 2000) {
    return 'exposed1_2s';
  }
  if (durationMs < 4000) {
    return 'exposed2_4s';
  }
  if (durationMs < 8000) {
    return 'exposed4_8s';
  }
  return 'exposedGt8s';
}

function getExposureBucketLabel(key) {
  const labels = {
    unknownExposure: 'Sin datos de exposure',
    neverExposed: 'Nunca expuesto',
    exposedLt0_5s: '<0,5 s',
    exposed0_5_1s: '0,5–1 s',
    exposed1_2s: '1–2 s',
    exposed2_4s: '2–4 s',
    exposed4_8s: '4–8 s',
    exposedGt8s: '>8 s'
  };
  return labels[key] || 'Desconocido';
}

function getSampleWarning(totalSessions) {
  if (typeof totalSessions !== 'number' || totalSessions <= 0) {
    return null;
  }
  if (totalSessions < 10) {
    return `⚠️ Muestra muy pequeña (${totalSessions} sesión${totalSessions === 1 ? '' : 'es'}). Los porcentajes no permiten sacar conclusiones confiables.`;
  }
  if (totalSessions < 30) {
    return `⚠️ Muestra pequeña (${totalSessions} sesiones). Los porcentajes no permiten sacar conclusiones confiables.`;
  }
  return null;
}

function buildSessionSummary(session) {
  const landingReady = session.landingReady != null;
  const heroVisible = session.behavior?.hero != null;
  const ctaAvailable = session.behavior?.buttonVisible != null;
  const whatsappClick = session.behavior?.whatsappClick != null;
  const buttonReadyMs = readNumericValue(session.buttonReady?.readyAtMs ?? session.landingReady?.buttonReadyMs);
  const ctaVisiblePercent = readNumericValue(session.behavior?.buttonVisible?.visiblePercent);
  const ctaVisibleTimeMs = readNumericValue(session.behavior?.buttonVisible?.timeSinceLoadMs);
  const buttonExposureDurationMs = readNumericValue(session.behavior?.buttonExposure?.totalVisibleDurationMs);
  const visibleBeforeWhatsappMs = readNumericValue(session.behavior?.buttonExposure?.visibleBeforeWhatsappMs);
  const maxScrollPercent = readNumericValue(session.behavior?.maxScrollPercent);
  const fcp = readNumericValue(session.performance?.fcp);
  const lcp = readNumericValue(session.performance?.lcp);
  const cls = readNumericValue(session.performance?.cls);
  const inp = readNumericValue(session.performance?.inp);
  const ttfb = readNumericValue(session.performance?.ttfb);
  const source = String(session.source ?? 'unknown');
  const device = String(session.landingReady?.device ?? 'unknown');
  const connection = String(session.landingReady?.connection?.effectiveType ?? session.landingReady?.connection?.type ?? 'unknown');
  const buttonExposureKnown = session.behavior?.buttonExposure != null;
  const exposureDurationMs = whatsappClick ? visibleBeforeWhatsappMs : buttonExposureDurationMs;
  const ctaExposed = buttonExposureKnown && exposureDurationMs > 0;
  const exposureBucket = getExposureBucketKey(exposureDurationMs, buttonExposureKnown);

  let stage;
  if (!landingReady) {
    stage = 'noReady';
  } else if (!ctaAvailable) {
    stage = 'readyNoCta';
  } else if (!ctaExposed) {
    stage = exposureBucket;
  } else if (whatsappClick) {
    stage = 'whatsapp';
  } else {
    stage = exposureBucket;
  }

  return {
    landingReady,
    heroVisible,
    ctaAvailable,
    whatsappClick,
    buttonReadyMs,
    ctaVisiblePercent,
    ctaVisibleTimeMs,
    buttonExposureDurationMs,
    visibleBeforeWhatsappMs,
    buttonExposureMaxVisiblePercent: readNumericValue(session.behavior?.buttonExposure?.maxVisiblePercent),
    buttonExposureWasEverFullyVisible: Boolean(session.behavior?.buttonExposure?.wasEverFullyVisible),
    buttonExposureKnown,
    maxScrollPercent,
    fcp,
    lcp,
    cls,
    inp,
    ttfb,
    source,
    device,
    connection,
    exposureBucket,
    stage
  };
}

function buildFunnelSummary(sessions) {
  const total = sessions.length;
  const landingReadyCount = sessions.filter((item) => item.landingReady).length;
  const ctaAvailableCount = sessions.filter((item) => item.landingReady && item.ctaAvailable).length;
  const ctaExposedCount = sessions.filter((item) => item.landingReady && item.ctaAvailable && item.ctaExposed).length;
  const whatsappCount = sessions.filter((item) => item.landingReady && item.ctaAvailable && item.ctaExposed && item.whatsappClick).length;

  const stageDefinitions = [
    { key: 'visits', label: 'Visitas' },
    { key: 'landingReady', label: 'Landing registrada' },
    { key: 'ctaAvailable', label: 'CTA visible' },
    { key: 'ctaExposed', label: 'CTA Exposed' },
    { key: 'whatsapp', label: 'WhatsApp Click' }
  ];

  const stageValues = {
    visits: { count: total },
    landingReady: { count: landingReadyCount },
    ctaAvailable: { count: ctaAvailableCount },
    ctaExposed: { count: ctaExposedCount },
    whatsapp: { count: whatsappCount }
  };

  const stages = stageDefinitions.map((definition, index) => {
    const stage = stageValues[definition.key];
    const previousCount = index > 0 ? stageValues[stageDefinitions[index - 1].key].count : null;
    const percentOfTotal = total > 0 ? (stage.count / total) * 100 : null;
    const percentOfPrevious = previousCount != null && previousCount > 0 ? (stage.count / previousCount) * 100 : null;
    const lossFromPrevious = index > 0 && previousCount != null ? stage.count - previousCount : null;
    return {
      key: definition.key,
      label: definition.label,
      count: stage.count,
      percentOfTotal,
      percentOfPrevious,
      lossFromPrevious
    };
  });

  const funnelByKey = stages.reduce((accumulator, stage) => {
    accumulator[stage.key] = stage;
    return accumulator;
  }, {});

  return {
    stages,
    visits: funnelByKey.visits,
    landingReady: funnelByKey.landingReady,
    ctaAvailable: funnelByKey.ctaAvailable,
    ctaExposed: funnelByKey.ctaExposed,
    whatsapp: funnelByKey.whatsapp
  };
}

function buildClickComparison(sessions) {
  const groups = {
    clicked: { label: 'WhatsApp Click', sessions: [] },
    notClicked: { label: 'No WhatsApp Click', sessions: [] }
  };

  sessions.forEach((session) => {
    const bucket = session.whatsappClick ? groups.clicked : groups.notClicked;
    bucket.sessions.push(session);
  });

  const rows = Object.values(groups).map((group) => {
    const count = group.sessions.length;
    const reachedCount = group.sessions.filter((item) => item.ctaAvailable).length;
    const exposedCount = group.sessions.filter((item) => item.ctaExposed).length;
    const whatsappCount = group.sessions.filter((item) => item.whatsappClick).length;
    return {
      label: group.label,
      count,
      noReady: group.sessions.filter((item) => item.stage === 'noReady').length,
      readyNoCta: group.sessions.filter((item) => item.stage === 'readyNoCta').length,
      ctaReached: reachedCount,
      ctaExposed: exposedCount,
      whatsapp: whatsappCount
    };
  });

  return { groups: rows, rows };
}

function buildGroupStats(sessions) {
  const metrics = [
    { key: 'buttonReadyMs', label: 'Button Ready (ms)', unit: ' ms' },
    { key: 'lcp', label: 'LCP (ms)', unit: ' ms' },
    { key: 'fcp', label: 'FCP (ms)', unit: ' ms' },
    { key: 'ttfb', label: 'TTFB (ms)', unit: ' ms' },
    { key: 'cls', label: 'CLS', unit: '' },
    { key: 'inp', label: 'INP (ms)', unit: ' ms' },
    { key: 'ctaVisiblePercent', label: 'CTA Reached (visiblePercent)', unit: '%' },
    { key: 'ctaVisibleTimeMs', label: 'CTA aparece en (ms)', unit: ' ms' },
    { key: 'buttonExposureDurationMs', label: 'CTA visible acumulada (ms)', unit: ' ms' },
    { key: 'maxScrollPercent', label: 'MaxScrollPct', unit: '%' }
  ];

  const groups = {
    all: sessions,
    clicked: sessions.filter((item) => item.whatsappClick),
    notClicked: sessions.filter((item) => !item.whatsappClick)
  };

  return metrics.map((metric) => {
    return {
      label: metric.label,
      values: Object.entries(groups).reduce((acc, [groupKey, groupSessions]) => {
        const values = groupSessions.map((item) => item[metric.key]).filter((value) => typeof value === 'number' && Number.isFinite(value));
        acc[groupKey] = {
          mean: mean(values),
          median: median(values),
          count: values.length
        };
        return acc;
      }, {})
    };
  });
}

function calculateCategoricalDistribution(values = []) {
  const counts = values.reduce((acc, value) => {
    const key = String(value ?? 'unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const total = values.length;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count, percent: total > 0 ? (count / total) * 100 : 0 }));
}

function buildCategoricalStats(sessions) {
  const groups = {
    all: sessions,
    clicked: sessions.filter((item) => item.whatsappClick),
    notClicked: sessions.filter((item) => !item.whatsappClick)
  };

  const fields = [
    { key: 'source', label: 'Source' },
    { key: 'device', label: 'Device' },
    { key: 'connection', label: 'Connection' }
  ];

  return fields.map((field) => {
    const distribution = Object.entries(groups).reduce((acc, [groupKey, groupSessions]) => {
      acc[groupKey] = calculateCategoricalDistribution(groupSessions.map((item) => item[field.key]));
      return acc;
    }, {});
    return {
      label: field.label,
      field: field.key,
      distribution
    };
  });
}

function buildExposureBuckets() {
  return [
    { label: 'Nunca expuesto', key: 'neverExposed', test: (value) => value === 0 },
    { label: '<0,5 s', key: 'exposedLt0_5s', test: (value) => value > 0 && value < 500 },
    { label: '0,5–1 s', key: 'exposed0_5_1s', test: (value) => value >= 500 && value < 1000 },
    { label: '1–2 s', key: 'exposed1_2s', test: (value) => value >= 1000 && value < 2000 },
    { label: '2–4 s', key: 'exposed2_4s', test: (value) => value >= 2000 && value < 4000 },
    { label: '4–8 s', key: 'exposed4_8s', test: (value) => value >= 4000 && value < 8000 },
    { label: '>8 s', key: 'exposedGt8s', test: (value) => value >= 8000 },
    { label: 'Sin datos de exposure', key: 'unknownExposure', test: (value, known) => !known }
  ];
}

function buildExposureSummary(sessions) {
  const availableSessions = sessions.filter((item) => item.ctaAvailable);
  const totalAvailable = availableSessions.length;
  const definitions = buildExposureBuckets();
  const buckets = definitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    sessions: 0,
    whatsapp: 0,
    conversion: null,
    percentOfAvailable: null
  }));

  availableSessions.forEach((session) => {
    const duration = session.whatsappClick ? session.visibleBeforeWhatsappMs : session.buttonExposureDurationMs;
    const known = session.buttonExposureKnown;
    const bucketKey = getExposureBucketKey(duration, known);
    const bucket = buckets.find((item) => item.key === bucketKey);
    if (bucket) {
      bucket.sessions += 1;
      if (session.whatsappClick) {
        bucket.whatsapp += 1;
      }
    }
  });

  return buckets.map((bucket) => ({
    ...bucket,
    percentOfAvailable: totalAvailable > 0 ? (bucket.sessions / totalAvailable) * 100 : null,
    conversion: bucket.sessions > 0 ? (bucket.whatsapp / bucket.sessions) * 100 : null
  }));
}

function buildBucketDefinitions() {
  return {
    lcp: {
      label: 'LCP',
      buckets: [
        { label: '< 1 s', test: (value) => value != null && value < 1000 },
        { label: '1–2 s', test: (value) => value != null && value >= 1000 && value < 2000 },
        { label: '2–3 s', test: (value) => value != null && value >= 2000 && value < 3000 },
        { label: '> 3 s', test: (value) => value != null && value >= 3000 },
        { label: 'Sin dato', test: (value) => value == null }
      ]
    },
    buttonReadyMs: {
      label: 'Button Ready',
      buckets: [
        { label: '< 1 s', test: (value) => value != null && value < 1000 },
        { label: '1–3 s', test: (value) => value != null && value >= 1000 && value < 3000 },
        { label: '3–5 s', test: (value) => value != null && value >= 3000 && value < 5000 },
        { label: '> 5 s', test: (value) => value != null && value >= 5000 },
        { label: 'Sin dato', test: (value) => value == null }
      ]
    },
    maxScrollPercent: {
      label: 'Max Scroll %',
      buckets: [
        { label: '< 25%', test: (value) => value != null && value < 25 },
        { label: '25–50%', test: (value) => value != null && value >= 25 && value < 50 },
        { label: '50–75%', test: (value) => value != null && value >= 50 && value < 75 },
        { label: '75–100%', test: (value) => value != null && value >= 75 },
        { label: 'Sin dato', test: (value) => value == null }
      ]
    }
  };
}

function buildBucketDistribution(sessions) {
  const definitions = buildBucketDefinitions();
  const buckets = {};
  Object.entries(definitions).forEach(([key, definition]) => {
    buckets[key] = definition.buckets.map((bucket) => {
      const sessionsInBucket = sessions.filter((item) => bucket.test(item[key]));
      const whatsapp = sessionsInBucket.filter((item) => item.whatsappClick).length;
      const conversion = sessionsInBucket.length > 0 ? (whatsapp / sessionsInBucket.length) * 100 : null;
      return {
        label: bucket.label,
        sessions: sessionsInBucket.length,
        whatsapp,
        conversion
      };
    });
  });
  return buckets;
}

function buildAdvancedSummaryReport(payloads = []) {
  const sessions = (payloads || []).filter((payload) => payload && typeof payload === 'object').map(buildSessionSummary);
  const totalSessions = sessions.length;
  if (!totalSessions) {
    return '<div class="analytics-card"><h3>Resumen Avanzado</h3><p>No hay sesiones en el rango seleccionado.</p></div>';
  }

  const funnel = buildFunnelSummary(sessions);
  const clickComparison = buildClickComparison(sessions);
  const exposureSummary = buildExposureSummary(sessions);
  const metricStats = buildGroupStats(sessions);
  const categoricalStats = buildCategoricalStats(sessions);
  const bucketDistribution = buildBucketDistribution(sessions);

  const funnelStages = funnel.stages;
  const mostSignificantLoss = funnelStages.slice(1).reduce((best, stage) => {
    if (!best || (stage.lossFromPrevious != null && stage.lossFromPrevious < best.lossFromPrevious)) {
      return stage;
    }
    return best;
  }, null);

  const sampleWarning = getSampleWarning(totalSessions);
  const lossSummaryText = mostSignificantLoss
    ? `Se observa mayor pérdida entre ${mostSignificantLoss.label === 'WhatsApp Click' ? 'CTA Exposed y WhatsApp' : `${funnelStages[funnelStages.findIndex((item) => item.key === mostSignificantLoss.key) - 1]?.label} y ${mostSignificantLoss.label}`}: ${Math.abs(mostSignificantLoss.lossFromPrevious)} sesiones (${formatPercentValue(100 - mostSignificantLoss.percentOfPrevious)}).`
    : null;
  const deviceGroups = groupBy(sessions, (session) => session.device);
  const desktop = deviceGroups.desktop || [];
  const mobile = deviceGroups.mobile || [];
  const tablet = deviceGroups.tablet || [];

  const hasButtonExposureData = sessions.some((session) => session.buttonExposureKnown);
  const totalButtonExposureUnknown = sessions.filter((session) => session.ctaAvailable && !session.buttonExposureKnown).length;
  const convertRate = (items) => {
    if (!items.length) return null;
    const clicks = items.filter((item) => item.whatsappClick).length;
    return (clicks / items.length) * 100;
  };

  const deviceDiagnosis = [];
  if (desktop.length >= 5 && mobile.length >= 5) {
    const desktopRate = convertRate(desktop);
    const mobileRate = convertRate(mobile);
    const diff = desktopRate != null && mobileRate != null ? mobileRate - desktopRate : null;
    if (diff != null && Math.abs(diff) >= 5) {
      const direction = diff > 0 ? 'mayor' : 'menor';
      deviceDiagnosis.push(`Se observa una asociación donde Mobile convierte ${Math.round(Math.abs(diff))} puntos ${direction} que Desktop.`);
    }
  }

  const buttonReadyValues = sessions.map((item) => item.buttonReadyMs).filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (buttonReadyValues.length >= 10) {
    const medianReady = median(buttonReadyValues);
    const slowGroup = sessions.filter((item) => typeof item.buttonReadyMs === 'number' && item.buttonReadyMs > medianReady);
    const fastGroup = sessions.filter((item) => typeof item.buttonReadyMs === 'number' && item.buttonReadyMs <= medianReady);
    if (slowGroup.length >= 5 && fastGroup.length >= 5) {
      const slowRate = convertRate(slowGroup);
      const fastRate = convertRate(fastGroup);
      if (slowRate != null && fastRate != null && fastRate > slowRate + 5) {
        deviceDiagnosis.push(`Se observa una asociación donde sesiones con buttonReady mayor a la mediana (${Math.round(medianReady)} ms) presentan menor conversión a WhatsApp.`);
      }
    }
  }

  const whatsappWithoutReady = sessions.filter((item) => item.whatsappClick && !item.landingReady).length;
  const whatsappWithoutReached = sessions.filter((item) => item.whatsappClick && item.landingReady && !item.ctaAvailable).length;

  const sessionCounts = {
    all: totalSessions,
    clicked: clickComparison.groups.find((group) => group.label === 'WhatsApp Click')?.count || 0,
    notClicked: clickComparison.groups.find((group) => group.label === 'No WhatsApp Click')?.count || 0
  };

  const metricByKey = (key) => metricStats.find((metric) => metric.key === key) || { values: { all: {}, clicked: {}, notClicked: {} }, unit: '' };
  const formatMetricValueGroup = (key, group) => {
    const metric = metricByKey(key);
    const values = metric.values[group] || {};
    return formatMeanMedian(values.mean, values.median, metric.unit);
  };

  const getCategorySummary = (field) => {
    const category = categoricalStats.find((item) => item.field === field);
    const formatEntry = (entry) => entry ? `${entry.key} (${Math.round(entry.percent)}%)` : 'N/D';
    return {
      all: formatEntry(category?.distribution?.all?.[0]),
      clicked: formatEntry(category?.distribution?.clicked?.[0]),
      notClicked: formatEntry(category?.distribution?.notClicked?.[0])
    };
  };

  const deviceSummary = getCategorySummary('device');
  const sourceSummary = getCategorySummary('source');
  const connectionSummary = getCategorySummary('connection');

  const percentReached = formatPercentValue(funnel.ctaAvailable.percentOfTotal);
  const percentExposed = formatPercentValue(funnel.ctaExposed.percentOfTotal);
  const percentWhatsappClick = formatPercentValue(funnel.whatsapp.percentOfTotal);
  const totalInstrumentedSessions = sessions.filter((item) => item.buttonExposureKnown).length;
  const totalInstrumentedSessionsPercent = totalSessions > 0 ? formatPercentValue((totalInstrumentedSessions / totalSessions) * 100) : 'Sin datos';
  const totalHistoricalSessions = sessions.filter((item) => !item.buttonExposureKnown).length;
  const totalCtaReachedWithoutExposure = totalButtonExposureUnknown;
  const totalAvailable = sessions.filter((item) => item.ctaAvailable).length;
  const confidenceLevel = formatConfidenceLevel(totalSessions);
  const performanceHasData = metricStats.some((metric) =>
    hasMetricData(metric.values.all.mean, metric.values.all.median) ||
    hasMetricData(metric.values.clicked.mean, metric.values.clicked.median) ||
    hasMetricData(metric.values.notClicked.mean, metric.values.notClicked.median)
  );
  const behaviorHasData = sessions.some((item) =>
    item.heroVisible || typeof item.ctaVisibleTimeMs === 'number' || typeof item.maxScrollPercent === 'number'
  );
  const exposureProblemBuckets = ['neverExposed', 'exposedLt0_5s'];
  const exposureProblem = exposureSummary.filter((bucket) => exposureProblemBuckets.includes(bucket.key));
  const exposureProblemPercent = exposureProblem.reduce((sum, bucket) => sum + (bucket.percentOfAvailable || 0), 0);
  const exposureProblemSessions = exposureProblem.reduce((sum, bucket) => sum + bucket.sessions, 0);
  const exposureTopBuckets = exposureSummary
    .filter((bucket) => bucket.key !== 'unknownExposure')
    .sort((a, b) => (b.percentOfAvailable || 0) - (a.percentOfAvailable || 0))
    .slice(0, 2);
  const exposureIssueText = totalAvailable > 0
    ? `${formatPercentValue(exposureProblemPercent)} de quienes llegaron al CTA tuvieron exposición insuficiente (<0,5 s o ninguna).`
    : 'No hay datos de exposición suficientes.';
  const sampleQualityText = `${totalInstrumentedSessionsPercent} instrumentadas • ${confidenceLevel}`;
  const performanceNote = performanceHasData ? 'Incluye métricas de performance que respaldan el análisis.' : null;
  const behaviorNote = behaviorHasData ? 'Incluye métricas de comportamiento que respaldan el recorrido.' : null;
  const dataSupportLines = [performanceNote, behaviorNote].filter(Boolean);

  const stageCards = funnelStages.map((stage) => `
    <article class="advanced-stage-card ${stage === mostSignificantLoss ? 'advanced-stage-card--highlight' : ''}">
      <span class="advanced-stage-card__label">${stage.label}</span>
      <span class="advanced-stage-card__value">${stage.count}</span>
      <span class="advanced-stage-card__meta">${formatPercentValue(stage.percentOfTotal)} del total</span>
      <span class="advanced-stage-card__meta">${stage.percentOfPrevious != null ? `${formatPercentValue(stage.percentOfPrevious)} previo` : '— previo'}</span>
    </article>
  `).join('');

  const previousStageLabel = mostSignificantLoss ? funnelStages[funnelStages.findIndex((item) => item.key === mostSignificantLoss.key) - 1]?.label : null;
  const mainInsight = mostSignificantLoss
    ? `El mayor abandono ocurre entre ${previousStageLabel} y ${mostSignificantLoss.label}: ${Math.abs(mostSignificantLoss.lossFromPrevious)} sesiones perdidas.`
    : 'No se detecta una pérdida dominante en el embudo.';
  const mainInsightDetail = mostSignificantLoss
    ? `Esto equivale a ${formatPercentValue(100 - mostSignificantLoss.percentOfPrevious)} de las sesiones previas.`
    : '';

  const reviewLines = [];
  if (mostSignificantLoss) {
    const previousLabel = mostSignificantLoss.label === 'WhatsApp Click'
      ? funnelStages[funnelStages.findIndex((item) => item.key === mostSignificantLoss.key) - 1]?.label
      : funnelStages[funnelStages.findIndex((item) => item.key === mostSignificantLoss.key) - 1]?.label;
    reviewLines.push(`El mayor problema aparece entre ${previousLabel} y ${mostSignificantLoss.label}, con ${Math.abs(mostSignificantLoss.lossFromPrevious)} sesiones perdidas.`);
  }
  if (totalCtaReachedWithoutExposure > 0) {
    reviewLines.push(`Hay ${totalCtaReachedWithoutExposure} sesiones con CTA visible pero sin datos de exposure, lo que reduce la certeza sobre el comportamiento del CTA.`);
  }
  reviewLines.push(`Confianza de la muestra: ${confidenceLevel}.`);

  const diagnosisLines = [
    mostSignificantLoss ? `El mayor descenso se observa entre ${mostSignificantLoss.label} y ${mostSignificantLoss.label === 'WhatsApp Click' ? 'WhatsApp Click' : 'la siguiente etapa'}, con ${Math.abs(mostSignificantLoss.lossFromPrevious)} sesiones perdidas y una caída relativa del ${formatPercentValue(100 - mostSignificantLoss.percentOfPrevious)}.` : null,
    totalButtonExposureUnknown > 0 ? `Hay ${totalButtonExposureUnknown} sesiones con CTA visible pero sin datos de exposure histórico; esto reduce la precisión del análisis de la exposición.` : null,
    whatsappWithoutReady > 0 ? `Hay ${whatsappWithoutReady} sesiones con WhatsApp Click sin Landing registrada, lo que sugiere que algunas conversiones ocurren fuera del flujo completo.` : null,
    whatsappWithoutReached > 0 ? `Hay ${whatsappWithoutReached} sesiones con WhatsApp Click sin CTA visible registrada, lo que indica posibles desviaciones en el recorrido del usuario.` : null,
    ...deviceDiagnosis
  ].filter(Boolean);

  const performanceMetrics = ['fcp', 'lcp', 'cls', 'ttfb', 'buttonReadyMs'].map((key) => {
    const metric = metricByKey(key);
    return `
      <tr>
        <td>${metric.label}</td>
        <td>${formatMeanMedian(metric.values.all.mean, metric.values.all.median, metric.unit)}</td>
        <td>${formatMeanMedian(metric.values.clicked.mean, metric.values.clicked.median, metric.unit)}</td>
        <td>${formatMeanMedian(metric.values.notClicked.mean, metric.values.notClicked.median, metric.unit)}</td>
      </tr>
    `;
  }).join('');

  const behaviorHeroRate = formatPercentValue(sessions.filter((item) => item.heroVisible).length / totalSessions * 100);
  const behaviorMaxScroll = formatPercentValue(mean(sessions.map((item) => item.maxScrollPercent).filter((value) => typeof value === 'number')));

  return `
    <section id="advanced-summary">
      <section class="analytics-card analytics-card--wide advanced-summary-section advanced-summary-top">
        <div class="advanced-summary-section__header">
          <h3>Resumen Ejecutivo</h3>
          <p class="advanced-summary-section__subtitle">Los principales hallazgos de la sesión para responder rápido dónde se pierde tráfico y qué investigar.</p>
        </div>
        <div class="advanced-summary-intro">
          <div class="advanced-summary-insight">
            <span class="advanced-summary-insight__label">Insight principal</span>
            <p class="advanced-summary-insight__heading">${mainInsight}</p>
            <p class="advanced-summary-insight__detail">${mainInsightDetail}</p>
          </div>
          <div class="advanced-summary-kpi-grid">
            <div class="advanced-summary-kpi-card">
              <span class="advanced-summary-kpi-card__label">Sesiones analizadas</span>
              <span class="advanced-summary-kpi-card__value">${totalSessions}</span>
            </div>
            <div class="advanced-summary-kpi-card">
              <span class="advanced-summary-kpi-card__label">Llegó al CTA</span>
              <span class="advanced-summary-kpi-card__value">${percentReached}</span>
            </div>
            <div class="advanced-summary-kpi-card">
              <span class="advanced-summary-kpi-card__label">Vio el CTA</span>
              <span class="advanced-summary-kpi-card__value">${percentExposed}</span>
            </div>
            <div class="advanced-summary-kpi-card">
              <span class="advanced-summary-kpi-card__label">WhatsApp Click</span>
              <span class="advanced-summary-kpi-card__value">${percentWhatsappClick}</span>
            </div>
          </div>
        </div>
        <div class="advanced-summary-review">
          <h4>Qué investigar primero</h4>
          <ul>
            ${reviewLines.map((line) => `<li>${line}</li>`).join('')}
          </ul>
        </div>
      </section>

      <section id="advanced-funnel" class="analytics-card analytics-card--wide advanced-summary-section">
        <div class="advanced-summary-section__header">
          <h3>Embudo de conversión</h3>
          <p class="advanced-summary-section__subtitle">Las etapas clave y la pérdida relativa entre ellas.</p>
        </div>
        <div class="advanced-stage-grid">
          ${stageCards}
        </div>
        <div class="advanced-summary-funnel-summary">
          ${lossSummaryText ? `<p>${lossSummaryText}</p>` : ''}
          ${sampleWarning ? `<p class="analytics-sample-warning">${sampleWarning}</p>` : ''}
        </div>
      </section>

      <section id="advanced-context" class="analytics-card analytics-card--wide advanced-summary-section">
        <div class="advanced-summary-section__header">
          <h3>Contexto y confianza</h3>
          <p class="advanced-summary-section__subtitle">Resumen de la exposición, la instrumentación y los segmentos más relevantes.</p>
        </div>
        <div class="advanced-summary-card-grid">
          <div class="advanced-summary-card">
            <span class="advanced-summary-card__label">Exposición insuficiente</span>
            <span class="advanced-summary-card__value">${exposureProblemSessions} sesiones</span>
            <span class="advanced-summary-card__meta">${exposureIssueText}</span>
            <span class="advanced-summary-card__meta">Base: solo sesiones con CTA visible.</span>
          </div>
          <div class="advanced-summary-card">
            <span class="advanced-summary-card__label">Instrumentación</span>
            <span class="advanced-summary-card__value">${sampleQualityText}</span>
            <span class="advanced-summary-card__meta">${totalHistoricalSessions} sesiones históricas</span>
          </div>
          <div class="advanced-summary-card">
            <span class="advanced-summary-card__label">Top dispositivo</span>
            <span class="advanced-summary-card__value">${deviceSummary.all}</span>
            <span class="advanced-summary-card__meta">WhatsApp: ${deviceSummary.clicked}</span>
          </div>
          <div class="advanced-summary-card">
            <span class="advanced-summary-card__label">Top canal</span>
            <span class="advanced-summary-card__value">${sourceSummary.all}</span>
            <span class="advanced-summary-card__meta">WhatsApp: ${sourceSummary.clicked}</span>
          </div>
          <div class="advanced-summary-card">
            <span class="advanced-summary-card__label">Top conexión</span>
            <span class="advanced-summary-card__value">${connectionSummary.all}</span>
            <span class="advanced-summary-card__meta">WhatsApp: ${connectionSummary.clicked}</span>
          </div>
          <div class="advanced-summary-card advanced-summary-card--wide">
            <span class="advanced-summary-card__label">Soporte de datos</span>
            <span class="advanced-summary-card__value">${sampleQualityText}</span>
            <span class="advanced-summary-card__meta">${dataSupportLines.join(' • ') || 'Solo datos de embudo disponibles.'}</span>
          </div>
        </div>
      </section>

      <section id="advanced-diagnostics" class="analytics-card analytics-card--wide advanced-summary-section">
        <div class="advanced-summary-section__header">
          <h3>Diagnóstico</h3>
          <p class="advanced-summary-section__subtitle">Interpretación de los hallazgos y su impacto en la fiabilidad del análisis.</p>
        </div>
        <div class="analytics-diagnosis">
          ${diagnosisLines.length ? `<ul>${diagnosisLines.map((line) => `<li>${line}</li>`).join('')}</ul>` : '<p>No hay observaciones relevantes en este rango.</p>'}
        </div>
      </section>
    </section>
  `;
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

export { buildAdvancedSummaryReport };

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
