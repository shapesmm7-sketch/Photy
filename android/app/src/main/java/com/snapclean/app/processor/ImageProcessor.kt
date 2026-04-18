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
import com.snapclean.app.ui.SensitiveArea

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
        "Meme" to StyleConfig(Color.parseColor("#000000"), paddingFactor = 0.18f),
        "Money" to StyleConfig(Color.parseColor("#065F46"), contrastFactor = 1.2f),
        "Focus" to StyleConfig(Color.parseColor("#1F2937"), paddingFactor = 0.1f),
        "Viral" to StyleConfig(Color.parseColor("#EF4444"), paddingFactor = 0.05f),
        "Chat" to StyleConfig(Color.parseColor("#ECFDF5"), paddingFactor = 0.15f, cornerRadiusFactor = 0.08f)
    )

    fun autoCrop(source: Bitmap): Bitmap {
        val cropTop = (source.height * 0.04).toInt()
        val cropBottom = (source.height * 0.05).toInt()
        
        val croppedHeight = source.height - cropTop - cropBottom
        val croppedWidth = source.width
        
        return Bitmap.createBitmap(source, 0, cropTop, croppedWidth, croppedHeight)
    }

    fun applyStyle(
        source: Bitmap, 
        styleName: String = "Minimal", 
        customColor: Int? = null, 
        sensitiveAreas: List<SensitiveArea> = emptyList(), 
        blurStrength: Float = 15f,
        memeTop: String = "",
        memeBottom: String = ""
    ): Bitmap {
        val config = Styles[styleName] ?: Styles["Minimal"]!!
        
        // 1. Process Source (Blur/Mask)
        var baseImage = source
        var isBaseImageACopy = false
        
        when (styleName) {
            "Money" -> {
                // Blur EVERYTHING except money areas
                val moneyAreas = sensitiveAreas.filter { it.type == "Amount" }
                if (moneyAreas.isNotEmpty()) {
                    val fullArea = listOf(SensitiveArea(androidx.compose.ui.geometry.Rect(0f, 0f, source.width.toFloat(), source.height.toFloat()), "BG", true))
                    baseImage = blurRegions(source, fullArea, 20f) // Blur entire BG
                    isBaseImageACopy = true
                    
                    // Draw original sharp money areas back
                    val canvas = Canvas(baseImage)
                    for (area in moneyAreas) {
                        val rect = Rect(area.rect.left.toInt(), area.rect.top.toInt(), area.rect.right.toInt(), area.rect.bottom.toInt())
                        val sharp = Bitmap.createBitmap(source, rect.left, rect.top, rect.width(), rect.height())
                        canvas.drawBitmap(sharp, rect.left.toFloat(), rect.top.toFloat(), null)
                        
                        // Green Highlight
                        val paint = Paint()
                        paint.color = Color.parseColor("#10B981")
                        paint.alpha = 40
                        canvas.drawRect(area.rect.left, area.rect.top, area.rect.right, area.rect.bottom, paint)
                        
                        // Glow border
                        paint.style = Paint.Style.STROKE
                        paint.strokeWidth = 4f
                        paint.alpha = 255
                        paint.setShadowLayer(10f, 0f, 0f, Color.parseColor("#34D399"))
                        canvas.drawRect(area.rect.left, area.rect.top, area.rect.right, area.rect.bottom, paint)
                        sharp.recycle()
                    }
                }
            }
            "Focus" -> {
                // Keep center sharp, blur edges
                val w = source.width.toFloat()
                val h = source.height.toFloat()
                val centerRect = RectF(w * 0.2f, h * 0.2f, w * 0.8f, h * 0.8f)
                val bgBlur = listOf(SensitiveArea(androidx.compose.ui.geometry.Rect(0f, 0f, w, h), "BG", true))
                baseImage = blurRegions(source, bgBlur, 40f)
                isBaseImageACopy = true
                
                val canvas = Canvas(baseImage)
                val rect = Rect(centerRect.left.toInt(), centerRect.top.toInt(), centerRect.right.toInt(), centerRect.bottom.toInt())
                val sharp = Bitmap.createBitmap(source, rect.left, rect.top, rect.width(), rect.height())
                canvas.drawBitmap(sharp, rect.left.toFloat(), rect.top.toFloat(), null)
                sharp.recycle()
            }
            else -> {
                if (sensitiveAreas.any { it.isBlurred }) {
                    baseImage = blurRegions(source, sensitiveAreas.filter { it.isBlurred }, blurStrength)
                    isBaseImageACopy = true
                }
            }
        }

        // 2. Padding dimensions
        val padding = (maxOf(baseImage.width, baseImage.height) * config.paddingFactor).toInt()
        val finalWidth = baseImage.width + padding * 2
        val finalHeight = baseImage.height + padding * 2
        
        val output = Bitmap.createBitmap(finalWidth, finalHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        
        // Background
        val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        if (config.bgGradient != null) {
            bgPaint.shader = android.graphics.LinearGradient(
                0f, 0f, finalWidth.toFloat(), finalHeight.toFloat(),
                config.bgGradient.toIntArray(), null, android.graphics.Shader.TileMode.CLAMP
            )
        } else {
            bgPaint.color = customColor ?: config.bgColor
        }
        canvas.drawRect(0f, 0f, finalWidth.toFloat(), finalHeight.toFloat(), bgPaint)
        
        // 3. Draw Screenshot Holder
        val radius = maxOf(baseImage.width, baseImage.height) * config.cornerRadiusFactor
        val destRect = RectF(
            padding.toFloat(),
            padding.toFloat(),
            (padding + baseImage.width).toFloat(),
            (padding + baseImage.height).toFloat()
        )
        
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        paint.color = Color.WHITE
        if (config.shadowAlpha > 0) {
            paint.setShadowLayer(finalWidth * 0.03f, 0f, finalWidth * 0.015f, Color.argb(config.shadowAlpha, 0, 0, 0))
        }
        canvas.drawRoundRect(destRect, radius, radius, paint)
        paint.clearShadowLayer()
        
        // Color corrections
        val cm = ColorMatrix()
        val c = config.contrastFactor
        val b = config.brightnessOffset
        cm.set(floatArrayOf(
            c, 0f, 0f, 0f, b,
            0f, c, 0f, 0f, b,
            0f, c, 0f, 0f, b,
            0f, 0f, 0f, 1f, 0f
        ))
        paint.colorFilter = ColorMatrixColorFilter(cm)
        
        val clipPath = Path()
        clipPath.addRoundRect(destRect, radius, radius, Path.Direction.CW)
        canvas.save()
        canvas.clipPath(clipPath)
        canvas.drawBitmap(baseImage, null, destRect, paint)
        canvas.restore()
        
        // Final cleanup of intermediate copy
        if (isBaseImageACopy) {
            baseImage.recycle()
        }
        
        // 4. Style-Specific Overlays
        when (styleName) {
            "Meme" -> {
                val memePaint = Paint(Paint.ANTI_ALIAS_FLAG)
                memePaint.color = Color.WHITE
                memePaint.textSize = finalWidth * 0.07f
                memePaint.textAlign = Paint.Align.CENTER
                memePaint.typeface = android.graphics.Typeface.DEFAULT_BOLD
                
                // Add black stroke
                val strokePaint = Paint(memePaint)
                strokePaint.style = Paint.Style.STROKE
                strokePaint.strokeWidth = 8f
                strokePaint.color = Color.BLACK
                
                if (memeTop.isNotEmpty()) {
                    canvas.drawText(memeTop.uppercase(), finalWidth / 2f, padding * 0.7f, strokePaint)
                    canvas.drawText(memeTop.uppercase(), finalWidth / 2f, padding * 0.7f, memePaint)
                }
                if (memeBottom.isNotEmpty()) {
                    canvas.drawText(memeBottom.uppercase(), finalWidth / 2f, finalHeight - (padding * 0.3f), strokePaint)
                    canvas.drawText(memeBottom.uppercase(), finalWidth / 2f, finalHeight - (padding * 0.3f), memePaint)
                }
            }
            "Viral" -> {
                val importantArea = sensitiveAreas.firstOrNull { it.type == "Message" || it.type == "Amount" }?.rect 
                    ?: androidx.compose.ui.geometry.Rect(source.width / 2f - 100f, source.height / 2f - 100f, source.width / 2f + 100f, source.height / 2f + 100f)
                
                val midX = padding + importantArea.center.x
                val midY = padding + importantArea.center.y
                
                // Draw a big red arrow pointing to the middle
                val arrowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
                arrowPaint.color = Color.RED
                arrowPaint.strokeWidth = minOf(finalWidth, finalHeight) * 0.02f
                arrowPaint.style = Paint.Style.STROKE
                
                // Draw Circle
                canvas.drawCircle(midX, midY, importantArea.width * 1.5f, arrowPaint)
                
                // Draw Arrow
                val arrowPath = Path()
                arrowPath.moveTo(midX + finalWidth * 0.1f, midY - finalHeight * 0.2f)
                arrowPath.lineTo(midX + finalWidth * 0.01f, midY - finalHeight * 0.05f)
                arrowPath.lineTo(midX - finalWidth * 0.1f, midY - finalHeight * 0.2f)
                canvas.drawPath(arrowPath, arrowPaint)
            }
            "Chat" -> {
                // Add a "Chat" accent - maybe a status bar or something
                val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG)
                accentPaint.color = Color.parseColor("#10B981")
                canvas.drawRect(padding.toFloat(), padding.toFloat(), (padding + baseImage.width).toFloat(), padding + (baseImage.height * 0.08f), accentPaint)
                
                // Draw Bubbles behind messages
                val bubblePaint = Paint(Paint.ANTI_ALIAS_FLAG)
                bubblePaint.color = Color.WHITE
                bubblePaint.alpha = 180
                
                val nameBlurAreas = sensitiveAreas.filter { it.type == "Name" }
                val messageAreas = sensitiveAreas.filter { it.type == "Message" }
                
                val chatCanvas = Canvas(baseImage)
                for (area in messageAreas) {
                    val rect = RectF(area.rect.left, area.rect.top, area.rect.right, area.rect.bottom)
                    // Inflate slightly for bubble look
                    rect.inset(-10f, -6f)
                    chatCanvas.drawRoundRect(rect, 20f, 20f, bubblePaint)
                }
                
                // Auto-blur names for Chat style
                if (nameBlurAreas.isNotEmpty()) {
                    baseImage = blurRegions(baseImage, nameBlurAreas, 25f)
                }
            }
        }
        
        // 5. Watermark
        if (styleName != "Original") {
            val watermarkPaint = Paint(Paint.ANTI_ALIAS_FLAG)
            watermarkPaint.color = if (styleName == "Dark") Color.WHITE else Color.BLACK
            watermarkPaint.alpha = 100 
            watermarkPaint.textSize = finalWidth * 0.024f 
            watermarkPaint.textAlign = Paint.Align.RIGHT
            val watermarkText = "Edited with SnapClean"
            canvas.drawText(watermarkText, finalWidth - (padding / 2f), finalHeight - (padding / 4f), watermarkPaint)
        }
        
        return output
    }

    private fun blurRegions(source: Bitmap, areas: List<SensitiveArea>, strength: Float): Bitmap {
        val result = source.copy(source.config, true)
        val canvas = Canvas(result)
        
        // Higher Strength -> more pixelated (less detail)
        // blurStrength in UI is 0-100.
        val downscaleFactor = (strength / 5f).coerceIn(1f, 50f).toInt()
        
        for (area in areas) {
            val rect = Rect(
                area.rect.left.toInt().coerceIn(0, source.width - 1),
                area.rect.top.toInt().coerceIn(0, source.height - 1),
                area.rect.right.toInt().coerceIn(0, source.width),
                area.rect.bottom.toInt().coerceIn(0, source.height)
            )
            
            if (rect.width() <= 0 || rect.height() <= 0) continue
            
            // Extract sub-bitmap
            val sub = Bitmap.createBitmap(source, rect.left, rect.top, rect.width(), rect.height())
            
            // Pixelate: Scale down then up
            val scaledDown = Bitmap.createScaledBitmap(
                sub, 
                maxOf(1, rect.width() / downscaleFactor), 
                maxOf(1, rect.height() / downscaleFactor), 
                false
            )
            val pixelated = Bitmap.createScaledBitmap(scaledDown, rect.width(), rect.height(), false)
            
            // Draw back onto canvas
            canvas.drawBitmap(pixelated, rect.left.toFloat(), rect.top.toFloat(), null)
            
            // Cleanup bitmaps
            sub.recycle()
            scaledDown.recycle()
            pixelated.recycle()
        }
        
        return result
    }
}
