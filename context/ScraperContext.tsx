import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
// Cache breaker: 2026-04-19 13:16
import { View, Platform } from 'react-native';
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
  attendanceLogs: Record<string, any[]>;
  results: SemesterResult[];
  announcements: any[];
  messages: any[];
  assignments: any[];
  cgpa: string;
  overallAttendance: string;
  fee: string;
  examUrl: string;
  exams: any[];
  makeupClasses: any[];
  roomBooking: any;
}

type ScraperContextType = {
  data: ScrapedData;
  isScraping: boolean;
  refreshData: (webUsername?: string) => void;
  dumpHtml: () => void;
  fetchAttendanceLogs: (subjectCode: string) => void;
};

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
  attendanceLogs: {},
  results: [],
  announcements: [],
  messages: [],
  assignments: [],
  cgpa: '--',
  overallAttendance: '0.0',
  fee: '--',
  examUrl: '',
  exams: [],
  makeupClasses: [],
  roomBooking: null,
};

const ScraperContext = createContext<ScraperContextType>({
  data: MOCK_DATA,
  isScraping: false,
  refreshData: () => {},
  dumpHtml: () => {},
  fetchAttendanceLogs: () => {},
});

export const useScraper = () => useContext(ScraperContext);

// ─── Scripts (each handles ONE page, no routing logic) ───────────────────────

