import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on("console", (msg) => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on("pageerror", (err) => {
    console.error(`[Browser PageError]: ${err.message}\nStack:\n${err.stack}`);
  });

  console.log("Navigating to http://localhost:3000");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Create a 1x1 pixel base64 PNG image for testing
  const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const buffer = Buffer.from(dummyBase64, "base64");
  const testImagePath = path.join("/tmp", "test_mock.png");
  fs.writeFileSync(testImagePath, buffer);
  console.log("Mock image written to", testImagePath);

  // Locate the input element
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log("Uploading test image...");
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(2000);
  } else {
    console.error("File input element not found!");
  }

  // Check if we are in preview mode
  console.log("Checking current state / elements in DOM...");
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log("Body innerText length:", bodyText.length);

  // Click various buttons if available
  const buttons = await page.$$("button");
  console.log(`Found ${buttons.length} buttons on screen.`);
  for (let i = 0; i < Math.min(buttons.length, 10); i++) {
    const text = await buttons[i].evaluate(el => el.innerText);
    console.log(`Button ${i}: "${text}"`);
  }

  // Let's try clicking the "Settings" button or options
  const settingsBtn = await page.$("button:has(svg)");
  if (settingsBtn) {
    console.log("Clicking a button with an SVG icon (e.g. Settings)...");
    await settingsBtn.click();
    await page.waitForTimeout(1000);
  }

  console.log("Closing browser");
  await browser.close();
}

main().catch(console.error);
