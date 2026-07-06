/* Configuración principal de textos y destino del botón */
let landingContent = {
  accessBadge: 'ACCESO VIP',
  heroTitle: 'OBTENÉ UN <span class="gradient-text">100%</span> EN TU PRIMER DEPÓSITO',
  heroCopy: 'Escribinos apretando el botón de abajo',
  ctaLabel: 'WHATSAPP OFICIAL',
  helperText: 'ATENCIÓN Y RETIROS LAS 24 HS',
  footerText1: 'Bono no extraíble, válido solo para slots. Mínimo de carga: $2.000.',
  footerText2: '© 2026 el juego es solo +18. Operá con responsabilidad.'
};

const WHATSAPP_URL = 'https://www.linkify.com.ar/api/soporte?id=k6cipb';
const MAX_CASINOS = 5;
const BACKGROUND_IMAGES = ['/img/background1.png', '/img/background2.png', '/img/background3.png', '/img/background4.png', '/img/background5.png'];
const LOCAL_STORAGE_CASINOS_KEY = 'dynamicCasinos';
const USE_REMOTE_STORAGE = typeof window !== 'undefined' && window.location.protocol !== 'file:';

let dynamicCasinos = {};
let dynamicCasinoOrder = [];

// Firebase
let firebaseServices = null;

