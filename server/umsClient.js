const { JSDOM } = require('jsdom');
const fs = require('fs');
const crypto = require('crypto');

const DEBUG_LOG = require('path').resolve(__dirname, '..', 'debug-sync-api.log');
function appendDebug(entry) {
  try { fs.appendFileSync(DEBUG_LOG, `${new Date().toISOString()} ${entry}\n`); } catch {}
}

const UMS_ORIGIN = 'https://ums.lpu.in';
const LOGIN_URL = `${UMS_ORIGIN}/lpuums/LoginNew.aspx`;
const DASHBOARD_URL = `${UMS_ORIGIN}/lpuums/StudentDashboard.aspx`;
const TIMETABLE_URL = `${UMS_ORIGIN}/lpuums/Reports/frmStudentTimeTable.aspx`;
const RESULTS_URL = `${UMS_ORIGIN}/lpuums/Reports/frmStudentGradeCard.aspx`;
const FEE_URL = `${UMS_ORIGIN}/lpuums/Reports/frmStatementofAccounts.aspx`;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  add(setCookieHeaders = []) {
    for (const header of setCookieHeaders) {
      const pair = String(header).split(';')[0];
      const index = pair.indexOf('=');
      if (index > 0) {
        this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
      }
    }
  }

  header() {
    return Array.from(this.cookies.entries()).map(([key, value]) => `${key}=${value}`).join('; ');
  }

  toJSON() {
    return Array.from(this.cookies.entries());
  }

  static fromJSON(entries = []) {
    const jar = new CookieJar();
    for (const [key, value] of entries) {
      jar.cookies.set(key, value);
    }
    return jar;
  }
}

function getSetCookie(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }

  const single = response.headers.get('set-cookie');
  if (!single) return [];
  return single.split(/,(?=\s*[^;,=\s]+\s*=)/).map((value) => value.trim()).filter(Boolean);
}

async function request(jar, url, options = {}) {
  const response = await fetch(url, {
    redirect: 'manual',
    ...options,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Cookie': jar.header(),
      ...(options.headers || {})
    }
  });

  jar.add(getSetCookie(response));

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get('location');
    if (location) {
      return request(jar, new URL(location, url).href, {
        method: 'GET',
        headers: options.headers
      });
    }
  }

  return response;
}

async function postUsernameChange(jar, loginDocument, username) {
  const payload = new URLSearchParams(collectFormState(loginDocument, { includeSelects: false }));
  payload.set('__EVENTTARGET', 'txtU');
  payload.set('__EVENTARGUMENT', '');
  payload.set('txtU', username);

  if (process.env.DEBUG_UMS === '1') {
    fs.writeFileSync('debug-ums-postback-payload.txt', payload.toString());
  }

  const response = await request(jar, LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': LOGIN_URL,
      'Origin': UMS_ORIGIN
    },
    body: payload.toString()
  });

  return new JSDOM(await response.text(), { url: LOGIN_URL }).window.document;
}

