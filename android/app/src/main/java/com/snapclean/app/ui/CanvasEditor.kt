package com.snapclean.app.ui

import android.graphics.Bitmap
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.asAndroidPath
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import kotlin.math.pow
import kotlin.math.sqrt
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp

data class DrawAction(val path: Path, val tool: String, val color: Color)
data class TextItem(val text: String, val offset: Offset, val color: Color = Color.White, val fontSize: Float = 32f, val fontName: String = "Default", val position: String = "Default")

@Composable
fun CanvasEditor(
    activeBitmap: Bitmap,
    originalBitmap: Bitmap,
    initialPaths: List<DrawAction>,
    initialTexts: List<TextItem>,
    onDone: (Bitmap, Bitmap, List<DrawAction>, List<TextItem>) -> Unit,
    onCancel: () -> Unit
) {
    var mode by remember { mutableStateOf("draw") } // "draw" or "crop"
    var drawTool by remember { mutableStateOf("NONE") } // "NONE", "PEN", "RUBBER"
    var refreshTick by remember { mutableIntStateOf(0) } // force compose layout refresh on drag
    
    // Draw state
    var paths by remember { mutableStateOf(initialPaths) }
    var currentPath by remember { mutableStateOf<Path?>(null) }
    
    // Text state
    var texts by remember { mutableStateOf(initialTexts) }
    var showTextDialog by remember { mutableStateOf(false) }
    var currentTextContent by remember { mutableStateOf("") }
    var currentTextColor by remember { mutableStateOf(Color.White) }
    var currentTextSize by remember { mutableFloatStateOf(32f) }
    var currentTextFont by remember { mutableStateOf("Default") }
    var currentTextPosition by remember { mutableStateOf("Default") } // "Default", "Top", "Bottom"
    var editingTextIndex by remember { mutableIntStateOf(-1) }
    var rubberColor by remember { mutableStateOf(Color.Black) }
    var penColor by remember { mutableStateOf(Color(0xFFFF3366)) }
    val textColors = listOf(
        Color.White, Color.LightGray, Color.Gray, Color.DarkGray, Color.Black,
        Color(0xFFFF3366), // Signature pink
        Color.Red, Color(0xFFE53935), Color(0xFFB71C1C), // Reds
        Color(0xFFFF9800), Color(0xFFF57C00), Color(0xFFE65100), // Oranges
        Color.Yellow, Color(0xFFFFEB3B), Color(0xFFFBC02D), // Yellows
        Color.Green, Color(0xFF4CAF50), Color(0xFF388E3C), Color(0xFF1B5E20), // Greens
        Color.Cyan, Color(0xFF00BCD4), Color(0xFF0097A7), // Cyans
        Color.Blue, Color(0xFF2196F3), Color(0xFF1976D2), Color(0xFF0D47A1), // Blues
        Color.Magenta, Color(0xFF9C27B0), Color(0xFF7B1FA2), Color(0xFF4A148C), // Purples
        Color(0xFFE91E63), Color(0xFFC2185B), // Pinks
        Color(0xFF795548), Color(0xFF5D4037) // Browns
    )
    val fontNames = listOf("Default", "Serif", "SansSerif", "Monospace", "Cursive")
    val localDensity = LocalDensity.current.density
    
    // Crop state
    var cropRect by remember { mutableStateOf<Rect?>(null) }
    var cropDragTarget by remember { mutableStateOf("NONE") }
    
    var boxSize by remember { mutableStateOf(IntSize.Zero) }
    
    val currentPoints = remember { mutableListOf<Offset>() }
    var lastSuggestedShape by remember { mutableStateOf<String?>(null) } // "LINE", "CIRCLE", null

    fun detectShape(points: List<Offset>): String? {
        if (points.size < 10) return null
        
        val start = points.first()
        val end = points.last()
        val directDist = sqrt((end.x - start.x).pow(2) + (end.y - start.y).pow(2))
        
        var pathDist = 0f
        for (i in 0 until points.size - 1) {
            val p1 = points[i]
            val p2 = points[i+1]
            pathDist += sqrt((p2.x - p1.x).pow(2) + (p2.y - p1.y).pow(2))
        }
        
        // Line detection
        if (directDist > 0.9f * pathDist) return "LINE"
        
        // Circle detection
        if (directDist < pathDist * 0.3f) {
            val centerX = points.map { it.x }.average().toFloat()
            val centerY = points.map { it.y }.average().toFloat()
            val radii = points.map { sqrt((it.x - centerX).pow(2) + (it.y - centerY).pow(2)) }
            val avgRadius = radii.average().toFloat()
            val variance = radii.map { (it - avgRadius).pow(2) }.average()
            val stdDev = sqrt(variance)
            if (stdDev < avgRadius * 0.25f) return "CIRCLE"
        }
        return null
    }

    Column(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        // App Bar
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(onClick = onCancel, colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)) {
                Text("Cancel")
            }
            
            if (mode == "draw") {
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp)
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Button(
                        onClick = { drawTool = if (drawTool == "PEN") "NONE" else "PEN" }, 
                        colors = ButtonDefaults.buttonColors(containerColor = if (drawTool == "PEN") Color.Blue else Color.DarkGray),
                        contentPadding = PaddingValues(0.dp),
                        modifier = Modifier.width(48.dp)
                    ) {
                        Text("✏️")
                    }
                    Button(
                        onClick = { drawTool = if (drawTool == "RUBBER") "NONE" else "RUBBER" }, 
                        colors = ButtonDefaults.buttonColors(containerColor = if (drawTool == "RUBBER") Color.Blue else Color.DarkGray),
                        contentPadding = PaddingValues(0.dp),
                        modifier = Modifier.width(48.dp)
                    ) {
                        Text("⬛")
                    }
                    Button(
                        onClick = { 
                            currentTextContent = ""
                            currentTextColor = Color.White
                            currentTextSize = 32f
                            currentTextFont = "Default"
                            currentTextPosition = "Default"
                            editingTextIndex = -1
                            showTextDialog = true 
                        }, 
                        colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray),
                        contentPadding = PaddingValues(0.dp),
                        modifier = Modifier.width(48.dp)
                    ) {
                        Text("🔤")
                    }
                    Button(
                        onClick = { if (paths.isNotEmpty()) paths = paths.dropLast(1) }, 
                        colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray),
                        contentPadding = PaddingValues(0.dp),
                        modifier = Modifier.width(48.dp)
                    ) {
                        Text("↩️")
                    }
                    Button(
                        onClick = { paths = emptyList(); texts = emptyList() }, 
                        colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray),
                        contentPadding = PaddingValues(0.dp),
                        modifier = Modifier.width(48.dp)
                    ) {
                        Text("🗑️")
                    }
                }
            } else {
                Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                    Button(onClick = { cropRect = null }, colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)) {
                        Text("Reset Crop")
                    }
                }
            }

            Button(onClick = {
                val canvasWidth = boxSize.width.toFloat()
                val canvasHeight = boxSize.height.toFloat()
                
                if (mode == "draw") {
                    if (paths.isEmpty() && currentPath == null && texts.isEmpty()) {
                        onDone(activeBitmap, activeBitmap, paths, texts)
                        return@Button
                    }
                    if (canvasWidth > 0 && canvasHeight > 0) {
                        val imgRatio = activeBitmap.width.toFloat() / activeBitmap.height
                        val canvasRatio = canvasWidth / canvasHeight
                        
                        var destWidth = canvasWidth
                        var destHeight = canvasHeight
                        if (imgRatio > canvasRatio) {
                            destHeight = canvasWidth / imgRatio
                        } else {
                            destWidth = canvasHeight * imgRatio
                        }
                        
                        val offsetX = (canvasWidth - destWidth) / 2
                        val offsetY = (canvasHeight - destHeight) / 2
                        val scale = activeBitmap.width.toFloat() / destWidth
                        
                        val topTextSize = texts.filter { it.position == "Top" }.maxOfOrNull { it.fontSize } ?: 0f
                        val bottomTextSize = texts.filter { it.position == "Bottom" }.maxOfOrNull { it.fontSize } ?: 0f
                        
                        val topPadPx = (topTextSize * 1.5f * localDensity * scale).toInt()
                        val botPadPx = (bottomTextSize * 1.5f * localDensity * scale).toInt()
                        
                        val finalWidth = activeBitmap.width
                        val finalHeight = activeBitmap.height + topPadPx + botPadPx
                        
                        val finalBitmap = Bitmap.createBitmap(finalWidth, finalHeight, Bitmap.Config.ARGB_8888)
                        val androidCanvas = android.graphics.Canvas(finalBitmap)
                        androidCanvas.drawColor(android.graphics.Color.BLACK)
                        
                        // Draw screenshot into final bitmap
                        androidCanvas.drawBitmap(activeBitmap, 0f, topPadPx.toFloat(), null)
                        
                        val matrix = android.graphics.Matrix()
                        matrix.postTranslate(-offsetX, -offsetY)
                        matrix.postScale(scale, scale)
                        matrix.postTranslate(0f, topPadPx.toFloat())
                        
                        val allPaths = paths.toMutableList()
                        currentPath?.let { allPaths.add(DrawAction(it, drawTool, if (drawTool == "RUBBER") rubberColor else penColor)) }
                        
                        allPaths.forEach { drawAct ->
                            val androidPath = android.graphics.Path(drawAct.path.asAndroidPath())
                            androidPath.transform(matrix)
                            
                            val paint = android.graphics.Paint().apply {
                                style = android.graphics.Paint.Style.STROKE
                                strokeCap = android.graphics.Paint.Cap.ROUND
                                strokeJoin = android.graphics.Paint.Join.ROUND
                                isAntiAlias = true
                                color = drawAct.color.toArgb()
                                strokeWidth = if (drawAct.tool == "RUBBER") 40f * scale else 15f * scale
                            }
                            
                            androidCanvas.drawPath(androidPath, paint)
                        }
                        
                        texts.forEach { textItem ->
                            val textPxSize = textItem.fontSize * localDensity
                            val textPaint = android.graphics.Paint().apply {
                                color = textItem.color.toArgb()
                                textSize = textPxSize * scale
                                isAntiAlias = true
                                textAlign = android.graphics.Paint.Align.CENTER
                                typeface = when (textItem.fontName) {
                                    "Serif" -> android.graphics.Typeface.create(android.graphics.Typeface.SERIF, android.graphics.Typeface.BOLD)
                                    "SansSerif" -> android.graphics.Typeface.create(android.graphics.Typeface.SANS_SERIF, android.graphics.Typeface.BOLD)
                                    "Monospace" -> android.graphics.Typeface.create(android.graphics.Typeface.MONOSPACE, android.graphics.Typeface.BOLD)
                                    "Cursive" -> android.graphics.Typeface.create("cursive", android.graphics.Typeface.BOLD)
                                    else -> android.graphics.Typeface.DEFAULT_BOLD
                                }
                            }
                            
                            // textItem.offset.x is relative to the center since we use Alignment.TopCenter
                            val viewX = (canvasWidth / 2f) + textItem.offset.x
                            val textX = (viewX - offsetX) * scale
                            
                            // Offset by 16dp vertically to account for the Box padding added for hit bounds
                            val yOffsetFix = 16f * localDensity
                            val textY = (textItem.offset.y + yOffsetFix - offsetY) * scale - textPaint.ascent() + topPadPx
                            
                            androidCanvas.drawText(textItem.text, textX, textY, textPaint)
                        }
                        
                        onDone(finalBitmap, activeBitmap, paths, texts)
                    } else {
                        onDone(activeBitmap, activeBitmap, paths, texts)
                    }
                } else if (mode == "crop") {
                    if (cropRect == null) {
                        onDone(originalBitmap, originalBitmap, emptyList(), emptyList())
                        return@Button
                    }
                    val imgRatio = originalBitmap.width.toFloat() / originalBitmap.height
                    val canvasRatio = canvasWidth / canvasHeight
                    
                    var destWidth = canvasWidth
                    var destHeight = canvasHeight
                    if (imgRatio > canvasRatio) {
                        destHeight = canvasWidth / imgRatio
                    } else {
                        destWidth = canvasHeight * imgRatio
                    }
                    
                    val offsetX = (canvasWidth - destWidth) / 2
                    val offsetY = (canvasHeight - destHeight) / 2
                    val scale = originalBitmap.width.toFloat() / destWidth
                    
                    val cRect = cropRect!!
                    
                    // Transform cropRect to originalBitmap coordinates
                    val startX = ((cRect.left - offsetX) * scale).toInt().coerceIn(0, originalBitmap.width - 1)
                    val startY = ((cRect.top - offsetY) * scale).toInt().coerceIn(0, originalBitmap.height - 1)
                    val endX = ((cRect.right - offsetX) * scale).toInt().coerceIn(startX + 1, originalBitmap.width)
                    val endY = ((cRect.bottom - offsetY) * scale).toInt().coerceIn(startY + 1, originalBitmap.height)
                    
                    val width = (endX - startX).coerceAtLeast(1)
                    val height = (endY - startY).coerceAtLeast(1)
                    
                    val finalBitmap = Bitmap.createBitmap(originalBitmap, startX, startY, width, height)
                    onDone(finalBitmap, finalBitmap, emptyList(), emptyList())
                }
            }, colors = ButtonDefaults.buttonColors(containerColor = Color.Blue)) {
                Text("Done")
            }
        }
        
        if (mode == "draw" && (drawTool == "PEN" || drawTool == "RUBBER")) {
            LazyRow(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                items(textColors) { color ->
                    val isSelected = if (drawTool == "RUBBER") rubberColor == color else penColor == color
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(color, CircleShape)
                            .border(
                                width = if (isSelected) 3.dp else 1.dp,
                                color = if (isSelected) Color.Gray else Color.DarkGray,
                                shape = CircleShape
                            )
                            .clickable {
                                if (drawTool == "RUBBER") rubberColor = color else penColor = color
                            }
                    )
                }
            }
        }
        
        // Canvas Area
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(16.dp)
                .onSizeChanged { boxSize = it },
            contentAlignment = Alignment.Center
        ) {
            val renderBmp = if (mode == "draw") activeBitmap else originalBitmap
            val imgBitmap = remember(renderBmp) { renderBmp.asImageBitmap() }
            
            var dragStart by remember { mutableStateOf(Offset.Zero) }
            
            Canvas(modifier = Modifier.fillMaxSize().pointerInput(mode, drawTool) {
                detectDragGestures(
                    onDragStart = { offset ->
                        if (mode == "draw" && drawTool != "NONE") {
                            currentPath = Path().apply { moveTo(offset.x, offset.y) }
                            currentPoints.clear()
                            currentPoints.add(offset)
                            lastSuggestedShape = null
                        } else if (mode == "crop") {
                            if (cropRect != null) {
                                val cr = cropRect!!
                                val x = offset.x
                                val y = offset.y
                                val threshold = 40f
                                
                                val isLeft = kotlin.math.abs(x - cr.left) < threshold
                                val isRight = kotlin.math.abs(x - cr.right) < threshold
                                val isTop = kotlin.math.abs(y - cr.top) < threshold
                                val isBottom = kotlin.math.abs(y - cr.bottom) < threshold
                                
                                val isInsideX = x > cr.left + threshold && x < cr.right - threshold
                                val isInsideY = y > cr.top + threshold && y < cr.bottom - threshold

                                cropDragTarget = when {
                                    cr.width < 100f && cr.height < 100f && cr.contains(offset) -> "CENTER"
                                    isTop && isLeft -> "TOP_LEFT"
                                    isTop && isRight -> "TOP_RIGHT"
                                    isBottom && isLeft -> "BOTTOM_LEFT"
                                    isBottom && isRight -> "BOTTOM_RIGHT"
                                    isTop && isInsideX -> "TOP"
                                    isBottom && isInsideX -> "BOTTOM"
                                    isLeft && isInsideY -> "LEFT"
                                    isRight && isInsideY -> "RIGHT"
                                    cr.contains(offset) -> "CENTER"
                                    else -> "NEW"
                                }
                                
                                if (cropDragTarget == "NEW") {
                                    dragStart = offset
                                    cropRect = Rect(offset, offset)
                                } else if (cropDragTarget == "CENTER") {
                                    dragStart = offset
                                }
                            } else {
                                cropDragTarget = "NEW"
                                dragStart = offset
                                cropRect = Rect(offset, offset)
                            }
                        }
                    },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        if (mode == "draw" && drawTool != "NONE") {
                            currentPath?.lineTo(change.position.x, change.position.y)
                            currentPoints.add(change.position)
                            refreshTick++
                        } else if (mode == "crop" && cropRect != null) {
                            val cr = cropRect!!
                            val x = change.position.x
                            val y = change.position.y
                            
                            when (cropDragTarget) {
                                "NEW" -> {
                                    cropRect = Rect(
                                        left = minOf(dragStart.x, x),
                                        top = minOf(dragStart.y, y),
                                        right = maxOf(dragStart.x, x),
                                        bottom = maxOf(dragStart.y, y)
                                    )
                                }
                                "CENTER" -> {
                                    cropRect = Rect(cr.left + dragAmount.x, cr.top + dragAmount.y, cr.right + dragAmount.x, cr.bottom + dragAmount.y)
                                }
                                "TOP_LEFT" -> cropRect = Rect(minOf(x, cr.right - 50f), minOf(y, cr.bottom - 50f), cr.right, cr.bottom)
                                "TOP_RIGHT" -> cropRect = Rect(cr.left, minOf(y, cr.bottom - 50f), maxOf(x, cr.left + 50f), cr.bottom)
                                "BOTTOM_LEFT" -> cropRect = Rect(minOf(x, cr.right - 50f), cr.top, cr.right, maxOf(y, cr.top + 50f))
                                "BOTTOM_RIGHT" -> cropRect = Rect(cr.left, cr.top, maxOf(x, cr.left + 50f), maxOf(y, cr.top + 50f))
                                "TOP" -> cropRect = Rect(cr.left, minOf(y, cr.bottom - 50f), cr.right, cr.bottom)
                                "BOTTOM" -> cropRect = Rect(cr.left, cr.top, cr.right, maxOf(y, cr.top + 50f))
                                "LEFT" -> cropRect = Rect(minOf(x, cr.right - 50f), cr.top, cr.right, cr.bottom)
                                "RIGHT" -> cropRect = Rect(cr.left, cr.top, maxOf(x, cr.left + 50f), cr.bottom)
                            }
                            refreshTick++
                        }
                    },
                    onDragEnd = {
                        if (mode == "draw" && drawTool != "NONE") {
                            currentPath?.let { 
                                paths = paths + DrawAction(it, drawTool, if (drawTool == "RUBBER") rubberColor else penColor) 
                            }
                            lastSuggestedShape = detectShape(currentPoints)
                            currentPath = null
                        }
                        cropDragTarget = "NONE"
                    }
                )
            }) {
                val currentTick = refreshTick 
                
                // Draw Base Image fitted efficiently
                val canvasWidth = size.width
                val canvasHeight = size.height
                val imgRatio = imgBitmap.width.toFloat() / imgBitmap.height
                val canvasRatio = canvasWidth / canvasHeight
                
                val destHeight = if (imgRatio > canvasRatio) {
                    canvasWidth / imgRatio
                } else {
                    canvasHeight
                }
                
                val destWidth = destHeight * imgRatio
                
                val topTextSize = texts.filter { it.position == "Top" }.maxOfOrNull { it.fontSize } ?: 0f
                val bottomTextSize = texts.filter { it.position == "Bottom" }.maxOfOrNull { it.fontSize } ?: 0f
                
                val topPad = if (topTextSize > 20f) (topTextSize * 1.2f).dpToPx() else 0f
                val bottomPad = if (bottomTextSize > 20f) (bottomTextSize * 1.2f).dpToPx() else 0f

                val availableHeight = canvasHeight - topPad - bottomPad
                val adjustedDestHeight = if (imgRatio > canvasRatio) {
                    canvasWidth / imgRatio
                } else {
                    availableHeight
                }.coerceAtMost(availableHeight)
                
                val adjustedDestWidth = adjustedDestHeight * imgRatio

                val offsetX = (canvasWidth - adjustedDestWidth) / 2
                val offsetY = topPad + (availableHeight - adjustedDestHeight) / 2
                
                drawImage(
                    image = imgBitmap,
                    dstSize = IntSize(adjustedDestWidth.toInt(), adjustedDestHeight.toInt()),
                    dstOffset = androidx.compose.ui.unit.IntOffset(offsetX.toInt(), offsetY.toInt())
                )
                
                // Draw manual paths
                if (mode == "draw") {
                    paths.forEach { drawAct ->
                        val thick = if (drawAct.tool == "RUBBER") 40f else 15f
                        drawPath(path = drawAct.path, color = drawAct.color, style = Stroke(width = thick, cap = StrokeCap.Round, join = StrokeJoin.Round))
                    }
                    currentPath?.let { path ->
                        val c = if (drawTool == "RUBBER") rubberColor else penColor
                        val thick = if (drawTool == "RUBBER") 40f else 15f
                        drawPath(path = path, color = c, style = Stroke(width = thick, cap = StrokeCap.Round, join = StrokeJoin.Round))
                    }
                } else if (mode == "crop" && cropRect != null) {
                    val cr = cropRect!!
                    drawRect(
                        color = Color.Blue,
                        topLeft = cr.topLeft,
                        size = cr.size,
                        style = Stroke(width = 5f)
                    )
                    val outColor = Color(0x88000000)
                    drawRect(color = outColor, topLeft = Offset(0f, 0f), size = Size(canvasWidth, cr.top))
                    drawRect(color = outColor, topLeft = Offset(0f, cr.bottom), size = Size(canvasWidth, canvasHeight - cr.bottom))
                    drawRect(color = outColor, topLeft = Offset(0f, cr.top), size = Size(cr.left, cr.height))
                    drawRect(color = outColor, topLeft = Offset(cr.right, cr.top), size = Size(canvasWidth - cr.right, cr.height))
                    
                    // Draw Interactive Handles
                    val handleRadius = 20f
                    val handleColor = Color.White
                    
                    // Corners
                    drawCircle(color = handleColor, radius = handleRadius, center = cr.topLeft)
                    drawCircle(color = handleColor, radius = handleRadius, center = cr.topRight)
                    drawCircle(color = handleColor, radius = handleRadius, center = cr.bottomLeft)
                    drawCircle(color = handleColor, radius = handleRadius, center = cr.bottomRight)
                    
                    // Edges
                    drawCircle(color = handleColor, radius = handleRadius, center = Offset(cr.center.x, cr.top))
                    drawCircle(color = handleColor, radius = handleRadius, center = Offset(cr.center.x, cr.bottom))
                    drawCircle(color = handleColor, radius = handleRadius, center = Offset(cr.left, cr.center.y))
                    drawCircle(color = handleColor, radius = handleRadius, center = Offset(cr.right, cr.center.y))
                }
            }
            
            if (mode == "draw") {
                texts.forEachIndexed { index, textItem ->
                    if (index != editingTextIndex) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopCenter)
                                .offset { IntOffset(textItem.offset.x.toInt(), textItem.offset.y.toInt()) }
                                .padding(16.dp)
                                .pointerInput(Unit) {
                                    detectTapGestures(
                                        onTap = {
                                            currentTextContent = textItem.text
                                            currentTextColor = textItem.color
                                            currentTextSize = textItem.fontSize
                                            currentTextFont = textItem.fontName
                                            currentTextPosition = textItem.position
                                            editingTextIndex = index
                                            showTextDialog = true
                                        }
                                    )
                                }
                                .pointerInput(Unit) {
                                    detectDragGestures { change, dragAmount ->
                                        change.consume()
                                        val newTexts = texts.toMutableList()
                                        newTexts[index] = newTexts[index].copy(offset = newTexts[index].offset + dragAmount)
                                        texts = newTexts
                                    }
                                }
                        ) {
                            Text(
                                text = textItem.text,
                                color = textItem.color,
                                fontSize = textItem.fontSize.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = when (textItem.fontName) {
                                    "Serif" -> FontFamily.Serif
                                    "SansSerif" -> FontFamily.SansSerif
                                    "Monospace" -> FontFamily.Monospace
                                    "Cursive" -> FontFamily.Cursive
                                    else -> FontFamily.Default
                                }
                            )
                        }
                    }
                }

                if (showTextDialog && currentTextContent.isNotBlank()) {
                    val previewX = if (editingTextIndex >= 0) {
                        texts[editingTextIndex].offset.x
                    } else {
                        0f
                    }
                    val previewY = if (editingTextIndex >= 0) {
                        texts[editingTextIndex].offset.y
                    } else {
                        when (currentTextPosition) {
                            "Top" -> 50f
                            "Bottom" -> if (boxSize.height > 0) boxSize.height - 100f else 400f
                            else -> if (boxSize.height > 0) boxSize.height / 2f else 100f
                        }
                    }

                    Box(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .offset { IntOffset(previewX.toInt(), previewY.toInt()) }
                            .padding(16.dp)
                    ) {
                        Text(
                            text = currentTextContent,
                            color = currentTextColor,
                            fontSize = currentTextSize.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = when (currentTextFont) {
                                "Serif" -> FontFamily.Serif
                                "SansSerif" -> FontFamily.SansSerif
                                "Monospace" -> FontFamily.Monospace
                                "Cursive" -> FontFamily.Cursive
                                else -> FontFamily.Default
                            }
                        )
                    }
                }
            }

            // Shape Conversion Prompt
            if (lastSuggestedShape != null && mode == "draw") {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 16.dp)
                        .background(Color(0xE62196F3), RoundedCornerShape(24.dp))
                        .clickable {
                            if (paths.isNotEmpty() && currentPoints.isNotEmpty()) {
                                val lastTool = paths.last().tool
                                val lastColor = paths.last().color
                                val refinedPath = Path()
                                
                                when (lastSuggestedShape) {
                                    "LINE" -> {
                                        val s = currentPoints.first()
                                        val e = currentPoints.last()
                                        refinedPath.moveTo(s.x, s.y)
                                        refinedPath.lineTo(e.x, e.y)
                                    }
                                    "CIRCLE" -> {
                                        val minX = currentPoints.minOf { it.x }
                                        val maxX = currentPoints.maxOf { it.x }
                                        val minY = currentPoints.minOf { it.y }
                                        val maxY = currentPoints.maxOf { it.y }
                                        val centerX = (minX + maxX) / 2
                                        val centerY = (minY + maxY) / 2
                                        val radius = (maxX - minX + maxY - minY) / 4
                                        refinedPath.addOval(Rect(centerX - radius, centerY - radius, centerX + radius, centerY + radius))
                                    }
                                }
                                
                                val newPaths = paths.toMutableList()
                                newPaths[newPaths.size - 1] = DrawAction(refinedPath, lastTool, lastColor)
                                paths = newPaths
                                lastSuggestedShape = null
                            }
                        }
                        .padding(horizontal = 20.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = "✨ Perfect to ${lastSuggestedShape!!.lowercase()}?",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
        
        if (showTextDialog) {
            androidx.compose.ui.window.Dialog(
                onDismissRequest = { 
                    showTextDialog = false
                    editingTextIndex = -1 
                },
                properties = androidx.compose.ui.window.DialogProperties(
                    usePlatformDefaultWidth = false,
                    decorFitsSystemWindows = false
                )
            ) {
                Box(
                    modifier = Modifier.fillMaxSize().imePadding(),
                    contentAlignment = Alignment.BottomCenter
                ) {
                    Card(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 24.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xF2FFFFFF)), // Semi-transparent white
                        shape = RoundedCornerShape(24.dp)
                    ) {
                        Column(modifier = Modifier.padding(20.dp).verticalScroll(rememberScrollState())) {
                            Text(if (editingTextIndex >= 0) "Edit Text" else "Add Text", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(16.dp))
                            
                            OutlinedTextField(
                                value = currentTextContent,
                                onValueChange = { currentTextContent = it },
                                label = { Text("Text") },
                                modifier = Modifier.fillMaxWidth().height(80.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Size: ${currentTextSize.toInt()}", fontSize = 12.sp)
                            Slider(
                                value = currentTextSize,
                                onValueChange = { currentTextSize = it },
                                valueRange = 12f..100f,
                                modifier = Modifier.height(32.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Position", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Button(
                                    onClick = { currentTextPosition = "Top" },
                                    colors = ButtonDefaults.buttonColors(containerColor = if (currentTextPosition == "Top") Color.Blue else Color.DarkGray),
                                    modifier = Modifier.height(32.dp).weight(1f),
                                    contentPadding = PaddingValues(0.dp)
                                ) { Text("Top", fontSize = 11.sp) }
                                Button(
                                    onClick = { currentTextPosition = "Default" },
                                    colors = ButtonDefaults.buttonColors(containerColor = if (currentTextPosition == "Default") Color.Blue else Color.DarkGray),
                                    modifier = Modifier.height(32.dp).weight(1f),
                                    contentPadding = PaddingValues(0.dp)
                                ) { Text("Default", fontSize = 11.sp) }
                                Button(
                                    onClick = { currentTextPosition = "Bottom" },
                                    colors = ButtonDefaults.buttonColors(containerColor = if (currentTextPosition == "Bottom") Color.Blue else Color.DarkGray),
                                    modifier = Modifier.height(32.dp).weight(1f),
                                    contentPadding = PaddingValues(0.dp)
                                ) { Text("Bottom", fontSize = 11.sp) }
                            }
                            
                            Spacer(modifier = Modifier.height(8.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                items(fontNames) { font ->
                                    Button(
                                        onClick = { currentTextFont = font },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (currentTextFont == font) Color.Blue else Color.DarkGray
                                        ),
                                        modifier = Modifier.height(32.dp),
                                        contentPadding = PaddingValues(horizontal = 8.dp)
                                    ) {
                                        Text(font, fontSize = 11.sp)
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            LazyRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                items(textColors) { color ->
                                    Box(
                                        modifier = Modifier
                                            .size(28.dp)
                                            .background(color, CircleShape)
                                            .border(
                                                width = if (currentTextColor == color) 2.dp else 1.dp,
                                                color = if (currentTextColor == color) Color.Gray else Color.LightGray,
                                                shape = CircleShape
                                            )
                                            .clickable { currentTextColor = color }
                                    )
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(16.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                                if (editingTextIndex >= 0) {
                                    Button(
                                        onClick = {
                                            val newTexts = texts.toMutableList()
                                            newTexts.removeAt(editingTextIndex)
                                            texts = newTexts
                                            showTextDialog = false
                                            editingTextIndex = -1
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color.Red),
                                        modifier = Modifier.height(40.dp)
                                    ) { Text("Delete") }
                                    Spacer(modifier = Modifier.width(8.dp))
                                }
                                Button(onClick = { 
                                    showTextDialog = false
                                    editingTextIndex = -1
                                }, modifier = Modifier.height(40.dp), colors = ButtonDefaults.buttonColors(containerColor = Color.Gray)) { Text("Cancel") }
                                Spacer(modifier = Modifier.width(8.dp))
                                Button(onClick = {
                                    if (currentTextContent.isNotBlank()) {
                                        if (editingTextIndex >= 0) {
                                            val newTexts = texts.toMutableList()
                                            newTexts[editingTextIndex] = newTexts[editingTextIndex].copy(text = currentTextContent, color = currentTextColor, fontSize = currentTextSize, fontName = currentTextFont)
                                            texts = newTexts
                                        } else {
                                            val hasTopText = texts.any { it.position == "Top" } || currentTextPosition == "Top"
                                            val hasBottomText = texts.any { it.position == "Bottom" } || currentTextPosition == "Bottom"
                                            
                                            val canvasWidth = boxSize.width.toFloat()
                                            val canvasHeight = boxSize.height.toFloat()
                                            val imgRatio = activeBitmap.width.toFloat() / activeBitmap.height
                                            val canvasRatio = if (canvasHeight > 0) canvasWidth / canvasHeight else 1f
                                            val destHeight = if (imgRatio > canvasRatio) (if (imgRatio > 0) canvasWidth / imgRatio else 0f) else canvasHeight
                                            val destWidth = if (imgRatio > canvasRatio) canvasWidth else destHeight * imgRatio
                                            
                                            var offsetYPreview = (canvasHeight - destHeight) / 2
                                            if (hasTopText && !hasBottomText) {
                                                offsetYPreview = (canvasHeight - destHeight) * 0.7f 
                                            } else if (!hasTopText && hasBottomText) {
                                                offsetYPreview = (canvasHeight - destHeight) * 0.3f
                                            }
                                            
                                            val centerX = 0f // 0 is exactly center with Alignment.TopCenter
                                            val centerY = when (currentTextPosition) {
                                                "Top" -> offsetY - 40f
                                                "Bottom" -> offsetY + destHeight - 40f
                                                else -> if (boxSize.height > 0) boxSize.height / 2f else 100f
                                            }
                                            texts = texts + TextItem(currentTextContent, Offset(centerX, centerY), currentTextColor, currentTextSize, currentTextFont, currentTextPosition)
                                        }
                                    } else if (editingTextIndex >= 0) {
                                        val newTexts = texts.toMutableList()
                                        newTexts.removeAt(editingTextIndex)
                                        texts = newTexts
                                    }
                                    currentTextContent = ""
                                    showTextDialog = false
                                    editingTextIndex = -1
                                }, modifier = Modifier.height(40.dp)) { Text(if (editingTextIndex >= 0) "Save" else "Add") }
                            }
                        }
                    }
                }
            }
        }
        
        // Mode Selector Bar
        Row(
            modifier = Modifier.fillMaxWidth().height(60.dp).background(Color(0xFF1E1E1E)),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(onClick = { mode = "draw" }, colors = ButtonDefaults.textButtonColors(contentColor = if (mode == "draw") Color.White else Color.Gray)) {
                Text("Draw")
            }
            TextButton(onClick = { mode = "crop" }, colors = ButtonDefaults.textButtonColors(contentColor = if (mode == "crop") Color.White else Color.Gray)) {
                Text("Crop Original")
            }
        }
    }
}
