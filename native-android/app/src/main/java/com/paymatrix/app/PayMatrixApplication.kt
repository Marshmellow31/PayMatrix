package com.paymatrix.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.FirebaseAppCheck
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.paymatrix.app.data.AuthRepository
import com.paymatrix.app.data.FirebaseRepository

class PayMatrixApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        com.paymatrix.app.data.DevicePreferences.initialize(this)
        com.paymatrix.app.data.LocalReviewWorker.schedule(this)
        FirebaseApp.initializeApp(this)
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(appCheckProviderFactory())
        val firestore = FirebaseFirestore.getInstance().apply {
            firestoreSettings = FirebaseFirestoreSettings.Builder()
                .setLocalCacheSettings(com.google.firebase.firestore.PersistentCacheSettings.newBuilder().build())
                .build()
        }
        val auth = AuthRepository(FirebaseAuth.getInstance(), firestore)
        container = AppContainer(auth, FirebaseRepository(this, firestore, auth))
        FirebaseAuth.getInstance().addAuthStateListener { session ->
            val snapshot = com.paymatrix.app.widget.WidgetStore.read(this)
            if (snapshot != null && snapshot.uid != session.currentUser?.uid) {
                com.paymatrix.app.widget.WidgetStore.clear(this)
                com.paymatrix.app.widget.QuickAccessWidget.refresh(this)
            }
        }
        com.paymatrix.app.widget.QuickAccessWidget.publishPreviews(this)
    }
}

data class AppContainer(
    val auth: AuthRepository,
    val repository: FirebaseRepository,
)
