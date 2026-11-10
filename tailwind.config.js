/** @type {import('tailwindcss').Config} */
// Tailwind is compiled at BUILD TIME into public assets.
// The old setup loaded cdn.tailwindcss.com at runtime, which silently fails in
// offline mode (or behind a blocked CDN) and destroys the whole layout.
export default {
  content: [
    './index.html',
    './*.tsx',
    './*.ts',
    './components/**/*.tsx',
  ],
  theme: {
    extend: {
      screens: { xs: '400px' },
    },
  },
  // Only the classes that are assembled at runtime (so the scanner cannot see
  // them in the source) need to be listed. Keep this list short — every entry
  // ships in the APK.
  safelist: [
    'max-h-[46vh]',
    'max-h-[52vh]',
    'max-h-[60vh]',
    'max-h-[72vh]',
    'rotate-180',
  ],
  corePlugins: {
    // The app ships its own reset in styles/app.css; Tailwind's preflight would
    // otherwise fight it.
    preflight: false,
  },
  plugins: [],
};
