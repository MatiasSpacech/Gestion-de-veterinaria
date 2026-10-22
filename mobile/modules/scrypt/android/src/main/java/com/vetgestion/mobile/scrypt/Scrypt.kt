package com.vetgestion.mobile.scrypt

import java.security.SecureRandom
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Implementación de scrypt (RFC 7914) con los mismos parámetros que usa el
 * escritorio: N=16384, r=8, p=1 y clave de 64 bytes.
 *
 * Los hashes generados acá son idénticos a los de `node:crypto` del escritorio,
 * así que una contraseña creada en la PC se puede verificar en el móvil.
 */
object Scrypt {
    private const val DEFAULT_N = 16384
    private const val DEFAULT_R = 8
    private const val DEFAULT_P = 1

    private val secureRandom = SecureRandom()

    fun randomBytesHex(size: Int): String {
        require(size >= 0) { "El tamaño no puede ser negativo" }

        val bytes = ByteArray(size)
        secureRandom.nextBytes(bytes)
        return bytes.toHex()
    }

    fun deriveKeyHex(
        passwordHex: String,
        saltHex: String,
        keyLength: Int,
        n: Int = DEFAULT_N,
        r: Int = DEFAULT_R,
        p: Int = DEFAULT_P
    ): String {
        return scrypt(
            passwordHex.hexToBytes(),
            saltHex.hexToBytes(),
            n,
            r,
            p,
            keyLength
        ).toHex()
    }

    private fun scrypt(
        password: ByteArray,
        salt: ByteArray,
        n: Int,
        r: Int,
        p: Int,
        keyLength: Int
    ): ByteArray {
        require(n > 1 && (n and (n - 1)) == 0) { "N tiene que ser una potencia de 2 mayor que 1" }
        require(r > 0) { "r tiene que ser mayor que 0" }
        require(p > 0) { "p tiene que ser mayor que 0" }
        require(keyLength > 0) { "La longitud de la clave tiene que ser mayor que 0" }

        // 128 * r bytes expresados en palabras de 32 bits.
        val blockWords = 32 * r

        val b = pbkdf2Sha256(password, salt, p * 128 * r)
        val bWords = IntArray(b.size / 4)
        bytesToWords(b, 0, bWords, 0, bWords.size)

        val v = IntArray(n * blockWords)
        val x = IntArray(blockWords)
        val y = IntArray(blockWords)

        for (i in 0 until p) {
            val offset = i * blockWords
            System.arraycopy(bWords, offset, x, 0, blockWords)

            for (j in 0 until n) {
                System.arraycopy(x, 0, v, j * blockWords, blockWords)
                blockMix(x, y, r)
                System.arraycopy(y, 0, x, 0, blockWords)
            }

            for (j in 0 until n) {
                val k = x[(2 * r - 1) * 16] and (n - 1)
                val vOffset = k * blockWords

                for (t in 0 until blockWords) {
                    x[t] = x[t] xor v[vOffset + t]
                }

                blockMix(x, y, r)
                System.arraycopy(y, 0, x, 0, blockWords)
            }

            System.arraycopy(x, 0, bWords, offset, blockWords)
        }

        wordsToBytes(bWords, 0, b, 0, bWords.size)
        return pbkdf2Sha256(password, b, keyLength)
    }

