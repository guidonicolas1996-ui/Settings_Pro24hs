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

// Firebase
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  onSnapshot,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Configuración de Cloudinary. Debes reemplazar estos valores con tu cuenta y preset de carga.
const CLOUDINARY_CLOUD_NAME = "efcbsldh"; // ej: 'mi-cuenta'
const CLOUDINARY_UPLOAD_PRESET = "casinos"; // preset público de subida sin firma
const CLOUDINARY_FOLDER = "casinos";
const FIRESTORE_COLLECTION = "config";
const FIRESTORE_DOCUMENT = "landing";

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

  const formData = new FormData();
  formData.append('file', fileBlob, fileName);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `${CLOUDINARY_FOLDER}/${casinoId}`);
  formData.append('public_id', `${type}-${Date.now()}`);
  formData.append('resource_type', 'image');
  formData.append('return_delete_token', 'true');

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return {
      url: result.secure_url || result.url,
      deleteToken: result.delete_token || null
    };
  } catch (error) {
    console.warn('Cloudinary upload falló, usando fallback base64 para imágenes:', { source, casinoId, type, error });
    const url = source instanceof File ? await fileToDataURL(source) : source;
    return { url, deleteToken: null };
  }
}

function getImageUrl(imageRecord) {
  return typeof imageRecord === 'string' ? imageRecord : (imageRecord && imageRecord.url) ? imageRecord.url : null;
}

function getImageDeleteToken(imageRecord) {
  return typeof imageRecord === 'string' ? null : (imageRecord && imageRecord.deleteToken) ? imageRecord.deleteToken : null;
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
  if (!USE_REMOTE_STORAGE) {
    dynamicCasinos = getLocalDynamicCasinos();
    return dynamicCasinos;
  }

  try {
    const snapshot = await getDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT));
    const config = snapshot.exists() ? snapshot.data() : {};
    dynamicCasinos = config.casinos || getLocalDynamicCasinos();
    if (!dynamicCasinos || typeof dynamicCasinos !== 'object') {
      dynamicCasinos = getLocalDynamicCasinos();
    }
    return dynamicCasinos;
  } catch (error) {
    console.warn('Error cargando casinos desde Firebase, usando localStorage como fallback:', error);
    dynamicCasinos = getLocalDynamicCasinos();
    return dynamicCasinos;
  }
}

async function saveDynamicCasinos() {
  setLocalDynamicCasinos(dynamicCasinos);

  if (!USE_REMOTE_STORAGE) {
    return;
  }

  try {
    await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT), { casinos: dynamicCasinos }, { merge: true });
  } catch (error) {
    console.warn('Error guardando casinos dinámicos en Firebase, ya están guardados en localStorage:', error);
  }
}

async function addCasino(id, name, logo, mascot, color) {
  const casinoId = id || `casino_${Date.now()}`;
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

  dynamicCasinos[casinoId] = {
    label: name,
    logo: typeof logoRecord === 'object' ? logoRecord.url : logoRecord,
    logoDeleteToken: typeof logoRecord === 'object' ? logoRecord.deleteToken : null,
    mascot: typeof mascotRecord === 'object' ? mascotRecord.url : mascotRecord,
    mascotDeleteToken: typeof mascotRecord === 'object' ? mascotRecord.deleteToken : null,
    color: color,
    active: active
  };

  await saveDynamicCasinos();
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
    .map(([id]) => id);

  return activeCasinos.length ? activeCasinos : null;
}

function setCheckboxStates(activeCasinoIds) {
  const checkboxInputs = document.querySelectorAll('input[name="theme-select"][type="checkbox"]');
  if (!checkboxInputs.length) return;

  checkboxInputs.forEach((input) => {
    input.checked = activeCasinoIds.includes(input.value);
  });
}

function getActiveCasinos() {
  return Object.keys(dynamicCasinos).filter(id => dynamicCasinos[id].active);
}

function getDefaultCasino() {
  const activeCasinos = getActiveCasinos();
  return activeCasinos.length ? activeCasinos[0] : Object.keys(dynamicCasinos)[0] || 'casino_1';
}

function getStoredActiveCasino() {
  const activeCasinos = getActiveCasinos();
  return activeCasinos.length ? activeCasinos[0] : Object.keys(dynamicCasinos)[0] || 'casino_1';
}

function getStoredActiveCasinos() {
  return getActiveCasinos() || [];
}

let activeThemes = [];
let activeTheme = '';

function setStoredActiveCasino(casinoId) {
  // Se maneja a través de dynamicCasinos
}

function setStoredActiveCasinos(casinoIds) {
  // Se maneja a través de dynamicCasinos
}

