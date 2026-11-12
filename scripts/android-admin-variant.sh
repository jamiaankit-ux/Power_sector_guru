#!/usr/bin/env bash
# Turns the Android project into the owner's admin app ("PSA Admin") for one build.
# Used by the "Android test app" workflow; run on a throwaway checkout, not on your working copy.
set -euo pipefail
cd "$(dirname "$0")/.."
RES=android/app/src/main/res

sed -i 's/applicationId "in.powersectoracademy.app"/applicationId "in.powersectoracademy.admin"/' android/app/build.gradle
sed -i -e 's#<string name="app_name">.*</string>#<string name="app_name">PSA Admin</string>#' \
       -e 's#<string name="title_activity_main">.*</string>#<string name="title_activity_main">PSA Admin</string>#' \
       -e 's#<string name="custom_url_scheme">.*</string>#<string name="custom_url_scheme">in.powersectoracademy.admin</string>#' "$RES/values/strings.xml"

# Admin icon: drop the adaptive icon and use the admin artwork at every density.
rm -rf "$RES/mipmap-anydpi-v26"
for d in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  dir="$RES/mipmap-${d%%:*}"; size="${d##*:}"
  convert public/icons/admin-512.png -resize "${size}x${size}" "$dir/ic_launcher.png"
  cp "$dir/ic_launcher.png" "$dir/ic_launcher_round.png"
done
grep -q 'applicationId "in.powersectoracademy.admin"' android/app/build.gradle
grep -q '>PSA Admin<' "$RES/values/strings.xml"
echo "Android project switched to the admin app."
