package com.shotclean.myapp

import android.os.Bundle
import android.util.Log
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
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
    }
}




