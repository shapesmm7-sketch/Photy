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
    data class StyleConfig(
        val bgColor: Int,
        val bgGradient: List<Int>? = null,
        val paddingFactor: Float = 0.08f,
        val cornerRadiusFactor: Float = 0.04f,
        val shadowAlpha: Int = 90,
        val contrastFactor: Float = 1.05f,
        val brightnessOffset: Float = 5f
    )

    val Styles = mapOf(
        "Original" to StyleConfig(Color.parseColor("#FFFFFF"), paddingFactor = 0f, cornerRadiusFactor = 0f, shadowAlpha = 0),
        "Minimal" to StyleConfig(Color.parseColor("#F8FAFC")),
        "Dark" to StyleConfig(Color.parseColor("#0F172A"), contrastFactor = 1.1f, brightnessOffset = 2f),
        "Instagram" to StyleConfig(
            bgColor = Color.parseColor("#f09433"),
            bgGradient = listOf(Color.parseColor("#f09433"), Color.parseColor("#e6683c"), Color.parseColor("#dc2743"), Color.parseColor("#cc2366"), Color.parseColor("#bc1888"))
        ),
        "Shadow" to StyleConfig(Color.parseColor("#E2E8F0"), shadowAlpha = 140, paddingFactor = 0.12f),
        "Meme" to StyleConfig(Color.parseColor("#FFFFFF"), paddingFactor = 0.15f, contrastFactor = 1.2f)
    )

    fun autoCrop(source: Bitmap): Bitmap {
        val cropTop = (source.height * 0.04).toInt()
        val cropBottom = (source.height * 0.05).toInt()
        
        val croppedHeight = source.height - cropTop - cropBottom
        val croppedWidth = source.width
        
        return Bitmap.createBitmap(source, 0, cropTop, croppedWidth, croppedHeight)
    }

    fun applyStyle(source: Bitmap, styleName: String = "Minimal", customColor: Int? = null): Bitmap {
        val config = Styles[styleName] ?: Styles["Minimal"]!!
        
        // 2. Padding dimensions
        val padding = (maxOf(source.width, source.height) * config.paddingFactor).toInt()
        
        val finalWidth = source.width + padding * 2
        val finalHeight = source.height + padding * 2
        
        // Create final canvas
        val output = Bitmap.createBitmap(finalWidth, finalHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        
        // Background
        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        if (config.bgGradient != null) {
            bgPaint.shader = android.graphics.LinearGradient(
                0f, 0f, finalWidth.toFloat(), finalHeight.toFloat(),
                config.bgGradient.toIntArray(),
                null,
                android.graphics.Shader.TileMode.CLAMP
            )
            canvas.drawRect(0f, 0f, finalWidth.toFloat(), finalHeight.toFloat(), bgPaint)
        } else {
            canvas.drawColor(customColor ?: config.bgColor)
        }
        
        // 3. Draw rounded rectangle shadow and clip holder
        val radius = maxOf(source.width, source.height) * config.cornerRadiusFactor
        val destRect = RectF(
            padding.toFloat(),
            padding.toFloat(),
            (padding + source.width).toFloat(),
            (padding + source.height).toFloat()
        )
        
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.color = Color.WHITE
        if (config.shadowAlpha > 0) {
            paint.setShadowLayer(
                finalWidth * 0.03f,
                0f,
                finalWidth * 0.015f,
                Color.argb(config.shadowAlpha, 0, 0, 0)
            )
        }
        
        // Draw shadow layer first
        canvas.drawRoundRect(destRect, radius, radius, paint)
        paint.clearShadowLayer()
        
        // Apply color corrections (brightness + contrast)
        val cm = ColorMatrix()
        val c = config.contrastFactor
        val b = config.brightnessOffset
        cm.set(floatArrayOf(
            c, 0f, 0f, 0f, b,
            0f, c, 0f, 0f, b,
            0f, 0f, c, 0f, b,
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
            null,
            destRect,
            paint
        )
        
        canvas.restore()
        
        // 4. Draw Watermark
        val watermarkPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        watermarkPaint.color = if (styleName == "Dark") Color.WHITE else Color.BLACK
        watermarkPaint.alpha = 100 
        watermarkPaint.textSize = finalWidth * 0.024f 
        watermarkPaint.textAlign = Paint.Align.RIGHT
        
        val watermarkText = "Edited with SnapClean"
        val xPos = finalWidth - (padding / 2f)
        val yPos = finalHeight - (padding / 4f)
        
        if (styleName != "Original") {
            canvas.drawText(watermarkText, xPos, yPos, watermarkPaint)
        }
        
        return output
    }
}
