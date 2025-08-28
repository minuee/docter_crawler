const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services/crawling_bedoc/playwright_parser.js');

fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    const lines = data.split('\n');
    const problematicLine = lines[40]; // Line 41 is at index 40

    console.log('--- Problematic Line (Line 41) ---');
    console.log(problematicLine);
    console.log('----------------------------------');
});