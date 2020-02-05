export declare type HashType = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
export declare class MessagePacket {
    private header;
    readonly payload: Uint8Array;
    private constructor();
    private static asSHA1;
    private static asSHA256;
    private static asSHA384;
    private static asSHA512;
    private static makePacketFunctions;
    static makeMessagePacket(hashType: HashType, message: string): MessagePacket;
}
