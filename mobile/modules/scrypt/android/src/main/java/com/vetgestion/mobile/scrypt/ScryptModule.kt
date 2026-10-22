package com.vetgestion.mobile.scrypt

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

class ScryptModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("Scrypt")

        Function("deriveKeyHex") { passwordHex: String, saltHex: String, keyLength: Int ->
            Scrypt.deriveKeyHex(passwordHex, saltHex, keyLength)
        }

        Function("randomBytesHex") { size: Int ->
            Scrypt.randomBytesHex(size)
        }

        Function("randomUUID") {
            UUID.randomUUID().toString()
        }
    }
}
