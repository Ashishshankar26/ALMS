import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
// Cache breaker: 2026-04-19 13:16
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubjectAttendance {
  subjectCode: string;
  subjectName: string;
  attendedClasses: number;
  totalClasses: number;
  dutyLeaves?: number;
  percentage: number;
}

export interface SemesterResult {
  semester: string;
  sgpa: string;
  cgpa: string;
  subjects: any[];
}

export interface ScrapedData {
  profile: any;
  timetable: any;
  attendance: SubjectAttendance[];
  results: SemesterResult[];
  announcements: any[];
  messages: any[];
  assignments: any[];
  cgpa: string;
  overallAttendance: string;
  fee: string;
  examUrl: string;
}

type ScraperContextType = {
  data: ScrapedData;
  isScraping: boolean;
  refreshData: () => void;
  dumpHtml: () => void;
};

const ScraperContext = createContext<ScraperContextType>({
  data: MOCK_DATA,
  isScraping: false,
  refreshData: () => {},
  dumpHtml: () => {},
});

export const useScraper = () => useContext(ScraperContext);

const MOCK_DATA: ScrapedData = {
  profile: {
    name: 'Loading...',
    vid: '',
    section: '',
    program: '',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/png?seed=Student&backgroundColor=007AFF',
  },
  timetable: {},
  attendance: [],
  results: [
    {
      semester: 'Semester 1',
      sgpa: '8.45',
      cgpa: '8.45',
      subjects: [
        { code: 'MTH165', name: 'Mathematics I', grade: 'A', status: 'Pass' },
        { code: 'PHY101', name: 'Physics', grade: 'A+', status: 'Pass' },
        { code: 'CSE101', name: 'Introduction to Programming', grade: 'O', status: 'Pass' },
      ]
    },
    {
      semester: 'Semester 2',
      sgpa: '7.66',
      cgpa: '8.05',
      subjects: [
        { code: 'CSE202', name: 'Object Oriented Programming', grade: 'B+', status: 'Pass' },
        { code: 'MTH166', name: 'Mathematics II', grade: 'A', status: 'Pass' },
        { code: 'ECE101', name: 'Basic Electronics', grade: 'A', status: 'Pass' },
      ]
    }
  ],
  announcements: [],
  messages: [],
  assignments: [],
  cgpa: '--',
  overallAttendance: '0.0',
  fee: '--',
  examUrl: '',
};

// ─── Scripts (each handles ONE page, no routing logic) ───────────────────────

