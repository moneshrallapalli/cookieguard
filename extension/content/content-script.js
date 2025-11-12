(function() {
  'use strict';

  const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  const originalSetItem = Storage.prototype.setItem;
  const cookieAccessLog = new Map();

  Object.defineProperty(document, 'cookie', {
    get: function() {
      return originalCookieDescriptor.get.call(this);
    },
    set: function(value) {
      try {
        const cookies = parseCookieString(value);
        cookies.forEach(cookie => {
          logCookieAccess('set', cookie);
        });
      } catch (error) {
        console.error('Cookie parse error:', error);
      }

      return originalCookieDescriptor.set.call(this, value);
    },
    configurable: true
  });

  Storage.prototype.setItem = function(key, value) {
    if (key.toLowerCase().includes('cookie') ||
        key.toLowerCase().includes('session') ||
        key.toLowerCase().includes('token')) {
      logStorageAccess('localStorage', key, value);
    }
    return originalSetItem.call(this, key, value);
  };

  function parseCookieString(cookieStr) {
    const cookies = [];
    const parts = cookieStr.split(';').map(p => p.trim());

    if (parts.length === 0) return cookies;

    const [nameValue, ...attributes] = parts;
    const [name, value] = nameValue.split('=');

    if (name && value !== undefined) {
      const cookie = {
        name: name.trim(),
        value: value.trim(),
        domain: window.location.hostname,
        path: '/',
        secure: false,
        httpOnly: false,
        sameSite: 'Lax'
      };

      attributes.forEach(attr => {
        const [key, val] = attr.split('=');
        const attrName = key.toLowerCase().trim();

        if (attrName === 'domain') cookie.domain = val.trim();
        else if (attrName === 'path') cookie.path = val.trim();
        else if (attrName === 'secure') cookie.secure = true;
        else if (attrName === 'httponly') cookie.httpOnly = true;
        else if (attrName === 'samesite') cookie.sameSite = val.trim();
        else if (attrName === 'expires') {
          cookie.expirationDate = new Date(val.trim()).getTime() / 1000;
        }
      });

      cookies.push(cookie);
    }

    return cookies;
  }

  function logCookieAccess(operation, cookie) {
    const key = `${cookie.domain}:${cookie.name}`;
    const now = Date.now();

    const existing = cookieAccessLog.get(key);
    if (existing && now - existing.timestamp < 1000) {
      return;
    }

    cookieAccessLog.set(key, { timestamp: now, operation });

    chrome.runtime.sendMessage({
      type: 'JS_COOKIE_ACCESS',
      data: {
        operation,
        cookie,
        url: window.location.href,
        timestamp: now
      }
    }).catch(() => {});
  }

  function logStorageAccess(storageType, key, value) {
    chrome.runtime.sendMessage({
      type: 'STORAGE_ACCESS',
      data: {
        storageType,
        key,
        valueLength: value.length,
        url: window.location.href,
        timestamp: Date.now()
      }
    }).catch(() => {});
  }

  const canvasObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'CANVAS') {
          monitorCanvas(node);
        }
      });
    });
  });

  canvasObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  function monitorCanvas(canvas) {
    const originalGetContext = canvas.getContext;
    canvas.getContext = function(contextType, ...args) {
      const context = originalGetContext.apply(this, [contextType, ...args]);

      if (contextType === '2d' || contextType === 'webgl') {
        chrome.runtime.sendMessage({
          type: 'FINGERPRINT_ATTEMPT',
          data: {
            type: 'canvas',
            contextType,
            url: window.location.href,
            timestamp: Date.now()
          }
        }).catch(() => {});
      }

      return context;
    };
  }

  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const cookieRelated = entries.filter(entry =>
      entry.name.includes('cookie') ||
      entry.name.includes('track') ||
      entry.name.includes('analytics')
    );

    if (cookieRelated.length > 0) {
      chrome.runtime.sendMessage({
        type: 'TRACKING_RESOURCE',
        data: {
          resources: cookieRelated.map(e => ({
            name: e.name,
            type: e.initiatorType,
            duration: e.duration
          })),
          url: window.location.href,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
  });

  try {
    observer.observe({ entryTypes: ['resource'] });
  } catch (error) {
    console.error('Performance observer error:', error);
  }

  setInterval(() => {
    const cutoff = Date.now() - 60000;
    for (const [key, value] of cookieAccessLog.entries()) {
      if (value.timestamp < cutoff) {
        cookieAccessLog.delete(key);
      }
    }
  }, 60000);

  console.log('CookieGuard content script loaded');
})();
