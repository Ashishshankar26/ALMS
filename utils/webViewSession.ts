import { DeviceEventEmitter } from 'react-native';

export const ALMS_SESSION_RESTORED = 'ALMS_SESSION_RESTORED';

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
    lower.includes('homeplacementstudent.aspx') ||
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
 * Injected JavaScript for WebViews to monitor session status and notify React Native.
 */
export function getSessionWatcherJS(username?: string, password?: string): string {
  const safeU = username ? JSON.stringify(username) : '""';
  const safeP = password ? JSON.stringify(password) : '""';

  return `
    (function() {
      try {
        var userVal = ${safeU};
        var passVal = ${safeP};

        function evaluateSession() {
          var href = (window.location.href || '').toLowerCase();
          var isLoginUrl = href.indexOf('loginnew.aspx') !== -1 || href.indexOf('login.aspx') !== -1 || href.indexOf('index.aspx') !== -1;
          var uField = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
          var pField = document.querySelector('input[type="password"]');
          var bodyText = document.body ? (document.body.innerText || '') : '';
          var isSessionExpiredText = bodyText.indexOf('Session Expired') !== -1 || bodyText.indexOf('Object moved') !== -1;

          if (isLoginUrl || (uField && pField) || isSessionExpiredText) {
            // Notify native that session is disconnected
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ALMS_SESSION_EXPIRED',
                url: window.location.href
              }));
            }

            // If credentials are available, autofill them to make re-login effortless
            if (uField && userVal && !uField.value) {
              var nSU = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nSU.call(uField, userVal);
              uField.dispatchEvent(new Event('input', { bubbles: true }));
              uField.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (pField && passVal && !pField.value) {
              var nSP = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nSP.call(pField, passVal);
              pField.dispatchEvent(new Event('input', { bubbles: true }));
              pField.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }

        evaluateSession();
        if (!window.__almsSessionWatcherStarted) {
          window.__almsSessionWatcherStarted = true;
          setInterval(evaluateSession, 2000);
        }
      } catch(e) {}
    })();
    true;
  `;
}