const DASHBOARD_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DEBUG", message: msg }));
    };
    log("DASHBOARD SCRIPT START");

    // Poll until the page's own AJAX has rendered the course cards AND the CGPA/Att values
    var pollCount = 0;
    var poll = setInterval(function() {
      pollCount++;
      var coursesList = document.getElementById("CoursesList");
      var cgpaEl      = document.getElementById("cgpa");
      var attPerEl    = document.getElementById("AttPercent");

      var hasCoursesLoaded = coursesList && coursesList.querySelectorAll(".mycoursesdiv").length > 0;
      var hasCgpa  = cgpaEl  && /[0-9]+\\.[0-9]+/.test(cgpaEl.innerText);
      var hasAtt   = attPerEl && /[0-9]+/.test(attPerEl.innerText);

      if ((hasCoursesLoaded && hasCgpa && hasAtt) || pollCount >= 20) {
        clearInterval(poll);
        scrapeAll();
      }
    }, 500);

    function scrapeAll() {
      try {
        log("scrapeAll: Starting...");
        var attCounts = {};
        
        var runFinalize = function() {
          if (runFinalize.done) return;
          runFinalize.done = true;
          finalize(attCounts);
        };

        var triggerAtt = function() {
          if (typeof window.getAtt === 'function') {
            try { window.getAtt(); log("scrapeAll: window.getAtt() called"); } catch(e) { log("scrapeAll: getAtt error: " + e.message); }
          }
          var btn = document.getElementById('AttPercent');
          if (btn) { btn.click(); log("scrapeAll: AttPercent clicked"); }
        };

        triggerAtt();

        var pollCount = 0;
        var poll = setInterval(function() {
          pollCount++;
          var summaryTable = document.getElementById("AttSummary");
          var hasRows = summaryTable && summaryTable.querySelectorAll("tr").length > 1;
          
          if (hasRows) {
            clearInterval(poll);
            log("scrapeAll: #AttSummary found, scraping...");
            var rows = summaryTable.querySelectorAll("tr");
            for (var i = 0; i < rows.length; i++) {
              var c = rows[i].querySelectorAll("td");
              if (i === 0) {
                var cellTexts = [];
                for(var j=0; j<c.length; j++) cellTexts.push(j + ":" + c[j].innerText.trim());
                log("DEBUG: Row 0 Cells: " + cellTexts.join(" | "));
              }
              if (c.length >= 5) {
                var codeText = c[0].innerText.trim();
                // Normalized code: extract the part before any dash or space
                var normCode = codeText.split("-")[0].split(":")[0].trim().replace(/[\s:]/g, "").toUpperCase();
                attCounts[normCode] = {
                  attended: parseInt(c[4].innerText) || 0,
                  total: parseInt(c[3].innerText) || 0,
                  leaves: parseInt(c[2].innerText) || 0,
                  subjectCode: codeText,
                  subjectName: codeText.includes("-") ? codeText.split("-")[1].trim() : codeText
                };
              }
            }
            runFinalize();
          } else if (pollCount >= 40) { 
            clearInterval(poll);
            log("scrapeAll: getAtt() timeout, trying fetch...");
            runFetch();
          } else if (pollCount % 10 === 0) {
            triggerAtt(); 
          }
        }, 500);

        function runFetch() {
          log("scrapeAll: Fetching attendance report...");
          fetch("Reports/frmStudentAttendance.aspx")
            .then(function(r) { return r.text(); })
            .then(function(html) {
               try {
                 var parser = new DOMParser();
                 var doc = parser.parseFromString(html, "text/html");
                 var table = doc.querySelector("table[id*='gvStudentAttendance']") || 
                             doc.querySelector("table[id*='Attendance']");
                 
                 if (table) {
                    var rows = table.querySelectorAll("tr");
                    for (var i = 0; i < rows.length; i++) {
                      var c = rows[i].querySelectorAll("td");
                      if (c.length >= 8) {
                        var code = c[1].innerText.trim();
                        var normCode = code.replace(/[\s:]/g, "").split("-")[0].toUpperCase();
                        if (code.length > 3 && !attCounts[normCode]) {
                          attCounts[normCode] = {
                            attended: parseInt(c[5].innerText) || 0,
                            total: parseInt(c[4].innerText) || 0,
                            leaves: parseInt(c[6].innerText) || 0,
                            subjectCode: code,
                            subjectName: c[2].innerText.trim()
                          };
                        }
                      }
                    }
                 }
               } catch(e) { log("Fetch Parse Error: " + e.toString()); }
               runFinalize();
            })
            ["catch"](function(err) {
              log("Fetch Error: " + err.toString());
              runFinalize();
            });
        }
      } catch(e2) {
        log("scrapeAll Error: " + e2.toString());
        finalize({});
      }
    }

    function finalize(attCounts) {
      log("finalize: Starting...");
      try {
        var prof = { name: "Unknown", vid: "", section: "", program: "", avatarUrl: "" };
        var nameEl = document.getElementById("p_name");
        if (nameEl) prof.name = nameEl.innerText.trim();
        var infoEl = document.getElementById("p_info");
        if (infoEl) {
          var infoTxt = infoEl.innerText || "";
          var vidM = infoTxt.match(/VID\\s*:\\s*([0-9]+)/i); if (vidM) prof.vid = vidM[1];
          var secM = infoTxt.match(/Section\\s*:\\s*([A-Z0-9]+)/i); if (secM) prof.section = secM[1];
          var progM = infoTxt.match(/[BMD]\\.Tech[^\\n]*\\([^)]+\\)/i); if (progM) prof.program = progM[0];
        }
        var picEl = document.getElementById("p_picture");
        if (picEl && picEl.src) prof.avatarUrl = picEl.src;

        var qC = "--";
        var cgpaEl = document.getElementById("cgpa");
        if (cgpaEl) { 
          var cm = cgpaEl.innerText.match(/([0-9]+\\.[0-9]+)/); 
          if (cm) qC = cm[1]; 
        }

        var qA = ""; // Start with empty to allow fallback
        var attEl = document.getElementById("AttPercent");
        if (attEl) { 
          // Match the percentage number in text like "ATTENDANCE : 90%"
          var am = attEl.innerText.match(/([0-9]+(?:\\.[0-9]+)?)/); 
          if (am) qA = am[1]; 
          log("DEBUG: Overall Att Text: " + attEl.innerText + " -> " + qA);
        }

        var fV = "0";
        var feeEl = document.getElementById("feebalance");
        if (feeEl) { 
          var txt = feeEl.innerText || "";
          var fm = txt.match(/([0-9,]+)/); 
          if (fm) fV = fm[1]; 
          else if (txt.includes("--")) fV = "0";
          log("DEBUG: Fee Text: [" + txt.trim() + "] -> " + fV);
        }

        var att = [];
        var cl = document.getElementById("CoursesList");
        if (cl) {
          var rows = cl.querySelectorAll(".mycoursesdiv");
          for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var pctSpan = row.querySelector(".c100 span");
            var pctText = (pctSpan ? pctSpan.innerText.trim() : "0").replace(/%/g, "");
            var pct = Number(pctText) || 0;

            var bTags = row.querySelectorAll("b");
            var code = bTags.length > 0 ? bTags[0].innerText.trim().replace(/\\s*:$/, "") : "";
            
            var pTag = row.querySelector("p.font-weight-medium");
            var name = "";
            if (pTag) { 
              var rawP = pTag.innerText || ""; 
              var ci = rawP.indexOf(":"); 
              if (ci > -1) name = rawP.substring(ci+1).split("\\n")[0].trim(); 
            }

            if (code && code.length > 2) {
              var normCode = code.split("-")[0].split(":")[0].trim().replace(/[\\s:]/g, "").toUpperCase();
              var counts = attCounts[normCode] || { attended: 0, total: 0, leaves: 0 };
              att.push({ 
                subjectCode: code, 
                subjectName: name, 
                attendedClasses: Number(counts.attended), 
                totalClasses: Number(counts.total), 
                dutyLeaves: Number(counts.leaves),
                percentage: pct
              });
            }
          }
        }

        var assignments = [];
        var paEl = document.getElementById("PendingAssignments");
        if (paEl) {
          var rows = paEl.querySelectorAll(".mycoursesdiv");
          for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var cols = row.querySelectorAll("div[class*='col']");
            var code = cols.length > 0 ? cols[0].innerText.trim() : "";
            var detail = (row.querySelector("p.font-weight-medium") || {}).innerText || "";
            var ldM = detail.match(/Last\\s*Date\\s*:\\s*([0-9\\-\\/]+)/i);
            if (code && code.length > 1 && code.length < 20) {
              assignments.push({ 
                id: Math.random().toString(), 
                courseCode: code, 
                type: detail.replace(/Course\\s*:\\s*/i, "").trim(), 
                lastDate: ldM ? ldM[1] : "Check UMS" 
              });
            }
          }
        }

        var msgs = [];
        var mmEl = document.getElementById("MyMessage");
        if (mmEl) {
          var rows = mmEl.querySelectorAll(".mycoursesdiv");
          for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var titleEl = row.querySelector(".right-arrow, .font-weight-medium");
            var t = titleEl ? titleEl.innerText.trim() : row.innerText.trim();
            if (t && t.length > 5) msgs.push({ id: Math.random().toString(), title: t.substring(0, 60), content: t, date: "Recently" });
          }
        }

        var announc = [];
        var annContainer = document.querySelector(".TodayAnnouncements");
        if (annContainer) {
          var annRows = annContainer.querySelectorAll(".row");
          annRows.forEach(function(row) {
            var subjEl = row.querySelector(".announcement-subject");
            var dateEl = row.querySelector(".announcement-date");
            if (subjEl) {
              var title = subjEl.innerText.replace(/New\\s*/i, "").trim();
              var date = dateEl ? dateEl.innerText.trim() : "Today";
              announc.push({ 
                id: Math.random().toString(), 
                title: title.substring(0, 80), 
                content: title, 
                date: date 
              });
            }
          });
        }

        log("DASHBOARD DONE. Courses=" + att.length + " Ass=" + assignments.length + " Ann=" + announc.length);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "DASHBOARD_DATA",
          payload: { 
            profile: prof, overallAttendance: qA, cgpa: qC, fee: fV, 
            attendance: att, messages: msgs, assignments: assignments, announcements: announc 
          }
        }));
      } catch(errFin) {
        log("finalize Error: " + errFin.toString());
      }
    }
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: "Dashboard: " + e.toString() }));
  }
})(); true;
`;

const TIMETABLE_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: msg }));
    };
    log('Timetable: polling...');
    var t_attempts = 0;
    var t_poll = setInterval(function() {
      t_attempts++;
      var tables = document.querySelectorAll('table');
      var t1 = null, t2 = null, t3 = null;
      tables.forEach(function(t) {
        var txt = t.textContent || '';
        if (txt.includes('Timing') && txt.includes('Monday')) t1 = t;
        if (txt.includes('Course Code') && txt.includes('Course Title')) t2 = t;
        if (txt.includes('Adjustment Date')) t3 = t;
      });

      if ((t1 && t2) || t_attempts >= 16) {
        clearInterval(t_poll);
        try {
          var res = { schedule: {}, courses: [] };
          if (t1) {
            var rows = t1.querySelectorAll('tr');
            var days = [];
            var headerRowIndex = -1;

            // Find the header row that contains 'Timing'
            for (var rIdx = 0; rIdx < rows.length; rIdx++) {
              if (rows[rIdx].textContent.indexOf('Timing') !== -1) {
                headerRowIndex = rIdx;
                var headerCells = rows[rIdx].querySelectorAll('td');
                headerCells.forEach(function(c) { 
                  var dName = c.textContent.trim();
                  days.push(dName);
                  if (dName && dName !== 'Timing') res.schedule[dName] = [];
                });
                break;
              }
            }

            if (headerRowIndex !== -1) {
              for (var rIdx = headerRowIndex + 1; rIdx < rows.length; rIdx++) {
                var cells = rows[rIdx].querySelectorAll('td');
                if (cells.length < 2) continue;
                var slot = '';
                for (var cIdx = 0; cIdx < cells.length; cIdx++) {
                  var cellTxt = cells[cIdx].textContent.trim();
                  var day = days[cIdx];
                  if (day === 'Timing') { 
                    slot = cellTxt; 
                  } else if (day && cellTxt && cellTxt !== 'Â' && cellTxt !== '') {
                    res.schedule[day].push({ time: slot, details: cellTxt });
                  }
                }
              }
            }
          }

          // Parse Adjustments/Makeup Classes
          if (t3) {
            var t3Rows = t3.querySelectorAll('tr');
            for (var r3 = 0; r3 < t3Rows.length; r3++) {
              var cells = t3Rows[r3].querySelectorAll('td');
              if (cells.length >= 5) {
                var dateStr = cells[0].textContent.trim();
                var dayStr = cells[1].textContent.trim();
                var timeStr = cells[2].textContent.trim();
                var subjectStr = cells[3].textContent.trim();
                var roomStr = cells[4].textContent.trim();
                
                // Only if it looks like a date (e.g. contains - or /)
                if (dateStr.includes('-') || dateStr.includes('/') || dateStr.match(/[0-9]/)) {
                  if (!res.schedule[dayStr]) res.schedule[dayStr] = [];
                  res.schedule[dayStr].push({ 
                    time: timeStr, 
                    details: subjectStr + ' R: ' + roomStr, 
                    date: dateStr 
                  });
                }
              }
            }
          }

          if (t2) {
            var t2Rows = t2.querySelectorAll('tr');
            for (var r2 = 0; r2 < t2Rows.length; r2++) {
              var cells = t2Rows[r2].querySelectorAll('td');
              if (cells.length > 5) {
                var code = cells[1] ? cells[1].textContent.trim() : '';
                // Skip header or empty rows
                if (code && code !== 'Course Code' && code.length > 2) {
                  res.courses.push({ 
                    code: code,
                    type: cells[2] ? cells[2].textContent.trim() : '',
                    title: cells[3] ? cells[3].textContent.trim() : '',
                    faculty: cells[8] ? cells[8].textContent.trim() : '' 
                  });
                }
              }
            }
          }
          log('Timetable: Done. Days=' + Object.keys(res.schedule).length);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TIMETABLE_JSON', payload: res }));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Timetable parse: ' + e.toString() }));
        }
      }
    }, 500);
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'TimetableOuter: ' + e.toString() }));
  }
})(); true;
`;


