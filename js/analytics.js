import { db } from './firebase.js';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';
import { createAnalyticsRange } from './analytics-range.mjs';
import { getStoredSession } from './auth.js';
import { calculateCampaignCalculatorMetrics } from './analytics-calculator.mjs';
import { buildAdvancedSummaryCards, buildAdvancedSummaryReport } from './analytics-advanced-summary.mjs?v=7';

let rangeSelect = null;
let detailSelect = null;
let metricCheckboxes = null;
let chartLegend = null;
let startInput = null;
let endInput = null;
let refreshButton = null;
let messageElement = null;
let breakdownElement = null;
let breakdownTitle = null;
let chartCanvas = null;
let chartContext = null;
let summaryToggle;
let summaryBody;
let advancedSummaryToggle;
let advancedSummaryBody;
let visualizationToggle;
let visualizationBody;
let visualizationChildren = null;
let linksToggle;
let chartToggle;
let chartSection;
let tableToggle;
let tableSection;
let altDetailToggle = null;
let altDetailExpanded = false;
let selectedLinkDetailMetrics = [];
let calculatorCostInput = null;
let calculatorCampaignsSelect = null;
let calculatorVisitsInput = null;
let calculatorWhatsappInput = null;
let calculatorArrivedInput = null;
let calculatorArrivedNewInput = null;
let calculatorArrivedRepeatInput = null;
let calculatorArrivedNoresponseInput = null;
let calculatorDerivedInput = null;
let calculatorPeriodCostValue = null;
let calculatorArrivedRateValue = null;
let calculatorArrivedNewRateValue = null;
let calculatorArrivedRepeatRateValue = null;
let calculatorArrivedNoresponseRateValue = null;
let calculatorDerivedRateValue = null;
let calculatorCostArrivedValue = null;
let calculatorCostDerivedValue = null;
let calculatorCostWhatsappValue = null;
let calculatorVisitsRateValue = null;
let calculatorContext = { uniqueVisits: 0, uniqueWhatsapp: 0, rangeStart: new Date(), rangeEnd: new Date() };
let calculatorToggle = null;
let calculatorBody = null;
let calculatorMonetaryToggle = null;
let calculatorMonetaryBody = null;
let calculatorPercentToggle = null;
let calculatorPercentBody = null;
let analyticsTargets = { 
  visitsToWhatsapp: 50,
  arrived: 50,
  derived: 50,
  arrivedNewPercent: 33,
  arrivedRepeatPercent: 33,
  arrivedNoresponsePercent: 34,
  costPerWhatsapp: 0.5,
  costPerArrived: 2,
  costPerDerived: 5
};
let arrivedManualMode = null; // 'total', 'components', or null

function getDefaultAnalyticsTargets() {
  return { 
    visitsToWhatsapp: 50,
    arrived: 50,
    derived: 50,
    arrivedNewPercent: 33,
    arrivedRepeatPercent: 33,
    arrivedNoresponsePercent: 34,
    costPerWhatsapp: 0.5,
    costPerArrived: 2,
    costPerDerived: 5
  };
}

function getAnalyticsTargetValue(key) {
  const fallback = getDefaultAnalyticsTargets()[key];
  const value = Number(analyticsTargets?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeCalculatorInputValue(value) {
  const raw = String(value ?? '').replace(/,/g, '.').trim();
  if (!raw) return '';
  const normalized = raw.replace(/^0+(?=\d)/, '');
  if (!normalized || normalized === '.') return '';
  return normalized;
}

function getPerformanceColor(value, idealValue, mode = 'higher') {
  const ideal = Number(idealValue);
  const actual = Number(value);
  if (!Number.isFinite(ideal) || ideal <= 0) {
    return '#ffffff';
  }
  if (!Number.isFinite(actual)) {
    return '#f87171';
  }

  const isGoodDirection = mode === 'lower'
    ? actual <= ideal
    : actual >= ideal;

  if (isGoodDirection) {
    return 'hsl(120, 78%, 50%)';
  }

  const deviation = Math.abs(actual - ideal) / Math.max(Math.abs(ideal), 1);
  const normalizedDeviation = Math.max(0, Math.min(1, deviation / 0.5));
  const hue = Math.round(120 * (1 - normalizedDeviation));
  return `hsl(${hue}, 78%, 50%)`;
}

async function loadAnalyticsTargets() {
  try {
    const session = getStoredSession();
    const tenantId = session?.tenantId || 'futurevip';
    const snapshot = await getDoc(doc(db, 'tenants', tenantId));
    const raw = snapshot.exists() ? (snapshot.data() || {}) : {};
    const cfg = raw?.config || raw;
    const targets = cfg.analyticsTargets && typeof cfg.analyticsTargets === 'object' ? cfg.analyticsTargets : {};
    analyticsTargets = { ...getDefaultAnalyticsTargets(), ...targets };
  } catch (error) {
    console.warn('[analytics] No se pudieron cargar los objetivos de analíticas', error);
    analyticsTargets = { ...getDefaultAnalyticsTargets() };
  }
  return analyticsTargets;
}

function initializeElements() {
  rangeSelect = document.getElementById('analytics-range-select');
  detailSelect = document.getElementById('analytics-detail-select');
  metricCheckboxes = document.getElementById('analytics-metric-checkboxes');
  chartLegend = document.getElementById('analytics-legend');
  startInput = document.getElementById('analytics-start');
  endInput = document.getElementById('analytics-end');
  refreshButton = document.getElementById('analytics-refresh');
  messageElement = document.getElementById('analytics-message');
  breakdownElement = document.getElementById('analytics-breakdown');
  breakdownTitle = document.getElementById('analytics-breakdown-title');
  chartCanvas = document.getElementById('analytics-chart');
  chartContext = chartCanvas ? chartCanvas.getContext('2d') : null;
  altDetailToggle = document.getElementById('analytics-alt-detail-toggle');
  calculatorCostInput = document.getElementById('analytics-calculator-cost');
  calculatorCampaignsSelect = document.getElementById('analytics-calculator-campaigns');
  calculatorVisitsInput = document.getElementById('analytics-calculator-visits');
  calculatorWhatsappInput = document.getElementById('analytics-calculator-whatsapp');
  calculatorArrivedInput = document.getElementById('analytics-calculator-arrived');
  calculatorArrivedNewInput = document.getElementById('analytics-calculator-arrived-new');
  calculatorArrivedRepeatInput = document.getElementById('analytics-calculator-arrived-repeat');
  calculatorArrivedNoresponseInput = document.getElementById('analytics-calculator-arrived-noresponse');
  calculatorDerivedInput = document.getElementById('analytics-calculator-derived');
  calculatorToggle = document.getElementById('calculator-toggle');
  calculatorBody = document.getElementById('calculator-body');
  calculatorMonetaryToggle = document.getElementById('calculator-monetary-toggle');
  calculatorMonetaryBody = document.getElementById('calculator-monetary-body');
  calculatorPercentToggle = document.getElementById('calculator-percent-toggle');
  calculatorPercentBody = document.getElementById('calculator-percent-body');
  calculatorPeriodCostValue = document.getElementById('analytics-calculator-period-cost');
  calculatorArrivedRateValue = document.getElementById('analytics-calculator-arrived-rate');
  calculatorArrivedNewRateValue = document.getElementById('analytics-calculator-arrived-new-rate');
  calculatorArrivedRepeatRateValue = document.getElementById('analytics-calculator-arrived-repeat-rate');
  calculatorArrivedNoresponseRateValue = document.getElementById('analytics-calculator-arrived-noresponse-rate');
  calculatorDerivedRateValue = document.getElementById('analytics-calculator-derived-rate');
  calculatorCostArrivedValue = document.getElementById('analytics-calculator-cost-arrived');
  calculatorCostDerivedValue = document.getElementById('analytics-calculator-cost-derived');
  calculatorCostWhatsappValue = document.getElementById('analytics-calculator-cost-whatsapp');
  calculatorVisitsRateValue = document.getElementById('analytics-calculator-visits-rate');
  
  // Inicializar estado de campos de llegados
  updateArrivedFieldsState();
}

const DETAIL_LABELS = {
  hour: 'Gráfico Comparativo',
  shift: 'Detalle por turno',
  day: 'Detalle por día',
  week: 'Detalle por semana',
  month: 'Detalle por mes'
};

const ANALYTICS_TOTALS_TEMPLATE = {
  uniqueVisitors: 0,
  totalVisits: 0,
  primaryLinks: 0,
  primaryVisits: 0,
  primaryWhatsappClicks: 0,
  primaryWhatsappClicksTotal: 0,
  alt1Links: 0,
  alt2Links: 0,
  alt3Links: 0,
  alt4Links: 0,
  alt5Links: 0,
  alt1Visits: 0,
  alt2Visits: 0,
  alt3Visits: 0,
  alt4Visits: 0,
  alt5Visits: 0,
  alt1WhatsappClicks: 0,
  alt2WhatsappClicks: 0,
  alt3WhatsappClicks: 0,
  alt4WhatsappClicks: 0,
  alt5WhatsappClicks: 0,
  alt1WhatsappClicksTotal: 0,
  alt2WhatsappClicksTotal: 0,
  alt3WhatsappClicksTotal: 0,
  alt4WhatsappClicksTotal: 0,
  alt5WhatsappClicksTotal: 0,
  whatsappClicks: 0,
  whatsappClicksTotal: 0
};

const ANALYTICS_BUCKET_TEMPLATE = {
  uniqueVisitors: 0,
  totalVisits: 0,
  primaryLinks: 0,
  primaryVisits: 0,
  primaryWhatsappClicks: 0,
  primaryWhatsappClicksTotal: 0,
  alt1Links: 0,
  alt2Links: 0,
  alt3Links: 0,
  alt4Links: 0,
  alt5Links: 0,
  alt1Visits: 0,
  alt2Visits: 0,
  alt3Visits: 0,
  alt4Visits: 0,
  alt5Visits: 0,
  alt1WhatsappClicks: 0,
  alt2WhatsappClicks: 0,
  alt3WhatsappClicks: 0,
  alt4WhatsappClicks: 0,
  alt5WhatsappClicks: 0,
  alt1WhatsappClicksTotal: 0,
  alt2WhatsappClicksTotal: 0,
  alt3WhatsappClicksTotal: 0,
  alt4WhatsappClicksTotal: 0,
  alt5WhatsappClicksTotal: 0,
  whatsappClicks: 0,
  whatsappClicksTotal: 0
};

function createEmptyAnalyticsDocument() {
  return {
    totals: { ...ANALYTICS_TOTALS_TEMPLATE },
    visitors: {},
    buckets: {},
    legacyPayload: {}
  };
}

function normalizeAnalyticsDocument(data) {
  const source = data && typeof data === 'object' ? data : {};
  const normalized = {
    ...source,
    totals: { ...ANALYTICS_TOTALS_TEMPLATE },
    visitors: source.visitors && typeof source.visitors === 'object' ? source.visitors : {},
    buckets: source.buckets && typeof source.buckets === 'object' ? source.buckets : {},
    legacyPayload: source.legacyPayload && typeof source.legacyPayload === 'object' ? source.legacyPayload : {}
  };

  if (source.totals && typeof source.totals === 'object') {
    Object.keys(ANALYTICS_TOTALS_TEMPLATE).forEach((key) => {
      if (source.totals[key] != null) {
        normalized.totals[key] = source.totals[key];
      }
    });
  }

  Object.keys(normalized.buckets).forEach((dateKey) => {
    const dayBuckets = normalized.buckets[dateKey];
    if (!dayBuckets || typeof dayBuckets !== 'object') {
      return;
    }

    Object.keys(dayBuckets).forEach((hourKey) => {
      const bucket = dayBuckets[hourKey];
      if (!bucket || typeof bucket !== 'object') {
        return;
      }

      const normalizedBucket = { ...ANALYTICS_BUCKET_TEMPLATE };
      Object.keys(ANALYTICS_BUCKET_TEMPLATE).forEach((key) => {
        if (bucket[key] != null) {
          normalizedBucket[key] = bucket[key];
        }
      });
      dayBuckets[hourKey] = normalizedBucket;
    });
  });

  return normalized;
}

function toLocalDateTimeString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getMetricColor(metricKey, fallbackIndex = 0) {
  return METRIC_COLOR_MAP[metricKey] || METRIC_COLORS[fallbackIndex % METRIC_COLORS.length];
}

function setActiveMetricPreset(presetKey) {
  const buttons = Array.from(document.querySelectorAll('.analytics-metric-preset-button'));
  buttons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.preset === presetKey);
  });
}

