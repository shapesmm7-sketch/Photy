import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("console", (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on("pageerror", (err) => {
    console.error(`[Browser PageError]: ${err.message}\nStack:\n${err.stack}`);
  });

  await page.exposeFunction('logError', (msg, url, line, col, error) => {
    console.error(`[Window Error]: ${msg} at ${url}:${line}:${col}`, error);
  });

  await page.addInitScript(() => {
    window.addEventListener('error', (event) => {
      window.logError(event.message, event.filename, event.lineno, event.colno, event.error ? event.error.stack : null);
    });
    window.addEventListener('unhandledrejection', (event) => {
      window.logError('Unhandled Rejection: ' + event.reason, '', 0, 0, event.reason ? event.reason.stack : null);
    });
  });

  console.log("Navigating to http://localhost:3000");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  console.log("Closing browser");
  await browser.close();
}

main().catch(console.error);
