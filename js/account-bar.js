import { clearSession, getStoredSession } from './auth.js';

function formatTenantName(value) {
  const rawName = String(value || '').trim().replace(/\.vercel\.app$/i, '');
  if (!rawName) return 'Casino';

  return rawName
    .replace(/[\-_\\/]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const normalizedWord = word.toLowerCase();
      return normalizedWord.charAt(0).toUpperCase() + normalizedWord.slice(1);
    })
    .join(' ');
}

const session = getStoredSession();
const tenantSource = session?.tenantId || String(session?.email || '').split('@')[0] || window.location.hostname;
const formattedTenantName = formatTenantName(tenantSource);
const tenantName = document.getElementById('tenant-name');
if (tenantName) {
  tenantName.textContent = formattedTenantName;
}
document.title = formattedTenantName;

document.getElementById('logout-button')?.addEventListener('click', async () => {
  await clearSession();
  window.location.replace('./login.html');
});