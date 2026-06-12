package com.shotclean.myapp

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

@CapacitorPlugin(
    name = "NativeMedia",
    permissions = [
        Permission(
            alias = "storage",
            strings = ["android.permission.WRITE_EXTERNAL_STORAGE"]
        )
    ]
)
class NativeMediaPlugin : Plugin() {

    @PluginMethod
    fun saveImage(call: PluginCall) {
        val base64Data: String? = call.getString("base64")
        val filename: String = call.getString("filename", "photy_" + System.currentTimeMillis() + ".png") ?: ("photy_" + System.currentTimeMillis() + ".png")
        val mimeType: String = call.getString("mimeType", "image/png") ?: "image/png"
        
        if (base64Data == null) {
            call.reject("Base64 string is missing")
            return
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (getPermissionState("storage") != PermissionState.GRANTED) {
                requestPermissionForAlias("storage", call, "savePermissionCallback")
                return
            }
        }

        executeSaveImageAndResolve(call, base64Data, filename, mimeType)
    }

    @PermissionCallback
    fun savePermissionCallback(call: PluginCall) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            val base64Data: String = call.getString("base64") ?: ""
            val filename: String = call.getString("filename", "photy_" + System.currentTimeMillis() + ".png") ?: ("photy_" + System.currentTimeMillis() + ".png")
            val mimeType: String = call.getString("mimeType", "image/png") ?: "image/png"
            if (base64Data.isNotEmpty()) {
                executeSaveImageAndResolve(call, base64Data, filename, mimeType)
            } else {
                call.reject("Failed to get base64 data after permission approval")
            }
        } else {
            call.reject("Write external storage permission was denied")
        }
    }

    private fun executeSaveImageAndResolve(call: PluginCall, base64Str: String, filename: String, mimeType: String) {
        val ctx: Context? = getContext()
        if (ctx == null) {
            call.reject("Android Context is unavailable")
            return
        }
        val uri: Uri? = saveFileToGalleryBytes(ctx, base64Str, filename, mimeType)
        if (uri != null) {
            val response = JSObject()
            response.put("uri", uri.toString())
            call.resolve(response)
        } else {
            call.reject("Failed to save image natively")
        }
    }

    @PluginMethod
    fun saveZip(call: PluginCall) {
        val base64Data: String? = call.getString("base64")
        val filename: String = call.getString("filename", "Archive_" + System.currentTimeMillis() + ".zip") ?: ("Archive_" + System.currentTimeMillis() + ".zip")
        
        if (base64Data == null) {
            call.reject("Base64 string is missing")
            return
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (getPermissionState("storage") != PermissionState.GRANTED) {
                requestPermissionForAlias("storage", call, "saveZipPermissionCallback")
                return
            }
        }

        executeSaveZipAndResolve(call, base64Data, filename)
    }

    @PermissionCallback
    fun saveZipPermissionCallback(call: PluginCall) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            val base64Data: String = call.getString("base64") ?: ""
            val filename: String = call.getString("filename", "Archive_" + System.currentTimeMillis() + ".zip") ?: ("Archive_" + System.currentTimeMillis() + ".zip")
            if (base64Data.isNotEmpty()) {
                executeSaveZipAndResolve(call, base64Data, filename)
            } else {
                call.reject("Missing base64 data after permission approval")
            }
        } else {
            call.reject("Write external storage permission was denied")
        }
    }

    private fun executeSaveZipAndResolve(call: PluginCall, base64Str: String, filename: String) {
        val ctx: Context? = getContext()
        if (ctx == null) {
            call.reject("Android Context is unavailable")
            return
        }
        val uri: Uri? = saveZipToDownloads(ctx, base64Str, filename)
        if (uri != null) {
            val response = JSObject()
            response.put("uri", uri.toString())
            call.resolve(response)
        } else {
            call.reject("Failed to save zip natively")
        }
    }

    private fun saveZipToDownloads(androidContext: Context, base64Str: String, filename: String): Uri? {
        var fileUri: Uri? = null
        try {
            val cleanBase64 = if (base64Str.contains(",")) {
                base64Str.substring(base64Str.indexOf(",") + 1)
            } else {
                base64Str
            }
            val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = androidContext.contentResolver
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/zip")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Photy")
                }
                
                fileUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                if (fileUri != null) {
                    val fos: OutputStream? = resolver.openOutputStream(fileUri!!)
                    if (fos != null) {
                        fos.write(decodedBytes)
                        fos.flush()
                        fos.close()
                    }
                }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val myAppDir = File(downloadsDir, "Photy")
                if (!myAppDir.exists()) {
                    myAppDir.mkdirs()
                }
                val zipFile = File(myAppDir, filename)
                fileUri = Uri.fromFile(zipFile)
                val fos = FileOutputStream(zipFile)
                fos.write(decodedBytes)
                fos.flush()
                fos.close()

                MediaScannerConnection.scanFile(
                    androidContext,
                    arrayOf(zipFile.absolutePath),
                    arrayOf("application/zip"),
                    null
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
        return fileUri
    }

    @PluginMethod
    fun savePdf(call: PluginCall) {
        val base64Data: String? = call.getString("base64")
        val filename: String = call.getString("filename", "document_" + System.currentTimeMillis() + ".pdf") ?: ("document_" + System.currentTimeMillis() + ".pdf")
        
        if (base64Data == null) {
            call.reject("Base64 string is missing")
            return
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (getPermissionState("storage") != PermissionState.GRANTED) {
                requestPermissionForAlias("storage", call, "savePdfPermissionCallback")
                return
            }
        }

        executeSavePdfAndResolve(call, base64Data, filename)
    }

    @PermissionCallback
    fun savePdfPermissionCallback(call: PluginCall) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            val base64Data: String = call.getString("base64") ?: ""
            val filename: String = call.getString("filename", "document_" + System.currentTimeMillis() + ".pdf") ?: ("document_" + System.currentTimeMillis() + ".pdf")
            if (base64Data.isNotEmpty()) {
                executeSavePdfAndResolve(call, base64Data, filename)
            } else {
                call.reject("Missing base64 data after permission approval")
            }
        } else {
            call.reject("Write external storage permission was denied")
        }
    }

    private fun executeSavePdfAndResolve(call: PluginCall, base64Str: String, filename: String) {
        val ctx: Context? = getContext()
        if (ctx == null) {
            call.reject("Android Context is unavailable")
            return
        }
        val uri: Uri? = savePdfToDownloads(ctx, base64Str, filename)
        if (uri != null) {
            val response = JSObject()
            response.put("uri", uri.toString())
            call.resolve(response)
        } else {
            call.reject("Failed to save pdf natively")
        }
    }

    private fun savePdfToDownloads(androidContext: Context, base64Str: String, filename: String): Uri? {
        var fileUri: Uri? = null
        try {
            val cleanBase64 = if (base64Str.contains(",")) {
                base64Str.substring(base64Str.indexOf(",") + 1)
            } else {
                base64Str
            }
            val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = androidContext.contentResolver
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Photy")
                }
                
                fileUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                if (fileUri != null) {
                    val fos: OutputStream? = resolver.openOutputStream(fileUri!!)
                    if (fos != null) {
                        fos.write(decodedBytes)
                        fos.flush()
                        fos.close()
                    }
                }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val myAppDir = File(downloadsDir, "Photy")
                if (!myAppDir.exists()) {
                    myAppDir.mkdirs()
                }
                val pdfFile = File(myAppDir, filename)
                fileUri = Uri.fromFile(pdfFile)
                val fos = FileOutputStream(pdfFile)
                fos.write(decodedBytes)
                fos.flush()
                fos.close()

                MediaScannerConnection.scanFile(
                    androidContext,
                    arrayOf(pdfFile.absolutePath),
                    arrayOf("application/pdf"),
                    null
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
        return fileUri
    }

    @PluginMethod
    fun shareImage(call: PluginCall) {
        val base64Data: String? = call.getString("base64")
        if (base64Data == null) {
            call.reject("Base64 string is missing")
            return
        }

        val bitmap: Bitmap? = base64ToBitmap(base64Data)
        if (bitmap == null) {
            call.reject("Failed to decode base64 to bitmap")
            return
        }

        val ctx: Context? = getContext()
        if (ctx == null) {
            call.reject("Android Context is unavailable")
            return
        }

        try {
            val cachePath = File(ctx.cacheDir, "images")
            cachePath.mkdirs()
            val file = File(cachePath, "shared_image_" + System.currentTimeMillis() + ".png")
            val fos = FileOutputStream(file)
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos)
            fos.flush()
            fos.close()

            val authority: String = ctx.packageName + ".fileprovider"
            val imageUri: Uri? = FileProvider.getUriForFile(ctx, authority, file)

            if (imageUri != null) {
                shareImageIntent(ctx, imageUri)
                val response = JSObject()
                response.put("success", true)
                call.resolve(response)
            } else {
                call.reject("Could not create FileProvider content Uri")
            }
        } catch (e: Exception) {
            call.reject("Exception in sharing operation: " + e.message)
        }
    }

    private fun saveFileToGalleryBytes(androidContext: Context, base64Str: String, filename: String, mimeType: String): Uri? {
        var fileUri: Uri? = null
        try {
            val cleanBase64 = if (base64Str.contains(",")) {
                base64Str.substring(base64Str.indexOf(",") + 1)
            } else {
                base64Str
            }
            val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = androidContext.contentResolver
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                    put(MediaStore.MediaColumns.RELATIVE_PATH, "Pictures/Photy")
                }
                
                // Use Images Media collection for images
                fileUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                if (fileUri != null) {
                    val fos: OutputStream? = resolver.openOutputStream(fileUri!!)
                    if (fos != null) {
                        fos.write(decodedBytes)
                        fos.flush()
                        fos.close()
                    }
                }
            } else {
                val imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                val myAppDir = File(imagesDir, "Photy")
                if (!myAppDir.exists()) {
                    myAppDir.mkdirs()
                }
                val imageFile = File(myAppDir, filename)
                fileUri = Uri.fromFile(imageFile)
                val fos = FileOutputStream(imageFile)
                fos.write(decodedBytes)
                fos.flush()
                fos.close()

                MediaScannerConnection.scanFile(
                    androidContext,
                    arrayOf(imageFile.absolutePath),
                    arrayOf(mimeType),
                    null
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
        return fileUri
    }

    @PluginMethod
    fun convertImage(call: PluginCall) {
        val base64Data: String? = call.getString("base64")
        val format: String = call.getString("format", "avif") ?: "avif"

        if (base64Data == null) {
            call.reject("Base64 string is missing")
            return
        }

        val ctx: Context? = getContext()
        if (ctx == null) {
            call.reject("Context is null")
            return
        }

        if (format != "avif" && format != "gif") {
            call.reject("Unsupported format $format")
            return
        }

        Thread {
            try {
                val cleanBase64 = if (base64Data.contains(",")) {
                    base64Data.substring(base64Data.indexOf(",") + 1)
                } else {
                    base64Data
                }
                val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
                
                val cacheDir = ctx.cacheDir
                val inputFile = File(cacheDir, "input_${System.currentTimeMillis()}.png")
                val fos = FileOutputStream(inputFile)
                fos.write(decodedBytes)
                fos.flush()
                fos.close()

                val outputFile = File(cacheDir, "output_${System.currentTimeMillis()}.$format")

                val cmd = if (format == "avif") {
                    "-i ${inputFile.absolutePath} -c:v libaom-av1 -crf 30 -b:v 0 ${outputFile.absolutePath}"
                } else {
                    "-loop 1 -i ${inputFile.absolutePath} -vf \"fps=10,scale=320:-1\" -t 3 ${outputFile.absolutePath}"
                }

                com.arthenica.ffmpegkit.FFmpegKit.executeAsync(cmd) { session ->
                    val returnCode = session.getReturnCode()
                    if (com.arthenica.ffmpegkit.ReturnCode.isSuccess(returnCode)) {
                        try {
                            val outBytes = outputFile.readBytes()
                            val outBase64 = Base64.encodeToString(outBytes, Base64.NO_WRAP)
                            val res = JSObject()
                            res.put("base64", "data:image/$format;base64,$outBase64")
                            call.resolve(res)
                        } catch (e: Exception) {
                            call.reject("Failed to read converted file")
                        }
                    } else {
                        val state = session.getState()
                        val failTrace = session.getFailStackTrace()
                        call.reject("FFmpeg failed with state $state and rc $returnCode. $failTrace")
                    }
                }
            } catch (e: Exception) {
                call.reject("Conversion error", e)
            }
        }.start()
    }

    private fun saveImageToGallery(androidContext: Context, bitmap: Bitmap): Uri? {
        val filename = "photy_" + System.currentTimeMillis() + ".png"
        var imageUri: Uri? = null

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val resolver = androidContext.contentResolver
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, "Pictures/Photy")
                }
                
                imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                if (imageUri != null) {
                    val fos: OutputStream? = resolver.openOutputStream(imageUri!!)
                    if (fos != null) {
                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos)
                        fos.flush()
                        fos.close()
                    }
                }
            } else {
                val imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                val myAppDir = File(imagesDir, "Photy")
                if (!myAppDir.exists()) {
                    myAppDir.mkdirs()
                }
                val imageFile = File(myAppDir, filename)
                imageUri = Uri.fromFile(imageFile)
                val fos = FileOutputStream(imageFile)
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos)
                fos.flush()
                fos.close()

                MediaScannerConnection.scanFile(
                    androidContext,
                    arrayOf(imageFile.absolutePath),
                    arrayOf("image/png"),
                    null
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
        return imageUri
    }

    private fun shareImageIntent(appContext: Context, imageUri: Uri) {
        try {
            val shareIntent = Intent()
            shareIntent.action = Intent.ACTION_SEND
            shareIntent.putExtra(Intent.EXTRA_STREAM, imageUri)
            shareIntent.type = "image/png"
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)

            val chooser = Intent.createChooser(shareIntent, "Share Image")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            appContext.startActivity(chooser)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun base64ToBitmap(base64Str: String): Bitmap? {
        return try {
            val cleanBase64 = if (base64Str.contains(",")) {
                base64Str.substring(base64Str.indexOf(",") + 1)
            } else {
                base64Str
            }
            val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}
