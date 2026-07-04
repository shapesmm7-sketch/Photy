package com.shotclean.myapp

import android.os.Bundle
import android.util.Log
import android.widget.Toast
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.view.ViewGroup
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.MobileAds

class MainActivity : BridgeActivity() {

    private var adView: AdView? = null
    private var isAdLoaded = false

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
            
            // Refactor existing layout structure to prevent AdMob banner overlapping/moving
            setupStableLayoutWithAd()
            
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

    private fun setupStableLayoutWithAd() {
        try {
            val decorView = window.decorView as ViewGroup
            val contentView = decorView.findViewById<ViewGroup>(android.R.id.content)
            
            // The first child of content is usually the Capacitor WebView layout
            val capacitorView = contentView.getChildAt(0)
            if (capacitorView != null) {
                contentView.removeView(capacitorView)
                
                // Inflate our custom stable layout
                val inflater = android.view.LayoutInflater.from(this)
                val customLayout = inflater.inflate(R.layout.activity_main, null) as LinearLayout
                
                val webViewContainer = customLayout.findViewById<FrameLayout>(R.id.capacitor_webview_container)
                val adContainer = customLayout.findViewById<FrameLayout>(R.id.ad_container)
                
                // Add Capacitor to the top container
                webViewContainer.addView(capacitorView, ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                ))
                
                // Set the new layout as the content view
                setContentView(customLayout)
                
                // Load the AdMob banner ONLY ONCE
                if (!isAdLoaded) {
                    MobileAds.initialize(this) {}
                    
                    adView = AdView(this)
                    adView?.adUnitId = "ca-app-pub-8582659585800553/2899259565"
                    
                    // If using adaptive banners, calculate the AdSize BEFORE loading the ad
                    val display = windowManager.defaultDisplay
                    val outMetrics = android.util.DisplayMetrics()
                    display.getMetrics(outMetrics)
                    val widthPixels = outMetrics.widthPixels.toFloat()
                    val density = outMetrics.density
                    val adWidth = (widthPixels / density).toInt()
                    val adSize = AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(this, adWidth)
                    
                    adView?.setAdSize(adSize)
                    
                    adContainer.addView(adView)
                    
                    val adRequest = AdRequest.Builder().build()
                    adView?.loadAd(adRequest)
                    isAdLoaded = true
                }
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Error setting up custom ad layout", e)
        }
    }
}




