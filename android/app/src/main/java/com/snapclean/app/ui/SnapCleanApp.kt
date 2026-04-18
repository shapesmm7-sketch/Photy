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
    var originalBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) }
    var processedBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) }
    
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
                    processedBitmap = ImageProcessor.autoProcess(softBitmap)
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
                        modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, bottom = 32.dp),
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

                        Button(
                            onClick = { /* Share */ }, 
                            modifier = Modifier.weight(1f).height(56.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color.Blue)
                        ) { Text("Save") }
                    }
                }
            }
            "edit" -> {
                processedBitmap?.let { bmp ->
                    CanvasEditor(
                        bitmap = bmp,
                        onCancel = { state = "preview" }
                    )
                }
            }
        }
    }
}
