pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "SnapClean"
include(":app")

include(":capacitor-android")
project(":capacitor-android").projectDir = File("../node_modules/@capacitor/android/capacitor")

// Capacitor plugins
include(":capacitor-community-admob")
project(":capacitor-community-admob").projectDir = File("../node_modules/@capacitor-community/admob/android")
