import { HashType } from './MessagePacket';
import { PersonalData } from './PersonalData';
export declare class MyNumberCard {
    private device;
    private constructor();
    static connect(): Promise<MyNumberCard>;
    private disconnect;
    private createAdpuCase3Command;
    private selectDF;
    private selectEF;
    private verifyPin;
    private selectCardInfoAP;
    private selectCertAP;
    private selectMyNumberEF;
    private selectPersonalDataEF;
    private selectCardInfoPinEF;
    private selectRSAPrivateKeyPinEF;
    private selectRSAPublicKeyEF;
    private selectRSAPrivateKeyIEF;
    private signMessage;
    private checkPublicKeyLength;
    private readBinary;
    getMyNumber(pin: string): Promise<string>;
    getPersonalData(pin: string): Promise<PersonalData>;
    signMessageWithPrivateKey(hashType: HashType, pin: string, message: string): Promise<Uint8Array>;
    getPublicKey(): Promise<Uint8Array>;
}
