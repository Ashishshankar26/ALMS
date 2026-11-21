import { DeviceEventEmitter, Platform } from 'react-native';

export const ALMS_SESSION_RESTORED = 'ALMS_SESSION_RESTORED';

/**
 * Spoofed UserAgent matching platform OS to prevent Cloudflare Turnstile fingerprinting mismatches
 * and bypass embedded WebView bot detection.
 */
export const SPOOFED_USER_AGENT = Platform.OS === 'ios'
  ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
  : "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";

/**
 * Headers required on WebView HTTP requests to strip the 'X-Requested-With' header
 * that signals an Android WebView container to Cloudflare.
 */
export const TURNSTILE_WEBVIEW_HEADERS = {
  'X-Requested-With': '',
};

/**
 * Common Turnstile compatibility props for React Native WebView.
 */
export const COMMON_TURNSTILE_WEBVIEW_PROPS = {
  originWhitelist: ['*'] as string[],
  setSupportMultipleWindows: false,
  allowsInlineMediaPlayback: true,
  allowFileAccess: true,
  allowUniversalAccessFromFileURLs: true,
  mixedContentMode: 'always' as const,
  androidLayerType: 'none' as const,
  javaScriptEnabled: true,
  domStorageEnabled: true,
  sharedCookiesEnabled: true,
  thirdPartyCookiesEnabled: true,
  cacheEnabled: true,
};

/**
 * Broadcast to all active WebViews and ScraperContext that a valid session is active/restored.
 */
export function notifySessionRestored(details: { sourceUrl?: string; timestamp?: number } = {}) {
  console.log('[ALMS Session] Session restored globally — broadcasting to all WebViews and background scraper', details);
  DeviceEventEmitter.emit(ALMS_SESSION_RESTORED, {
    timestamp: Date.now(),
    ...details,
  });
}

/**
 * Check if a URL indicates the user was redirected to a login or session expired screen.
 */
export function isLoginOrSessionUrl(url: string = ''): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('loginnew.aspx') ||
    lower.includes('login.aspx') ||
    lower.includes('index.aspx') ||
    lower.includes('frmsessionexpired') ||
    lower.includes('default.aspx?msg=') ||
    lower.includes('happenings.lpu.in')
  );
}

/**
 * Check if a URL is an authenticated page (e.g. dashboard, reports, placement, leave, etc.).
 */
export function isAuthenticatedUrl(url: string = ''): boolean {
  if (!url || isLoginOrSessionUrl(url)) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('studentdashboard.aspx') ||
    lower.includes('dashboard') ||
    lower.includes('frmplacementhome') ||
    lower.includes('frmplacement') ||
    lower.includes('homeplacementstudent') ||
    (lower.includes('/placements/') && !lower.includes('default.aspx')) ||
    lower.includes('frmstudenthostelleaveapplication') ||
    lower.includes('frmhostelleaveslip') ||
    lower.includes('frmstatementofaccounts') ||
    lower.includes('frmmts') ||
    lower.includes('frmstudentassignmentupload') ||
    lower.includes('seatingplan') ||
    lower.includes('resultsummary') ||
    lower.includes('default.aspx') ||
    lower.includes('user-profile') ||
    lower.includes('.aspx')
  );
}

/**
 * Script injected before any DOM content loads.
 * 1. Hides window.ReactNativeWebView (stores in private window.__RN_WV_REF__) to prevent Cloudflare Turnstile detection.
 * 2. Spoofs navigator.webdriver, navigator.plugins, navigator.languages, and window.chrome.
 * 3. Kills blur/focusout/change events on UMS login input fields so ASP.NET anti-bot validation doesn't lock fields.
 */
