const { syncUms } = require('../server/umsClient');
const fs = require('fs');
const path = require('path');

const DEBUG_SYNC_LOG = path.resolve(__dirname, '..', 'debug-sync-api.log');

function appendDebug(entry) {
  try {
    fs.appendFileSync(DEBUG_SYNC_LOG, `${new Date().toISOString()} ${entry}\n`);
  } catch {}
}

async function readBody(request) {
  if (request.body && typeof request.body === 'object') {
    return request.body;
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.statusCode = 405;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: 'Method not allowed' }));
    appendDebug('METHOD_NOT_ALLOWED');
    return;
  }

  try {
    const body = await readBody(request);
    appendDebug(
      `REQUEST username=${String(body.username || '').trim()} hasPassword=${Boolean(body.password)} hasChallenge=${Boolean(body.challengeId)} captchaLen=${String(body.captchaCode || '').trim().length}`
    );
    const data = await syncUms({
      username: String(body.username || '').trim(),
      password: String(body.password || ''),
      challengeId: String(body.challengeId || ''),
      captchaCode: String(body.captchaCode || '').trim()
    });

    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ data }));
    appendDebug(
      `SUCCESS profileName=${data?.profile?.name || ''} vid=${data?.profile?.vid || ''} cgpa=${data?.cgpa || ''} att=${data?.overallAttendance || ''} attendanceCount=${Array.isArray(data?.attendance) ? data.attendance.length : 0}`
    );
  } catch (error) {
    response.statusCode = error.statusCode || 500;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: error.message || 'Unable to sync UMS data' }));
    appendDebug(`ERROR status=${error.statusCode || 500} message=${error.message || 'Unable to sync UMS data'}`);
  }
};