function text(document, selector) {
  return document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function absolute(url, base) {
  try {
    return new URL(url, base).href;
  } catch {
    return '';
  }
}

function encodeChallenge(challenge) {
  return Buffer.from(JSON.stringify(challenge), 'utf8').toString('base64url');
}

function decodeChallenge(token) {
  try {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function collectFormState(document, options = {}) {
  const { includeSelects = false } = options;
  const payload = new URLSearchParams();
  const inputs = document.querySelectorAll('input');

  inputs.forEach((input) => {
    const name = input.getAttribute('name');
    if (!name) return;
    const type = (input.getAttribute('type') || '').toLowerCase();
    if ((type === 'checkbox' || type === 'radio') && !input.hasAttribute('checked')) return;
    payload.set(name, input.getAttribute('value') || '');
  });

  if (includeSelects) {
    const selects = document.querySelectorAll('select');
    selects.forEach((select) => {
      const name = select.getAttribute('name');
      if (!name) return;
      const selected = select.querySelector('option[selected]') || select.querySelector('option');
      payload.set(name, selected?.getAttribute('value') || selected?.textContent?.trim() || '');
    });

    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((textarea) => {
      const name = textarea.getAttribute('name');
      if (!name) return;
      payload.set(name, textarea.textContent || '');
    });
  }

  return Object.fromEntries(payload.entries());
}

function collectFormPayload(fieldNames, basePayload, username, password, captchaCode) {
  const payload = new URLSearchParams(basePayload || {});

  payload.set('__LASTFOCUS', '');
  payload.set('__EVENTTARGET', '');
  payload.set('__EVENTARGUMENT', '');
  payload.set(fieldNames.user || 'txtUserName', username);
  payload.set(fieldNames.password || 'txtPassword', password);
  if (fieldNames.captcha) {
    payload.set(fieldNames.captcha, captchaCode || '');
  }
  if (fieldNames.loginButton) {
    payload.set(fieldNames.loginButton, fieldNames.loginValue || 'Login');
  }

  return payload;
}

function resolveBotDetectKeys(basePayload = {}) {
  const keys = Object.keys(basePayload);
  return {
    hsKey: keys.find((key) => /^BDC_Hs_/i.test(key)) || '',
    spKey: keys.find((key) => /^BDC_SP_/i.test(key)) || '',
    vcidKey: keys.find((key) => /^BDC_VCID_/i.test(key)) || ''
  };
}

function deriveBotDetectPosition(basePayload = {}) {
  const { hsKey, spKey, vcidKey } = resolveBotDetectKeys(basePayload);
  if (!hsKey || !spKey || !vcidKey) return null;

  const hs = String(basePayload[hsKey] || '').trim().toLowerCase();
  const vcid = String(basePayload[vcidKey] || '').trim();
  const sp = Number(String(basePayload[spKey] || '').trim());
  if (!hs || !vcid || !Number.isFinite(sp)) return null;

  const SEARCH_LIMIT = 2_000_000;
  const start = Math.max(0, Math.floor(sp));
  const end = start + SEARCH_LIMIT;

  for (let pos = start; pos <= end; pos += 1) {
    const digest = crypto.createHash('sha1').update(String(pos) + vcid, 'utf8').digest('hex');
    if (digest === hs) {
      return pos;
    }
  }

  return null;
}

function applyBotDetectCaseMask(input, position) {
  const normalized = String(input || '');
  if (!normalized) return normalized;
  if (!Number.isFinite(position)) return normalized;

  const maskBits = (((position % 65533) + 1) >>> 0).toString(2);
  const chars = normalized.split('');
  let bitIndex = maskBits.length - 1;
  let output = '';

  for (let index = chars.length - 1; index >= 0; index -= 1) {
    const bit = bitIndex >= 0 ? maskBits[bitIndex] : undefined;
    const current = chars[index];
    output = (bit === '1' ? current.toUpperCase() : current.toLowerCase()) + output;
    bitIndex -= 1;
  }

  return output;
}

function normalizeCaptchaForBotDetect(basePayload = {}, captchaCode = '') {
  const raw = String(captchaCode || '').trim();
  if (!raw) return raw;

  const position = deriveBotDetectPosition(basePayload);
  return applyBotDetectCaseMask(raw, position);
}

async function refreshBotDetectPayload(jar, captchaUrl, basePayload) {
  const hsKey = Object.keys(basePayload || {}).find((key) => /^BDC_Hs_/i.test(key));
  const spKey = Object.keys(basePayload || {}).find((key) => /^BDC_SP_/i.test(key));
  if (!hsKey || !spKey) return;

  const runtimeUrl = captchaUrl.replace('get=image', 'get=p');
  if (runtimeUrl === captchaUrl) return;

  try {
    const runtimeResponse = await request(jar, runtimeUrl, {
      headers: {
        'Accept': 'application/json,text/plain,*/*',
        'Referer': LOGIN_URL
      }
    });
    const runtimeText = await runtimeResponse.text();
    if (!runtimeResponse.ok || !runtimeText) return;

    const runtimeState = JSON.parse(runtimeText);
    if (typeof runtimeState?.hs === 'string' && runtimeState.hs) {
      basePayload[hsKey] = runtimeState.hs;
    }
    if (
      typeof runtimeState?.sp === 'string' ||
      typeof runtimeState?.sp === 'number'
    ) {
      basePayload[spKey] = String(runtimeState.sp);
    }
  } catch {
    // Fallback to the original hidden values if runtime state refresh fails.
  }
}

async function createLoginChallenge(username = '') {
  if (!username) {
    const error = new Error('Registration number is required before loading captcha.');
    error.statusCode = 400;
    throw error;
  }

  const jar = new CookieJar();
  let loginPage;
  try {
    loginPage = await request(jar, LOGIN_URL);
  } catch (error) {
    const syncError = new Error('Cannot reach UMS from the sync server. Check internet access, hosting firewall, or UMS availability.');
    syncError.statusCode = 502;
    throw syncError;
  }

  const loginHtml = await loginPage.text();
  let loginDocument = new JSDOM(loginHtml, { url: LOGIN_URL }).window.document;
  loginDocument = await postUsernameChange(jar, loginDocument, username);
  const captchaImage = loginDocument.querySelector('#c_loginnew_examplecaptcha_CaptchaImage, img[alt*="CAPTCHA" i]');

  if (!captchaImage) {
    if (process.env.DEBUG_UMS === '1') {
      fs.writeFileSync('debug-ums-challenge.html', loginDocument.documentElement.outerHTML);
    }
    const error = new Error('UMS captcha image was not found. The portal login page may have changed.');
    error.statusCode = 502;
    throw error;
  }

  const captchaUrl = absolute(captchaImage.getAttribute('src') || '', LOGIN_URL);
  const imageResponse = await request(jar, captchaUrl, {
    headers: {
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Referer': LOGIN_URL
    }
  });
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const contentType = imageResponse.headers.get('content-type') || 'image/png';
  const form = loginDocument.querySelector('form');
  const action = form?.getAttribute('action') ? absolute(form.getAttribute('action'), LOGIN_URL) : LOGIN_URL;
  const basePayload = collectFormState(loginDocument, { includeSelects: true });
  await refreshBotDetectPayload(jar, captchaUrl, basePayload);
  const userField = loginDocument.querySelector('#txtUserName, input[name="txtUserName"], #txtU, input[name="txtU"]');
  const passField = loginDocument.querySelector('#txtPassword, input[name="txtPassword"], input[type="password"]');
  const captchaField = loginDocument.querySelector('#CaptchaCodeTextBox, input[name="CaptchaCodeTextBox"]');
  const loginButton = loginDocument.querySelector('#btnLogin, input[name="btnLogin"], button[name="btnLogin"], input[type="submit"]');

  const token = encodeChallenge({
    cookies: jar.toJSON(),
    action,
    basePayload,
    fieldNames: {
      user: userField?.getAttribute('name') || 'txtUserName',
      password: passField?.getAttribute('name') || 'txtPassword',
      captcha: captchaField?.getAttribute('name') || 'CaptchaCodeTextBox',
      loginButton: loginButton?.getAttribute('name') || '',
      loginValue: loginButton?.getAttribute('value') || 'Login'
    },
    username,
    createdAt: Date.now()
  });

  return {
    challengeId: token,
    captchaImage: `data:${contentType};base64,${imageBuffer.toString('base64')}`
  };
}

function parseDashboard(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const bodyText = (document.body?.textContent || '').replace(/\s+/g, ' ').trim();
  const profileNode = document.querySelector('#p_info .min-width-zero.text-right, .min-width-zero.text-right');
  const profileText = text(document, '#p_info') || profileNode?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const regnoText = text(document, '#regno');
  const profileSource = `${profileText} ${regnoText} ${bodyText}`.trim();

  let name = text(document, '#p_name')
    || profileNode?.querySelector('h5, h4, strong, b')?.textContent?.replace(/\s+/g, ' ').trim()
    || '';
  if (!name) {
    name = profileSource.match(/^\s*([^|:\n]{2,100}?)\s+VID\s*:/i)?.[1]?.trim() || '';
  }
  if (!name) {
    name = profileSource.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s+VID\s*:\s*\d+/)?.[1] || '';
  }
  if (!name) {
    name = 'LPU Student';
  }

  const vid = profileSource.match(/VID\s*:\s*([0-9]+)/i)?.[1] || '';
  const section = profileSource.match(/Section\s*:\s*([A-Z0-9-]+)/i)?.[1] || '';

  let program = text(document, '#progname')
    || profileNode?.querySelector('#progname, span[id*="prog"]')?.textContent?.replace(/\s+/g, ' ').trim()
    || profileText.match(/Program\s*:\s*([^|\n]+)/i)?.[1]?.trim()
    || '';
  if (!program) {
    program = profileText.match(/Section\s*:\s*[A-Z0-9-]+\s*(.+)$/i)?.[1]?.trim() || '';
  }
  if (program && /change password|wifi password|profile update|sign out/i.test(program)) {
    program = '';
  }

  const avatarUrl = absolute(
    document.querySelector('#p_picture, img.user-profile-image, img[alt="User"]')?.getAttribute('src') || '',
    DASHBOARD_URL
  );

  const cgpaText = text(document, '#cgpa');
  const attText = text(document, '#AttPercent');
  const feeText = text(document, '#feebalance');
  const cgpa = cgpaText.match(/([0-9]+(?:\.[0-9]+)?)/)?.[1]
    || bodyText.match(/\bCGPA\b[^0-9]{0,12}([0-9]+(?:\.[0-9]+)?)/i)?.[1]
    || '--';
  const overallAttendance = attText.match(/([0-9]+(?:\.[0-9]+)?)/)?.[1]
    || bodyText.match(/\bATTENDANCE\b[^0-9]{0,12}([0-9]+(?:\.[0-9]+)?)/i)?.[1]
    || '0.0';
  const fee = feeText.match(/([0-9][0-9,]*)/)?.[1]
    || bodyText.match(/\bFee\b[^0-9]{0,60}([0-9][0-9,]*)\s*\/-/i)?.[1]
    || '--';
  const attendance = [];

  document.querySelectorAll('#CoursesList .mycoursesdiv, #CoursesList .row.mycoursesdiv').forEach((row) => {
    const primaryLine = text(row, 'p.font-weight-medium');
    const subjectCode = (
      text(row, 'p.font-weight-medium b').replace(/\s*:$/, '')
      || primaryLine.match(/\b([A-Z]{2,}\d{2,}[A-Z0-9]*)\b/)?.[1]
      || ''
    ).trim();
    let subjectName = primaryLine
      .split(':')
      .slice(1)
      .join(':')
      .replace(/\s*Term\s*:.*$/i, '')
      .trim();
    if (!subjectName) {
      subjectName = primaryLine.replace(/^.*?:\s*/, '').trim();
    }
    const percentage = Number((text(row, '.c100 span') || '').replace('%', '')) || 0;
    if (subjectCode) {
      attendance.push({
        subjectCode,
        subjectName,
        attendedClasses: 0,
        totalClasses: 0,
        dutyLeaves: 0,
        percentage
      });
    }
  });

  const assignments = Array.from(document.querySelectorAll('#PendingAssignments .mycoursesdiv')).map((row, index) => {
    const detail = text(row, 'p.font-weight-medium');
    return {
      id: String(index + 1),
      courseCode: text(row, '.right-arrow') || row.querySelector('div[class*="col"]')?.textContent?.trim() || '',
      type: detail,
      lastDate: detail.match(/Last\s*Date\s*:\s*([0-9-/]+)/i)?.[1] || ''
    };
  }).filter((item) => item.courseCode || item.type);

  const links = Array.from(document.querySelectorAll('a')).map((link) => absolute(link.getAttribute('href') || '', DASHBOARD_URL));
  const makeupUrl = links.find((href) => href.includes('Student-MakeupAdjustment')) || '';
  const examUrl = links.find((href) => href.includes('seatingplan') || href.includes('conduct') || href.includes('datesheet')) || '';

  return {
    profile: { name, vid, section, program, avatarUrl },
    cgpa,
    overallAttendance,
    fee,
    attendance,
    assignments,
    announcements: [],
    messages: [],
    results: [],
    makeupUrl,
    examUrl
  };
}

function parseResults(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const results = [];

  // Each semester is usually a table or a section with a heading
  const tables = Array.from(document.querySelectorAll('table'));
  const semesterMap = new Map();

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length < 2) continue;

    // Look for header row with 'Course Code' or 'Grade'
    const headerRow = rows.find(r => /course\s*code|grade|credit/i.test(r.textContent || ''));
    if (!headerRow) continue;

    const headers = Array.from(headerRow.querySelectorAll('th,td')).map(c => c.textContent.trim().toLowerCase());
    const codeIdx = headers.findIndex(h => /course.*code|code/i.test(h));
    const titleIdx = headers.findIndex(h => /title|name/i.test(h));
    const gradeIdx = headers.findIndex(h => /\bgrade\b/i.test(h));
    const creditIdx = headers.findIndex(h => /credit/i.test(h));
    const gpIdx = headers.findIndex(h => /gp|grade.*point/i.test(h));

    if (codeIdx === -1 || gradeIdx === -1) continue;

    // Try to find semester label from nearby heading
    let semLabel = 'Results';
    const prevEl = table.previousElementSibling;
    if (prevEl) semLabel = prevEl.textContent.replace(/\s+/g, ' ').trim().substring(0, 40) || semLabel;

    const subjects = [];
    for (const row of rows.slice(rows.indexOf(headerRow) + 1)) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 3) continue;
      const code = cells[codeIdx]?.textContent.trim();
      const grade = cells[gradeIdx]?.textContent.trim();
      if (!code || !grade || /total|sgpa|cgpa/i.test(code)) {
        // Capture SGPA/CGPA summary rows
        const rowText = row.textContent.replace(/\s+/g,' ').trim();
        const sgpaMatch = rowText.match(/SGPA[^0-9]*([0-9]+(?:\.[0-9]+)?)/i);
        if (sgpaMatch) semLabel += ` (SGPA: ${sgpaMatch[1]})`;
        continue;
      }
      subjects.push({
        code,
        title: cells[titleIdx]?.textContent.trim() || code,
        grade,
        credits: cells[creditIdx]?.textContent.trim() || '',
        gradePoints: cells[gpIdx]?.textContent.trim() || ''
      });
    }

    if (subjects.length > 0) {
      if (!semesterMap.has(semLabel)) semesterMap.set(semLabel, []);
      semesterMap.get(semLabel).push(...subjects);
    }
  }

  for (const [semester, subjects] of semesterMap) {
    results.push({ semester, subjects });
  }

  return results;
}

