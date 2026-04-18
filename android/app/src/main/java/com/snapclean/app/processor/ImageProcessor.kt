package com.snapclean.app.processor

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF

object ImageProcessor {
    fun autoProcess(source: Bitmap): Bitmap {
        // 1. Approximate Crop logic
        val cropTop = (source.height * 0.04).toInt()
        val cropBottom = (source.height * 0.05).toInt()
        
        val croppedHeight = source.height - cropTop - cropBottom
        val croppedWidth = source.width
        
        // 2. Padding dimensions
        val padding = (maxOf(croppedWidth, croppedHeight) * 0.05f).toInt()
        
        val finalWidth = croppedWidth + padding * 2
        val finalHeight = croppedHeight + padding * 2
        
        // Create final canvas
        val output = Bitmap.createBitmap(finalWidth, finalHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        
        // Fill Tech Background
        canvas.drawColor(Color.parseColor("#1a1a1a"))
        
        // 3. Draw rounded rectangle shadow and clip holder
        val radius = maxOf(croppedWidth, croppedHeight) * 0.03f
        val destRect = RectF(
            padding.toFloat(),
            padding.toFloat(),
            (padding + croppedWidth).toFloat(),
            (padding + croppedHeight).toFloat()
        )
        
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.color = Color.WHITE
        paint.setShadowLayer(
            finalWidth * 0.02f,
            0f,
            finalWidth * 0.01f,
            Color.argb(80, 0, 0, 0)
        )
        
        // Draw shadow layer first
        canvas.drawRoundRect(destRect, radius, radius, paint)
        paint.clearShadowLayer()
        
        // Apply color corrections (brightness + contrast)
        val cm = ColorMatrix()
        cm.set(floatArrayOf(
            1.05f, 0f, 0f, 0f, 5f,
            0f, 1.05f, 0f, 0f, 5f,
            0f, 0f, 1.05f, 0f, 5f,
            0f, 0f, 0f, 1f, 0f
        ))
        paint.colorFilter = ColorMatrixColorFilter(cm)
        
        // Clip to rounded corners and draw cropped image
        val clipPath = Path()
        clipPath.addRoundRect(destRect, radius, radius, Path.Direction.CW)
        canvas.save()
        canvas.clipPath(clipPath)
        
        canvas.drawBitmap(
            source,
            Rect(0, cropTop, croppedWidth, source.height - cropBottom),
            Rect(padding, padding, padding + croppedWidth, padding + croppedHeight),
            paint
        )
        
        canvas.restore()
        
        return output
    }
}
