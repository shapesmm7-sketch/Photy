package com.snapclean.app.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.InputStream

object BitmapUtils {
    /**
     * Decodes a bitmap from a URI, downsampling it to fit within a target size to prevent OOM.
     */
    fun decodeSampledBitmapFromUri(context: Context, uri: Uri, maxWidth: Int, maxHeight: Int): Bitmap? {
        var inputStream: InputStream? = context.contentResolver.openInputStream(uri)
        
        // First decode with inJustDecodeBounds=true to check dimensions
        val options = BitmapFactory.Options().apply {
            inJustDecodeBounds = true
        }
        BitmapFactory.decodeStream(inputStream, null, options)
        inputStream?.close()

        // Calculate inSampleSize
        options.inSampleSize = calculateInSampleSize(options, maxWidth, maxHeight)

        // Decode bitmap with inSampleSize set
        options.inJustDecodeBounds = false
        inputStream = context.contentResolver.openInputStream(uri)
        val bitmap = BitmapFactory.decodeStream(inputStream, null, options)
        inputStream?.close()
        
        return bitmap
    }

    private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
        val (height: Int, width: Int) = options.outHeight to options.outWidth
        var inSampleSize = 1

        if (height > reqHeight || width > reqWidth) {
            val halfHeight: Int = height / 2
            val halfWidth: Int = width / 2

            while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }

        return inSampleSize
    }
}