function parseTimetable(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const schedule = {};
  const courses = [];
  const tables = Array.from(document.querySelectorAll('table'));
  const timetable = tables.find((table) => table.textContent.includes('Timing') && table.textContent.includes('Monday'));
  const courseTable = tables.find((table) => table.textContent.includes('Course Code') && table.textContent.includes('Course Title'));

  if (timetable) {
    const rows = Array.from(timetable.querySelectorAll('tr'));
    const headerIndex = rows.findIndex((row) => row.textContent.includes('Timing'));
    if (headerIndex >= 0) {
      const days = Array.from(rows[headerIndex].querySelectorAll('td')).map((cell) => cell.textContent.trim());
      days.forEach((day) => {
        if (day && day !== 'Timing') schedule[day] = [];
      });
      rows.slice(headerIndex + 1).forEach((row) => {
        const cells = Array.from(row.querySelectorAll('td'));
        let slot = '';
        cells.forEach((cell, index) => {
          const day = days[index];
          const value = cell.textContent.trim();
          if (day === 'Timing') slot = value;
          else if (day && value) schedule[day]?.push({ time: slot, details: value });
        });
      });
    }
  }

  if (courseTable) {
    Array.from(courseTable.querySelectorAll('tr')).forEach((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      const code = cells[1]?.textContent?.trim() || '';
      if (code && code !== 'Course Code') {
        courses.push({
          code,
          type: cells[2]?.textContent?.trim() || '',
          title: cells[3]?.textContent?.trim() || '',
          faculty: cells[8]?.textContent?.trim() || ''
        });
      }
    });
  }

  return { schedule, courses };
}

