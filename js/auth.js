const AUTH_STORAGE_KEY = 'adminSession';
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBxduoIjvtM7arjMzKfwqDl4Rt-3eVogf8',
  authDomain: 'landing-pro24.firebaseapp.com',
  projectId: 'landing-pro24',
  messagingSenderId: '705239660423',
  appId: '1:705239660423:web:f91ef0cc5e345791fb4522'
};

let firebaseAuthPromise = null;

function getStorage() {
  try {
    return window.sessionStorage;
  } catch (error) {
    return null;
  }
}

async function getFirebaseAuth() {
  if (firebaseAuthPromise) {
    return firebaseAuthPromise;
  }

  firebaseAuthPromise = (async () => {
    const [{ initializeApp }, { getAuth }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js')
    ]);

    const app = initializeApp(FIREBASE_CONFIG);
    return getAuth(app);
  })();

  return firebaseAuthPromise;
}

async function waitForFirebaseUser(auth, timeoutMs = 2500) {
  if (!auth || typeof auth.onAuthStateChanged !== 'function') {
    return null;
  }

  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });

    if (typeof timeoutMs === 'number') {
      setTimeout(() => {
        unsubscribe();
        resolve(auth.currentUser || null);
      }, timeoutMs);
    }
  });
}

function getStoredSession() {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setStoredSession(userOrEmail) {
  if (!userOrEmail) return;
  const session = {
    uid: userOrEmail.uid || null,
    email: userOrEmail.email || userOrEmail,
    loggedAt: new Date().toISOString()
  };

  const storage = getStorage();
  if (!storage) return;

  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  try {
    console.log('[auth] setStoredSession', session);
  } catch (e) {
    /* ignore */
  }
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    // Ignore cleanup errors.
  }
}

function clearStoredSession() {
  const storage = getStorage();
  if (storage) {
    storage.removeItem(AUTH_STORAGE_KEY);
  }

  try {
    console.log('[auth] clearStoredSession');
  } catch (e) {
    /* ignore */
  }

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    // Ignore cleanup errors.
  }
}

function isAuthenticated() {
  return !!getStoredSession();
}

function redirectToLogin() {
  if (window.location.pathname.includes('login.html')) return;
  const loginUrl = new URL('/login.html', window.location.href).href;
  window.location.replace(loginUrl);
}

async function clearSession() {
  try {
    console.log('[auth] clearSession start');
  } catch (e) {}
  try {
    const auth = await getFirebaseAuth();
    if (auth && typeof auth.signOut === 'function') {
      await auth.signOut();
      await waitForFirebaseUser(auth, 2500);
    }
  } catch (error) {
    console.warn('No se pudo cerrar la sesión de Firebase', error);
  }
  clearStoredSession();
  try {
    console.log('[auth] clearSession done');
  } catch (e) {}
}

async function ensureAuthGate() {
  const protectedPaths = ['/settings.html', '/analytics.html'];
  const pathname = window.location.pathname.replace(/\\/g, '/');
  const isProtected = protectedPaths.some((path) => pathname.endsWith(path));

  if (!isProtected) {
    return true;
  }

  try {
    const auth = await getFirebaseAuth();
    try { console.log('[auth] ensureAuthGate checking user', { pathname, currentUser: !!auth.currentUser }); } catch(e){}
    if (auth.currentUser && typeof auth.currentUser.reload === 'function') {
      try {
        await auth.currentUser.reload();
      } catch (reloadError) {
        console.warn('No se pudo recargar el usuario de Firebase', reloadError);
      }
    }

    const user = auth.currentUser || await waitForFirebaseUser(auth, 2500);
    try { console.log('[auth] ensureAuthGate user', user && { uid: user.uid, email: user.email }); } catch(e){}

    if (!user || !user.uid) {
      await clearSession();
      redirectToLogin();
      return false;
    }

    setStoredSession(user);
    return true;
  } catch (error) {
    console.warn('No se pudo validar la sesión de Firebase', error);
    await clearSession();
    redirectToLogin();
    return false;
  }
}

async function requireAuth() {
  const ok = await ensureAuthGate();
  if (!ok) {
    throw new Error('Acceso no autorizado');
  }
  return true;
}

window.authGuard = {
  getStoredSession,
  isAuthenticated,
  clearSession,
  redirectToLogin,
  ensureAuthGate
};

export { AUTH_STORAGE_KEY, FIREBASE_CONFIG, getStoredSession, setStoredSession, isAuthenticated, clearSession, redirectToLogin, ensureAuthGate, getFirebaseAuth };