function applyMetricPreset(presetKey) {
  if (!metricCheckboxes) return;

  const presets = {
    summary: ['uniqueVisitors', 'totalVisits', 'whatsappClicks'],
    visits: [
      'uniqueVisitors',
      'totalVisits',
      'primaryLinks',
      'primaryVisits',
      'alt1Links',
      'alt1Visits',
      'alt2Links',
      'alt2Visits',
      'alt3Links',
      'alt3Visits',
      'alt4Links',
      'alt4Visits',
      'alt5Links',
      'alt5Visits'
    ],
    whatsapp: [
      'whatsappClicks',
      'whatsappClicksTotal',
      'primaryWhatsappClicks',
      'primaryWhatsappClicksTotal',
      'alt1WhatsappClicks',
      'alt1WhatsappClicksTotal',
      'alt2WhatsappClicks',
      'alt2WhatsappClicksTotal',
      'alt3WhatsappClicks',
      'alt3WhatsappClicksTotal',
      'alt4WhatsappClicks',
      'alt4WhatsappClicksTotal',
      'alt5WhatsappClicks',
      'alt5WhatsappClicksTotal'
    ],
    all: [
      'uniqueVisitors',
      'totalVisits',
      'primaryLinks',
      'primaryVisits',
      'primaryWhatsappClicks',
      'primaryWhatsappClicksTotal',
      'alt1Links',
      'alt1Visits',
      'alt1WhatsappClicks',
      'alt1WhatsappClicksTotal',
      'alt2Links',
      'alt2Visits',
      'alt2WhatsappClicks',
      'alt2WhatsappClicksTotal',
      'alt3Links',
      'alt3Visits',
      'alt3WhatsappClicks',
      'alt3WhatsappClicksTotal',
      'alt4Links',
      'alt4Visits',
      'alt4WhatsappClicks',
      'alt4WhatsappClicksTotal',
      'alt5Links',
      'alt5Visits',
      'alt5WhatsappClicks',
      'alt5WhatsappClicksTotal',
      'whatsappClicks',
      'whatsappClicksTotal'
    ]
  };

  const selection = presets[presetKey] || presets.summary;
  const inputs = Array.from(metricCheckboxes.querySelectorAll('input[type="checkbox"]'));
  inputs.forEach((input) => {
    input.checked = selection.includes(input.value);
  });

  setActiveMetricPreset(presetKey);
  syncMetricCheckboxStyles();
  updateSelectedLinkDetailMetrics();
  syncAlternativeMetricVisibility();
  loadAnalytics().catch((error) => console.warn('Error applying metric preset:', error));
}

function syncMetricCheckboxStyles() {
  if (!metricCheckboxes) return;
  const inputs = Array.from(metricCheckboxes.querySelectorAll('input[type="checkbox"]'));
  inputs.forEach((input, idx) => {
    const label = input.closest('label');
    if (!label) return;
    if (input.checked) {
      label.classList.add('selected');
    } else {
      label.classList.remove('selected');
    }
    const metricKey = input.value;
    const chipColor = getMetricColor(metricKey, idx);
    label.style.setProperty('--chip-color', chipColor);
  });
}

function syncAlternativeMetricVisibility() {
  if (!metricCheckboxes) return;
  const detailLabels = metricCheckboxes.querySelectorAll('[data-link-metric-detail]');
  detailLabels.forEach((label) => {
    const shouldShow = altDetailExpanded;
    label.hidden = !shouldShow;
    label.classList.toggle('collapsed', !shouldShow);
  });
  if (altDetailToggle) {
    altDetailToggle.textContent = altDetailExpanded
      ? 'Ocultar detalle de links'
      : 'Detalle de links';
    altDetailToggle.setAttribute('aria-expanded', String(altDetailExpanded));
  }
}

function updateSelectedLinkDetailMetrics() {
  if (!metricCheckboxes) {
    selectedLinkDetailMetrics = [];
    return;
  }

  const linkMetrics = [
    'primaryLinks',
    'primaryVisits',
    'primaryWhatsappClicks',
    'primaryWhatsappClicksTotal',
    'alt1Links',
    'alt1Visits',
    'alt1WhatsappClicks',
    'alt1WhatsappClicksTotal',
    'alt2Links',
    'alt2Visits',
    'alt2WhatsappClicks',
    'alt2WhatsappClicksTotal',
    'alt3Links',
    'alt3Visits',
    'alt3WhatsappClicks',
    'alt3WhatsappClicksTotal',
    'alt4Links',
    'alt4Visits',
    'alt4WhatsappClicks',
    'alt4WhatsappClicksTotal',
    'alt5Links',
    'alt5Visits',
    'alt5WhatsappClicks',
    'alt5WhatsappClicksTotal'
  ];

  selectedLinkDetailMetrics = Array.from(metricCheckboxes.querySelectorAll('input[type="checkbox"]:checked'))
    .map((input) => input.value)
    .filter((metricKey) => linkMetrics.includes(metricKey));
}

