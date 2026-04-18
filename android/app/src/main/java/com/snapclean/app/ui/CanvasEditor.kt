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
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp

data class DrawAction(val path: Path, val tool: String) // "PEN", "RUBBER"
data class TextItem(val text: String, val offset: Offset, val color: Color = Color.White, val fontSize: Float = 32f)

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
    var currentTextColor by remember { mutableStateOf(Color.White) }
    var currentTextSize by remember { mutableFloatStateOf(32f) }
    var editingTextIndex by remember { mutableIntStateOf(-1) }
    val textColors = listOf(Color.White, Color.Black, Color.Red, Color.Blue, Color.Green, Color.Yellow, Color.Magenta, Color.Cyan)
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
                        onClick = { 
                            currentTextContent = ""
                            currentTextColor = Color.White
                            currentTextSize = 32f
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
                        
                        texts.forEach { textItem ->
                            val textPxSize = textItem.fontSize * localDensity
                            val textPaint = android.graphics.Paint().apply {
                                color = textItem.color.toArgb()
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
            
            Canvas(modifier = Modifier.fillMaxSize().pointerInput(mode, drawTool) {
                detectDragGestures(
                    onDragStart = { offset ->
                        if (mode == "draw" && drawTool != "NONE") {
                            currentPath = Path().apply { moveTo(offset.x, offset.y) }
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
                        color = textItem.color,
                        fontSize = textItem.fontSize.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .offset { IntOffset(textItem.offset.x.toInt(), textItem.offset.y.toInt()) }
                            .pointerInput(Unit) {
                                detectTapGestures(
                                    onTap = {
                                        currentTextContent = textItem.text
                                        currentTextColor = textItem.color
                                        currentTextSize = textItem.fontSize
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
                    )
                }
            }
        }
        
        if (showTextDialog) {
            AlertDialog(
                onDismissRequest = { 
                    showTextDialog = false
                    editingTextIndex = -1 
                },
                title = { Text(if (editingTextIndex >= 0) "Edit Text" else "Add Text") },
                text = {
                    Column {
                        OutlinedTextField(
                            value = currentTextContent,
                            onValueChange = { currentTextContent = it },
                            label = { Text("Text") }
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Size: ${currentTextSize.toInt()}")
                        Slider(
                            value = currentTextSize,
                            onValueChange = { currentTextSize = it },
                            valueRange = 12f..100f
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(textColors) { color ->
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .background(color, CircleShape)
                                        .border(
                                            width = if (currentTextColor == color) 3.dp else 1.dp,
                                            color = if (currentTextColor == color) Color.Gray else Color.LightGray,
                                            shape = CircleShape
                                        )
                                        .clickable { currentTextColor = color }
                                )
                            }
                        }
                    }
                },
                confirmButton = {
                    Button(onClick = {
                        if (currentTextContent.isNotBlank()) {
                            if (editingTextIndex >= 0) {
                                val newTexts = texts.toMutableList()
                                newTexts[editingTextIndex] = newTexts[editingTextIndex].copy(text = currentTextContent, color = currentTextColor, fontSize = currentTextSize)
                                texts = newTexts
                            } else {
                                val centerX = if (boxSize.width > 0) boxSize.width / 2f - 50f else 100f
                                val centerY = if (boxSize.height > 0) boxSize.height / 2f else 100f
                                texts = texts + TextItem(currentTextContent, Offset(centerX, centerY), currentTextColor, currentTextSize)
                            }
                        } else if (editingTextIndex >= 0) {
                            val newTexts = texts.toMutableList()
                            newTexts.removeAt(editingTextIndex)
                            texts = newTexts
                        }
                        currentTextContent = ""
                        showTextDialog = false
                        editingTextIndex = -1
                    }) { Text(if (editingTextIndex >= 0) "Save" else "Add") }
                },
                dismissButton = {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (editingTextIndex >= 0) {
                            Button(
                                onClick = {
                                    val newTexts = texts.toMutableList()
                                    newTexts.removeAt(editingTextIndex)
                                    texts = newTexts
                                    showTextDialog = false
                                    editingTextIndex = -1
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                            ) { Text("Delete") }
                        }
                        Button(onClick = { 
                            showTextDialog = false
                            editingTextIndex = -1
                        }) { Text("Cancel") }
                    }
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
