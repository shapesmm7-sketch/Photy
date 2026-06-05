package com.shotclean.myapp

import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        if (!isTaskRoot
            && intent != null
            && intent.hasCategory(Intent.CATEGORY_LAUNCHER)
            && intent.action != null
            && intent.action == Intent.ACTION_MAIN
        ) {
            finish()
            return
        }
        registerPlugin(NativeMediaPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}



