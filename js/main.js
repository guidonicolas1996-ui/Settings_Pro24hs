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
const STORAGE_KEY = 'activeCasino';
const STORAGE_KEY_MULTI = 'activeCasinos';
const BACKGROUND_IMAGES = ['/img/background1.png', '/img/background2.png', '/img/background3.png', '/img/background4.png', '/img/background5.png'];
const themeConfig = {
  ganamos: {
    label: 'Ganamos',
    logos: ['img/logo1.png'],
    mascot: 'img/mascotG.png',
    alt: 'Mascota Ganamos'
  },
  zeus: {
    label: 'Zeus',
    logos: ['img/logo2.png'],
    mascot: 'img/mascotZ.png',
    alt: 'Mascota Zeus'
  },
  apostamos: {
    label: 'Apostamos',
    logos: ['img/logo3.png'],
    mascot: 'img/mascotA.png',
    alt: 'Mascota Apostamos'
  }
};

const THEME_SEQUENCE = Object.keys(themeConfig);

// Firebase
import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  onSnapshot,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const FIRESTORE_COLLECTION = "config";
const FIRESTORE_DOCUMENT = "landing";

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
  if (!config) return null;

  const selected = [];
  if (config.showGanamos) selected.push("ganamos");
  if (config.showZeus) selected.push("zeus");
  if (config.showApostamos) selected.push("apostamos");
  return selected.length ? selected : null;
}

function getConfigFromThemes(themes) {
  return {
    showGanamos: themes.includes("ganamos"),
    showZeus: themes.includes("zeus"),
    showApostamos: themes.includes("apostamos")
  };
}

function setCheckboxStates(themes) {
  const checkboxInputs = document.querySelectorAll('input[name="theme-select"][type="checkbox"]');
  if (!checkboxInputs.length) return;

  checkboxInputs.forEach((input) => {
    input.checked = themes.includes(input.value);
  });
}

function applyRemoteThemes(remoteThemes) {
  const normalized = normalizeThemes(remoteThemes);
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
      const remoteThemes = getThemesFromConfig(config);
      if (remoteThemes) {
        applyRemoteThemes(remoteThemes);
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

function getDefaultThemeName() {
  return THEME_SEQUENCE[0] || 'ganamos';
}

function normalizeThemes(themes) {
  return Array.from(new Set(Array.isArray(themes) ? themes.filter((theme) => themeConfig[theme]) : []));
}

function getStoredTheme() {
  try {
    const storedMulti = localStorage.getItem(STORAGE_KEY_MULTI);
    if (storedMulti) {
      const parsed = JSON.parse(storedMulti);
      if (Array.isArray(parsed) && parsed.length && themeConfig[parsed[0]]) {
        return parsed[0];
      }
    }

    const legacy = localStorage.getItem(STORAGE_KEY);
    return themeConfig[legacy] ? legacy : getDefaultThemeName();
  } catch (error) {
    return getDefaultThemeName();
  }
}

function getStoredThemes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MULTI);
    const parsed = stored ? JSON.parse(stored) : null;
    const normalized = normalizeThemes(parsed);
    return normalized.length ? normalized : [getStoredTheme()];
  } catch (error) {
    return [getStoredTheme()];
  }
}

let activeThemes = getStoredThemes();
let activeTheme = activeThemes[0] || getStoredTheme();

function setStoredTheme(themeName) {
  try {
    localStorage.setItem(STORAGE_KEY, themeName);
  } catch (error) {
    console.warn('No se pudo guardar la configuración del casino.', error);
  }
}

function setStoredThemes(themes) {
  try {
    localStorage.setItem(STORAGE_KEY_MULTI, JSON.stringify(themes));
  } catch (error) {
    console.warn('No se pudo guardar la lista de casinos activos.', error);
  }
}

function setActiveThemes(themes) {
  const normalized = normalizeThemes(themes);
  const finalThemes = normalized.length ? normalized : [getDefaultThemeName()];
  activeThemes = finalThemes;
  activeTheme = finalThemes[0];
  setStoredThemes(finalThemes);
  setStoredTheme(activeTheme);
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
  try {
    const raw = localStorage.getItem('landingContent');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch (error) {
    return null;
  }
}

function setStoredLandingContent(content) {
  try {
    localStorage.setItem('landingContent', JSON.stringify(content));
  } catch (error) {
    console.warn('No se pudo guardar landingContent en localStorage', error);
  }
}

function getLandingContent() {
  return landingContent;
}

function setLandingContent(content, saveRemote = true) {
  landingContent = Object.assign({}, landingContent, content || {});
  renderContent();
  setStoredLandingContent(landingContent);
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

function applyTheme(themeName) {
  const safeTheme = themeConfig[themeName] ? themeName : getDefaultThemeName();
  activeTheme = safeTheme;
  document.body.setAttribute('data-theme', safeTheme);
  setStoredTheme(safeTheme);

  const mascot = document.getElementById('active-mascot');
  const cards = document.querySelectorAll('[data-theme-card]');
  const logosWrapper = document.querySelector('.brand-mark');

  if (logosWrapper) {
    logosWrapper.innerHTML = '';
    Object.entries(themeConfig).forEach(([key, theme]) => {
      if (activeThemes.includes(key)) {
        const image = document.createElement('img');
        image.src = theme.logos[0];
        image.alt = theme.label;
        image.className = 'brand-mark__image';
        logosWrapper.appendChild(image);
      }
    });
  }

  cards.forEach((card) => {
    card.classList.toggle('is-active', activeThemes.includes(card.getAttribute('data-theme-card')));
  });

  if (mascot) {
    const theme = themeConfig[safeTheme];
    fadeAsset(mascot, theme.mascot, theme.alt);
  }
}

function rotateTheme() {
  if (!activeThemes.length) {
    activeThemes = [getDefaultThemeName()];
  }

  if (activeThemes.length === 1) {
    return;
  }

  const currentIndex = activeThemes.indexOf(activeTheme);
  const nextTheme = activeThemes[(currentIndex + 1) % activeThemes.length] || activeThemes[0];
  applyTheme(nextTheme);
}

function openWhatsApp() {
  window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer');
}

function setViewportHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}

document.addEventListener('DOMContentLoaded', async () => {
  const firebaseConfig = await getRemoteConfig();
  const remoteThemes = getThemesFromConfig(firebaseConfig);

  if (remoteThemes && remoteThemes.length) {
    activeThemes = normalizeThemes(remoteThemes);
    activeTheme = activeThemes[0];
  } else {
    activeThemes = getStoredThemes();
    activeTheme = activeThemes[0] || getDefaultThemeName();
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
          .sort((a, b) => THEME_SEQUENCE.indexOf(a) - THEME_SEQUENCE.indexOf(b));

        if (!selected.length) {
          selected.push(getDefaultThemeName());
          checkboxInputs[0].checked = true;
        }

        const primary = setActiveThemes(selected);
        applyTheme(primary);

        await saveRemoteConfig(getConfigFromThemes(selected));
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
});

window.addEventListener('resize', setViewportHeight);

const landingSettingsAPI = {
  getLandingContent,
  setLandingContent,
  getStoredLandingContent,
  setStoredLandingContent,
  saveRemoteConfig
};

if (typeof window !== 'undefined') {
  window.landingSettings = landingSettingsAPI;
}

export { getLandingContent, setLandingContent, getStoredLandingContent, setStoredLandingContent, saveRemoteConfig };
