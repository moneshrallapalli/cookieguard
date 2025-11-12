// CookieGuard Service Worker - Fixed Version (No ES6 Modules)
console.log('🍪 CookieGuard Service Worker Loading...');

// ============================================================================
// DATABASE MANAGER (Inline)
// ============================================================================
const DB_NAME = 'CookieGuardDB';
const DB_VERSION = 1;
const STORES = {
  COOKIES: 'cookies',
  CLASSIFICATIONS: 'classifications',
  SETTINGS: 'settings'
};

class DBManager {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✓ Database initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORES.COOKIES)) {
          const cookieStore = db.createObjectStore(STORES.COOKIES, {
            keyPath: 'id',
            autoIncrement: true
          });
          cookieStore.createIndex('domain', 'domain', { unique: false });
          cookieStore.createIndex('name', 'name', { unique: false });
          cookieStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CLASSIFICATIONS)) {
          const classStore = db.createObjectStore(STORES.CLASSIFICATIONS, {
            keyPath: 'cookieId'
          });
          classStore.createIndex('category', 'category', { unique: false });
          classStore.createIndex('confidence', 'confidence', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
      };
    });
  }

  async addCookie(cookieData) {
    const tx = this.db.transaction([STORES.COOKIES], 'readwrite');
    const store = tx.objectStore(STORES.COOKIES);
    return new Promise((resolve, reject) => {
      const request = store.add({
        ...cookieData,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addClassification(cookieId, classification) {
    const tx = this.db.transaction([STORES.CLASSIFICATIONS], 'readwrite');
    const store = tx.objectStore(STORES.CLASSIFICATIONS);
    return new Promise((resolve, reject) => {
      const request = store.put({
        cookieId,
        ...classification,
        timestamp: Date.now()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCookies(limit = 1000) {
    const tx = this.db.transaction([STORES.COOKIES], 'readonly');
    const store = tx.objectStore(STORES.COOKIES);
    return new Promise((resolve, reject) => {
      const request = store.getAll(null, limit);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getStatsByCategory() {
    const tx = this.db.transaction([STORES.CLASSIFICATIONS], 'readonly');
    const store = tx.objectStore(STORES.CLASSIFICATIONS);
    const index = store.index('category');

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => {
        const classifications = request.result;
        const stats = classifications.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {});
        resolve(stats);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getSetting(key) {
    const tx = this.db.transaction([STORES.SETTINGS], 'readonly');
    const store = tx.objectStore(STORES.SETTINGS);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async setSetting(key, value) {
    const tx = this.db.transaction([STORES.SETTINGS], 'readwrite');
    const store = tx.objectStore(STORES.SETTINGS);
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

const dbManager = new DBManager();

// ============================================================================
// RULE-BASED CLASSIFIER (Inline - No ONNX for now)
// ============================================================================
const CATEGORIES = {
  ESSENTIAL: 'essential',
  FUNCTIONAL: 'functional',
  ANALYTICS: 'analytics',
  ADVERTISING: 'advertising',
  SOCIAL: 'social',
  UNKNOWN: 'unknown'
};

class SimpleClassifier {
  classify(cookie) {
    const name = cookie.name.toLowerCase();
    const domain = cookie.domain.toLowerCase();

    // Essential cookies
    if (this.isEssential(name, domain, cookie)) {
      return {
        category: CATEGORIES.ESSENTIAL,
        confidence: 0.95,
        method: 'rules'
      };
    }

    // Analytics cookies
    if (this.isAnalytics(name, domain)) {
      return {
        category: CATEGORIES.ANALYTICS,
        confidence: 0.9,
        method: 'rules'
      };
    }

    // Advertising cookies
    if (this.isAdvertising(name, domain)) {
      return {
        category: CATEGORIES.ADVERTISING,
        confidence: 0.9,
        method: 'rules'
      };
    }

    // Social cookies
    if (this.isSocial(domain)) {
      return {
        category: CATEGORIES.SOCIAL,
        confidence: 0.85,
        method: 'rules'
      };
    }

    // Functional cookies
    if (this.isFunctional(name, domain, cookie)) {
      return {
        category: CATEGORIES.FUNCTIONAL,
        confidence: 0.7,
        method: 'rules'
      };
    }

    // Unknown
    return {
      category: CATEGORIES.UNKNOWN,
      confidence: 0.5,
      method: 'rules'
    };
  }

  isEssential(name, domain, cookie) {
    const essentialPatterns = [
      /^(session|csrf|xsrf|auth|token)/i,
      /^(cookie.?consent|cookie.?banner)/i,
      /^(laravel|phpsessid|jsessionid)/i,
      /^(SIDCC|__Secure-.*SIDCC|NID|HSID|SSID|APISID|SAPISID)/i  // Google essential
    ];
    const essentialDomains = ['google.com', 'gstatic.com', 'youtube.com'];

    return essentialPatterns.some(p => p.test(name)) ||
           (cookie.secure && cookie.httpOnly && cookie.hostOnly) ||
           (essentialDomains.some(d => domain.includes(d)) && cookie.secure);
  }

  isAnalytics(name, domain) {
    const analyticsPatterns = [
      /^(_ga|_gid|_gat)/,
      /^(__utm[a-z])/,
      /(analytics|stats)/i
    ];
    const analyticsDomains = ['google-analytics.com', 'googletagmanager.com'];
    return analyticsPatterns.some(p => p.test(name)) ||
           analyticsDomains.some(d => domain.includes(d));
  }

  isAdvertising(name, domain) {
    const adPatterns = [
      /^(_fbp|_fbc|fr|ide|test_cookie)/,
      /(doubleclick|adsense|adserver|adtech)/i
    ];
    const adDomains = ['doubleclick.net', 'adsense.google.com'];
    return adPatterns.some(p => p.test(name)) ||
           adDomains.some(d => domain.includes(d));
  }

  isSocial(domain) {
    // ONLY classify third-party social widgets as "social"
    // DO NOT classify cookies from main social sites (linkedin.com, facebook.com, etc.)
    // because when users are ON those sites, the cookies are functional/essential
    const socialWidgetDomains = [
      'connect.facebook.net',    // Facebook widget
      'platform.twitter.com',    // Twitter widget
      'platform.linkedin.com',   // LinkedIn widget
      'widgets.pinterest.com',   // Pinterest widget
      'embed.reddit.com'         // Reddit embed
    ];
    return socialWidgetDomains.some(d => domain.includes(d));
  }

  isFunctional(name, domain, cookie) {
    // First-party session cookies
    if (cookie.hostOnly && !cookie.expirationDate) {
      return true;
    }

    // LinkedIn functional cookies
    const linkedInPatterns = /^(bcookie|bscookie|lang|lidc|li_at|li_theme|timezone|sdui_ver|li_sugr|aam_uuid|g_state|liap|lms_ads|lms_analytics|dfpfpt|fptctx2|_guid|_pxvid|UserMatchHistory|AnalyticsSyncHistory)/i;
    if (domain.includes('linkedin.com') && linkedInPatterns.test(name)) {
      return true;
    }

    // Facebook functional cookies (when on facebook.com)
    const facebookPatterns = /^(c_user|xs|datr|locale|wd)/i;
    if (domain.includes('facebook.com') && facebookPatterns.test(name)) {
      return true;
    }

    // Cloudflare security cookies
    if (/^__cf_bm/i.test(name)) {
      return true;
    }

    // Adobe/analytics functional cookies (non-tracking)
    if (/^(AMCV_|AMCVS_)/i.test(name)) {
      return true;
    }

    return false;
  }
}

const classifier = new SimpleClassifier();

// ============================================================================
// COOKIE PROCESSING
// ============================================================================
const MODES = {
  OBSERVE: 'observe',
  BALANCED: 'balanced',
  STRICT: 'strict'
};

let currentMode = MODES.OBSERVE;  // DEFAULT: Don't block anything!
let processingQueue = [];
let isProcessing = false;
let processedCookies = new Set();  // Track processed cookies to prevent loops

async function hashValue(value) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookieUrl(cookie) {
  const protocol = cookie.secure ? 'https://' : 'http://';
  const domain = cookie.domain.startsWith('.') ?
    cookie.domain.substring(1) : cookie.domain;
  return `${protocol}${domain}${cookie.path}`;
}

function shouldBlock(classification) {
  if (currentMode === MODES.OBSERVE) return false;
  if (classification.category === 'essential') return false;

  if (currentMode === MODES.STRICT) {
    return classification.category === 'advertising' ||
           classification.category === 'social' ||
           classification.category === 'analytics';
  }

  if (currentMode === MODES.BALANCED) {
    return classification.category === 'advertising' ||
           classification.category === 'social';
  }

  return false;
}

async function processQueue() {
  if (processingQueue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const cookie = processingQueue.shift();

  try {
    const classification = classifier.classify(cookie);

    const cookieId = await dbManager.addCookie({
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      valueHash: await hashValue(cookie.value),
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate,
      hostOnly: cookie.hostOnly,
      session: cookie.session
    });

    await dbManager.addClassification(cookieId, classification);

    console.log(`🍪 Classified: ${cookie.name} as ${classification.category}`);

    if (shouldBlock(classification)) {
      await chrome.cookies.remove({
        url: getCookieUrl(cookie),
        name: cookie.name
      });
      console.log(`🚫 Blocked ${classification.category} cookie: ${cookie.name}`);
    }
  } catch (error) {
    console.error('Error processing cookie:', error);
  }

  setTimeout(processQueue, 0);
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================
// Initialize on every load (dev reload safe)
async function initializeExtension() {
  console.log('🔄 Initializing CookieGuard...');

  try {
    await dbManager.init();
    console.log('✓ Database initialized');

    // Force OBSERVE mode on initialization (safe mode - no blocking)
    currentMode = MODES.OBSERVE;
    await dbManager.setSetting('mode', MODES.OBSERVE);
    await dbManager.setSetting('blockingEnabled', false);

    console.log('✓ CookieGuard ready, mode:', currentMode);
    console.log('⚠️ OBSERVE MODE: Not blocking any cookies');
  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
}

// Call on every extension load
initializeExtension();

chrome.runtime.onInstalled.addListener(async () => {
  console.log('✓ CookieGuard installed');
  await initializeExtension();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('✓ Browser started');
  await initializeExtension();
});

chrome.cookies.onChanged.addListener(async (changeInfo) => {
  if (changeInfo.removed) return;

  const cookie = changeInfo.cookie;

  // Create unique ID for cookie to prevent processing same cookie multiple times
  const cookieId = `${cookie.domain}:${cookie.name}:${cookie.value}`;

  // Skip if we've already processed this cookie recently
  if (processedCookies.has(cookieId)) {
    return;
  }

  processedCookies.add(cookieId);

  // Clear old entries after 1 minute
  setTimeout(() => {
    processedCookies.delete(cookieId);
  }, 60000);

  processingQueue.push(cookie);

  if (!isProcessing) {
    processQueue();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATS') {
    handleGetStats().then(sendResponse);
    return true;
  }

  if (message.type === 'SET_MODE') {
    handleSetMode(message.mode).then(sendResponse);
    return true;
  }

  if (message.type === 'CLEAR_COOKIES') {
    handleClearCookies(message.category).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_DASHBOARD_DATA') {
    handleGetDashboardData().then(sendResponse);
    return true;
  }
});

async function handleGetStats() {
  try {
    const [categoryStats, totalCookies] = await Promise.all([
      dbManager.getStatsByCategory(),
      dbManager.getAllCookies(1)
    ]);

    const total = Object.values(categoryStats).reduce((a, b) => a + b, 0);

    return {
      success: true,
      stats: {
        total,
        byCategory: categoryStats,
        mode: currentMode
      }
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { success: false, error: error.message };
  }
}

async function handleSetMode(mode) {
  if (!Object.values(MODES).includes(mode)) {
    return { success: false, error: 'Invalid mode' };
  }

  currentMode = mode;
  await dbManager.setSetting('mode', mode);
  console.log('⚙️ Mode changed to:', mode);

  return { success: true, mode: currentMode };
}

async function handleClearCookies(category) {
  try {
    const cookies = await chrome.cookies.getAll({});
    let removed = 0;

    for (const cookie of cookies) {
      const classification = classifier.classify(cookie);

      if (!category || classification.category === category) {
        await chrome.cookies.remove({
          url: getCookieUrl(cookie),
          name: cookie.name
        });
        removed++;
      }
    }

    console.log(`🗑️ Cleared ${removed} cookies`);
    return { success: true, removed };
  } catch (error) {
    console.error('Error clearing cookies:', error);
    return { success: false, error: error.message };
  }
}

async function handleGetDashboardData() {
  try {
    const allCookies = await dbManager.getAllCookies(5000);

    const cookiesWithClassifications = await Promise.all(
      allCookies.map(async (cookie) => {
        const classification = await dbManager.getClassification(cookie.id);
        return {
          ...cookie,
          classification: classification || { category: 'unknown', confidence: 0.5 }
        };
      })
    );

    console.log(`📊 Dashboard data: ${cookiesWithClassifications.length} cookies`);
    return {
      success: true,
      data: cookiesWithClassifications
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return { success: false, error: error.message };
  }
}

console.log('✓ CookieGuard Service Worker Loaded Successfully!');
