# 🌐 مهدي — Mahdi Translator Pro

> تطبيق ترجمة احترافي ذكي وشامل — ترجمة فورية أثناء الكتابة، أكثر من **1544 ثيم**،
> ترجمة صوتية وصور ومحادثة، حزم لغات تعمل بدون إنترنت، مزامنة سحابية مربوطة بالحساب،
> وتطبيق Android قابل للتثبيت (APK / PWA).

**A professional, intelligent, all-in-one translator** — instant translation while you
type, **1544 themes**, voice / image / conversation translation, offline language packs,
account-linked cloud sync (Firestore), and an installable Android app (APK / PWA).

---

## © الحقوق / Rights & Ownership

> **جميع الحقوق محفوظة © 2027 — MAHDI**
> هذا المشروع وكل محتوياته (الكود، الثيمات، الشعارات، الأيقونات، التسمية) ملكية فكرية
> بإسم **MAHDI**. يُمنع نسخ أو إعادة نشر أو بيع أي جزء منه دون إذن كتابي صريح.
>
> **All rights reserved © 2027 — MAHDI.** This project and all of its contents (code,
> themes, logos, icons, naming) are the intellectual property of **MAHDI**. No part may
> be copied, republished, or sold without explicit written permission.

---

## ✨ المميزات / Features

### ترجمة فورية ودقيقة / Instant, accurate translation
- **ترجمة لحظية أثناء الكتابة** (بدون زر) مع محرّك عصبي (Gemini) ومحرّك محلي احتياطي.
- **كشف تلقائي** للغة المصدر مع عرض اسم اللغة المكتشفة.
- **مطابقة عبارات كاملة** (وليس كلمة-بكلمة) في المحرك المحلي: الجمل الكاملة تُترجم،
  وليس كلمة واحدة فقط.
- دعم **اللهجات** (عراقي، مصري، شامي، مغربي، خليجي) و**المجالات** (طبي، قانوني، تقني،
  ديني) و**النبرة** (رسمي، ودّود…).
- **100+ لغة** للاختيار، مع تبديل فوري للاتجاه (RTL/LTR).

### واجهة بمئات الثيمات / 1544-theme UI
- **1544 ثيم** موزعة على 16 فئة، تُطبَّق فوراً على **كل** أجزاء التطبيق.
- وضع **زجاجي شفاف** للوضع الكلاسيكي، وتحكم كامل بالتباين والحركة والتوهج والتكبير.
- مكتبة ثيمات قابلة للبحث والمعاينة (`Ctrl/Cmd + K`).

### أدوات متقدمة / Advanced tools
- 🎙️ **ترجمة صوتية** حيّة (تعرّف كلام مستمر) + **نطق** الترجمة (TTS).
- 📷 **ترجمة الصور** (OCR) وإدراج النص المترجم.
- ✍️ **رسم/كتابة يدوية** لإدخال النص.
- 💬 **وضع المحادثة** ثنائي اللغة.
- ⭐ **المفضلة** وسجل ترجمات كامل قابل للبحث والحذف.
- 🪟 **نافذة ترجمة عائمة** حرة: تُسحب من أي مكان، تغيير حجمها من **كل الحواف والزوايا
  الثماني**، تصغير/تكبير/إغلاق، وتحفظ موضعها وحجمها.

### يعمل بدون إنترنت / Offline
- محرّك محلي غني (قواميس + عبارات + لهجات) يعمل فوراً بدون اتصال.
- حزم لغات قابلة للتنزيل (`offlinePacksManager`).
- تطبيق PWA يعمل Offline عبر Service Worker.

### مزامنة سحابية / Cloud sync (Firestore)
- تسجيل دخول **Google حقيقي** عبر Firebase Auth.
- نسخ احتياطي لسجل الترجمات والمفضلة في **Firestore** مربوط بحسابك
  (`users/{uid}/history`) ليتوفر عبر كل أجهزتك.
- دمج ثنائي الاتجاه (الأحدث يفوز) وقواعد أمان تمنع وصول أي مستخدم لبيانات غير بياناته.
- وضع **محلي تلقائي** أنيق إذا لم تُضبط مفاتيح Firebase (لا ينكسر التطبيق أبداً).

### تطبيق Android / Installable app
- **PWA** قابل للتثبيت من المتصفح (يعمل ملء الشاشة ويختفي زر التثبيت تلقائياً).
- غلاف **Capacitor** أصلي يبني **APK** حقيقي متوافق مع Android 7.0+ (يغطي Xiaomi /
  Poco / Huawei / Samsung / Oppo / Vivo وعموم أجهزة العالم).
