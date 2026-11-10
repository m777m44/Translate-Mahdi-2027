package com.mahdi.translatepro

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * مدير التحديث الداخلي (In-App Updater).
 *
 * يجلب آخر إصدار من GitHub، يقارن أرقام الإصدار مع النسخة المثبتة، ينزّل ملف
 * APK إلى مجلد الكاش، ثم يفتح شاشة التثبيت عبر FileProvider.
 *
 * لماذا HttpURLConnection وليس OkHttp؟
 * لأن Capacitor يوفّر اتصالاً واحداً فقط لكل نداء، ولا نريد إضافة اعتمادية
 * شبكية جديدة إلى الـAPK بلا داعٍ. الدوال كلها تعمل على Dispatchers.IO لذلك
 * لا تتجمد واجهة المستخدم ولا تحدث ANR.
 */
class UpdateManager(private val context: Context) {

    companion object {
        /** مستودع المشروع الرسمي على GitHub. */
        private const val RELEASE_API =
            "https://api.github.com/repos/m777m44/Translate-Mahdi-2027/releases/latest"

        /**
         * اسم الأصل الثابت: الرابط لا يتغير أبداً ويخدم دائماً أحدث إصدار،
         * لذلك لا نعتمد على اسم الملف المتغيّر داخل كل إصدار.
         */
        private const val STABLE_ASSET_NAME = "mahdi-translate-v4.apk"

        private const val CONNECT_TIMEOUT_MS = 15_000
        private const val READ_TIMEOUT_MS = 20_000
        private const val USER_AGENT = "MahdiTranslate-Updater"
    }

    /** بيانات الإصدار المتاح على GitHub. */
    data class UpdateInfo(
        val versionName: String,
        val versionCode: Int,
        val changelog: String,
        val downloadUrl: String,
        val sizeBytes: Long,
    )

    // ───────────────────────────── فحص الإصدار ─────────────────────────────

    /**
     * يفحص آخر إصدار على GitHub.
     * @return بيانات التحديث إذا كان هناك إصدار أحدث، أو null إذا كنا محدّثين.
     * @throws Exception عند فشل الشبكة (يُعالج في طبقة الـPlugin).
     */
    suspend fun checkForUpdate(): UpdateInfo? = withContext(Dispatchers.IO) {
        val json = httpGet(RELEASE_API)
        val root = JSONObject(json)

        val tag = root.optString("tag_name", "").trim()
        if (tag.isEmpty()) return@withContext null

        val remoteVersion = tag.removePrefix("v").removePrefix("V")
        val localVersion = currentVersionName()
        if (!isNewer(remoteVersion, localVersion)) return@withContext null

        // نفضّل الأصل الثابت، ونرجع لأول ملف APK في الإصدار عند اختلاف الاسم.
        val assets = root.optJSONArray("assets")
        var url = ""
        var size = 0L
        var versionCode = 0
        if (assets != null) {
            for (i in 0 until assets.length()) {
                val asset = assets.optJSONObject(i) ?: continue
                val name = asset.optString("name", "")
                val isApk = name.endsWith(".apk", ignoreCase = true)
                versionCode = maxOf(versionCode, extractVersionCode(name))
                if (name == STABLE_ASSET_NAME) {
                    url = asset.optString("browser_download_url", "")
                    size = asset.optLong("size", 0L)
                    break
                }
                if (isApk && url.isEmpty()) {
                    url = asset.optString("browser_download_url", "")
                    size = asset.optLong("size", 0L)
                }
            }
        }
        if (url.isEmpty()) {
            url = "https://github.com/m777m44/Translate-Mahdi-2027/releases/latest/download/$STABLE_ASSET_NAME"
        }
        if (versionCode == 0) versionCode = parseVersionCode(remoteVersion)

        UpdateInfo(
            versionName = remoteVersion,
            versionCode = versionCode,
            changelog = root.optString("body", "").trim(),
            downloadUrl = url,
            sizeBytes = size,
        )
    }

    /** اسم النسخة المثبتة حالياً (مثال: 5.4.0). */
    fun currentVersionName(): String = try {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        @Suppress("DEPRECATION")
        info.versionName ?: "0.0.0"
    } catch (e: PackageManager.NameNotFoundException) {
        "0.0.0"
    }

    /** رقم النسخة المثبت حالياً (versionCode). */
    fun currentVersionCode(): Int = try {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        @Suppress("DEPRECATION")
        info.versionCode
    } catch (e: PackageManager.NameNotFoundException) {
        0
    }

    // ───────────────────────────── التنزيل ─────────────────────────────────

