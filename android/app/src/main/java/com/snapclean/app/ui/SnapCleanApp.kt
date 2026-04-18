package com.snapclean.app.ui

import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.clickable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.snapclean.app.processor.ImageProcessor

@Composable
fun SnapCleanApp() {
    var state by remember { mutableStateOf("upload") } // upload, processing, preview, edit
    var originalBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Untouched
    var activeBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Cropped & Drawn (raw)
    var processedBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Styled with corners
    var bgColor by remember { mutableStateOf(android.graphics.Color.parseColor("#1a1a1a")) }
    
    val bgColorsList = listOf(
        // Dark & Grayscale
        android.graphics.Color.parseColor("#1A1A1A"), // Off Black
        android.graphics.Color.parseColor("#000000"), // Pure Black
        android.graphics.Color.parseColor("#374151"), // Dark Gray
        android.graphics.Color.parseColor("#9CA3AF"), // Medium Gray
        android.graphics.Color.parseColor("#E5E7EB"), // Light Gray
        android.graphics.Color.parseColor("#FFFFFF"), // White
        
        // Blues & Cyans
        android.graphics.Color.parseColor("#0ea5e9"), // Sky Blue
        android.graphics.Color.parseColor("#3B82F6"), // Blue
        android.graphics.Color.parseColor("#2563EB"), // Royal Blue
        android.graphics.Color.parseColor("#1D4ED8"), // Deep Blue
        android.graphics.Color.parseColor("#172554"), // Navy
        android.graphics.Color.parseColor("#06B6D4"), // Cyan
        android.graphics.Color.parseColor("#0891B2"), // Deep Cyan
        
        // Greens & Teals
        android.graphics.Color.parseColor("#10B981"), // Emerald Green
        android.graphics.Color.parseColor("#059669"), // Dark Emerald
        android.graphics.Color.parseColor("#22c55e"), // Green
        android.graphics.Color.parseColor("#16a34a"), // Dark Green
        android.graphics.Color.parseColor("#14B8A6"), // Teal
        android.graphics.Color.parseColor("#0f766e"), // Dark Teal
        android.graphics.Color.parseColor("#84cc16"), // Lime
        
        // Yellows & Oranges
        android.graphics.Color.parseColor("#F59E0B"), // Amber
        android.graphics.Color.parseColor("#D97706"), // Dark Amber
        android.graphics.Color.parseColor("#eab308"), // Yellow
        android.graphics.Color.parseColor("#ca8a04"), // Dark Yellow
        android.graphics.Color.parseColor("#f97316"), // Orange
        android.graphics.Color.parseColor("#ea580c"), // Dark Orange
        
        // Reds, Pinks, & Rose
        android.graphics.Color.parseColor("#EF4444"), // Red
        android.graphics.Color.parseColor("#DC2626"), // Crimson
        android.graphics.Color.parseColor("#991b1b"), // Dark Red
        android.graphics.Color.parseColor("#ec4899"), // Pink
        android.graphics.Color.parseColor("#db2777"), // Dark Pink
        android.graphics.Color.parseColor("#f43f5e"), // Rose
        android.graphics.Color.parseColor("#be123c"), // Dark Rose
        
        // Purples & Indigos
        android.graphics.Color.parseColor("#8B5CF6"), // Violet
        android.graphics.Color.parseColor("#7C3AED"), // Deep Violet
        android.graphics.Color.parseColor("#d946ef"), // Fuchsia
        android.graphics.Color.parseColor("#a21caf"), // Deep Fuchsia
        android.graphics.Color.parseColor("#6366f1"), // Indigo
        android.graphics.Color.parseColor("#4338ca")  // Deep Indigo
    )

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let {
            try {
                val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, it))
                } else {
                    MediaStore.Images.Media.getBitmap(context.contentResolver, it)
                }
                
                val softBitmap = bitmap.copy(android.graphics.Bitmap.Config.ARGB_8888, true)
                originalBitmap = softBitmap
                state = "processing"
                
                coroutineScope.launch {
                    delay(1000)
                    val cropped = ImageProcessor.autoCrop(softBitmap)
                    activeBitmap = cropped
                    processedBitmap = ImageProcessor.applyStyle(cropped, bgColor)
                    state = "preview"
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
    
    Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFFF5F5F5)) {
        when (state) {
            "upload" -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        "Snap Clean", 
                        style = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold),
                        color = Color.Black
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Auto-crop, enhance, and beautify your screenshot.", color = Color.Gray)
                    Spacer(modifier = Modifier.height(32.dp))
                    
                    Button(
                        onClick = { launcher.launch("image/*") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Black),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(56.dp)
                    ) {
                        Text("Select Image")
                    }
                }
            }
            "processing" -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    CircularProgressIndicator(color = Color.Blue)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("Polishing Pixels...", color = Color.Black)
                }
            }
            "preview" -> {
                Column(
                    modifier = Modifier.fillMaxSize().background(Color(0xFF0A0A0A)),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    processedBitmap?.let { 
                        Image(
                            bitmap = it.asImageBitmap(), 
                            contentDescription = "Processed Screenshot",
                            modifier = Modifier.weight(1f).padding(24.dp)
                        )
                    }
                    
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 24.dp)
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        bgColorsList.forEach { colorInt ->
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .padding(4.dp)
                                    .background(Color(colorInt), CircleShape)
                                    .clickable {
                                        bgColor = colorInt
                                        activeBitmap?.let { bmp ->
                                            processedBitmap = ImageProcessor.applyStyle(bmp, colorInt)
                                        }
                                    }
                            )
                        }
                    }
                    
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 32.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Button(
                                onClick = { state = "upload" }, 
                                modifier = Modifier.weight(1f).height(56.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)
                            ) { Text("Start Over") }
                            
                            Button(
                                onClick = { state = "edit" }, 
                                modifier = Modifier.weight(1f).height(56.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)
                            ) { Text("Edit (Draw)") }
                        }
                        
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Button(
                                onClick = { processedBitmap?.let { shareBitmap(context, it) } }, 
                                modifier = Modifier.weight(1f).height(56.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)
                            ) { Text("Share") }

                            Button(
                                onClick = { processedBitmap?.let { saveImageToGallery(context, it) } }, 
                                modifier = Modifier.weight(1f).height(56.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color.Blue)
                            ) { Text("Save to Gallery") }
                        }
                    }
                }
            }
            "edit" -> {
                if (activeBitmap != null && originalBitmap != null) {
                    CanvasEditor(
                        activeBitmap = activeBitmap!!,
                        originalBitmap = originalBitmap!!,
                        onDone = { editedBmp -> 
                            activeBitmap = editedBmp
                            processedBitmap = ImageProcessor.applyStyle(editedBmp, bgColor)
                            state = "preview"
                        },
                        onCancel = { state = "preview" }
                    )
                }
            }
        }
    }
}

