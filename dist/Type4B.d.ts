import { RCS380 } from 'rc_s380_driver';
import { Type4BPacket } from './Type4BPacket';
export declare class Type4BTag {
    readonly rcs380: RCS380;
    private nfcID;
    private pni;
    private protocol;
    private rf;
    constructor(rcs380: RCS380);
    static connect(): Promise<Type4BTag>;
    private sendSenseType4BCommand;
    private findType4BTag;
    private sendAttribute;
    connectToCard(): Promise<void>;
    private exchange;
    sendCommand(type4BCommand: Uint8Array): Promise<Type4BPacket>;
    resetNfcID(): void;
}