export const TURNSTILE_BEFORE_CONTENT_JS = `
  (function() {
    try {
      // 1. Save bridge reference — only hide it on login pages to avoid breaking scraper scripts
      if (window.ReactNativeWebView) {
        window.__RN_WV_REF__ = window.ReactNativeWebView;
      }
      var href = (window.location.href || '').toLowerCase();
      var isLoginPage = href.indexOf('loginnew.aspx') !== -1 || href.indexOf('login.aspx') !== -1 || href.indexOf('index.aspx') !== -1;
      if (isLoginPage && window.ReactNativeWebView) {
        delete window.ReactNativeWebView;
      } else if (!isLoginPage && !window.ReactNativeWebView && window.__RN_WV_REF__) {
        // Restore bridge on authenticated pages so scraper postMessage works
        window.ReactNativeWebView = window.__RN_WV_REF__;
      }

      // 2. Spoof navigator.webdriver
      try {
        Object.defineProperty(navigator, 'webdriver', {
          get: function() { return false; },
          configurable: true
        });
      } catch(e) {}

      // 3. Spoof navigator.plugins
      try {
        if (!navigator.plugins || navigator.plugins.length === 0) {
          Object.defineProperty(navigator, 'plugins', {
            get: function() { return [1, 2, 3]; },
            configurable: true
          });
        }
      } catch(e) {}

      // 4. Spoof navigator.languages
      try {
        if (!navigator.languages || navigator.languages.length === 0) {
          Object.defineProperty(navigator, 'languages', {
            get: function() { return ['en-US', 'en']; },
            configurable: true
          });
        }
      } catch(e) {}

      // 5. Spoof window.chrome
      try {
        if (!window.chrome) {
          window.chrome = { app: { isInstalled: false }, runtime: {} };
        }
      } catch(e) {}

      // 6. Spoof navigator.permissions.query
      try {
        if (navigator.permissions && navigator.permissions.query) {
          var originalQuery = navigator.permissions.query;
          navigator.permissions.query = function(parameters) {
            return parameters && parameters.name === 'notifications'
              ? Promise.resolve({ state: 'denied' })
              : originalQuery.apply(navigator.permissions, arguments);
          };
        }
      } catch(e) {}

      // 7. Anti-UMS-bot: kill blur/focusout/change on UMS login inputs so Turnstile isn't reset
      function killLoginEvent(e) {
        if (e.target && (e.target.id === 'txtU' || e.target.type === 'password' || (e.target.tagName === 'INPUT' && (e.target.name === 'txtU' || e.target.name === 'txtUserName')))) {
          e.stopImmediatePropagation();
          e.stopPropagation();
        }
      }
      document.addEventListener('blur', killLoginEvent, true);
      document.addEventListener('focusout', killLoginEvent, true);
      document.addEventListener('change', killLoginEvent, true);
    } catch (err) {}
  })();
  true;
`;

/**
 * Injected JavaScript for WebViews to monitor session status, auto-solve Turnstile, and notify React Native.
 */
