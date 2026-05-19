import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useScraper } from '../context/ScraperContext';

export default function UmsFormScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title: string }>();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = React.useState(true);
  const { updateProfile } = useScraper();
  const webViewRef = React.useRef<WebView>(null);
  
  // Get the base UMS URL
  const baseUrl = 'https://ums.lpu.in/lpuums/';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

  const profileScraperScript = `
    (function() {
      var log = function(msg) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DEBUG", message: msg }));
      };
      log("Profile Update Scraper Loaded");
      
      var pollCount = 0;
      var poll = setInterval(function() {
        pollCount++;
        
        var hasPersonalInfo = false;
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
            if (hasEmail || hasPhone) {
              hasPersonalInfo = true;
            }
          }
        }
        
        if (hasPersonalInfo || pollCount >= 25) {
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
 
      <View style={{ flex: 1 }}>
        {Platform.OS === 'web' ? (
          <View style={styles.webFallbackContainer}>
            <View style={[styles.webFallbackCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1.5 }]}>
              <View style={[styles.iconBg, { backgroundColor: colors.primary + '15' }]}>
                <Text style={{ fontSize: 32 }}>🔐</Text>
              </View>
              <Text style={[styles.fallbackTitle, { color: colors.text }]}>Secure Access Required</Text>
              <Text style={[styles.fallbackDesc, { color: colors.textSecondary }]}>
                For your security, university forms like "{title || 'this portal'}" must be opened in a dedicated secure window.
              </Text>
              <TouchableOpacity 
                style={[styles.webButton, { backgroundColor: colors.primary }]}
                onPress={() => window.open(fullUrl, '_blank')}
              >
                <Text style={styles.webButtonText}>Open Secure Form</Text>
              </TouchableOpacity>
              <Text style={styles.webFooterText}>Return here once you're finished.</Text>
            </View>
          </View>
        ) : (
          <>
            <WebView
              ref={webViewRef}
              source={{ uri: fullUrl }}
              style={{ flex: 1, backgroundColor: colors.background }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={(event) => {
                setLoading(false);
                if (title === 'Profile Update' || (event.nativeEvent.url && event.nativeEvent.url.includes('user-profile'))) {
                  webViewRef.current?.injectJavaScript(profileScraperScript);
                }
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === 'PROFILE_UPDATE_SCRAPE') {
                    console.log('UMS_FORM SCRAPE SUCCESS:', data.payload);
                    updateProfile(data.payload);
                  } else if (data.type === 'DEBUG') {
                    console.log('UMS_FORM SCRAPER DEBUG:', data.message);
                  }
                } catch (e) {
                  console.error('Failed to parse webview message in ums_form:', e);
                }
              }}
              incognito={false}
              domStorageEnabled={true}
              javaScriptEnabled={true}
            />
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </>
        )}
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
    ...StyleSheet.absoluteFillObject,
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