function formatDateTime(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return value;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} (${hours}:${minutes}hs)`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0
  }).format(Math.round(value || 0));
}

function setArrivedManualMode(mode) {
  arrivedManualMode = mode;
  updateArrivedFieldsState();
}

function updateArrivedFieldsState() {
  const componentsLocked = arrivedManualMode === 'total';
  const totalLocked = arrivedManualMode === 'components';

  [calculatorArrivedNewInput, calculatorArrivedRepeatInput, calculatorArrivedNoresponseInput].forEach((input) => {
    if (input) {
      if (componentsLocked) {
        input.disabled = true;
        input.classList.add('analytics-calculator__field-disabled');
        input.parentElement?.classList.add('analytics-calculator__field--disabled');
      } else {
        input.disabled = false;
        input.classList.remove('analytics-calculator__field-disabled');
        input.parentElement?.classList.remove('analytics-calculator__field--disabled');
      }
    }
  });

  if (calculatorArrivedInput) {
    if (totalLocked) {
      calculatorArrivedInput.disabled = true;
      calculatorArrivedInput.classList.add('analytics-calculator__field-disabled');
      calculatorArrivedInput.parentElement?.classList.add('analytics-calculator__field--disabled');
    } else {
      calculatorArrivedInput.disabled = false;
      calculatorArrivedInput.classList.remove('analytics-calculator__field-disabled');
      calculatorArrivedInput.parentElement?.classList.remove('analytics-calculator__field--disabled');
    }
  }
}

function getCalculatorValues() {
  const dailyCost = Number.parseFloat(calculatorCostInput?.value || '0') || 0;
  const campaignCount = Number.parseInt(calculatorCampaignsSelect?.value || '1', 10) || 1;
  
  let arrivedNew = Number.parseFloat(calculatorArrivedNewInput?.value || '0') || 0;
  let arrivedRepeat = Number.parseFloat(calculatorArrivedRepeatInput?.value || '0') || 0;
  let arrivedNoresponse = Number.parseFloat(calculatorArrivedNoresponseInput?.value || '0') || 0;
  let arrived = arrivedNew + arrivedRepeat + arrivedNoresponse;
  
  const derived = Number.parseFloat(calculatorDerivedInput?.value || '0') || 0;
  
  // Si está en modo manual de total, usar el valor del total directamente
  if (arrivedManualMode === 'total' && calculatorArrivedInput) {
    const manualTotal = Number.parseFloat(calculatorArrivedInput.value || '0') || 0;
    arrived = manualTotal;
  } else if (calculatorArrivedInput) {
    // Si está en modo componentes (o null), actualizar el total automáticamente
    calculatorArrivedInput.value = formatNumber(arrived);
  }
  
  return { dailyCost, campaignCount, arrivedNew, arrivedRepeat, arrivedNoresponse, arrived, derived };
}

function applyCalculatorRateColor(element, value, targetKey, mode = 'higher') {
  if (!element) return;
  const targetValue = getAnalyticsTargetValue(targetKey);
  element.style.color = getPerformanceColor(value, targetValue, mode);
}

function parseSummaryNumber(element) {
  if (!element) {
    return 0;
  }

  const rawText = `${element.textContent || ''} ${element.innerText || ''}`;
  const match = rawText.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) {
    return 0;
  }

  const normalized = match[0].replace('.', '').replace(',', '.');
  return Number.parseFloat(normalized) || 0;
}

function syncCalculatorContext(nextValues = {}) {
  calculatorContext = {
    uniqueVisits: nextValues.uniqueVisits ?? calculatorContext.uniqueVisits ?? 0,
    uniqueWhatsapp: nextValues.uniqueWhatsapp ?? calculatorContext.uniqueWhatsapp ?? 0,
    rangeStart: nextValues.rangeStart ?? calculatorContext.rangeStart ?? new Date(),
    rangeEnd: nextValues.rangeEnd ?? calculatorContext.rangeEnd ?? new Date()
  };
  // Reset modo manual cuando cambia el rango o datos
  setArrivedManualMode(null);
  renderCalculatorMetrics();
}

function getActiveRange() {
  if (rangeSelect && rangeSelect.value !== 'custom') {
    return createRange(rangeSelect.value);
  }

  if (startInput && endInput) {
    return parseRangeInputs();
  }

  return createRange('today');
}

function renderCalculatorMetrics() {
  const { uniqueVisits, uniqueWhatsapp, rangeStart, rangeEnd } = calculatorContext;
  const { dailyCost, campaignCount, arrivedNew, arrivedRepeat, arrivedNoresponse, arrived, derived } = getCalculatorValues();
  const metrics = calculateCampaignCalculatorMetrics({
    dailyCost: dailyCost * campaignCount,
    uniqueVisits,
    uniqueWhatsapp,
    arrived,
    derived,
    rangeStart,
    rangeEnd
  });

  if (calculatorVisitsInput) {
    calculatorVisitsInput.value = formatNumber(metrics.visits);
  }
  if (calculatorWhatsappInput) {
    calculatorWhatsappInput.value = formatNumber(metrics.whatsapp);
  }
  if (calculatorPeriodCostValue) {
    calculatorPeriodCostValue.textContent = formatCurrency(metrics.periodCost);
  }
  if (calculatorVisitsRateValue) {
    const visitsToWhatsappRate = metrics.visits > 0 ? (metrics.whatsapp / metrics.visits) * 100 : 0;
    calculatorVisitsRateValue.textContent = `↓ ${visitsToWhatsappRate.toFixed(2)}%`;
    applyCalculatorRateColor(calculatorVisitsRateValue, visitsToWhatsappRate, 'visitsToWhatsapp', 'higher');
  }
  if (calculatorArrivedRateValue) {
    calculatorArrivedRateValue.textContent = `↓ ${metrics.arrivedRatePercent.toFixed(2)}%`;
    applyCalculatorRateColor(calculatorArrivedRateValue, metrics.arrivedRatePercent, 'arrived', 'higher');
  }
  if (calculatorArrivedNewRateValue) {
    const arrivedNewRate = arrived > 0 ? (arrivedNew / arrived) * 100 : 0;
    calculatorArrivedNewRateValue.textContent = `↓ ${arrivedNewRate.toFixed(2)}%`;
    applyCalculatorRateColor(calculatorArrivedNewRateValue, arrivedNewRate, 'arrivedNewPercent', 'higher');
  }
  if (calculatorArrivedRepeatRateValue) {
    const arrivedRepeatRate = arrived > 0 ? (arrivedRepeat / arrived) * 100 : 0;
    calculatorArrivedRepeatRateValue.textContent = `↓ ${arrivedRepeatRate.toFixed(2)}%`;
    applyCalculatorRateColor(calculatorArrivedRepeatRateValue, arrivedRepeatRate, 'arrivedRepeatPercent', 'lower');
  }
  if (calculatorArrivedNoresponseRateValue) {
    const arrivedNoresponseRate = arrived > 0 ? (arrivedNoresponse / arrived) * 100 : 0;
    calculatorArrivedNoresponseRateValue.textContent = `↓ ${arrivedNoresponseRate.toFixed(2)}%`;
    applyCalculatorRateColor(calculatorArrivedNoresponseRateValue, arrivedNoresponseRate, 'arrivedNoresponsePercent', 'lower');
  }
  if (calculatorDerivedRateValue) {
    calculatorDerivedRateValue.textContent = `↓ ${metrics.derivedRatePercent.toFixed(2)}%`;
    applyCalculatorRateColor(calculatorDerivedRateValue, metrics.derivedRatePercent, 'derived', 'higher');
  }
  if (calculatorCostArrivedValue) {
    calculatorCostArrivedValue.textContent = formatCurrency(metrics.costPerArrived);
    applyCalculatorRateColor(calculatorCostArrivedValue, metrics.costPerArrived, 'costPerArrived', 'lower');
  }
  if (calculatorCostDerivedValue) {
    calculatorCostDerivedValue.textContent = formatCurrency(metrics.costPerDerived);
    applyCalculatorRateColor(calculatorCostDerivedValue, metrics.costPerDerived, 'costPerDerived', 'lower');
  }
  if (calculatorCostWhatsappValue) {
    const costPerWhatsapp = metrics.whatsapp > 0 ? metrics.periodCost / metrics.whatsapp : 0;
    calculatorCostWhatsappValue.textContent = formatCurrency(costPerWhatsapp);
    applyCalculatorRateColor(calculatorCostWhatsappValue, costPerWhatsapp, 'costPerWhatsapp', 'lower');
  }
}

function createRange(preset) {
  return createAnalyticsRange(preset, new Date());
}

function setInputsForRange(preset) {
  const range = createRange(preset);
  if (startInput) startInput.value = toLocalDateTimeString(range.start);
  if (endInput) endInput.value = toLocalDateTimeString(range.end);
  if (messageElement) messageElement.textContent = `Mostrando datos para: ${range.label}`;
}

function updateDateInputsState() {
  const isCustom = rangeSelect && rangeSelect.value === 'custom';

  if (startInput) {
    startInput.disabled = !isCustom;
    startInput.setAttribute('aria-disabled', String(!isCustom));
  }
  if (endInput) {
    endInput.disabled = !isCustom;
    endInput.setAttribute('aria-disabled', String(!isCustom));
  }
}

function parseRangeInputs() {
  const start = new Date(startInput.value);
  const end = new Date(endInput.value);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    throw new Error('Rango de fecha/hora inválido');
  }
  return { start, end };
}

function collectBuckets(buckets, rangeStart, rangeEnd) {
  const items = [];
  const totals = {
    uniqueVisitors: 0,
    totalVisits: 0,
    primaryLinks: 0,
    primaryVisits: 0,
    primaryWhatsappClicks: 0,
    primaryWhatsappClicksTotal: 0,
    alt1Links: 0,
    alt2Links: 0,
    alt3Links: 0,
    alt4Links: 0,
    alt5Links: 0,
    alt1Visits: 0,
    alt2Visits: 0,
    alt3Visits: 0,
    alt4Visits: 0,
    alt5Visits: 0,
    alt1WhatsappClicks: 0,
    alt2WhatsappClicks: 0,
    alt3WhatsappClicks: 0,
    alt4WhatsappClicks: 0,
    alt5WhatsappClicks: 0,
    alt1WhatsappClicksTotal: 0,
    alt2WhatsappClicksTotal: 0,
    alt3WhatsappClicksTotal: 0,
    alt4WhatsappClicksTotal: 0,
    alt5WhatsappClicksTotal: 0,
    whatsappClicks: 0,
    whatsappClicksTotal: 0
  };

  for (const dateKey of Object.keys(buckets)) {
    const dayBuckets = buckets[dateKey] || {};
    for (const hourKey of Object.keys(dayBuckets)) {
      const bucket = dayBuckets[hourKey];
      const bucketStart = new Date(`${dateKey}T${hourKey}:00:00`);
      const bucketEnd = new Date(bucketStart.getTime() + 3599999);
      if (bucketEnd < rangeStart || bucketStart > rangeEnd) {
        continue;
      }
      const [year, month, day] = dateKey.split('-');
      const displayDate = `${day}/${month}`;
      const sourceAlt1Links = bucket.alt1Links || 0;
      const sourceAlt2Links = bucket.alt2Links || 0;
      const sourceAlt3Links = bucket.alt3Links || 0;
      const sourceAlt4Links = bucket.alt4Links || 0;
      const sourceAlt5Links = bucket.alt5Links || 0;
      const sourceAlt1Visits = bucket.alt1Visits || 0;
      const sourceAlt2Visits = bucket.alt2Visits || 0;
      const sourceAlt3Visits = bucket.alt3Visits || 0;
      const sourceAlt4Visits = bucket.alt4Visits || 0;
      const sourceAlt5Visits = bucket.alt5Visits || 0;

      totals.uniqueVisitors += bucket.uniqueVisitors || 0;
      totals.totalVisits += bucket.totalVisits || 0;
      totals.primaryLinks += bucket.primaryLinks || 0;
      totals.primaryVisits += bucket.primaryVisits || 0;
      totals.primaryWhatsappClicks += bucket.primaryWhatsappClicks || 0;
      totals.primaryWhatsappClicksTotal += bucket.primaryWhatsappClicksTotal || 0;
      totals.whatsappClicks += bucket.whatsappClicks || 0;
      totals.whatsappClicksTotal += bucket.whatsappClicksTotal || 0;
      totals.alt1Links += sourceAlt1Links;
      totals.alt2Links += sourceAlt2Links;
      totals.alt3Links += sourceAlt3Links;
      totals.alt4Links += sourceAlt4Links;
      totals.alt5Links += sourceAlt5Links;
      totals.alt1Visits += sourceAlt1Visits;
      totals.alt2Visits += sourceAlt2Visits;
      totals.alt3Visits += sourceAlt3Visits;
      totals.alt4Visits += sourceAlt4Visits;
      totals.alt5Visits += sourceAlt5Visits;
      totals.alt1WhatsappClicks += bucket.alt1WhatsappClicks || 0;
      totals.alt2WhatsappClicks += bucket.alt2WhatsappClicks || 0;
      totals.alt3WhatsappClicks += bucket.alt3WhatsappClicks || 0;
      totals.alt4WhatsappClicks += bucket.alt4WhatsappClicks || 0;
      totals.alt5WhatsappClicks += bucket.alt5WhatsappClicks || 0;
      totals.alt1WhatsappClicksTotal += bucket.alt1WhatsappClicksTotal || 0;
      totals.alt2WhatsappClicksTotal += bucket.alt2WhatsappClicksTotal || 0;
      totals.alt3WhatsappClicksTotal += bucket.alt3WhatsappClicksTotal || 0;
      totals.alt4WhatsappClicksTotal += bucket.alt4WhatsappClicksTotal || 0;
      totals.alt5WhatsappClicksTotal += bucket.alt5WhatsappClicksTotal || 0;
      items.push({
        label: `${displayDate} ${hourKey}:00`,
        dateKey,
        hourKey,
        ...bucket,
        alt1Links: sourceAlt1Links,
        alt2Links: sourceAlt2Links,
        alt3Links: sourceAlt3Links,
        alt4Links: sourceAlt4Links,
        alt5Links: sourceAlt5Links,
        alt1Visits: sourceAlt1Visits,
        alt2Visits: sourceAlt2Visits,
        alt3Visits: sourceAlt3Visits,
        alt4Visits: sourceAlt4Visits,
        alt5Visits: sourceAlt5Visits,
        alt1WhatsappClicks: bucket.alt1WhatsappClicks || 0,
        alt2WhatsappClicks: bucket.alt2WhatsappClicks || 0,
        alt3WhatsappClicks: bucket.alt3WhatsappClicks || 0,
        alt4WhatsappClicks: bucket.alt4WhatsappClicks || 0,
        alt5WhatsappClicks: bucket.alt5WhatsappClicks || 0,
        alt1WhatsappClicksTotal: bucket.alt1WhatsappClicksTotal || 0,
        alt2WhatsappClicksTotal: bucket.alt2WhatsappClicksTotal || 0,
        alt3WhatsappClicksTotal: bucket.alt3WhatsappClicksTotal || 0,
        alt4WhatsappClicksTotal: bucket.alt4WhatsappClicksTotal || 0,
        alt5WhatsappClicksTotal: bucket.alt5WhatsappClicksTotal || 0
      });
    }
  }

  items.sort((a, b) => a.label.localeCompare(b.label));
  return { totals, items };
}

function countUniqueVisitors(visitors, rangeStart, rangeEnd, bucketTotals = null) {
  if (bucketTotals && Number.isFinite(Number(bucketTotals.uniqueVisitors))) {
    return Number(bucketTotals.uniqueVisitors || 0);
  }

  return Object.values(visitors || {}).filter((visitor) => {
    const firstSeen = visitor.firstSeen ? new Date(visitor.firstSeen) : null;
    const lastSeen = visitor.lastSeen ? new Date(visitor.lastSeen) : null;
    if (!firstSeen || !lastSeen) {
      return false;
    }
    return firstSeen <= rangeEnd && lastSeen >= rangeStart;
  }).length;
}

function groupKey(item, mode) {
  const dateKey = item.dateKey || item.label.split(' ')[0];
  const hourPart = item.hourKey ? `${item.hourKey}:00` : item.label.split(' ')[1] || '00:00';
  const hour = Number(hourPart.split(':')[0]);
  const date = new Date(`${dateKey}T00:00:00`);
  const [year, month, day] = dateKey.split('-');
  const displayDay = `${day}/${month}`;
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  if (mode === 'hour') {
    return { key: `${dateKey} ${hourPart}`, label: item.label, sort: `${dateKey} ${hourPart}` };
  }

  if (mode === 'shift') {
    const shiftIndex = hour < 8 ? 0 : hour < 16 ? 1 : 2;
    const shiftLabel = shiftIndex === 0 ? 'Noche' : shiftIndex === 1 ? 'Mañana' : 'Tarde';
    const label = `${displayDay} ${shiftLabel}`;
    return { key: `${dateKey}-${shiftIndex}`, label, sort: `${dateKey}-${shiftIndex}` };
  }

  if (mode === 'day') {
    return { key: dateKey, label: displayDay, sort: dateKey };
  }

  if (mode === 'week') {
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    const weekDay = String(weekStart.getDate()).padStart(2, '0');
    const weekMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
    const weekLabel = `${weekDay}/${weekMonth}`;
    return { key: `week-${weekStart.toISOString().slice(0, 10)}`, label: `Semana ${weekLabel}`, sort: `week-${weekStart.toISOString().slice(0, 10)}` };
  }

  if (mode === 'month') {
    const monthIndex = Number(month) - 1;
    const monthShort = monthNames[monthIndex] || '';
    const yearShort = year.slice(-2);
    return { key: `${year}-${month}`, label: `${monthShort}/${yearShort}`, sort: `${year}-${month}` };
  }

  return { key: item.label, label: item.label, sort: item.label };
}

function aggregateItems(items, mode) {
  const grouped = {};

  items.forEach((item) => {
    const group = groupKey(item, mode);
    if (!grouped[group.key]) {
      grouped[group.key] = {
        label: group.label,
        uniqueVisitors: 0,
        totalVisits: 0,
        primaryLinks: 0,
        primaryVisits: 0,
        primaryWhatsappClicks: 0,
        primaryWhatsappClicksTotal: 0,
        alt1Links: 0,
        alt2Links: 0,
        alt3Links: 0,
        alt4Links: 0,
        alt5Links: 0,
        alt1Visits: 0,
        alt2Visits: 0,
        alt3Visits: 0,
        alt4Visits: 0,
        alt5Visits: 0,
        alt1WhatsappClicks: 0,
        alt2WhatsappClicks: 0,
        alt3WhatsappClicks: 0,
        alt4WhatsappClicks: 0,
        alt5WhatsappClicks: 0,
        alt1WhatsappClicksTotal: 0,
        alt2WhatsappClicksTotal: 0,
        alt3WhatsappClicksTotal: 0,
        alt4WhatsappClicksTotal: 0,
        alt5WhatsappClicksTotal: 0,
        whatsappClicks: 0,
        whatsappClicksTotal: 0,
        sort: group.sort
      };
    }

    grouped[group.key].uniqueVisitors += item.uniqueVisitors || 0;
    grouped[group.key].totalVisits += item.totalVisits || 0;
    grouped[group.key].primaryLinks += item.primaryLinks || 0;
    grouped[group.key].primaryVisits += item.primaryVisits || 0;
    grouped[group.key].primaryWhatsappClicks += item.primaryWhatsappClicks || 0;
    grouped[group.key].primaryWhatsappClicksTotal += item.primaryWhatsappClicksTotal || 0;
    grouped[group.key].alt1Links += item.alt1Links || 0;
    grouped[group.key].alt2Links += item.alt2Links || 0;
    grouped[group.key].alt3Links += item.alt3Links || 0;
    grouped[group.key].alt4Links += item.alt4Links || 0;
    grouped[group.key].alt5Links += item.alt5Links || 0;
    grouped[group.key].alt1Visits += item.alt1Visits || 0;
    grouped[group.key].alt2Visits += item.alt2Visits || 0;
    grouped[group.key].alt3Visits += item.alt3Visits || 0;
    grouped[group.key].alt4Visits += item.alt4Visits || 0;
    grouped[group.key].alt5Visits += item.alt5Visits || 0;
    grouped[group.key].alt1WhatsappClicks += item.alt1WhatsappClicks || 0;
    grouped[group.key].alt2WhatsappClicks += item.alt2WhatsappClicks || 0;
    grouped[group.key].alt3WhatsappClicks += item.alt3WhatsappClicks || 0;
    grouped[group.key].alt4WhatsappClicks += item.alt4WhatsappClicks || 0;
    grouped[group.key].alt5WhatsappClicks += item.alt5WhatsappClicks || 0;
    grouped[group.key].alt1WhatsappClicksTotal += item.alt1WhatsappClicksTotal || 0;
    grouped[group.key].alt2WhatsappClicksTotal += item.alt2WhatsappClicksTotal || 0;
    grouped[group.key].alt3WhatsappClicksTotal += item.alt3WhatsappClicksTotal || 0;
    grouped[group.key].alt4WhatsappClicksTotal += item.alt4WhatsappClicksTotal || 0;
    grouped[group.key].alt5WhatsappClicksTotal += item.alt5WhatsappClicksTotal || 0;
    grouped[group.key].whatsappClicks += item.whatsappClicks || 0;
    grouped[group.key].whatsappClicksTotal += item.whatsappClicksTotal || 0;
  });

  return Object.values(grouped).sort((a, b) => a.sort.localeCompare(b.sort));
}

function setChartSize() {
  if (!chartCanvas || !chartContext) {
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const styleWidth = chartCanvas.clientWidth;
  const styleHeight = chartCanvas.clientHeight;
  chartCanvas.width = styleWidth * dpr;
  chartCanvas.height = styleHeight * dpr;
  chartContext.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getMetricValue(item, metric) {
  return item[metric] || 0;
}

function renderChart(items, metrics) {
  if (!chartContext || !chartCanvas) {
    return;
  }

  setChartSize();
  const metricList = Array.isArray(metrics) ? metrics : [metrics];
  const labels = items.map((item) => item.label);
  const width = chartCanvas.width / (window.devicePixelRatio || 1);
  const height = chartCanvas.height / (window.devicePixelRatio || 1);
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barGroupWidth = Math.max(20, chartWidth / Math.max(items.length, 1) - 10);
  const barGap = 4;
  const barWidth = Math.max(6, (barGroupWidth - (metricList.length - 1) * barGap) / metricList.length);
  const allValues = items.flatMap((item) => metricList.map((metric) => getMetricValue(item, metric)));
  const maxValue = Math.max(...allValues, 1);

  chartContext.clearRect(0, 0, width, height);
  chartContext.fillStyle = 'rgba(255,255,255,0.08)';
  chartContext.fillRect(0, 0, width, height);

  chartContext.strokeStyle = 'rgba(255,255,255,0.12)';
  chartContext.lineWidth = 1;
  chartContext.beginPath();
  chartContext.moveTo(padding, padding);
  chartContext.lineTo(padding, height - padding);
  chartContext.lineTo(width - padding, height - padding);
  chartContext.stroke();

  chartContext.save();
  chartContext.strokeStyle = 'rgba(255,255,255,0.08)';
  chartContext.lineWidth = 1;
  const separatorStep = barGroupWidth + 10;
  for (let index = 1; index < items.length; index += 1) {
    const separatorX = padding + index * separatorStep + 10 - 5;
    chartContext.beginPath();
    chartContext.moveTo(separatorX, padding);
    chartContext.lineTo(separatorX, height - padding);
    chartContext.stroke();
  }
  chartContext.restore();

  // colors are resolved per-metric using METRIC_COLOR_MAP

  items.forEach((item, index) => {
    const baseX = padding + index * (barGroupWidth + 10) + 10;
    metricList.forEach((metric, metricIndex) => {
      const value = getMetricValue(item, metric);
      const x = baseX + metricIndex * (barWidth + barGap);
      const barHeight = (value / maxValue) * (chartHeight - 20);
      const y = height - padding - barHeight;

      // use fixed color for the metric key so color doesn't depend on selection order
      chartContext.fillStyle = getMetricColor(metric, metricIndex);
      chartContext.fillRect(x, y, barWidth, barHeight);

      chartContext.fillStyle = '#ffffff';
      chartContext.font = '10px Inter, system-ui, sans-serif';
      chartContext.textAlign = 'center';
      chartContext.fillText(value.toString(), x + barWidth / 2, y - 6);
    });
  });

  chartContext.fillStyle = '#ffffff';
  chartContext.font = '8px Inter, system-ui, sans-serif';
  chartContext.textAlign = 'center';

  items.forEach((item, index) => {
    const x = padding + index * (barGroupWidth + 10) + 10 + barGroupWidth / 2;
    const label = item.label;
    chartContext.save();
    chartContext.translate(x, height - padding + 18);
    // draw labels straight below the bars
    chartContext.fillText(label, 0, 0);
    chartContext.restore();
  });

  // remove internal legend text since external legend already displays metric labels
}

function renderLegend(metrics) {
  if (!chartLegend) {
    return;
  }

  chartLegend.innerHTML = metrics
    .map((metric, metricIndex) => {
      const color = getMetricColor(metric, metricIndex);
      return `
        <span class="analytics-legend-chip">
          <span class="analytics-legend-color" style="background:${color}"></span>
          ${METRIC_LABELS[metric] || metric}
        </span>
      `;
    })
    .join('');
}

function getLinkDetailColumnGroups(selectedMetrics) {
  const groups = [
    { key: 'primary', title: 'Link principal', linksMetric: 'primaryLinks', visitsMetric: 'primaryVisits', whatsappMetric: 'primaryWhatsappClicks', whatsappTotalMetric: 'primaryWhatsappClicksTotal' },
    { key: 'alt1', title: 'Link alt. 1', linksMetric: 'alt1Links', visitsMetric: 'alt1Visits', whatsappMetric: 'alt1WhatsappClicks', whatsappTotalMetric: 'alt1WhatsappClicksTotal' },
    { key: 'alt2', title: 'Link alt. 2', linksMetric: 'alt2Links', visitsMetric: 'alt2Visits', whatsappMetric: 'alt2WhatsappClicks', whatsappTotalMetric: 'alt2WhatsappClicksTotal' },
    { key: 'alt3', title: 'Link alt. 3', linksMetric: 'alt3Links', visitsMetric: 'alt3Visits', whatsappMetric: 'alt3WhatsappClicks', whatsappTotalMetric: 'alt3WhatsappClicksTotal' },
    { key: 'alt4', title: 'Link alt. 4', linksMetric: 'alt4Links', visitsMetric: 'alt4Visits', whatsappMetric: 'alt4WhatsappClicks', whatsappTotalMetric: 'alt4WhatsappClicksTotal' },
    { key: 'alt5', title: 'Link alt. 5', linksMetric: 'alt5Links', visitsMetric: 'alt5Visits', whatsappMetric: 'alt5WhatsappClicks', whatsappTotalMetric: 'alt5WhatsappClicksTotal' }
  ];

  return groups.filter(({ linksMetric, visitsMetric, whatsappMetric, whatsappTotalMetric }) => {
    const hasLinks = selectedMetrics.includes(linksMetric);
    const hasVisits = selectedMetrics.includes(visitsMetric);
    const hasWhatsapp = selectedMetrics.includes(whatsappMetric);
    const hasWhatsappTotal = selectedMetrics.includes(whatsappTotalMetric);
    return hasLinks || hasVisits || hasWhatsapp || hasWhatsappTotal;
  });
}

function renderBreakdown(items) {
  if (!items.length) {
    breakdownElement.innerHTML = '<p>No hay datos en este rango.</p>';
    return;
  }

  const selectedLinkMetrics = altDetailExpanded ? selectedLinkDetailMetrics : [];
  const linkDetailGroups = getLinkDetailColumnGroups(selectedLinkMetrics);
  const detailColumns = linkDetailGroups
    .map(({ title }) => `<th>${title}</th>`)
    .join('');

  const rows = items.map((item) => {
    const detailCells = linkDetailGroups
      .map(({ linksMetric, visitsMetric, whatsappMetric, whatsappTotalMetric }) => {
        const hasLinks = selectedLinkMetrics.includes(linksMetric);
        const hasVisits = selectedLinkMetrics.includes(visitsMetric);
        const hasWhatsapp = selectedLinkMetrics.includes(whatsappMetric);
        const hasWhatsappTotal = selectedLinkMetrics.includes(whatsappTotalMetric);
        const linksValue = item[linksMetric] || 0;
        const visitsValue = item[visitsMetric] || 0;
        const whatsappValue = item[whatsappMetric] || 0;
        const whatsappTotalValue = item[whatsappTotalMetric] || 0;
        const parts = [];
        if (hasLinks || hasVisits) {
          parts.push(`${linksValue}/${visitsValue}`);
        }
        if (hasWhatsapp || hasWhatsappTotal) {
          parts.push(`${whatsappValue}/${whatsappTotalValue}`);
        }
        const displayValue = parts.length ? parts.join(' · ') : '—';
        return `<td>${displayValue}</td>`;
      })
      .join('');

    return `
          <tr>
            <td>${item.label}</td>
            <td>${item.uniqueVisitors || 0}/${item.totalVisits || 0}</td>
            ${detailCells}
            <td>${item.whatsappClicks || 0}/${item.whatsappClicksTotal || 0}</td>
          </tr>
        `;
  }).join('');

  breakdownElement.innerHTML = `
          <div class="analytics-breakdown-scroll">
            <table class="${linkDetailGroups.length ? 'analytics-breakdown-table analytics-breakdown-table--detailed' : 'analytics-breakdown-table'}">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Visitas</th>
                  ${detailColumns}
                  <th>Clicks Wpp.</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
}

