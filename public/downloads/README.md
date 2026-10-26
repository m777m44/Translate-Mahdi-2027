# Android APK

This folder holds the website-served Android package at the **fixed path**
`public/downloads/mahdi-translate.apk`. The build workflow
(`build-apk.yml`) overwrites this same file on every successful build, so the
URL never changes while its content is always the newest build.

## الرابط الثابت الوحيد لأحدث إصدار

المستخدمون النهائيون يجب أن يستخدموا الرابط الدائم التالي — لا يتغيّر أبداً
ويُعطي دائماً آخر إصدار رسمي منشور بكامل مميزاته وتحديثاته (تحويل 302 تلقائي):

```
https://github.com/m777m44/Translate-Mahdi-2027/releases/latest/download/mahdi-translate-v4.apk
```

- اسم الأصل في كل GitHub Release مجمّد: `mahdi-translate-v4.apk` — إعادة
  التسمية تكسر الرابط الدائم (انظر التحذير في `release-apk.yml`).
- اسم ملف الموقع هنا مجمّد أيضاً: `mahdi-translate.apk`.
- لا يوجد أي زر تحميل APK داخل التطبيق نفسه؛ التثبيت الداخلي عبر PWA
  (InstallAppButton) فقط، وهذا الملف لصفحات الموقع/التحميل الخارجية.

## التثبيت
1. **PWA (بلا بناء):** افتح التطبيق في Chrome على أندرويد ← القائمة (⋮) ←
   *إضافة إلى الشاشة الرئيسية / تثبيت التطبيق*.
2. **APK:** ثبّت الملف من الرابط الثابت أعلاه فوق الإصدار السابق (معرّف الحزمة
   `com.mahdi.translatepro` ثابت).