- زر «تحميل APK / تثبيت» يختفي تلقائياً عند التشغيل كتطبيق مثبّت.

---

## 🚀 التشغيل / Getting started

```bash
npm install
cp .env.example .env      # ضع GEMINI_API_KEY ومفاتيح Firebase (اختياري)
npm run dev               # http://localhost:3000
curl localhost:3000/api/health   # {"status":"ok",...}
```

التطبيق يعمل **بدون** أي مفاتيح (يعود للمحرك المحلي). المفاتيح تفعّل الترجمة العصبية
والمزامنة السحابية فقط.

### أوامر التطوير / Scripts

| الأمر | الوصف |
|---|---|
| `npm run dev` | تشغيل خادم التطوير (يحمّل `.env` تلقائياً إن وجد) |
| `npm run build` | بناء الواجهة + الخادم للإنتاج |
| `npm run start` | تشغيل النسخة المبنية |
| `npm run verify` | فحوصات الثيمات + فحص عرض التطبيق (SSR) |
| `npm run lint` / `npm run check` | فحص الأنواع / كل الفحوصات |
| `npm run icons` | توليد أيقونات PNG من SVG |
| `npm run cap:sync` | بناء الويب ونسخه لغلاف Android |
| `npm run apk:debug` / `apk:release` | بناء APK (يتطلب Android SDK) |

---

## 📱 بناء APK حقيقي / Building the real APK

الغلاف الأصلي موجود في مجلد `android/` (Capacitor 8، `minSdk 24` ≈ Android 7.0+).

**طريقة 1 — GitHub Actions (الأسهل، بدون تثبيت أي شيء):**
ادفع الفرع وسينفّذ `.github/workflows/build-apk.yml` البناء على خوادم GitHub ويحمّل
ملف `mahdi-translate.apk` كـ Artifact، أو أنشئ Release وأرفقه. رابِع التحميل يصبح على
GitHub Releases («موقع ويب للتحميل»).

**طريقة 2 — محلياً (يتطلب Android SDK + JDK 21):**
```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

**طريقة 3 — PWABuilder:** الصق رابط موقعك المنشور في
[pwabuilder.com](https://www.pwabuilder.com) واحصل على APK/TWA جاهز.

**نشر الملف على موقعك:** انسخ الـ APK إلى `public/downloads/mahdi-translate.apk`
فيصبح زر «تحميل APK» في التطبيق تحميلاً مباشراً من موقعك.

> لتوجيه الـ APK إلى خلفيتك (الـ API) عدّل `DEFAULT_REMOTE_API` في `apiBase.ts` أو
> اضبط `localStorage['mahdi_api_base']` إلى رابط موقعك. بدون ذلك يعمل الـ APK بالمحرك
> المحلي Offline بالكامل.

---

## ☁️ تفعيل المزامنة السحابية / Enabling cloud sync

1. أنشئ مشروع Firebase وفعّل **Authentication (Google)** و **Firestore**.
2. انسخ مفاتيح الويب إلى `.env` (انظر `.env.example`).
3. انشر القواعد: `firebase deploy --only firestore:rules` (الملف `firestore.rules`).
4. سجّل الدخول من زر الحساب داخل التطبيق → تُزامَن بياناتك عبر الأجهزة.

---

## 🧪 الفحص / Verification

```bash
npm run verify   # 1544 ثيم + فحص عرض كامل للتطبيق
npm run check    # verify + lint + build
```

---

## 🗂️ البنية / Structure

| الملف | الدور |
|---|---|
| `App.tsx` | الغلاف الرئيسي والثيمات والاختصارات |
| `offlineEngine.ts` | المحرك المحلي (مطابقة عبارات + لهجات) |
| `geminiService.ts` | الترجمة العصبية متعددة النماذج |
| `cloudSyncService.ts` | Firebase Auth + Firestore |
| `themeEngine/Registry/Patterns/Context` | نظام 1544 ثيم |
| `components/` | النافذة العائمة، المصادقة، التثبيت، الثيمات… |
| `android/` | غلاف Capacitor لبناء APK |
| `public/` | PWA: manifest + service worker + أيقونات |
| `server.ts` | Express API (`/api/translate`, `/api/config`…) |

---

**صُنع بحب بواسطة MAHDI © 2027 — جميع الحقوق محفوظة.**
