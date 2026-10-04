#!/usr/bin/env bash
# WorthBase (家底) — adb 设备端 UI 测试 harness
#
# 用法：
#   ./scripts/adb-ui-test.sh doctor              # 环境自检（设备/应用/Metro/网络真值/数据库）
#   ./scripts/adb-ui-test.sh backup-db           # 备份 SQLite + 完整性校验 + 指纹清单（改数据前必做）
#   ./scripts/adb-ui-test.sh restore-db [路径] --yes   # 恢复（默认拒绝执行，必须显式 --yes）
#   ./scripts/adb-ui-test.sh verify-data [资产名]  # 恢复/暴力测试后核对数据与功能
#   ./scripts/adb-ui-test.sh goto <route>        # 深链跳转（assets/accounts/settings）
#   ./scripts/adb-ui-test.sh open <资产名>       # 打开资产详情
#   ./scripts/adb-ui-test.sh texts               # 打印当前屏幕文本
#   ./scripts/adb-ui-test.sh assert <文本>       # 断言屏幕包含某文本
#   ./scripts/adb-ui-test.sh metal               # 贵金属参考价用例 M-01~M-04（只读）
#   ./scripts/adb-ui-test.sh log                 # 抓崩溃与 MetalPrice 日志
#
# 设计要点（详见 docs/test-plan.md §4.2）：
#   - 不用固定 sleep 等 UI，一律 poll_for 轮询锚点文本
#   - 每个用例前 force-stop 复位，避免跨用例状态残留
#   - adb pull 的本地路径必须相对；Windows 版 adb 不认 /g/... 这类 MSYS 绝对路径
#   - 全程 MSYS_NO_PATHCONV=1，否则 Git Bash 会把 /sdcard/x 转成 Windows 路径
#   - LogBox 告警横幅与底部导航可点区重叠会吃掉点击 → goto 里先关掉
#   - uiautomator dump 只含视口内节点 → 断言前必须滚到目标区；滚遍全屏才能断言"不存在"
#   - 函数不得以 grep 的返回值作为退出码，否则"没找到"会被调用方当成"失败"而静默中止

set -uo pipefail
export MSYS_NO_PATHCONV=1

PKG=com.worthbase.app
SCHEME=worthbase
UI=ui.xml                      # 相对路径，勿改成绝对路径
DB_REMOTE=files/SQLite/worthbase.db
BACKUP_DIR="${WB_BACKUP_DIR:-/tmp/wb-backup}"

# ─── 基础操作 ───────────────────────────────────────────────
uidump() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$UI" >/dev/null 2>&1; }
texts()  { tr '>' '>\n' < "$UI" | grep -o 'text="[^"]\+"' | sed 's/^text="//; s/"$//' | grep -v '^$'; }
valof()  { texts | grep -A1 -x "$1" | sed -n 2p; }
has()    { if grep -q "$1" "$UI"; then echo "✅"; else echo "❌"; fi; }
back()   { adb shell input keyevent 4; sleep 2; }
center() { echo "$1" | awk -F'[][ ,]+' '{printf "%d %d", ($2+$4)/2, ($3+$5)/2}'; }

# 轮询直到屏幕出现目标文本；找到返回 0，超时返回 1
poll_for() {
  local target="$1" n="${2:-10}" i
  for i in $(seq 1 "$n"); do
    uidump
    if grep -q "$target" "$UI"; then return 0; fi
    sleep 1
  done
  return 1
}

taptext() {
  local b xy
  b=$(tr '<' '\n<' < "$UI" | grep "text=\"$1\"" | grep -oE '\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]' | head -1)
  if [ -z "$b" ]; then echo "  ⚠️  找不到文本节点: $1"; return 1; fi
  xy=$(center "$b"); adb shell input tap $xy
}

# 慢速短距上滑：滚动 bottom-sheet 内容而不触发关闭手势
scrollup() { adb shell input swipe 600 1900 600 1500 700; sleep 1; uidump; }

dismiss_logbox() {
  if grep -q 'Open debugger' "$UI"; then
    adb shell input tap 1096 2460; sleep 2; uidump; echo "  （已关闭 LogBox 横幅）"
  fi
  return 0
}

# 强制复位：杀掉进程 → 深链冷启动 → 轮询等首屏
reset_app() {
  local route="${1:-assets}"
  adb shell am force-stop "$PKG"; sleep 1
  adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://${route}" "$PKG" >/dev/null 2>&1
  poll_for 'text=' 15 || { echo "  ❌ 冷启动后未拿到 UI"; return 1; }
  dismiss_logbox
  return 0
}

