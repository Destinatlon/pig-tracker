# Pig Tracker

Fast, fully offline calorie tracker for Android. No account, no backend, all data in a local SQLite database.

Available in English and Ukrainian; the language follows the device by default and can be changed in Settings → App.

## Run on a device

Prerequisites: Node 20+, JDK 17, Android SDK with platform 36, a device with USB debugging enabled (`adb devices` should list it).

```bash
npm install
npx expo prebuild --platform android   # generates ./android (git-ignored)
npm run android:release                # builds a release APK, installs and launches it
```

The release build bundles JavaScript, so the app works with the phone disconnected and in airplane mode.
For development with hot reload use `npm run android` (needs Metro on the same network).

The APK is also written to `android/app/build/outputs/apk/release/app-release.apk` and can be copied to a phone manually.

## Verify

```bash
npm run typecheck
npm test
```
