package com.shotclean.myapp

import android.app.Application
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast

class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e("CRASH", "App crashed", throwable)
            
            try {
                val prefs = getSharedPreferences("crash_prefs", Context.MODE_PRIVATE)
                prefs.edit().putString("last_crash", throwable.stackTraceToString()).commit()
            } catch (e: Exception) {
                Log.e("CRASH", "Failed to save crash info", e)
            }

            try {
                Handler(Looper.getMainLooper()).post {
                    Toast.makeText(applicationContext, "FATAL CRASH: ${throwable.message}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {}
            
            try { Thread.sleep(1000) } catch (e: Exception) {}
            
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }
}
