/* Configuración principal de textos y destino del botón */
let landingContent = {
  accessBadge: 'ACCESO VIP',
  heroTitle: 'BIENVENIDO A TU <span class="gradient-text">CASINO DE CONFIANZA</span>',
  heroCopy: 'Escribinos apretando el botón de abajo',
  promoLabel: 'PARA USUARIOS NUEVOS',
  promoTitle: '<span class="gradient-text">EXTRA</span> DE BONO EN TU <span class="gradient-text">PRIMERA CARGA</span>',
  promoNote: 'CARGAS Y RETIROS AL INSTANTE',
  ctaLabel: 'CARGANDO PROMOCIÓN...',
  helperText: 'CARGAS Y RETIROS AL INSTANTE',
  footerText1: 'Bono no extraíble, válido solo para slots. Mínimo de carga: $2.000.',
  footerText2: 'Advertencia de juego responsable (+18) - © 2026',
  whatsappUrl: ''
};

const MAX_CASINOS = 5;
const BACKGROUND_IMAGES = [
  '/img/background1.png',
  '/img/background2.png',
  '/img/background3.png',
  '/img/background4.png',
  '/img/background5.png',
  '/img/background6.png',
  '/img/background7.png',
  '/img/background8.png',
  '/img/background9.png',
  '/img/background10.png'
];
const LOCAL_STORAGE_CASINOS_KEY = 'dynamicCasinos';
const USE_REMOTE_STORAGE = typeof window !== 'undefined' && window.location.protocol !== 'file:';

let dynamicCasinos = {};
let dynamicCasinoOrder = [];

// Cache para optimizar llamadas a Firebase
let remoteConfigCache = null;
let remoteConfigCacheTime = 0;
const REMOTE_CONFIG_CACHE_TTL = 30000; // 30 segundos

// Firebase
let firebaseServices = null;

// Pre-iniciar carga de Firebase services para tener listo antes de DOMContentLoaded
const firebaseServicesReady = (async () => {
  try {
    const [{ db }, firestore] = await Promise.all([
      import("./firebase.js"),
      import("https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js")
    ]);

    firebaseServices = {
      db,
      ...firestore
    };

    return firebaseServices;
  } catch (error) {
    console.warn('Error pre-cargando Firebase services:', error);
    return null;
  }
})();

// Función para obtener Firebase services (espera a que esté pre-cargado)
async function ensureFirebaseServices() {
  if (firebaseServices) {
    return firebaseServices;
  }
  // Esperar a que la pre-inicialización termine
  await firebaseServicesReady;
  return firebaseServices;
}

// Configuración de Cloudinary. Debes reemplazar estos valores con tu cuenta y preset de carga.
const CLOUDINARY_CLOUD_NAME = "efcbsldh"; // ej: 'mi-cuenta'
const CLOUDINARY_UPLOAD_PRESET = "casinos"; // preset público de subida sin firma (fallback)
const CLOUDINARY_UPLOAD_PRESET_LOGO = "casinos_logo"; // opcional: preset público para logos (ej: 'casinos_logo')
const CLOUDINARY_UPLOAD_PRESET_MASCOT = "casinos_mascot"; // opcional: preset público para mascotas (ej: 'casinos_mascot')
const CLOUDINARY_FOLDER = "casinos";
const FIRESTORE_COLLECTION = "config";
const FIRESTORE_DOCUMENT = "landing";
const ANALYTICS_COLLECTION = "analytics";
const ANALYTICS_DOCUMENT = "landing";

// If you prefer server-side/signed uploads you could still send a 'transformation' param.
// For unsigned uploads Cloudinary rejects the 'transformation' parameter, so we rely
// on per-type Upload Presets (recommended) to enforce incoming transformations.

