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

    return pathname.endsWith('/analytics.html') ? './analytics.html' : './settings.html';
  } catch (error) {
    return './settings.html';
  }
}

export function resolvePostLoginRedirectTarget(redirectParam = '', currentUrl = '') {
  const rawValue = typeof redirectParam === 'string' ? redirectParam.trim() : '';
  const normalizedValue = rawValue.startsWith('redirect=') ? rawValue.slice('redirect='.length) : rawValue;

  if (!normalizedValue) {
    return './settings.html';
  }

  try {
    const resolvedUrl = new URL(normalizedValue, currentUrl || 'https://example.com');
    return resolvedUrl.pathname.replace(/\\/g, '/');
  } catch (error) {
    return normalizedValue.startsWith('/') ? normalizedValue : './settings.html';
  }
}