goto() {
  adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://$1" "$PKG" >/dev/null 2>&1
  poll_for 'text=' 12 || { echo "  ❌ 跳转后未拿到 UI"; return 1; }
  dismiss_logbox
  return 0
}

# 打开资产详情：点一次不成会重点一次，并以「购入信息」作为弹窗已打开的锚点
openasset() {
  local name="$1" try
  for try in 1 2; do
    uidump
    taptext "$name" || { sleep 2; continue; }
    if poll_for '购入信息' 10; then return 0; fi
    sleep 2
  done
  echo "  ❌ 详情弹窗未打开: $name"
  return 1
}

# 让实时参考价整块进入视口：以区块底部的说明行为锚点，
# 它可见即意味着上方的金/银单价与市值行也在视口内
align_metal_block() {
  local i
  for i in 1 2 3 4 5 6 7 8; do
    if grep -q '国际现货折算' "$UI"; then return 0; fi
    scrollup
  done
  grep -q '国际现货折算' "$UI" && return 0
  return 1
}

# 滚遍整个弹窗，报告目标文本是否「曾经」出现（用于断言区块不存在）
scroscan() {
  local target="$1" n="${2:-8}" i
  if grep -q "$target" "$UI"; then echo "found"; return 0; fi
  for i in $(seq 1 "$n"); do
    scrollup
    if grep -q "$target" "$UI"; then echo "found"; return 0; fi
  done
  echo "absent"; return 0
}

# ─── 子命令 ─────────────────────────────────────────────────
cmd_doctor() {
  echo "═══ 设备 ═══"; adb devices | sed -n 2p
  echo "═══ 应用 ═══"; adb shell dumpsys package "$PKG" | grep -E "versionName|versionCode|lastUpdateTime|DEBUGGABLE" | head -4
  echo "═══ 前台窗口 ═══"; adb shell dumpsys window 2>/dev/null | grep -m1 mCurrentFocus
  echo "═══ Metro 8081 ═══"; netstat -ano 2>/dev/null | grep -c ":8081.*LISTENING" | xargs -I{} echo "  监听数: {}"
  echo "═══ 设备网络真值（设备自带 curl）═══"
  for u in "https://api.gold-api.com/price/XAU" "https://qt.gtimg.cn/q=whUSDCNY"; do
    printf "  %-45s %s\n" "$u" "$(adb shell "curl -s -m 12 -o /dev/null -w 'HTTP=%{http_code} t=%{time_total}' '$u'" 2>&1)"
  done
  echo "═══ 数据库 ═══"; adb shell run-as "$PKG" ls -l "$DB_REMOTE" 2>&1 | head -2
}

# SQLite 完整性 + 行数清单（需要 node ≥22 的 node:sqlite；不可用时降级为文件头校验）
# 注意：node 脚本必须写成临时文件执行。用 bash 单引号内联时，SQL 里的 type='table'
# 会提前闭合外层引号导致 SQL 语法错误 —— 且错误若被 2>/dev/null 吞掉，就只剩半截输出。
_sqlite_report() {
  local winpath script
  winpath=$(cygpath -w "$1" 2>/dev/null || echo "$1")
  script="${TMPDIR:-/tmp}/wb-sqlite-report-$$.cjs"
  cat > "$script" <<'NODE_EOF'
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(process.argv[2], { readOnly: true });
const one = (sql) => db.prepare(sql).get();
console.log('  integrity_check : ' + one('PRAGMA integrity_check').integrity_check);
console.log('  journal_mode    : ' + one('PRAGMA journal_mode').journal_mode);
const fk = db.prepare('PRAGMA foreign_key_check').all();
console.log('  foreign_key_chk : ' + (fk.length ? '❌ ' + fk.length + ' 处违规' : '✅ 无违规'));
const ts = db.prepare(
  "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
).all();
console.log('  表 / 行数       : ' + ts.length + ' 张');
for (const t of ts) {
  const c = db.prepare('SELECT COUNT(*) AS c FROM "' + t.name + '"').get().c;
  console.log('    ' + t.name.padEnd(22) + String(c).padStart(6));
}
db.close();
NODE_EOF
  # 不吞 stderr：校验脚本自己出错必须看得见
  # 脚本路径也要转 Windows 形式：node 是 Windows 进程，会把 /tmp/x 解析成 <当前盘>:\tmp\x
  local winscript; winscript=$(cygpath -w "$script" 2>/dev/null || echo "$script")
  node --experimental-sqlite --no-warnings "$winscript" "$winpath"
  local rc=$?
  rm -f "$script"
  return $rc
}

