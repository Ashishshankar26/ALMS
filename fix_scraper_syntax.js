const fs = require('fs');

const file = 'd:/ALMS/lpu-app/context/ScraperContext.tsx';
let content = fs.readFileSync(file, 'utf8');

// We need to restore \\s, \\n, \\d, \\. inside the finalize block.
// Let's just find the `finalize` function block and replace single backslashes with double backslashes for standard regex tokens.

let finalizeStartIndex = content.indexOf('function finalize(resList) {');
let finalizeEndIndex = content.indexOf('window.ReactNativeWebView.postMessage', finalizeStartIndex);

let finalizeBlock = content.substring(finalizeStartIndex, finalizeEndIndex);

// Let's do replacements
finalizeBlock = finalizeBlock.replace(/\\s/g, '\\\\s');
finalizeBlock = finalizeBlock.replace(/\\n/g, '\\\\n');
finalizeBlock = finalizeBlock.replace(/\\d/g, '\\\\d');
finalizeBlock = finalizeBlock.replace(/\\\./g, '\\\\.');
finalizeBlock = finalizeBlock.replace(/\\-/g, '\\\\-');
finalizeBlock = finalizeBlock.replace(/\\\//g, '\\\\/');

content = content.substring(0, finalizeStartIndex) + finalizeBlock + content.substring(finalizeEndIndex);

fs.writeFileSync(file, content);
console.log('Fixed escaping in ScraperContext.tsx');
