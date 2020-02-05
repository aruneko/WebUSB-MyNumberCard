import { Type4BTag } from './Type4B';
import { ASN1Partial } from './ASN1';
import { MessagePacket } from './MessagePacket';
import { PersonalData } from './PersonalData';
export class MyNumberCard {
    constructor(device) {
        this.device = device;
    }
    static async connect() {
        const device = await Type4BTag.connect();
        return new MyNumberCard(device);
    }
    async disconnect() {
        console.info('===== disconnect =====');
        await this.device.rcs380.disconnect();
        this.device.resetNfcID();
    }
    createAdpuCase3Command(header, rawCommand) {
        const length = Uint8Array.of(rawCommand.byteLength);
        const command = Uint8Array.of(...header, ...length, ...rawCommand);
        return command;
    }
    async selectDF(dedicatedFile) {
        console.info('===== select dedicatedFile =====');
        const header = Uint8Array.of(0x00, 0xa4, 0x04, 0x0c, 0x0a);
        const command = Uint8Array.of(...header, ...dedicatedFile);
        return this.device.sendCommand(command);
    }
    async selectEF(elementaryFile) {
        console.info('===== select ef =====');
        const header = Uint8Array.of(0x00, 0xa4, 0x02, 0x0c);
        const command = this.createAdpuCase3Command(header, elementaryFile);
        return this.device.sendCommand(command);
    }
    async verifyPin(rawPin) {
        console.info('===== verify pin =====');
        const pin = Uint8Array.from(rawPin.split('').map(c => c.charCodeAt(0)));
        const header = Uint8Array.of(0x00, 0x20, 0x00, 0x80);
        const command = this.createAdpuCase3Command(header, pin);
        return this.device.sendCommand(command);
    }
    async selectCardInfoAP() {
        const cardInfoAP = Uint8Array.of(0xD3, 0x92, 0x10, 0x00, 0x31, 0x00, 0x01, 0x01, 0x04, 0x08);
        return this.selectDF(cardInfoAP);
    }
    async selectCertAP() {
        const certAP = Uint8Array.of(0xd3, 0x92, 0xf0, 0x00, 0x26, 0x01, 0x00, 0x00, 0x00, 0x01);
        return this.selectDF(certAP);
    }
    async selectMyNumberEF() {
        return this.selectEF(Uint8Array.of(0x00, 0x01));
    }
    async selectPersonalDataEF() {
        return this.selectEF(Uint8Array.of(0x00, 0x02));
    }
    async selectCardInfoPinEF() {
        return this.selectEF(Uint8Array.of(0x00, 0x11));
    }
    async selectRSAPrivateKeyPinEF() {
        return this.selectEF(Uint8Array.of(0x00, 0x18));
    }
    async selectRSAPublicKeyEF() {
        return this.selectEF(Uint8Array.of(0x00, 0x0a));
    }
    async selectRSAPrivateKeyIEF() {
        return this.selectEF(Uint8Array.of(0x00, 0x17));
    }
    async signMessage(hashType, message) {
        console.info('===== sign =====');
        const command = MessagePacket.makeMessagePacket(hashType, message).payload;
        return this.device.sendCommand(command);
    }
    async checkPublicKeyLength() {
        console.info('===== check Public Key length =====');
        const readPublicKeyCommand = Uint8Array.of(0x00, 0xb0, 0x00, 0x00, 0x07);
        const response = await this.device.sendCommand(readPublicKeyCommand);
        const parser = new ASN1Partial(response.data);
        return parser.size;
    }
    async readBinary(size) {
        const result = new Uint8Array(size);
        let position = 0;
        while (position < size) {
            // 256で割ったあまりをlengthとする
            let length = 0;
            if (size - position > 0xff) {
                length = 0;
            }
            else {
                length = size - position;
            }
            // バイナリをを読み込むコマンドを発行
            const readBinaryCommand = Uint8Array.of(0x00, 0xb0, (position >> 8) & 0xff, position & 0xff, length);
            const response = await this.device.sendCommand(readBinaryCommand);
            // 読み込んだバイナリを後ろにつなげていく
            result.set(response.data, position);
            position += response.data.byteLength;
        }
        return result;
    }
    async getMyNumber(pin) {
        // マイナンバーカードに接続
        await this.device.connectToCard();
        // Select DF
        await this.selectCardInfoAP();
        // Select Pin EF
        await this.selectCardInfoPinEF();
        // Verify Pin
        await this.verifyPin(pin);
        // Select My Number EF
        await this.selectMyNumberEF();
        // Read my number
        const myNumber = await this.readBinary(16);
        // 通信終了
        await this.disconnect();
        return String.fromCharCode(...myNumber.slice(3, 15));
    }
    async getPersonalData(pin) {
        // マイナンバーカードに接続
        await this.device.connectToCard();
        // Select DF
        await this.selectCardInfoAP();
        // Select Pin EF
        await this.selectCardInfoPinEF();
        // Verify Pin
        await this.verifyPin(pin);
        // Select Personal Data EF
        await this.selectPersonalDataEF();
        // Read Personal data length
        const lengthPacket = await this.readBinary(7);
        const parser = new ASN1Partial(lengthPacket);
        // Read Personal Data
        const personalData = await this.readBinary(parser.size);
        // 通信終了
        await this.disconnect();
        return new PersonalData(personalData, parser.offsetSize);
    }
    async signMessageWithPrivateKey(hashType, pin, message) {
        // マイナンバーカードに接続
        await this.device.connectToCard();
        // Select DF
        await this.selectCertAP();
        // Select Pin EF
        await this.selectRSAPrivateKeyPinEF();
        // Verify PIN
        await this.verifyPin(pin);
        // Select Private Key IEF
        await this.selectRSAPrivateKeyIEF();
        // Sign
        const signedMessage = await this.signMessage(hashType, message);
        // 通信終了
        await this.disconnect();
        return signedMessage.data;
    }
    async getPublicKey() {
        // マイナンバーカードに接続
        await this.device.connectToCard();
        // Select DF
        await this.selectCertAP();
        // Select EF
        await this.selectRSAPublicKeyEF();
        // Check Public Key Length
        const publicKeyLength = await this.checkPublicKeyLength();
        // Get Public Key
        const publicKey = await this.readBinary(publicKeyLength);
        // 通信終了
        await this.disconnect();
        // 取得した公開鍵を返す
        return publicKey;
    }
}
