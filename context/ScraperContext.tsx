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
  lastUpdated?: string;
  makeupUrl?: string;
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
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DEBUG", message: "DASHBOARD SCRIPT LOADED - DIRECT POST" }));
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

      if ((hasCoursesLoaded && hasCgpa && hasAtt) || pollCount >= 12) {
        clearInterval(poll);
        var fetchTarget = sessionStorage.getItem('fetch_attendance_for');
        if (fetchTarget) {
          sessionStorage.removeItem('fetch_attendance_for');
          log("Dashboard: Fetching detailed logs for " + fetchTarget);
          var rows = coursesList ? coursesList.querySelectorAll(".mycoursesdiv") : [];
          var targetRow = null;
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].innerText.includes(fetchTarget)) { targetRow = rows[i]; break; }
          }
          if (targetRow) {
            targetRow.click();
            var apoll = 0;
            var ap = setInterval(function() {
              apoll++;
              var mBody = document.querySelector('.modal.show .modal-body') || document.querySelector('#modalAttendance .modal-body') || document.querySelector('#AttendanceModal .modal-body');
              if (mBody && mBody.innerText.includes('Faculty')) {
                clearInterval(ap);
                var logs = [];
                var attRows = mBody.querySelectorAll('.row, li, tr, .card');
                for (var i = 0; i < attRows.length; i++) {
                  var rText = attRows[i].innerText.trim();
                  if (rText && (rText.match(/^[P|A|D|O|E|L]\\s/i) || rText.includes('Faculty'))) {
                    var statusMatch = rText.match(/^(P|A|D|O|E|L)\\b/i);
                    var dateMatch = rText.match(/(\\d{1,2}\\s+[A-Za-z]{3},\\s*\\d{4})/);
                    var timeMatch = rText.match(/(\\[[A-Z]\\]\\s*-?\\s*\\d{1,2}:\\d{2}\\s*-\\s*\\d{1,2}:\\d{2}\\s*[APM]{2})/i) || rText.match(/(\\[[A-Z]\\])/i);
                    var facMatch = rText.match(/Faculty\\s*:\\s*([^\\n(]+)/i);
                    logs.push({
                      status: statusMatch ? statusMatch[1].toUpperCase() : '?',
                      date: dateMatch ? dateMatch[1] : '',
                      time: timeMatch ? timeMatch[1] : '',
                      faculty: facMatch ? facMatch[1].trim() : '',
                      raw: rText
                    });
                  }
                }
                var closeBtn = document.querySelector('.modal.show .close, .modal.show [data-dismiss="modal"]');
                if (closeBtn) closeBtn.click();
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ATTENDANCE_LOGS', payload: { subjectCode: fetchTarget, logs: logs } }));
              } else if (apoll > 20) {
                clearInterval(ap);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ATTENDANCE_LOGS', payload: { subjectCode: fetchTarget, logs: [] } }));
              }
            }, 250);
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ATTENDANCE_LOGS', payload: { subjectCode: fetchTarget, logs: [] } }));
          }
        } else {
          log("Dashboard: Poll done, starting scrapeAll");
          scrapeAll();
        }
      }
    }, 300);

    function scrapeAll() {
      try {
        log("scrapeAll: Starting...");
        var attCounts = {};

        function triggerAtt() {
          var el = document.getElementById("AttPercent");
          if (el) { el.click(); log("scrapeAll: AttPercent clicked"); }
        }

        // Step 1: Attendance
        function startScrape() {
          log("Dashboard: Starting Scrape...");
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
                if (c.length >= 5) {
                  var codeText = c[0].innerText.trim();
                  var normCode = codeText.split("-")[0].split(":")[0].trim().replace(/[\\s:]/g, "").toUpperCase();
                  attCounts[normCode] = {
                    attended: parseInt(c[4].innerText) || 0,
                    total: parseInt(c[3].innerText) || 0,
                    leaves: parseInt(c[2].innerText) || 0,
                    subjectCode: codeText,
                    subjectName: codeText.includes("-") ? codeText.split("-")[1].trim() : codeText
                  };
                }
              }
              scrapeResults();
            } else if (pollCount >= 15) {
              clearInterval(poll);
              log("scrapeAll: Attendance timeout, moving to results...");
              scrapeResults();
            } else if (pollCount % 5 === 0) {
              triggerAtt();
            }
          }, 300);
        }

        // Step 2: Results
        function scrapeResults() {
          log("scrapeResults: Starting...");
          var cgpaBox = document.getElementById("cgpa");
          if (!cgpaBox) { log("scrapeResults: CGPA box not found"); finalize([]); return; }
          
          cgpaBox.click();
          var rAttempts = 0;
          var rPoll = setInterval(function() {
            rAttempts++;
            var modal = document.getElementById("modalmarks");
            var gradeContent = document.getElementById("GradeDetails");
            
            // Try to force click the Marks tab using text content if possible, to trigger any lazy loading
            var tabs = modal ? modal.querySelectorAll("a, button") : [];
            for (var t = 0; t < tabs.length; t++) {
               var tTxt = (tabs[t].textContent || "").trim().toLowerCase();
               if (tTxt.includes("marks details") && !tabs[t].classList.contains("active")) {
                  try { tabs[t].click(); } catch(e){}
               }
            }
            
            if (modal && gradeContent && (gradeContent.innerHTML.length > 50 || rAttempts >= 15)) {
              clearInterval(rPoll);
              if (rAttempts >= 15) { 
                log("scrapeResults: Timeout waiting for modal content."); 
                finalize([]); 
                return; 
              }
              log("scrapeResults: Modal content loaded.");
              
              var marksData = {};
              var backlogTerms = []; 
              var normalMarksTerms = []; 

              try {
                var modalWrapper = document.getElementById("modalmarks");
                if (modalWrapper) {
                  var mTables = modalWrapper.querySelectorAll("table");
                  log("scrapeResults: Modal has " + mTables.length + " total tables.");
                  var marksCount = 0;
                  for (var mt = 0; mt < mTables.length; mt++) {
                     var mTable = mTables[mt];
                     var tableText = mTable.textContent || "";
                     if (tableText.toLowerCase().includes("type") && tableText.toLowerCase().includes("weightage")) {
                        marksCount++;
                        
                        var termId = "";
                        var tNode = mTable;
                        for (var climb = 0; climb < 10; climb++) {
                           if (!tNode) break;
                           var pSib = tNode.previousElementSibling;
                           while (pSib) {
                              var tm = (pSib.textContent || "").match(/Term\\s*Id\\s*:\\s*([A-Za-z0-9]+)/i);
                              if (tm) { termId = tm[1]; break; }
                              pSib = pSib.previousElementSibling;
                           }
                           if (termId) break;
                           tNode = tNode.parentElement;
                        }
                        
                        var cCode = "";
                        var subjTitle = "";
                        var cNode = mTable;
                        for (var climb = 0; climb < 10; climb++) {
                           if (!cNode) break;
                           var pSib = cNode.previousElementSibling;
                           while (pSib) {
                              var pTxt = pSib.textContent || "";
                              var match = pTxt.match(/([A-Za-z]{3,4}\\s*[0-9]{3,4})/);
                              if (match && pTxt.length < 200) {
                                 cCode = match[1].replace(/\\s/g, '').toUpperCase();
                                 subjTitle = pTxt.trim();
                                 break;
                              }
                              
                              if (pSib.querySelectorAll) {
                                 var desc = pSib.querySelectorAll("*");
                                 for (var d = desc.length - 1; d >= 0; d--) {
                                    var dTxt = desc[d].textContent || "";
                                    var dMatch = dTxt.match(/([A-Za-z]{3,4}\\s*[0-9]{3,4})/);
                                    if (dMatch && dTxt.length < 200) {
                                       cCode = dMatch[1].replace(/\\s/g, '').toUpperCase();
                                       subjTitle = dTxt.trim();
                                       break;
                                    }
                                 }
                              }
                              if (cCode) break;
                              pSib = pSib.previousElementSibling;
                           }
                           if (cCode) break;
                           cNode = cNode.parentElement;
                        }
                        
                        if (cCode) {
                             var marksList = [];
                             var mRows = mTable.querySelectorAll("tr");
                             for (var mr = 1; mr < mRows.length; mr++) {
                               var cols = mRows[mr].querySelectorAll("td, th");
                               if (cols.length >= 3) {
                                 var t = (cols[0].textContent || "").trim();
                                 if (t && t.toLowerCase() !== "type") {
                                   marksList.push({
                                     type: t,
                                     marks: (cols[1].textContent || "").trim(),
                                     weightage: (cols[2].textContent || "").trim()
                                   });
                                 }
                               }
                             }
                             
                             marksData[cCode] = marksList;
                             
                             if (termId) {
                               var subjObj = {
                                  code: cCode,
                                  name: subjTitle.replace(/([A-Za-z]{3,4}\\s*[0-9]{3,4})/i, "").replace(/[:\\-]/g, "").trim(),
                                  grade: "--",
                                  marksDetails: marksList
                               };
                               
                               var targetArr = /[A-Za-z]/.test(termId) ? backlogTerms : normalMarksTerms;
                               var found = false;
                               for(var arrIdx=0; arrIdx<targetArr.length; arrIdx++) {
                                  if (targetArr[arrIdx].termId === termId) {
                                     targetArr[arrIdx].subjects.push(subjObj);
                                     found = true;
                                     break;
                                  }
                               }
                               if (!found) {
                                  targetArr.push({ termId: termId, subjects: [subjObj] });
                               }
                             }
                        }
                     }
                  }
                  log("scrapeResults: Extracted marks for " + Object.keys(marksData).length + " subjects");
                }
              } catch(e) { log("scrapeResults Marks Error: " + e.toString()); }

              var gradeTab = document.getElementById("second-tab1");
              if (gradeTab && !gradeTab.classList.contains("active")) gradeTab.click();
              
              setTimeout(function() {
                try {
                  var results = [];
                  var allText = gradeContent.innerText || gradeContent.textContent || "";
                  var tables = gradeContent.querySelectorAll("table");
                  log("scrapeResults: Parsing " + tables.length + " tables in Grade Details.");
                  
                  var termMatches = [];
                  var tRegex = /Term\\s*[:\\s]*([IVX\\d]+)/gi;
                  var gRegex = /TGPA\\s*[:\\s]*([0-9.]+)/gi;
                  var tList = [], gList = [], m1, m2;
                  while ((m1 = tRegex.exec(allText)) !== null) tList.push(m1[1]);
                  while ((m2 = gRegex.exec(allText)) !== null) gList.push(m2[1]);
                  for (var i = 0; i < tList.length; i++) termMatches.push({ term: tList[i], tgpa: gList[i] || "--" });

                  for (var idx = 0; idx < tables.length; idx++) {
                    var table = tables[idx];
                    var termInfo = termMatches[idx] || { term: (idx+1).toString(), tgpa: "--" };
                    var subjects = [];
                    var rows = table.querySelectorAll("tr");
                    for (var rIdx = 0; rIdx < rows.length; rIdx++) {
                      var row = rows[rIdx];
                      var rowText = row.innerText || row.textContent || "";
                      if (rowText && !rowText.includes("Course") && rowText.includes("::")) {
                        var parts = rowText.split("::");
                        var codeM = parts[0].trim().match(/([A-Z0-9]{3,})/);
                        var rest = parts[1].trim();
                        var gradeM = rest.match(/Grade\\s*[:\\s]*([A-Z+O]{1,2})/i) || rest.match(/\\s+([A-Z+O]{1,2})$/);
                        var name = rest;
                        if (gradeM) name = rest.replace(gradeM[0], "").trim();

                        if (codeM) {
                          var extractedCode = codeM[1].trim().toUpperCase();
                          subjects.push({
                            code: extractedCode,
                            name: name,
                            grade: gradeM ? gradeM[1].trim() : "--",
                            marksDetails: marksData[extractedCode] || []
                          });
                        }
                      }
                    }
                    results.push({ semester: "Semester " + termInfo.term, sgpa: termInfo.tgpa, subjects: subjects });
                  }
                  
                  if (normalMarksTerms.length > results.length) {
                     var currentTerm = normalMarksTerms[normalMarksTerms.length - 1];
                     var semNum = results.length + 1;
                     var romanMap = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
                     var rNum = romanMap[semNum] || semNum.toString();
                     results.push({
                        semester: "Semester " + rNum,
                        sgpa: "--",
                        subjects: currentTerm.subjects
                     });
                  }
                  
                  for (var i = 0; i < backlogTerms.length; i++) {
                     results.push({
                        semester: "Term " + backlogTerms[i].termId,
                        sgpa: "--",
                        subjects: backlogTerms[i].subjects
                     });
                  }
                  
                  log("scrapeResults: Final results count=" + results.length);
                  finalize(results);
                } catch(e) { log("scrapeResults Error: " + e.toString()); finalize([]); }
              }, 500);
            }
          }, 300);
        }

        // Step 3: Finalize and Send
        function finalize(resList) {
          log("SCRAPER DEBUG: finalize starting...");
          try {
            var prof = { name: "Unknown", vid: "", section: "", program: "", avatarUrl: "" };
            var nameEl = document.getElementById("p_name");
            if (nameEl) prof.name = nameEl.innerText.trim();
            var infoEl = document.getElementById("p_info");
            if (infoEl) {
              var infoTxt = infoEl.innerText || "";
              log("SCRAPER DEBUG: Profile Info Raw: " + infoTxt);
              var vidM = infoTxt.match(/VID\\s*:\\s*([0-9]+)/i); if (vidM) prof.vid = vidM[1];
              var secM = infoTxt.match(/Section\\s*:\\s*([A-Z0-9]+)/i); if (secM) prof.section = secM[1];
              var rollM = infoTxt.match(/Roll No\\s*:\\s*(\\d+)/i); if (rollM) prof.rollNo = rollM[1];
              
              // Smart program detection
              var progM = infoTxt.match(/Program\\s*:\\s*([^||\\n]+)/i);
              if (progM) {
                prof.program = progM[1].trim();
              } else {
                // Split and find the part that isn't the name, VID, or Section
                var parts = infoTxt.split(/[|\\n]/).map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 3; });
                for (var i = parts.length - 1; i >= 0; i--) {
                  var p = parts[i];
                  if (!p.includes("VID") && !p.includes("Section") && !p.includes("Roll No") && p.toLowerCase() !== prof.name.toLowerCase()) {
                    prof.program = p;
                    break;
                  }
                }
              }
            }
            var picEl = document.getElementById("p_picture");
            if (picEl && picEl.src) prof.avatarUrl = picEl.src;

            var qC = "--", qA = "", fV = "0";
            var cgpaEl = document.getElementById("cgpa");
            if (cgpaEl) { var cm = cgpaEl.innerText.match(/([0-9]+\\.[0-9]+)/); if (cm) qC = cm[1]; }
            var attEl = document.getElementById("AttPercent");
            if (attEl) { var am = attEl.innerText.match(/([0-9]+(?:\\.[0-9]+)?)/); if (am) qA = am[1]; }
            var feeEl = document.getElementById("feebalance");
            if (feeEl) { var fm = feeEl.innerText.match(/([0-9,]+)/); if (fm) fV = fm[1]; }

            var att = [];
            var cl = document.getElementById("CoursesList");
            if (cl) {
              var rows = cl.querySelectorAll(".mycoursesdiv");
              for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var pctSpan = row.querySelector(".c100 span");
                var pctText = (pctSpan ? pctSpan.innerText : "0").replace(/%/g, "");
                var bTag = row.querySelector("b");
                var code = bTag ? bTag.innerText.trim().replace(/\\s*:$/, "") : "";
                var pTag = row.querySelector("p.font-weight-medium");
                var name = "";
                if (pTag) {
                  var parts = pTag.innerText.split(":");
                  if (parts.length > 1) name = parts[1].split("\\n")[0].trim();
                }
                if (code && code.length > 2) {
                  var normCode = code.split("-")[0].split(":")[0].trim().replace(/[\\s:]/g, "").toUpperCase();
                  var counts = attCounts[normCode] || { attended: 0, total: 0, leaves: 0 };
                  att.push({ 
                    subjectCode: code, subjectName: name, 
                    attendedClasses: Number(counts.attended), totalClasses: Number(counts.total), 
                    dutyLeaves: Number(counts.leaves), percentage: Number(pctText) || 0 
                  });
                }
              }
            }

            var assignments = [];
            var paEl = document.getElementById("PendingAssignments");
            if (paEl) {
              var aRows = paEl.querySelectorAll(".mycoursesdiv");
              for (var i = 0; i < aRows.length; i++) {
                var row = aRows[i];
                var cols = row.querySelectorAll("div[class*='col']");
                var code = cols.length > 0 ? cols[0].innerText.trim() : "";
                var pTag = row.querySelector("p.font-weight-medium");
                var detail = pTag ? pTag.innerText : "";
                var ldM = detail.match(/Last\\s*Date\\s*:\\s*([0-9\\-\\/]+)/i);
                if (code && code.length > 1) {
                  assignments.push({ 
                    id: Math.random().toString(), courseCode: code, 
                    type: detail.replace(/Course\\s*:\\s*/i, "").trim(), lastDate: ldM ? ldM[1] : "" 
                  });
                }
              }
            }

            var announc = [];
            var annContainer = document.querySelector(".TodayAnnouncements");
            if (annContainer) {
              var annRows = annContainer.querySelectorAll(".row");
              for (var i = 0; i < annRows.length; i++) {
                var row = annRows[i];
                var subjEl = row.querySelector(".announcement-subject");
                var dateEl = row.querySelector(".announcement-date");
                if (subjEl) {
                  announc.push({ 
                    id: Math.random().toString(), title: subjEl.innerText.trim(), 
                    content: subjEl.innerText.trim(), date: dateEl ? dateEl.innerText.trim() : "Today" 
                  });
                }
              }
            }

            var messages = [];
            // Try original explicit IDs from Git history first
            var msgContainer = document.getElementById("MyMessage") || document.getElementById("PersonalMessages") || document.getElementById("MyMessages") || document.querySelector(".PersonalMessages") || document.querySelector(".MyMessages");
            
            // Smart discovery if IDs fail
            if (!msgContainer) {
              var headers = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,span,b,p'));
              var msgHeader = headers.find(function(el) { 
                var txt = el.innerText.trim();
                return txt === "My Messages" || txt === "Personal Messages" || (txt.includes("My Messages") && el.children.length === 0);
              });
              if (msgHeader) {
                msgContainer = msgHeader.closest('.card, .box, .panel, div[class*="container"]') || msgHeader.parentElement;
                log("SCRAPER DEBUG: Smart Discovery found message header, using container: " + msgContainer.tagName);
              }
            }

            if (msgContainer) {
              // Extract from list items or rows (Original used .mycoursesdiv)
              var msgRows = msgContainer.querySelectorAll(".mycoursesdiv, li, .row, div[class*='item']");
              for (var i = 0; i < msgRows.length; i++) {
                var row = msgRows[i];
                // Ignore the header itself
                if (row.innerText.includes("My Messages") && row.querySelectorAll('li, .row').length > 0) continue;
                
                var subjEl = row.querySelector(".right-arrow") || row.querySelector(".font-weight-medium") || row.querySelector("b") || row.querySelector("strong") || row.querySelector(".announcement-subject");
                var dateEl = row.querySelector(".announcement-date") || row.querySelector("span.text-muted") || row.querySelector(".date") || row.querySelector("small");
                
                if (subjEl && subjEl.innerText.trim().length > 2) {
                  var fullText = row.innerText.trim();
                  messages.push({ 
                    id: Math.random().toString(), 
                    title: subjEl.innerText.trim().substring(0, 100).split('-')[0].trim(), 
                    content: fullText, 
                    date: dateEl ? dateEl.innerText.trim() : "Recently" 
                  });
                } else if (row.innerText.trim().length > 5) {
                  // Fallback for simple rows
                  var t = row.innerText.trim();
                  messages.push({
                    id: Math.random().toString(),
                    title: t.substring(0, 60),
                    content: t,
                    date: "Recently"
                  });
                }
              }
            }
            // Filter out duplicates and empty entries
            messages = messages.filter(function(m, index, self) {
              return m.title.length > 1 && self.findIndex(function(t) { return t.title === m.title; }) === index;
            });
            log("SCRAPER DEBUG: Found " + messages.length + " personal messages");

            var mkLink = "";
            var exLink = "";
            var links = document.querySelectorAll("a");
            for(var i=0; i<links.length; i++) {
              var href = links[i].href;
              if(href.includes("Student-MakeupAdjustment")) mkLink = href;
              if(href.includes("seatingplan") || href.includes("conduct") || href.includes("datesheet")) exLink = href;
            }

            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: "DASHBOARD_DATA",
              payload: { 
                profile: prof, overallAttendance: qA, cgpa: qC, fee: fV, 
                attendance: att, assignments: assignments, announcements: announc,
                messages: messages,
                makeupUrl: mkLink, examUrl: exLink, results: resList || []
              }
            }));
          } catch(e) { log("Finalize Error: " + e.toString()); }
        }

        startScrape();
      } catch(e) { log("Main Error: " + e.toString()); }
    }
  } catch(e) { log("Outer Error: " + e.toString()); }
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
      if (tryScrape() || attempts > 8) {
        clearInterval(interval);
        // If still no booking after 10 attempts, send the "None" signal
        if (!booking) {
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ROOM_BOOKING_DATA', payload: null }));
        }
      }
    }, 500);
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

      if ((t1 && t2) || t_attempts >= 10) {
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
    }, 300);
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
      
      if (table || m_attempts >= 12) {
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
    }, 500);
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
      
      if (cards.length > 0 || e_attempts >= 12) {
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
    }, 500);
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: "Exams Card Scraper: " + e.toString() }));
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
    }
  }, [isAuthenticated]);

  const isProcessingPhase = useRef(false);

  const isFullyDone = useRef(false);
  const isRetrying = useRef(false);
  const retriedSections = useRef<Set<string>>(new Set());

  // Selective retry: only re-fetch specific pages that returned empty data
  const runSelectiveRetry = (currentData: ScrapedData) => {
    if (isRetrying.current) return;
    
    const missing: string[] = [];
    
    if ((!currentData.timetable || Object.keys(currentData.timetable).length === 0) && !retriedSections.current.has('timetable')) {
      missing.push('timetable');
    }
    if ((!currentData.attendance || currentData.attendance.length === 0) && !retriedSections.current.has('dashboard')) {
      missing.push('dashboard');
    }
    if ((!currentData.results || currentData.results.length === 0) && !retriedSections.current.has('dashboard')) {
      missing.push('dashboard');
    }
    if ((currentData.cgpa === '--' || !currentData.cgpa) && !retriedSections.current.has('dashboard')) {
      missing.push('dashboard');
    }
    if (currentData.examUrl && (!currentData.exams || currentData.exams.length === 0) && !retriedSections.current.has('exams')) {
      missing.push('exams');
    }
    if (currentData.makeupUrl && (!currentData.makeupClasses || currentData.makeupClasses.length === 0) && !retriedSections.current.has('makeup')) {
      missing.push('makeup');
    }
    if (!currentData.roomBooking && !retriedSections.current.has('roomBooking')) {
      missing.push('roomBooking');
    }
    
    // Deduplicate
    const unique = [...new Set(missing)];
    
    if (unique.length === 0) {
      console.log('SELECTIVE RETRY: All data sections populated, no retry needed.');
      return;
    }
    
    console.log('SELECTIVE RETRY: Missing sections:', unique.join(', '));
    isRetrying.current = true;
    
    // Reset only the specific dedup guards for missing sections
    if (unique.includes('dashboard')) didDashboard.current = false;
    if (unique.includes('timetable')) didTimetable.current = false;
    if (unique.includes('makeup')) didMakeup.current = false;
    // roomBooking and exams don't have dedicated 'did' guards in handleLoadEnd yet, they rely on URL matches
    
    // Navigate to the first missing page (the chain will continue from there)
    const firstMissing = unique[0];
    retriedSections.current.add(firstMissing); // Mark as retried to avoid infinite loops
    
    setTimeout(() => {
      if (firstMissing === 'dashboard') {
        console.log('SELECTIVE RETRY: Re-fetching dashboard data...');
        webViewRef.current?.injectJavaScript(`window.location.href = 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'; true;`);
      } else if (firstMissing === 'makeup' && currentData.makeupUrl) {
        console.log('SELECTIVE RETRY: Re-fetching makeup data...');
        webViewRef.current?.injectJavaScript(`window.location.href = '${currentData.makeupUrl}'; true;`);
      } else if (firstMissing === 'exams' && currentData.examUrl) {
        console.log('SELECTIVE RETRY: Re-fetching exams data...');
        webViewRef.current?.injectJavaScript(`window.location.href = '${currentData.examUrl}'; true;`);
      } else if (firstMissing === 'roomBooking') {
        console.log('SELECTIVE RETRY: Re-fetching room booking data...');
        webViewRef.current?.injectJavaScript(`window.location.href = 'https://ums.lpu.in/lpuums/frmRoomBooking.aspx'; true;`);
      } else if (firstMissing === 'timetable') {
        console.log('SELECTIVE RETRY: Re-fetching timetable data...');
        webViewRef.current?.injectJavaScript(`window.location.href = 'https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx'; true;`);
      }
      
      // Auto-reset retry flag after 12s so it doesn't block forever
      setTimeout(() => { isRetrying.current = false; }, 12000);
    }, 1500);
  };

  const refreshData = (webUsername?: string) => {
    console.log('REFRESH DATA START', { webUsername });
    // MASTER KEY: On web, we allow refresh even if auth state is still propagating
    if (isAuthenticated || Platform.OS === 'web') {
      if (Platform.OS === 'web') {
        // WEB SYNC: Instant activation for PWA
        setIsScraping(true);
        const finalUsername = webUsername || authData?.username || 'Student';
        console.log('Web Sync: Injecting data for', finalUsername);
        
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
      isProcessingPhase.current = false;
      isFullyDone.current = false;
      retriedSections.current.clear(); // Reset retries on full refresh
      setIsScraping(true);

      // Safety watchdog: force stop loading after 15s
      setTimeout(() => {
        setIsScraping(false);
      }, 20000);

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
    
    // Script injection is handled by the guarded block below (with dedup refs)

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

    // Allow selective retry to pass through even after initial scrape is done
    if (isFullyDone.current && !isRetrying.current) return;

    if (url.includes('StudentDashboard.aspx') && !didDashboard.current) {
      console.log('INJECTING DASHBOARD_SCRIPT...');
      didDashboard.current = true;
      isProcessingPhase.current = true;
      setIsScraping(true);
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(DASHBOARD_SCRIPT);
      }, 400);
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
    } else if (url.includes('frmRoomBooking.aspx')) {
      console.log('INJECTING ROOM_BOOKING_SCRIPT...');
      webViewRef.current?.injectJavaScript(ROOM_BOOKING_SCRIPT);
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
        
        // STOP blocking loading here so user can see dashboard immediately
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
          
          // Trigger Makeup Scraping if URL found (Continues in background)
          if (p.makeupUrl) {
            webViewRef.current?.injectJavaScript(`window.location.href = '${p.makeupUrl}'; true;`);
          } else if (p.examUrl) {
            webViewRef.current?.injectJavaScript(`window.location.href = '${p.examUrl}'; true;`);
          } else {
            webViewRef.current?.injectJavaScript(`window.location.href = 'https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx'; true;`);
          }

          merged.lastUpdated = new Date().toISOString();
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
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
          
          // After main chain completes, check for missing data and selectively retry
          setTimeout(() => {
            runSelectiveRetry(merged);
          }, 2000);
          
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

  // Session Keep-Alive Heartbeat (lightweight XHR ping instead of full page reload)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const heartbeat = setInterval(() => {
      if (!isScraping) {
        console.log('SESSION HEARTBEAT: Sending lightweight ping...');
        webViewRef.current?.injectJavaScript(`
          (function() {
            try {
              var xhr = new XMLHttpRequest();
              xhr.open('GET', 'https://ums.lpu.in/lpuums/StudentDashboard.aspx', true);
              xhr.timeout = 5000;
              xhr.send();
            } catch(e) {}
          })(); true;
        `);
      }
    }, 5 * 60 * 1000); // Every 5 minutes (was 4 min with full reload)

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