function setActiveCasinos(casinoIds) {
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
  saveDynamicCasinos().catch((error) => console.warn('Error guardando estado activo de casinos:', error));
  
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

  if (mascot) {
    fadeAsset(mascot, getImageUrl(dynamicCasinos[safeCasino].mascot), dynamicCasinos[safeCasino].label);
  }

  // Aplicar color del casino y blobs
  const colorVars = generateColorVariations(dynamicCasinos[safeCasino].color);
  document.documentElement.style.setProperty('--primary-color', colorVars.medium);
  document.documentElement.style.setProperty('--primary-light', colorVars.light);
  document.documentElement.style.setProperty('--primary-dark', colorVars.dark);
  document.documentElement.style.setProperty('--blob-1-color', colorVars.blob1);
  document.documentElement.style.setProperty('--blob-2-color', colorVars.blob2);
  document.documentElement.style.setProperty('--blob-3-color', colorVars.blob3);
  document.documentElement.style.setProperty('--blob-4-color', colorVars.blob4);
  document.documentElement.style.setProperty('--blob-5-color', colorVars.blob5);
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
    onSnapshot(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT), (snapshot) => {
      if (!snapshot.exists()) return;
      const config = snapshot.data();
      if (!config) return;

      if (config.casinos && typeof config.casinos === 'object') {
        dynamicCasinos = config.casinos;
        activeThemes = getActiveCasinos();
        activeTheme = activeThemes[0] || getDefaultCasino();
        setCheckboxStates(activeThemes);
        applyTheme(activeTheme);
        if (window.location.pathname.includes('settings')) {
          renderCasinos();
        }
      }
    });
  } catch (error) {
    console.error("Error suscribiéndose a la configuración remota:", error);
  }
}

async function saveRemoteConfig(config) {
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT), config, { merge: true });
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

window.casinosReady = loadDynamicCasinos().catch((error) => {
  console.warn('Error inicializando casinos dinámicos, usando localStorage como fallback:', error);
  dynamicCasinos = getLocalDynamicCasinos();
  return dynamicCasinos;
});

document.addEventListener('DOMContentLoaded', async () => {
  // Esperar a que los casinos remotos estén cargados o fallback local esté listo
  await window.casinosReady;

  const firebaseConfig = await getRemoteConfig().catch((error) => {
    console.warn('Error cargando config remota al iniciar:', error);
    return null;
  });

  if (firebaseConfig && firebaseConfig.casinos && typeof firebaseConfig.casinos === 'object') {
    dynamicCasinos = firebaseConfig.casinos;
  }

  activeThemes = getActiveCasinos();
  if (!activeThemes.length) {
    activeThemes = [getDefaultCasino()];
  }
  activeTheme = activeThemes[0];

  if (!activeTheme || !dynamicCasinos[activeTheme]) {
    activeTheme = getDefaultCasino();
  }

  // Load landing content from remote config if available, otherwise from localStorage
  try {
    if (firebaseConfig && firebaseConfig.landingContent) {
      setLandingContent(firebaseConfig.landingContent, false);
    } else {
      const stored = getStoredLandingContent();
      if (stored) setLandingContent(stored, false);
    }
  } catch (e) {
    console.warn('Error cargando landingContent inicial', e);
  }
  // Notify listeners that landingContent is ready
  try {
    window.dispatchEvent(new CustomEvent('landingContent:ready', { detail: landingContent }));
  } catch (e) {
    // ignore
  }

  renderContent();
  setViewportHeight();
  applyRandomBackground();
  applyTheme(activeTheme);
  setCheckboxStates(activeThemes);
  observeRemoteConfig();

  const whatsappButton = document.getElementById('whatsapp-button');
  if (whatsappButton) {
    whatsappButton.addEventListener('click', openWhatsApp);
  }

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

        const primary = setActiveCasinos(selected);
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

  if (!window.location.pathname.includes('settings') && activeThemes.length > 1) {
    window.setInterval(rotateTheme, 5000);
  }

  // Exponer API global
  window.casinosAPI = {
    addCasino,
    removeCasino,
    updateCasinoActive,
    getCasinos: () => dynamicCasinos,
    saveDynamicCasinos,
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
  saveDynamicCasinos,
  loadDynamicCasinos,
  setActiveCasinos,
  getActiveCasinos
};

if (typeof window !== 'undefined') {
  window.landingSettings = landingSettingsAPI;
  window.casinosAPI = {
    ...landingSettingsAPI,
    applyTheme,
    setActiveCasinos
  };
}

export { getLandingContent, setLandingContent, getStoredLandingContent, setStoredLandingContent, saveRemoteConfig, addCasino, removeCasino, updateCasinoActive, loadDynamicCasinos, setActiveCasinos, getActiveCasinos };
