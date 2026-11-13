#!/usr/bin/env bash
# Installs an APK on the running emulator, opens it and checks that it starts and shows a page.
# Usage: android-smoke-test.sh <apk> <package> <text expected on screen (regex)> [recover]
# With "recover" the app is first opened with no connection, must show its fallback page, and must then
# open the real page by itself once the connection is back (this is what a sleeping server looks like).
set -uo pipefail
APK="$1"; PKG="$2"; EXPECT="$3"; MODE="${4:-}"

screen() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  adb shell cat /sdcard/ui.xml 2>/dev/null | grep -o 'text="[^"]\+"' | sed 's/^text=//' | tr '\n' ' '
}
ACTIVITY="in.powersectoracademy.app.MainActivity"

echo "::group::Install $APK"
adb install -r "$APK" || { echo "::error::Install failed for $PKG"; exit 1; }
adb logcat -c
echo "::endgroup::"

if [ "$MODE" = "recover" ]; then
  adb shell pm clear "$PKG" >/dev/null
  adb shell cmd connectivity airplane-mode enable; sleep 5
fi

adb shell am start -W -n "$PKG/$ACTIVITY" || { echo "::error::Could not start $PKG"; exit 1; }

if [ "$MODE" = "recover" ]; then
  SEEN=""
  for i in $(seq 1 8); do
    sleep 8; TEXT=$(screen); echo "[no connection, $((i*8))s] on screen: ${TEXT:0:300}"
    if echo "$TEXT" | grep -Eqi "offline|Connecting"; then SEEN=1; break; fi
  done
  adb shell cmd connectivity airplane-mode disable
  if [ -z "$SEEN" ]; then
    adb logcat -d -v brief | grep -E "E/AndroidRuntime|FATAL|D/Capacitor\(|W/Capacitor|E/Capacitor|chromium" | tail -40
    echo "::error::$PKG did not show its fallback page without a connection"; exit 1
  fi
  echo "Connection restored; the app should now open by itself."
fi

# The free server can take about a minute to wake up, so keep looking for a while.
FOUND=""; TEXT=""
for i in $(seq 1 18); do
  sleep 10
  if ! adb shell pidof "$PKG" >/dev/null; then echo "::error::$PKG is not running after $((i*10))s (crashed or closed)"; break; fi
  TEXT=$(screen)
  echo "[$((i*10))s] on screen: ${TEXT:0:600}"
  if echo "$TEXT" | grep -Eqi "$EXPECT"; then FOUND=1; break; fi
done

echo "::group::App log for $PKG"
adb logcat -d -v brief | grep -E "E/AndroidRuntime|FATAL|D/Capacitor\(|W/Capacitor|E/Capacitor|E/chromium|I/chromium" | tail -60
echo "::endgroup::"

if adb logcat -d | grep -q "FATAL EXCEPTION"; then echo "::error::$PKG crashed"; exit 1; fi
if [ -z "$FOUND" ]; then echo "::error::$PKG opened but never showed text matching: $EXPECT"; exit 1; fi
echo "OK: $PKG opened and showed the expected page."
adb shell am force-stop "$PKG"