function renderCompare(current, previous) {
  // If previous is null or undefined, show neutral dash
  if (previous == null || typeof previous !== 'number') {
    return `&nbsp;<span class="analytics-compare analytics-compare--neutral">-</span>`;
  }

  const diff = current - previous;
  if (diff === 0) {
    return `&nbsp;<span class="analytics-compare analytics-compare--neutral">-</span>`;
  }
  const sign = diff > 0 ? '+' : '-';
  const abs = Math.abs(diff);
  const arrow = diff > 0 ? '▲' : '▼';
  const cls = diff > 0 ? 'analytics-compare--up' : 'analytics-compare--down';
  return `&nbsp;<span class="analytics-compare ${cls}"><span class="analytics-compare-arrow">${arrow}</span><span class="analytics-compare-val">${sign}${abs}</span></span>`;
}

function renderLinksSummary(totals, prevTotals) {
  const container = document.getElementById('analytics-links-summary');
  if (!container) {
    return;
  }

  const safe = (value) => (typeof value === 'number' ? value : (value ? Number(value) : 0));

  // Derive tenant base URL from stored admin session or host fallback
  let tenant = 'futurevip';
  try {
    const raw = (typeof window !== 'undefined' && window.sessionStorage) ? window.sessionStorage.getItem('adminSession') : null;
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && parsed.tenantId) tenant = parsed.tenantId;
    else if (typeof window.getTenantIdFromHost === 'function') tenant = window.getTenantIdFromHost(window.location.hostname) || tenant;
  } catch (e) {
    tenant = tenant;
  }
  const baseUrl = `https://${tenant}.vercel.app`;

  const links = [
    {
      title: 'Link principal',
      subtitle: `${baseUrl}/`,
      uniqueVisits: totals.primaryLinks || 0,
      uniqueVisitsPrev: prevTotals?.primaryLinks || 0,
      totalVisits: totals.primaryVisits || 0,
      totalVisitsPrev: prevTotals?.primaryVisits || 0,
      uniqueWhatsapp: totals.primaryWhatsappClicks || 0,
      uniqueWhatsappPrev: prevTotals?.primaryWhatsappClicks || 0,
      totalWhatsapp: totals.primaryWhatsappClicksTotal || 0,
      totalWhatsappPrev: prevTotals?.primaryWhatsappClicksTotal || 0
    },
    {
      title: 'Link alternativo 1',
      subtitle: `${baseUrl}/?src=alt1`,
      uniqueVisits: totals.alt1Links || 0,
      uniqueVisitsPrev: prevTotals?.alt1Links || 0,
      totalVisits: totals.alt1Visits || 0,
      totalVisitsPrev: prevTotals?.alt1Visits || 0,
      uniqueWhatsapp: totals.alt1WhatsappClicks || 0,
      uniqueWhatsappPrev: prevTotals?.alt1WhatsappClicks || 0,
      totalWhatsapp: totals.alt1WhatsappClicksTotal || 0,
      totalWhatsappPrev: prevTotals?.alt1WhatsappClicksTotal || 0
    },
    {
      title: 'Link alternativo 2',
      subtitle: `${baseUrl}/?src=alt2`,
      uniqueVisits: totals.alt2Links || 0,
      uniqueVisitsPrev: prevTotals?.alt2Links || 0,
      totalVisits: totals.alt2Visits || 0,
      totalVisitsPrev: prevTotals?.alt2Visits || 0,
      uniqueWhatsapp: totals.alt2WhatsappClicks || 0,
      uniqueWhatsappPrev: prevTotals?.alt2WhatsappClicks || 0,
      totalWhatsapp: totals.alt2WhatsappClicksTotal || 0,
      totalWhatsappPrev: prevTotals?.alt2WhatsappClicksTotal || 0
    },
    {
      title: 'Link alternativo 3',
      subtitle: `${baseUrl}/?src=alt3`,
      uniqueVisits: totals.alt3Links || 0,
      uniqueVisitsPrev: prevTotals?.alt3Links || 0,
      totalVisits: totals.alt3Visits || 0,
      totalVisitsPrev: prevTotals?.alt3Visits || 0,
      uniqueWhatsapp: totals.alt3WhatsappClicks || 0,
      uniqueWhatsappPrev: prevTotals?.alt3WhatsappClicks || 0,
      totalWhatsapp: totals.alt3WhatsappClicksTotal || 0,
      totalWhatsappPrev: prevTotals?.alt3WhatsappClicksTotal || 0
    },
    {
      title: 'Link alternativo 4',
      subtitle: `${baseUrl}/?src=alt4`,
      uniqueVisits: totals.alt4Links || 0,
      uniqueVisitsPrev: prevTotals?.alt4Links || 0,
      totalVisits: totals.alt4Visits || 0,
      totalVisitsPrev: prevTotals?.alt4Visits || 0,
      uniqueWhatsapp: totals.alt4WhatsappClicks || 0,
      uniqueWhatsappPrev: prevTotals?.alt4WhatsappClicks || 0,
      totalWhatsapp: totals.alt4WhatsappClicksTotal || 0,
      totalWhatsappPrev: prevTotals?.alt4WhatsappClicksTotal || 0
    },
    {
      title: 'Link alternativo 5',
      subtitle: `${baseUrl}/?src=alt5`,
      uniqueVisits: totals.alt5Links || 0,
      uniqueVisitsPrev: prevTotals?.alt5Links || 0,
      totalVisits: totals.alt5Visits || 0,
      totalVisitsPrev: prevTotals?.alt5Visits || 0,
      uniqueWhatsapp: totals.alt5WhatsappClicks || 0,
      uniqueWhatsappPrev: prevTotals?.alt5WhatsappClicks || 0,
      totalWhatsapp: totals.alt5WhatsappClicksTotal || 0,
      totalWhatsappPrev: prevTotals?.alt5WhatsappClicksTotal || 0
    }
  ];

  const cardsHtml = links.map((link) => `
    <div class="analytics-link-group">
      <div class="analytics-link-group__header">
        <h3>${link.title}</h3>
        <p class="analytics-link-group__link">${link.subtitle}</p>
      </div>
      <div class="analytics-link-group__grid">
        <div class="analytics-card">
          <h3>Visitas únicas</h3>
          <p>${safe(link.uniqueVisits)}${renderCompare(safe(link.uniqueVisits), safe(link.uniqueVisitsPrev))}</p>
        </div>
        <div class="analytics-card">
          <h3>Visitas totales</h3>
          <p>${safe(link.totalVisits)}${renderCompare(safe(link.totalVisits), safe(link.totalVisitsPrev))}</p>
        </div>
        <div class="analytics-card">
          <h3>Clicks únicos WhatsApp</h3>
          <p>${safe(link.uniqueWhatsapp)}${renderCompare(safe(link.uniqueWhatsapp), safe(link.uniqueWhatsappPrev))}</p>
        </div>
        <div class="analytics-card">
          <h3>Clicks totales WhatsApp</h3>
          <p>${safe(link.totalWhatsapp)}${renderCompare(safe(link.totalWhatsapp), safe(link.totalWhatsappPrev))}</p>
        </div>
      </div>
    </div>
  `).join('');

  container.innerHTML = cardsHtml;
}

