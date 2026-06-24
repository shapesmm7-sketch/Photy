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

  // Create a mock image for upload
  const dummyBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const buffer = Buffer.from(dummyBase64, "base64");
  const testImagePath = path.join("/tmp", "test_mock.png");
  fs.writeFileSync(testImagePath, buffer);
  console.log("Mock image written to", testImagePath);

  // Upload the image
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    console.log("Uploading test image...");
    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(2000);
  }

  // Find all buttons on screen
  let buttons = await page.$$("button");
  console.log(`Found ${buttons.length} buttons on screen.`);

  // Click on "Phone Mockups" tab if available
  const phoneMockupsBtn = await page.$('button:has-text("Phone Mockups")');
  if (phoneMockupsBtn) {
    console.log("Clicking Phone Mockups tab...");
    await phoneMockupsBtn.click();
    await page.waitForTimeout(500);
  }

  // Click on "IPHONE 15" layout
  const iphoneBtn = await page.$('button:has-text("IPHONE 15")');
  if (iphoneBtn) {
    console.log("Selecting IPHONE 15 layout...");
    await iphoneBtn.click();
    await page.waitForTimeout(500);
  }

  // Click on "Viral Styles" tab
  const viralStylesBtn = await page.$('button:has-text("Viral Styles")');
  if (viralStylesBtn) {
    console.log("Clicking Viral Styles tab...");
    await viralStylesBtn.click();
    await page.waitForTimeout(500);
  }

  // Click on a quick feature or edit tool
  const editBtn = await page.$('button:has-text("Edit Details")');
  if (editBtn) {
    console.log("Clicking Edit Details...");
    await editBtn.click();
    await page.waitForTimeout(1000);
  }

  // Click on some specific tools in EditorCanvas if they exist
  const textToolBtn = await page.$('button:has-text("Text")');
  if (textToolBtn) {
    console.log("Clicking Text tool...");
    await textToolBtn.click();
    await page.waitForTimeout(500);
  }

  console.log("Closing browser");
  await browser.close();
}

main().catch(console.error);
