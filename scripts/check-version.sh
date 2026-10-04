#!/usr/bin/env bash
#
# check-version.sh — 校验三处版本号一致（CI 门禁 / 发版前自查）
#
# 校验：
#   1. package.json                  → version
#   2. app.json                      → expo.version
#   3. android/app/build.gradle      → versionName（须与上面一致）+ versionCode（正整数）
#   4. 版本号符合 semver
#   5. 提示（不失败）：当前版本是否已打 git tag
#
# 关于第 3 项：/android 被 gitignore（Expo CNG，由 expo prebuild 从 app.json 生成），
# 所以 CI 刚 checkout 时它不存在。此时默认**跳过** gradle 校验并明确打印说明（不静默）；
# 加 --strict 则要求它必须存在 —— 用于 prebuild 之后做真正的三处一致性校验。
#
# 用法:
#   ./scripts/check-version.sh            # 校验（gradle 不存在则跳过）
#   ./scripts/check-version.sh --strict   # gradle 必须存在（prebuild 之后用）
#   npm run check:version                 # 同第一条
#   npm run check:version -- --strict     # 同第二条
#
# 环境变量:
#   GRADLE_PATH   覆盖 build.gradle 路径（仅供测试注入）
#
# 退出码: 0 = 一致, 1 = 不一致 / 格式非法 / --strict 下 gradle 缺失
#
# 注意：改版本号请用 ./scripts/bump-version.sh，不要手改。

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG_JSON="$PROJECT_ROOT/package.json"
APP_JSON="$PROJECT_ROOT/app.json"
# /android 被 gitignore（Expo CNG：由 expo prebuild 从 app.json 生成），
# 所以 CI 的 checkout 里没有这个文件。GRADLE_PATH 仅供测试注入。
GRADLE="${GRADLE_PATH:-$PROJECT_ROOT/android/app/build.gradle}"

# --strict：build.gradle 必须存在（用于 prebuild 之后的校验）
STRICT=0
for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=1 ;;
    -h|--help) sed -n '2,/^$/s/^# \?//p' "$0"; exit 0 ;;
  esac
done

FAIL=0
ok()   { printf '  ✅ %s\n' "$1"; }
bad()  { printf '  ❌ %s\n' "$1"; FAIL=1; }
info() { printf '  ℹ️  %s\n' "$1"; }

# 用 node 读 JSON（避免 jq 依赖）。路径通过 argv 传入，
# 不要内插进 -e 的脚本里：Windows 路径的反斜杠会被当成 JS 转义序列。
read_json() { # $1=文件 $2=点路径(如 expo.version)
  node -e '
    const fs = require("fs");
    const o = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    let v = o;
    for (const k of process.argv[2].split(".")) v = (v == null ? undefined : v[k]);
    process.stdout.write(v == null ? "" : String(v));
  ' "$1" "$2" 2>/dev/null
}

echo "╔══════════════════════════════════════╗"
echo "║   WorthBase 版本一致性校验           ║"
echo "╚══════════════════════════════════════╝"
echo ""

for f in "$PKG_JSON" "$APP_JSON"; do
  if [ ! -f "$f" ]; then bad "文件不存在: $f"; fi
done

# build.gradle 可能不存在：/android 被 gitignore，由 expo prebuild 从 app.json 生成，
# 所以 CI 刚 checkout 时没有它。非 strict 模式跳过 gradle 校验（并明说，不静默）；
# strict 模式（prebuild 之后跑）下缺失即失败。
HAS_GRADLE=1
if [ ! -f "$GRADLE" ]; then
  HAS_GRADLE=0
  if [ "$STRICT" -eq 1 ]; then
    bad "--strict 要求 build.gradle 存在（应在 expo prebuild 之后运行）: $GRADLE"
  fi
fi
if [ "$FAIL" -ne 0 ]; then exit 1; fi