function renderAdvancedSummary(payload = {}) {
  const container = document.getElementById('advanced-summary-content');
  if (!container) {
    return;
  }

  //console.log('[AdvancedSummary DEBUG] renderAdvancedSummary called');
  //console.log('[AdvancedSummary DEBUG] payload type:', Object.prototype.toString.call(payload));
  //console.log('[AdvancedSummary DEBUG] isArray:', Array.isArray(payload));
  //console.log('[AdvancedSummary DEBUG] length:', Array.isArray(payload) ? payload.length : null);

  if (Array.isArray(payload)) {
    //console.log('[AdvancedSummary DEBUG] renderer: buildAdvancedSummaryReport');
    //console.log('[AdvancedSummary DEBUG] version: analytics.js renderAdvancedSummary branch check');
    container.innerHTML = buildAdvancedSummaryReport(payload);
    return;
  }

  //console.log('[AdvancedSummary DEBUG] renderer: buildAdvancedSummaryCards');
  //console.log('[AdvancedSummary DEBUG] version: analytics.js renderAdvancedSummary branch check');
  const cardsHtml = buildAdvancedSummaryCards(payload).map(({ title, value }) => `
    <div class="analytics-card">
      <h3>${title}</h3>
      <p>${value}</p>
    </div>
  `).join('');

  container.innerHTML = cardsHtml;
}

function displayTotals(totals, visitorCount, prevTotals, prevVisitorCount) {
  const uniqueEl = document.getElementById('analytics-unique');
  const totalEl = document.getElementById('analytics-total');
  const primaryUniqueEl = document.getElementById('analytics-primary-unique');
  const primaryTotalEl = document.getElementById('analytics-primary-total');
  const alt1UniqueEl = document.getElementById('analytics-alternative-unique-1');
  const alt1TotalEl = document.getElementById('analytics-alternative-total-1');
  const alt2UniqueEl = document.getElementById('analytics-alternative-unique-2');
  const alt2TotalEl = document.getElementById('analytics-alternative-total-2');
  const alt3UniqueEl = document.getElementById('analytics-alternative-unique-3');
  const alt3TotalEl = document.getElementById('analytics-alternative-total-3');
  const alt4UniqueEl = document.getElementById('analytics-alternative-unique-4');
  const alt4TotalEl = document.getElementById('analytics-alternative-total-4');
  const alt5UniqueEl = document.getElementById('analytics-alternative-unique-5');
  const alt5TotalEl = document.getElementById('analytics-alternative-total-5');
  const wppUniqueEl = document.getElementById('analytics-whatsapp-unique');
  const wppTotalEl = document.getElementById('analytics-whatsapp-total');

  const updateField = (el, html) => {
    if (el) el.innerHTML = html;
  };
  // Helper to safe number
  const safe = (v) => (typeof v === 'number' ? v : (v ? Number(v) : 0));

  updateField(uniqueEl, `${visitorCount}${renderCompare(visitorCount, prevVisitorCount)}`);
  updateField(totalEl, `${safe(totals.totalVisits)}${renderCompare(safe(totals.totalVisits), safe(prevTotals?.totalVisits))}`);
  updateField(primaryUniqueEl, `${safe(totals.primaryLinks)}${renderCompare(safe(totals.primaryLinks), safe(prevTotals?.primaryLinks))}`);
  updateField(primaryTotalEl, `${safe(totals.primaryVisits)}${renderCompare(safe(totals.primaryVisits), safe(prevTotals?.primaryVisits))}`);
  updateField(alt1UniqueEl, `${safe(totals.alt1Links)}${renderCompare(safe(totals.alt1Links), safe(prevTotals?.alt1Links))}`);
  updateField(alt1TotalEl, `${safe(totals.alt1Visits)}${renderCompare(safe(totals.alt1Visits), safe(prevTotals?.alt1Visits))}`);
  updateField(alt2UniqueEl, `${safe(totals.alt2Links)}${renderCompare(safe(totals.alt2Links), safe(prevTotals?.alt2Links))}`);
  updateField(alt2TotalEl, `${safe(totals.alt2Visits)}${renderCompare(safe(totals.alt2Visits), safe(prevTotals?.alt2Visits))}`);
  updateField(alt3UniqueEl, `${safe(totals.alt3Links)}${renderCompare(safe(totals.alt3Links), safe(prevTotals?.alt3Links))}`);
  updateField(alt3TotalEl, `${safe(totals.alt3Visits)}${renderCompare(safe(totals.alt3Visits), safe(prevTotals?.alt3Visits))}`);
  updateField(alt4UniqueEl, `${safe(totals.alt4Links)}${renderCompare(safe(totals.alt4Links), safe(prevTotals?.alt4Links))}`);
  updateField(alt4TotalEl, `${safe(totals.alt4Visits)}${renderCompare(safe(totals.alt4Visits), safe(prevTotals?.alt4Visits))}`);
  updateField(alt5UniqueEl, `${safe(totals.alt5Links)}${renderCompare(safe(totals.alt5Links), safe(prevTotals?.alt5Links))}`);
  updateField(alt5TotalEl, `${safe(totals.alt5Visits)}${renderCompare(safe(totals.alt5Visits), safe(prevTotals?.alt5Visits))}`);
  updateField(wppUniqueEl, `${safe(totals.whatsappClicks)}${renderCompare(safe(totals.whatsappClicks), safe(prevTotals?.whatsappClicks))}`);
  updateField(wppTotalEl, `${safe(totals.whatsappClicksTotal)}${renderCompare(safe(totals.whatsappClicksTotal), safe(prevTotals?.whatsappClicksTotal))}`);
}

