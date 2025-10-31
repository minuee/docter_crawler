# Gemini Project Guide

This document provides context and guidelines for working on this project.

## Legacy Patterns & Best Practices

This section documents older code patterns that should be refactored or avoided, along with the preferred best practices.

---

### 1. Efficient Puppeteer Usage

**- Legacy Pattern (Problem):**
Do not call `puppeteer.launch()` inside a loop or for each individual task. This creates a new browser instance for every iteration, causing extremely high resource usage and system instability (e.g., high `kernel_task` on macOS).

**- Legacy Code Example:**
```javascript
// controller.js
// BAD: Browser is launched for a single task.
async function someCrawlingTask(url) {
  const browser = await puppeteer.launch(); // Inefficient: new browser per call
  const page = await browser.newPage();
  // ... do work ...
  await browser.close();
}

// route.js
// BAD: The inefficient controller function is called in a loop.
for (const item of items) {
  await controller.someCrawlingTask(item.url); // A new browser is launched and closed here every time.
}
```

**+ Best Practice (Solution):**
Launch the browser **once** outside the loop (e.g., at the beginning of the API route handler). Pass the `browser` instance to the controller functions that need it. The controller functions should then only create new `pages` and close them, but not the browser itself. The browser should be closed in a `finally` block at the top level to ensure it's always terminated.

**+ Correct Code Example:**
```javascript
// route.js
// GOOD: Browser is launched once and closed in a finally block.
const browser = await puppeteer.launch();
try {
  for (const item of items) {
    // The browser instance is passed to the controller.
    await controller.someEfficientCrawlingTask(browser, item.url);
  }
} finally {
  if (browser) {
    await browser.close();
  }
}

// controller.js
// GOOD: The function reuses the browser instance.
async function someEfficientCrawlingTask(browser, url) {
  const page = await browser.newPage(); // Efficient: only a new page is created.
  try {
    // ... do work on the page ...
  } finally {
    if (page) {
      await page.close(); // The page is closed, but the browser remains open.
    }
  }
}
```

**Reference Implementations:**
For concrete examples of this best practice, refer to the following APIs in `services/crawling_severance.healthcare/route.js`:
- `step02_new`
- `treatise_new`

These APIs demonstrate the correct way to manage the Puppeteer browser lifecycle for crawling tasks.

---