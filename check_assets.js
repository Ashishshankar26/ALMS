const fs = require('fs');
const files = ['./assets/icon.png', './assets/splash.png', './assets/adaptive-icon.png'];

files.forEach(file => {
  try {
    const buffer = fs.readFileSync(file);
    const magic = buffer.toString('hex', 0, 8);
    const isPng = magic === '89504e470d0a1a0a';
    console.log(`${file}: ${magic} (Is PNG: ${isPng})`);
  } catch (e) {
    console.log(`${file}: Error reading file`);
  }
});