const METRIC_LABELS = {
  uniqueVisitors: 'Visitas únicas',
  totalVisits: 'Visitas totales',
  primaryLinks: 'Visitas únicas link principal',
  primaryVisits: 'Visitas totales link principal',
  primaryWhatsappClicks: 'Clicks únicos WhatsApp link principal',
  primaryWhatsappClicksTotal: 'Clicks totales WhatsApp link principal',
  alt1Links: 'Visitas únicas link alt. 1',
  alt1Visits: 'Visitas totales link alt. 1',
  alt1WhatsappClicks: 'Clicks únicos WhatsApp link alt. 1',
  alt1WhatsappClicksTotal: 'Clicks totales WhatsApp link alt. 1',
  alt2Links: 'Visitas únicas link alt. 2',
  alt2Visits: 'Visitas totales link alt. 2',
  alt2WhatsappClicks: 'Clicks únicos WhatsApp link alt. 2',
  alt2WhatsappClicksTotal: 'Clicks totales WhatsApp link alt. 2',
  alt3Links: 'Visitas únicas link alt. 3',
  alt3Visits: 'Visitas totales link alt. 3',
  alt3WhatsappClicks: 'Clicks únicos WhatsApp link alt. 3',
  alt3WhatsappClicksTotal: 'Clicks totales WhatsApp link alt. 3',
  alt4Links: 'Visitas únicas link alt. 4',
  alt4Visits: 'Visitas totales link alt. 4',
  alt4WhatsappClicks: 'Clicks únicos WhatsApp link alt. 4',
  alt4WhatsappClicksTotal: 'Clicks totales WhatsApp link alt. 4',
  alt5Links: 'Visitas únicas link alt. 5',
  alt5Visits: 'Visitas totales link alt. 5',
  alt5WhatsappClicks: 'Clicks únicos WhatsApp link alt. 5',
  alt5WhatsappClicksTotal: 'Clicks totales WhatsApp link alt. 5',
  whatsappClicks: 'Clicks únicos WhatsApp',
  whatsappClicksTotal: 'Clicks totales WhatsApp'
};

const METRIC_COLORS = [
  'rgba(255, 99, 132, 0.95)',
  'rgba(54, 162, 235, 0.95)',
  'rgba(37, 99, 235, 0.95)',
  'rgba(59, 130, 246, 0.95)',
  'rgba(15, 118, 110, 0.95)',
  'rgba(45, 212, 191, 0.95)',
  'rgba(139, 92, 246, 0.95)',
  'rgba(167, 139, 250, 0.95)'
];

const METRIC_COLOR_MAP = {
  uniqueVisitors: 'rgba(255, 99, 132, 0.95)',
  totalVisits: 'rgba(54, 162, 235, 0.95)',
  primaryLinks: 'rgba(37, 99, 235, 0.95)',
  primaryVisits: 'rgba(59, 130, 246, 0.95)',
  primaryWhatsappClicks: 'rgba(30, 64, 175, 0.95)',
  primaryWhatsappClicksTotal: 'rgba(96, 165, 250, 0.95)',
  alt1Links: 'rgba(22, 163, 74, 0.95)',
  alt1Visits: 'rgba(74, 222, 128, 0.95)',
  alt1WhatsappClicks: 'rgba(21, 128, 61, 0.95)',
  alt1WhatsappClicksTotal: 'rgba(74, 222, 128, 0.95)',
  alt2Links: 'rgba(8, 145, 178, 0.95)',
  alt2Visits: 'rgba(34, 211, 238, 0.95)',
  alt2WhatsappClicks: 'rgba(14, 116, 144, 0.95)',
  alt2WhatsappClicksTotal: 'rgba(103, 232, 249, 0.95)',
  alt3Links: 'rgba(139, 92, 246, 0.95)',
  alt3Visits: 'rgba(167, 139, 250, 0.95)',
  alt3WhatsappClicks: 'rgba(109, 40, 217, 0.95)',
  alt3WhatsappClicksTotal: 'rgba(192, 132, 252, 0.95)',
  alt4Links: 'rgba(245, 158, 11, 0.95)',
  alt4Visits: 'rgba(251, 191, 36, 0.95)',
  alt4WhatsappClicks: 'rgba(180, 83, 9, 0.95)',
  alt4WhatsappClicksTotal: 'rgba(253, 186, 116, 0.95)',
  alt5Links: 'rgba(244, 63, 94, 0.95)',
  alt5Visits: 'rgba(251, 113, 133, 0.95)',
  alt5WhatsappClicks: 'rgba(190, 24, 93, 0.95)',
  alt5WhatsappClicksTotal: 'rgba(249, 168, 212, 0.95)',
  whatsappClicks: 'rgba(15, 118, 110, 0.95)',
  whatsappClicksTotal: 'rgba(45, 212, 191, 0.95)'
};

