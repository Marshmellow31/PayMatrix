package com.paymatrix.app.ui.sound

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool

/**
 * SoundManager
 * Manages low-latency audio cues via Android SoundPool
 */
object SoundManager {
    private var soundPool: SoundPool? = null
    private val soundMap = mutableMapOf<String, Int>()
    var isMuted: Boolean = false

    fun init(context: Context) {
        if (soundPool != null) return

        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        soundPool = SoundPool.Builder()
            .setMaxStreams(4)
            .setAudioAttributes(audioAttributes)
            .build()

        // Placeholder IDs: can be wired to res/raw assets
        soundMap["pop"] = 1
        soundMap["coin"] = 2
        soundMap["fanfare"] = 3
    }

    fun play(key: String) {
        if (isMuted) return
        val soundId = soundMap[key] ?: return
        soundPool?.play(soundId, 0.7f, 0.7f, 1, 0, 1.0f)
    }

    fun release() {
        soundPool?.release()
        soundPool = null
        soundMap.clear()
    }
}