export function getSessionWatcherJS(username?: string, password?: string): string {
  const safeU = username ? JSON.stringify(username) : '""';
  const safeP = password ? JSON.stringify(password) : '""';

  return `
    (function() {
      try {
        var userVal = ${safeU};
        var passVal = ${safeP};

        var postMsg = function(data) {
          var bridge = window.ReactNativeWebView || window.__RN_WV_REF__;
          if (bridge && bridge.postMessage) {
            try {
              bridge.postMessage(JSON.stringify(data));
            } catch(e) {}
          }
        };

        // ── Reveal input fields if UMS/Cloudflare kept them hidden behind "Loading Portal..." ──
        function forceRevealInputs() {
          var href = (window.location.href || '').toLowerCase();
          var isLoginPage = href.indexOf('loginnew.aspx') !== -1 || href.indexOf('login.aspx') !== -1 || href.indexOf('index.aspx') !== -1;
          if (!isLoginPage) return;

          var uField = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
          var pField = document.querySelector('input[type="password"]');

          if (uField) {
            uField.style.display = 'block';
            uField.style.visibility = 'visible';
            uField.style.opacity = '1';
            if (uField.parentElement) {
              uField.parentElement.style.display = 'block';
              uField.parentElement.style.visibility = 'visible';
            }
          }

          if (pField) {
            pField.style.display = 'block';
            pField.style.visibility = 'visible';
            pField.style.opacity = '1';
            if (pField.parentElement) {
              pField.parentElement.style.display = 'block';
              pField.parentElement.style.visibility = 'visible';
            }
          }

          // If inputs are in DOM, hide any overlay like "Loading Portal..."
          if (uField || pField) {
            var overlays = document.querySelectorAll('.loading-portal, #loadingPortal, #divLoading');
            for (var i = 0; i < overlays.length; i++) {
              overlays[i].style.display = 'none';
            }
          }
        }

        // ── Auto-fill credentials ──
        function autofillCredentials() {
          var uField = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"], #txtRegno, #txtRegistrationNo, #txtUser, #txtLogin, input[name*="Reg"], input[name*="reg"], input[name*="User"], input[name*="Login"]');
          var pField = document.querySelector('input[type="password"]');

          if (uField && userVal && !uField.value) {
            try {
              var nSU = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nSU.call(uField, userVal);
            } catch(e) {
              uField.value = userVal;
            }
            uField.dispatchEvent(new Event('input', { bubbles: true }));
            uField.dispatchEvent(new Event('change', { bubbles: true }));
          }

          if (pField && passVal && !pField.value) {
            try {
              var nSP = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nSP.call(pField, passVal);
            } catch(e) {
              pField.value = passVal;
            }
            pField.dispatchEvent(new Event('input', { bubbles: true }));
            pField.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }

        // ── Auto-click Cloudflare Turnstile checkbox ──
        var turnstileClicked = false;
        function tryClickTurnstile() {
          if (turnstileClicked) return;
          var href = (window.location.href || '').toLowerCase();
          if (href.indexOf('loginnew.aspx') === -1 && href.indexOf('login.aspx') === -1) return;

          // Try Cloudflare JavaScript API
          if (typeof turnstile !== 'undefined' && turnstile.execute) {
            try {
              turnstile.execute();
              turnstileClicked = true;
              return;
            } catch(e) {}
          }

          // Try clicking Turnstile iframe container
          var iframes = document.querySelectorAll('iframe');
          for (var i = 0; i < iframes.length; i++) {
            var src = (iframes[i].src || '').toLowerCase();
            if (src.indexOf('challenges.cloudflare.com') !== -1 || src.indexOf('turnstile') !== -1) {
              var container = iframes[i].parentElement;
              if (container) {
                container.click();
                turnstileClicked = true;
                return;
              }
            }
          }

          // Try clicking .cf-turnstile element
          var cfDiv = document.querySelector('.cf-turnstile, [data-sitekey]');
          if (cfDiv) {
            cfDiv.click();
            turnstileClicked = true;
          }
        }

        // ── Auto-submit once Turnstile response is verified ──
        function tryAutoSubmit() {
          var uField = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
          var pField = document.querySelector('input[type="password"]');
          var responseEl = document.querySelector('[name="cf-turnstile-response"], [name="g-recaptcha-response"]');

          if (responseEl && responseEl.value && uField && uField.value && pField && pField.value) {
            var btn = document.querySelector('#btnLogin, #btnSubmit, input[type="submit"], button[type="submit"]');
            if (btn && !window.__almsAutoSubmitted) {
              window.__almsAutoSubmitted = true;
              btn.click();
            }
          }
        }

        function evaluateSession() {
          var href = (window.location.href || '').toLowerCase();
          var isLoginUrl = href.indexOf('loginnew.aspx') !== -1 || href.indexOf('login.aspx') !== -1 || href.indexOf('index.aspx') !== -1;
          var uField = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
          var pField = document.querySelector('input[type="password"]');
          var bodyText = document.body ? (document.body.innerText || '') : '';
          var isSessionExpiredText = bodyText.indexOf('Session Expired') !== -1 || bodyText.indexOf('Object moved') !== -1;

          if (isLoginUrl || (uField && pField) || isSessionExpiredText) {
            postMsg({
              type: 'ALMS_SESSION_EXPIRED',
              url: window.location.href
            });

            forceRevealInputs();
            autofillCredentials();
            tryClickTurnstile();
            tryAutoSubmit();
          }
        }

        evaluateSession();
        if (!window.__almsSessionWatcherStarted) {
          window.__almsSessionWatcherStarted = true;
          setInterval(evaluateSession, 1000);
        }
      } catch(e) {}
    })();
    true;
  `;
}