    /**
     * ينزّل الـAPK إلى cacheDir/updates مع الإبلاغ عن التقدّم.
     * @param onProgress نسبة مئوية 0f..1f (تُستدعى على خيط الخلفية).
     */
    suspend fun downloadApk(
        url: String,
        fileName: String = STABLE_ASSET_NAME,
        onProgress: (Float) -> Unit = {},
    ): File = withContext(Dispatchers.IO) {
        val dir = File(context.cacheDir, "updates").apply { mkdirs() }
        // نمسح أي تنزيل قديم حتى لا نثبّت ملفاً ناقصاً.
        dir.listFiles()?.forEach { it.delete() }
        val target = File(dir, fileName)
        val partial = File(dir, "$fileName.part")

        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = CONNECT_TIMEOUT_MS
            readTimeout = READ_TIMEOUT_MS
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", USER_AGENT)
            setRequestProperty("Accept", "application/octet-stream")
        }

        try {
            val status = connection.responseCode
            if (status != HttpURLConnection.HTTP_OK) {
                throw IllegalStateException("فشل التنزيل (HTTP $status)")
            }
            val total = connection.contentLengthLong
            var written = 0L
            var lastPercent = -1

            connection.inputStream.use { input ->
                FileOutputStream(partial).use { output ->
                    val buffer = ByteArray(64 * 1024)
                    while (true) {
                        val read = input.read(buffer)
                        if (read <= 0) break
                        output.write(buffer, 0, read)
                        written += read
                        if (total > 0) {
                            val percent = ((written * 100) / total).toInt()
                            if (percent != lastPercent) {
                                lastPercent = percent
                                onProgress(percent / 100f)
                            }
                        }
                    }
                    output.flush()
                }
            }

            // تحقّق بسيط: ملف APK يبدأ بالتوقيع ZIP "PK".
            val header = partial.inputStream().use { stream ->
                val bytes = ByteArray(2)
                stream.read(bytes)
                String(bytes)
            }
            if (header != "PK") {
                partial.delete()
                throw IllegalStateException("الملف المنزّل ليس حزمة APK صالحة")
            }

            if (target.exists()) target.delete()
            if (!partial.renameTo(target)) {
                partial.copyTo(target, overwrite = true)
                partial.delete()
            }
            onProgress(1f)
            target
        } finally {
            connection.disconnect()
        }
    }

    // ───────────────────────────── التثبيت ─────────────────────────────────

    /** هل يسمح النظام لهذا التطبيق بتثبيت حزم مجهولة المصدر؟ */
    fun canInstallPackages(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true
        return context.packageManager.canRequestPackageInstalls()
    }

    /** يفتح شاشة السماح بالتثبيت من مصادر غير معروفة (أندرويد 8+). */
    fun openInstallPermissionSettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val intent = Intent(
            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:${context.packageName}"),
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    /**
     * يفتح شاشة تثبيت الحزمة عبر FileProvider.
     * FileProvider إلزامي لأندرويد 7+، وإلا يرمي النظام FileUriExposedException.
     */
    fun installApk(file: File) {
        val uri: Uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file,
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    // ───────────────────────────── أدوات ───────────────────────────────────

    private fun httpGet(url: String): String {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = CONNECT_TIMEOUT_MS
            readTimeout = READ_TIMEOUT_MS
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", USER_AGENT)
            setRequestProperty("Accept", "application/vnd.github+json")
        }
        try {
            val status = connection.responseCode
            if (status == 403 || status == 429) {
                throw IllegalStateException("تجاوز حد طلبات GitHub، حاول لاحقاً")
            }
            if (status != HttpURLConnection.HTTP_OK) {
                throw IllegalStateException("فشل الاتصال بـGitHub (HTTP $status)")
            }
            return connection.inputStream.bufferedReader().use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }

    /** يحوّل versionCode المشفّر في اسم الملف (مثال: ...-vc14.apk) إن وُجد. */
    private fun extractVersionCode(name: String): Int {
        val match = Regex("""-vc(\d+)\.apk$""", RegexOption.IGNORE_CASE).find(name) ?: return 0
        return match.groupValues.getOrNull(1)?.toIntOrNull() ?: 0
    }

    /** versionCode تقريبي من رقم الإصدار: 5.4.0 → 50400. */
    private fun parseVersionCode(version: String): Int {
        val parts = version.split(".", "-").mapNotNull { it.toIntOrNull() }
        if (parts.isEmpty()) return 0
        val major = parts.getOrElse(0) { 0 }
        val minor = parts.getOrElse(1) { 0 }
        val patch = parts.getOrElse(2) { 0 }
        return major * 10_000 + minor * 100 + patch
    }
}

/**
 * مقارنة إصدارين نصيين بشكل آمن.
 * "5.4.0" > "5.3.9" → true، ويُهمل أي لاحقة مثل "-beta".
 */
fun isNewer(remote: String, local: String): Boolean {
    fun parts(value: String): List<Int> =
        value.substringBefore('-')
            .split('.')
            .map { it.filter(Char::isDigit).toIntOrNull() ?: 0 }

    val a = parts(remote)
    val b = parts(local)
    val size = maxOf(a.size, b.size)
    for (i in 0 until size) {
        val x = a.getOrElse(i) { 0 }
        val y = b.getOrElse(i) { 0 }
        if (x != y) return x > y
    }
    return false
}
