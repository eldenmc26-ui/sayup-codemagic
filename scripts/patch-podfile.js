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
    # Antigravity Patch: Fix deployment targets, DEFINES_MODULE and BoringSSL-GRPC warn compiler flag
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] && config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 13.0
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
        end
        config.build_settings['DEFINES_MODULE'] = 'YES'
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
      if target.name == 'gRPC-Core'
        file_path = File.join(installer.sandbox.pod_dir('gRPC-Core'), 'src/core/lib/promise/detail/basic_seq.h')
        if File.exist?(file_path)
          File.chmod(0644, file_path)
          text = File.read(file_path)
          old_line = "Traits::template CallSeqFactory(f_, *cur_, std::move(arg))"
          new_line = "Traits::template CallSeqFactory<>(f_, *cur_, std::move(arg))"
          if text.include?(old_line)
            puts "Patching gRPC-Core basic_seq.h..."
            File.open(file_path, "w") { |file| file.puts text.gsub(old_line, new_line) }
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