function getAdvancedSummarySortValue(payload = {}) {
  const candidates = [
    payload?.landingReady?.timestamp,
    payload?.buttonReady?.timestamp,
    payload?.exit?.timestamp,
    payload?.behavior?.whatsappClick?.timestamp,
    payload?.behavior?.hero?.timestamp,
    payload?.visitStart,
    payload?.visitStartMs
  ];

  for (const candidate of candidates) {
    const parsed = candidate != null ? new Date(candidate) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  return 0;
}

async function loadAdvancedSummaryPayload(range) {
  try {
    const sessionQuery = query(
      collection(db, 'analytics'),
      where('visitStartMs', '>=', range.start.getTime()),
      where('visitStartMs', '<=', range.end.getTime())
    );
    const snapshot = await getDocs(sessionQuery);
    const sessionPayloads = snapshot.docs
      .filter((docSnapshot) => docSnapshot.id.startsWith('landing_session_'))
      .map((docSnapshot) => docSnapshot.data() || {})
      .filter((payload) => payload && typeof payload === 'object');

    if (!sessionPayloads.length) {
      return [];
    }

    sessionPayloads.sort((left, right) => getAdvancedSummarySortValue(right) - getAdvancedSummarySortValue(left));
    return sessionPayloads;
  } catch (error) {
    console.warn('[analytics] No se pudieron cargar los documentos de sesión para el resumen avanzado', error);
    return [];
  }
}

async function loadAnalytics() {
  try {
    await loadAnalyticsTargets();
    const session = getStoredSession();
    const tenantId = session?.tenantId || 'futurevip';
    const ref = doc(db, 'tenants', tenantId, 'analytics', 'landing');
    const snapshot = await getDoc(ref);
    const range = parseRangeInputs();
    const detailMode = detailSelect.value || 'hour';
    if (breakdownTitle) {
      breakdownTitle.textContent = DETAIL_LABELS[detailMode] || DETAIL_LABELS.hour;
    }

    const data = normalizeAnalyticsDocument(snapshot.exists() ? snapshot.data() : {});
    const visitors = data.visitors && typeof data.visitors === 'object' ? data.visitors : {};
    const buckets = data.buckets && typeof data.buckets === 'object' ? data.buckets : {};
    const selectedMetrics = Array.from(metricCheckboxes.querySelectorAll('input[type="checkbox"]:checked'))
      .map((input) => input.value)
      .filter((metricKey) => Object.prototype.hasOwnProperty.call(METRIC_LABELS, metricKey));
    const metrics = selectedMetrics.length ? selectedMetrics : ['totalVisits'];
    const bucketData = collectBuckets(buckets, range.start, range.end);
    const visitorCount = countUniqueVisitors(visitors, range.start, range.end, bucketData.totals);

    if (!snapshot.exists()) {
      renderLinksSummary(data.totals || {}, null);
      displayTotals(data.totals || {}, 0, null, null);
      renderBreakdown([]);
      renderChart([], []);
      renderLegend([]);
      syncCalculatorContext({
        uniqueVisits: 0,
        uniqueWhatsapp: 0,
        rangeStart: range.start,
        rangeEnd: range.end
      });
      if (messageElement) {
        messageElement.textContent = 'No se encontraron datos de analytics aún.';
      }
      if (breakdownElement) {
        breakdownElement.innerHTML = '';
      }
      return;
    }

    // Calculate previous period (same duration immediately before current range)
    const duration = range.end.getTime() - range.start.getTime();
    const prevEnd = new Date(range.start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    const prevBucketData = collectBuckets(buckets, prevStart, prevEnd);
    const prevVisitorCount = countUniqueVisitors(visitors, prevStart, prevEnd, prevBucketData.totals);
    const detailItems = aggregateItems(bucketData.items, detailMode);

    const totalsToDisplay = { ...bucketData.totals };

      renderLinksSummary(totalsToDisplay, prevBucketData.totals);
    const advancedSummaryPayload = await loadAdvancedSummaryPayload(range);
    renderAdvancedSummary(advancedSummaryPayload);

    const displayedPrevUniqueVisitors = (prevBucketData.totals?.uniqueVisitors || 0) > 0
      ? prevBucketData.totals.uniqueVisitors
      : prevVisitorCount;
    const displayedUniqueVisitors = (visitorCount || 0) > 0
      ? visitorCount
      : (totalsToDisplay.uniqueVisitors || 0);
    const nextUniqueWhatsapp = Number.isFinite(totalsToDisplay.whatsappClicks)
      ? totalsToDisplay.whatsappClicks
      : (totalsToDisplay.whatsappClicksTotal || 0);

    displayTotals(totalsToDisplay, displayedUniqueVisitors, prevBucketData.totals, displayedPrevUniqueVisitors);

    const resolvedUniqueVisits = parseSummaryNumber(document.getElementById('analytics-unique')) || displayedUniqueVisitors || visitorCount;
    const resolvedUniqueWhatsapp = parseSummaryNumber(document.getElementById('analytics-whatsapp-unique')) || nextUniqueWhatsapp;
    syncCalculatorContext({
      uniqueVisits: resolvedUniqueVisits,
      uniqueWhatsapp: resolvedUniqueWhatsapp,
      rangeStart: range.start,
      rangeEnd: range.end
    });

    renderBreakdown(detailItems);

    let chartError = null;
    try {
      renderChart(detailItems, metrics);
    } catch (chartErr) {
      chartError = chartErr;
      console.error('Error rendering analytics chart:', chartErr);
    }

    renderLegend(metrics);
    if (messageElement) {
      messageElement.textContent = chartError
        ? `Mostrando datos desde ${formatDateTime(startInput.value)} hasta ${formatDateTime(endInput.value)} (gráfico no disponible)`
        : `Mostrando datos desde ${formatDateTime(startInput.value)} hasta ${formatDateTime(endInput.value)}`;
    }
  } catch (error) {
    const analyticsContent = document.getElementById('analytics-content');
    if (analyticsContent) {
      analyticsContent.innerHTML = '<p>Error cargando analytics.</p>';
    }
    if (breakdownElement) {
      breakdownElement.innerHTML = '';
    }
    if (messageElement) {
      messageElement.textContent = `Error cargando analytics: ${error?.message || error}`;
    }
    console.error('Error loading analytics:', error);
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildTestAnalyticsDocument() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const days = [yesterday, today];
  const hours = [1, 4, 7, 10, 13, 16, 19, 22];
  const buckets = {};
  const visitors = {};
  const sourceKeys = ['primary', 'alt1', 'alt2', 'alt3', 'alt4', 'alt5'];

  const addVisitor = (dayKey, hourKey, source, totalVisits) => {
    const visitorId = `test-${dayKey}-${hourKey}-${source}-${Math.random().toString(36).slice(2, 8)}`;
    const baseDate = new Date(`${dayKey}T${hourKey}:00:00`);
    const firstSeen = baseDate.toISOString();
    const lastSeen = new Date(baseDate.getTime() + 90 * 60 * 1000).toISOString();
    visitors[visitorId] = {
      ip: `203.0.113.${randomInt(1, 250)}`,
      userAgent: 'Mozilla/5.0 (Test Browser) analytics-test',
      platform: 'Test OS',
      screen: '1366x768',
      language: 'es-AR',
      firstSeen,
      lastSeen,
      visits: totalVisits,
      sources: { [source]: totalVisits },
      whatsappClicked: totalVisits > 10 && Math.random() > 0.5,
      lastSource: source
    };
  };

  const addVisitorBucketSources = (dayKey, hourKey, sourceCounts) => {
    sourceCounts.forEach((sourceCount, index) => {
      const source = sourceKeys[index];
      for (let visitorIndex = 0; visitorIndex < sourceCount; visitorIndex += 1) {
        addVisitor(dayKey, hourKey, source, randomInt(1, 3));
      }
    });
  };

  days.forEach((day) => {
    const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    buckets[dayKey] = {};

    hours.forEach((hour) => {
      const hourKey = String(hour).padStart(2, '0');
      const primaryVisits = randomInt(1, 250);
      const primaryLinks = randomInt(1, Math.min(primaryVisits, 250));
      const altVisits = sourceKeys.slice(1).map(() => randomInt(1, 250));
      const altLinks = altVisits.map((visits) => randomInt(1, Math.min(visits, 250)));
      const totalVisits = primaryVisits + altVisits.reduce((sum, value) => sum + value, 0);
      const primaryUniqueVisitors = randomInt(1, Math.min(primaryLinks, 250));
      const linkUniqueTotal = primaryLinks + altLinks.reduce((sum, value) => sum + value, 0);
      const totalUniqueVisitors = Math.max(
        1,
        Math.min(totalVisits, Math.max(primaryUniqueVisitors, linkUniqueTotal))
      );
      const whatsappClicks = randomInt(1, Math.min(250, Math.max(1, Math.floor(totalVisits / 2))));
      const whatsappClicksTotal = randomInt(whatsappClicks, Math.min(250, whatsappClicks + randomInt(1, 25)));

      const bucket = {
        uniqueVisitors: totalUniqueVisitors,
        totalVisits,
        primaryLinks: primaryUniqueVisitors,
        primaryVisits,
        primaryWhatsappClicks: randomInt(0, Math.max(0, Math.floor(primaryVisits / 8))),
        primaryWhatsappClicksTotal: randomInt(0, Math.max(0, Math.floor(primaryVisits / 8) + 2)),
        alt1Links: altLinks[0],
        alt2Links: altLinks[1],
        alt3Links: altLinks[2],
        alt4Links: altLinks[3],
        alt5Links: altLinks[4],
        alt1Visits: altVisits[0],
        alt2Visits: altVisits[1],
        alt3Visits: altVisits[2],
        alt4Visits: altVisits[3],
        alt5Visits: altVisits[4],
        alt1WhatsappClicks: randomInt(0, Math.max(0, Math.floor(altVisits[0] / 8))),
        alt2WhatsappClicks: randomInt(0, Math.max(0, Math.floor(altVisits[1] / 8))),
        alt3WhatsappClicks: randomInt(0, Math.max(0, Math.floor(altVisits[2] / 8))),
        alt4WhatsappClicks: randomInt(0, Math.max(0, Math.floor(altVisits[3] / 8))),
        alt5WhatsappClicks: randomInt(0, Math.max(0, Math.floor(altVisits[4] / 8))),
        alt1WhatsappClicksTotal: randomInt(0, Math.max(0, Math.floor(altVisits[0] / 8) + 2)),
        alt2WhatsappClicksTotal: randomInt(0, Math.max(0, Math.floor(altVisits[1] / 8) + 2)),
        alt3WhatsappClicksTotal: randomInt(0, Math.max(0, Math.floor(altVisits[2] / 8) + 2)),
        alt4WhatsappClicksTotal: randomInt(0, Math.max(0, Math.floor(altVisits[3] / 8) + 2)),
        alt5WhatsappClicksTotal: randomInt(0, Math.max(0, Math.floor(altVisits[4] / 8) + 2)),
        whatsappClicks,
        whatsappClicksTotal
      };

      buckets[dayKey][hourKey] = bucket;

      const sourceCounts = [
        Math.max(1, Math.min(3, Math.floor(primaryUniqueVisitors / 8))),
        Math.max(1, Math.min(3, Math.floor(altLinks[0] / 8))),
        Math.max(1, Math.min(3, Math.floor(altLinks[1] / 8))),
        Math.max(1, Math.min(3, Math.floor(altLinks[2] / 8))),
        Math.max(1, Math.min(3, Math.floor(altLinks[3] / 8))),
        Math.max(1, Math.min(3, Math.floor(altLinks[4] / 8)))
      ];
      addVisitorBucketSources(dayKey, hourKey, sourceCounts);
    });
  });

  const totals = {
    uniqueVisitors: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.uniqueVisitors || 0), 0),
    totalVisits: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.totalVisits || 0), 0),
    primaryLinks: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.primaryLinks || 0), 0),
    primaryVisits: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.primaryVisits || 0), 0),
    primaryWhatsappClicks: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.primaryWhatsappClicks || 0), 0),
    primaryWhatsappClicksTotal: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.primaryWhatsappClicksTotal || 0), 0),
    alt1Links: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt1Links || 0), 0),
    alt2Links: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt2Links || 0), 0),
    alt3Links: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt3Links || 0), 0),
    alt4Links: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt4Links || 0), 0),
    alt5Links: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt5Links || 0), 0),
    alt1Visits: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt1Visits || 0), 0),
    alt2Visits: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt2Visits || 0), 0),
    alt3Visits: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt3Visits || 0), 0),
    alt4Visits: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt4Visits || 0), 0),
    alt5Visits: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt5Visits || 0), 0),
    alt1WhatsappClicks: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt1WhatsappClicks || 0), 0),
    alt2WhatsappClicks: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt2WhatsappClicks || 0), 0),
    alt3WhatsappClicks: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt3WhatsappClicks || 0), 0),
    alt4WhatsappClicks: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt4WhatsappClicks || 0), 0),
    alt5WhatsappClicks: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt5WhatsappClicks || 0), 0),
    alt1WhatsappClicksTotal: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt1WhatsappClicksTotal || 0), 0),
    alt2WhatsappClicksTotal: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt2WhatsappClicksTotal || 0), 0),
    alt3WhatsappClicksTotal: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt3WhatsappClicksTotal || 0), 0),
    alt4WhatsappClicksTotal: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt4WhatsappClicksTotal || 0), 0),
    alt5WhatsappClicksTotal: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.alt5WhatsappClicksTotal || 0), 0),
    whatsappClicks: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.whatsappClicks || 0), 0),
    whatsappClicksTotal: Object.values(buckets).flatMap((dayBuckets) => Object.values(dayBuckets)).reduce((sum, bucket) => sum + (bucket.whatsappClicksTotal || 0), 0)
  };

  return { totals, visitors, buckets };
}

function buildAnalyticsDocumentPayload(payload = {}) {
  const base = createEmptyAnalyticsDocument();
  const normalized = payload && typeof payload === 'object' ? payload : {};
  return {
    ...base,
    ...normalized,
    totals: normalized.totals && typeof normalized.totals === 'object'
      ? { ...ANALYTICS_TOTALS_TEMPLATE, ...normalized.totals }
      : { ...ANALYTICS_TOTALS_TEMPLATE },
    visitors: normalized.visitors && typeof normalized.visitors === 'object' ? normalized.visitors : {},
    buckets: normalized.buckets && typeof normalized.buckets === 'object' ? normalized.buckets : {},
    legacyPayload: normalized.legacyPayload && typeof normalized.legacyPayload === 'object' ? normalized.legacyPayload : {}
  };
}

