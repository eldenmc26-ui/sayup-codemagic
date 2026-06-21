const { execSync } = require('child_process');
const path = require('path');

// Prevent Expo from complaining about dirty git working tree
process.env.EXPO_NO_GIT_STATUS = '1';

// Get extra arguments passed to the npm script (e.g., --device)
const extraArgs = process.argv.slice(2).join(' ');

try {
  console.log("=== 1. Starting Expo Prebuild (Clean, No Install) ===");
  execSync('npx expo prebuild --platform ios --clean --no-install', { stdio: 'inherit' });

  console.log("\n=== 2. Applying CocoaPods and Xcode 16 Patches ===");
  // Require and run the patch-podfile script
  require('./patch-podfile.js');

  console.log(`\n=== 3. Building and Running iOS App (args: ${extraArgs}) ===`);
  execSync(`npx expo run:ios ${extraArgs}`, { stdio: 'inherit' });

  console.log("\n=== Build Process Completed Successfully ===");
} catch (error) {
  console.error("\n❌ Error executing macOS iOS helper script:", error.message);
  process.exit(1);
}
