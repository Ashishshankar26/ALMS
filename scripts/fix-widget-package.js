const fs = require('fs');
const path = require('path');

const pkgDir = path.join(__dirname, '..', 'node_modules', 'react-native-android-widget');
if (!fs.existsSync(pkgDir)) {
  console.log('react-native-android-widget not found in node_modules, skipping patch.');
  process.exit(0);
}

// 1. Fix package.json
const pkgJsonPath = path.join(pkgDir, 'package.json');
if (fs.existsSync(pkgJsonPath)) {
  let pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  pkg['react-native'] = 'lib/module/index';
  pkg['source'] = 'lib/module/index';
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2), 'utf8');
  console.log('Patched react-native-android-widget package.json');
}

// 2. Fix src/index.ts
const srcIndexPath = path.join(pkgDir, 'src', 'index.ts');
if (fs.existsSync(srcIndexPath)) {
  let srcIndex = fs.readFileSync(srcIndexPath, 'utf8');
  srcIndex = srcIndex.replace("export * from './config-plugin.type';", "// export * from './config-plugin.type';");
  fs.writeFileSync(srcIndexPath, srcIndex, 'utf8');
  console.log('Patched react-native-android-widget src/index.ts');
}

// 3. Create dummy config-plugin.type.js in src
const dummyTypeJs = path.join(pkgDir, 'src', 'config-plugin.type.js');
fs.writeFileSync(dummyTypeJs, 'module.exports = {};\n', 'utf8');
console.log('Created dummy config-plugin.type.js in src');
