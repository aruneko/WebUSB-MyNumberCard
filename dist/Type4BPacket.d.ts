export declare class Type4BPacket {
    private rawPacketData;
    constructor(rawPacketData: Uint8Array);
    get header(): Uint8Array;
    get data(): Uint8Array;
    get status(): Uint8Array;
}
