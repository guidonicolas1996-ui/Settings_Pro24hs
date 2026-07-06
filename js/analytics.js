import { db } from './firebase.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

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
let visualizationToggle;
let visualizationBody;
let linksToggle;
let chartToggle;
let chartSection;
let tableToggle;
let tableSection;

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
}

const DETAIL_LABELS = {
  hour: 'Gráfico Comparativo',
  shift: 'Detalle por turno',
  day: 'Detalle por día',
  week: 'Detalle por semana',
  month: 'Detalle por mes'
};

function toLocalDateTimeString(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
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
    const chipColor = METRIC_COLOR_MAP[metricKey] || METRIC_COLORS[idx % METRIC_COLORS.length];
    label.style.setProperty('--chip-color', chipColor);
  });
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

function createRange(preset) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (preset) {
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Esta semana' };
    }
    case 'month': {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Este mes' };
    }
    case 'year': {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Este año' };
    }
    case 'all': {
      start.setTime(0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Todo el tiempo' };
    }
    default: {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, label: 'Hoy' };
    }
  }
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
  if (refreshButton) {
    refreshButton.disabled = !isCustom;
    refreshButton.setAttribute('aria-disabled', String(!isCustom));
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
    alternativeLinks: 0,
    primaryVisits: 0,
    alternativeVisits: 0,
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
      const altDetailSum = [
        (bucket.alt1Links || 0),
        (bucket.alt2Links || 0),
        (bucket.alt3Links || 0),
        (bucket.alt4Links || 0),
        (bucket.alt5Links || 0),
        (bucket.alt1Visits || 0),
        (bucket.alt2Visits || 0),
        (bucket.alt3Visits || 0),
        (bucket.alt4Visits || 0),
        (bucket.alt5Visits || 0)
      ].reduce((sum, value) => sum + value, 0);
      const useAltDetails = altDetailSum > 0;
      const sourceAlt1Links = useAltDetails ? bucket.alt1Links || 0 : bucket.alternativeLinks || 0;
      const sourceAlt2Links = useAltDetails ? bucket.alt2Links || 0 : 0;
      const sourceAlt3Links = useAltDetails ? bucket.alt3Links || 0 : 0;
      const sourceAlt4Links = useAltDetails ? bucket.alt4Links || 0 : 0;
      const sourceAlt5Links = useAltDetails ? bucket.alt5Links || 0 : 0;
      const sourceAlt1Visits = useAltDetails ? bucket.alt1Visits || 0 : bucket.alternativeVisits || 0;
      const sourceAlt2Visits = useAltDetails ? bucket.alt2Visits || 0 : 0;
      const sourceAlt3Visits = useAltDetails ? bucket.alt3Visits || 0 : 0;
      const sourceAlt4Visits = useAltDetails ? bucket.alt4Visits || 0 : 0;
      const sourceAlt5Visits = useAltDetails ? bucket.alt5Visits || 0 : 0;

      totals.uniqueVisitors += bucket.uniqueVisitors || 0;
      totals.totalVisits += bucket.totalVisits || 0;
      totals.primaryLinks += bucket.primaryLinks || 0;
      totals.alternativeLinks += bucket.alternativeLinks || 0;
      totals.primaryVisits += bucket.primaryVisits || 0;
      totals.alternativeVisits += bucket.alternativeVisits || 0;
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
        alt5Visits: sourceAlt5Visits
      });
    }
  }

  items.sort((a, b) => a.label.localeCompare(b.label));
  return { totals, items };
}