async function ensureFirebaseServices() {
  if (firebaseServices) {
    return firebaseServices;
  }

  const [{ db }, firestore] = await Promise.all([
    import("./firebase.js"),
    import("https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js")
  ]);

  firebaseServices = {
    db,
    ...firestore
  };

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
      dark: baseColor,
      blob1: `rgba(125, 108, 255, 0.9)`,
      blob2: `rgba(163, 119, 255, 0.8)`,
      blob3: `rgba(255, 209, 102, 0.78)`,
      blob4: `rgba(255, 255, 255, 0.24)`,
      blob5: `rgba(125, 108, 255, 0.4)`
    };
  }
  
  const light = rgbToHex(Math.min(rgb.r + 80, 255), Math.min(rgb.g + 80, 255), Math.min(rgb.b + 80, 255));
  const dark = rgbToHex(Math.max(rgb.r - 60, 0), Math.max(rgb.g - 60, 0), Math.max(rgb.b - 60, 0));
  
  // Generar variaciones de color para los blobs
  const blobBase = { r: rgb.r, g: rgb.g, b: rgb.b };
  const blobLight = { r: Math.min(rgb.r + 40, 255), g: Math.min(rgb.g + 40, 255), b: Math.min(rgb.b + 40, 255) };
  const blobMediumLight = { r: Math.min(rgb.r + 20, 255), g: Math.min(rgb.g + 20, 255), b: Math.min(rgb.b + 20, 255) };
  
  return {
    light: light,
    medium: baseColor,
    dark: dark,
    blob1: `rgba(${blobBase.r}, ${blobBase.g}, ${blobBase.b}, 0.9)`,
    blob2: `rgba(${blobLight.r}, ${blobLight.g}, ${blobLight.b}, 0.8)`,
    blob3: `rgba(${blobMediumLight.r}, ${blobMediumLight.g}, ${blobMediumLight.b}, 0.78)`,
    blob4: `rgba(255, 255, 255, 0.24)`,
    blob5: `rgba(${Math.max(rgb.r - 40, 0)}, ${Math.max(rgb.g - 40, 0)}, ${Math.max(rgb.b - 40, 0)}, 0.4)`
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

function ensureBucket(current, dateKey, hourKey) {
  current.buckets = current.buckets || {};
  current.buckets[dateKey] = current.buckets[dateKey] || {};
  current.buckets[dateKey][hourKey] = current.buckets[dateKey][hourKey] || {
    uniqueVisitors: 0,
    totalVisits: 0,
    primaryLinks: 0,
    alternativeLinks: 0,
    primaryVisits: 0,
    alternativeVisits: 0,
    whatsappClicks: 0,
    whatsappClicksTotal: 0
  };
  return current.buckets[dateKey][hourKey];
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
  const source = new URLSearchParams(window.location.search).get('src') === 'alt' ? 'alternative' : 'primary';
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
        alternativeLinks: 0,
        primaryVisits: 0,
        alternativeVisits: 0,
        whatsappClicks: 0,
        whatsappClicksTotal: 0
      },
      visitors: {},
      buckets: {}
    };

    const visitors = current.visitors || {};
    const existing = visitors[visitorId];
    const isNewVisitor = !existing;
    const sourceCountKey = source === 'alternative' ? 'alternativeLinks' : 'primaryLinks';
    const sourceTotalKey = source === 'alternative' ? 'alternativeVisits' : 'primaryVisits';
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
    // has not used this source before (so primary/alternative are independent).
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
  const source = new URLSearchParams(window.location.search).get('src') === 'alt' ? 'alternative' : 'primary';
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
        alternativeLinks: 0,
        primaryVisits: 0,
        alternativeVisits: 0,
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

    if (!whatsappAlready) {
      current.totals.whatsappClicks = (current.totals.whatsappClicks || 0) + 1;
    }
    current.totals.whatsappClicksTotal = (current.totals.whatsappClicksTotal || 0) + 1;

    const updated = {
      ...existing,
      ...device,
      firstSeen: existing?.firstSeen || timestamp,
      lastSeen: timestamp,
      visits: existing?.visits || 0,
      sources: existing?.sources || {},
      whatsappClicked: true,
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
  try {
    const { db, doc, getDoc } = await ensureFirebaseServices();
    const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (error) {
    console.error("Error leyendo configuración remota de Firebase:", error);
    return null;
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

  if (accessBadge) accessBadge.textContent = landingContent.accessBadge;
  if (heroTitle) heroTitle.innerHTML = landingContent.heroTitle;
  if (heroCopy) heroCopy.textContent = landingContent.heroCopy;
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

function fadeAsset(element, src, alt) {
  if (!element) return;

  const currentSrc = element.getAttribute('src');
  if (currentSrc === src) {
    element.setAttribute('alt', alt);
    return;
  }

  const previousSrc = currentSrc || '';
  const previousAlt = element.getAttribute('alt') || '';

  element.style.opacity = '0';
  element.style.transform = 'scale(0.97)';

  const nextImage = new Image();
  nextImage.src = src;

  nextImage.onload = () => {
    window.setTimeout(() => {
      element.setAttribute('src', src);
      element.setAttribute('alt', alt);
      element.style.opacity = '1';
      element.style.transform = 'scale(1)';
    }, 120);
  };

  if (!previousSrc) {
    element.setAttribute('src', src);
    element.setAttribute('alt', alt);
    element.style.opacity = '1';
    element.style.transform = 'scale(1)';
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

function applyTheme(casinoId) {
  const safeCasino = dynamicCasinos[casinoId] ? casinoId : getDefaultCasino();
  activeTheme = safeCasino;
  document.body.setAttribute('data-theme', safeCasino);
  setStoredActiveCasino(safeCasino);

  const mascot = document.getElementById('active-mascot');
  const cards = document.querySelectorAll('[data-theme-card]');
  const logosWrapper = document.querySelector('.brand-mark');

  if (logosWrapper) {
    logosWrapper.innerHTML = '';
    activeThemes.forEach((id) => {
      if (dynamicCasinos[id]) {
        const image = document.createElement('img');
        image.src = getImageUrl(dynamicCasinos[id].logo) || '';
        image.alt = dynamicCasinos[id].label;
        image.className = 'brand-mark__image';
        image.setAttribute('data-casino-id', id);
        logosWrapper.appendChild(image);
      }
    });
  }

  cards.forEach((card) => {
    card.classList.toggle('is-active', activeThemes.includes(card.getAttribute('data-theme-card')));
  });

  if (!dynamicCasinos[safeCasino]) {
    return;
  }

  //applyRandomBackground();

  if (mascot) {
    fadeAsset(mascot, getImageUrl(dynamicCasinos[safeCasino].mascot), dynamicCasinos[safeCasino].label);
  }

  // Aplicar color del casino y blobs
  const colorVars = generateColorVariations(dynamicCasinos[safeCasino].color);
  document.documentElement.style.setProperty('--primary-color', colorVars.medium);
  document.documentElement.style.setProperty('--primary-light', colorVars.light);
  document.documentElement.style.setProperty('--primary-dark', colorVars.dark);
  document.documentElement.style.setProperty('--theme-primary', colorVars.medium);
  document.documentElement.style.setProperty('--theme-primary-strong', colorVars.dark);
  document.documentElement.style.setProperty('--theme-accent', colorVars.light);
  document.documentElement.style.setProperty('--blob-1-color', colorVars.blob1);
  document.documentElement.style.setProperty('--blob-2-color', colorVars.blob2);
  document.documentElement.style.setProperty('--blob-3-color', colorVars.blob3);
  document.documentElement.style.setProperty('--blob-4-color', colorVars.blob4);
  document.documentElement.style.setProperty('--blob-5-color', colorVars.blob5);

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
        applyTheme(activeTheme);
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
  window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer');
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

document.addEventListener('DOMContentLoaded', async () => {
  const localCasinos = getLocalDynamicCasinos();
  if (localCasinos && typeof localCasinos === 'object' && Object.keys(localCasinos).length) {
    dynamicCasinos = localCasinos;
  }

  renderContent();
  setViewportHeight();

  activeThemes = getActiveCasinos();
  if (!activeThemes.length) {
    activeThemes = [getDefaultCasino()];
  }
  activeTheme = activeThemes[0];

  if (!activeTheme || !dynamicCasinos[activeTheme]) {
    activeTheme = getDefaultCasino();
  }

  applyTheme(activeTheme);
  setCheckboxStates(activeThemes);

  if (!window.location.pathname.includes('settings') && !window.location.pathname.includes('analytics')) {
    window.setTimeout(() => {
      registerAnalyticsVisit().catch((error) => {
        console.warn('Analytics visit failed:', error);
      });
    }, 150);
  }

  const whatsappButton = document.getElementById('whatsapp-button');
  if (whatsappButton) {
    whatsappButton.addEventListener('click', () => {
      window.setTimeout(() => {
        registerAnalyticsWhatsappClick().catch((error) => {
          console.warn('Analytics click failed:', error);
        });
      }, 0);
      openWhatsApp();
    });
  }

  window.setTimeout(() => {
    observeRemoteConfig().catch((error) => console.warn('Remote config observe failed:', error));
  }, 200);

  const select = document.getElementById('theme-select');
  if (select) {
    select.addEventListener('change', (event) => {
      applyTheme(event.target.value);
    });
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

  refreshThemeRotation();
  applyRandomBackground();

  void (async () => {
    try {
      const [casinosResult, firebaseConfigResult] = await Promise.allSettled([
        window.casinosReady,
        Promise.resolve().then(() => getRemoteConfig())
      ]);

      if (casinosResult.status === 'fulfilled' && casinosResult.value && typeof casinosResult.value === 'object') {
        dynamicCasinos = casinosResult.value;
      }

      const firebaseConfig = firebaseConfigResult.status === 'fulfilled' ? firebaseConfigResult.value : null;
      if (firebaseConfig && firebaseConfig.casinos && typeof firebaseConfig.casinos === 'object') {
        dynamicCasinos = firebaseConfig.casinos;
      }

      if (firebaseConfig && firebaseConfig.landingContent) {
        setLandingContent(firebaseConfig.landingContent, false);
      } else {
        const stored = getStoredLandingContent();
        if (stored) setLandingContent(stored, false);
      }

      activeThemes = getActiveCasinos();
      if (!activeThemes.length) {
        activeThemes = [getDefaultCasino()];
      }
      activeTheme = activeThemes[0];

      if (!activeTheme || !dynamicCasinos[activeTheme]) {
        activeTheme = getDefaultCasino();
      }

      applyTheme(activeTheme);
      setCheckboxStates(activeThemes);
      refreshThemeRotation();

      try {
        window.dispatchEvent(new CustomEvent('landingContent:ready', { detail: landingContent }));
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.warn('Error cargando datos remotos en segundo plano:', error);
    }
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
  window.casinosAPI = {
    ...guardedLandingSettingsAPI,
    applyTheme,
    setActiveCasinos: guardedLandingSettingsAPI.setActiveCasinos
  };
}

export { getLandingContent, setLandingContent, getStoredLandingContent, setStoredLandingContent, saveRemoteConfig, addCasino, removeCasino, updateCasinoActive, loadDynamicCasinos, setActiveCasinos, getActiveCasinos };
