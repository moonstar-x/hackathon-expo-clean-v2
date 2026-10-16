#!/bin/sh
# Merges the strings extracted by the last Simulator build into Localizable.xcstrings.
# Xcode does this automatically when building in the IDE; xcodebuild does not.
set -e
cd "$(dirname "$0")/.."
DERIVED="${DERIVED_DATA:-.build/DerivedData}"
DIR="$DERIVED/Build/Intermediates.noindex/RoomScanner.build/Debug-iphonesimulator/RoomScanner.build/Objects-normal/arm64"
find "$DIR" -name '*.stringsdata' -print0 \
  | xargs -0 printf -- '--stringsdata\0%s\0' \
  | xargs -0 xcrun xcstringstool sync RoomScanner/Resources/Localizable.xcstrings
echo "Synced Localizable.xcstrings"