    /**
     * PBKDF2-HMAC-SHA256 con una sola iteración, que es lo que usa scrypt.
     */
    private fun pbkdf2Sha256(password: ByteArray, salt: ByteArray, dkLength: Int): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(password, "HmacSHA256"))

        val output = ByteArray(dkLength)
        var offset = 0
        var blockIndex = 1

        while (offset < dkLength) {
            mac.update(salt)
            mac.update(
                byteArrayOf(
                    (blockIndex ushr 24).toByte(),
                    (blockIndex ushr 16).toByte(),
                    (blockIndex ushr 8).toByte(),
                    blockIndex.toByte()
                )
            )

            val u = mac.doFinal()
            val length = minOf(u.size, dkLength - offset)
            System.arraycopy(u, 0, output, offset, length)

            offset += length
            blockIndex += 1
        }

        return output
    }

    /**
     * BlockMix con 2r bloques de 64 bytes.
     *
     * RFC 7914: la salida se arma como (Y_0, Y_2, ..., Y_1, Y_3, ...), es decir
     * primero los bloques pares y después los impares.
     */
    private fun blockMix(input: IntArray, output: IntArray, r: Int) {
        val x = IntArray(16)
        val t = IntArray(16)

        System.arraycopy(input, (2 * r - 1) * 16, x, 0, 16)

        for (i in 0 until 2 * r) {
            for (j in 0 until 16) {
                t[j] = x[j] xor input[i * 16 + j]
            }

            salsa20_8(t)
            System.arraycopy(t, 0, x, 0, 16)

            val outputIndex = if (i % 2 == 0) (i / 2) * 16 else (r + i / 2) * 16
            System.arraycopy(t, 0, output, outputIndex, 16)
        }
    }

    /**
     * Núcleo Salsa20/8 sobre las 16 palabras del bloque.
     */
    private fun salsa20_8(block: IntArray) {
        var x0 = block[0]
        var x1 = block[1]
        var x2 = block[2]
        var x3 = block[3]
        var x4 = block[4]
        var x5 = block[5]
        var x6 = block[6]
        var x7 = block[7]
        var x8 = block[8]
        var x9 = block[9]
        var x10 = block[10]
        var x11 = block[11]
        var x12 = block[12]
        var x13 = block[13]
        var x14 = block[14]
        var x15 = block[15]

        val i0 = x0
        val i1 = x1
        val i2 = x2
        val i3 = x3
        val i4 = x4
        val i5 = x5
        val i6 = x6
        val i7 = x7
        val i8 = x8
        val i9 = x9
        val i10 = x10
        val i11 = x11
        val i12 = x12
        val i13 = x13
        val i14 = x14
        val i15 = x15

        repeat(4) {
            x4 = x4 xor rotl(x0 + x12, 7)
            x8 = x8 xor rotl(x4 + x0, 9)
            x12 = x12 xor rotl(x8 + x4, 13)
            x0 = x0 xor rotl(x12 + x8, 18)

            x9 = x9 xor rotl(x5 + x1, 7)
            x13 = x13 xor rotl(x9 + x5, 9)
            x1 = x1 xor rotl(x13 + x9, 13)
            x5 = x5 xor rotl(x1 + x13, 18)

            x14 = x14 xor rotl(x10 + x6, 7)
            x2 = x2 xor rotl(x14 + x10, 9)
            x6 = x6 xor rotl(x2 + x14, 13)
            x10 = x10 xor rotl(x6 + x2, 18)

            x3 = x3 xor rotl(x15 + x11, 7)
            x7 = x7 xor rotl(x3 + x15, 9)
            x11 = x11 xor rotl(x7 + x3, 13)
            x15 = x15 xor rotl(x11 + x7, 18)

            x1 = x1 xor rotl(x0 + x3, 7)
            x2 = x2 xor rotl(x1 + x0, 9)
            x3 = x3 xor rotl(x2 + x1, 13)
            x0 = x0 xor rotl(x3 + x2, 18)

            x6 = x6 xor rotl(x5 + x4, 7)
            x7 = x7 xor rotl(x6 + x5, 9)
            x4 = x4 xor rotl(x7 + x6, 13)
            x5 = x5 xor rotl(x4 + x7, 18)

            x11 = x11 xor rotl(x10 + x9, 7)
            x8 = x8 xor rotl(x11 + x10, 9)
            x9 = x9 xor rotl(x8 + x11, 13)
            x10 = x10 xor rotl(x9 + x8, 18)

            x12 = x12 xor rotl(x15 + x14, 7)
            x13 = x13 xor rotl(x12 + x15, 9)
            x14 = x14 xor rotl(x13 + x12, 13)
            x15 = x15 xor rotl(x14 + x13, 18)
        }

        block[0] = i0 + x0
        block[1] = i1 + x1
        block[2] = i2 + x2
        block[3] = i3 + x3
        block[4] = i4 + x4
        block[5] = i5 + x5
        block[6] = i6 + x6
        block[7] = i7 + x7
        block[8] = i8 + x8
        block[9] = i9 + x9
        block[10] = i10 + x10
        block[11] = i11 + x11
        block[12] = i12 + x12
        block[13] = i13 + x13
        block[14] = i14 + x14
        block[15] = i15 + x15
    }

    private fun rotl(value: Int, bits: Int): Int {
        return (value shl bits) or (value ushr (32 - bits))
    }

    private fun bytesToWords(
        bytes: ByteArray,
        byteOffset: Int,
        words: IntArray,
        wordOffset: Int,
        count: Int
    ) {
        for (i in 0 until count) {
            val offset = byteOffset + i * 4

            words[wordOffset + i] = (bytes[offset].toInt() and 0xFF) or
                ((bytes[offset + 1].toInt() and 0xFF) shl 8) or
                ((bytes[offset + 2].toInt() and 0xFF) shl 16) or
                ((bytes[offset + 3].toInt() and 0xFF) shl 24)
        }
    }

    private fun wordsToBytes(
        words: IntArray,
        wordOffset: Int,
        bytes: ByteArray,
        byteOffset: Int,
        count: Int
    ) {
        for (i in 0 until count) {
            val word = words[wordOffset + i]
            val offset = byteOffset + i * 4

            bytes[offset] = (word and 0xFF).toByte()
            bytes[offset + 1] = ((word ushr 8) and 0xFF).toByte()
            bytes[offset + 2] = ((word ushr 16) and 0xFF).toByte()
            bytes[offset + 3] = ((word ushr 24) and 0xFF).toByte()
        }
    }

    private fun ByteArray.toHex(): String {
        val builder = StringBuilder(size * 2)

        for (byte in this) {
            val value = byte.toInt() and 0xFF
            builder.append(HEX_DIGITS[value ushr 4])
            builder.append(HEX_DIGITS[value and 0x0F])
        }

        return builder.toString()
    }

    private fun String.hexToBytes(): ByteArray {
        require(length % 2 == 0) { "El valor hexadecimal tiene que ser par" }

        val bytes = ByteArray(length / 2)

        for (i in bytes.indices) {
            val high = Character.digit(this[i * 2], 16)
            val low = Character.digit(this[i * 2 + 1], 16)

            require(high >= 0 && low >= 0) { "El valor hexadecimal no es válido" }

            bytes[i] = ((high shl 4) or low).toByte()
        }

        return bytes
    }

    private const val HEX_DIGITS = "0123456789abcdef"
}
