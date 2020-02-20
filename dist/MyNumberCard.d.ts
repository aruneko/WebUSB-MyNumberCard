import { PersonalData } from './PersonalData';
export declare type MyNumberCardRes = Partial<PersonalData> & {
    numOfRetry?: number;
    status: "success" | "fail" | "locked" | "wrong_pin_length";
};
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
    private selectPersonalDataEF;
    private selectCardInfoPinEF;
    private selectCardInfoPinEFB;
    private readBinary;
    getPersonalData(pin: string): Promise<MyNumberCardRes>;
}
