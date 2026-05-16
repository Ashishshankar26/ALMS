const http = require('http');
const fs = require('fs');
const path = require('path');
const challengeHandler = require('../api/challenge');
const syncHandler = require('../api/sync');

const port = Number(process.argv[2] || process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const root = path.resolve(__dirname, '..', 'dist');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf'
};

function resolveFile(requestPath) {
  const decodedPath = decodeURIComponent(requestPath);
  let filePath = path.join(root, decodedPath);

  if (!filePath.startsWith(root)) {
    return null;
  }

  if (decodedPath === '/') {
    return path.join(root, 'index.html');
  }

  if (!path.extname(filePath)) {
    return `${filePath}.html`;
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);

  if (url.pathname === '/api/sync') {
    Promise.resolve(syncHandler(request, response)).catch((error) => {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ error: error.message || 'Unable to sync UMS data' }));
    });
    return;
  }

  if (url.pathname === '/api/challenge') {
    Promise.resolve(challengeHandler(request, response)).catch((error) => {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ error: error.message || 'Unable to load UMS captcha' }));
    });
    return;
  }

  const filePath = resolveFile(url.pathname);

  if (!filePath) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Serving ALMS PWA at http://${host}:${port}`);
});
