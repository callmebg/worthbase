/**
 * Expo Config Plugin: China Mirror
 * Patches gradle-wrapper.properties to use Tencent mirror for Gradle distribution.
 * Runs automatically after `npx expo prebuild`.
 *
 * **CI 上自动跳过**：GitHub Actions 的 runner 在海外，从那里访问
 * mirrors.cloud.tencent.com 比直连 services.gradle.org 更慢也更不稳定。
 * 这个镜像是给国内本机开发用的，不是给 CI 用的。
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
      // GitHub Actions 的 workflow 里设了 env.CI=true；那种环境下不替换镜像
      if (process.env.CI) {
        console.log('[china-mirror] 检测到 CI 环境，跳过腾讯镜像，使用 Gradle 官方发行版');
        return exportedConfig;
      }

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