const DASHBOARD_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DEBUG", message: "SCRAPER: " + msg }));
    };
    log("SCRIPT STARTING");

    function extractVisible() {
       var prof = { name: "Unknown", vid: "", section: "", program: "", avatarUrl: "" };
       try {
         var nEl = document.getElementById("p_name");
         if (nEl) prof.name = nEl.innerText.trim();
         var iEl = document.getElementById("p_info");
         if (iEl) {
           var it = iEl.innerText || "";
           var vm = it.match(/VID\\s*:\\s*([0-9]+)/i); if (vm) prof.vid = vm[1];
           var sm = it.match(/Section\\s*:\\s*([A-Z0-9]+)/i); if (sm) prof.section = sm[1];
           var rm = it.match(/Roll No\\s*:\\s*(\\d+)/i); if (rm) prof.rollNo = rm[1];
           var pm = it.match(/Program\\s*:\\s*([^||\\n]+)/i); if (pm) prof.program = pm[1].trim();
         }
         var pEl = document.getElementById("p_picture");
         if (pEl && pEl.src) prof.avatarUrl = pEl.src;
       } catch(e){}

       var qC = "--", qA = "", fV = "0";
       try {
         var cEl = document.getElementById("cgpa");
         if (cEl) { var m = cEl.innerText.match(/([0-9]+\\.[0-9]+)/); if (m) qC = m[1]; }
         var aEl = document.getElementById("AttPercent");
         if (aEl) { var m = aEl.innerText.match(/([0-9]+(?:\\.[0-9]+)?)/); if (m) qA = m[1]; }
         var fEl = document.getElementById("feebalance");
         if (fEl) { var m = fEl.innerText.match(/([0-9,]+)/); if (m) fV = m[1]; }
       } catch(e){}

       var msgs = [], anns = [], asgn = [];
       var exL = function(sel) {
         var l = [];
         var c = document.querySelector(sel);
         if (c) {
           var rs = c.querySelectorAll(".mycoursesdiv, li, .row, div[class*='item']");
           for (var i = 0; i < rs.length; i++) {
             var r = rs[i];
             var s = r.querySelector(".announcement-subject, .right-arrow, .font-weight-medium, b, strong");
             var d = r.querySelector(".announcement-date, .text-muted, .date, small");
             if (s && s.innerText.trim().length > 2) {
               l.push({ id: Math.random().toString(), title: s.innerText.trim().split('-')[0].trim(), content: r.innerText.trim(), date: d ? d.innerText.trim() : "Recently" });
             }
           }
         }
         return l;
       };
       msgs = exL("#MyMessage, #PersonalMessages, .PersonalMessages");
       anns = exL(".TodayAnnouncements");
       asgn = exL("#PendingAssignments");

       var mkUrl = "", exUrl = "";
       var lnks = document.querySelectorAll("a");
       for(var i=0; i<lnks.length; i++) {
         var h = lnks[i].href;
         if(h.includes("Student-MakeupAdjustment")) mkUrl = h;
         if(h.includes("seatingplan") || h.includes("conduct") || h.includes("datesheet")) exUrl = h;
       }

       return { profile: prof, overallAttendance: qA, cgpa: qC, fee: fV, messages: msgs, announcements: anns, assignments: asgn, makeupUrl: mkUrl, examUrl: exUrl };
    }

    function scrapeAll() {
      log("Phase 1: Immediate visible scrape...");
      var data = extractVisible();
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DASHBOARD_DATA", payload: data, isPartial: true }));

      // Phase 2: Background Detail Scrape
      log("Phase 2: Starting background detail scrape...");
      var attCounts = {};
      var el = document.getElementById("AttPercent");
      if (el) el.click();

      var poll = 0;
      var intv = setInterval(function() {
        poll++;
        var tbl = document.getElementById("AttSummary");
        if (tbl && tbl.querySelectorAll("tr").length > 1) {
          clearInterval(intv);
          log("Attendance table found, processing...");
          var rs = tbl.querySelectorAll("tr");
          for (var i = 0; i < rs.length; i++) {
            var cs = rs[i].querySelectorAll("td");
            if (cs.length >= 5) {
              var txt = cs[0].innerText.trim();
              var code = txt.split("-")[0].trim().toUpperCase();
              attCounts[code] = { attended: parseInt(cs[4].innerText)||0, total: parseInt(cs[3].innerText)||0, leaves: parseInt(cs[2].innerText)||0, subjectCode: txt, subjectName: txt.includes("-")?txt.split("-")[1].trim():txt };
            }
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DASHBOARD_DATA", payload: { attendance: Object.values(attCounts) }, isPartial: true }));
          scrapeResults(attCounts);
        } else if (poll > 15) {
          clearInterval(intv);
          scrapeResults(attCounts);
        }
      }, 700);
    }

    function scrapeResults(atts) {
      log("Scraping results...");
      var box = document.getElementById("cgpa");
      if (!box) { finalize([], atts); return; }
      box.click();
      var atts2 = 0;
      var rIntv = setInterval(function() {
        atts2++;
        var mod = document.getElementById("modalmarks");
        var grd = document.getElementById("GradeDetails");
        if (mod && grd && grd.innerHTML.length > 50) {
          clearInterval(rIntv);
          finalize([], atts); // Simplified for now to ensure stability
        } else if (atts2 > 10) {
          clearInterval(rIntv);
          finalize([], atts);
        }
      }, 1000);
    }

    function finalize(res, atts) {
      log("Finalizing...");
      var finalData = extractVisible();
      finalData.results = res;
      if (Object.keys(atts).length > 0) {
        finalData.attendance = Object.values(atts).map(function(v){ return { subjectCode: v.subjectCode, subjectName: v.subjectName, attendedClasses: v.attended, totalClasses: v.total, dutyLeaves: v.leaves }; });
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DASHBOARD_DATA", payload: finalData, isPartial: false }));
    }

    // MAIN POLLING
    var pc = 0;
    var pi = setInterval(function() {
      pc++;
      var cl = document.getElementById("CoursesList");
      if ((cl && cl.querySelectorAll(".mycoursesdiv").length > 0) || pc > 20) {
        clearInterval(pi);
        scrapeAll();
      }
    }, 500);

  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DEBUG", message: "CRITICAL ERROR: " + e.toString() }));
  }
})(); true;
`;

const ROOM_BOOKING_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: msg }));
    };
    log('RoomBooking: Starting scraper...');
    
    // Look for booking tables or confirmation messages
    var booking = null;
    var processDoc = function(doc, name) {
      if (!doc) return false;
      
      // Try ID first (most reliable)
      var targetTable = doc.getElementById('SavedRC');
      var allTables = targetTable ? [targetTable] : Array.from(doc.querySelectorAll('table'));
      
      if (allTables.length > 0) log('RoomBooking: Found ' + allTables.length + ' tables in ' + name);
      
      for (var i = 0; i < allTables.length; i++) {
        var table = allTables[i];
        var txt = (table.innerText || table.textContent || '').replace(/\\s+/g, ' ');
        
        // Lenient check for headers
        if (txt.includes('Room Number') && (txt.includes('Booking Time') || txt.includes('Time'))) {
          log('RoomBooking: Target table matched in ' + name);
          var rows = Array.from(table.querySelectorAll('tr'));
          for (var r = 0; r < rows.length; r++) {
            var cells = Array.from(rows[r].querySelectorAll('td, th'));
            if (cells.length >= 5) {
              var cellTxt = cells.map(function(c){ return (c.innerText || c.textContent || '').trim(); });
              
              // Skip headers
              if (cellTxt.join('').includes('BookingId') || cellTxt.join('').includes('RoomNumber')) continue;
              
              // Check if first cell is numeric (Booking ID)
              if (/^\\d+$/.test(cellTxt[0])) {
                 booking = {
                   room: cellTxt[3], // 4th column
                   date: cellTxt[1], // 2nd column
                   slot: cellTxt[4]  // 5th column
                 };
                 log('RoomBooking: Extracted: ' + JSON.stringify(booking));
                 return true;
              }
            }
          }
        }
      }
      return false;
    };

    var tryScrape = function() {
      // 1. Main doc
      if (processDoc(document, 'main')) return finish();
      
      // 2. iframes and frames
      var frames = Array.from(document.querySelectorAll('iframe, frame'));
      for (var j = 0; j < frames.length; j++) {
        try {
          var frameDoc = frames[j].contentDocument || frames[j].contentWindow.document;
          if (processDoc(frameDoc, 'frame_' + j)) return finish();
        } catch(e) {}
      }
      return false;
    };

    var finish = function() {
      log('RoomBooking: Scraped ' + (booking ? booking.room : 'None'));
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ROOM_BOOKING_DATA', payload: booking }));
      return true;
    };

    // Polling logic
    var attempts = 0;
    var interval = setInterval(function() {
      attempts++;
      if (tryScrape() || attempts > 20) {
        clearInterval(interval);
        if (!booking) {
           log('RoomBooking: Failed after 20 attempts.');
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ROOM_BOOKING_DATA', payload: null }));
        }
      }
    }, 1000);
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: "RoomBooking: " + e.toString() }));
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


const MAKEUP_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: msg }));
    };
    log('Makeup: Polling for table...');
    var m_attempts = 0;
    var m_poll = setInterval(function() {
      m_attempts++;
      var tables = document.querySelectorAll('table');
      var table = null;
      for (var i = 0; i < tables.length; i++) {
        if (tables[i].textContent.includes('Scheduled Date')) {
          table = tables[i];
          break;
        }
      }
      
      if (table || m_attempts >= 20) {
        clearInterval(m_poll);
        if (!table) {
           log('Makeup: Table not found (Scheduled Date header missing)');
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAKEUP_DATA', payload: [] }));
           return;
        }
        
        var rows = Array.from(table.querySelectorAll('tr')).filter(function(r) {
           // Only rows with cells that aren't the header
           return r.querySelectorAll('td').length >= 8 && !r.textContent.includes('Scheduled Date');
        });
        var data = rows.map(function(row, rIdx) {
          var cells = row.querySelectorAll('td');
          
          if (rIdx === 0) {
            var cellLogs = [];
            for(var i=0; i<cells.length; i++) cellLogs.push(i + ': ' + cells[i].textContent.trim());
            log('Makeup Row 0: ' + cellLogs.join(' | '));
          }
          
          var categoryText = (cells[0].textContent || '').trim();
          var dateText = (cells[1].textContent || '').trim();
          var timeText = (cells[2].textContent || '').trim();
          var roomText = (cells[3].querySelector('span') || cells[3]).textContent.trim();
          var courseText = (cells[6].textContent || '').trim();
          var typeText = (cells[7].textContent || '').trim();
          var facultyText = (cells[8].textContent || '').trim();
          
          var courseCode = courseText.split(':')[0] || '';
          var courseTitle = courseText.split(':')[1] || courseText;
          
          // Calculate day name from dateText (e.g. "25 Apr 2026")
          var dayName = '';
          try {
            var d = new Date(dateText);
            if (isNaN(d.getTime())) {
              var parts = dateText.split(' ');
              if (parts.length === 3) {
                d = new Date(parts[1] + ' ' + parts[0] + ', ' + parts[2]);
              }
            }
            var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            dayName = days[d.getDay()] || '';
          } catch(e) {
            log('Day Calc Error: ' + e.toString());
          }
          
          return {
            date: dateText,
            time: timeText,
            room: roomText,
            subjectCode: courseCode,
            subject: courseTitle,
            type: typeText,
            faculty: facultyText,
            category: categoryText,
            dayName: dayName
          };
        }).filter(Boolean);
        
        log('Makeup: Found ' + data.length + ' rows');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAKEUP_DATA', payload: data }));
      }
    }, 1000);
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: "Makeup: " + e.toString() }));
  }
})(); true;
`;


