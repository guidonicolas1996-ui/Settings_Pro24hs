/* Configuración principal de textos y destino del botón */
const landingContent = {
  accessBadge: 'ACCESO VIP',
  heroTitle: 'OBTENÉ UN <span class="gradient-text">100%</span> EN TU PRIMER DEPÓSITO',
  heroCopy: 'Escribinos apretando el botón de abajo.',
  ctaLabel: 'WHATSAPP OFICIAL',
  helperText: 'ATENCIÓN Y RETIROS LAS 24 HS',
  footerText: '© 2026 el juego es solo +18. Operá con responsabilidad.'
};

const WHATSAPP_URL = 'https://www.linkify.com.ar/api/soporte?id=k6cipb';
const STORAGE_KEY = 'activeCasino';
const STORAGE_KEY_MULTI = 'activeCasinos';
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
  const footerText = document.getElementById('footer-text');

  if (accessBadge) accessBadge.textContent = landingContent.accessBadge;
  if (heroTitle) heroTitle.innerHTML = landingContent.heroTitle;
  if (heroCopy) heroCopy.textContent = landingContent.heroCopy;
  if (ctaLabel) ctaLabel.textContent = landingContent.ctaLabel;
  if (helperText) helperText.textContent = landingContent.helperText;
  if (footerText) footerText.textContent = landingContent.footerText;
}

function fadeAsset(element, src, alt) {
  if (!element) return;

  const currentSrc = element.getAttribute('src');
  if (currentSrc === src) {
    element.setAttribute('alt', alt);
    return;
  }

  element.style.opacity = '0';
  element.style.transform = 'scale(0.96)';

  window.setTimeout(() => {
    element.setAttribute('src', src);
    element.setAttribute('alt', alt);
    element.style.opacity = '1';
    element.style.transform = 'scale(1)';
  }, 180);
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

document.addEventListener('DOMContentLoaded', () => {
  renderContent();
  setViewportHeight();
  applyTheme(activeTheme);

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
      input.addEventListener('change', () => {
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
