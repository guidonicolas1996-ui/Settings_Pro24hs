const PROTECTED_PAGE_PATHS = ['/settings.html', '/analytics.html'];

function normalizePathname(pathname) {
  return String(pathname || '').replace(/\\/g, '/');
}

function isProtectedPage(pathname) {
  const normalizedPathname = normalizePathname(pathname);
  return PROTECTED_PAGE_PATHS.some((protectedPath) => normalizedPathname.endsWith(protectedPath));
}

export function resolveLoginRedirectTarget(currentUrl = '') {
  if (!currentUrl) {
    return './settings.html';
  }

  try {
    const url = new URL(currentUrl, 'https://example.com');
    const pathname = normalizePathname(url.pathname);

    if (!isProtectedPage(pathname)) {
      return './settings.html';
    }

    return url.href;
  } catch (error) {
    return './settings.html';
  }
}

export function resolvePostLoginRedirectTarget(redirectParam = '', currentUrl = '', fallbackUrl = '') {
  const rawValue = typeof redirectParam === 'string' ? redirectParam.trim() : '';
  const normalizedValue = rawValue.startsWith('redirect=') ? rawValue.slice('redirect='.length) : rawValue;

  const candidateValue = normalizedValue || fallbackUrl || '';
  if (!candidateValue) {
    return './settings.html';
  }

  try {
    const decodedValue = decodeURIComponent(candidateValue);
    const resolvedUrl = new URL(decodedValue, currentUrl || 'https://example.com');
    return resolvedUrl.href;
  } catch (error) {
    const normalizedFallback = candidateValue.startsWith('/') ? candidateValue : './settings.html';
    return normalizedFallback;
  }
}