cmd_backup_db() {
  mkdir -p "$BACKUP_DIR"
  # 必须先杀进程：journal_mode=delete 下，写入中途拷贝会得到不一致的库
  adb shell am force-stop "$PKG"; sleep 1

  # 事务日志兄弟文件：存在即说明上次未干净关闭，必须一并备份
  local sib; sib=$(adb shell run-as "$PKG" ls files/SQLite/ 2>/dev/null | tr -d '\r')
  echo "  SQLite 目录内容: $(echo "$sib" | tr '\n' ' ')"
  for extra in worthbase.db-journal worthbase.db-wal worthbase.db-shm; do
    if echo "$sib" | grep -qx "$extra"; then
      echo "  ⚠️  发现 $extra（上次未干净关闭），一并备份"
      adb exec-out run-as "$PKG" cat "files/SQLite/$extra" > "$BACKUP_DIR/$extra" 2>/dev/null
    fi
  done

  adb exec-out run-as "$PKG" cat "$DB_REMOTE" > "$BACKUP_DIR/worthbase.db" 2>/dev/null
  local n sha winpath
  n=$(wc -c < "$BACKUP_DIR/worthbase.db")
  sha=$(sha256sum "$BACKUP_DIR/worthbase.db" | awk '{print $1}')
  echo "  已备份 $n bytes → $BACKUP_DIR/worthbase.db"
  echo "  sha256: $sha"

  if [ "$n" -lt 10000 ]; then echo "  ❌ 备份过小（需 DEBUGGABLE 包才能 run-as）"; return 1; fi
  if ! head -c 16 "$BACKUP_DIR/worthbase.db" | grep -aq "SQLite format 3"; then
    echo "  ❌ 非 SQLite 文件头"; return 1
  fi
  echo "  ✅ 文件头有效"

  if command -v node >/dev/null && node --experimental-sqlite --no-warnings -e 'require("node:sqlite")' >/dev/null 2>&1; then
    echo "  ── 结构与完整性 ──"; _sqlite_report "$BACKUP_DIR/worthbase.db"
  else
    echo "  ⚠️  node:sqlite 不可用，跳过完整性校验（仅做了文件头检查）"
  fi

  # 指纹清单：恢复后可逐项比对
  {
    echo "backed_at=$(date -Iseconds)"
    echo "size=$n"
    echo "sha256=$sha"
    echo "device=$(adb shell getprop ro.serialno 2>/dev/null | tr -d '\r')"
    echo "app_version=$(adb shell dumpsys package "$PKG" | grep -m1 versionName | tr -d '\r' | sed 's/.*=//')"
  } > "$BACKUP_DIR/MANIFEST.txt"
  echo "  清单 → $BACKUP_DIR/MANIFEST.txt"
  return 0
}

