# Android APK

Drop a prebuilt Android package here named `mahdi-translate.apk`.

When the file exists, the **تحميل APK / تثبيت** button in the app header becomes a
direct download. When it does not exist, the button opens an explanation of the two
supported ways to install:

1. **PWA install (no build needed):** open the app in Chrome on Android, tap the menu
   (⋮) → *Add to Home screen / Install app*. The app then launches full-screen and the
   install button hides itself automatically (it detects `display-mode: standalone`).
2. **Real signed APK:** package this project with
   [PWABuilder](https://www.pwabuilder.com) (paste the deployed URL) or
   [Capacitor](https://capacitorjs.com) (`npx cap add android`, then build in Android
   Studio). Place the resulting `.apk` here as `mahdi-translate.apk`.

The service worker (`/sw.js`) and `manifest.webmanifest` in `public/` make the PWA
installable and offline-capable out of the box.
