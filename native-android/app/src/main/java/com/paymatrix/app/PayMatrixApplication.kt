package com.paymatrix.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.paymatrix.app.data.AuthRepository
import com.paymatrix.app.data.FirebaseRepository
import com.paymatrix.app.data.AdminRepository
import com.google.firebase.functions.FirebaseFunctions

class PayMatrixApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        val firestore = FirebaseFirestore.getInstance().apply {
            firestoreSettings = FirebaseFirestoreSettings.Builder()
                .setLocalCacheSettings(com.google.firebase.firestore.PersistentCacheSettings.newBuilder().build())
                .build()
        }
        val auth = AuthRepository(FirebaseAuth.getInstance(), firestore)
        container = AppContainer(auth, FirebaseRepository(firestore, auth), AdminRepository(firestore, FirebaseFunctions.getInstance(), auth))
    }
}

data class AppContainer(
    val auth: AuthRepository,
    val repository: FirebaseRepository,
    val admin: AdminRepository,
)
