/**
 * Cloud sync for translation history — Firebase Auth + Firestore.
 *
 * Design notes:
 * - Firebase is loaded with a dynamic import(), so a build with no Firebase
 *   credentials still runs (local-only mode) instead of crashing at startup.
 * - The web config is served by the Express backend at /api/config from
 *   environment variables, so no secret ever ships in the client bundle.
 * - Everything degrades gracefully: when unconfigured or offline, the app
 *   reports a clear state and keeps working from localStorage.
 */

export interface CloudUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface CloudSyncStatus {
  configured: boolean;
  signedIn: boolean;
  online: boolean;
  lastSyncedAt?: string;
  message: string;
}

export interface CloudHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  sourceLangName?: string;
  targetLangName?: string;
  domain?: string;
  dialect?: string;
  tone?: string;
  timestamp: string;
  favorites?: boolean;
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const HISTORY_LIMIT = 500;
const STATUS_KEY = 'mahdi_cloud_sync_status';
const USER_KEY = 'mahdi_google_user';

type FirebaseModules = {
  auth: any;
  db: any;
  app: any;
};

let modulesPromise: Promise<FirebaseModules | null> | null = null;
let configCache: FirebaseWebConfig | null = null;

/** Fetches the public Firebase web config from the backend (memoized). */
export async function getFirebaseConfig(): Promise<FirebaseWebConfig | null> {
  if (configCache) return configCache;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return null;
    const data = await res.json();
    const cfg = data?.firebase;
    if (!cfg?.apiKey || !cfg?.projectId) return null;
    configCache = cfg as FirebaseWebConfig;
    return configCache;
  } catch {
    return null;
  }
}

/** Lazily initializes Firebase. Returns null when not configured/available. */
async function getFirebase(): Promise<FirebaseModules | null> {
  if (modulesPromise) return modulesPromise;

  modulesPromise = (async () => {
    const config = await getFirebaseConfig();
    if (!config) return null;
    try {
      const [appMod, authMod, fsMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const existing = appMod.getApps().find(a => a.name === 'mahdi') || appMod.initializeApp(config, 'mahdi');
      const auth = authMod.getAuth(existing);
      authMod.setPersistence(auth, authMod.browserLocalPersistence).catch(() => undefined);
      const db = fsMod.getFirestore(existing);
      return { auth, db, app: existing };
    } catch (err) {
      console.warn('[cloud] Firebase init failed:', err);
      return null;
    }
  })();

  return modulesPromise;
}

/** Current signed-in user, or null. */
export function getSignedInUser(): CloudUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CloudUser) : null;
  } catch {
    return null;
  }
}

function persistUser(user: CloudUser | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

export function readCloudStatus(): CloudSyncStatus {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (raw) return JSON.parse(raw) as CloudSyncStatus;
  } catch {}
  return {
    configured: false,
    signedIn: false,
    online: typeof navigator === 'undefined' ? false : navigator.onLine,
    message: 'المزامنة السحابية غير مفعّلة بعد',
  };
}

function writeCloudStatus(status: CloudSyncStatus) {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  } catch {}
}

/**
 * Signs the user in with Google through Firebase Auth.
 * Returns the signed-in user, or null when cloud sync is not configured.
 */
export async function signInWithGoogle(): Promise<CloudUser | null> {
  const fb = await getFirebase();
  if (!fb) {
    writeCloudStatus({
      configured: false,
      signedIn: false,
      online: navigator.onLine,
      message: 'لتفعيل المزامنة أضف مفاتيح Firebase في ملف .env ثم أعد التشغيل',
    });
    return null;
  }

  try {
    const { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, fetchSignInMethodsForEmail } =
      await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    let cred: any = null;
    try {
      cred = await signInWithPopup(fb.auth, provider);
    } catch (popupErr: any) {
      // Popups are blocked in some in-app browsers — fall back to a redirect.
      if (popupErr?.code === 'auth/popup-blocked') {
        try {
          cred = (await getRedirectResult(fb.auth)) || null;
          if (!cred) await signInWithRedirect(fb.auth, provider);
        } catch {
          cred = null;
        }
      } else if (popupErr?.code === 'auth/operation-not-supported-in-this-environment') {
        try {
          cred = (await getRedirectResult(fb.auth)) || null;
          if (!cred) await signInWithRedirect(fb.auth, provider);
        } catch {
          cred = null;
        }
      } else {
        // Account exists with another provider → try linking via email.
        const email = popupErr?.customData?.email;
        if (email && popupErr?.code === 'auth/account-exists-with-different-credential') {
          const methods = await fetchSignInMethodsForEmail(fb.auth, email);
          if (methods?.[0] === 'password') throw popupErr;
        }
        throw popupErr;
      }
    }

    if (!cred?.user) return null;
    const user: CloudUser = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
      photoURL: cred.user.photoURL,
    };
    persistUser(user);
    writeCloudStatus({
      configured: true,
      signedIn: true,
      online: navigator.onLine,
      lastSyncedAt: new Date().toISOString(),
      message: 'تم تسجيل الدخول — المزامنة جاهزة',
    });
    return user;
  } catch (err: any) {
    console.warn('[cloud] sign-in failed:', err);
    writeCloudStatus({
      configured: true,
      signedIn: false,
      online: navigator.onLine,
      message: `تعذر تسجيل الدخول: ${err?.message || 'خطأ غير معروف'}`,
    });
    return null;
  }
}

