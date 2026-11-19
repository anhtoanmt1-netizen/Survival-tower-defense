#!/usr/bin/env bash
# Cấu hình Android SDK, JDK và debug keystore cho Godot (Editor Settings).
set -euo pipefail
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[ -n "$SDK" ] || { echo "LỖI: không tìm thấy ANDROID_HOME"; exit 1; }
JAVA="${JAVA_HOME:-}"
[ -n "$JAVA" ] || { echo "LỖI: JAVA_HOME chưa đặt"; exit 1; }
BT="34.0.0"

if [ ! -d "$SDK/build-tools/$BT" ]; then
  echo "Cài build-tools $BT ..."
  yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" "build-tools;$BT" "platforms;android-34" || true
fi
echo "SDK: $SDK"; ls "$SDK/build-tools" || true
echo "JDK: $JAVA"

KS="$(cd "$(dirname "$0")" && pwd)/debug.keystore"
if [ ! -f "$KS" ]; then
  keytool -keyalg RSA -genkeypair -alias androiddebugkey -keypass android \
    -keystore "$KS" -storepass android \
    -dname "CN=Android Debug,O=Android,C=US" -validity 9999 -deststoretype pkcs12
fi

mkdir -p "$HOME/.config/godot"
for f in editor_settings-4.tres editor_settings-4.3.tres; do
  cat > "$HOME/.config/godot/$f" <<EOT
[gd_resource type="EditorSettings" format=3]

[resource]
export/android/android_sdk_path = "$SDK"
export/android/java_sdk_path = "$JAVA"
export/android/debug_keystore = "$KS"
export/android/debug_keystore_user = "androiddebugkey"
export/android/debug_keystore_pass = "android"
EOT
done
echo "Đã ghi Editor Settings:"; cat "$HOME/.config/godot/editor_settings-4.tres"
