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
# 用法:
#   ./scripts/check-version.sh          # 校验
#   npm run check:version               # 同上
#
# 退出码: 0 = 一致, 1 = 不一致或格式非法
#
# 注意：改版本号请用 ./scripts/bump-version.sh，不要手改。

set -uo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG_JSON="$PROJECT_ROOT/package.json"
APP_JSON="$PROJECT_ROOT/app.json"
GRADLE="$PROJECT_ROOT/android/app/build.gradle"

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

for f in "$PKG_JSON" "$APP_JSON" "$GRADLE"; do
  if [ ! -f "$f" ]; then bad "文件不存在: $f"; fi
done
if [ "$FAIL" -ne 0 ]; then exit 1; fi

V_PKG=$(read_json "$PKG_JSON" version)
V_APP=$(read_json "$APP_JSON" expo.version)
# POSIX BRE，不用 GNU 专有的 \+
V_NAME=$(sed -n 's/.*versionName[[:space:]]*"\([^"]*\)".*/\1/p' "$GRADLE" | head -1)
V_CODE=$(sed -n 's/.*versionCode[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$GRADLE" | head -1)

echo "  package.json          version     = ${V_PKG:-<空>}"
echo "  app.json              expo.version= ${V_APP:-<空>}"
echo "  build.gradle          versionName = ${V_NAME:-<空>}"
echo "  build.gradle          versionCode = ${V_CODE:-<空>}"
echo ""

[ -n "$V_PKG" ]  && ok "package.json 有 version"  || bad "package.json 读不到 version"
[ -n "$V_APP" ]  && ok "app.json 有 expo.version" || bad "app.json 读不到 expo.version"
[ -n "$V_NAME" ] && ok "build.gradle 有 versionName" || bad "build.gradle 读不到 versionName"

if [ "$V_PKG" = "$V_APP" ] && [ "$V_PKG" = "$V_NAME" ]; then
  ok "三处版本号一致: $V_PKG"
else
  bad "三处版本号不一致（package=$V_PKG app=$V_APP gradle=$V_NAME）—— 请用 ./scripts/bump-version.sh 统一"
fi

if echo "$V_PKG" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$'; then
  ok "版本号符合 semver: $V_PKG"
else
  bad "版本号不符合 semver(x.y.z): '$V_PKG'"
fi

if echo "$V_CODE" | grep -qE '^[1-9][0-9]*$'; then
  ok "versionCode 是正整数: $V_CODE"
else
  bad "versionCode 必须是正整数: '$V_CODE'"
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
