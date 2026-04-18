package com.snapclean.app.ui

import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.clickable
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.snapclean.app.processor.ImageProcessor

@Composable
fun SnapCleanApp() {
    var state by remember { mutableStateOf("upload") } // upload, processing, preview, edit
    var originalBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Untouched
    var baseBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Cropped & Resized (no drawings)
    var activeBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Baked with bindings
    var processedBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Styled with corners
    var bgColor by remember { mutableStateOf(android.graphics.Color.parseColor("#1a1a1a")) }
    var paths by remember { mutableStateOf(emptyList<com.snapclean.app.ui.DrawAction>()) }
    var texts by remember { mutableStateOf(emptyList<com.snapclean.app.ui.TextItem>()) }
    
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
                    baseBitmap = cropped
                    activeBitmap = cropped
                    paths = emptyList()
                    texts = emptyList()
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
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            androidx.compose.ui.graphics.Brush.verticalGradient(
                                colors = listOf(Color(0xFFF8FAFC), Color(0xFFE2E8F0))
                            )
                        )
                        .verticalScroll(rememberScrollState())
                        .padding(vertical = 48.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp),
                        shape = RoundedCornerShape(28.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 12.dp)
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                            modifier = Modifier.padding(32.dp).fillMaxWidth()
                        ) {
                            // Artistic Hero Icon
                            Box(modifier = Modifier.size(80.dp), contentAlignment = Alignment.Center) {
                                Box(modifier = Modifier.size(56.dp).rotate(-12f).background(Color(0xFFE2E8F0), RoundedCornerShape(12.dp)))
                                Box(modifier = Modifier.size(56.dp).rotate(8f).background(Color(0x33FF3366), RoundedCornerShape(12.dp)))
                                Box(modifier = Modifier.size(56.dp).background(Color(0xFF1E293B), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                                    Text("✨", fontSize = 24.sp)
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(24.dp))
                            
                            Text(
                                "Snap Clean", 
                                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.ExtraBold),
                                color = Color(0xFF0F172A)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "Auto-crop, enhance, and beautify your screenshot or photo in milliseconds.", 
                                color = Color(0xFF64748B),
                                textAlign = TextAlign.Center,
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Spacer(modifier = Modifier.height(36.dp))
                            
                            // Interactive Upload Zone
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(180.dp)
                                    .clickable { launcher.launch("image/*") }
                                    .background(Color(0xFFF8FAFC), RoundedCornerShape(16.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
                                    drawRoundRect(
                                        color = Color(0xFFCBD5E1),
                                        style = androidx.compose.ui.graphics.drawscope.Stroke(
                                            width = 6f,
                                            pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(20f, 20f), 0f)
                                        ),
                                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(16.dp.toPx())
                                    )
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(
                                        modifier = Modifier.size(56.dp).background(Color(0xFFEFF6FF), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("📸", fontSize = 24.sp)
                                    }
                                    Spacer(modifier = Modifier.height(16.dp))
                                    Text("Tap to Select Image", fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text("PNG, JPG, WEBP", fontSize = 12.sp, color = Color(0xFF94A3B8))
                                }
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(48.dp))
                    
                    Text(
                        "How it works",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = Color(0xFF475569)
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Before (Messy Screenshot)
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(
                                modifier = Modifier
                                    .width(100.dp)
                                    .height(180.dp)
                                    .background(Color.DarkGray, RoundedCornerShape(8.dp))
                                    .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp))
                            ) {
                                // Fake Status Bar
                                Box(modifier = Modifier.fillMaxWidth().height(14.dp).background(Color.Black, RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)))
                                // Fake App Bar
                                Box(modifier = Modifier.fillMaxWidth().height(24.dp).offset(y = 14.dp).background(Color(0xFF1E293B)))
                                // Unusable space
                                Box(modifier = Modifier.fillMaxWidth().height(32.dp).offset(y = 38.dp).background(Color(0xFF334155)))
                                // Content that user actually wants
                                Box(
                                    modifier = Modifier
                                        .padding(top = 70.dp, bottom = 40.dp, start = 8.dp, end = 8.dp)
                                        .fillMaxSize()
                                        .background(Color.White, RoundedCornerShape(6.dp))
                                ) {
                                    Column(modifier = Modifier.padding(6.dp)) {
                                        Box(modifier = Modifier.size(20.dp).background(Color(0xFFCBD5E1), CircleShape))
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Box(modifier = Modifier.fillMaxWidth().height(4.dp).background(Color(0xFFE2E8F0)))
                                        Spacer(modifier = Modifier.height(3.dp))
                                        Box(modifier = Modifier.fillMaxWidth(0.6f).height(4.dp).background(Color(0xFFE2E8F0)))
                                    }
                                }
                                // Fake Nav Bar / Ad
                                Box(modifier = Modifier.fillMaxWidth().height(24.dp).align(Alignment.BottomCenter).background(Color.Black, RoundedCornerShape(bottomStart = 8.dp, bottomEnd = 8.dp)))
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Before", color = Color(0xFF64748B), fontWeight = FontWeight.Medium, fontSize = 14.sp)
                        }
                        
                        Text("➔", fontSize = 24.sp, color = Color(0xFF94A3B8))
                        
                        // After (Cleaned and Beautified)
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(
                                modifier = Modifier
                                    .width(140.dp)
                                    .height(140.dp)
                                    .background(
                                        androidx.compose.ui.graphics.Brush.linearGradient(
                                            colors = listOf(Color(0xFF3B82F6), Color(0xFF8B5CF6))
                                        ),
                                        RoundedCornerShape(12.dp)
                                    )
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                // Content perfectly cropped, scaled, and beautified
                                Card(
                                    modifier = Modifier.width(100.dp).height(90.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                                ) {
                                    Column(modifier = Modifier.padding(10.dp)) {
                                        Box(modifier = Modifier.size(24.dp).background(Color(0xFFCBD5E1), CircleShape))
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Box(modifier = Modifier.fillMaxWidth().height(6.dp).background(Color(0xFFE2E8F0)))
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Box(modifier = Modifier.fillMaxWidth(0.6f).height(6.dp).background(Color(0xFFE2E8F0)))
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("After", color = Color(0xFF64748B), fontWeight = FontWeight.Medium, fontSize = 14.sp)
                        }
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
                if (baseBitmap != null && originalBitmap != null) {
                    CanvasEditor(
                        activeBitmap = baseBitmap!!,
                        originalBitmap = originalBitmap!!,
                        initialPaths = paths,
                        initialTexts = texts,
                        onDone = { bakedBmp, newBaseBmp, newPaths, newTexts -> 
                            activeBitmap = bakedBmp
                            baseBitmap = newBaseBmp
                            paths = newPaths
                            texts = newTexts
                            processedBitmap = ImageProcessor.applyStyle(bakedBmp, bgColor)
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
