# 🌐 Translate Mahdi 2027 (5.1) — مهدي للترجمة

> مترجم فوري مركّز وأنيق بأسلوب **ترجمة جوجل**: ترجمة فورية أثناء الكتابة،
> إدخال صوتي، ترجمة صور وكاميرا، **نافذة عائمة قابلة للسحب**، عمل بدون إنترنت،
> أكثر من **1544 ثيم**، وتطبيق Android قابل للتثبيت (APK / PWA) — بدون حساب
> وبدون أي أزرار مشتتة.

**v5.1 — native SYSTEM_ALERT_WINDOW floating window above every app, robust local TTS, ordered top bar, horizontal chat button. A focused, Google-Translate-style instant translator** — instant debounced
translation, native Android speech recognition with a Web Speech fallback,
camera/gallery image translation with server vision plus an on-device Tesseract
OCR fallback, a draggable floating window, offline dictionary mode, history and
favourites, 1544 themes, hardware back-button handling with double-press to
exit, and an installable Android app (APK / PWA). No account, no cloud sync,
no in-app APK button.

---

## © الحقوق / Rights & Ownership

> **جميع الحقوق محفوظة © 2027 — MAHDI**
> هذا المشروع وكل محتوياته (الكود، الثيمات، الشعارات، الأيقونات، التسمية) ملكية فكرية
> بإسم **MAHDI**. يُمنع نسخ أو إعادة نشر أو بيع أي جزء منه دون إذن كتابي صريح.
>
> **All rights reserved © 2027 — MAHDI.** No part may be copied, republished, or
> sold without explicit written permission.

---

## ✨ المميزات / Features

### ⚡ ترجمة فورية
- ترجمة تلقائية أثناء الكتابة بمهلة تكيّفية (300ms أونلاين / 140ms أوفلاين).
- ترتيب المحركات الأونلاين: Google gtx المجاني بدون مفتاح ← MyMemory ← LibreTranslate،
  مع سقوط تلقائي للقاموس المحلي عند انقطاع الإنترنت.
- **ضمان عدم خروج نص بخط مختلط**: أي كلمة غير مترجمة تُنقحَر لخط اللغة الهدف
  (`ensureTargetScript` + `beautifyArabic`) في كل المسارات.
- كشف لغة تلقائي، عكس اللغتين بلمسة، معجم فوري بزمن استجابة صفر للعبارات الشائعة.

### 🎙️ الصوت والمحادثة
- تعرّف صوتي أصلي على أندرويد عبر `@capacitor-community/speech-recognition`
  (يعمل داخل WebView حيث لا تتوفر Web Speech API)، مع سقوط سلس لـ Web Speech في المتصفح.
- نطق TTS عصبي من الخادم مع سقوط تلقائي لـ SpeechSynthesis (يعمل أوفلاين).
- وضع محادثة ثنائية اللغة بين متحدثين بترجمة متبادلة ونطق تلقائي.

### 📷 الصور والكاميرا
- كاميرا حية في المتصفح (getUserMedia) وكاميرا النظام الأصلية عبر `@capacitor/camera`
  مع إدارة أذونات صحيحة على أندرويد.
- مسار ترجمة بصري عبر الخادم، وسقوط مضمون لـ **Tesseract OCR على الجهاز**
  (عربي + إنجليزي) ثم ترجمة النص المستخرج — فلا تفشل ترجمة الصور بصمت أبداً.

### 🪟 النافذة العائمة
- **على أندرويد:** نافذة أصلية عبر إذن `SYSTEM_ALERT_WINDOW` وخدمة مقدمة — فقاعة قابلة
  للسحب + لوحة WebView مستقلة تطفو فوق كل التطبيقات الأخرى ولا تختفي عند مغادرة التطبيق،
  مع دليل عربي لمنح الإذن (`OverlayPermissionGuide`).
- **على الويب/PWA:** نافذة ترجمة صغيرة قابلة للسحب والتصغير والتكبير والتحجيم داخل الصفحة،
  مع حفظ مكانها وحجمها محلياً.

### 🧭 التنقل والأجهزة
- زر الرجوع في كل النطاقات: إغلاق النوافذ أولاً، ثم **ضغطتان متتاليتان للخروج**
  من التطبيق (`@capacitor/app`) مع رسالة تأكيد.
- إبقاء الشاشة مضاءة (Wake Lock)، تثبيت PWA بلا أي زر APK داخل التطبيق،
  تصميم متجاوب مع safe-area وأهداف لمس ≥44px.

### 📚 المحلي والثيمات
- سجل ومفضلة محليان، حزم لغات أوفلاين، كتابة بخط اليد، 1544 ثيم، وتكبير الخط.

---

## 🚀 التشغيل / Getting started

