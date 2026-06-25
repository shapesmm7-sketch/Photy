import fs from 'fs';
import path from 'path';

const gradleFilePath = path.join(process.cwd(), 'node_modules', '@capacitor-community', 'admob', 'android', 'build.gradle');
const bannerExecutorFilePath = path.join(process.cwd(), 'node_modules', '@capacitor-community', 'admob', 'android', 'src', 'main', 'java', 'com', 'getcapacitor', 'community', 'admob', 'banner', 'BannerExecutor.java');

try {
  // Patch build.gradle
  if (fs.existsSync(gradleFilePath)) {
    console.log(`[AdMob Patch] Found build.gradle at ${gradleFilePath}`);
    let content = fs.readFileSync(gradleFilePath, 'utf8');
    
    // Replace JavaVersion.VERSION_21 with "21" in kotlinOptions
    if (content.includes('jvmTarget = JavaVersion.VERSION_21')) {
      content = content.replace('jvmTarget = JavaVersion.VERSION_21', 'jvmTarget = "21"');
      fs.writeFileSync(gradleFilePath, content, 'utf8');
      console.log('[AdMob Patch] Successfully replaced jvmTarget with "21" string.');
    } else if (content.includes('jvmTarget = JavaVersion.VERSION_17')) {
      content = content.replace('jvmTarget = JavaVersion.VERSION_17', 'jvmTarget = "17"');
      fs.writeFileSync(gradleFilePath, content, 'utf8');
      console.log('[AdMob Patch] Successfully replaced jvmTarget with "17" string.');
    } else {
      console.log('[AdMob Patch] build.gradle already patched or does not contain targeting jvmTarget line.');
    }
  } else {
    console.log(`[AdMob Patch] File not found at ${gradleFilePath}. Skipping patch.`);
  }

  // Patch BannerExecutor.java
  if (fs.existsSync(bannerExecutorFilePath)) {
    console.log(`[AdMob Patch] Found BannerExecutor.java at ${bannerExecutorFilePath}`);
    let content = fs.readFileSync(bannerExecutorFilePath, 'utf8');
    
    const targetString = 'mViewGroup = (ViewGroup) ((ViewGroup) activitySupplier.get().findViewById(android.R.id.content)).getChildAt(0);';
    const replacementString = `ViewGroup content = (ViewGroup) activitySupplier.get().findViewById(android.R.id.content);\n        if (content != null && content.getChildCount() > 0) {\n            mViewGroup = (ViewGroup) content.getChildAt(0);\n        } else {\n            mViewGroup = content;\n        }`;
    
    if (content.includes(targetString)) {
      content = content.replace(targetString, replacementString);
      fs.writeFileSync(bannerExecutorFilePath, content, 'utf8');
      console.log('[AdMob Patch] Successfully patched BannerExecutor.java to fix NullPointerException.');
    } else {
      console.log('[AdMob Patch] BannerExecutor.java already patched or target string not found.');
    }
  } else {
    console.log(`[AdMob Patch] File not found at ${bannerExecutorFilePath}. Skipping patch.`);
  }
} catch (error) {
  console.error('[AdMob Patch] Error patching files:', error);
}