# 恢复演练 / 实际恢复。链路已非破坏性验证过：
#   push → /data/local/tmp（chmod 666）→ run-as cp 覆盖 → chmod 600 → 校验
# 注意：cp 覆盖已存在文件会保留目标 inode 的权限与 SELinux 上下文，
#       但仍显式 chmod 600 以对齐原始的 -rw-------
cmd_restore_db() {
  local src="${1:-$BACKUP_DIR/worthbase.db}" confirm="${2:-}"
  if [ ! -f "$src" ]; then echo "  ❌ 备份文件不存在: $src"; return 1; fi
  echo "  即将用以下备份覆盖设备上的实时数据库："
  echo "    源: $src ($(wc -c < "$src") bytes, sha256 $(sha256sum "$src" | cut -c1-16)…)"
  adb shell run-as "$PKG" ls -l "$DB_REMOTE" 2>/dev/null | sed 's/^/    目标(当前): /'
  if [ "$confirm" != "--yes" ]; then
    echo "  ⛔ 未确认。这会覆盖真实账本数据，请加 --yes 显式执行（建议先 backup-db 留存当前库）"
    return 1
  fi

  adb shell am force-stop "$PKG"; sleep 1
  # 先把当前库另存一份，作为回滚点
  local rollback="$BACKUP_DIR/pre-restore-$(date +%H%M%S).db"
  adb exec-out run-as "$PKG" cat "$DB_REMOTE" > "$rollback" 2>/dev/null
  echo "  回滚点已保存: $rollback ($(wc -c < "$rollback") bytes)"

  # adb.exe 是 Windows 进程，不认 /tmp/... 这类 MSYS 绝对路径 → 必须转成 Windows 形式
  local winsrc; winsrc=$(cygpath -w "$src" 2>/dev/null || echo "$src")
  adb push "$winsrc" /data/local/tmp/wb-restore.db >/dev/null 2>&1 \
    || { echo "  ❌ push 失败（源: $winsrc）；实时库未被修改"; return 1; }
  adb shell chmod 666 /data/local/tmp/wb-restore.db
  local devsha pcsha; devsha=$(adb shell sha256sum /data/local/tmp/wb-restore.db | awk '{print $1}' | tr -d '\r'); pcsha=$(sha256sum "$src" | awk '{print $1}')
  if [ "$devsha" != "$pcsha" ]; then echo "  ❌ push 后 sha256 不一致，中止（未覆盖）"; return 1; fi
  echo "  ✅ push 无损 (sha256 一致)"

  adb shell "run-as $PKG sh -c 'cp /data/local/tmp/wb-restore.db files/SQLite/worthbase.db && chmod 600 files/SQLite/worthbase.db'" \
    || { echo "  ❌ 覆盖失败，可用回滚点恢复: $rollback"; return 1; }
  adb shell rm -f /data/local/tmp/wb-restore.db

  echo "  ── 恢复后校验 ──"
  adb shell run-as "$PKG" ls -l "$DB_REMOTE" | sed 's/^/    /'
  adb exec-out run-as "$PKG" cat "$DB_REMOTE" > "$BACKUP_DIR/post-restore.db" 2>/dev/null
  local postsha; postsha=$(sha256sum "$BACKUP_DIR/post-restore.db" | awk '{print $1}')
  [ "$postsha" = "$pcsha" ] && echo "  ✅ 设备上的库与备份逐字节一致" || echo "  ⚠️  sha256 不一致（可能已被 app 启动后写入，属正常）"
  _sqlite_report "$BACKUP_DIR/post-restore.db"

  echo "  ── 启动 app 验证可读 ──"
  adb shell am start -a android.intent.action.VIEW -d "${SCHEME}://assets" "$PKG" >/dev/null 2>&1
  if poll_for '资产概览' 15; then echo "  ✅ app 正常读到恢复后的库"; else echo "  ❌ app 未能进入资产页，请用回滚点: $rollback"; return 1; fi
  return 0
}

cmd_texts()  { uidump; texts; }
cmd_assert() { uidump; printf "  %-24s %s\n" "$1" "$(has "$1")"; }

# logcat 是全系统的：uiautomator dump 自身就会刷 AndroidRuntime / com.android.internal.os
# 行（实测一次跑动就产生 120+ 条噪音），所以崩溃必须按包名归属过滤，否则必然误报。
crash_count()    { adb logcat -d -s AndroidRuntime:E 2>/dev/null | grep -c "$PKG"; }
rn_error_count() { adb logcat -d -s ReactNativeJS:E 2>/dev/null | grep -c .; }

cmd_log() {
  echo "═══ 本 app 崩溃（AndroidRuntime 且含 $PKG）═══"
  echo "  计数: $(crash_count)"
  adb logcat -d -s AndroidRuntime:E 2>/dev/null | grep "$PKG" | tail -5
  echo "═══ 本 app RN 错误 ═══"
  echo "  计数: $(rn_error_count)"
  adb logcat -d -s ReactNativeJS:E 2>/dev/null | tail -5
  echo "═══ [MetalPrice] ═══"
  adb logcat -d 2>/dev/null | grep -i "MetalPrice" | tail -10
  echo "  (以上为空 = 无失败)"
  return 0
}

