const fs = require('fs');
const path = require('path');

const podfilePath = path.join(__dirname, '../ios/Podfile');

if (!fs.existsSync(podfilePath)) {
  console.error("Podfile not found at " + podfilePath);
  process.exit(1);
}

let content = fs.readFileSync(podfilePath, 'utf8');

const targetStr = 'post_install do |installer|';
const patch = `
    # Antigravity Patch: Fix deployment targets and BoringSSL-GRPC warn compiler flag
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] && config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 13.0
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
        end
      end
      if target.name == 'BoringSSL-GRPC'
        target.source_build_phase.files.each do |file|
          if file.settings && file.settings['COMPILER_FLAGS']
            flags = file.settings['COMPILER_FLAGS'].split
            flags.reject! { |flag| flag == '-GCC_WARN_INHIBIT_ALL_WARNINGS' }
            file.settings['COMPILER_FLAGS'] = flags.join(' ')
          end
        end
      end
    end
`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, targetStr + patch);
  fs.writeFileSync(podfilePath, content, 'utf8');
  console.log("Successfully patched Podfile at " + podfilePath);
} else {
  console.error("Could not find 'post_install do |installer|' in Podfile to patch.");
  process.exit(1);
}