/** Signs out and clears the locally cached identity. */
export async function signOutUser(): Promise<void> {
  const fb = await getFirebase();
  if (fb) {
    try {
      const { signOut } = await import('firebase/auth');
      await signOut(fb.auth);
    } catch {}
  }
  persistUser(null);
  writeCloudStatus({
    configured: Boolean(await getFirebaseConfig()),
    signedIn: false,
    online: navigator.onLine,
    message: 'تم تسجيل الخروج',
  });
}

/** Merges two history lists by id, newest `timestamp` wins. */
export function mergeHistory(a: CloudHistoryItem[], b: CloudHistoryItem[]): CloudHistoryItem[] {
  const map = new Map<string, CloudHistoryItem>();
  for (const item of [...b, ...a]) {
    const existing = map.get(item.id);
    if (!existing || new Date(item.timestamp) >= new Date(existing.timestamp)) map.set(item.id, item);
  }
  return Array.from(map.values())
    .sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime())
    .slice(0, HISTORY_LIMIT);
}

/** Uploads the local history to `users/{uid}/history` in Firestore. */
export async function pushHistory(items: CloudHistoryItem[]): Promise<number> {
  const user = getSignedInUser();
  const fb = await getFirebase();
  if (!user || !fb || !items.length) return 0;

  const { doc, writeBatch } = await import('firebase/firestore');
  const chunkSize = 400; // Firestore batch limit is 500 writes
  let written = 0;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const batch = writeBatch(fb.db);
    for (const item of chunk) {
      batch.set(
        doc(fb.db, 'users', user.uid, 'history', item.id),
        { ...item, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

/** Downloads the user's history from Firestore. */
export async function pullHistory(): Promise<CloudHistoryItem[]> {
  const user = getSignedInUser();
  const fb = await getFirebase();
  if (!user || !fb) return [];

  const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
  try {
    const snap = await getDocs(
      query(collection(fb.db, 'users', user.uid, 'history'), orderBy('timestamp', 'desc'), limit(HISTORY_LIMIT))
    );
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CloudHistoryItem, 'id'>) }));
  } catch (err) {
    console.warn('[cloud] pull failed (missing index or rules?):', err);
    return [];
  }
}

/** Full two-way sync: upload local items, then return the merged history. */
export async function syncHistory(localItems: CloudHistoryItem[]): Promise<{ merged: CloudHistoryItem[]; pushed: number }> {
  const user = getSignedInUser();
  if (!user) {
    writeCloudStatus({
      configured: Boolean(await getFirebaseConfig()),
      signedIn: false,
      online: navigator.onLine,
      message: 'سجّل الدخول أولاً لمزامنة السجل',
    });
    return { merged: localItems, pushed: 0 };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    writeCloudStatus({
      configured: true,
      signedIn: true,
      online: false,
      message: 'لا يوجد اتصال — ستُزامَن البيانات عند عودة الإنترنت',
    });
    return { merged: localItems, pushed: 0 };
  }

  const [remote, pushed] = await Promise.all([pullHistory(), pushHistory(localItems)]);
  const merged = mergeHistory(localItems, remote);

  writeCloudStatus({
    configured: true,
    signedIn: true,
    online: true,
    lastSyncedAt: new Date().toISOString(),
    message: `تمت المزامنة — ${pushed} عنصر مرفوع`,
  });
  return { merged, pushed };
}

/** Live subscription to the user's history; returns an unsubscribe function. */
export async function subscribeToHistory(
  onChange: (items: CloudHistoryItem[]) => void
): Promise<(() => void) | null> {
  const user = getSignedInUser();
  const fb = await getFirebase();
  if (!user || !fb) return null;

  const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
  try {
    return onSnapshot(
      query(collection(fb.db, 'users', user.uid, 'history'), orderBy('timestamp', 'desc'), limit(HISTORY_LIMIT)),
      snap => onChange(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CloudHistoryItem, 'id'>) }))),
      err => console.warn('[cloud] subscription error:', err)
    );
  } catch (err) {
    console.warn('[cloud] subscribe failed:', err);
    return null;
  }
}

/** Deletes a single history document from the cloud. */
export async function deleteHistoryItem(id: string): Promise<boolean> {
  const user = getSignedInUser();
  const fb = await getFirebase();
  if (!user || !fb) return false;
  const { doc, deleteDoc } = await import('firebase/firestore');
  try {
    await deleteDoc(doc(fb.db, 'users', user.uid, 'history', id));
    return true;
  } catch {
    return false;
  }
}

/** Clears the user's cloud history entirely. */
export async function clearHistory(): Promise<boolean> {
  const user = getSignedInUser();
  const fb = await getFirebase();
  if (!user || !fb) return false;
  const { collection, getDocs, writeBatch } = await import('firebase/firestore');
  try {
    const snap = await getDocs(collection(fb.db, 'users', user.uid, 'history'));
    if (snap.empty) return true;
    let batch = writeBatch(fb.db);
    let count = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      if (++count % 400 === 0) {
        await batch.commit();
        batch = writeBatch(fb.db);
      }
    }
    await batch.commit();
    return true;
  } catch {
    return false;
  }
}

/** Whether Firestore sync can be used right now. */
export async function isCloudConfigured(): Promise<boolean> {
  return Boolean(await getFirebaseConfig());
}
