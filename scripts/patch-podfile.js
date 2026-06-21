const fs = require('fs');
const path = require('path');

const podfilePath = path.join(__dirname, '../ios/Podfile');

if (!fs.existsSync(podfilePath)) {
  console.error("Podfile not found at " + podfilePath);
  process.exit(1);
}

let content = fs.readFileSync(podfilePath, 'utf8');

// Force Firebase iOS SDK to 11.0.0 (contains official Xcode 16/Clang 19 compatibility fixes)
if (!content.includes('$FirebaseSDKVersion')) {
  content = `$FirebaseSDKVersion = '11.0.0'\n` + content;
}

const targetStr = 'post_install do |installer|';
const patch = `
    # Antigravity Patch: Fix deployment targets, DEFINES_MODULE, C++17 standard and BoringSSL-GRPC warn compiler flag
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] && config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 13.0
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
        end
        config.build_settings['DEFINES_MODULE'] = 'YES'
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
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

    # Patch all instances of basic_seq.h in Pods directory recursively to fix Xcode 16 template error
    Dir.glob(File.join(installer.sandbox.root, '**/basic_seq.h')).each do |file_path|
      if File.exist?(file_path)
        begin
          File.chmod(0644, file_path)
          text = File.read(file_path)
          old_line = "Traits::template CallSeqFactory(f_, *cur_, std::move(arg))"
          new_line = "Traits::template CallSeqFactory<>(f_, *cur_, std::move(arg))"
          if text.include?(old_line)
            puts "Patching basic_seq.h at \#{file_path}..."
            File.open(file_path, "w") { |file| file.puts text.gsub(old_line, new_line) }
          end
        rescue => e
          puts "Failed to patch \#{file_path}: \#{e.message}"
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
