import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (msg) => {
    console.log(`[Browser Console]: ${msg.type()} - ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    console.log(`[Browser PageError]: ${err.message}`);
  });

  console.log("Navigating to http://localhost:3000");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  console.log("Closing browser");
  await browser.close();
}

main().catch(console.error);
