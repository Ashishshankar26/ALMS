import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform, DeviceEventEmitter } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useScraper } from '../context/ScraperContext';
import { useAuth } from '../context/AuthContext';
import { WebViewSessionBanner } from '../components/WebViewSessionBanner';
import {
  notifySessionRestored,
  isLoginOrSessionUrl,
  isAuthenticatedUrl,
  getSessionWatcherJS,
  ALMS_SESSION_RESTORED,
  SPOOFED_USER_AGENT,
  TURNSTILE_WEBVIEW_HEADERS,
  COMMON_TURNSTILE_WEBVIEW_PROPS,
  TURNSTILE_BEFORE_CONTENT_JS,
} from '../utils/webViewSession';

export default function UmsFormScreen() {
  const { url = '', title = '' } = useLocalSearchParams<{ url: string; title: string }>();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const { updateProfile, refreshData } = useScraper();
  const { authData } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [savedCreds, setSavedCreds] = useState<{ u?: string; p?: string } | null>(null);
  const credsRef = useRef<{ u?: string; p?: string } | null>(null);
  
  // Get the base UMS URL
  const baseUrl = 'https://ums.lpu.in/lpuums/';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  const returnTo = `/ums_form?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
  const isPlacement = (title || '').toLowerCase().includes('placement') || fullUrl.toLowerCase().includes('placement');

  // Load credentials from AsyncStorage on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('@credentials'),
      AsyncStorage.getItem('@auth_data'),
    ]).then(([credsStored, authStored]) => {
      let u = '';
      let p = '';
      if (credsStored) {
        try {
          const parsed = JSON.parse(credsStored);
          if (parsed.u) u = parsed.u;
          if (parsed.p) p = parsed.p;
          setSavedCreds(parsed);
          credsRef.current = parsed;
        } catch (e) {}
      }
      if ((!u || !p) && authStored) {
        try {
          const parsedAuth = JSON.parse(authStored);
          if (parsedAuth.username && !u) u = parsedAuth.username;
          if (parsedAuth.password && !p) p = parsedAuth.password;
          if (!credsRef.current && (u || p)) {
            const reconstructed = { u, p };
            setSavedCreds(reconstructed);
            credsRef.current = reconstructed;
          }
        } catch (e) {}
      }

      // If Placement portal is loading on default.aspx, trigger immediate auto-login as soon as creds resolve
      if (isPlacement && u && p && webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            var href = (window.location.href || '').toLowerCase();
            if (href.indexOf('/placements/') !== -1 && href.indexOf('homeplacementstudent') === -1) {
              var uField = document.querySelector('#txtRegno, #txtRegistrationNo, #txtUser, #txtUserName, #txtLogin, #txtU, input[name*="Reg"], input[name*="reg"], input[name*="User"], input[name*="Login"], input[type="text"]');
              var pField = document.querySelector('input[type="password"], #txtPassword, #txtPass, input[name*="Pass"], input[name*="pass"]');
              if (uField) {
                try {
                  var nSU = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                  nSU.call(uField, ${JSON.stringify(u)});
                } catch(e) { uField.value = ${JSON.stringify(u)}; }
                uField.dispatchEvent(new Event('input', { bubbles: true }));
                uField.dispatchEvent(new Event('change', { bubbles: true }));
              }
              if (pField) {
                try {
                  var nSP = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                  nSP.call(pField, ${JSON.stringify(p)});
                } catch(e) { pField.value = ${JSON.stringify(p)}; }
                pField.dispatchEvent(new Event('input', { bubbles: true }));
                pField.dispatchEvent(new Event('change', { bubbles: true }));
              }
              var btn = document.querySelector('#btnLogin, #btnSubmit, #btnSignIn, input[type="submit"], button[type="submit"]');
              if (btn && !window.__almsPlacementSubmitted) {
                window.__almsPlacementSubmitted = true;
                btn.click();
              }
            }
          })();
          true;
        `);
      }
    }).catch(() => {});
  }, [isPlacement]);

  const username = authData?.username || credsRef.current?.u || savedCreds?.u || '';
  const password = authData?.password || credsRef.current?.p || savedCreds?.p || '';

  const placementBeforeContentJS = isPlacement ? `
    (function() {
      try {
        var href = (window.location.href || '').toLowerCase();
        if (href.indexOf('/placements/') !== -1 && href.indexOf('homeplacementstudent') === -1) {
          // Permanently hide any login page DOM on placement portal so user never sees it
          var hideStyle = document.createElement('style');
          hideStyle.id = '__alms_hide_placement_login';
          hideStyle.innerHTML = 'body, html, form, .container, #form1, table, div { opacity: 0 !important; visibility: hidden !important; }';
          (document.head || document.documentElement).appendChild(hideStyle);

          var uVal = ${JSON.stringify(username)};
          var pVal = ${JSON.stringify(password)};

          function doPlacementLogin() {
            if (!uVal || !pVal) return;
            var u = document.querySelector('#txtRegno, #txtRegistrationNo, #txtUser, #txtUserName, #txtLogin, #txtU, input[name*="Reg"], input[name*="reg"], input[name*="User"], input[name*="Login"], input[type="text"]');
            var p = document.querySelector('input[type="password"], #txtPassword, #txtPass, input[name*="Pass"], input[name*="pass"]');
            if (u && p) {
              if (!u.value) {
                try {
                  var nSU = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                  nSU.call(u, uVal);
                } catch(e) { u.value = uVal; }
                u.dispatchEvent(new Event('input', { bubbles: true }));
                u.dispatchEvent(new Event('change', { bubbles: true }));
              }
              if (!p.value) {
                try {
                  var nSP = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                  nSP.call(p, pVal);
                } catch(e) { p.value = pVal; }
                p.dispatchEvent(new Event('input', { bubbles: true }));
                p.dispatchEvent(new Event('change', { bubbles: true }));
              }
              var btn = document.querySelector('#btnLogin, #btnSubmit, #btnSignIn, input[type="submit"], button[type="submit"]');
              if (btn && !window.__almsPlacementSubmitted) {
                window.__almsPlacementSubmitted = true;
                btn.click();
              }
            }
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', doPlacementLogin);
          } else {
            doPlacementLogin();
          }
          var poll = setInterval(function() {
            if (window.__almsPlacementSubmitted) {
              clearInterval(poll);
            } else {
              doPlacementLogin();
            }
          }, 60);
        }
      } catch(e) {}
    })();
  ` : '';

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(ALMS_SESSION_RESTORED, () => {
      console.log('[ums_form] Session restored, reloading assigned page:', fullUrl);
      setIsDisconnected(false);
      webViewRef.current?.injectJavaScript(`window.location.href = '${fullUrl}'; true;`);
    });
    return () => sub.remove();
  }, [fullUrl]);

  const profileScraperScript = `
    (function() {
      var log = function(msg) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DEBUG", message: msg }));
      };
      log("Profile Update Scraper Loaded");
      
      var pollCount = 0;
      var poll = setInterval(function() {
        pollCount++;
        
        var hasRealData = false;
        var allElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, td, li'));
        var personalInfoHeader = allElements.find(function(el) {
          return el.innerText && el.innerText.trim() === "Personal Information";
        });
        
        if (personalInfoHeader) {
          var cardContainer = personalInfoHeader.closest('.card, .box, div') || personalInfoHeader.parentElement;
          if (cardContainer) {
            var text = cardContainer.innerText || "";
            var hasEmail = text.indexOf("@") !== -1;
            var hasPhone = /\\d{10}/.test(text);
            
            // Verify we are not looking at placeholder/skeleton text
            var isSkeleton = text.indexOf("User") !== -1 || text.indexOf("xxxxxxxxx") !== -1 || text.indexOf("Batch: NA") !== -1;
            
            if ((hasEmail || hasPhone) && !isSkeleton) {
              hasRealData = true;
            }
          }
        }
        
        if (hasRealData || pollCount >= 25) {
          clearInterval(poll);
          log("Scraper: starting extraction. PollCount=" + pollCount);
          
          try {
            var profile = {};
            
            if (personalInfoHeader) {
              log("Found Personal Information heading!");
              var cardContainer = personalInfoHeader.closest('.card, .box, div') || personalInfoHeader.parentElement;
              if (cardContainer) {
                log("Found card container");
                var items = Array.from(cardContainer.querySelectorAll('div, p, span, td, li'));
                
                // Clean up text content
                var textValues = items.map(function(el) {
                  return el.innerText ? el.innerText.trim() : "";
                }).filter(function(txt) {
                  return txt.length > 0 && txt !== "Personal Information";
                });
                
                // Deduplicate text values while preserving order
                var uniqueTexts = [];
                for (var i = 0; i < textValues.length; i++) {
                  if (uniqueTexts.indexOf(textValues[i]) === -1) {
                    uniqueTexts.push(textValues[i]);
                  }
                }
                log("Unique texts inside card: " + JSON.stringify(uniqueTexts));
                
                for (var i = 0; i < uniqueTexts.length; i++) {
                  var txt = uniqueTexts[i];
                  
                  // Email check
                  if (txt.indexOf("@") !== -1 && txt.indexOf(".") !== -1) {
                    profile.email = txt;
                  }
                  // Phone check: 10 digits
                  else if (/^\\d{10}$/.test(txt)) {
                    profile.phone = txt;
                  }
                  // Hostel check
                  else if (txt.indexOf("Hostel:") !== -1 || txt.indexOf("Hostel") !== -1) {
                    profile.hostel = txt.replace(/Hostel\\s*:\\s*/i, "").trim();
                  }
                  // Batch check
                  else if (txt.indexOf("Batch:") !== -1 || txt.indexOf("Batch") !== -1) {
                    profile.batch = txt.replace(/Batch\\s*:\\s*/i, "").trim();
                  }
                }
                
                // Address check
                var addressCandidate = uniqueTexts.find(function(txt) {
                  var isEmail = txt.indexOf("@") !== -1;
                  var isPhone = /^\\d{10}$/.test(txt);
                  var isHostel = txt.indexOf("Hostel") !== -1;
                  var isBatch = txt.indexOf("Batch") !== -1;
                  return !isEmail && !isPhone && !isHostel && !isBatch && txt.indexOf(",") !== -1;
                });
                if (addressCandidate) {
                  profile.address = addressCandidate;
                }
                
                // Name candidate
                var nameCandidate = uniqueTexts.find(function(txt) {
                  var isEmail = txt.indexOf("@") !== -1;
                  var isPhone = /^\\d{10}$/.test(txt);
                  var isHostel = txt.indexOf("Hostel") !== -1;
                  var isBatch = txt.indexOf("Batch") !== -1;
                  var isAddress = txt.indexOf(",") !== -1;
                  return !isEmail && !isPhone && !isHostel && !isBatch && !isAddress && /^[a-zA-Z\\s\\.]+$/.test(txt) && txt.length > 2;
                });
                if (nameCandidate) {
                  profile.name = nameCandidate;
                }
              }
            }
            
            // 2. Scrape Profile Image
            var images = Array.from(document.querySelectorAll('img'));
            log("Found " + images.length + " images");
            
            var candidates = images.filter(function(img) {
              var src = img.src || "";
              var matchesKeyword = src.indexOf("Photo") !== -1 || src.indexOf("Student") !== -1 || src.indexOf("Profile") !== -1;
              if (!matchesKeyword) return false;
              
              var parent = img.parentElement;
              while (parent) {
                var id = (parent.id || "").toLowerCase();
                var className = parent.className || "";
                if (typeof className !== 'string') {
                  className = className.baseVal || "";
                }
                className = className.toLowerCase();
                var tag = parent.tagName.toLowerCase();
                
                if (tag === 'header' || tag === 'nav' || 
                    id.indexOf('header') !== -1 || id.indexOf('nav') !== -1 || id.indexOf('topbar') !== -1 || id.indexOf('navbar') !== -1 ||
                    className.indexOf('header') !== -1 || className.indexOf('nav') !== -1 || className.indexOf('topbar') !== -1 || className.indexOf('navbar') !== -1 ||
                    className.indexOf('user-menu') !== -1 || className.indexOf('dropdown') !== -1) {
                  return false;
                }
                parent = parent.parentElement;
              }
              return true;
            });
            
            candidates.sort(function(a, b) {
              var rectA = a.getBoundingClientRect();
              var rectB = b.getBoundingClientRect();
              var areaA = (rectA.width || a.width || 0) * (rectA.height || a.height || 0);
              var areaB = (rectB.width || b.width || 0) * (rectB.height || b.height || 0);
              return areaB - areaA;
            });
            
            var studentImg = candidates.length > 0 ? candidates[0] : null;
            
            if (studentImg) {
              log("Found avatar image: " + studentImg.src);
              profile.avatarUrl = studentImg.src;
            } else {
              var allDivs = Array.from(document.querySelectorAll('div'));
              var bgImgDiv = allDivs.find(function(div) {
                var bg = window.getComputedStyle(div).backgroundImage;
                return bg && bg !== 'none' && (bg.indexOf('Photo') !== -1 || bg.indexOf('Student') !== -1);
              });
              if (bgImgDiv) {
                var bg = window.getComputedStyle(bgImgDiv).backgroundImage;
                var match = bg.match(/url\\(["']?([^"']+)["']?\\)/);
                if (match && match[1]) {
                  log("Found bg image avatar: " + match[1]);
                  profile.avatarUrl = match[1];
                }
              }
            }
            
            // 3. Fallback Name & Program
            var mainNameEl = document.querySelector('h1, h2, h3, h4, h5');
            if (mainNameEl && !profile.name) {
              profile.name = mainNameEl.innerText.trim();
            }
            
            var programCandidate = allElements.find(function(el) {
              var txt = el.innerText ? el.innerText.trim() : "";
              return (txt.indexOf("B.Tech") !== -1 || txt.indexOf("M.Tech") !== -1 || txt.indexOf("MBA") !== -1 || txt.indexOf("B.Sc") !== -1 || txt.indexOf("Bachelor") !== -1 || txt.indexOf("Master") !== -1) && txt.length < 150;
            });
            if (programCandidate && !profile.program) {
              profile.program = programCandidate.innerText.trim();
            }
            
            log("Scraping complete, sending profile data: " + JSON.stringify(profile));
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "PROFILE_UPDATE_SCRAPE",
              payload: profile
            }));
            
          } catch(e) {
            log("Scraping error: " + e.toString());
          }
        }
      }, 500);
    })();
    true;
  `;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[
            styles.backButton, 
            { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            }
          ]}
        >
          <ChevronLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{title || 'UMS Portal'}</Text>
        <View style={{ width: 40 }} />
      </View>
 
      {!isPlacement && (
        <WebViewSessionBanner
          visible={isDisconnected}
          returnTo={returnTo}
        />
      )}

      <View style={{ flex: 1 }}>
          <>
            <WebView
              ref={webViewRef}
              source={{ uri: fullUrl, headers: TURNSTILE_WEBVIEW_HEADERS }}
              userAgent={SPOOFED_USER_AGENT}
              injectedJavaScriptBeforeContentLoaded={placementBeforeContentJS ? `${TURNSTILE_BEFORE_CONTENT_JS}\n${placementBeforeContentJS}` : TURNSTILE_BEFORE_CONTENT_JS}
              style={{ flex: 1, backgroundColor: colors.background }}
              onLoadStart={() => setLoading(true)}
              onNavigationStateChange={(navState) => {
                const currentNavUrl = navState.url || '';
                const lowerNavUrl = currentNavUrl.toLowerCase();
                if (isPlacement) {
                  // Never show disconnected session banner on Placement Portal
                  setIsDisconnected(false);
                  if (lowerNavUrl.includes('homeplacementstudent') || (lowerNavUrl.includes('/placements/') && !lowerNavUrl.includes('default.aspx'))) {
                    setLoading(false);
                  } else if (lowerNavUrl.includes('default.aspx')) {
                    // Keep loading spinner active while auto-submitting credentials
                    setLoading(true);
                    const u = username || credsRef.current?.u || '';
                    const p = password || credsRef.current?.p || '';
                    if (u && p) {
                      webViewRef.current?.injectJavaScript(getSessionWatcherJS(u, p));
                    }
                  }
                } else {
                  if (isLoginOrSessionUrl(currentNavUrl)) {
                    setIsDisconnected(true);
                  } else if (isDisconnected && isAuthenticatedUrl(currentNavUrl)) {
                    // In-place login detected!
                    console.log('[ums_form] In-place login detected!');
                    setIsDisconnected(false);
                    notifySessionRestored({ sourceUrl: fullUrl });
                    try { refreshData?.(); } catch (e) {}

                    // If user ended up on default dashboard, redirect back to assigned page
                    const targetSlug = fullUrl.split('/').pop()?.split('?')[0]?.toLowerCase() || '';
                    if (targetSlug && !currentNavUrl.toLowerCase().includes(targetSlug)) {
                      webViewRef.current?.injectJavaScript(`window.location.href = '${fullUrl}'; true;`);
                    }
                  }
                }
              }}
              onLoadEnd={(event) => {
                const navUrl = (event.nativeEvent.url || '').toLowerCase();
                if (isPlacement) {
                  if (navUrl.includes('homeplacementstudent') || (navUrl.includes('/placements/') && !navUrl.includes('default.aspx'))) {
                    setLoading(false);
                  } else {
                    setLoading(true);
                  }
                } else {
                  setLoading(false);
                }
                const u = username || credsRef.current?.u || '';
                const p = password || credsRef.current?.p || '';
                webViewRef.current?.injectJavaScript(getSessionWatcherJS(u, p));
                if (title === 'Profile Update' || (event.nativeEvent.url && event.nativeEvent.url.includes('user-profile'))) {
                  webViewRef.current?.injectJavaScript(profileScraperScript);
                }
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === 'ALMS_SESSION_EXPIRED' || data.type === 'SESSION_EXPIRED') {
                    if (!isPlacement) {
                      setIsDisconnected(true);
                    }
                  } else if (data.type === 'PROFILE_UPDATE_SCRAPE') {
                    console.log('UMS_FORM SCRAPE SUCCESS:', data.payload);
                    updateProfile(data.payload);
                  } else if (data.type === 'DEBUG') {
                    console.log('UMS_FORM SCRAPER DEBUG:', data.message);
                  }
                } catch (e) {
                  console.error('Failed to parse webview message in ums_form:', e);
                }
              }}
              {...COMMON_TURNSTILE_WEBVIEW_PROPS}
            />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                {isPlacement && (
                  <Text style={{ color: colors.textSecondary, marginTop: 14, fontSize: 13, fontWeight: '600' }}>
                    Connecting to Placement Portal...
                  </Text>
                )}
              </View>
            )}
          </>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webFallbackCard: {
    width: '100%',
    maxWidth: 400,
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  iconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  fallbackDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
    opacity: 0.8,
  },
  webButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  webButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  webFooterText: {
    fontSize: 12,
    color: '#8E8E93',
  }
});