fun shareBitmap(context: android.content.Context, bitmap: android.graphics.Bitmap) {
    try {
        val cachePath = java.io.File(context.cacheDir, "images")
        cachePath.mkdirs()
        val file = java.io.File(cachePath, "shared_image.png")
        java.io.FileOutputStream(file).use { stream ->
            bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, stream)
        }
        val uri = androidx.core.content.FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
        
        val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(android.content.Intent.EXTRA_STREAM, uri)
            addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(android.content.Intent.createChooser(intent, "Share Image"))
    } catch (e: Exception) {
        e.printStackTrace()
        android.widget.Toast.makeText(context, "Failed to share: ${e.message}", android.widget.Toast.LENGTH_SHORT).show()
    }
}

fun saveImageToGallery(context: android.content.Context, bitmap: android.graphics.Bitmap) {
    val filename = "SnapClean_${System.currentTimeMillis()}.png"
    try {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            val contentValues = android.content.ContentValues().apply {
                put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, filename)
                put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "image/png")
                put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_PICTURES + "/SnapClean")
            }
            context.contentResolver?.also { resolver ->
                val imageUri = resolver.insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
                imageUri?.let { uri ->
                    resolver.openOutputStream(uri)?.use { fos ->
                        bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, fos)
                    }
                }
            }
        } else {
            val imagesDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_PICTURES)
            val appDir = java.io.File(imagesDir, "SnapClean").apply { if (!exists()) mkdirs() }
            val image = java.io.File(appDir, filename)
            java.io.FileOutputStream(image).use { fos ->
                bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, fos)
            }
            // For older devices, ping the media scanner
            android.media.MediaScannerConnection.scanFile(context, arrayOf(image.absolutePath), arrayOf("image/png"), null)
        }
        android.widget.Toast.makeText(context, "Saved to Gallery!", android.widget.Toast.LENGTH_SHORT).show()
    } catch (e: Exception) {
        e.printStackTrace()
        android.widget.Toast.makeText(context, "Failed to save: requires storage permissions on older devices.", android.widget.Toast.LENGTH_LONG).show()
    }
}