function countUniqueVisitors(visitors, rangeStart, rangeEnd) {
  return Object.values(visitors).filter((visitor) => {
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
        alternativeLinks: 0,
        primaryVisits: 0,
        alternativeVisits: 0,
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
        whatsappClicks: 0,
        whatsappClicksTotal: 0,
        sort: group.sort
      };
    }

    grouped[group.key].uniqueVisitors += item.uniqueVisitors || 0;
    grouped[group.key].totalVisits += item.totalVisits || 0;
    grouped[group.key].primaryLinks += item.primaryLinks || 0;
    grouped[group.key].alternativeLinks += item.alternativeLinks || 0;
    grouped[group.key].primaryVisits += item.primaryVisits || 0;
    grouped[group.key].alternativeVisits += item.alternativeVisits || 0;
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

  // colors are resolved per-metric using METRIC_COLOR_MAP

  items.forEach((item, index) => {
    const baseX = padding + index * (barGroupWidth + 10) + 10;
    metricList.forEach((metric, metricIndex) => {
      const value = getMetricValue(item, metric);
      const x = baseX + metricIndex * (barWidth + barGap);
      const barHeight = (value / maxValue) * (chartHeight - 20);
      const y = height - padding - barHeight;

      // use fixed color for the metric key so color doesn't depend on selection order
      chartContext.fillStyle = METRIC_COLOR_MAP[metric] || METRIC_COLORS[metricIndex % METRIC_COLORS.length];
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
      const color = METRIC_COLOR_MAP[metric] || METRIC_COLORS[metricIndex % METRIC_COLORS.length];
      return `
        <span class="analytics-legend-chip">
          <span class="analytics-legend-color" style="background:${color}"></span>
          ${METRIC_LABELS[metric] || metric}
        </span>
      `;
    })
    .join('');
}

function renderBreakdown(items) {
  if (!items.length) {
    breakdownElement.innerHTML = '<p>No hay datos en este rango.</p>';
    return;
  }

  const rows = items.map((item) => `
          <tr>
            <td>${item.label}</td>
            <td>${item.uniqueVisitors || 0}/${item.totalVisits || 0}</td>
            <td>${item.primaryLinks || 0}/${item.primaryVisits || 0}</td>
            <td>${item.alternativeLinks || 0}/${item.alternativeVisits || 0}</td>
            <td>${item.whatsappClicks || 0}/${item.whatsappClicksTotal || 0}</td>
          </tr>
        `).join('');

  breakdownElement.innerHTML = `
          <div class="analytics-breakdown-scroll">
            <table>
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Visitas</th>
                  <th>Link Principal</th>
                  <th>Link Alt.</th>
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

  uniqueEl.innerHTML = `${visitorCount}${renderCompare(visitorCount, prevVisitorCount)}`;
  totalEl.innerHTML = `${safe(totals.totalVisits)}${renderCompare(safe(totals.totalVisits), safe(prevTotals?.totalVisits))}`;
  primaryUniqueEl.innerHTML = `${safe(totals.primaryLinks)}${renderCompare(safe(totals.primaryLinks), safe(prevTotals?.primaryLinks))}`;
  primaryTotalEl.innerHTML = `${safe(totals.primaryVisits)}${renderCompare(safe(totals.primaryVisits), safe(prevTotals?.primaryVisits))}`;
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
  wppUniqueEl.innerHTML = `${safe(totals.whatsappClicks)}${renderCompare(safe(totals.whatsappClicks), safe(prevTotals?.whatsappClicks))}`;
  wppTotalEl.innerHTML = `${safe(totals.whatsappClicksTotal)}${renderCompare(safe(totals.whatsappClicksTotal), safe(prevTotals?.whatsappClicksTotal))}`;
}

const METRIC_LABELS = {
  uniqueVisitors: 'Visitas únicas',
  totalVisits: 'Visitas totales',
  primaryLinks: 'Visitas únicas link principal',
  primaryVisits: 'Visitas totales link principal',
  alternativeLinks: 'Visitas únicas link alternativo',
  alternativeVisits: 'Visitas totales link alternativo',
  whatsappClicks: 'Clicks únicos WhatsApp',
  whatsappClicksTotal: 'Clicks totales WhatsApp'
};

const METRIC_COLORS = [
'rgba(255, 43, 78, 0.85)',   // rojo
'rgba(255, 145, 66, 0.85)',    // naranja
'rgba(255, 209, 102, 0.85)',   // amarillo
'rgba(58, 239, 158, 0.85)',    // verde
'rgba(0, 190, 165, 0.85)',     // teal
'rgba(56, 163, 255, 0.85)',    // azul
'rgba(125, 108, 255, 0.85)',   // violeta
'rgba(255, 100, 178, 0.85)'     // magenta 
];

const METRIC_COLOR_MAP = {
  uniqueVisitors: METRIC_COLORS[0],
  totalVisits: METRIC_COLORS[1],
  primaryLinks: METRIC_COLORS[2],
  primaryVisits: METRIC_COLORS[3],
  alternativeLinks: METRIC_COLORS[4],
  alternativeVisits: METRIC_COLORS[5],
  whatsappClicks: METRIC_COLORS[6],
  whatsappClicksTotal: METRIC_COLORS[7]
};

async function loadAnalytics() {
  try {
    const ref = doc(db, 'analytics', 'landing');
    const snapshot = await getDoc(ref);
    const range = parseRangeInputs();
    const detailMode = detailSelect.value || 'hour';
    breakdownTitle.textContent = DETAIL_LABELS[detailMode] || DETAIL_LABELS.hour;

    if (!snapshot.exists()) {
      document.getElementById('analytics-content').innerHTML = '<p>No se encontraron datos de analytics aún.</p>';
      breakdownElement.innerHTML = '';
      return;
    }

    const data = snapshot.data() || {};
    const visitors = data.visitors && typeof data.visitors === 'object' ? data.visitors : {};
    const buckets = data.buckets && typeof data.buckets === 'object' ? data.buckets : {};
    const selectedMetrics = Array.from(metricCheckboxes.querySelectorAll('input[type="checkbox"]:checked'))
      .map((input) => input.value)
      .filter((metricKey) => Object.prototype.hasOwnProperty.call(METRIC_LABELS, metricKey));
    const metrics = selectedMetrics.length ? selectedMetrics : ['totalVisits'];
    const bucketData = collectBuckets(buckets, range.start, range.end);
    const visitorCount = countUniqueVisitors(visitors, range.start, range.end);

    // Calculate previous period (same duration immediately before current range)
    const duration = range.end.getTime() - range.start.getTime();
    const prevEnd = new Date(range.start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);
    const prevBucketData = collectBuckets(buckets, prevStart, prevEnd);
    const prevVisitorCount = countUniqueVisitors(visitors, prevStart, prevEnd);
    const detailItems = aggregateItems(bucketData.items, detailMode);

    // If for some reason buckets aggregation yields 0 for alternativeLinks but
    // the stored totals contain a value, fall back to that to avoid showing
    // a missing metric in the summary. Also log a sample for debugging.
    const storedTotals = snapshot.data()?.totals || {};
    const totalsToDisplay = { ...bucketData.totals };
    const altFields = [
      'alternativeLinks',
      'alternativeVisits',
      'alt1Links',
      'alt2Links',
      'alt3Links',
      'alt4Links',
      'alt5Links',
      'alt1Visits',
      'alt2Visits',
      'alt3Visits',
      'alt4Visits',
      'alt5Visits'
    ];

    altFields.forEach((field) => {
      if ((totalsToDisplay[field] || 0) === 0 && (storedTotals[field] || 0) > 0) {
        console.warn(`${field} aggregated as 0 from buckets; falling back to stored totals for display.`);
        totalsToDisplay[field] = storedTotals[field];
      }
    });

    if ((totalsToDisplay.alt1Links || 0) === 0 && (storedTotals.alternativeLinks || 0) > 0) {
      console.warn('alt1Links missing; using alternativeLinks for display.');
      totalsToDisplay.alt1Links = storedTotals.alternativeLinks;
    }
    if ((totalsToDisplay.alt1Visits || 0) === 0 && (storedTotals.alternativeVisits || 0) > 0) {
      console.warn('alt1Visits missing; using alternativeVisits for display.');
      totalsToDisplay.alt1Visits = storedTotals.alternativeVisits;
    }

    displayTotals(totalsToDisplay, visitorCount, prevBucketData.totals, prevVisitorCount);

    // Debug: if user reports alternativeLinks not working, log first few values
    if (metrics.includes('alternativeLinks')) {
      console.debug('alternativeLinks sample values:', detailItems.slice(0,5).map(it => ({ label: it.label, value: it.alternativeLinks || 0 })));
    }
    renderBreakdown(detailItems);

    let chartError = null;
    try {
      renderChart(detailItems, metrics);
    } catch (chartErr) {
      chartError = chartErr;
      console.error('Error rendering analytics chart:', chartErr);
    }

    const metricLabel = metrics
      .map((metricKey) => METRIC_LABELS[metricKey] || metricKey)
      .join(', ');
    renderLegend(metrics);
    const detailLabel = DETAIL_LABELS[detailMode] || DETAIL_LABELS.hour;
    messageElement.textContent = chartError
      ? `Mostrando datos desde ${formatDateTime(startInput.value)} hasta ${formatDateTime(endInput.value)} (gráfico no disponible)`
      : `Mostrando datos desde ${formatDateTime(startInput.value)} hasta ${formatDateTime(endInput.value)}`;
  } catch (error) {
    document.getElementById('analytics-content').innerHTML = '<p>Error cargando analytics.</p>';
    breakdownElement.innerHTML = '';
    messageElement.textContent = `Error cargando analytics: ${error?.message || error}`;
    console.error('Error loading analytics:', error);
  }
}

function initializeEventListeners() {
  initializeElements();
  summaryToggle = document.getElementById('summary-toggle');
  summaryBody = document.getElementById('summary-body');
  linksToggle = document.getElementById('links-toggle');
  visualizationToggle = document.getElementById('visualization-toggle');
  visualizationBody = document.getElementById('visualization-body');
  chartToggle = document.getElementById('chart-toggle');
  chartSection = document.getElementById('chart-section');
  tableToggle = document.getElementById('table-toggle');
  tableSection = document.getElementById('analytics-breakdown-section');

  updateDateInputsState();

  if (rangeSelect) {
    rangeSelect.addEventListener('change', async () => {
      updateDateInputsState();
      if (rangeSelect.value !== 'custom') {
        setInputsForRange(rangeSelect.value);
        await loadAnalytics();
        return;
      }
      if (messageElement) messageElement.textContent = 'Rango personalizado activo. Seleccioná fechas y hacé click en Mostrar.';
    });
  }

  if (detailSelect) {
    detailSelect.addEventListener('change', async () => {
      if (breakdownTitle) breakdownTitle.textContent = DETAIL_LABELS[detailSelect.value] || DETAIL_LABELS.hour;
      await loadAnalytics();
    });
  }

  metricCheckboxes?.addEventListener('change', async () => {
    syncMetricCheckboxStyles();
    await loadAnalytics();
  });

  if (refreshButton) {
    refreshButton.addEventListener('click', async () => {
      if (rangeSelect && rangeSelect.value !== 'custom') {
        return;
      }

      try {
        parseRangeInputs();
        await loadAnalytics();
      } catch (error) {
        if (messageElement && breakdownElement) {
          messageElement.textContent = error.message;
          breakdownElement.innerHTML = '';
        }
      }
    });
  }

  summaryToggle?.addEventListener('click', () => {
    if (!summaryBody) return;
    const isCollapsed = summaryBody.classList.toggle('collapsed');
    summaryToggle.setAttribute('aria-expanded', String(!isCollapsed));
    summaryToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar resumen' : 'Minimizar resumen';
  });

  visualizationToggle?.addEventListener('click', () => {
    if (!visualizationBody) return;
    const isCollapsed = visualizationBody.classList.toggle('collapsed');
    visualizationToggle.setAttribute('aria-expanded', String(!isCollapsed));
    visualizationToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar visualización' : 'Minimizar visualización';
  });

  linksToggle?.addEventListener('click', () => {
    const linksBody = document.getElementById('links-body');
    if (!linksBody) return;
    const isCollapsed = linksBody.classList.toggle('collapsed');
    linksToggle.setAttribute('aria-expanded', String(!isCollapsed));
    linksToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar links' : 'Minimizar links';
  });

  chartToggle?.addEventListener('click', () => {
    if (!chartSection) return;
    const chartBody = chartSection.querySelector('.analytics-section__body');
    if (!chartBody) return;
    const isCollapsed = chartBody.classList.toggle('collapsed');
    chartToggle.setAttribute('aria-expanded', String(!isCollapsed));
    chartToggle.querySelector('.sr-only').textContent = isCollapsed ? 'Mostrar gráfico' : 'Minimizar gráfico';
  });

  tableToggle?.addEventListener('click', () => {
    const tableBody = document.getElementById('analytics-breakdown-body');
    if (!tableBody) return;
    const isCollapsed = tableBody.classList.toggle('collapsed');
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
    setInputsForRange('today');
    await loadAnalytics();

    // Temporary: clear analytics data for testing
    const clearButton = document.getElementById('analytics-clear-btn');
    clearButton?.addEventListener('click', async () => {
      try {
        if (!confirm('¿Confirmás que querés borrar TODOS los datos de analytics? Esto es irreversible.')) return;
        messageElement.textContent = 'Borrando datos...';
        const empty = {
          totals: {
            uniqueVisitors: 0,
            totalVisits: 0,
            primaryLinks: 0,
            alternativeLinks: 0,
            primaryVisits: 0,
            alternativeVisits: 0,
            whatsappClicks: 0,
            whatsappClicksTotal: 0
          },
          visitors: {},
          buckets: {}
        };
        await setDoc(doc(db, 'analytics', 'landing'), empty);
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

