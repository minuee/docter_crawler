const fs = require('fs');
console.log('Test script starting.');
fs.writeFileSync('test_output.txt', 'Hello from test script.', 'utf-8');
console.log('Test script finished.');