const RESULTS_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: msg }));
    };
    log('Results: Starting poll...');
    var attempts = 0;
    var poll = setInterval(function() {
      attempts++;
      var tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      var gradesTab = tabs.find(function(t) { return /Grades/i.test(t.innerText); });
      
      if (gradesTab || attempts >= 16) {
        clearInterval(poll);
        if (gradesTab) {
          gradesTab.click();
          log('Results: Grades tab clicked');
          setTimeout(function() {
             var rows = Array.from(document.querySelectorAll('tr'));
             var results = [];
             rows.forEach(function(row) {
                var cells = row.querySelectorAll('td');
                if (cells.length > 5) {
                   results.push({
                      code: cells[1].innerText.trim(),
                      name: cells[2].innerText.trim(),
                      grade: cells[4].innerText.trim()
                   });
                }
             });
             log('Results: Extracted ' + results.length + ' rows');
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RESULTS_DATA', payload: results }));
          }, 1500);
        } else {
           log('Results: Grades tab not found');
        }
      }
    }, 500);
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Results Error: ' + e.toString() }));
  }
})(); true;
`;

export const ScraperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<ScrapedData>(MOCK_DATA);
  const [isScraping, setIsScraping] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const didDashboard = useRef(false);
  const didTimetable = useRef(false);

  // Load initial data from storage
  useEffect(() => {
    AsyncStorage.getItem('@scraped_data').then(json => {
      if (json) {
        try {
          const parsed = JSON.parse(json);
          setData(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Failed to parse cached data:', e);
        }
      }
    });
  }, []);

  // Reset progress when authentication changes to false. This ensures the
  // next user doesn't see the previous user's info.
  useEffect(() => {
    if (!isAuthenticated) {
      setData(MOCK_DATA);          // Reset to fresh mock (not old user's data)
      setIsScraping(false);
      didDashboard.current = false;
      didTimetable.current = false;
    }
  }, [isAuthenticated]);

  const isProcessingPhase = useRef(false);

  const isFullyDone = useRef(false);

  const refreshData = () => {
    console.log('REFRESH DATA START');
    if (isAuthenticated) {
      didDashboard.current = false;
      didTimetable.current = false;
      isProcessingPhase.current = false;
      isFullyDone.current = false;
      // We keep the old data visible while syncing to prevent a "blank" screen
      setIsScraping(true);

      // Safety watchdog: force stop loading after 15s
      setTimeout(() => {
        setIsScraping(false);
      }, 15000);

      // Force navigate back to dashboard to start sync
      setTimeout(() => { 
        const navCmd = "window.location.href = 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'; true;";
        webViewRef.current?.injectJavaScript(navCmd);
      }, 300);
    }
  };

  const dumpHtml = () => {
    console.log('DUMPING HTML...');
    webViewRef.current?.injectJavaScript(`
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'DEBUG', 
        message: 'DUMP URL: ' + window.location.href + ' TITLE: ' + document.title + ' BODY: ' + document.body.innerText.substring(0, 500)
      }));
      true;
    `);
  };

  const handleLoadEnd = (event: any) => {
    const url: string = event?.nativeEvent?.url || '';
    console.log('WEBVIEW LOAD END:', url);
    webViewRef.current?.injectJavaScript("window.ReactNativeWebView.postMessage(JSON.stringify({type:'DEBUG', message:'WEBVIEW_READY_SIGNAL'})); true;");
    
    if (url.includes('seatingplan') || url.includes('conduct') || url.includes('datesheet')) {
      console.log('AUTO-CAPTURED EXAM URL:', url);
      setData(prev => {
        const merged = { ...prev, examUrl: url };
        AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
        return merged;
      });
    }

    if (isFullyDone.current) return;

    if (url.includes('StudentDashboard.aspx') && !didDashboard.current) {
      console.log('INJECTING DASHBOARD_SCRIPT...');
      didDashboard.current = true;
      isProcessingPhase.current = true;
      setIsScraping(true);
      webViewRef.current?.injectJavaScript(DASHBOARD_SCRIPT);
    } else if (url.includes('frmStudentTimeTable.aspx') && !didTimetable.current) {
      didTimetable.current = true;
      isProcessingPhase.current = true;
      webViewRef.current?.injectJavaScript(TIMETABLE_SCRIPT);
    } else if (url.includes('Login.aspx') || url.includes('login.aspx') || url.includes('LoginNew.aspx') || url.includes('index.aspx')) {
      console.warn('SCRAPER: Redirected to Login! Session might be expired.');
      setIsScraping(false);
      isProcessingPhase.current = false;
    }
  };

  const onMessage = async (event: any) => {
    isProcessingPhase.current = false;
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      console.log('MESSAGE FROM WEBVIEW:', msg.type);

      if (msg.type === 'QUICK_PROFILE') {
        // Update profile/attendance immediately — before full dashboard data arrives
        const p = msg.payload || {};
        if (p.profile?.name && p.profile.name !== 'Unknown') {
          setData(prev => ({
            ...prev,
            profile: {
              ...p.profile,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/png?seed=${p.profile.vid || 'student'}&backgroundColor=007AFF`,
            },
            overallAttendance: p.overallAttendance || prev.overallAttendance,
            ...(p.cgpa ? { cgpa: p.cgpa } : {}),
          }));
        }

      } else if (msg.type === 'DASHBOARD_DATA') {
        const p = msg.payload || {};
        console.log('DASHBOARD DATA RECEIVED:', Object.keys(p));
        
        setData(prev => {
          const merged = { ...prev };
          if (p.profile?.name) {
            merged.profile = {
              ...p.profile,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/png?seed=${p.profile.vid || 'student'}&backgroundColor=007AFF`,
            };
          }
          if (p.overallAttendance) merged.overallAttendance = p.overallAttendance;
          if (p.attendance?.length > 0) merged.attendance = p.attendance;
          if (p.assignments?.length > 0) merged.assignments = p.assignments;
          if (p.messages?.length > 0) merged.messages = p.messages;
          if (p.announcements?.length > 0) merged.announcements = p.announcements;
          if (p.cgpa) merged.cgpa = p.cgpa;
          if (p.fee) merged.fee = p.fee;
          if (p.examUrl) merged.examUrl = p.examUrl;
          
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          return merged;
        });

        // Navigate to timetable (React side drives navigation, not the script)
        webViewRef.current?.injectJavaScript(
          `window.location.href = 'https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx'; true;`
        );

      } else if (msg.type === 'TIMETABLE_HTML_BLOB') {
        const html = msg.payload || '';
        // Extract courses and schedule from the raw HTML blob using a background-friendly approach
        // We'll use a simplified regex-based extractor for speed or reuse our logic
        // For now, let's keep it simple: we already have the full TIMETABLE_JSON logic
        // So we'll trigger the TIMETABLE_SCRIPT in the hidden webview if needed,
        // OR we can just parse the blob here if we had a DOM parser.
        // Since React Native doesn't have DOMParser, we'll rely on the existing chain
        // but the 'DASHBOARD_DATA' already marks us as nearly done.
        console.log('TIMETABLE BLOB received, length:', html.length);

      } else if (msg.type === 'TIMETABLE_JSON') {
        setIsScraping(false); // FINISH LOADING
        const raw = msg.payload || {};
        const rawSchedule = raw.schedule || {};
        const courses: any[] = raw.courses || [];

        // Build course code → {title, faculty} lookup map
        const courseMap: Record<string, { title: string; faculty: string }> = {};
        for (const c of courses) {
          const code = (c.code || '').trim();
          if (code) {
            courseMap[code] = { title: c.title || '', faculty: c.faculty || '' };
          }
        }

        // 1. Process Schedule into structured format
        const structuredSchedule: Record<string, any[]> = {};
        Object.keys(rawSchedule).forEach(day => {
          structuredSchedule[day] = rawSchedule[day].map((item: any) => {
            const details = item.details || '';
            // Format: "Lecture / G:All C:CSE211 / R: 33-311 / S:224IS"
            const subjectMatch = details.match(/C:([A-Z0-9]+)/);
            const roomMatch    = details.match(/R:\s*([A-Z0-9-]+)/);
            const typeMatch    = details.match(/^([^/]+)/);
            const sCode = subjectMatch ? subjectMatch[1] : '';
            const extra = courseMap[sCode];

            return {
              time: item.time,
              subjectCode: sCode,
              subject: extra?.title || sCode || (typeMatch ? typeMatch[1].trim() : 'Class'),
              room: roomMatch ? roomMatch[1] : 'TBA',
              type: typeMatch ? typeMatch[1].trim() : 'Lecture',
              faculty: extra?.faculty || '',
              date: item.date || ''
            };
          });
        });

        setData(prev => {
          // 2. Update attendance records with full names and faculty info
          const updatedAttendance = (prev.attendance || []).map(att => {
            const extra = courseMap[att.subjectCode];
            return {
              ...att,
              subjectName: extra?.title || att.subjectName,
              faculty: extra?.faculty || '',
            };
          });

          // 3. Calculate Aggregate Attendance
          let totalAttended = 0;
          let totalDelivered = 0;
          let totalLeaves = 0;
          updatedAttendance.forEach(a => {
            totalAttended += (a.attendedClasses || 0);
            totalDelivered += (a.totalClasses || 0);
            totalLeaves += (a.dutyLeaves || 0);
          });
          
          let aggregatePct = "0.0";
          if (totalDelivered > 0) {
            aggregatePct = (((totalAttended + totalLeaves) / totalDelivered) * 100).toFixed(1);
          }

          const merged = { 
            ...prev, 
            timetable: structuredSchedule,
            attendance: updatedAttendance,
            overallAttendance: aggregatePct
          };
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          return merged;
        });

      } else if (msg.type === 'DEBUG') {
        console.log('SCRAPER DEBUG:', msg.message);
      } else if (msg.type === 'ERROR') {
        console.error('SCRAPER ERROR:', msg.message);
        setIsScraping(false);
      }
    } catch (e) {
      console.error('Failed to parse message from WebView:', e);
    }
  };

  return (
    <ScraperContext.Provider value={{ data, isScraping, refreshData, dumpHtml }}>
      {children}
      {isAuthenticated && (
        <View style={{ height: 0, width: 0, overflow: 'hidden', position: 'absolute', opacity: 0 }}>
          <WebView
            ref={webViewRef}
            source={{ uri: 'https://ums.lpu.in/lpuums/StudentDashboard.aspx' }}
            onLoadEnd={handleLoadEnd}
            onMessage={onMessage}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          />
        </View>
      )}
    </ScraperContext.Provider>
  );
};
