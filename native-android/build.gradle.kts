plugins {
    // AGP 8.13.2 bundles R8 8.13.19, the first 8.13 patch with Kotlin 2.3 metadata support.
    id("com.android.application") version "8.13.2" apply false
    id("org.jetbrains.kotlin.android") version "2.3.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.3.21" apply false
    id("com.google.gms.google-services") version "4.5.0" apply false
}
