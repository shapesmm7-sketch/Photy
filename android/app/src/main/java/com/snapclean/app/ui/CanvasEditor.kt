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
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp

@Composable
fun CanvasEditor(
    activeBitmap: Bitmap,
    originalBitmap: Bitmap,
    onDone: (Bitmap) -> Unit,
    onCancel: () -> Unit
) {
    var mode by remember { mutableStateOf("draw") } // "draw" or "crop"
    
    // Draw state
    var paths by remember { mutableStateOf(listOf<Path>()) }
    var currentPath by remember { mutableStateOf<Path?>(null) }
    
    // Crop state
    var cropRect by remember { mutableStateOf<Rect?>(null) }
    
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
                Button(onClick = { paths = emptyList() }, colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)) {
                    Text("Clear lines")
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
                    if (paths.isEmpty() && currentPath == null) {
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
                        val paint = android.graphics.Paint().apply {
                            color = android.graphics.Color.parseColor("#FF3366")
                            style = android.graphics.Paint.Style.STROKE
                            strokeWidth = 15f * scale
                            strokeCap = android.graphics.Paint.Cap.ROUND
                            strokeJoin = android.graphics.Paint.Join.ROUND
                            isAntiAlias = true
                        }
                        
                        val matrix = android.graphics.Matrix()
                        matrix.postTranslate(-offsetX, -offsetY)
                        matrix.postScale(scale, scale)
                        
                        val allPaths = paths.toMutableList()
                        currentPath?.let { allPaths.add(it) }
                        
                        allPaths.forEach { composePath ->
                            val androidPath = android.graphics.Path(composePath.asAndroidPath())
                            androidPath.transform(matrix)
                            androidCanvas.drawPath(androidPath, paint)
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
            
            Canvas(modifier = Modifier.fillMaxSize().pointerInput(mode) {
                detectDragGestures(
                    onDragStart = { offset ->
                        if (mode == "draw") {
                            currentPath = Path().apply { moveTo(offset.x, offset.y) }
                        } else {
                            dragStart = offset
                            cropRect = Rect(offset, offset)
                        }
                    },
                    onDrag = { change, _ ->
                        if (mode == "draw") {
                            currentPath?.lineTo(change.position.x, change.position.y)
                        } else {
                            cropRect = Rect(
                                left = minOf(dragStart.x, change.position.x),
                                top = minOf(dragStart.y, change.position.y),
                                right = maxOf(dragStart.x, change.position.x),
                                bottom = maxOf(dragStart.y, change.position.y)
                            )
                        }
                    },
                    onDragEnd = {
                        if (mode == "draw") {
                            currentPath?.let { paths = paths + it }
                            currentPath = null
                        }
                    }
                )
            }) {
                
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
                    val strokeStyle = Stroke(width = 15f, cap = StrokeCap.Round, join = StrokeJoin.Round)
                    paths.forEach { path ->
                        drawPath(path = path, color = Color(0xFFFF3366), style = strokeStyle)
                    }
                    currentPath?.let { path ->
                        drawPath(path = path, color = Color(0xFFFF3366), style = strokeStyle)
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
