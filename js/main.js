/* Configuración principal de textos y destino del botón */
const landingContent = {
  accessBadge: 'ACCESO VIP',
  heroTitle: 'OBTENÉ UN <span class="gradient-text">100%</span> EN TU PRIMER DEPÓSITO',
  heroCopy: 'Escribinos apretando el botón de abajo.',
  ctaLabel: 'WHATSAPP OFFICIAL',
  helperText: 'ATENCIÓN Y RETIROS LAS 24 HS',
  footerText: '© 2026 el juego es solo +18. Operá con responsabilidad.'
};

const WHATSAPP_URL = 'https://wa.me/5491112345678?text=Hola%20quiero%20recibir%20información';

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

function openWhatsApp() {
  window.open(WHATSAPP_URL, '_blank', 'noopener,noreferrer');
}

function setViewportHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}

document.addEventListener('DOMContentLoaded', () => {
  renderContent();
  setViewportHeight();

  const whatsappButton = document.getElementById('whatsapp-button');
  if (whatsappButton) {
    whatsappButton.addEventListener('click', openWhatsApp);
  }
});

window.addEventListener('resize', setViewportHeight);
