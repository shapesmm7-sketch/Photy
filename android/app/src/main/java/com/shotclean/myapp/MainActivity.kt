package com.shotclean.myapp

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.getcapacitor.BridgeActivity
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import com.shotclean.myapp.R

class MainActivity : BridgeActivity() {
    private lateinit var appUpdateManager: AppUpdateManager
    private val UPDATE_REQUEST_CODE = 9991

    override fun onCreate(savedInstanceState: Bundle?) {
        try {
            installSplashScreen()
        } catch (t: Throwable) {
            Log.e("MainActivity", "Failed to install splash screen", t)
        }

        try {
            if (!isTaskRoot
                && intent != null
                && intent.hasCategory(Intent.CATEGORY_LAUNCHER)
                && intent.action != null
                && intent.action == Intent.ACTION_MAIN
            ) {
                finish()
                return
            }
        } catch (t: Throwable) {
            Log.e("MainActivity", "Task root check failed", t)
        }

        super.onCreate(savedInstanceState)
        
        try {
            registerPlugin(NativeMediaPlugin::class.java)
        } catch (t: Throwable) {
            Log.e("MainActivity", "Failed to register NativeMediaPlugin", t)
        }

        try {
            appUpdateManager = AppUpdateManagerFactory.create(this)
            checkForUpdates()
        } catch (t: Throwable) {
            Log.e("MainActivity", "Failed to initialize AppUpdateManager", t)
        }
    }

    private fun checkForUpdates() {
        try {
            val appUpdateInfoTask = appUpdateManager.appUpdateInfo
            appUpdateInfoTask.addOnSuccessListener { appUpdateInfo ->
                try {
                    if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                        && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
                    ) {
                        try {
                            appUpdateManager.startUpdateFlowForResult(
                                appUpdateInfo,
                                AppUpdateType.IMMEDIATE,
                                this,
                                UPDATE_REQUEST_CODE
                            )
                        } catch (t: Throwable) {
                            Log.e("MainActivity", "Failed to start update flow", t)
                        }
                    }
                } catch (t: Throwable) {
                    Log.e("MainActivity", "Error processing appUpdateInfo", t)
                }
            }
            appUpdateInfoTask.addOnFailureListener { e ->
                Log.e("MainActivity", "App update task failed", e)
            }
        } catch (t: Throwable) {
            Log.e("MainActivity", "checkForUpdates failed", t)
        }
    }

    override fun onResume() {
        super.onResume()
        try {
            if (::appUpdateManager.isInitialized) {
                try {
                    val appUpdateInfoTask = appUpdateManager.appUpdateInfo
                    appUpdateInfoTask.addOnSuccessListener { appUpdateInfo ->
                        try {
                            if (appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                                // Resume an in-progress immediate update
                                try {
                                    appUpdateManager.startUpdateFlowForResult(
                                        appUpdateInfo,
                                        AppUpdateType.IMMEDIATE,
                                        this,
                                        UPDATE_REQUEST_CODE
                                    )
                                } catch (t: Throwable) {
                                    Log.e("MainActivity", "Failed to resume update flow", t)
                                }
                            }
                        } catch (t: Throwable) {
                            Log.e("MainActivity", "Error resuming appUpdateInfo processing", t)
                        }
                    }
                    appUpdateInfoTask.addOnFailureListener { e ->
                        Log.e("MainActivity", "App update info resume check failed", e)
                    }
                } catch (t: Throwable) {
                    Log.e("MainActivity", "Failed to retrieve appUpdateInfo in onResume", t)
                }
            }
        } catch (t: Throwable) {
            Log.e("MainActivity", "onResume check failed", t)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        try {
            if (requestCode == UPDATE_REQUEST_CODE) {
                if (resultCode != Activity.RESULT_OK) {
                    // If update failed or was canceled, show toast message and exit app
                    Toast.makeText(this, "An application update is required to continue.", Toast.LENGTH_LONG).show()
                    finishAffinity()
                }
            }
        } catch (t: Throwable) {
            Log.e("MainActivity", "onActivityResult failed", t)
        }
    }
}