```bash
npm install --ignore-scripts
npm rebuild esbuild
cp .env.example .env           # مفتاح Gemini اختياري (التطبيق يعمل بدونه)
npm run dev                    # http://localhost:3000
```

التطبيق يعمل **بدون** أي مفاتيح: المحركات المجانية والقاموس المحلي تكفي،
والمفتاح يفعّل الترجمة البصرية/السحابية الأعلى جودة فقط.

### أوامر / Scripts

| الأمر | الوصف |
|---|---|
| `npm run dev` | تشغيل خادم التطوير |
| `npm run build` | بناء الواجهة + خادم Express (حزمة OCR كسولة منفصلة) |
| `npm run lint` | فحص الأنواع TypeScript |
| `npm run verify` | فحوصات الثيمات + عرض كل شاشات التطبيق |
| `npm run icons` | توليد كل الأيقونات (PWA + Android) من `public/icons/source-3d.png` |
| `npm run cap:sync` | بناء الويب ونسخه لغلاف Android |
| `npm run apk:debug` | بناء APK محلياً (يتطلب Android SDK + JDK 21) |

---

## 📱 بناء APK / Building the APK

**GitHub Actions:** ادفع الفرع فينفّذ `.github/workflows/build-apk.yml` البناء
ويرفع `mahdi-translate.apk` كـ Artifact وينشره في `public/downloads/` للموقع.
ولإنشاء إصدار رسمي: ادفع وسماً `v*` فينفّذ `release-apk.yml` وينشئ
[GitHub Release](https://github.com/m777m44/Translate-Mahdi-2027/releases) مع ملف APK.

**محلياً:**
```bash
npm run cap:sync
cd android && ./gradlew assembleDebug
# android/app/build/outputs/apk/debug/app-debug.apk
```

إضافات Capacitor المستخدمة: `@capacitor/app` (زر الرجوع/الخروج)،
`@capacitor/camera` (الكاميرا/المعرض)، `@capacitor-community/speech-recognition`
(التعرف الصوتي الأصلي).

---

## 🗂️ البنية / Structure

| الملف | الدور |
|---|---|
| `App.tsx` | الواجهة الرئيسية بأسلوب ترجمة جوجل وسلسلة المحركات الموحدة |
| `platform.ts` | جسر الأجهزة: تعرف صوتي موحّد، زر الرجوع، الخروج، الكاميرا الأصلية |
| `floatingWindow.ts` | جسر الإضافة الأصلية للنافذة العائمة (أذونات + show/hide) مع بديل ويب |
| `tts.ts` | نطق محلي موثوق: انتظار الأصوات، إلغاء النطق السابق، مطابقة اللغة |
| `public/floating.html` | صفحة اللوحة العائمة المستقلة داخل الـWebView فوق التطبيقات |
| `android/.../FloatingWindowPlugin.java` + `FloatingWindowService.java` | إضافة كاباسيتور وخدمة TYPE_APPLICATION_OVERLAY |
| `ocr.ts` | استخراج النص من الصور عبر Tesseract (تحميل كسول عند الحاجة) |
| `transliterate.ts` | كشف الخط، النقحرة، ضمان خط الهدف، تجميل العربية |
| `offlineEngine.ts` | القاموس المحلي + الترجمة كلمة-بكلمة |
| `geminiService.ts` | عميل الخادم (ترجمة نص/صور، TTS بسقوط محلي) |
| `server.ts` | Express: محركات مجانية (Google gtx/MyMemory/LibreTranslate) + Gemini |
| `components/FloatingTranslateWindow.tsx` | النافذة العائمة القابلة للسحب والتحجيم |
| `components/ImageTranslateModal.tsx` | الكاميرا/المعرض + OCR والترجمة البصرية |
| `components/DualConversationModal.tsx` | محادثة ثنائية اللغة |
| `components/GoogleTranslateResultView.tsx` | سطح الترجمة الرئيسي |
| `themeEngine.ts` وغيرها | نظام 1544 ثيم |
| `android/` | غلاف Capacitor لبناء APK |

---

## ⚖️ إسناد المشاريع مفتوحة المصدر / Open-source attribution

- **[Tesseract.js](https://github.com/naptha/tesseract.js)** (Apache-2.0) — OCR على الجهاز.
- **[Capacitor](https://capacitorjs.com/)** (MIT) وإضافات المجتمع (App / Camera / Speech Recognition).
- **[Lucide](https://lucide.dev/)** (ISC) — الأيقونات.
- بيانات اللغات والقواميس مدمجة ومحلية؛ لا أي اعتماد على حساب أو مزامنة سحابية.

---

**صُنع بحب بواسطة MAHDI © 2027 — جميع الحقوق محفوظة.**
