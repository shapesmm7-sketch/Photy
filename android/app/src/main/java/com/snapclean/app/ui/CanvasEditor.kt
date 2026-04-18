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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp

data class DrawAction(val path: Path, val tool: String) // "PEN", "RUBBER"
data class TextItem(val text: String, val offset: Offset)

@Composable
fun CanvasEditor(
    activeBitmap: Bitmap,
    originalBitmap: Bitmap,
    onDone: (Bitmap) -> Unit,
    onCancel: () -> Unit
) {
    var mode by remember { mutableStateOf("draw") } // "draw" or "crop"
    var drawTool by remember { mutableStateOf("NONE") } // "NONE", "PEN", "RUBBER"
    var refreshTick by remember { mutableIntStateOf(0) } // force compose layout refresh on drag
    
    // Draw state
    var paths by remember { mutableStateOf(listOf<DrawAction>()) }
    var currentPath by remember { mutableStateOf<Path?>(null) }
    
    // Text state
    var texts by remember { mutableStateOf(listOf<TextItem>()) }
    var showTextDialog by remember { mutableStateOf(false) }
    var currentTextContent by remember { mutableStateOf("") }
    val localDensity = LocalDensity.current.density
    
    // Crop state
    var cropRect by remember { mutableStateOf<Rect?>(null) }
    var cropDragTarget by remember { mutableStateOf("NONE") }
    
    var boxSize by remember { mutableStateOf(IntSize.Zero) }
    
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
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
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
                        onClick = { showTextDialog = true }, 
                        colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray),
                        contentPadding = PaddingValues(0.dp),
                        modifier = Modifier.width(48.dp)
                    ) {
                        Text("🔤")
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
                Button(onClick = { cropRect = null }, colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)) {
                    Text("Reset")
                }
            }

            Button(onClick = {
                val canvasWidth = boxSize.width.toFloat()
                val canvasHeight = boxSize.height.toFloat()
                
                if (mode == "draw") {
                    if (paths.isEmpty() && currentPath == null && texts.isEmpty()) {
                        onDone(activeBitmap)
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
                        
                        val finalBitmap = activeBitmap.copy(Bitmap.Config.ARGB_8888, true)
                        val androidCanvas = android.graphics.Canvas(finalBitmap)
                        val matrix = android.graphics.Matrix()
                        matrix.postTranslate(-offsetX, -offsetY)
                        matrix.postScale(scale, scale)
                        
                        val allPaths = paths.toMutableList()
                        currentPath?.let { allPaths.add(DrawAction(it, drawTool)) }
                        
                        allPaths.forEach { drawAct ->
                            val androidPath = android.graphics.Path(drawAct.path.asAndroidPath())
                            androidPath.transform(matrix)
                            
                            val paint = android.graphics.Paint().apply {
                                style = android.graphics.Paint.Style.STROKE
                                strokeCap = android.graphics.Paint.Cap.ROUND
                                strokeJoin = android.graphics.Paint.Join.ROUND
                                isAntiAlias = true
                                if (drawAct.tool == "RUBBER") {
                                    color = android.graphics.Color.BLACK
                                    strokeWidth = 40f * scale
                                } else {
                                    color = android.graphics.Color.parseColor("#FF3366")
                                    strokeWidth = 15f * scale
                                }
                            }
                            
                            androidCanvas.drawPath(androidPath, paint)
                        }
                        
                        val textPxSize = 32f * localDensity
                        texts.forEach { textItem ->
                            val textPaint = android.graphics.Paint().apply {
                                color = android.graphics.Color.WHITE
                                textSize = textPxSize * scale
                                isAntiAlias = true
                                typeface = android.graphics.Typeface.DEFAULT_BOLD
                            }
                            val textX = (textItem.offset.x - offsetX) * scale
                            val textY = (textItem.offset.y - offsetY) * scale - textPaint.ascent()
                            
                            androidCanvas.drawText(textItem.text, textX, textY, textPaint)
                        }
                        
                        onDone(finalBitmap)
                    } else {
                        onDone(activeBitmap)
                    }
                } else if (mode == "crop") {
                    if (cropRect == null) {
                        onDone(originalBitmap)
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
                    onDone(finalBitmap)
                }
            }, colors = ButtonDefaults.buttonColors(containerColor = Color.Blue)) {
                Text("Done")
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
            val imgBitmap = renderBmp.asImageBitmap()
            
            var dragStart by remember { mutableStateOf(Offset.Zero) }
            
            Canvas(modifier = Modifier.fillMaxSize().pointerInput(Triple(mode, drawTool, refreshTick)) {
                detectDragGestures(
                    onDragStart = { offset ->
                        if (mode == "draw" && drawTool != "NONE") {
                            currentPath = Path().apply { moveTo(offset.x, offset.y) }
                        } else if (mode == "crop") {
                            if (cropRect != null) {
                                val cr = cropRect!!
                                val x = offset.x
                                val y = offset.y
                                val threshold = 70f
                                
                                val isLeft = kotlin.math.abs(x - cr.left) < threshold
                                val isRight = kotlin.math.abs(x - cr.right) < threshold
                                val isTop = kotlin.math.abs(y - cr.top) < threshold
                                val isBottom = kotlin.math.abs(y - cr.bottom) < threshold
                                
                                val isInsideX = x > cr.left + threshold && x < cr.right - threshold
                                val isInsideY = y > cr.top + threshold && y < cr.bottom - threshold

                                cropDragTarget = when {
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
                    onDrag = { change, _ ->
                        if (mode == "draw" && drawTool != "NONE") {
                            currentPath?.lineTo(change.position.x, change.position.y)
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
                                    val dx = x - dragStart.x
                                    val dy = y - dragStart.y
                                    cropRect = Rect(cr.left + dx, cr.top + dy, cr.right + dx, cr.bottom + dy)
                                    dragStart = change.position
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
                            currentPath?.let { paths = paths + DrawAction(it, drawTool) }
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
                
                var destWidth = canvasWidth
                var destHeight = canvasHeight
                if (imgRatio > canvasRatio) {
                    destHeight = canvasWidth / imgRatio
                } else {
                    destWidth = canvasHeight * imgRatio
                }
                
                val offsetX = (canvasWidth - destWidth) / 2
                val offsetY = (canvasHeight - destHeight) / 2
                
                drawImage(
                    image = imgBitmap,
                    dstSize = IntSize(destWidth.toInt(), destHeight.toInt()),
                    dstOffset = androidx.compose.ui.unit.IntOffset(offsetX.toInt(), offsetY.toInt())
                )
                
                // Draw manual paths
                if (mode == "draw") {
                    paths.forEach { drawAct ->
                        val color = if (drawAct.tool == "RUBBER") Color.Black else Color(0xFFFF3366)
                        val thick = if (drawAct.tool == "RUBBER") 40f else 15f
                        drawPath(path = drawAct.path, color = color, style = Stroke(width = thick, cap = StrokeCap.Round, join = StrokeJoin.Round))
                    }
                    currentPath?.let { path ->
                        val color = if (drawTool == "RUBBER") Color.Black else Color(0xFFFF3366)
                        val thick = if (drawTool == "RUBBER") 40f else 15f
                        drawPath(path = path, color = color, style = Stroke(width = thick, cap = StrokeCap.Round, join = StrokeJoin.Round))
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
                    Text(
                        text = textItem.text,
                        color = Color.White,
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .offset { IntOffset(textItem.offset.x.toInt(), textItem.offset.y.toInt()) }
                            .pointerInput(Unit) {
                                detectDragGestures { change, dragAmount ->
                                    change.consume()
                                    val newTexts = texts.toMutableList()
                                    newTexts[index] = newTexts[index].copy(offset = newTexts[index].offset + dragAmount)
                                    texts = newTexts
                                }
                            }
                    )
                }
            }
        }
        
        if (showTextDialog) {
            AlertDialog(
                onDismissRequest = { showTextDialog = false },
                title = { Text("Add Text") },
                text = {
                    OutlinedTextField(
                        value = currentTextContent,
                        onValueChange = { currentTextContent = it },
                        label = { Text("Text") }
                    )
                },
                confirmButton = {
                    Button(onClick = {
                        if (currentTextContent.isNotBlank()) {
                            val centerX = if (boxSize.width > 0) boxSize.width / 2f - 50f else 100f
                            val centerY = if (boxSize.height > 0) boxSize.height / 2f else 100f
                            texts = texts + TextItem(currentTextContent, Offset(centerX, centerY))
                        }
                        currentTextContent = ""
                        showTextDialog = false
                    }) { Text("Add") }
                },
                dismissButton = {
                    Button(onClick = { showTextDialog = false }) { Text("Cancel") }
                }
            )
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
