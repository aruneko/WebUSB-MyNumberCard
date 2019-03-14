import jsSha from 'jssha'

export type HashType = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"

export class MessagePacket {
    private header = {
        'SHA-1': Uint8Array.of(
            0x30, 0x21, 0x30, 0x09, 0x06, 0x05, 0x2b, 0x0e, 0x03, 0x02, 0x1a, 0x05, 0x00, 0x04, 0x14
        ),
        'SHA-256': Uint8Array.of(
            0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20,
        ),
        'SHA-384': Uint8Array.of(
            0x30, 0x41, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x02, 0x05, 0x00, 0x04, 0x30
        ),
        'SHA-512': Uint8Array.of(
            0x30, 0x51, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x03, 0x05, 0x00, 0x04, 0x40
        )
    }
    readonly payload: Uint8Array

    private constructor(message: string, hashType: HashType) {
        const hasher = new jsSha(hashType, "TEXT")
        hasher.update(message)

        const signCommand = Uint8Array.of(0x80, 0x2a, 0x00, 0x80)
        const hashedMessage = new Uint8Array(hasher.getHash("ARRAYBUFFER"))
        const header = this.header[hashType]
        const dataLength = Uint8Array.of(
            hashedMessage.byteLength + header.byteLength
        )
        const suffix = 0x00

        this.payload = Uint8Array.of(...signCommand, ...dataLength, ...header, ...hashedMessage, suffix)
    }

    private static asSHA1(message: string): MessagePacket {
        return new MessagePacket(message, 'SHA-1')
    }

    private static asSHA256(message: string): MessagePacket {
        return new MessagePacket(message,'SHA-256')
    }

    private static asSHA384(message: string): MessagePacket {
        return new MessagePacket(message,'SHA-384')
    }

    private static asSHA512(message: string): MessagePacket {
        return new MessagePacket(message,'SHA-512')
    }

    private static makePacketFunctions = {
        'SHA-1': MessagePacket.asSHA1,
        'SHA-256': MessagePacket.asSHA256,
        'SHA-384': MessagePacket.asSHA384,
        'SHA-512': MessagePacket.asSHA512,
    }

    public static makeMessagePacket(hashType: HashType, message: string) {
        return MessagePacket.makePacketFunctions[hashType](message)
    }
}