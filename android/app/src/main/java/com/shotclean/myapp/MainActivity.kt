package com.shotclean.myapp

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(NativeMediaPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}


