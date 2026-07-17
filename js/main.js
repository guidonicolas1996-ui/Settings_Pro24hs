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
    if (active && !dynamicCasinos[casinoId].active) {
      const activeCount = getActiveCasinos().length;
      if (activeCount >= 5) {
        throw new Error('Solo se pueden activar hasta 5 plataformas a la vez.');
      }
    }
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

async function setActiveCasinos(casinoIds) {
  const normalized = casinoIds.filter(id => dynamicCasinos[id]);
  if (normalized.length > 5) {
    throw new Error('Solo se pueden activar hasta 5 plataformas a la vez.');
  }
  const finalCasinos = normalized.length ? normalized : [getDefaultCasino()];

  // Actualizar estado en dynamicCasinos
  Object.keys(dynamicCasinos).forEach(id => {
    dynamicCasinos[id].active = finalCasinos.includes(id);
  });

  try {
    await saveDynamicCasinos();
  } catch (error) {
    console.warn('Error guardando estado activo de casinos:', error);
  }

  return finalCasinos[0];
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

window.casinosReady = Promise.resolve().then(async () => {
  try {
    return await loadDynamicCasinos();
  } catch (error) {
    console.warn('Error inicializando casinos dinámicos, usando localStorage como fallback:', error);
    dynamicCasinos = getLocalDynamicCasinos();
    return dynamicCasinos;
  }
});

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
  setActiveCasinos
};

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
  window.casinosAPI = guardedLandingSettingsAPI;
}

export { getLandingContent, setLandingContent, getStoredLandingContent, setStoredLandingContent, saveRemoteConfig, addCasino, removeCasino, updateCasinoActive, loadDynamicCasinos, setActiveCasinos, getActiveCasinos };
