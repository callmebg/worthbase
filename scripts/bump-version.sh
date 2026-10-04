#!/usr/bin/env bash
#
# bump-version.sh — 一键更新应用版本号
#
# 更新以下 3 处：
#   1. package.json        → version
#   2. app.json            → expo.version + expo.android.versionCode
#   3. android/app/build.gradle → versionCode + versionName（gitignore，仅本地直连 gradle 构建用）
#
# 注意：app/settings.tsx 已通过 expo-constants 动态读取版本，无需手动更新
#
# 用法:
#   ./scripts/bump-version.sh <版本号> [versionCode]
#
# 示例:
#   ./scripts/bump-version.sh 1.5.0          # versionCode 自动 +1
#   ./scripts/bump-version.sh 1.5.0 10       # 手动指定 versionCode
#   ./scripts/bump-version.sh 2.0.0 --dry    # 预览变更，不写入文件
#

set -euo pipefail

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── 项目根目录（脚本在 scripts/ 下，所以上一级） ──
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# node / adb 等 Windows 原生程序不认识 MSYS 路径：
# 传 /g/code/worthbase 会被解析成「当前盘 + \g\code\worthbase」（如 G:\g\code\...）而 ENOENT。
# 因此在把路径交给这类程序前统一转成 Windows 形式；
# Linux/macOS（CI）上没有 cygpath，原样返回即可。
winpath() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -w "$1"; else printf '%s' "$1"; fi
}

# ── 参数解析 ──
DRY_RUN=false
VERSION=""
VERSION_CODE=""

for arg in "$@"; do
  case "$arg" in
    --dry|-n|--dry-run)
      DRY_RUN=true
      ;;
    -h|--help)
      sed -n '2,/^$/s/^# \?//p' "$0"
      exit 0
      ;;
    *)
      if [[ -z "$VERSION" ]]; then
        VERSION="$arg"
      elif [[ -z "$VERSION_CODE" ]]; then
        VERSION_CODE="$arg"
      fi
      ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  echo -e "${RED}❌ 缺少版本号参数${NC}"
  echo ""
  echo "用法: $0 <版本号> [versionCode]"
  echo "示例: $0 1.5.0"
  echo "      $0 1.5.0 10"
  echo "      $0 2.0.0 --dry    # 仅预览"
  exit 1
fi

# ── 验证版本号格式 (semver: x.y.z) ──
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$'; then
  echo -e "${RED}❌ 版本号格式无效: $VERSION${NC}"
  echo "   期望格式: x.y.z (例如 1.5.0, 2.0.0-beta.1)"
  exit 1
fi

# ── 文件路径 ──
PACKAGE_JSON="$PROJECT_ROOT/package.json"
APP_JSON="$PROJECT_ROOT/app.json"
BUILD_GRADLE="$PROJECT_ROOT/android/app/build.gradle"

# ── 检查文件是否存在 ──
for f in "$PACKAGE_JSON" "$APP_JSON" "$BUILD_GRADLE"; do
  if [[ ! -f "$f" ]]; then
    echo -e "${RED}❌ 文件不存在: $f${NC}"
    exit 1
  fi
done

# ── 读取当前版本 ──
OLD_VERSION=$(grep -oP '"version":\s*"\K[^"]+' "$PACKAGE_JSON" | head -1)
# versionCode 的「真源」是 app.json（已入库；CI 的 expo prebuild 由它生成 build.gradle）。
# 优先从 app.json 读，缺失时回落到本地 build.gradle（兼容尚未迁移的旧状态）。
OLD_VERSION_CODE=$(node -e 'const fs=require("fs");try{const a=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const v=a.expo&&a.expo.android&&a.expo.android.versionCode;process.stdout.write(v==null?"":String(v))}catch(e){}' "$(winpath "$APP_JSON")" 2>/dev/null || true)
if [[ -z "$OLD_VERSION_CODE" && -f "$BUILD_GRADLE" ]]; then
  OLD_VERSION_CODE=$(grep -oP 'versionCode\s+\K[0-9]+' "$BUILD_GRADLE" || true)
fi
OLD_VERSION_NAME=$(grep -oP 'versionName\s+"\K[^"]+' "$BUILD_GRADLE")

# ── 计算 versionCode ──
if [[ -z "$VERSION_CODE" ]]; then
  VERSION_CODE=$((OLD_VERSION_CODE + 1))
fi

