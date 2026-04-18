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
fun CanvasEditor(bitmap: Bitmap, onDone: (Bitmap) -> Unit, onCancel: () -> Unit) {
    var paths by remember { mutableStateOf(listOf<Path>()) }
    var currentPath by remember { mutableStateOf<Path?>(null) }
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
            Button(onClick = { paths = emptyList() }, colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray)) {
                Text("Clear")
            }
            Button(onClick = {
                if (paths.isEmpty() && currentPath == null) {
                    onDone(bitmap)
                    return@Button
                }
                
                val canvasWidth = boxSize.width.toFloat()
                val canvasHeight = boxSize.height.toFloat()
                
                if (canvasWidth > 0 && canvasHeight > 0) {
                    val imgRatio = bitmap.width.toFloat() / bitmap.height
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
                    val scale = bitmap.width.toFloat() / destWidth
                    
                    val finalBitmap = bitmap.copy(Bitmap.Config.ARGB_8888, true)
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
                    onDone(bitmap)
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
            val imgBitmap = bitmap.asImageBitmap()
            
            Canvas(modifier = Modifier.fillMaxSize().pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { offset ->
                        currentPath = Path().apply {
                            moveTo(offset.x, offset.y)
                        }
                    },
                    onDrag = { change, _ ->
                        currentPath?.lineTo(change.position.x, change.position.y)
                    },
                    onDragEnd = {
                        currentPath?.let { paths = paths + it }
                        currentPath = null
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
                val strokeStyle = Stroke(width = 15f, cap = StrokeCap.Round, join = StrokeJoin.Round)
                paths.forEach { path ->
                    drawPath(path = path, color = Color(0xFFFF3366), style = strokeStyle)
                }
                currentPath?.let { path ->
                    drawPath(path = path, color = Color(0xFFFF3366), style = strokeStyle)
                }
            }
        }
    }
}