function safeJsonParse(value) {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function unwrapWebMethodPayload(payload) {
  let value = payload;

  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'd')) {
    value = value.d;
  }

  const parsed = safeJsonParse(value);
  if (parsed !== null) {
    value = parsed;
  }

  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'd')) {
    value = value.d;
    const parsedNested = safeJsonParse(value);
    if (parsedNested !== null) {
      value = parsedNested;
    }
  }

  return value;
}

function toObjectArray(value) {
  const unwrapped = unwrapWebMethodPayload(value);
  if (!unwrapped) return [];

  if (Array.isArray(unwrapped)) {
    return unwrapped.flatMap((item) => {
      const parsed = safeJsonParse(item);
      const normalized = parsed !== null ? parsed : item;
      if (Array.isArray(normalized)) return normalized.filter((x) => x && typeof x === 'object');
      if (normalized && typeof normalized === 'object') return [normalized];
      return [];
    });
  }

  if (unwrapped && typeof unwrapped === 'object') {
    return [unwrapped];
  }

  return [];
}

function toHtmlString(value) {
  const unwrapped = unwrapWebMethodPayload(value);
  if (typeof unwrapped === 'string') return unwrapped;
  if (Array.isArray(unwrapped)) {
    return unwrapped.filter((item) => typeof item === 'string').join(' ');
  }
  return '';
}

