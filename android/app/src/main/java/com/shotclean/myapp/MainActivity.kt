package com.shotclean.myapp

import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        try {
            val prefs = getSharedPreferences("crash_prefs", android.content.Context.MODE_PRIVATE)
            val lastCrash = prefs.getString("last_crash", null)
            if (lastCrash != null) {
                android.app.AlertDialog.Builder(this)
                    .setTitle("App Crashed Last Time")
                    .setMessage(lastCrash)
                    .setPositiveButton("OK") { _, _ -> 
                        prefs.edit().remove("last_crash").apply()
                    }
                    .show()
            }
        } catch (e: Exception) {}

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




