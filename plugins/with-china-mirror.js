/**
 * Expo Config Plugin: China Mirror
 * Patches gradle-wrapper.properties to use Tencent mirror for Gradle distribution.
 * Runs automatically after `npx expo prebuild`.
 *
 * Usage in app.json:
 *   "plugins": ["./plugins/with-china-mirror.js"]
 */

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GRADLE_MIRROR_URL = 'https\\://mirrors.cloud.tencent.com/gradle/';
const GRADLE_ORIGINAL_URL = 'https\\://services.gradle.org/distributions/';

function withChinaMirror(config) {
  return withDangerousMod(config, [
    'android',
    (exportedConfig) => {
      const wrapperPath = path.join(
        exportedConfig.modRequest.projectRoot,
        'android',
        'gradle',
        'wrapper',
        'gradle-wrapper.properties'
      );

      if (fs.existsSync(wrapperPath)) {
        let content = fs.readFileSync(wrapperPath, 'utf8');
        content = content.replace(GRADLE_ORIGINAL_URL, GRADLE_MIRROR_URL);
        fs.writeFileSync(wrapperPath, content, 'utf8');
        console.log('[china-mirror] Patched gradle-wrapper.properties → Tencent mirror');
      }

      return exportedConfig;
    },
  ]);
}

module.exports = withChinaMirror;