async function requestDashboardMethod(jar, methodName, payload = {}) {
  const response = await request(jar, `${DASHBOARD_URL}/${methodName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': DASHBOARD_URL,
      'Origin': UMS_ORIGIN
    },
    body: JSON.stringify(payload || {})
  });

  const raw = await response.text();
  if (!response.ok || !raw) return null;
  const parsed = safeJsonParse(raw);
  return parsed !== null ? parsed : raw;
}

function normalizeSubjectCode(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .split('-')[0]
    .split(':')[0]
    .trim()
    .replace(/[\s:]/g, '')
    .toUpperCase();
}

function parseCoursesHtml(coursesHtml = '') {
  if (!coursesHtml) return [];
  const dom = new JSDOM(`<div id="root">${coursesHtml}</div>`);
  const { document } = dom.window;
  const rows = Array.from(document.querySelectorAll('.mycoursesdiv, .row.mycoursesdiv'));
  const output = [];

  for (const row of rows) {
    const primaryLine = text(row, 'p.font-weight-medium');
    const subjectCode = (
      text(row, 'p.font-weight-medium b').replace(/\s*:$/, '')
      || primaryLine.match(/\b([A-Z]{2,}\d{2,}[A-Z0-9]*)\b/)?.[1]
      || ''
    ).trim();

    let subjectName = primaryLine
      .split(':')
      .slice(1)
      .join(':')
      .replace(/\s*Term\s*:.*$/i, '')
      .trim();

    if (!subjectName) {
      subjectName = primaryLine.replace(/^.*?:\s*/, '').trim();
    }

    const percentageText = text(row, '.c100 span') || text(row, '.per') || '';
    const percentage = Number(percentageText.replace('%', '')) || 0;

    if (subjectCode) {
      output.push({
        subjectCode,
        subjectName,
        attendedClasses: 0,
        totalClasses: 0,
        dutyLeaves: 0,
        percentage
      });
    }
  }

  return output;
}

function parseAttendanceSummaryHtml(summaryHtml = '') {
  if (!summaryHtml) return [];
  const dom = new JSDOM(`<table id="AttSummary">${summaryHtml}</table>`);
  const { document } = dom.window;
  const rows = Array.from(document.querySelectorAll('tr'));
  const output = [];

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 5) continue;

    const subjectText = (cells[0]?.textContent || '').replace(/\s+/g, ' ').trim();
    const code = normalizeSubjectCode(subjectText);
    if (!code) continue;

    const subjectName = subjectText.includes('-')
      ? subjectText.split('-').slice(1).join('-').trim()
      : subjectText;

    output.push({
      subjectCode: code,
      subjectName,
      dutyLeaves: Number((cells[2]?.textContent || '').replace(/[^\d.-]/g, '')) || 0,
      totalClasses: Number((cells[3]?.textContent || '').replace(/[^\d.-]/g, '')) || 0,
      attendedClasses: Number((cells[4]?.textContent || '').replace(/[^\d.-]/g, '')) || 0
    });
  }

  return output;
}

function parseFeeFromHtml(feeHtml = '') {
  if (!feeHtml) return '';
  const dom = new JSDOM(`<div id="fee-root">${feeHtml}</div>`);
  const content = dom.window.document.body.textContent?.replace(/\s+/g, ' ').trim() || '';
  return content.match(/([0-9][0-9,]*)\s*\/-/)?.[1]
    || content.match(/([0-9][0-9,]*)/)?.[1]
    || '';
}

function mergeAttendanceData(courses = [], summaryRows = []) {
  const byCode = new Map();

  for (const course of courses) {
    const code = normalizeSubjectCode(course.subjectCode || '');
    if (!code) continue;
    byCode.set(code, {
      subjectCode: code,
      subjectName: course.subjectName || course.subjectCode || '',
      attendedClasses: Number(course.attendedClasses || 0),
      totalClasses: Number(course.totalClasses || 0),
      dutyLeaves: Number(course.dutyLeaves || 0),
      percentage: Number(course.percentage || 0)
    });
  }

  for (const row of summaryRows) {
    const code = normalizeSubjectCode(row.subjectCode || row.subjectName || '');
    if (!code) continue;
    const current = byCode.get(code) || {
      subjectCode: code,
      subjectName: row.subjectName || row.subjectCode || '',
      attendedClasses: 0,
      totalClasses: 0,
      dutyLeaves: 0,
      percentage: 0
    };

    const attendedClasses = Number(row.attendedClasses || current.attendedClasses || 0);
    const totalClasses = Number(row.totalClasses || current.totalClasses || 0);
    const dutyLeaves = Number(row.dutyLeaves || current.dutyLeaves || 0);
    const percentage = totalClasses > 0
      ? Number((((attendedClasses + dutyLeaves) / totalClasses) * 100).toFixed(2))
      : Number(current.percentage || 0);

    byCode.set(code, {
      ...current,
      subjectName: row.subjectName || current.subjectName,
      attendedClasses,
      totalClasses,
      dutyLeaves,
      percentage
    });
  }

  return Array.from(byCode.values());
}

function extractLoginFailure(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const fallbackMessages = [];
  const candidates = [
    '#ValidationSummary1',
    '.validation-summary-errors',
    '.field-validation-error',
    '#lblmsg',
    '#lblMessage',
    '#lblError',
    '.swal2-html-container',
    '.alert',
    '.error',
    '[class*="error"]',
    '[id*="error"]',
    '[id*="Error"]',
    '[id*="msg"]',
    '[id*="Msg"]'
  ];

  for (const selector of candidates) {
    const value = text(document, selector);
    if (!value || /javascript of your browser/i.test(value) || isIgnorableNoticeText(value)) {
      continue;
    }
    if (isFailureText(value)) {
      return value;
    }
    fallbackMessages.push(value);
  }

  const bodyText = document.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const scriptText = Array.from(document.querySelectorAll('script')).map((script) => script.textContent || '').join('\n');
  const alertPatterns = [
    /DisplayAlert\((["'])([\s\S]{3,250}?)\1\)/ig,
    /alert\((["'])([\s\S]{3,250}?)\1\)/ig,
    /Swal\.fire\(\{[\s\S]{0,1200}?html\s*:\s*(["'])([\s\S]{3,250}?)\1/ig
  ];

  for (const pattern of alertPatterns) {
    let match;
    while ((match = pattern.exec(scriptText)) !== null) {
      const raw = match[2] || '';
      const alertText = raw.replace(/\\r|\\n|<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!alertText || isIgnorableNoticeText(alertText)) continue;
      if (isFailureText(alertText)) return alertText;
      fallbackMessages.push(alertText);
    }
  }

  const snippets = bodyText.match(/.{0,80}(captcha|invalid|incorrect|blocked|otp|verification|try again|failed|not\s+valid|not\s+match).{0,140}/ig);
  if (snippets?.[0]) {
    return snippets[0].replace(/\s+/g, ' ').trim();
  }

  return fallbackMessages.find((value) => /login|credential|captcha|invalid|incorrect|error|failed|blocked|try again|security|verification|not\s+valid|not\s+match/i.test(value)) || '';
}

function isFailureText(value) {
  return /invalid|incorrect|wrong|failed|not\s+(?:valid|match|established)|captcha\s+(?:verification\s+)?failed|try\s+again|blocked|expired|otp|security|verification/i.test(value || '');
}

function isIgnorableNoticeText(value) {
  return /in case of any query\/issue related to ["']?mentorship["']?,?\s*click here|no quick link available|go to search menu to add quick link|quick links dashboard ums home lpu touch/i.test(value || '');
}

function hasLoginFailure(html) {
  if (looksAuthenticated(html)) return false;

  const failure = extractLoginFailure(html);
  if (!(failure && isFailureText(failure))) return false;

  // Guard against dashboard/scripts text being misread as login failure.
  if (!looksLikeLoginPage(html)) {
    if (/quick links|student services|important links|dashboard|ums home|lpu touch|function\s+[a-z0-9_]+\s*\(/i.test(failure)) {
      return false;
    }
  }

  return true;
}

function looksAuthenticated(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  const hasDashboardMarkers = Boolean(
    document.querySelector(
      '#p_name, #p_info, #p_picture, #regno, #progname, #CoursesList, #AttPercent, #cgpa, #PendingAssignments, #feebalance, #ProfileLink'
    )
  );
  const hasLoginMarkers = Boolean(
    document.querySelector('#txtU, input[name="txtU"], #txtUserName, input[name="txtUserName"], #CaptchaCodeTextBox, input[name="CaptchaCodeTextBox"]')
  );
  const title = (document.querySelector('title')?.textContent || '').toLowerCase();
  const hasDashboardTitle = title.includes('student dashboard');
  const hasDashboardUrlHint = /StudentDashboard\.aspx/i.test(html);

  if (hasDashboardMarkers || hasDashboardTitle) return true;
  if (hasDashboardUrlHint && !hasLoginMarkers) return true;
  return false;
}

function looksLikeLoginPage(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  const hasUserField = Boolean(document.querySelector('#txtU, input[name="txtU"], #txtUserName, input[name="txtUserName"]'));
  const hasCaptchaField = Boolean(document.querySelector('#CaptchaCodeTextBox, input[name="CaptchaCodeTextBox"], .BDC_CaptchaDiv'));
  const hasPasswordField = Boolean(
    document.querySelector('#txtPassword, input[name="txtPassword"], input[name^="TxtpwdAutoId_"], input[type="password"]')
  );

  // Keep this strict: all core login controls must be present.
  return hasUserField && hasCaptchaField && hasPasswordField;
}

function mergeTimetable(data, timetable) {
  const courseMap = {};
  for (const course of timetable.courses || []) {
    if (course.code) courseMap[course.code] = course;
  }

  const structuredSchedule = {};
  Object.keys(timetable.schedule || {}).forEach((day) => {
    structuredSchedule[day] = timetable.schedule[day].map((item) => {
      const details = item.details || '';
      const subjectCode = details.match(/C:([A-Z0-9]+)/)?.[1] || '';
      const room = details.match(/R:\s*([A-Z0-9-]+)/)?.[1] || 'TBA';
      const type = details.match(/^([^/]+)/)?.[1]?.trim() || 'Lecture';
      const course = courseMap[subjectCode];
      return {
        time: item.time,
        subjectCode,
        subject: course?.title || subjectCode || type,
        room,
        type,
        faculty: course?.faculty || ''
      };
    });
  });

  return {
    ...data,
    timetable: structuredSchedule,
    attendance: (data.attendance || []).map((item) => ({
      ...item,
      subjectName: courseMap[item.subjectCode]?.title || item.subjectName,
      faculty: courseMap[item.subjectCode]?.faculty || ''
    }))
  };
}

async function syncUms({ username, password, challengeId, captchaCode }) {
  if (!username || !password || !captchaCode) {
    const error = new Error('Registration number, password, and captcha are required.');
    error.statusCode = 400;
    throw error;
  }

  const challenge = decodeChallenge(challengeId);
  if (!challenge || Date.now() - Number(challenge.createdAt || 0) > CHALLENGE_TTL_MS) {
    const error = new Error('Captcha expired. Refresh the captcha and try again.');
    error.statusCode = 400;
    throw error;
  }
  if (challenge.username && String(challenge.username) !== String(username)) {
    const error = new Error('Registration number changed after captcha was loaded. Refresh the captcha and try again.');
    error.statusCode = 400;
    throw error;
  }

  const jar = CookieJar.fromJSON(challenge.cookies);
  const normalizedCaptcha = normalizeCaptchaForBotDetect(challenge.basePayload || {}, captchaCode);
  const payload = collectFormPayload(
    challenge.fieldNames || {},
    challenge.basePayload,
    username,
    password,
    normalizedCaptcha
  );

  const loginResponse = await request(jar, challenge.action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': LOGIN_URL,
      'Origin': UMS_ORIGIN
    },
    body: payload.toString()
  });

  const loginResultHtml = await loginResponse.text();
  if (!looksAuthenticated(loginResultHtml) && hasLoginFailure(loginResultHtml)) {
    const reason = extractLoginFailure(loginResultHtml);
    const error = new Error(reason || 'UMS rejected the login. Check credentials or complete any captcha/security step in the official portal.');
    error.statusCode = 401;
    throw error;
  }

  let dashboardHtml = loginResultHtml;
  try {
    // Always request the real dashboard page after login. This avoids parsing
    // intermediate/login postback HTML that can contain misleading script text.
    const dashboardResponse = await request(jar, DASHBOARD_URL, { headers: { Referer: LOGIN_URL } });
    const fetchedDashboardHtml = await dashboardResponse.text();
    if (fetchedDashboardHtml) {
      dashboardHtml = fetchedDashboardHtml;
    }
  } catch {
    // Fall back to the direct login response if dashboard fetch temporarily fails.
  }

  if (looksLikeLoginPage(dashboardHtml)) {
    const reason = extractLoginFailure(dashboardHtml);
    const error = new Error(reason || 'UMS session was not established. The portal may require captcha or a changed login flow.');
    error.statusCode = 401;
    throw error;
  }

  let data = parseDashboard(dashboardHtml);

  // UMS now hydrates key dashboard values through AJAX methods.
  // Pull the same web-method payloads server-side so web sync gets real data.
  try {
    const basicInfoPayload = await requestDashboardMethod(jar, 'GetStudentBasicInformation');
    const basicInfo = toObjectArray(basicInfoPayload)[0];
    if (basicInfo && typeof basicInfo === 'object') {
      data.profile = {
        ...data.profile,
        name: String(basicInfo.StudentName || data.profile?.name || 'LPU Student').trim() || 'LPU Student',
        vid: String(basicInfo.StudentUid || data.profile?.vid || '').trim(),
        section: String(basicInfo.Section || data.profile?.section || '').trim(),
        program: String(basicInfo.Program || data.profile?.program || '').trim(),
        avatarUrl: basicInfo.StudentPicture
          ? `data:image/jpeg;base64,${String(basicInfo.StudentPicture).trim()}`
          : (data.profile?.avatarUrl || '')
      };

      const cgpaFromInfo = String(basicInfo.CGPA || '').trim();
      const attFromInfo = String(basicInfo.AggAttendance || '').trim();
      if (cgpaFromInfo) data.cgpa = cgpaFromInfo;
      if (attFromInfo) data.overallAttendance = attFromInfo;
    }
  } catch {}

  try {
    const coursesPayload = await requestDashboardMethod(jar, 'GetStudentCourses');
    const summaryPayload = await requestDashboardMethod(jar, 'StudentAttendanceSummary');
    const courses = parseCoursesHtml(toHtmlString(coursesPayload));
    const summaryRows = parseAttendanceSummaryHtml(toHtmlString(summaryPayload));
    const mergedAttendance = mergeAttendanceData(courses, summaryRows);
    if (mergedAttendance.length > 0) {
      data.attendance = mergedAttendance;
    }
  } catch {}

  try {
    const feePayload = await requestDashboardMethod(jar, 'PendingFee');
    const feeFromMethod = parseFeeFromHtml(toHtmlString(feePayload));
    if (feeFromMethod) {
      data.fee = feeFromMethod;
    }
  } catch {}

  try {
    const gradesPayload = await requestDashboardMethod(jar, 'TermWiseCGPA');
    const gradesText = new JSDOM(`<div>${toHtmlString(gradesPayload)}</div>`).window.document.body.textContent?.replace(/\s+/g, ' ').trim() || '';
    const cgpaFromGrades = gradesText.match(/\bCGPA\b[^0-9]{0,12}([0-9]+(?:\.[0-9]+)?)/i)?.[1] || '';
    if (cgpaFromGrades && (data.cgpa === '--' || !data.cgpa)) {
      data.cgpa = cgpaFromGrades;
    }
  } catch {}

  try {
    // Keep a lightweight local snapshot for debugging real-world selector drift.
    fs.writeFileSync('debug-sync-dashboard.html', dashboardHtml);
    fs.writeFileSync('debug-sync-data.json', JSON.stringify(data, null, 2));
  } catch {}

  try {
    // Try AJAX web method first (LPU loads timetable via JS after page load)
    const ttPayload = await requestDashboardMethod(jar, 'GetStudentTimeTable');
    const ttHtml = toHtmlString(ttPayload);
    if (ttHtml) {
      data = mergeTimetable(data, parseTimetable(ttHtml));
    }
    // Fallback: full page scrape
    if (!data.timetable || Object.keys(data.timetable).length === 0) {
      const ttResponse = await request(jar, TIMETABLE_URL, { headers: { Referer: DASHBOARD_URL } });
      data = mergeTimetable(data, parseTimetable(await ttResponse.text()));
    }
    appendDebug(`TIMETABLE days=${Object.keys(data.timetable || {}).join(',')}`);
  } catch (error) {
    appendDebug(`TIMETABLE_ERROR ${error.message}`);
  }

  try {
    // Try AJAX web method first (LPU loads results via JS after page load)
    const resPayload = await requestDashboardMethod(jar, 'GetStudentResult');
    const resHtml = toHtmlString(resPayload);
    if (resHtml) {
      const parsedResults = parseResults(resHtml);
      if (parsedResults.length > 0) data.results = parsedResults;
    }
    // Fallback: grade card page scrape
    if (!data.results || data.results.length === 0) {
      const gradeResponse = await request(jar, RESULTS_URL, { headers: { Referer: DASHBOARD_URL } });
      const gradeParsed = parseResults(await gradeResponse.text());
      if (gradeParsed.length > 0) data.results = gradeParsed;
    }
    appendDebug(`RESULTS count=${data.results?.length || 0}`);
  } catch (error) {
    appendDebug(`RESULTS_ERROR ${error.message}`);
  }

  try {
    const feeResponse = await request(jar, FEE_URL, { headers: { Referer: DASHBOARD_URL } });
    const feeText = new JSDOM(await feeResponse.text()).window.document.body.textContent || '';
    data.fee = feeText.match(/Balance[^0-9]*([0-9,]+)/i)?.[1] || data.fee;
  } catch {}

  // Final debug snapshot
  appendDebug(`FINAL timetableKeys=${Object.keys(data.timetable||{}).length} results=${data.results?.length||0} fee=${data.fee}`);
  try {
    fs.writeFileSync('debug-sync-data.json', JSON.stringify(data, null, 2));
  } catch (e) {
    appendDebug(`DEBUG_WRITE_ERROR ${e.message}`);
  }
  return {
    ...data,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = {
  createLoginChallenge,
  syncUms
};
