package com.mahdi.translatepro

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * جسر التحديث بين الويب و[UpdateManager].
 *
 * الواجهة (React) تنادي:
 *   getVersion()   → الحصول على النسخة المثبتة
 *   check()        → فحص آخر إصدار على GitHub
 *   download()     → تنزيل الـAPK مع أحداث "downloadProgress"
 *   install()      → فتح شاشة التثبيت
 *   openPermission() → شاشة السماح بالمصادر غير المعروفة
 */
@CapacitorPlugin(name = "AppUpdater")
class UpdatePlugin : Plugin() {

    private val scope = CoroutineScope(SupervisorJob())
    private var downloadJob: Job? = null

    private val manager by lazy { UpdateManager(context) }

    @PluginMethod
    override fun load() {
        // لا شيء مطلوب عند التحميل؛ الجسر يُبنى تلقائياً.
    }

    /** معلومات النسخة المثبتة حالياً. */
    @PluginMethod
    fun getVersion(call: PluginCall) {
        val ret = JSObject()
        ret.put("versionName", manager.currentVersionName())
        ret.put("versionCode", manager.currentVersionCode())
        ret.put("canInstall", manager.canInstallPackages())
        call.resolve(ret)
    }

    /** هل يسمح النظام بالتثبيت من مصادر غير معروفة؟ */
    @PluginMethod
    fun canInstall(call: PluginCall) {
        val ret = JSObject()
        ret.put("canInstall", manager.canInstallPackages())
        call.resolve(ret)
    }

    /** يفتح إعدادات السماح بالتثبيت. */
    @PluginMethod
    fun openPermission(call: PluginCall) {
        try {
            manager.openInstallPermissionSettings()
            call.resolve()
        } catch (e: Exception) {
            call.reject("تعذّر فتح إعدادات التثبيت: ${e.message}")
        }
    }

    /** يفحص GitHub عن إصدار أحدث. */
    @PluginMethod
    fun check(call: PluginCall) {
        scope.launch {
            try {
                val info = manager.checkForUpdate()
                val ret = JSObject()
                ret.put("available", info != null)
                ret.put("currentVersion", manager.currentVersionName())
                ret.put("currentVersionCode", manager.currentVersionCode())
                ret.put("canInstall", manager.canInstallPackages())
                if (info != null) {
                    ret.put("versionName", info.versionName)
                    ret.put("versionCode", info.versionCode)
                    ret.put("changelog", info.changelog)
                    ret.put("downloadUrl", info.downloadUrl)
                    ret.put("sizeBytes", info.sizeBytes)
                }
                withContext(Dispatchers.Main) { call.resolve(ret) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    call.reject(e.message ?: "فشل فحص التحديث")
                }
            }
        }
    }

    /** ينزّل الـAPK ويبلغ الويب بنسبة التقدّم. */
    @PluginMethod
    fun download(call: PluginCall) {
        val url = call.getString("url") ?: run {
            call.reject("عنوان التنزيل مفقود")
            return
        }
        downloadJob?.cancel()
        downloadJob = scope.launch {
            try {
                val file = manager.downloadApk(url) { progress ->
                    val event = JSObject()
                    event.put("progress", progress.toDouble())
                    // النسبة مئوية جاهزة للعرض
                    event.put("percent", (progress * 100).toInt())
                    notifyListeners("downloadProgress", event)
                }
                val ret = JSObject()
                ret.put("path", file.absolutePath)
                ret.put("sizeBytes", file.length())
                withContext(Dispatchers.Main) { call.resolve(ret) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    call.reject(e.message ?: "فشل تنزيل التحديث")
                }
            }
        }
    }

    /** يفتح شاشة التثبيت لملف APK منزّل مسبقاً. */
    @PluginMethod
    fun install(call: PluginCall) {
        val path = call.getString("path")
        scope.launch {
            try {
                val file = if (path != null) {
                    java.io.File(path)
                } else {
                    // إن لم يُمرَّر مسار، نستخدم أحدث ملف منزّل.
                    java.io.File(context.cacheDir, "updates")
                        .listFiles()
                        ?.filter { it.extension.equals("apk", ignoreCase = true) }
                        ?.maxByOrNull { it.lastModified() }
                        ?: throw IllegalStateException("لا يوجد ملف تحديث منزّل")
                }
                if (!file.exists()) throw IllegalStateException("ملف التحديث غير موجود")
                if (!manager.canInstallPackages()) {
                    manager.openInstallPermissionSettings()
                    withContext(Dispatchers.Main) {
                        call.reject("يجب السماح بتثبيت التطبيقات من هذا المصدر أولاً")
                    }
                    return@launch
                }
                withContext(Dispatchers.Main) {
                    manager.installApk(file)
                    call.resolve()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    call.reject(e.message ?: "تعذّر بدء التثبيت")
                }
            }
        }
    }

    override fun handleOnDestroy() {
        downloadJob?.cancel()
        scope.cancel()
    }
}
