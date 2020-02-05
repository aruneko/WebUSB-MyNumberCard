export declare class ASN1Partial {
    private binary;
    private offset;
    private length;
    constructor(binary: Uint8Array);
    private parseTag;
    private parseLength;
    get offsetSize(): number;
    get size(): number;
}
