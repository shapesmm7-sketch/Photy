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
        val base64Data = call.getString("base64")
        if (base64Data == null) {
            call.reject("Base64 string is missing")
            return
        }

        val bitmap = base64ToBitmap(base64Data)
        if (bitmap == null) {
            call.reject("Failed to decode base64 to bitmap")
            return
        }

        // Request WRITE_EXTERNAL_STORAGE at runtime ONLY for Android < 10 (API < 29)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            if (getPermissionState("storage") != PermissionState.GRANTED) {
                requestPermissionForAlias("storage", call, "savePermissionCallback")
                return
            }
        }

        executeSaveAndResolve(call, bitmap)
    }

    @PermissionCallback
    fun savePermissionCallback(call: PluginCall) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            val base64Data = call.getString("base64") ?: ""
            val bitmap = base64ToBitmap(base64Data)
            if (bitmap != null) {
                executeSaveAndResolve(call, bitmap)
            } else {
                call.reject("Failed to decode base64 after permission approval")
            }
        } else {
            call.reject("Write external storage permission was denied")
        }
    }

    private fun executeSaveAndResolve(call: PluginCall, bitmap: Bitmap) {
        val ctx = context
        if (ctx == null) {
            call.reject("Android Context is unavailable")
            return
        }
        val uri = saveImageToGallery(ctx, bitmap)
        if (uri != null) {
            val response = JSObject()
            response.put("uri", uri.toString())
            call.resolve(response)
        } else {
            call.reject("Failed to save image natively")
        }
    }

    @PluginMethod
    fun shareImage(call: PluginCall) {
        val base64Data = call.getString("base64")
        if (base64Data == null) {
            call.reject("Base64 string is missing")
            return
        }

        val bitmap = base64ToBitmap(base64Data)
        if (bitmap == null) {
            call.reject("Failed to decode base64 to bitmap")
            return
        }

        val ctx = context
        if (ctx == null) {
            call.reject("Android Context is unavailable")
            return
        }

        try {
            // Save to temporary cache folder to avoid polluting gallery for shares
            val cachePath = File(ctx.cacheDir, "images")
            cachePath.mkdirs()
            val file = File(cachePath, "shared_image_${System.currentTimeMillis()}.png")
            val fos = FileOutputStream(file)
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos)
            fos.flush()
            fos.close()

            // Get FileProvider URI to safely share on Android 7+ (API 24+)
            val authority = "${ctx.packageName}.fileprovider"
            val imageUri = FileProvider.getUriForFile(ctx, authority, file)

            if (imageUri != null) {
                shareImageIntent(ctx, imageUri)
                val response = JSObject()
                response.put("success", true)
                call.resolve(response)
            } else {
                call.reject("Could not create FileProvider content Uri")
            }
        } catch (e: Exception) {
            call.reject("Exception in sharing operation: ${e.message}")
        }
    }

    // Required function: saveImageToGallery(androidContext, bitmap): returns Uri or File
    fun saveImageToGallery(androidContext: Context, bitmap: Bitmap): Uri? {
        val filename = "shot_clean_${System.currentTimeMillis()}.png"
        var imageUri: Uri? = null

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+): Use MediaStore API with RELATIVE_PATH = "Pictures/MyApp"
                val resolver = androidContext.contentResolver
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
                    put(MediaStore.MediaColumns.MIME_TYPE, "image/png")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, "Pictures/MyApp")
                }
                
                imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                if (imageUri != null) {
                    val fos = resolver.openOutputStream(imageUri)
                    if (fos != null) {
                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos)
                        fos.flush()
                        fos.close()
                    }
                }
            } else {
                // Android 7–9 (API 24–28): Use Environment.getExternalStoragePublicDirectory and FileOutputStream
                val imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
                val myAppDir = File(imagesDir, "MyApp")
                if (!myAppDir.exists()) {
                    myAppDir.mkdirs()
                }
                val imageFile = File(myAppDir, filename)
                imageUri = Uri.fromFile(imageFile)
                val fos = FileOutputStream(imageFile)
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos)
                fos.flush()
                fos.close()

                // Run MediaScannerConnection so the image immediately shows up in the gallery
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

    // Required function: shareImageIntent(context, file or uri)
    fun shareImageIntent(context: Context, imageUri: Uri) {
        try {
            val shareIntent = Intent()
            shareIntent.action = Intent.ACTION_SEND
            shareIntent.putExtra(Intent.EXTRA_STREAM, imageUri)
            shareIntent.type = "image/png"
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)

            val chooser = Intent.createChooser(shareIntent, "Share Image")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            context.startActivity(chooser)
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