# ── 验证 versionCode 是正整数 ──
if ! echo "$VERSION_CODE" | grep -qE '^[0-9]+$' || [[ "$VERSION_CODE" -le 0 ]]; then
  echo -e "${RED}❌ versionCode 必须是正整数: $VERSION_CODE${NC}"
  exit 1
fi

# ── 显示变更预览 ──
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║      WorthBase 版本更新工具          ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}变更预览:${NC}"
echo ""
echo -e "  版本号:      ${YELLOW}$OLD_VERSION${NC} → ${GREEN}$VERSION${NC}"
echo -e "  versionCode: ${YELLOW}$OLD_VERSION_CODE${NC} → ${GREEN}$VERSION_CODE${NC}"
echo -e "  versionName: ${YELLOW}$OLD_VERSION_NAME${NC} → ${GREEN}$VERSION${NC}"
echo ""
echo -e "${BOLD}将更新以下文件:${NC}"
echo -e "  1. ${CYAN}package.json${NC}              → version: \"$VERSION\""
echo -e "  2. ${CYAN}app.json${NC}                  → expo.version: \"$VERSION\", android.versionCode: $VERSION_CODE"
echo -e "  3. ${CYAN}android/app/build.gradle${NC}  → versionCode: $VERSION_CODE, versionName: \"$VERSION\""
echo -e "  ${CYAN}(settings.tsx 已通过 expo-constants 自动读取)${NC}"
echo ""

if $DRY_RUN; then
  echo -e "${YELLOW}⚠️  --dry 模式，未实际写入文件${NC}"
  exit 0
fi

# ── 执行更新 ──
UPDATED=0

# 1. package.json
if command -v node &>/dev/null && command -v npx &>/dev/null; then
  # 用 node 精确替换，避免 jq 依赖
  # 路径与版本号都走 argv：既避开 MSYS 路径问题，也免掉内插的引号/转义陷阱
  node -e '
    const fs = require("fs");
    const f = process.argv[1];
    const pkg = JSON.parse(fs.readFileSync(f, "utf8"));
    pkg.version = process.argv[2];
    fs.writeFileSync(f, JSON.stringify(pkg, null, 2) + "\n");
  ' "$(winpath "$PACKAGE_JSON")" "$VERSION"
  echo -e "  ${GREEN}✓${NC} package.json"
  UPDATED=$((UPDATED + 1))
else
  # fallback: sed
  sed -i "s/\"version\": *\"$OLD_VERSION\"/\"version\": \"$VERSION\"/" "$PACKAGE_JSON"
  echo -e "  ${GREEN}✓${NC} package.json (sed)"
  UPDATED=$((UPDATED + 1))
fi

# 2. app.json
if command -v node &>/dev/null; then
  node -e '
    const fs = require("fs");
    const f = process.argv[1];
    const app = JSON.parse(fs.readFileSync(f, "utf8"));
    app.expo.version = process.argv[2];
    app.expo.android = app.expo.android || {};
    app.expo.android.versionCode = Number(process.argv[3]);
    fs.writeFileSync(f, JSON.stringify(app, null, 2) + "\n");
  ' "$(winpath "$APP_JSON")" "$VERSION" "$VERSION_CODE"
  echo -e "  ${GREEN}✓${NC} app.json"
  UPDATED=$((UPDATED + 1))
else
  sed -i "s/\"version\": *\"$OLD_VERSION\"/\"version\": \"$VERSION\"/" "$APP_JSON"
  echo -e "  ${GREEN}✓${NC} app.json (sed)"
  UPDATED=$((UPDATED + 1))
fi

# 3. android/app/build.gradle
sed -i "s/versionCode $OLD_VERSION_CODE/versionCode $VERSION_CODE/" "$BUILD_GRADLE"
sed -i "s/versionName \"$OLD_VERSION_NAME\"/versionName \"$VERSION\"/" "$BUILD_GRADLE"
echo -e "  ${GREEN}✓${NC} android/app/build.gradle"
UPDATED=$((UPDATED + 1))

echo ""
echo -e "${GREEN}${BOLD}✅ 版本已更新到 $VERSION (versionCode: $VERSION_CODE)${NC}"
echo -e "   共更新 $UPDATED 个文件"
echo ""

# ── 提示后续操作 ──
echo -e "${BOLD}后续步骤:${NC}"
echo -e "  ${CYAN}git add -A && git commit -m \"chore: bump version to $VERSION\"${NC}"
echo -e "  ${CYAN}eas build --platform android --profile preview${NC}  # 构建 APK"
echo ""
