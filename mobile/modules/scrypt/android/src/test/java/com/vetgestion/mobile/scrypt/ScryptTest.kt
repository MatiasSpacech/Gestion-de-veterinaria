package com.vetgestion.mobile.scrypt

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ScryptTest {
    @Test
    fun generaElMismoHashQueNode() {
        val passwordHex = "636c6176652d736567757261"
        val saltHex = "30313233343536373839616263646566"

        val expected =
            "9ff521059a747c0502233fe0010dfbf749942a1def75d88df6093afd2290afe" +
                "6ab0674c2981602d7d2b900253364f90817645bd1399604d8c05edc1a325be998"

        assertEquals(expected, Scrypt.deriveKeyHex(passwordHex, saltHex, 64))
    }

    @Test
    fun generaSalesAleatoriasDeLaLongitudPedida() {
        val bytes = Scrypt.randomBytesHex(16)

        assertEquals(32, bytes.length)
        assertTrue(bytes.all { it in "0123456789abcdef" })
        assertTrue(Scrypt.randomBytesHex(16) != bytes)
    }
}
