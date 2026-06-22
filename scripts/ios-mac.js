const { execSync } = require('child_process');
const path = require('path');

// Prevent Expo from complaining about dirty git working tree
process.env.EXPO_NO_GIT_STATUS = '1';

// Get extra arguments passed to the npm script (e.g., --device, --free)
const extraArgsArray = process.argv.slice(2);
const hasFreeFlag = extraArgsArray.includes('--free');
const filteredArgs = extraArgsArray.filter(arg => arg !== '--free').join(' ');

try {
  console.log("=== 1. Starting Expo Prebuild (Clean, No Install) ===");
  execSync('npx expo prebuild --platform ios --clean --no-install', { stdio: 'inherit' });

  console.log("\n=== 2. Applying CocoaPods and Xcode 16 Patches ===");
  // Require and run the patch-podfile script
  require('./patch-podfile.js');

  if (hasFreeFlag) {
    console.log("\n=== 2.5. Stripping Push Notifications for Free Apple Developer Account ===");
    // Require and run the patch-free-signing script
    require('./patch-free-signing.js')();
  }

  console.log(`\n=== 3. Building and Running iOS App (args: ${filteredArgs}) ===`);
  execSync(`npx expo run:ios ${filteredArgs}`, { stdio: 'inherit' });

  console.log("\n=== Build Process Completed Successfully ===");
} catch (error) {
  console.error("\n❌ Error executing macOS iOS helper script:", error.message);
  process.exit(1);
}