function initializeEventListeners() {
  initializeElements();
  summaryToggle = document.getElementById('summary-toggle');
  summaryBody = document.getElementById('summary-body');
  advancedSummaryToggle = document.getElementById('advanced-summary-toggle');
  advancedSummaryBody = document.getElementById('advanced-summary-body');
  linksToggle = document.getElementById('links-toggle');
  visualizationToggle = document.getElementById('visualization-toggle');
  visualizationBody = document.getElementById('visualization-body');
  chartToggle = document.getElementById('chart-toggle');
  chartSection = document.getElementById('chart-section');
  tableToggle = document.getElementById('table-toggle');
  tableSection = document.getElementById('analytics-breakdown-section');
  visualizationChildren = document.getElementById('visualization-children');

  updateDateInputsState();

  if (summaryBody) {
    summaryBody.classList.add('collapsed');
    summaryBody.style.display = 'none';
    summaryToggle?.setAttribute('aria-expanded', 'false');
    if (summaryToggle) {
      const summaryLabel = summaryToggle.querySelector('.sr-only');
      if (summaryLabel) {
        summaryLabel.textContent = 'Mostrar resumen';
      }
    }
  }

  if (calculatorBody) {
    calculatorBody.classList.add('collapsed');
    calculatorBody.style.display = 'none';
    calculatorToggle?.setAttribute('aria-expanded', 'false');
    if (calculatorToggle) {
      const calculatorLabel = calculatorToggle.querySelector('.sr-only');
      if (calculatorLabel) {
        calculatorLabel.textContent = 'Mostrar calculadora';
      }
    }
  }

  if (rangeSelect) {
    rangeSelect.addEventListener('change', async () => {
      updateDateInputsState();
      if (rangeSelect.value !== 'custom') {
        setInputsForRange(rangeSelect.value);
        try {
          const nextRange = getActiveRange();
          syncCalculatorContext({ rangeStart: nextRange.start, rangeEnd: nextRange.end });
        } catch (error) {
          console.warn('No se pudo actualizar el rango de la calculadora:', error);
        }
        await loadAnalytics();
        return;
      }
      if (messageElement) messageElement.textContent = 'Rango personalizado activo. Ajustá las fechas para filtrar.';
      try {
        const nextRange = getActiveRange();
        syncCalculatorContext({ rangeStart: nextRange.start, rangeEnd: nextRange.end });
      } catch (error) {
        console.warn('No se pudo actualizar el rango personalizado de la calculadora:', error);
      }
    });
  }

  const refreshRange = async () => {
    try {
      if (rangeSelect && rangeSelect.value === 'custom') {
        parseRangeInputs();
      }
      await loadAnalytics();
    } catch (error) {
      if (messageElement && breakdownElement) {
        messageElement.textContent = error.message;
        breakdownElement.innerHTML = '';
      }
    }
  };

  [startInput, endInput].forEach((input) => {
    input?.addEventListener('change', () => {
      if (rangeSelect && rangeSelect.value === 'custom') {
        try {
          const nextRange = getActiveRange();
          syncCalculatorContext({ rangeStart: nextRange.start, rangeEnd: nextRange.end });
        } catch (error) {
          console.warn('No se pudo actualizar el rango al cambiar las fechas:', error);
        }
        void refreshRange();
      }
    });
    input?.addEventListener('input', () => {
      if (rangeSelect && rangeSelect.value === 'custom') {
        try {
          const nextRange = getActiveRange();
          syncCalculatorContext({ rangeStart: nextRange.start, rangeEnd: nextRange.end });
        } catch (error) {
          console.warn('No se pudo actualizar el rango al escribir las fechas:', error);
        }
      }
    });
  });

  if (detailSelect) {
    detailSelect.addEventListener('change', async () => {
      if (breakdownTitle) breakdownTitle.textContent = DETAIL_LABELS[detailSelect.value] || DETAIL_LABELS.hour;
      await loadAnalytics();
    });
  }

  metricCheckboxes?.addEventListener('change', async () => {
    setActiveMetricPreset(null);
    syncMetricCheckboxStyles();
    updateSelectedLinkDetailMetrics();
    await loadAnalytics();
  });

  [calculatorCostInput, calculatorArrivedNewInput, calculatorArrivedRepeatInput, calculatorArrivedNoresponseInput, calculatorArrivedInput, calculatorDerivedInput].forEach((input) => {
    input?.addEventListener('focus', () => {
      if ((input.value || '').trim() === '0') {
        input.value = '';
      }
    });
    input?.addEventListener('blur', () => {
      if (!input.value || input.value === '.') {
        input.value = '0';
      } else {
        input.value = sanitizeCalculatorInputValue(input.value);
      }
      renderCalculatorMetrics();
    });
    input?.addEventListener('input', () => {
      input.value = sanitizeCalculatorInputValue(input.value);
      
      // Detectar edición manual de campos de llegados
      const sanitizedValue = input.value;
      const isZero = !sanitizedValue || sanitizedValue === '0' || sanitizedValue === '';
      
      if (input === calculatorArrivedInput) {
        // El usuario está editando el total
        if (!isZero) {
          setArrivedManualMode('total');
        } else if (arrivedManualMode === 'total') {
          // Volvió a 0, reactivar componentes
          setArrivedManualMode(null);
        }
      } else if ([calculatorArrivedNewInput, calculatorArrivedRepeatInput, calculatorArrivedNoresponseInput].includes(input)) {
        // El usuario está editando uno de los componentes
        const anyComponentNonZero = [calculatorArrivedNewInput, calculatorArrivedRepeatInput, calculatorArrivedNoresponseInput].some(
          (field) => {
            const val = (field?.value || '0').trim();
            return val !== '0' && val !== '';
          }
        );
        
        if (anyComponentNonZero) {
          setArrivedManualMode('components');
        } else if (arrivedManualMode === 'components') {
          // Todos los componentes volvieron a 0, reactivar total
          setArrivedManualMode(null);
        }
      }
      
      renderCalculatorMetrics();
    });
    input?.addEventListener('change', () => {
      input.value = sanitizeCalculatorInputValue(input.value);
      renderCalculatorMetrics();
    });
  });

  calculatorCampaignsSelect?.addEventListener('change', () => {
    renderCalculatorMetrics();
  });

  document.querySelectorAll('.analytics-metric-preset-button').forEach((button) => {
    button.addEventListener('click', () => {
      applyMetricPreset(button.dataset.preset);
    });
  });

  altDetailToggle?.addEventListener('click', async () => {
    altDetailExpanded = !altDetailExpanded;
    syncAlternativeMetricVisibility();
    updateSelectedLinkDetailMetrics();
    await loadAnalytics();
  });

  summaryToggle?.addEventListener('click', () => {
    if (!summaryBody) return;
    const isCollapsed = summaryBody.classList.toggle('collapsed');
    summaryBody.style.display = isCollapsed ? 'none' : '';
    summaryToggle.setAttribute('aria-expanded', String(!isCollapsed));
    summaryToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar resumen' : 'Minimizar resumen';
  });

  advancedSummaryToggle?.addEventListener('click', () => {
    if (!advancedSummaryBody) return;
    const wasCollapsed = advancedSummaryBody.classList.contains('collapsed');
    advancedSummaryBody.classList.toggle('collapsed', !wasCollapsed);
    advancedSummaryBody.style.display = wasCollapsed ? '' : '';
    advancedSummaryToggle.setAttribute('aria-expanded', String(wasCollapsed));
    advancedSummaryToggle.querySelector('.sr-only').textContent = wasCollapsed ? 'Minimizar resumen avanzado' : 'Mostrar resumen avanzado';
  });

  visualizationToggle?.addEventListener('click', () => {
    if (!visualizationBody) return;
    const isCollapsed = visualizationBody.classList.toggle('collapsed');
    visualizationBody.style.display = isCollapsed ? 'none' : '';
    // Also collapse/expand the visualization children container so chart and table hide together,
    // but do not mutate their internal collapsed states (they remain preserved).
    if (visualizationChildren) visualizationChildren.style.display = isCollapsed ? 'none' : '';
    visualizationToggle.setAttribute('aria-expanded', String(!isCollapsed));
    visualizationToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar visualización' : 'Minimizar visualización';
  });

  // Calculator parent toggle: collapse/expand whole calculator body but preserve sub-section states
  calculatorToggle?.addEventListener('click', () => {
    if (!calculatorBody) return;
    const isCollapsed = calculatorBody.classList.toggle('collapsed');
    calculatorToggle.setAttribute('aria-expanded', String(!isCollapsed));
    calculatorToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar calculadora' : 'Minimizar calculadora';
    // When collapsed hide the whole body via display to ensure visual collapse while keeping inner states
    calculatorBody.style.display = isCollapsed ? 'none' : '';
  });

  calculatorMonetaryToggle?.addEventListener('click', () => {
    if (!calculatorMonetaryBody) return;
    const isCollapsed = calculatorMonetaryBody.classList.toggle('collapsed');
    calculatorMonetaryToggle.setAttribute('aria-expanded', String(!isCollapsed));
    calculatorMonetaryToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar monetarias' : 'Minimizar monetarias';
    calculatorMonetaryBody.style.display = isCollapsed ? 'none' : '';
  });

  calculatorPercentToggle?.addEventListener('click', () => {
    if (!calculatorPercentBody) return;
    const isCollapsed = calculatorPercentBody.classList.toggle('collapsed');
    calculatorPercentToggle.setAttribute('aria-expanded', String(!isCollapsed));
    calculatorPercentToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar porcentuales' : 'Minimizar porcentuales';
    calculatorPercentBody.style.display = isCollapsed ? 'none' : '';
  });

  linksToggle?.addEventListener('click', () => {
    const linksBody = document.getElementById('links-body');
    if (!linksBody) return;
    const isCollapsed = linksBody.classList.toggle('collapsed');
    linksBody.style.display = isCollapsed ? 'none' : '';
    linksToggle.setAttribute('aria-expanded', String(!isCollapsed));
    linksToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar links' : 'Minimizar links';
  });

  chartToggle?.addEventListener('click', () => {
    if (!chartSection) return;
    const chartBody = chartSection.querySelector('.analytics-section__body');
    if (!chartBody) return;
    const isCollapsed = chartBody.classList.toggle('collapsed');
    chartBody.style.display = isCollapsed ? 'none' : '';
    chartToggle.setAttribute('aria-expanded', String(!isCollapsed));
    chartToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar gráfico' : 'Minimizar gráfico';
  });

  tableToggle?.addEventListener('click', () => {
    const tableBody = document.getElementById('analytics-breakdown-body');
    if (!tableBody) return;
    const isCollapsed = tableBody.classList.toggle('collapsed');
    tableBody.style.display = isCollapsed ? 'none' : '';
    tableToggle.setAttribute('aria-expanded', String(!isCollapsed));
    tableToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar tabla' : 'Minimizar tabla';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
  initializeEventListeners();
}

async function runOnLoad() {
  try {
    window.addEventListener('resize', () => {
      loadAnalytics().catch((error) => console.warn('Error actualizando gráfico al redimensionar:', error));
    });

    syncMetricCheckboxStyles();
    updateSelectedLinkDetailMetrics();
    syncAlternativeMetricVisibility();
    setInputsForRange('today');
    await loadAnalytics();

    const generateButton = document.getElementById('analytics-generate-btn');
    generateButton?.addEventListener('click', async () => {
      try {
        if (!confirm('¿Generar datos de prueba para hoy y ayer? Se reemplazarán los datos actuales.')) return;
        messageElement.textContent = 'Generando datos de prueba...';
        const testData = buildTestAnalyticsDocument();
        const payload = buildAnalyticsDocumentPayload(testData);
        const session = getStoredSession();
        const tenantId = session?.tenantId || 'futurevip';
        const analyticsRef = doc(db, 'tenants', tenantId, 'analytics', 'landing');
        //console.log('[analytics] generate button writing payload', { ref: analyticsRef.path, totals: payload.totals, visitorCount: Object.keys(payload.visitors || {}).length });
        await setDoc(analyticsRef, payload, { merge: true });
        messageElement.textContent = 'Datos de prueba generados correctamente.';
        await loadAnalytics();
      } catch (error) {
        console.error('Error generando datos de prueba:', error);
        messageElement.textContent = `Error generando datos de prueba: ${error?.message || error}`;
      }
    });

    const clearButton = document.getElementById('analytics-clear-btn');
    clearButton?.addEventListener('click', async () => {
      try {
        if (!confirm('¿Confirmás que querés borrar TODOS los datos de analytics? Esto es irreversible.')) return;
        messageElement.textContent = 'Borrando datos...';
        const empty = buildAnalyticsDocumentPayload(createEmptyAnalyticsDocument());
        const session = getStoredSession();
        const tenantId = session?.tenantId || 'futurevip';
        const analyticsRef = doc(db, 'tenants', tenantId, 'analytics', 'landing');
        //console.log('[analytics] clear button writing empty payload', { ref: analyticsRef.path, totals: empty.totals });
        await setDoc(analyticsRef, empty, { merge: true });
        messageElement.textContent = 'Datos borrados correctamente.';
        await loadAnalytics();
      } catch (error) {
        console.error('Error borrando datos de analytics:', error);
        messageElement.textContent = `Error borrando datos: ${error?.message || error}`;
      }
    });
  } catch (e) {
    console.error('[analytics] runOnLoad error', e);
  }
}

globalThis.addEventListener('load', runOnLoad);
// If the page already loaded before this module imported, run immediately
if (document.readyState === 'complete') {
  runOnLoad().catch((e) => console.error('[analytics] runOnLoad immediate error', e));
}

