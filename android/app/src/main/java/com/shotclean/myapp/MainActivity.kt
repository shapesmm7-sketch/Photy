package com.shotclean.myapp

import android.os.Bundle
import com.shotclean.myapp.NativeMediaPlugin
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerPlugin(NativeMediaPlugin::class.java)
    }
}



