package com.shotclean.myapp

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import com.getcapacitor.BridgeActivity
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability

class MainActivity : BridgeActivity() {
    private lateinit var appUpdateManager: AppUpdateManager
    private val UPDATE_REQUEST_CODE = 9991

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

        super.onCreate(savedInstanceState)
        registerPlugin(NativeMediaPlugin::class.java)

        try {
            appUpdateManager = AppUpdateManagerFactory.create(this)
            checkForUpdates()
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to initialize AppUpdateManager", e)
        }
    }

    private fun checkForUpdates() {
        try {
            val appUpdateInfoTask = appUpdateManager.appUpdateInfo
            appUpdateInfoTask.addOnSuccessListener { appUpdateInfo ->
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
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Failed to start update flow", e)
                    }
                }
            }
            appUpdateInfoTask.addOnFailureListener { e ->
                Log.e("MainActivity", "App update task failed", e)
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "checkForUpdates failed", e)
        }
    }

    override fun onResume() {
        super.onResume()
        if (::appUpdateManager.isInitialized) {
            try {
                val appUpdateInfoTask = appUpdateManager.appUpdateInfo
                appUpdateInfoTask.addOnSuccessListener { appUpdateInfo ->
                    if (appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                        // Resume an in-progress immediate update
                        try {
                            appUpdateManager.startUpdateFlowForResult(
                                appUpdateInfo,
                                AppUpdateType.IMMEDIATE,
                                this,
                                UPDATE_REQUEST_CODE
                            )
                        } catch (e: Exception) {
                            Log.e("MainActivity", "Failed to resume update flow", e)
                        }
                    }
                }
                appUpdateInfoTask.addOnFailureListener { e ->
                    Log.e("MainActivity", "App update info resume check failed", e)
                }
            } catch (e: Exception) {
                Log.e("MainActivity", "Failed to retrieve appUpdateInfo in onResume", e)
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == UPDATE_REQUEST_CODE) {
            if (resultCode != Activity.RESULT_OK) {
                // If update failed or was canceled, show toast message and exit app
                Toast.makeText(this, "An application update is required to continue.", Toast.LENGTH_LONG).show()
                finishAffinity()
            }
        }
    }
}



