const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withFixFirebaseHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let podfileContents = fs.readFileSync(podfilePath, "utf8");

      const snippet = `
    # Fix non-modular header errors in @react-native-firebase
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end`;

      // Insert inside the existing post_install block, right after "installer" appears
      if (podfileContents.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")) {
        // Already patched
        return config;
      }

      // Look for post_install do |installer| and insert after it
      const postInstallRegex = /post_install do \|installer\|/;
      if (postInstallRegex.test(podfileContents)) {
        podfileContents = podfileContents.replace(
          postInstallRegex,
          `post_install do |installer|${snippet}`
        );
      } else {
        // No post_install block found, append one before the final "end"
        const lastEnd = podfileContents.lastIndexOf("end");
        if (lastEnd !== -1) {
          podfileContents =
            podfileContents.slice(0, lastEnd) +
            `\n  post_install do |installer|${snippet}\n  end\n` +
            podfileContents.slice(lastEnd);
        }
      }

      fs.writeFileSync(podfilePath, podfileContents);
      return config;
    },
  ]);
}

module.exports = withFixFirebaseHeaders;
