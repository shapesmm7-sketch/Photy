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
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.animateColorAsState
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.snapclean.app.processor.ImageProcessor
import com.snapclean.app.utils.BitmapUtils
import com.snapclean.app.utils.SmartScanner

data class SensitiveArea(
    val rect: androidx.compose.ui.geometry.Rect,
    val type: String,
    var isBlurred: Boolean = true
)

@Composable
fun SmartActionButton(
    onClick: () -> Unit,
    label: String,
    icon: String,
    containerColor: Color,
    modifier: Modifier = Modifier
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(if (isPressed) 0.95f else 1f)
    
    Button(
        onClick = onClick,
        interactionSource = interactionSource,
        modifier = modifier
            .scale(scale)
            .height(48.dp),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(containerColor = containerColor),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp, pressedElevation = 0.dp)
    ) {
        Text(icon, fontSize = 18.sp, modifier = Modifier.padding(end = 8.dp))
        Text(label, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
    }
}

@Composable
fun SnapCleanApp() {
    var state by remember { mutableStateOf("upload") } // upload, processing, preview, edit
    var originalBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Untouched
    var baseBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Cropped & Resized (no drawings)
    var activeBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Baked with bindings
    var processedBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) } // Styled with corners
    var selectedStyle by remember { mutableStateOf("Minimal") }
    var showOriginal by remember { mutableStateOf(false) }
    var isPrivacyScanning by remember { mutableStateOf(false) }
    var blurStrength by remember { mutableFloatStateOf(15f) }
    var sensitiveAreas by remember { mutableStateOf<List<SensitiveArea>>(emptyList()) }
    var memeTopText by remember { mutableStateOf("Top Text") }
    var memeBottomText by remember { mutableStateOf("Bottom Text") }
    
    // Side effect to update processedBitmap when parameters change
    LaunchedEffect(activeBitmap, selectedStyle, sensitiveAreas, blurStrength, memeTopText, memeBottomText) {
        activeBitmap?.let {
            processedBitmap = ImageProcessor.applyStyle(it, selectedStyle, sensitiveAreas = sensitiveAreas, blurStrength = blurStrength, memeTop = memeTopText, memeBottom = memeBottomText)
        }
    }
    var paths by remember { mutableStateOf(emptyList<com.snapclean.app.ui.DrawAction>()) }
    var texts by remember { mutableStateOf(emptyList<com.snapclean.app.ui.TextItem>()) }
    
    val stylePresets = listOf("Original", "Minimal", "Dark", "Instagram", "Shadow", "Meme", "Money", "Viral", "Focus", "Chat")

    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        uri?.let {
            try {
                // Downsample image to avoid OOM for large photos
                val sampledBitmap = BitmapUtils.decodeSampledBitmapFromUri(context, it, 1600, 1600)
                
                sampledBitmap?.let { bitmap ->
                    val softBitmap = bitmap.copy(android.graphics.Bitmap.Config.ARGB_8888, true)
                    originalBitmap = softBitmap
                    state = "processing"
                    
                    coroutineScope.launch {
                        delay(500) // Shorter delay
                        val cropped = ImageProcessor.autoCrop(softBitmap)
                        baseBitmap = cropped
                        activeBitmap = cropped
                        paths = emptyList()
                        texts = emptyList()
                        state = "preview"
                    }
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
                        .padding(vertical = 24.dp),
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
                            modifier = Modifier.padding(20.dp).fillMaxWidth()
                        ) {
                            // Artistic Hero Icon
                            Box(modifier = Modifier.size(60.dp), contentAlignment = Alignment.Center) {
                                Box(modifier = Modifier.size(42.dp).rotate(-12f).background(Color(0xFFE2E8F0), RoundedCornerShape(10.dp)))
                                Box(modifier = Modifier.size(42.dp).rotate(8f).background(Color(0x33FF3366), RoundedCornerShape(10.dp)))
                                Box(modifier = Modifier.size(42.dp).background(Color(0xFF1E293B), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                                    Text("✨", fontSize = 18.sp)
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            Text(
                                "Snap Clean", 
                                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.ExtraBold),
                                color = Color(0xFF0F172A)
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                "Auto-crop, enhance, and beautify your screenshot or photo in milliseconds.", 
                                color = Color(0xFF64748B),
                                textAlign = TextAlign.Center,
                                style = MaterialTheme.typography.bodySmall
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            
                            // Interactive Upload Zone
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(130.dp)
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
                                        modifier = Modifier.size(44.dp).background(Color(0xFFEFF6FF), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("📸", fontSize = 18.sp)
                                    }
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text("Tap to Select Image", fontWeight = FontWeight.Bold, color = Color(0xFF334155), fontSize = 14.sp)
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text("PNG, JPG, WEBP", fontSize = 11.sp, color = Color(0xFF94A3B8))
                                }
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Text(
                        "How it works",
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        color = Color(0xFF475569)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Before (Messy Screenshot)
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(
                                modifier = Modifier
                                    .width(76.dp)
                                    .height(140.dp)
                                    .background(Color.DarkGray, RoundedCornerShape(8.dp))
                                    .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp))
                            ) {
                                // Fake Status Bar
                                Box(modifier = Modifier.fillMaxWidth().height(10.dp).background(Color.Black, RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)))
                                // Fake App Bar
                                Box(modifier = Modifier.fillMaxWidth().height(18.dp).offset(y = 10.dp).background(Color(0xFF1E293B)))
                                // Unusable space
                                Box(modifier = Modifier.fillMaxWidth().height(26.dp).offset(y = 28.dp).background(Color(0xFF334155)))
                                // Content that user actually wants
                                Box(
                                    modifier = Modifier
                                        .padding(top = 54.dp, bottom = 30.dp, start = 6.dp, end = 6.dp)
                                        .fillMaxSize()
                                        .background(Color.White, RoundedCornerShape(6.dp))
                                ) {
                                    Column(modifier = Modifier.padding(4.dp)) {
                                        Box(modifier = Modifier.size(16.dp).background(Color(0xFFCBD5E1), CircleShape))
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Box(modifier = Modifier.fillMaxWidth().height(3.dp).background(Color(0xFFE2E8F0)))
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Box(modifier = Modifier.fillMaxWidth(0.6f).height(3.dp).background(Color(0xFFE2E8F0)))
                                    }
                                }
                                // Fake Nav Bar / Ad
                                Box(modifier = Modifier.fillMaxWidth().height(18.dp).align(Alignment.BottomCenter).background(Color.Black, RoundedCornerShape(bottomStart = 8.dp, bottomEnd = 8.dp)))
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Before", color = Color(0xFF64748B), fontWeight = FontWeight.Medium, fontSize = 12.sp)
                        }
                        
                        Text("➔", fontSize = 20.sp, color = Color(0xFF94A3B8))
                        
                        // After (Cleaned and Beautified)
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(
                                modifier = Modifier
                                    .width(110.dp)
                                    .height(110.dp)
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
                                    modifier = Modifier.width(76.dp).height(68.dp),
                                    shape = RoundedCornerShape(8.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                                ) {
                                    Column(modifier = Modifier.padding(6.dp)) {
                                        Box(modifier = Modifier.size(18.dp).background(Color(0xFFCBD5E1), CircleShape))
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Box(modifier = Modifier.fillMaxWidth().height(4.dp).background(Color(0xFFE2E8F0)))
                                        Spacer(modifier = Modifier.height(3.dp))
                                        Box(modifier = Modifier.fillMaxWidth(0.6f).height(4.dp).background(Color(0xFFE2E8F0)))
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("After", color = Color(0xFF64748B), fontWeight = FontWeight.Medium, fontSize = 12.sp)
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
                    Text("Enhancing screenshot...", color = Color.Black)
                }
            }
            "preview" -> {
                Column(
                    modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // TOP ACTION BAR
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        SmartActionButton(
                            onClick = { /* Scroll can be added if needed, styles are below */ },
                            label = "Styles",
                            icon = "✨",
                            containerColor = Color(0xFF8B5CF6),
                            modifier = Modifier.weight(1f)
                        )
                        SmartActionButton(
                            onClick = {
                                activeBitmap?.let { bmp ->
                                    isPrivacyScanning = true
                                    coroutineScope.launch {
                                        val detected = SmartScanner.scan(bmp)
                                        sensitiveAreas = detected
                                        isPrivacyScanning = false
                                    }
                                }
                            },
                            label = "Hide Info",
                            icon = "🔒",
                            containerColor = Color(0xFF10B981),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (isPrivacyScanning) {
                        Card(
                            modifier = Modifier.padding(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9))
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(12.dp)) {
                                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                Spacer(modifier = Modifier.width(12.dp))
                                Text("Detecting private info...", fontSize = 14.sp)
                            }
                        }
                    }

                    // Before / After Toggle
                    Row(
                        modifier = Modifier
                            .padding(8.dp)
                            .background(Color.White.copy(alpha = 0.9f), RoundedCornerShape(20.dp))
                            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(20.dp))
                            .padding(4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (showOriginal) Color.Transparent else Color(0xFF3B82F6))
                                .clickable { showOriginal = false }
                                .padding(horizontal = 16.dp, vertical = 6.dp)
                        ) {
                            Text("After", color = if (showOriginal) Color.Gray else Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(if (showOriginal) Color(0xFF64748B) else Color.Transparent)
                                .clickable { showOriginal = true }
                                .padding(horizontal = 16.dp, vertical = 6.dp)
                        ) {
                            Text("Before", color = if (showOriginal) Color.White else Color.Gray, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }

                    if (sensitiveAreas.isNotEmpty()) {
                        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Blur Strength", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                Spacer(modifier = Modifier.weight(1f))
                                Text("${blurStrength.toInt()}%", fontSize = 12.sp, color = Color(0xFF3B82F6))
                            }
                            Slider(
                                value = blurStrength,
                                onValueChange = { blurStrength = it },
                                valueRange = 0f..100f,
                                colors = SliderDefaults.colors(thumbColor = Color(0xFF3B82F6), activeTrackColor = Color(0xFF3B82F6))
                            )
                        }
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(420.dp)
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        val displayBitmap = if (showOriginal) originalBitmap else processedBitmap
                        displayBitmap?.let { itBmp ->
                            Image(
                                bitmap = itBmp.asImageBitmap(),
                                contentDescription = "Preview",
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(RoundedCornerShape(if (showOriginal) 0.dp else 12.dp))
                                    .pointerInput(sensitiveAreas) {
                                        detectTapGestures { offset ->
                                            val scaleX = size.width.toFloat() / itBmp.width
                                            val scaleY = size.height.toFloat() / itBmp.height
                                            sensitiveAreas = sensitiveAreas.map { area ->
                                                val scaledRect = androidx.compose.ui.geometry.Rect(
                                                    area.rect.left * scaleX,
                                                    area.rect.top * scaleY,
                                                    area.rect.right * scaleX,
                                                    area.rect.bottom * scaleY
                                                )
                                                if (scaledRect.contains(offset)) {
                                                    area.copy(isBlurred = !area.isBlurred)
                                                } else area
                                            }
                                        }
                                    }
                            )
                            
                            // Draw Privacy Boxes on top if not showOriginal
                            if (!showOriginal && sensitiveAreas.isNotEmpty()) {
                                androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
                                    sensitiveAreas.forEach { area ->
                                        if (area.isBlurred) {
                                            val scaleX = size.width / itBmp.width
                                            val scaleY = size.height / itBmp.height
                                            
                                            // Draw detection box feedback
                                            // Add a subtle border to indicate it's a hidden area
                                            drawRect(
                                                color = Color.White.copy(alpha = 0.5f),
                                                topLeft = androidx.compose.ui.geometry.Offset(area.rect.left * scaleX, area.rect.top * scaleY),
                                                size = androidx.compose.ui.geometry.Size(area.rect.width * scaleX, area.rect.height * scaleY),
                                                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.dp.toPx())
                                            )
                                        } else {
                                            // Highlight area that can be blurred again
                                            val scaleX = size.width / itBmp.width
                                            val scaleY = size.height / itBmp.height
                                            drawRect(
                                                color = Color(0xFF10B981).copy(alpha = 0.2f),
                                                topLeft = androidx.compose.ui.geometry.Offset(area.rect.left * scaleX, area.rect.top * scaleY),
                                                size = androidx.compose.ui.geometry.Size(area.rect.width * scaleX, area.rect.height * scaleY),
                                                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.dp.toPx(), pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f))
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // STYLE SELECTOR
                    Text("CHOOSE STYLE", fontWeight = FontWeight.Black, color = Color(0xFF64748B), fontSize = 12.sp, modifier = Modifier.fillMaxWidth().padding(start = 24.dp, bottom = 8.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        stylePresets.forEach { style ->
                            val config = ImageProcessor.Styles[style]
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                modifier = Modifier.clickable { 
                                    selectedStyle = style
                                }
                            ) {
                                val isSelected = selectedStyle == style
                                val bgColor = animateColorAsState(if (config?.bgColor != null) Color(config.bgColor) else Color.White).value
                                
                                Box(
                                    modifier = Modifier
                                        .size(68.dp)
                                        .scale(if (isSelected) 1.1f else 1f)
                                        .clip(RoundedCornerShape(16.dp))
                                        .then(
                                            if (config?.bgGradient != null) {
                                                Modifier.background(
                                                    brush = androidx.compose.ui.graphics.Brush.linearGradient(
                                                        colors = config.bgGradient.map { Color(it.toLong()) }
                                                    ),
                                                    shape = RoundedCornerShape(16.dp)
                                                )
                                            } else {
                                                Modifier.background(
                                                    color = bgColor,
                                                    shape = RoundedCornerShape(16.dp)
                                                )
                                            }
                                        )
                                        .border(
                                            width = if (isSelected) 3.dp else 1.dp, 
                                            color = if (isSelected) Color(0xFF3B82F6) else Color(0xFFE2E8F0), 
                                            shape = RoundedCornerShape(16.dp)
                                        )
                                        .shadow(if (isSelected) 8.dp else 0.dp, RoundedCornerShape(16.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        style.first().toString(), 
                                        fontWeight = FontWeight.Black, 
                                        fontSize = 20.sp,
                                        color = if (style == "Dark" || style == "Meme" || style == "Money" || style == "Focus" || style == "Instagram") Color.White else Color(0xFF1E293B),
                                        modifier = Modifier.shadow(if (style == "Dark" || style == "Meme" || style == "Instagram") 2.dp else 0.dp)
                                    )
                                }
                                Text(
                                    style, 
                                    fontSize = 11.sp, 
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium, 
                                    color = if (isSelected) Color(0xFF3B82F6) else Color.Gray, 
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                            }
                        }
                    }

                    if (selectedStyle == "Meme") {
                        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 12.dp)) {
                            OutlinedTextField(
                                value = memeTopText,
                                onValueChange = { memeTopText = it },
                                label = { Text("Meme Top Text") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6))
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            OutlinedTextField(
                                value = memeBottomText,
                                onValueChange = { memeBottomText = it },
                                label = { Text("Meme Bottom Text") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6))
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                    
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 32.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Main Bottom Actions
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Button(
                                onClick = { state = "edit" }, 
                                modifier = Modifier.weight(1f).height(56.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF3F4F6), contentColor = Color(0xFF475569))
                            ) { Text("Edit", fontWeight = FontWeight.Bold) }
                            
                            Button(
                                onClick = { processedBitmap?.let { shareBitmap(context, it) } }, 
                                modifier = Modifier.weight(2f).height(56.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6))
                            ) { Text("Share to Viral", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp) }
                        }
                        
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Button(
                                onClick = { processedBitmap?.let { saveImageToGallery(context, it) } }, 
                                modifier = Modifier.weight(1f).height(56.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                            ) { Text("Save", fontWeight = FontWeight.Bold) }

                            Button(
                                onClick = { state = "upload" }, 
                                modifier = Modifier.weight(1f).height(56.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF1F5F9), contentColor = Color(0xFF94A3B8))
                            ) { Text("Start Over", fontWeight = FontWeight.Medium) }
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
                            processedBitmap = ImageProcessor.applyStyle(bakedBmp, selectedStyle)
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
