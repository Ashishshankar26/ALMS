const { createLoginChallenge } = require('../server/umsClient');

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.statusCode = 405;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = request.method === 'POST' ? await readBody(request) : {};
    const challenge = await createLoginChallenge(String(body.username || '').trim());
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(challenge));
  } catch (error) {
    response.statusCode = error.statusCode || 500;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: error.message || 'Unable to load UMS captcha' }));
  }
};
