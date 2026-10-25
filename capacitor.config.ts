import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration — packages the web app as a native Android (and,
 * with `npx cap add ios`, iOS) shell so it installs like a real app.
 *
 * Build flow:
 *   npm run build          # produce dist/
 *   npx cap sync android   # copy dist/ into the native shell
 *   cd android && ./gradlew assembleDebug   # (or let the CI workflow do it)
 */
const config: CapacitorConfig = {
  appId: 'com.mahdi.translatepro',
  appName: 'Mahdi Translate',
  webDir: 'dist',
  // Serve the bundled app from assets — no network needed after install.
  server: {
    androidScheme: 'https',
    allowNavigation: [],
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowTime: 1200,
      backgroundColor: '#070a12',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
  },
};

export default config;
