export declare class PersonalData {
    readonly name: string;
    readonly address: string;
    readonly birthday: Date;
    readonly sex: string;
    constructor(rawData: Uint8Array, offsetSize: number);
}
