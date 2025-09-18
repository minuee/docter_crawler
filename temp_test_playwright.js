try {
    console.log('Attempting to require playwright...');
    const { chromium } = require('playwright');
    console.log('Playwright required successfully.');
    process.exit(0);
} catch (e) {
    console.error('Failed to require playwright:', e.stack);
    process.exit(1);
}