// Generador de variaciones de color
function generateColorVariations(baseColor) {
  const rgb = hexToRgb(baseColor);
  if (!rgb) {
    return {
      light: baseColor,
      medium: baseColor,
      dark: baseColor
    };
  }
  
  const light = rgbToHex(Math.min(rgb.r + 80, 255), Math.min(rgb.g + 80, 255), Math.min(rgb.b + 80, 255));
  const dark = rgbToHex(Math.max(rgb.r - 60, 0), Math.max(rgb.g - 60, 0), Math.max(rgb.b - 60, 0));
  
  return {
    light: light,
    medium: baseColor,
    dark: dark
  };
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

// Funciones de almacenamiento dinámico de casinos
function dataURLtoBlob(dataURL) {
  const [header, base64] = dataURL.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getLocalDynamicCasinos() {
  try {
    const stored = localStorage.getItem('dynamicCasinos');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Error leyendo casinos locales de localStorage:', error);
    return {};
  }
}

function setLocalDynamicCasinos(casinos) {
  try {
    localStorage.setItem('dynamicCasinos', JSON.stringify(casinos || {}));
  } catch (error) {
    console.warn('Error guardando casinos locales en localStorage:', error);
  }
}

async function uploadImageFile(source, casinoId, type) {
  if (typeof source === 'string' && !source.startsWith('data:')) {
    return { url: source, deleteToken: null };
  }

  if (!USE_REMOTE_STORAGE || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    const url = source instanceof File ? await fileToDataURL(source) : source;
    return { url, deleteToken: null };
  }

  const originalMime = source instanceof File ? source.type : (source.match(/^data:(image\/[^;]+);/) || [])[1] || 'image/jpeg';
  const fileBlob = source instanceof File ? source : dataURLtoBlob(source);
  const fileName = originalMime === 'image/png' ? `${type}.png` : `${type}.jpg`;

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const doUpload = async (includeDeleteToken = true) => {
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    // Use per-type preset if provided, otherwise fallback to generic preset
    const presetForType = (type === 'logo' && CLOUDINARY_UPLOAD_PRESET_LOGO) ? CLOUDINARY_UPLOAD_PRESET_LOGO
      : (type === 'mascot' && CLOUDINARY_UPLOAD_PRESET_MASCOT) ? CLOUDINARY_UPLOAD_PRESET_MASCOT
      : CLOUDINARY_UPLOAD_PRESET;
    formData.append('upload_preset', presetForType);
    formData.append('folder', `${CLOUDINARY_FOLDER}/${casinoId}`);
    formData.append('public_id', `${type}-${Date.now()}`);
    formData.append('resource_type', 'image');
    if (includeDeleteToken) {
      formData.append('return_delete_token', 'true');
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.debug('Cloudinary upload result', { type, presetForType, result });
    return {
      url: result.secure_url || result.url,
      deleteToken: result.delete_token || null
    };
  };

  try {
    return await doUpload(true);
  } catch (error) {
    const errorText = (error.message || '').toLowerCase();
    if (errorText.includes('return delete token') || errorText.includes('return_delete_token') || errorText.includes('delete token')) {
      console.warn('Cloudinary upload falló por delete token; reintentando sin token:', { casinoId, type, error });
      return await doUpload(false);
    }
    console.error('Cloudinary upload falló y no se realizará fallback base64 en modo remoto:', { source, casinoId, type, error });
    throw error;
  }
}

function getImageUrl(imageRecord) {
  return typeof imageRecord === 'string'
    ? imageRecord
    : (imageRecord && imageRecord.url)
      ? imageRecord.url
      : null;
}

function getImageDeleteToken(imageRecord) {
  return typeof imageRecord === 'string'
    ? null
    : (imageRecord && imageRecord.deleteToken)
      ? imageRecord.deleteToken
      : null;
}

function getDeviceMetadata(ip) {
  return {
    ip: ip || 'unknown',
    userAgent: navigator.userAgent || 'unknown',
    platform: navigator.platform || 'unknown',
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language || 'unknown'
  };
}

function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function getVisitorFingerprint(ip) {
  const text = `${ip}|${navigator.userAgent}|${navigator.platform}|${window.screen.width}x${window.screen.height}|${navigator.language}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return bufferToHex(hashBuffer);
}

function getBucketKeys(date = new Date()) {
  const local = new Date(date);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  const hour = String(local.getHours()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;
  const hourKey = hour;
  return { dateKey, hourKey, bucketKey: `${dateKey}:${hourKey}` };
}

let activeAnalyticsSource = 'primary';

function normalizeAnalyticsSource(rawSource) {
  const srcParam = String(rawSource ?? '').trim().toLowerCase();
  const primarySources = new Set(['', 'primary', 'main', 'principal']);
  if (primarySources.has(srcParam)) {
    return 'primary';
  }

  const altMatch = srcParam.match(/^alt(?:[_-]?([1-5]))?$/);
  if (altMatch) {
    return altMatch[1] ? `alt${altMatch[1]}` : 'alt1';
  }

  const legacyAltMatch = srcParam.match(/^alternative(?:[_-]?([1-5]))?$/);
  if (legacyAltMatch) {
    return legacyAltMatch[1] ? `alt${legacyAltMatch[1]}` : 'alt1';
  }

  return 'primary';
}

function hydrateAnalyticsSourceFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const srcParamRaw = params.get('src') || '';
  const source = normalizeAnalyticsSource(srcParamRaw);
  activeAnalyticsSource = source;

  if (params.has('src')) {
    params.delete('src');
    const url = new URL(window.location.href);
    url.search = params.toString() ? `?${params.toString()}` : '';
    const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
    if (window.location.pathname + window.location.search + window.location.hash !== cleanUrl) {
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  return activeAnalyticsSource;
}

function getActiveAnalyticsSource() {
  return activeAnalyticsSource || 'primary';
}

function getAnalyticsSourceKeys(source) {
  if (source === 'alt1') {
    return { sourceCountKey: 'alt1Links', sourceTotalKey: 'alt1Visits', isAlternative: true };
  }
  if (source === 'alt2') {
    return { sourceCountKey: 'alt2Links', sourceTotalKey: 'alt2Visits', isAlternative: true };
  }
  if (source === 'alt3') {
    return { sourceCountKey: 'alt3Links', sourceTotalKey: 'alt3Visits', isAlternative: true };
  }
  if (source === 'alt4') {
    return { sourceCountKey: 'alt4Links', sourceTotalKey: 'alt4Visits', isAlternative: true };
  }
  if (source === 'alt5') {
    return { sourceCountKey: 'alt5Links', sourceTotalKey: 'alt5Visits', isAlternative: true };
  }

  return { sourceCountKey: 'primaryLinks', sourceTotalKey: 'primaryVisits', isAlternative: false };
}

function getAnalyticsSourceWhatsappKeys(source) {
  if (source === 'alt1') {
    return { sourceUniqueKey: 'alt1WhatsappClicks', sourceTotalKey: 'alt1WhatsappClicksTotal' };
  }
  if (source === 'alt2') {
    return { sourceUniqueKey: 'alt2WhatsappClicks', sourceTotalKey: 'alt2WhatsappClicksTotal' };
  }
  if (source === 'alt3') {
    return { sourceUniqueKey: 'alt3WhatsappClicks', sourceTotalKey: 'alt3WhatsappClicksTotal' };
  }
  if (source === 'alt4') {
    return { sourceUniqueKey: 'alt4WhatsappClicks', sourceTotalKey: 'alt4WhatsappClicksTotal' };
  }
  if (source === 'alt5') {
    return { sourceUniqueKey: 'alt5WhatsappClicks', sourceTotalKey: 'alt5WhatsappClicksTotal' };
  }

  return { sourceUniqueKey: 'primaryWhatsappClicks', sourceTotalKey: 'primaryWhatsappClicksTotal' };
}

function ensureBucket(current, dateKey, hourKey) {
  current.buckets = current.buckets || {};
  current.buckets[dateKey] = current.buckets[dateKey] || {};
  current.buckets[dateKey][hourKey] = current.buckets[dateKey][hourKey] || {};
  const bucket = current.buckets[dateKey][hourKey];
  const template = {
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

  Object.keys(template).forEach((key) => {
    if (bucket[key] == null) {
      bucket[key] = template[key];
    }
  });

  return bucket;
}

function ensureAnalyticsTotals(totals) {
  const template = {
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

  Object.keys(template).forEach((key) => {
    if (totals[key] == null) {
      totals[key] = template[key];
    }
  });
}

async function getIpAddress() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeout);
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

async function getPersistentVisitorId() {
  try {
    let visitorId = localStorage.getItem('visitorId');
    if (visitorId) {
      return visitorId;
    }

    const ip = await getIpAddress();
    visitorId = await getVisitorFingerprint(ip);
    localStorage.setItem('visitorId', visitorId);
    return visitorId;
  } catch (error) {
    return await getVisitorFingerprint('unknown');
  }
}

async function registerAnalyticsVisit() {
  const { db, doc, runTransaction } = await ensureFirebaseServices();
  const visitorId = await getPersistentVisitorId();
  const ip = await getIpAddress();
  const device = getDeviceMetadata(ip);
  const source = getActiveAnalyticsSource();
  const { sourceCountKey, sourceTotalKey, isAlternative } = getAnalyticsSourceKeys(source);

  console.log('[analytics] registerAnalyticsVisit src:', { source, sourceCountKey, sourceTotalKey, isAlternative });
  const timestamp = new Date().toISOString();
  const currentHour = timestamp.slice(0, 13);
  const analyticsRef = doc(db, ANALYTICS_COLLECTION, ANALYTICS_DOCUMENT);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(analyticsRef);
    const current = snapshot.exists() ? snapshot.data() : {
      totals: {
        uniqueVisitors: 0,
        totalVisits: 0,
        primaryLinks: 0,
        primaryVisits: 0,
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
      },
      visitors: {},
      buckets: {}
    };

    ensureAnalyticsTotals(current.totals);

    const visitors = current.visitors || {};
    const existing = visitors[visitorId];
    const isNewVisitor = !existing;
    const previousSourceCount = existing?.sources?.[source] || 0;
    // debug logs to help verify per-source counting behavior
    console.debug('registerAnalyticsVisit: before update', { visitorId, source, previousSourceCount, existingSources: existing?.sources });
    const sameHour = existing?.lastSeen?.slice(0, 13) === currentHour;

    if (isNewVisitor) {
      current.totals.uniqueVisitors += 1;
    }
    // increment per-source unique total the first time this visitor uses that source,
    // regardless of whether it's the same hour as previous activity. This ensures
    // primary and alternative unique counts are independent.
    if (previousSourceCount === 0) {
      current.totals[sourceCountKey] = (current.totals[sourceCountKey] || 0) + 1;
    }

    const updated = {
      ...existing,
      ...device,
      firstSeen: existing?.firstSeen || timestamp,
      lastSeen: timestamp,
      visits: (existing?.visits || 0) + 1,
      sources: {
        ...(existing?.sources || {}),
        [source]: (existing?.sources?.[source] || 0) + 1
      },
      whatsappClicked: existing?.whatsappClicked || false,
      lastSource: source
    };

    visitors[visitorId] = updated;
    current.visitors = visitors;
    console.debug('registerAnalyticsVisit: after update', { visitorId, updatedSources: updated.sources });
    current.totals.totalVisits = (current.totals.totalVisits || 0) + 1;
    current.totals[sourceTotalKey] = (current.totals[sourceTotalKey] || 0) + 1;

    const { dateKey, hourKey } = getBucketKeys(new Date(timestamp));
    const bucket = ensureBucket(current, dateKey, hourKey);
    bucket.totalVisits = (bucket.totalVisits || 0) + 1;
    bucket[sourceTotalKey] = (bucket[sourceTotalKey] || 0) + 1;
    if (!sameHour) {
      bucket.uniqueVisitors += 1;
    }
    // For per-source unique counts within the bucket, increment if this visitor
    // has not used this source before.
    if (previousSourceCount === 0) {
      bucket[sourceCountKey] = (bucket[sourceCountKey] || 0) + 1;
    }
    current.buckets[dateKey][hourKey] = bucket;

    transaction.set(analyticsRef, current);
  });
}

async function registerAnalyticsWhatsappClick() {
  const { db, doc, runTransaction } = await ensureFirebaseServices();
  const visitorId = await getPersistentVisitorId();
  const ip = await getIpAddress();
  const device = getDeviceMetadata(ip);
  const source = getActiveAnalyticsSource();
  const { sourceUniqueKey, sourceTotalKey } = getAnalyticsSourceWhatsappKeys(source);
  const timestamp = new Date().toISOString();
  const currentHour = timestamp.slice(0, 13);
  const analyticsRef = doc(db, ANALYTICS_COLLECTION, ANALYTICS_DOCUMENT);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(analyticsRef);
    const current = snapshot.exists() ? snapshot.data() : {
      totals: {
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
      },
      visitors: {},
      buckets: {}
    };

    const visitors = current.visitors || {};
    const existing = visitors[visitorId];
    const whatsappAlready = existing?.whatsappClicked || false;
    const sameHourClick = existing?.lastWhatsappClickHour === currentHour;
    const previousSourceClickCount = existing?.whatsappSources?.[source] || 0;

    if (!whatsappAlready) {
      current.totals.whatsappClicks = (current.totals.whatsappClicks || 0) + 1;
    }
    current.totals.whatsappClicksTotal = (current.totals.whatsappClicksTotal || 0) + 1;
    if (previousSourceClickCount === 0) {
      current.totals[sourceUniqueKey] = (current.totals[sourceUniqueKey] || 0) + 1;
    }
    current.totals[sourceTotalKey] = (current.totals[sourceTotalKey] || 0) + 1;

    const updated = {
      ...existing,
      ...device,
      firstSeen: existing?.firstSeen || timestamp,
      lastSeen: timestamp,
      visits: existing?.visits || 0,
      sources: existing?.sources || {},
      whatsappClicked: true,
      whatsappSources: {
        ...(existing?.whatsappSources || {}),
        [source]: (existing?.whatsappSources?.[source] || 0) + 1
      },
      lastSource: source,
      lastWhatsappClickHour: currentHour
    };

    visitors[visitorId] = updated;
    current.visitors = visitors;

    const { dateKey, hourKey } = getBucketKeys(new Date(timestamp));
    const bucket = ensureBucket(current, dateKey, hourKey);
    bucket.whatsappClicksTotal = (bucket.whatsappClicksTotal || 0) + 1;
    if (!sameHourClick) {
      bucket.whatsappClicks += 1;
    }
    if (previousSourceClickCount === 0) {
      bucket[sourceUniqueKey] = (bucket[sourceUniqueKey] || 0) + 1;
    }
    bucket[sourceTotalKey] = (bucket[sourceTotalKey] || 0) + 1;
    current.buckets = current.buckets || {};
    current.buckets[dateKey][hourKey] = bucket;

    transaction.set(analyticsRef, current);
  });
}

async function deleteCloudinaryImage(deleteToken) {
  if (!deleteToken || !USE_REMOTE_STORAGE || !CLOUDINARY_CLOUD_NAME) {
    return false;
  }

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/delete_by_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ token: deleteToken })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary delete failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return result.result === 'ok' || result.result === 'deleted';
  } catch (error) {
    console.warn('Error borrando imagen Cloudinary:', error);
    return false;
  }
}

async function loadDynamicCasinos() {
  const localCasinos = getLocalDynamicCasinos();

  if (localCasinos && typeof localCasinos === 'object' && Object.keys(localCasinos).length) {
    dynamicCasinos = localCasinos;
    try {
      const order = JSON.parse(localStorage.getItem(LOCAL_STORAGE_CASINOS_KEY + ':order') || 'null');
      if (Array.isArray(order)) dynamicCasinoOrder = order;
    } catch (e) {}
    return dynamicCasinos;
  }

  if (!USE_REMOTE_STORAGE) {
    dynamicCasinos = localCasinos;
    return dynamicCasinos;
  }

  try {
    const { db, doc, getDoc } = await ensureFirebaseServices();
    const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT));
    const config = snapshot.exists() ? snapshot.data() : {};
    dynamicCasinos = config.casinos || getLocalDynamicCasinos();
    if (!dynamicCasinos || typeof dynamicCasinos !== 'object') {
      dynamicCasinos = getLocalDynamicCasinos();
    }
    // load persisted order if present
    if (config.casinoOrder && Array.isArray(config.casinoOrder)) {
      dynamicCasinoOrder = config.casinoOrder;
    } else {
      // fallback: build order from keys (preserve previous behavior)
      dynamicCasinoOrder = Object.keys(dynamicCasinos || {}).sort((a, b) => {
        const aNum = parseInt((a.match(/(\d+)$/) || [])[0] || a, 10);
        const bNum = parseInt((b.match(/(\d+)$/) || [])[0] || b, 10);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
          return aNum - bNum;
        }
        return a.localeCompare(b);
      });
    }
    return dynamicCasinos;
  } catch (error) {
    console.warn('Error cargando casinos desde Firebase, usando localStorage como fallback:', error);
    dynamicCasinos = getLocalDynamicCasinos();
    return dynamicCasinos;
  }
}

async function saveDynamicCasinos() {
  console.debug('saveDynamicCasinos start', { dynamicCasinos });
  setLocalDynamicCasinos(dynamicCasinos);
  try {
    // persist order locally as well
    localStorage.setItem(LOCAL_STORAGE_CASINOS_KEY + ':order', JSON.stringify(dynamicCasinoOrder || []));
  } catch (e) {}

  if (!USE_REMOTE_STORAGE) {
    return;
  }

  try {
    const { db, doc, getDoc, setDoc } = await ensureFirebaseServices();
    const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT));
    const currentConfig = snapshot.exists() ? snapshot.data() : {};
    const newConfig = {
      ...currentConfig,
      casinos: dynamicCasinos,
      casinoOrder: dynamicCasinoOrder
    };
    await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT), newConfig);
    console.debug('saveDynamicCasinos success', { newConfig });
  } catch (error) {
    console.error('Error guardando casinos dinámicos en Firebase:', error);
    throw error;
  }
}

async function addCasino(id, name, logo, mascot, color) {
  const casinoId = id || `casino_${Date.now()}`;
  console.debug('addCasino start', { casinoId, id, name, color, hasLogo: !!logo, hasMascot: !!mascot });
  let logoRecord = logo;
  let mascotRecord = mascot;

  if (logo && (logo instanceof File || (typeof logo === 'string' && logo.startsWith('data:')))) {
    logoRecord = await uploadImageFile(logo, casinoId, 'logo');
  }
  if (mascot && (mascot instanceof File || (typeof mascot === 'string' && mascot.startsWith('data:')))) {
    mascotRecord = await uploadImageFile(mascot, casinoId, 'mascot');
  }

  const existing = dynamicCasinos[casinoId] || {};
  const active = existing.active || false;

  const logoUrl = typeof logoRecord === 'object' ? logoRecord.url : logoRecord;
  const mascotUrl = typeof mascotRecord === 'object' ? mascotRecord.url : mascotRecord;

  dynamicCasinos[casinoId] = {
    label: name,
    logo: logoUrl,
    logoDeleteToken: typeof logoRecord === 'object' ? logoRecord.deleteToken : existing.logoDeleteToken || null,
    mascot: mascotUrl,
    mascotDeleteToken: typeof mascotRecord === 'object' ? mascotRecord.deleteToken : existing.mascotDeleteToken || null,
    color: color,
    active: active
  };

  if (!dynamicCasinoOrder.includes(casinoId)) {
    dynamicCasinoOrder.push(casinoId);
  }

  await saveDynamicCasinos();
  console.debug('addCasino done', { casinoId, casino: dynamicCasinos[casinoId], order: dynamicCasinoOrder });
  return casinoId;
}

async function removeCasino(casinoId) {
  const casino = dynamicCasinos[casinoId];
  if (casino) {
    const logoDeleteToken = casino.logoDeleteToken || null;
    const mascotDeleteToken = casino.mascotDeleteToken || null;

    delete dynamicCasinos[casinoId];
    await saveDynamicCasinos();

    if (logoDeleteToken) {
      await deleteCloudinaryImage(logoDeleteToken).catch((error) => console.warn('Error borrando logo Cloudinary:', error));
    }
    if (mascotDeleteToken) {
      await deleteCloudinaryImage(mascotDeleteToken).catch((error) => console.warn('Error borrando mascot Cloudinary:', error));
    }
  } else {
    delete dynamicCasinos[casinoId];
    await saveDynamicCasinos();
  }
}

async function updateCasinoActive(casinoId, active) {
  if (dynamicCasinos[casinoId]) {
    dynamicCasinos[casinoId].active = active;
    await saveDynamicCasinos();
  }
}

async function getRemoteConfig() {
  // Usar caché si está disponible y aún es válido
  if (remoteConfigCache && (Date.now() - remoteConfigCacheTime) < REMOTE_CONFIG_CACHE_TTL) {
    return remoteConfigCache;
  }

  try {
    const { db, doc, getDoc } = await ensureFirebaseServices();
    const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT));
    const data = snapshot.exists() ? snapshot.data() : null;
    
    // Actualizar caché
    remoteConfigCache = data;
    remoteConfigCacheTime = Date.now();
    
    return data;
  } catch (error) {
    console.error("Error leyendo configuración remota de Firebase:", error);
    // Retornar caché antiguo si falla (aunque esté expirado)
    return remoteConfigCache;
  }
}

function getThemesFromConfig(config) {
  if (!config || !config.casinos) return null;

  const activeCasinos = Object.entries(config.casinos)
    .filter(([, casino]) => casino && casino.active)
    .map(([id]) => id)
    .sort((a, b) => {
      const aNum = parseInt((a.match(/(\d+)$/) || [])[0] || a, 10);
      const bNum = parseInt((b.match(/(\d+)$/) || [])[0] || b, 10);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });

  return activeCasinos.length ? activeCasinos : null;
}

function setCheckboxStates(activeCasinoIds) {
  const checkboxInputs = document.querySelectorAll('input[name="theme-select"][type="checkbox"]');
  if (!checkboxInputs.length) return;

  checkboxInputs.forEach((input) => {
    input.checked = activeCasinoIds.includes(input.value);
  });
}

function getSortedCasinoIds() {
  // If we have a persisted order array, use it (filter to existing ids)
  if (Array.isArray(dynamicCasinoOrder) && dynamicCasinoOrder.length) {
    return dynamicCasinoOrder.filter(id => dynamicCasinos[id]);
  }

  return Object.keys(dynamicCasinos).sort((a, b) => {
    const aNum = parseInt((a.match(/(\d+)$/) || [])[0] || a, 10);
    const bNum = parseInt((b.match(/(\d+)$/) || [])[0] || b, 10);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return aNum - bNum;
    }
    return a.localeCompare(b);
  });
}

function getActiveCasinos() {
  return getSortedCasinoIds().filter(id => dynamicCasinos[id].active);
}

function getDefaultCasino() {
  const activeCasinos = getActiveCasinos();
  return activeCasinos.length ? activeCasinos[0] : getSortedCasinoIds()[0] || 'casino_1';
}

function getStoredActiveCasino() {
  const activeCasinos = getActiveCasinos();
  return activeCasinos.length ? activeCasinos[0] : getSortedCasinoIds()[0] || 'casino_1';
}

function getStoredActiveCasinos() {
  return getActiveCasinos() || [];
}

let activeThemes = [];
let activeTheme = '';
let rotationTimerId = null;

function setStoredActiveCasino(casinoId) {
  // Se maneja a través de dynamicCasinos
}

function setStoredActiveCasinos(casinoIds) {
  // Se maneja a través de dynamicCasinos
}

async function setActiveCasinos(casinoIds) {
  const normalized = casinoIds.filter(id => dynamicCasinos[id]);
  const finalCasinos = normalized.length ? normalized : [getDefaultCasino()];
  
  activeThemes = finalCasinos;
  activeTheme = finalCasinos[0];
  setStoredActiveCasinos(finalCasinos);
  setStoredActiveCasino(activeTheme);
  
  // Actualizar estado en dynamicCasinos
  Object.keys(dynamicCasinos).forEach(id => {
    dynamicCasinos[id].active = finalCasinos.includes(id);
  });

  try {
    await saveDynamicCasinos();
  } catch (error) {
    console.warn('Error guardando estado activo de casinos:', error);
  }
  
  return activeTheme;
}

function renderContent() {
  const accessBadge = document.getElementById('access-badge');
  const heroTitle = document.getElementById('hero-title');
  const heroCopy = document.getElementById('hero-copy');
  const ctaLabel = document.getElementById('cta-label');
  const helperText = document.getElementById('helper-text');
  const footerText1 = document.getElementById('footer-text1');
  const footerText2 = document.getElementById('footer-text2');
  const promoLabel = document.getElementById('promoLabel');
  const promoTitle = document.getElementById('promoTitle');
  const promoNote = document.getElementById('promoNote');

  if (accessBadge) accessBadge.textContent = landingContent.accessBadge;
  if (heroTitle) heroTitle.innerHTML = landingContent.heroTitle;
  if (heroCopy) heroCopy.textContent = landingContent.heroCopy;
  if (promoLabel) promoLabel.textContent = landingContent.promoLabel;
  if (promoTitle) promoTitle.innerHTML = landingContent.promoTitle;
  if (promoNote) promoNote.textContent = landingContent.promoNote;
  if (ctaLabel) ctaLabel.textContent = landingContent.ctaLabel;
  if (helperText) helperText.textContent = landingContent.helperText;
  if (footerText1) footerText1.textContent = landingContent.footerText1;
  if (footerText2) footerText2.textContent = landingContent.footerText2;
}

function getStoredLandingContent() {
  return null;
}

function setStoredLandingContent(content) {
  // Local storage is disabled for configuration; toda la configuración se guarda en Firebase.
}

function getLandingContent() {
  return landingContent;
}

function setLandingContent(content, saveRemote = true) {
  landingContent = Object.assign({}, landingContent, content || {});
  renderContent();
  if (saveRemote && typeof saveRemoteConfig === 'function') {
    saveRemoteConfig({ landingContent }).catch((e) => console.warn('Error guardando landingContent remoto', e));
  }
  try {
    window.dispatchEvent(new CustomEvent('landingContent:ready', { detail: landingContent }));
  } catch (e) {
    // ignore
  }
  return landingContent;
}

function getCarouselItems(carouselId, hasMascot = true) {
  const carousel = document.getElementById(carouselId);
  if (!carousel) return null;
  const hasLogo = !hasMascot;

  const createItem = (id, cssClass, ariaHidden = false) => {
    const item = document.createElement('div');
    item.id = id;
    item.className = `mascot-carousel__item ${cssClass}`;
    item.alt = '';
    if (ariaHidden) {
      item.setAttribute('aria-hidden', 'true');
    }

    if (hasLogo) {
      const logo = document.createElement('img');
      logo.className = 'mascot-carousel__logo';
      logo.alt = '';
      item.appendChild(logo);
    }

    if (hasMascot) {
      const mascot = document.createElement('img');
      mascot.className = 'hero-header__mascot mascot-carousel__image';
      mascot.alt = '';
      item.appendChild(mascot);
    }

    return item;
  };

  const left = document.getElementById(`${carouselId === 'mascot-carousel' ? 'mascot' : 'logo'}-left`);
  const center = document.getElementById(`${carouselId === 'mascot-carousel' ? 'active-mascot' : 'active-logo'}`);
  const right = document.getElementById(`${carouselId === 'mascot-carousel' ? 'mascot' : 'logo'}-right`);
  const hidden1 = document.getElementById(`${carouselId === 'mascot-carousel' ? 'mascot-hidden-1' : 'logo-hidden-1'}`);
  const hidden2 = document.getElementById(`${carouselId === 'mascot-carousel' ? 'mascot-hidden-2' : 'logo-hidden-2'}`);

  const ensureMascotImage = (item) => {
    if (!hasMascot) return null;
    let mascot = item.querySelector('.mascot-carousel__image');
    if (!mascot) {
      mascot = document.createElement('img');
      mascot.className = 'hero-header__mascot mascot-carousel__image';
      mascot.alt = '';
      item.appendChild(mascot);
    }

    if (!mascot.getAttribute('data-default-src')) {
      mascot.setAttribute('data-default-src', mascot.getAttribute('src') || '/img/mascot.png');
    }

    return mascot;
  };

  const ensureLogoImage = (item) => {
    let logo = item.querySelector('.mascot-carousel__logo');
    if (!logo) {
      logo = document.createElement('img');
      logo.className = 'mascot-carousel__logo';
      logo.alt = '';
      item.insertBefore(logo, item.firstChild);
    }

    if (!logo.getAttribute('data-default-src')) {
      logo.setAttribute('data-default-src', logo.getAttribute('src') || '/img/logo_view.png');
    }

    return logo;
  };

  const ensureItem = (existing, id, cssClass, ariaHidden) => {
    if (existing) return existing;
    const item = createItem(id, cssClass, ariaHidden);
    carousel.appendChild(item);
    return item;
  };

  const leftItem = ensureItem(left, `${carouselId === 'mascot-carousel' ? 'mascot' : 'logo'}-left`, 'mascot-carousel__item--left', true);
  const centerItem = ensureItem(center, `${carouselId === 'mascot-carousel' ? 'active-mascot' : 'active-logo'}`, 'mascot-carousel__item--center');
  const rightItem = ensureItem(right, `${carouselId === 'mascot-carousel' ? 'mascot' : 'logo'}-right`, 'mascot-carousel__item--right', true);
  const hidden1Item = ensureItem(hidden1, `${carouselId === 'mascot-carousel' ? 'mascot-hidden-1' : 'logo-hidden-1'}`, 'mascot-carousel__item--hidden', true);
  const hidden2Item = ensureItem(hidden2, `${carouselId === 'mascot-carousel' ? 'mascot-hidden-2' : 'logo-hidden-2'}`, 'mascot-carousel__item--hidden', true);

  [leftItem, centerItem, rightItem, hidden1Item, hidden2Item].forEach((item) => {
    if (hasMascot) {
      ensureMascotImage(item);
    }
    if (!hasMascot) {
      ensureLogoImage(item);
    }
  });

  return { left: leftItem, center: centerItem, right: rightItem, hidden1: hidden1Item, hidden2: hidden2Item };
}

function getMascotCarouselItems() {
  return getCarouselItems('mascot-carousel', true);
}

function updateMascotCarousel(casinoId, carouselId = 'mascot-carousel', hasMascot = true, animate = true) {
  const themeIds = Array.isArray(activeThemes) && activeThemes.length
    ? activeThemes
    : [casinoId || getDefaultCasino()];

  if (!themeIds.length) return;

  const items = getCarouselItems(carouselId, hasMascot);
  if (!items) return;

  const { left, center, right, hidden1, hidden2 } = items;

  const currentThemeId = casinoId || activeTheme || themeIds[0];
  const currentIndex = themeIds.indexOf(currentThemeId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const count = themeIds.length;
  const loopedThemeIds = count === 2 ? [...themeIds, ...themeIds] : themeIds;

  const normalizeIndex = (index, length) => ((index % length) + length) % length;
  const getThemeAtOffset = (baseIndex, offset) => {
    if (count === 1) return themeIds[0];
    const normalizedIndex = normalizeIndex(baseIndex + offset, loopedThemeIds.length);
    return loopedThemeIds[normalizedIndex];
  };

  const previousThemeId = center.getAttribute('data-casino-id') || currentThemeId;
  const previousIndex = themeIds.indexOf(previousThemeId);
  const isNextStep = previousIndex >= 0 && normalizeIndex(safeIndex - previousIndex, count) === 1;
  const shouldAnimate = animate && previousThemeId && previousThemeId !== currentThemeId && count > 1 && isNextStep;

  const currentSlotThemes = {
    hidden1: getThemeAtOffset(previousIndex >= 0 ? previousIndex : safeIndex, 2),
    left: getThemeAtOffset(previousIndex >= 0 ? previousIndex : safeIndex, -1),
    center: getThemeAtOffset(previousIndex >= 0 ? previousIndex : safeIndex, 0),
    right: getThemeAtOffset(previousIndex >= 0 ? previousIndex : safeIndex, 1),
    hidden2: getThemeAtOffset(previousIndex >= 0 ? previousIndex : safeIndex, 3)
  };

  const nextSlotThemes = {
    hidden1: getThemeAtOffset(safeIndex, 2),
    left: getThemeAtOffset(safeIndex, -1),
    center: getThemeAtOffset(safeIndex, 0),
    right: getThemeAtOffset(safeIndex, 1),
    hidden2: getThemeAtOffset(safeIndex, 3)
  };

  const applyImagesForTheme = (item, themeId) => {
    const logo = item.querySelector('.mascot-carousel__logo');
    const mascot = hasMascot ? item.querySelector('.mascot-carousel__image') : null;
    const logoFallbackUrl = logo?.getAttribute('data-default-src') || logo?.getAttribute('src') || '/img/logo_view.png';
    const logoUrl = getImageUrl(dynamicCasinos[themeId]?.logo) || logoFallbackUrl;

    if (logo && !hasMascot) {
      logo.src = logoUrl;
      logo.alt = dynamicCasinos[themeId]?.label || '';
      logo.setAttribute('data-casino-id', themeId);
    }

    if (mascot) {
      const mascotFallbackUrl = mascot?.getAttribute('data-default-src') || mascot?.getAttribute('src') || '/img/mascot.png';
      const mascotUrl = getImageUrl(dynamicCasinos[themeId]?.mascot) || mascotFallbackUrl;
      mascot.src = mascotUrl;
      mascot.alt = dynamicCasinos[themeId]?.label || '';
      mascot.setAttribute('data-casino-id', themeId);
    }

    item.setAttribute('data-casino-id', themeId);
  };

  const removeStateClasses = (item) => {
    item.classList.remove(
      'mascot-carousel__item--left',
      'mascot-carousel__item--center',
      'mascot-carousel__item--right',
      'mascot-carousel__item--hidden',
      'mascot-carousel__item--hidden-behind',
      'mascot-carousel__item--incoming-right',
      'mascot-carousel__item--transition-left',
      'mascot-carousel__item--transition-center',
      'mascot-carousel__item--transition-right',
      'mascot-carousel__item--animate-center-to-left',
      'mascot-carousel__item--animate-right-to-center',
      'mascot-carousel__item--animate-left-to-right',
      'mascot-carousel__item--animate-hidden-to-right',
      'mascot-carousel__item--animate-left-to-hidden'
    );
  };

  const setState = (item, state) => {
    removeStateClasses(item);
    item.classList.add(state);
  };

  const animateItem = (item, animationClass) => {
    removeStateClasses(item);
    item.classList.add(animationClass);
  };

  [left, center, right, hidden1, hidden2].forEach((item) => {
    if (!item.getAttribute('data-default-src')) {
      item.setAttribute('data-default-src', item.querySelector('.mascot-carousel__image')?.getAttribute('src') || '/img/mascot.png');
    }
  });

  const effectiveCount = count === 2 ? 4 : count;
  const hiddenState = effectiveCount <= 3 ? 'mascot-carousel__item--hidden' : 'mascot-carousel__item--hidden-behind';

  const setFinalStates = () => {
    setState(hidden1, count === 1 ? 'mascot-carousel__item--hidden' : hiddenState);
    setState(left, count === 1 ? 'mascot-carousel__item--hidden' : 'mascot-carousel__item--left');
    setState(center, 'mascot-carousel__item--center');
    setState(right, count === 1 ? 'mascot-carousel__item--hidden' : 'mascot-carousel__item--right');
    setState(hidden2, count === 1 ? 'mascot-carousel__item--hidden' : hiddenState);
  };

  const assignThemeToSlots = (themeMap) => {
    if (count === 1) {
      applyImagesForTheme(center, themeMap.center);
      return;
    }

    applyImagesForTheme(left, themeMap.left);
    applyImagesForTheme(center, themeMap.center);
    applyImagesForTheme(right, themeMap.right);
    applyImagesForTheme(hidden1, themeMap.hidden1);
    applyImagesForTheme(hidden2, themeMap.hidden2);
  };

  if (!shouldAnimate) {
    assignThemeToSlots(nextSlotThemes);
    setFinalStates();
    return;
  }

  assignThemeToSlots(currentSlotThemes);
  animateItem(center, 'mascot-carousel__item--animate-center-to-left');
  animateItem(right, 'mascot-carousel__item--animate-right-to-center');

  const useHiddenFlow = carouselId === 'logo-carousel' || effectiveCount > 3;

  if (useHiddenFlow) {
    animateItem(left, 'mascot-carousel__item--animate-left-to-hidden');
    animateItem(hidden1, 'mascot-carousel__item--animate-hidden-to-right');
    setState(hidden2, 'mascot-carousel__item--hidden-behind');
  } else {
    animateItem(left, 'mascot-carousel__item--animate-left-to-right');
  }

  void left.offsetWidth;
  void center.offsetWidth;
  void right.offsetWidth;

  // Wait for the CSS animations to finish using animationend events so we
  // always sync with the real CSS duration (logo carousel uses 1200ms).
  const candidates = [left, center, right, hidden1, hidden2];
  const animatedEls = candidates.filter((el) => {
    if (!el) return false;
    return Array.from(el.classList).some((cn) => cn.startsWith('mascot-carousel__item--animate-'));
  });

  if (animatedEls.length === 0) {
    assignThemeToSlots(nextSlotThemes);
    setFinalStates();
  } else {
    let finished = 0;
    const cleanup = () => {
      animatedEls.forEach((el) => el.removeEventListener('animationend', onEnd));
    };

    const onEnd = (e) => {
      finished += 1;
      e.currentTarget.removeEventListener('animationend', onEnd);
      if (finished >= animatedEls.length) {
        clearTimeout(fallbackTimeout);
        cleanup();
        assignThemeToSlots(nextSlotThemes);
        setFinalStates();
      }
    };

    animatedEls.forEach((el) => el.addEventListener('animationend', onEnd));

    // Fallback in case animationend doesn't fire for some reason
    const fallbackTimeout = window.setTimeout(() => {
      cleanup();
      assignThemeToSlots(nextSlotThemes);
      setFinalStates();
    }, 2500);
  }
}



function applyRandomBackground() {
  const fallback = '/img/background.png';
  const selectedBackground = BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)] || fallback;
  document.documentElement.style.setProperty('--background-image', `url("${selectedBackground}")`);
}

function stopThemeRotation() {
  if (rotationTimerId) {
    window.clearInterval(rotationTimerId);
    rotationTimerId = null;
  }
}

function refreshThemeRotation() {
  stopThemeRotation();

  if (window.location.pathname.includes('settings') || window.location.pathname.includes('analytics')) {
    return;
  }

  if (!Array.isArray(activeThemes) || activeThemes.length <= 1) {
    return;
  }

  rotationTimerId = window.setInterval(rotateTheme, 5000);
}

function applyTheme(casinoId, options = {}) {
  const { animate = true } = options;
  const safeCasino = dynamicCasinos[casinoId] ? casinoId : getDefaultCasino();
  activeTheme = safeCasino;
  document.body.setAttribute('data-theme', safeCasino);
  setStoredActiveCasino(safeCasino);

  const mascot = document.getElementById('active-mascot') || document.querySelector('.mascot-carousel__item--center');
  const cards = document.querySelectorAll('[data-theme-card]');

  cards.forEach((card) => {
    card.classList.toggle('is-active', activeThemes.includes(card.getAttribute('data-theme-card')));
  });

  if (!dynamicCasinos[safeCasino]) {
    return;
  }

  //applyRandomBackground();

  if (mascot) {
    updateMascotCarousel(safeCasino, 'mascot-carousel', true, animate);
    updateMascotCarousel(safeCasino, 'logo-carousel', false, animate);
  }

  // Aplicar color del casino
  const colorVars = generateColorVariations(dynamicCasinos[safeCasino].color);
  document.documentElement.style.setProperty('--primary-color', colorVars.medium);
  document.documentElement.style.setProperty('--primary-light', colorVars.light);
  document.documentElement.style.setProperty('--primary-dark', colorVars.dark);
  document.documentElement.style.setProperty('--theme-primary', colorVars.medium);
  document.documentElement.style.setProperty('--theme-primary-strong', colorVars.dark);
  document.documentElement.style.setProperty('--theme-accent', colorVars.light);

  refreshThemeRotation();
}

function rotateTheme() {
  if (!activeThemes.length) {
    activeThemes = [getDefaultCasino()];
  }

  if (activeThemes.length === 1) {
    return;
  }

  const currentIndex = activeThemes.indexOf(activeTheme);
  const nextTheme = activeThemes[(currentIndex + 1) % activeThemes.length] || activeThemes[0];
  applyTheme(nextTheme);
}

function applyRemoteThemes(remoteCasinos) {
  if (!remoteCasinos || !Array.isArray(remoteCasinos)) return;
  
  const normalized = remoteCasinos.filter(id => dynamicCasinos[id]);
  if (!normalized.length) return;

  activeThemes = normalized;
  activeTheme = activeThemes[0];
  setCheckboxStates(activeThemes);
  applyTheme(activeTheme);
}

async function observeRemoteConfig() {
  try {
    const { db, doc, onSnapshot } = await ensureFirebaseServices();
    onSnapshot(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT), (snapshot) => {
      if (!snapshot.exists()) return;
      const config = snapshot.data();
      if (!config) return;

      if (config.casinos && typeof config.casinos === 'object') {
        dynamicCasinos = config.casinos;
        if (config.casinoOrder && Array.isArray(config.casinoOrder)) {
          dynamicCasinoOrder = config.casinoOrder;
        } else {
          dynamicCasinoOrder = Object.keys(dynamicCasinos || {}).sort((a, b) => {
            const aNum = parseInt((a.match(/(\d+)$/) || [])[0] || a, 10);
            const bNum = parseInt((b.match(/(\d+)$/) || [])[0] || b, 10);
            if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.localeCompare(b);
          });
        }
        activeThemes = getActiveCasinos();
        activeTheme = activeThemes[0] || getDefaultCasino();
        setCheckboxStates(activeThemes);
        applyTheme(activeTheme, { animate: false });
        refreshThemeRotation();
        if (window.location.pathname.includes('settings')) {
          if (typeof window.renderCasinos === 'function') {
            window.renderCasinos();
          }
        }
      }
    });
  } catch (error) {
    console.error("Error suscribiéndose a la configuración remota:", error);
  }
}

async function saveRemoteConfig(config) {
  try {
    const { db, doc, getDoc, setDoc } = await ensureFirebaseServices();
    const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT));
    const currentConfig = snapshot.exists() ? snapshot.data() : {};
    await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT), {
      ...currentConfig,
      ...config
    });
  } catch (error) {
    console.error("Error guardando configuración en Firebase:", error);
  }
}
// End Firebase

function openWhatsApp() {
  window.open(landingContent.whatsappUrl, '_blank', 'noopener,noreferrer');
}

function setViewportHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}

window.casinosReady = Promise.resolve().then(async () => {
  try {
    return await loadDynamicCasinos();
  } catch (error) {
    console.warn('Error inicializando casinos dinámicos, usando localStorage como fallback:', error);
    dynamicCasinos = getLocalDynamicCasinos();
    return dynamicCasinos;
  }
});

let whatsappButtonProgressTimer = null;
let whatsappButtonCompleteTimeout = null;
let whatsappButtonProgressValue = 0;
let whatsappButtonProgressStartedAt = 0;
let whatsappButtonProgressActive = false;
let whatsappButtonReady = false;

function syncWhatsAppButtonUI() {
  const button = document.getElementById('whatsapp-button');
  const fill = button?.querySelector('.whatsapp-button__progress-fill');
  if (!button || !fill) return;

  fill.style.width = `${whatsappButtonProgressValue}%`;

  if (whatsappButtonReady) {
    button.disabled = false;
    button.classList.remove('whatsapp-button--loading');
    button.classList.add('whatsapp-button--ready');
    button.removeAttribute('aria-disabled');
  } else if (whatsappButtonProgressActive) {
    button.disabled = true;
    button.classList.add('whatsapp-button--loading');
    button.classList.remove('whatsapp-button--ready');
    button.setAttribute('aria-disabled', 'true');
  } else {
    button.disabled = true;
    button.classList.add('whatsapp-button--loading');
    button.classList.remove('whatsapp-button--ready');
    button.setAttribute('aria-disabled', 'true');
  }
}

function updateWhatsAppButtonProgress(value) {
  whatsappButtonProgressValue = Math.min(100, Math.max(0, value));
  syncWhatsAppButtonUI();
}

function startWhatsAppButtonProgress() {
  const button = document.getElementById('whatsapp-button');
  if (whatsappButtonCompleteTimeout) {
    clearTimeout(whatsappButtonCompleteTimeout);
    whatsappButtonCompleteTimeout = null;
  }

  whatsappButtonProgressStartedAt = performance.now();
  whatsappButtonProgressActive = true;
  whatsappButtonReady = false;
  syncWhatsAppButtonUI();
  updateWhatsAppButtonProgress(16);

  if (whatsappButtonProgressTimer) {
    clearInterval(whatsappButtonProgressTimer);
  }

  whatsappButtonProgressTimer = setInterval(() => {
    if (whatsappButtonProgressValue >= 94) {
      return;
    }
    updateWhatsAppButtonProgress(whatsappButtonProgressValue + Math.random() * 4 + 2);
  }, 100);
}

function resetWhatsAppButtonProgress() {
  if (whatsappButtonCompleteTimeout) {
    clearTimeout(whatsappButtonCompleteTimeout);
    whatsappButtonCompleteTimeout = null;
  }
  whatsappButtonProgressActive = true;
  whatsappButtonReady = false;
  updateWhatsAppButtonProgress(0);
}

function completeWhatsAppButtonProgress() {
  if (whatsappButtonProgressTimer) {
    clearInterval(whatsappButtonProgressTimer);
    whatsappButtonProgressTimer = null;
  }
  if (whatsappButtonCompleteTimeout) {
    clearTimeout(whatsappButtonCompleteTimeout);
    whatsappButtonCompleteTimeout = null;
  }

  updateWhatsAppButtonProgress(100);

  const elapsed = performance.now() - whatsappButtonProgressStartedAt;
  const minimumDuration = 360;
  const remaining = Math.max(0, minimumDuration - elapsed);

  if (landingContent.whatsappUrl && landingContent.whatsappUrl.trim()) {
    whatsappButtonCompleteTimeout = setTimeout(() => {
      whatsappButtonProgressActive = false;
      whatsappButtonReady = true;
      syncWhatsAppButtonUI();
      whatsappButtonCompleteTimeout = null;
    }, remaining);
  } else {
    whatsappButtonProgressActive = true;
    whatsappButtonReady = false;
    syncWhatsAppButtonUI();
  }
}

// Cargar URL de WhatsApp urgentemente (PRIORIDAD UNO - ultrarrápido)
async function loadWhatsAppUrlUrgent() {
  startWhatsAppButtonProgress();
  try {
    const { db, doc, getDoc } = await ensureFirebaseServices();
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT);

    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('timeout')), 2000);
    });

    const snapshot = await Promise.race([getDoc(docRef), timeoutPromise]);
    clearTimeout(timeoutId);

    if (snapshot?.exists() && snapshot.data()?.landingContent?.whatsappUrl) {
      landingContent.whatsappUrl = snapshot.data().landingContent.whatsappUrl;
      console.debug('✓ WhatsApp URL cargado');
    }
  } catch (error) {
    console.debug('WhatsApp URL no se cargó a tiempo:', error?.message || error);
  } finally {
    completeWhatsAppButtonProgress();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  hydrateAnalyticsSourceFromUrl();

  // === PASO 1: Iniciar carga del WhatsApp URL en background ===
  loadWhatsAppUrlUrgent(); // No bloquea el render
  
  // === PASO 2: Setup local rápido ===
  const localCasinos = getLocalDynamicCasinos();
  if (localCasinos && typeof localCasinos === 'object' && Object.keys(localCasinos).length) {
    dynamicCasinos = localCasinos;
  }

  setViewportHeight();
  activeThemes = getActiveCasinos();
  if (!activeThemes.length) {
    activeThemes = [getDefaultCasino()];
  }
  activeTheme = activeThemes[0] || getDefaultCasino();

  setCheckboxStates(activeThemes);

  // === PASO 3: Renderizar con valores por defecto ===
  const initialMascot = document.getElementById('active-mascot');
  const initialBadge = document.getElementById('access-badge');
  const initialHeroCard = document.querySelector('.hero-card');

  renderContent();
  applyTheme(activeTheme, { animate: false });
  refreshThemeRotation();
  applyRandomBackground();

  const startInitialAnimations = () => {
    if (initialBadge) {
      initialBadge.classList.add('hero-header__badge--initial');
    }
    if (initialHeroCard) {
      initialHeroCard.classList.add('hero-card--initial');
    }

    window.setTimeout(() => {
      initialBadge?.classList.remove('hero-header__badge--initial');
      initialHeroCard?.classList.remove('hero-card--initial');
    }, 2600);
  };

  const showBrandMark = () => {
    const logosWrapper = document.querySelector('.brand-mark');
    if (logosWrapper) {
      logosWrapper.classList.add('brand-mark--ready');
    }
  };

  const startVisuals = () => {
    startInitialAnimations();
    showBrandMark();
  };

  if (initialMascot) {
    if (initialMascot.complete && initialMascot.naturalWidth > 1) {
      startVisuals();
    } else {
      initialMascot.addEventListener('load', startVisuals, { once: true });
      setTimeout(startVisuals, 750);
    }
  } else {
    startVisuals();
  }

  // === PASO 4: Setup de event listeners ===
  const whatsappButton = document.getElementById('whatsapp-button');
  if (whatsappButton) {
    whatsappButton.addEventListener('click', () => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => registerAnalyticsWhatsappClick().catch(() => {}));
      } else {
        registerAnalyticsWhatsappClick().catch(() => {});
      }
      openWhatsApp();
    });
  }

  syncWhatsAppButtonUI();

  const select = document.getElementById('theme-select');
  if (select) {
    select.addEventListener('change', (event) => applyTheme(event.target.value));
  }

  const checkboxInputs = document.querySelectorAll('input[name="theme-select"][type="checkbox"]');
  if (checkboxInputs.length) {
    checkboxInputs.forEach((input) => {
      input.checked = activeThemes.includes(input.value);
      input.addEventListener('change', async () => {
        const selected = Array.from(checkboxInputs)
          .filter((item) => item.checked)
          .map((item) => item.value)
          .filter(id => dynamicCasinos[id]);

        if (!selected.length) {
          selected.push(getDefaultCasino());
          checkboxInputs.forEach(cb => {
            if (cb.value === getDefaultCasino()) cb.checked = true;
          });
        }

        const primary = await setActiveCasinos(selected);
        applyTheme(primary);
      });
    });
  }

  const cards = document.querySelectorAll('[data-theme-card]');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      applyTheme(card.getAttribute('data-theme-card'));
    });
  });

  // === PASO 5: Cargar casinos + textos en paralelo ===
  void (async () => {
    try {
      const [casinosResult, configResult] = await Promise.allSettled([
        window.casinosReady,
        getRemoteConfig()
      ]);

      // Procesar casinos
      if (casinosResult.status === 'fulfilled' && casinosResult.value) {
        dynamicCasinos = casinosResult.value;
      }

      // Procesar config y textos
      const config = configResult.status === 'fulfilled' ? configResult.value : null;
      if (config?.casinos) {
        dynamicCasinos = config.casinos;
      }

      // Aplicar textos si hay cambios
      if (config?.landingContent) {
        setLandingContent(config.landingContent, false);
      }

      // Actualizar tema si cambió
      activeThemes = getActiveCasinos();
      if (!activeThemes.length) activeThemes = [getDefaultCasino()];
      activeTheme = activeThemes[0] || getDefaultCasino();

      if (!dynamicCasinos[activeTheme]) {
        activeTheme = getDefaultCasino();
      }

      applyTheme(activeTheme, { animate: false });
      setCheckboxStates(activeThemes);
      refreshThemeRotation();

      // Disparar evento de listo
      window.dispatchEvent(new CustomEvent('landingContent:ready', { detail: landingContent }));

      // Analytics en idle
      if (!window.location.pathname.includes('settings') && !window.location.pathname.includes('analytics')) {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => registerAnalyticsVisit().catch(() => {}));
        } else {
          registerAnalyticsVisit().catch(() => {});
        }
      }
    } catch (error) {
      console.warn('Error cargando datos:', error);
    }

    // Observar cambios en tiempo real
    observeRemoteConfig().catch(() => {});
  })();

  // Exponer API global
  window.casinosAPI = {
    addCasino,
    removeCasino,
    updateCasinoActive,
    getCasinos: () => dynamicCasinos,
    saveDynamicCasinos,
    getCasinoOrder: () => Array.isArray(dynamicCasinoOrder) ? dynamicCasinoOrder.slice() : [],
    setCasinoOrder: async (order) => {
      if (Array.isArray(order)) {
        dynamicCasinoOrder = order.filter(id => dynamicCasinos[id]);
        try {
          await saveDynamicCasinos();
        } catch (e) {
          console.warn('Error saving casino order', e);
        }
      }
      return dynamicCasinoOrder;
    },
    applyTheme,
    setActiveCasinos
  };
});

window.addEventListener('resize', setViewportHeight);

const landingSettingsAPI = {
  getLandingContent,
  setLandingContent,
  getStoredLandingContent,
  setStoredLandingContent,
  saveRemoteConfig,
  // Nuevas APIs para casinos dinámicos
  addCasino,
  removeCasino,
  updateCasinoActive,
  getCasinos: () => dynamicCasinos,
  getCasinoOrder: () => Array.isArray(dynamicCasinoOrder) ? dynamicCasinoOrder.slice() : [],
  setCasinoOrder: async (order) => {
    if (Array.isArray(order)) {
      dynamicCasinoOrder = order.filter(id => dynamicCasinos[id]);
      try {
        await saveDynamicCasinos();
      } catch (e) {
        console.warn('Error saving casino order', e);
      }
    }
    return dynamicCasinoOrder;
  },
  saveDynamicCasinos,
  loadDynamicCasinos,
  setActiveCasinos,
  getActiveCasinos
};

if (typeof window !== 'undefined') {
  const authGuard = window.authGuard || null;
  const hasActiveSession = authGuard && typeof authGuard.isAuthenticated === 'function' ? authGuard.isAuthenticated() : false;
  const guardedLandingSettingsAPI = hasActiveSession ? landingSettingsAPI : {
    ...landingSettingsAPI,
    addCasino: async () => { throw new Error('Acceso no autorizado'); },
    removeCasino: async () => { throw new Error('Acceso no autorizado'); },
    updateCasinoActive: async () => { throw new Error('Acceso no autorizado'); },
    saveDynamicCasinos: async () => { throw new Error('Acceso no autorizado'); },
    setActiveCasinos: async () => { throw new Error('Acceso no autorizado'); },
    setLandingContent: () => { throw new Error('Acceso no autorizado'); },
    saveRemoteConfig: async () => { throw new Error('Acceso no autorizado'); }
  };

  window.landingSettings = guardedLandingSettingsAPI;
  try { console.log('[main] landingSettings assigned, hasActiveSession:', hasActiveSession); } catch(e){}
  window.casinosAPI = {
    ...guardedLandingSettingsAPI,
    applyTheme,
    setActiveCasinos: guardedLandingSettingsAPI.setActiveCasinos
  };
}

export { getLandingContent, setLandingContent, getStoredLandingContent, setStoredLandingContent, saveRemoteConfig, addCasino, removeCasino, updateCasinoActive, loadDynamicCasinos, setActiveCasinos, getActiveCasinos };