# 贵金属参考价用例 M-01~M-04（全部只读，不改用户数据）
cmd_metal() {
  local metal_asset="${1:-金子}" other_asset="${2:-尼康z5}"
  local g s mg ms fx ts1 ts2 r

  echo "═══ M-01 正常路径渲染 ═══"
  reset_app assets || return 1
  adb logcat -c 2>/dev/null
  openasset "$metal_asset" || return 1
  if align_metal_block; then echo "  已对齐区块"; else echo "  ⚠️  未找到实时参考价区块"; fi
  for k in 实时参考价 黄金 白银 按金价市值 按银价市值 汇率; do printf "  %-12s %s\n" "$k" "$(has "$k")"; done

  echo "═══ M-02 数值合理性 ═══"
  g=$(valof "黄金" | tr -d '¥/克'); s=$(valof "白银" | tr -d '¥/克')
  mg=$(valof "按金价市值（1g）" | tr -d '¥'); ms=$(valof "按银价市值（1g）" | tr -d '¥')
  fx=$(texts | grep '^汇率 ' | awk '{print $2}')
  echo "  黄金=$g 白银=$s 金市值=$mg 银市值=$ms 汇率=$fx"
  awk -v g="$g" -v s="$s" -v mg="$mg" -v ms="$ms" -v fx="$fx" 'BEGIN{
    printf "  金价 300~2000 元/克  : %s\n", (g>=300&&g<=2000)?"✅ PASS":"❌ FAIL"
    printf "  银价 3~50 元/克      : %s\n", (s>=3&&s<=50)?"✅ PASS":"❌ FAIL"
    printf "  汇率 3~15（合理性域）: %s\n", (fx>=3&&fx<=15)?"✅ PASS":"❌ FAIL"
    printf "  金市值==金价×克数    : %s (%s vs %s)\n", (mg+0==g+0)?"✅ PASS":"❌ FAIL", mg, g
    printf "  银市值==银价×克数    : %s (%s vs %s)\n", (ms+0==s+0)?"✅ PASS":"❌ FAIL", ms, s }'
  ts1=$(texts | grep '更新于\|缓存于' | head -1); echo "  时间戳: $ts1"

  echo "═══ M-03 缓存命中（10 分钟内重开，时间戳不应变化）═══"
  reset_app assets || return 1
  openasset "$metal_asset" || return 1
  align_metal_block
  ts2=$(texts | grep '更新于\|缓存于' | head -1)
  echo "  重开后: $ts2"
  if [ -n "$ts1" ] && [ "$ts1" = "$ts2" ]; then echo "  ✅ PASS 命中缓存，未重复联网"; else echo "  ❌ FAIL"; fi

  echo "═══ M-04 非贵金属资产不显示区块 ═══"
  reset_app assets || return 1
  openasset "$other_asset" || return 1
  printf "  详情已打开（分类行）: %s\n" "$(has '分类')"
  r=$(scroscan '实时参考价' 8)
  printf "  滚遍全弹窗 → 实时参考价: %s（期望 absent）%s\n" \
    "$r" "$([ "$r" = absent ] && echo '✅ PASS' || echo '❌ FAIL')"

  echo "═══ M-10 稳定性（按包名归属过滤，排除 uiautomator 自身噪音）═══"
  local crash rnerr warn
  crash=$(crash_count); rnerr=$(rn_error_count)
  warn=$(adb logcat -d 2>/dev/null | grep -ci "MetalPrice")
  printf "  本 app 崩溃=%s  RN错误=%s  MetalPrice警告=%s  %s\n" \
    "$crash" "$rnerr" "$warn" \
    "$([ "${crash:-0}" = 0 ] && [ "${rnerr:-0}" = 0 ] && echo '✅ PASS' || echo '❌ FAIL')"
  return 0
}

# 恢复/暴力测试后的数据与功能核对：三项汇总 + 贵金属参考价 + 崩溃计数
cmd_verify_data() {
  local metal_asset="${1:-金子}"
  reset_app assets || return 1
  adb logcat -c 2>/dev/null
  echo "═══ 资产页汇总（应与测试前一致）═══"
  uidump
  texts | grep -A3 '资产数量' | head -4 | sed 's/^/  /'
  texts | grep -E '^¥[0-9.,]+万?$' | head -3 | sed 's/^/  金额: /'

  echo "═══ 贵金属详情 + 实时参考价 ═══"
  openasset "$metal_asset" || return 1
  if align_metal_block; then
    printf "  实时参考价区块 ✅  黄金=%s 白银=%s 汇率=%s\n" \
      "$(valof 黄金)" "$(valof 白银)" "$(texts | grep '^汇率 ' | awk '{print $2}')"
    texts | grep '更新于\|缓存于' | head -1 | sed 's/^/  /'
  else
    echo "  ❌ 未找到实时参考价区块"
  fi

  echo "═══ 崩溃 / RN 错误 ═══"
  printf "  本 app 崩溃=%s  RN错误=%s  %s\n" \
    "$(crash_count)" "$(rn_error_count)" \
    "$([ "$(crash_count)" = 0 ] && [ "$(rn_error_count)" = 0 ] && echo '✅' || echo '❌')"
  return 0
}

case "${1:-help}" in
  doctor)    cmd_doctor ;;
  verify-data) cmd_verify_data "${2:-金子}" ;;
  backup-db) cmd_backup_db ;;
  restore-db) cmd_restore_db "${2:-}" "${3:-}" ;;
  goto)      goto "${2:?需要 route}" ;;
  open)      goto assets; openasset "${2:?需要资产名}" ;;
  texts)     cmd_texts ;;
  assert)    cmd_assert "${2:?需要断言文本}" ;;
  metal)     cmd_metal "${2:-金子}" "${3:-尼康z5}" ;;
  log)       cmd_log ;;
  *) sed -n '2,24p' "$0" ;;
esac

rm -f "$UI"
