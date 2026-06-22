const fs = require('fs');
const path = require('path');

function patchFreeSigning() {
  console.log("Applying patches for FREE Apple Developer Account (disabling Push Notifications)...");

  const iosDir = path.join(__dirname, '../ios');
  if (!fs.existsSync(iosDir)) {
    console.error("ios directory not found! Run prebuild first.");
    return;
  }

  // 1. Find and patch all .entitlements files
  function findAndPatchEntitlements(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findAndPatchEntitlements(fullPath);
      } else if (file.endsWith('.entitlements')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        const originalLength = content.length;
        
        // Remove aps-environment entitlement key and string value
        content = content.replace(/<key>aps-environment<\/key>\s*<string>[^<]+<\/string>/g, '');
        
        if (content.length !== originalLength) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Successfully removed aps-environment from ${file}`);
        }
      }
    }
  }

  // 2. Find and patch project.pbxproj files
  function findAndPatchPbxProj(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findAndPatchPbxProj(fullPath);
      } else if (file === 'project.pbxproj') {
        let content = fs.readFileSync(fullPath, 'utf8');
        const originalContent = content;

        // Disable com.apple.Push capability (with 1; to 0;)
        content = content.replace(/com\.apple\.Push\s*=\s*\{\s*enabled\s*=\s*1;\s*\};/g, 'com.apple.Push = { enabled = 0; };');
        content = content.replace(/com\.apple\.Push\s*=\s*\{\s*enabled\s*=\s*1;\s*\}/g, 'com.apple.Push = { enabled = 0; }');

        if (content !== originalContent) {
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`Successfully disabled com.apple.Push capability in ${file}`);
        }
      }
    }
  }

  findAndPatchEntitlements(iosDir);
  findAndPatchPbxProj(iosDir);
  console.log("Free developer account patches applied successfully.");
}

if (require.main === module) {
  patchFreeSigning();
} else {
  module.exports = patchFreeSigning;
}
