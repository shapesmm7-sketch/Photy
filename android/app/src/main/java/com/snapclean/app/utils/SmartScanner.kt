package com.snapclean.app.utils

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.snapclean.app.ui.SensitiveArea
import kotlinx.coroutines.tasks.await
import androidx.compose.ui.geometry.Rect

object SmartScanner {
    private val textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val faceDetector = FaceDetection.getClient(
        FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            .build()
    )

    private val PHONE_REGEX = Regex("(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}")
    private val EMAIL_REGEX = Regex("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}")
    private val MONEY_REGEX = Regex("(?:\\$|€|£|₹|\\bUSD|\\bEUR|\\bGBP|\\bINR)\\s?\\d+(?:[.,]\\d{2})?")
    private val TRANSACTION_ID_REGEX = Regex("\\b[A-Z0-9]{8,24}\\b")

    suspend fun scan(bitmap: Bitmap): List<SensitiveArea> {
        val image = InputImage.fromBitmap(bitmap, 0)
        val results = mutableListOf<SensitiveArea>()

        try {
            // Text Detection
            val textResult = textRecognizer.process(image).await()
            for (block in textResult.textBlocks) {
                for (line in block.lines) {
                    val lineText = line.text
                    val rect = line.boundingBox ?: continue
                    val composeRect = Rect(
                        rect.left.toFloat(),
                        rect.top.toFloat(),
                        rect.right.toFloat(),
                        rect.bottom.toFloat()
                    )

                    when {
                        EMAIL_REGEX.containsMatchIn(lineText) -> {
                            results.add(SensitiveArea(composeRect, "Email"))
                        }
                        PHONE_REGEX.containsMatchIn(lineText) -> {
                            results.add(SensitiveArea(composeRect, "Phone"))
                        }
                        MONEY_REGEX.containsMatchIn(lineText) -> {
                            results.add(SensitiveArea(composeRect, "Amount"))
                        }
                        TRANSACTION_ID_REGEX.containsMatchIn(lineText) -> {
                            results.add(SensitiveArea(composeRect, "Transaction ID"))
                        }
                        // Heuristic for names in chat: Lines that are short and capitalized
                        lineText.length in 3..20 && lineText[0].isUpperCase() && !lineText.contains(" ") -> {
                             results.add(SensitiveArea(composeRect, "Name"))
                        }
                        // Heuristic for messages: Long lines or multi-word segments
                        lineText.length > 25 || lineText.contains(" ") -> {
                             results.add(SensitiveArea(composeRect, "Message", isBlurred = false))
                        }
                    }
                }
            }

            // Face Detection (Profile Pictures)
            val faceResult = faceDetector.process(image).await()
            for (face in faceResult) {
                val rect = face.boundingBox
                results.add(SensitiveArea(
                    Rect(
                        rect.left.toFloat(),
                        rect.top.toFloat(),
                        rect.right.toFloat(),
                        rect.bottom.toFloat()
                    ),
                    "Profile"
                ))
            }

        } catch (e: Exception) {
            e.printStackTrace()
        }

        return results
    }
}
