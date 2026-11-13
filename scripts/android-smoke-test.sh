#!/usr/bin/env bash
# Installs an APK on the running emulator, opens it and checks that it starts and shows a page.
# Usage: android-smoke-test.sh <apk> <package> <text expected on screen (regex)>
set -uo pipefail
APK="$1"; PKG="$2"; EXPECT="$3"
ACTIVITY="in.powersectoracademy.app.MainActivity"

echo "::group::Install $APK"
adb install -r "$APK" || { echo "::error::Install failed for $PKG"; exit 1; }
adb logcat -c
echo "::endgroup::"

adb shell am start -W -n "$PKG/$ACTIVITY" || { echo "::error::Could not start $PKG"; exit 1; }

# The free server can take about a minute to wake up, so keep looking for a while.
FOUND=""; TEXT=""
for i in $(seq 1 18); do
  sleep 10
  if ! adb shell pidof "$PKG" >/dev/null; then echo "::error::$PKG is not running after $((i*10))s (crashed or closed)"; break; fi
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  TEXT=$(adb shell cat /sdcard/ui.xml 2>/dev/null | grep -o 'text="[^"]\+"' | sed 's/^text=//' | tr '\n' ' ')
  echo "[$((i*10))s] on screen: ${TEXT:0:600}"
  if echo "$TEXT" | grep -Eqi "$EXPECT"; then FOUND=1; break; fi
done

echo "::group::App log for $PKG"
adb logcat -d -v brief | grep -E "AndroidRuntime|FATAL|Capacitor|chromium|$PKG" | grep -v "Capacitor/Plugin" | tail -150
echo "::endgroup::"

if adb logcat -d | grep -q "FATAL EXCEPTION"; then echo "::error::$PKG crashed"; exit 1; fi
if [ -z "$FOUND" ]; then echo "::error::$PKG opened but never showed text matching: $EXPECT"; exit 1; fi
echo "OK: $PKG opened and showed the expected page."
adb shell am force-stop "$PKG"
