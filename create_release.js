const fs = require('fs');
const path = require('path');
const https = require('https');

const OWNER = 'Ashishshankar26';
const REPO = 'ALMS';
const TOKEN = process.env.GITHUB_TOKEN; // Set GITHUB_TOKEN in CI/CD environment

function apiRequest(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      method: method,
      headers: {
        'User-Agent': 'Node-Fetch',
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...headers
      }
    };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function uploadAsset(releaseId, filePath, name) {
  return new Promise((resolve, reject) => {
    const fileStats = fs.statSync(filePath);
    const options = {
      hostname: 'uploads.github.com',
      path: `/repos/${OWNER}/${REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`,
      method: 'POST',
      headers: {
        'User-Agent': 'Node-Fetch',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fileStats.size,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`Upload HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(req);
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    function get(u) {
      https.get(u, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          get(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => { file.close(resolve); });
      }).on('error', (err) => { fs.unlink(destPath, () => reject(err)); });
    }
    get(url);
  });
}

async function run() {
  const args = process.argv.slice(2);
  const apkUrl = args[0];
  if (!apkUrl) {
    console.error('Provide APK URL as argument');
    process.exit(1);
  }
  const version = 'v1.0.3';
  const destPath = path.join(__dirname, 'ALMS_v1.0.3.apk');
  console.log(`Downloading APK from ${apkUrl}...`);
  await downloadFile(apkUrl, destPath);
  console.log('Download complete');
  const releaseBody = {
    tag_name: version,
    target_commitish: 'main',
    name: `LPU ALMS ${version} - Premium Layout & Scraper Stability Update`,
    body: `## LPU ALMS ${version} Release Notes\n\n* UI layout fixes, premium navigation styling, scraper stability, background sync, clean compilation.\n\n### 📦 Install\nDownload the \`ALMS_v1.0.3.apk\` asset below.`,
    draft: false,
    prerelease: false
  };
    // Check if a release with this tag already exists and delete it
    let existingRelease = null;
    try {
      existingRelease = await apiRequest('GET', `/repos/${OWNER}/${REPO}/releases/tags/${version}`, null);
    } catch (e) {
      // ignore if not found
    }
    if (existingRelease && existingRelease.id) {
      console.log(`Existing release found (ID: ${existingRelease.id}), deleting...`);
      await apiRequest('DELETE', `/repos/${OWNER}/${REPO}/releases/${existingRelease.id}`, null);
    }

  console.log('Creating GitHub release');
  const release = await apiRequest('POST', `/repos/${OWNER}/${REPO}/releases`, releaseBody);
  console.log('Release created:', release.html_url);
  const asset = await uploadAsset(release.id, destPath, 'ALMS_v1.0.3.apk');
  console.log('Asset uploaded:', asset.browser_download_url);
  fs.unlinkSync(destPath);
  console.log('Cleanup done');
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