V_PKG=$(read_json "$PKG_JSON" version)
V_APP=$(read_json "$APP_JSON" expo.version)
V_CODE_APP=$(read_json "$APP_JSON" expo.android.versionCode)
V_NAME=""
V_CODE=""
if [ "$HAS_GRADLE" -eq 1 ]; then
  # POSIX BRE，不用 GNU 专有的 \+
  V_NAME=$(sed -n 's/.*versionName[[:space:]]*"\([^"]*\)".*/\1/p' "$GRADLE" | head -1)
  V_CODE=$(sed -n 's/.*versionCode[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$GRADLE" | head -1)
fi

echo "  package.json          version     = ${V_PKG:-<空>}"
echo "  app.json              expo.version= ${V_APP:-<空>}"
if [ "$HAS_GRADLE" -eq 1 ]; then
  echo "  build.gradle          versionName = ${V_NAME:-<空>}"
  echo "  build.gradle          versionCode = ${V_CODE:-<空>}"
else
  echo "  build.gradle          <不存在，跳过>"
  info "/android 被 gitignore（Expo CNG，由 expo prebuild 从 app.json 生成）→ 本次只校验两处"
  info "如需三处全验：prebuild 之后加 --strict 重跑"
fi
echo ""

if [ -n "$V_PKG" ]; then ok "package.json 有 version"; else bad "package.json 读不到 version"; fi
if [ -n "$V_APP" ]; then ok "app.json 有 expo.version"; else bad "app.json 读不到 expo.version"; fi
# app.json 必须带 android.versionCode：CI 的 expo prebuild 从 app.json 生成 build.gradle，
# 缺了它会退回默认 versionCode 1，导致新 APK 无法覆盖安装（报「无法降级安装」）。
if [ -n "$V_CODE_APP" ]; then
  ok "app.json 有 android.versionCode: $V_CODE_APP"
else
  bad "app.json 缺 expo.android.versionCode —— CI prebuild 会退回 versionCode 1，APK 覆盖安装会报「无法降级安装」。请用 ./scripts/bump-version.sh 补上"
fi

if [ "$HAS_GRADLE" -eq 1 ]; then
  if [ -n "$V_NAME" ]; then ok "build.gradle 有 versionName"; else bad "build.gradle 读不到 versionName"; fi
  if [ "$V_PKG" = "$V_APP" ] && [ "$V_PKG" = "$V_NAME" ]; then
    ok "三处版本号一致: $V_PKG"
  else
    bad "三处版本号不一致（package=$V_PKG app=$V_APP gradle=$V_NAME）—— 请用 ./scripts/bump-version.sh 统一"
  fi
else
  if [ "$V_PKG" = "$V_APP" ]; then
    ok "两处版本号一致: $V_PKG（build.gradle 未生成，已跳过）"
  else
    bad "版本号不一致（package=$V_PKG app=$V_APP）—— 请用 ./scripts/bump-version.sh 统一"
  fi
fi

if echo "$V_PKG" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$'; then
  ok "版本号符合 semver: $V_PKG"
else
  bad "版本号不符合 semver(x.y.z): '$V_PKG'"
fi

if [ "$HAS_GRADLE" -eq 1 ]; then
  if echo "$V_CODE" | grep -qE '^[1-9][0-9]*$'; then
    ok "build.gradle versionCode 是正整数: $V_CODE"
  else
    bad "build.gradle versionCode 必须是正整数: '$V_CODE'"
  fi
  # app.json 与 build.gradle 的 versionCode 必须一致（CI 里 build.gradle 由 app.json 生成，本就该相等）
  if [ -n "$V_CODE_APP" ] && [ "$V_CODE" != "$V_CODE_APP" ]; then
    bad "versionCode 不一致（app.json=$V_CODE_APP, build.gradle=$V_CODE）—— 请用 ./scripts/bump-version.sh 统一"
  fi
fi

# tag 检查只提示，不失败（tag 通常在发版时才打）
if command -v git >/dev/null 2>&1 && git -C "$PROJECT_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  if git -C "$PROJECT_ROOT" tag --list "$V_PKG" | grep -q .; then
    ok "git tag '$V_PKG' 已存在"
  else
    info "git tag '$V_PKG' 尚未创建（发版时补：git tag $V_PKG && git push --tags）"
  fi
fi

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "✅ 版本校验通过"
  exit 0
else
  echo "❌ 版本校验失败"
  exit 1
fi
