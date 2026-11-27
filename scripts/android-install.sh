#!/bin/zsh
# Build the Himrakshak Android app and install it on a phone plugged in by USB.
#
# Phone: Settings → About phone → tap "Build number" 7 times → Developer options → USB debugging ON.
# Plug in the cable and tap "Allow" on the phone when it asks.
#
# Usage:
#   scripts/android-install.sh https://your-app.vercel.app     (best: HTTPS, so GPS and camera work)
#   scripts/android-install.sh http://<laptop-wifi-ip>:3001    (same Wi-Fi, run `npm run build && npx next start -p 3001` first;
#                                                              map, routes and alerts work, phone GPS does not over plain http)
set -e
URL=${1:?Give the app URL, e.g. scripts/android-install.sh https://himrakshak.vercel.app}

export PATH="$HOME/.local/node/bin:$PATH"
export JAVA_HOME="$HOME/.local/jdk-21/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
ADB="$ANDROID_HOME/platform-tools/adb"

cd "$(dirname "$0")/.."

if ! "$ADB" devices | grep -q "device$"; then
  echo "No phone found. Turn on USB debugging, plug in the cable, tap Allow on the phone, then run this again."
  exit 1
fi

CAP_SERVER_URL="$URL" npx cap sync android
(cd android && ./gradlew assembleDebug -q)
"$ADB" install -r android/app/build/outputs/apk/debug/app-debug.apk
"$ADB" shell monkey -p in.himrakshak.app -c android.intent.category.LAUNCHER 1 >/dev/null
echo "Installed and opened Himrakshak on the phone (server: $URL)."
