import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'node_modules', '@capacitor-community', 'admob', 'android', 'build.gradle');

try {
  if (fs.existsSync(filePath)) {
    console.log(`[AdMob Patch] Found build.gradle at ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace JavaVersion.VERSION_21 with "21" in kotlinOptions
    if (content.includes('jvmTarget = JavaVersion.VERSION_21')) {
      content = content.replace('jvmTarget = JavaVersion.VERSION_21', 'jvmTarget = "21"');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('[AdMob Patch] Successfully replaced jvmTarget with "21" string.');
    } else if (content.includes('jvmTarget = JavaVersion.VERSION_17')) {
      content = content.replace('jvmTarget = JavaVersion.VERSION_17', 'jvmTarget = "17"');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('[AdMob Patch] Successfully replaced jvmTarget with "17" string.');
    } else {
      console.log('[AdMob Patch] build.gradle already patched or does not contain targeting jvmTarget line.');
    }
  } else {
    console.log(`[AdMob Patch] File not found at ${filePath}. Skipping patch.`);
  }
} catch (error) {
  console.error('[AdMob Patch] Error patching build.gradle:', error);
}
