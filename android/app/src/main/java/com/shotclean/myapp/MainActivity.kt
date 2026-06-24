package com.shotclean.myapp

import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        try {
            try {
                installSplashScreen()
            } catch (t: Throwable) {
                Log.e("MainActivity", "Failed to install splash screen", t)
            }

            try {
                registerPlugin(NativeMediaPlugin::class.java)
            } catch (t: Throwable) {
                Log.e("MainActivity", "Failed to register NativeMediaPlugin", t)
            }

            super.onCreate(savedInstanceState)
        } catch (e: Exception) {
            Log.e("MainActivity", "Crash in MainActivity onCreate", e)
            e.printStackTrace()
            try {
                Toast.makeText(this, "Crash: ${e.toString()}", Toast.LENGTH_LONG).show()
            } catch (t: Throwable) {
                Log.e("MainActivity", "Failed to show crash toast", t)
            }
        }
    }
}