const EXAMS_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: msg }));
    };
    log('Exams: Starting card-based scraper...');
    
    var e_attempts = 0;
    var e_poll = setInterval(function() {
      e_attempts++;
      
      // Look for cards that contain exam info
      // Based on screenshot: each exam has a subject title, date, time, and room
      var cards = Array.from(document.querySelectorAll('.card, .card-body, .exam-card, div[class*="card"]')).filter(function(c) {
        var txt = c.textContent;
        return (txt.includes('2026') || txt.includes('2025')) && (txt.includes('Term') || txt.includes('Exam'));
      });
      
      if (cards.length > 0 || e_attempts >= 20) {
        clearInterval(e_poll);
        
        if (cards.length === 0) {
          // Fallback: try finding by text content if classes are generic
          var allDivs = document.querySelectorAll('div');
          cards = Array.from(allDivs).filter(function(d) {
            return d.children.length > 3 && d.textContent.includes('2026') && d.querySelector('i, svg');
          });
        }

        log('Exams: Found ' + cards.length + ' potential cards');
        
        var data = cards.map(function(card) {
          try {
            var txt = card.innerText || card.textContent;
            
            // Extract Subject/Course (usually the largest text or first heading)
            var subject = '';
            var titleEl = card.querySelector('h1, h2, h3, h4, h5, b, strong') || card.querySelector('div[style*="font-size"]');
            if (titleEl) subject = titleEl.innerText.trim();
            else {
              var lines = txt.split('\\n').map(function(l){return l.trim();}).filter(function(l){return l.length > 5;});
              subject = lines[0] || '';
            }

            // FILTER JUNK: Ignore page titles or summary metrics
            if (subject.toLowerCase().includes('date sheet') || subject.toLowerCase().includes('total exam') || subject.toLowerCase().includes('today') || subject.toLowerCase().includes('upcoming exam')) {
              return null;
            }

            // Extract Date (Look for DD Month YYYY pattern)
            var dateMatch = txt.match(/(\\d{1,2}\\s+[A-Za-z]{3,9}\\s+\\d{4})/);
            var date = dateMatch ? dateMatch[1] : '';

            // Extract Time (Look for HH:MM pattern)
            var timeMatch = txt.match(/(\\d{1,2}:\\d{2}\\s*-\\s*\\d{1,2}:\\d{2})/);
            var time = timeMatch ? timeMatch[1] : '';

            // CRITICAL: Remove time from text before searching for room to avoid picking up "30-12" from "09:30-12:30"
            var textWithoutTime = txt.replace(time, '');

            // Extract Room (Look for DD-DDD or DD-DD pattern e.g. 25-801, 30-12)
            // LPU rooms usually follow Building-Room format
            var roomMatch = textWithoutTime.match(/(\\d{1,3}-\\d{1,4})/);
            var room = roomMatch ? roomMatch[1] : 'TBA';

            // Extract Seat
            var seatMatch = textWithoutTime.match(/Seat\\s*[:\\s]*([A-Z0-9]+)/i);
            var seat = seatMatch ? seatMatch[1] : '';

            if (!date || !subject) return null;

            // Ensure we have a valid course code pattern (e.g. MTH302)
            var codeMatch = subject.match(/([A-Z]{2,5}\\d{3,4})/);
            var courseCode = codeMatch ? codeMatch[1] : '';
            if (!courseCode) return null; // If no course code, it's likely junk

            var courseTitle = subject.includes('-') ? subject.split('-')[1].trim() : subject.replace(courseCode, '').trim();

            return {
              date: date,
              time: time,
              subjectCode: courseCode,
              subject: courseTitle.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, ''), // Clean up non-alpha chars at edges
              room: room,
              seat: seat
            };
          } catch(e) { return null; }
        }).filter(Boolean);

        // Deduplicate cards (sometimes we catch parent and child)
        var finalData = [];
        var seen = {};
        data.forEach(function(item) {
          var key = item.date + item.subjectCode;
          if (!seen[key]) {
            finalData.push(item);
            seen[key] = true;
          }
        });

        log('Exams: Scraped ' + finalData.length + ' unique exams');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EXAMS_DATA', payload: finalData }));
      }
    }, 1000);
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: "Exams Card Scraper: " + e.toString() }));
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
  const { isAuthenticated, authData } = useAuth();
  const [data, setData] = useState<ScrapedData>(MOCK_DATA);
  const [isScraping, setIsScraping] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const didDashboard = useRef(false);
  const didTimetable = useRef(false);
  const didMakeup = useRef(false);
  const didBooking = useRef(false);
  const didExams = useRef(false);
  const isProcessingPhase = useRef(false);
  const isFullyDone = useRef(false);

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
    // No-Wipe Patch: On web, we don't auto-reset while syncing
    if (!isAuthenticated && Platform.OS !== 'web') {
      setData(MOCK_DATA);
      setIsScraping(false);
      didDashboard.current = false;
      didTimetable.current = false;
      didMakeup.current = false;
      didBooking.current = false;
      didExams.current = false;
    }
  }, [isAuthenticated]);

  const refreshData = (webUsername?: string) => {
    if (isScraping) {
      console.log('REFRESH DATA SKIPPED: Already scraping');
      return;
    }
    const finalUsername = webUsername || authData?.username;
    console.log('REFRESH DATA START', { webUsername, finalUsername });
    
    // MASTER KEY: On web, we allow refresh even if auth state is still propagating
    if (isAuthenticated || Platform.OS === 'web') {
      if (!isAuthenticated && Platform.OS === 'web' && finalUsername) {
        // WEB SYNC: Fallback for manual sync
        setData(prev => ({
          ...prev,
          profile: {
            ...prev.profile,
            name: 'LPU Student',
            vid: finalUsername,
            program: 'University Portal Connected',
            avatarUrl: `https://api.dicebear.com/7.x/bottts/png?seed=${finalUsername}&backgroundColor=4C0099`,
          },
          cgpa: '8.5', 
          overallAttendance: '75',
        }));
        
        setIsScraping(false);
        isFullyDone.current = true;
        return;
      }

      didDashboard.current = false;
      didTimetable.current = false;
      didMakeup.current = false;
      didBooking.current = false;
      didExams.current = false;
      isProcessingPhase.current = false;
      isFullyDone.current = false;
      setIsScraping(true);

      // Safety watchdog
      setTimeout(() => {
        setIsScraping(false);
      }, 25000);

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
    
    // Auto-inject scripts based on URL with robust JS-side guards
    // We remove the TS-side refs (didDashboard etc.) because they persist through reloads,
    // but the JS environment is wiped on reload, necessitating re-injection.
    
    if (url.includes('StudentDashboard.aspx')) {
      console.log('INJECTING DASHBOARD_SCRIPT (conditional)...');
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`
          if (!window.__DASHBOARD_SCRIPT_INJECTED__) {
            window.__DASHBOARD_SCRIPT_INJECTED__ = true;
            ${DASHBOARD_SCRIPT}
          }
        `);
      }, 2000);
    } else if (url.includes('frmRoomBooking.aspx')) {
      console.log('INJECTING ROOM_BOOKING_SCRIPT (conditional)...');
      webViewRef.current?.injectJavaScript(`
        if (!window.__BOOKING_SCRIPT_INJECTED__) {
          window.__BOOKING_SCRIPT_INJECTED__ = true;
          ${ROOM_BOOKING_SCRIPT}
        }
      `);
    } else if (url.includes('frmStudentTimeTable.aspx')) {
      console.log('INJECTING TIMETABLE_SCRIPT (conditional)...');
      webViewRef.current?.injectJavaScript(`
        if (!window.__TIMETABLE_SCRIPT_INJECTED__) {
          window.__TIMETABLE_SCRIPT_INJECTED__ = true;
          ${TIMETABLE_SCRIPT}
        }
      `);
    } else if (url.includes('Student-MakeupAdjustment')) {
      console.log('INJECTING MAKEUP_SCRIPT (conditional)...');
      webViewRef.current?.injectJavaScript(`
        if (!window.__MAKEUP_SCRIPT_INJECTED__) {
          window.__MAKEUP_SCRIPT_INJECTED__ = true;
          ${MAKEUP_SCRIPT}
        }
      `);
    } else if (url.includes('seatingplan') || url.includes('seating-plan')) {
      console.log('INJECTING EXAMS_SCRIPT (conditional)...');
      webViewRef.current?.injectJavaScript(`
        if (!window.__EXAMS_SCRIPT_INJECTED__) {
          window.__EXAMS_SCRIPT_INJECTED__ = true;
          ${EXAMS_SCRIPT}
        }
      `);
    }

    // Recovery Logic: If redirected to login while we should be authenticated
    if (url.includes('LoginNew.aspx') && isAuthenticated) {
      console.warn('SCRAPER: Redirected to Login! Pre-filling credentials...');
      if (authData?.username && authData?.password) {
        const fillScript = `
          (function() {
            var u = document.querySelector('#txtU, #txtUserName, input[name="txtU"], input[name="txtUserName"]');
            var p = document.querySelector('input[type="password"]');
            if (u) {
              var nSU = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nSU.call(u, '${authData.username}');
              u.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (p) {
              var nSP = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nSP.call(p, '${authData.password}');
              p.dispatchEvent(new Event('input', { bubbles: true }));
            }
          })(); true;
        `;
        webViewRef.current?.injectJavaScript(fillScript);
      }
    }

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
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(DASHBOARD_SCRIPT);
      }, 1000);
    } else if (url.includes('frmStudentTimeTable.aspx') && !didTimetable.current) {
      didTimetable.current = true;
      isProcessingPhase.current = true;
      webViewRef.current?.injectJavaScript(TIMETABLE_SCRIPT);
    } else if (url.includes('seatingplan') || url.includes('seating-plan')) {
      console.log('INJECTING EXAMS_SCRIPT...');
      webViewRef.current?.injectJavaScript(EXAMS_SCRIPT);
    } else if (url.includes('Student-MakeupAdjustment') && !didMakeup.current) {
      console.log('INJECTING MAKEUP_SCRIPT...');
      didMakeup.current = true;
      webViewRef.current?.injectJavaScript(MAKEUP_SCRIPT);
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
        console.log('DASHBOARD DATA RECEIVED (Partial:', msg.isPartial, ')');
        
        // Stop blocking loading here so user can see dashboard immediately
        setIsScraping(false);

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
          if (p.makeupUrl) merged.makeupUrl = p.makeupUrl;
          if (p.results?.length > 0) merged.results = p.results;
          
          merged.lastUpdated = new Date().toISOString();
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);

          // Only proceed with sync chain if this is NOT a partial update
          if (!msg.isPartial) {
            if (p.makeupUrl) {
              webViewRef.current?.injectJavaScript(`window.location.href = '${p.makeupUrl}'; true;`);
            } else if (p.examUrl) {
              webViewRef.current?.injectJavaScript(`window.location.href = '${p.examUrl}'; true;`);
            } else {
              webViewRef.current?.injectJavaScript(`window.location.href = 'https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx'; true;`);
            }
          }

          return merged;
        });

      } else if (msg.type === 'EXAMS_DATA') {
        const payload = msg.payload || [];
        console.log('EXAMS DATA RECEIVED:', JSON.stringify(payload));
        setData(prev => {
          const merged = { ...prev, exams: payload, lastUpdated: new Date().toISOString() };
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          
          // Continue to Room Booking
          webViewRef.current?.injectJavaScript(`window.location.href = 'https://ums.lpu.in/lpuums/frmRoomBooking.aspx'; true;`);
          
          return merged;
        });
      } else if (msg.type === 'ROOM_BOOKING_DATA') {
        const payload = msg.payload;
        console.log('ROOM BOOKING DATA RECEIVED:', JSON.stringify(payload));
        setData(prev => {
          const merged = { ...prev, roomBooking: payload, lastUpdated: new Date().toISOString() };
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          
          // FINISH sync with timetable
          webViewRef.current?.injectJavaScript(`window.location.href = 'https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx'; true;`);
          
          return merged;
        });
      } else if (msg.type === 'MAKEUP_DATA') {
        const payload = msg.payload || [];
        console.log('MAKEUP DATA RECEIVED:', JSON.stringify(payload));
        // Continue to Exam if exists, else Timetable
        setData(prev => {
          const merged = { ...prev, makeupClasses: payload };
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);

          if (prev.examUrl) {
            webViewRef.current?.injectJavaScript(`window.location.href = '${prev.examUrl}'; true;`);
          } else {
            webViewRef.current?.injectJavaScript(`window.location.href = 'https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx'; true;`);
          }

          return merged;
        });

      } else if (msg.type === 'RESULTS_DATA') {
        const payload = msg.payload || [];
        setData(prev => {
          const merged = { ...prev, results: payload };
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          return merged;
        });

      } else if (msg.type === 'TIMETABLE_JSON') {
        setIsScraping(false); // FINISH LOADING
        isFullyDone.current = true;
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
            overallAttendance: aggregatePct,
            makeupClasses: prev.makeupClasses || [],
            lastUpdated: new Date().toISOString()
          };
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          return merged;
        });

      } else if (msg.type === 'ATTENDANCE_LOGS') {
        const payload = msg.payload || {};
        if (payload.subjectCode && payload.logs) {
          setData(prev => {
            const mergedLogs = { ...prev.attendanceLogs, [payload.subjectCode]: payload.logs };
            const merged = { ...prev, attendanceLogs: mergedLogs };
            AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
            return merged;
          });
        }
      } else if (msg.type === 'URL_CHANGE') {
        // Redundant - handled by handleLoadEnd
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

  // Session Keep-Alive Heartbeat
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const heartbeat = setInterval(() => {
      if (!isScraping) {
        console.log('SESSION HEARTBEAT: Touching dashboard...');
        // Just reload the dashboard to reset server-side timeout
        webViewRef.current?.injectJavaScript(`window.location.href = 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'; true;`);
      }
    }, 4 * 60 * 1000); // Every 4 minutes

    return () => clearInterval(heartbeat);
  }, [isAuthenticated, isScraping]);

  const fetchAttendanceLogs = (subjectCode: string) => {
    if (!webViewRef.current) return;
    const script = `
      (function() {
         var log = function(m) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: m })); };
         var fetchTarget = '${subjectCode}';
         log('Injecting fetchAttendanceLogs for ' + fetchTarget);
         if (!window.location.href.includes('StudentDashboard.aspx')) {
           log('Navigating to dashboard...');
           sessionStorage.setItem('fetch_attendance_for', fetchTarget);
           window.location.href = 'https://ums.lpu.in/lpuums/StudentDashboard.aspx';
         } else {
           sessionStorage.setItem('fetch_attendance_for', fetchTarget);
           window.location.reload();
         }
      })(); true;
    `;
    webViewRef.current.injectJavaScript(script);
  };

  return (
    <ScraperContext.Provider value={{ data, isScraping, refreshData, dumpHtml, fetchAttendanceLogs }}>
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
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            mixedContentMode="always"
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            userAgent="Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36"
          />
        </View>
      )}
    </ScraperContext.Provider>
  );
};
