import { Type4BTag } from './Type4B'
import { Type4BPacket } from './Type4BPacket';
import { ASN1Partial } from './ASN1';
import { HashType, MessagePacket } from './MessagePacket';
import { PersonalData } from './PersonalData'

export class MyNumberCard {
  private constructor(private device: Type4BTag) {}

  public static async connect(): Promise<MyNumberCard> {
    const device = await Type4BTag.connect()
    return new MyNumberCard(device)
  }

  private async disconnect() {
    console.info('===== disconnect =====')
    await this.device.rcs380.disconnect()
    this.device.resetNfcID()
  }

  private createAdpuCase3Command(header: Uint8Array, rawCommand: Uint8Array): Uint8Array {
    const length = Uint8Array.of(rawCommand.byteLength)
    const command = Uint8Array.of(...header, ...length, ...rawCommand)
    return command
  }

  private async selectDF(dedicatedFile: Uint8Array): Promise<Type4BPacket> {
    console.info('===== select dedicatedFile =====')
    const header = Uint8Array.of(0x00, 0xa4, 0x04, 0x0c, 0x0a)
    const command = Uint8Array.of(...header, ...dedicatedFile)
    return this.device.sendCommand(command)
  }

  private async selectEF(elementaryFile: Uint8Array): Promise<Type4BPacket> {
    console.info('===== select ef =====')
    const header = Uint8Array.of(0x00, 0xa4, 0x02, 0x0c)
    const command = this.createAdpuCase3Command(header, elementaryFile)
    return this.device.sendCommand(command)
  }

  private async verifyPin(rawPin: string): Promise<Type4BPacket> {
    console.info('===== verify pin =====')
    const pin = Uint8Array.from(rawPin.split('').map(c => c.charCodeAt(0)))
    const header = Uint8Array.of(0x00, 0x20, 0x00, 0x80)
    const command = this.createAdpuCase3Command(header, pin)
    return this.device.sendCommand(command)
  }

  private async selectCardInfoAP(): Promise<Type4BPacket> {
    const cardInfoAP = Uint8Array.of(0xD3, 0x92, 0x10, 0x00, 0x31, 0x00, 0x01, 0x01, 0x04, 0x08)
    return this.selectDF(cardInfoAP)
  }

  private async selectCertAP(): Promise<Type4BPacket> {
    const certAP = Uint8Array.of(
      0xd3,
      0x92,
      0xf0,
      0x00,
      0x26,
      0x01,
      0x00,
      0x00,
      0x00,
      0x01
    )
    return this.selectDF(certAP)
  }

  private async selectMyNumberEF(): Promise<Type4BPacket> {
    return this.selectEF(Uint8Array.of(0x00, 0x01))
  }

  private async selectPersonalDataEF(): Promise<Type4BPacket> {
    return this.selectEF(Uint8Array.of(0x00, 0x02))
  }

  private async selectCardInfoPinEF(): Promise<Type4BPacket> {
    return this.selectEF(Uint8Array.of(0x00, 0x11))
  }

  private async selectRSAPrivateKeyPinEF(): Promise<Type4BPacket> {
    return this.selectEF(Uint8Array.of(0x00, 0x18))
  }

  private async selectRSAPublicKeyEF(): Promise<Type4BPacket> {
    return this.selectEF(Uint8Array.of(0x00, 0x0a))
  }

  private async selectRSAPrivateKeyIEF(): Promise<Type4BPacket> {
    return this.selectEF(Uint8Array.of(0x00, 0x17))
  }

  private async signMessage(hashType: HashType, message: string): Promise<Type4BPacket> {
    console.info('===== sign =====')
    const command = MessagePacket.makeMessagePacket(hashType, message).payload
    return this.device.sendCommand(command)
  }

  private async checkPublicKeyLength(): Promise<number> {
    console.info('===== check Public Key length =====')
    const readPublicKeyCommand = Uint8Array.of(0x00, 0xb0, 0x00, 0x00, 0x07)
    const response = await this.device.sendCommand(readPublicKeyCommand)
    const parser = new ASN1Partial(response.data)
    return parser.size
  }

  private async readBinary(size: number): Promise<Uint8Array> {
    const result = new Uint8Array(size)
    let position = 0

    while (position < size) {
      // 256で割ったあまりをlengthとする
      let length = 0
      if (size - position > 0xff) {
        length = 0
      } else {
        length = size - position
      }
      // バイナリをを読み込むコマンドを発行
      const readBinaryCommand = Uint8Array.of(
        0x00,
        0xb0,
        (position >> 8) & 0xff,
        position & 0xff,
        length
      )
      const response = await this.device.sendCommand(
        readBinaryCommand
      )
      // 読み込んだバイナリを後ろにつなげていく
      result.set(response.data, position)
      position += response.data.byteLength
    }
    return result
  }

  public async getMyNumber(pin: string): Promise<string> {
    // マイナンバーカードに接続
    await this.device.connectToCard()

    // Select DF
    await this.selectCardInfoAP()

    // Select Pin EF
    await this.selectCardInfoPinEF()

    // Verify Pin
    await this.verifyPin(pin)

    // Select My Number EF
    await this.selectMyNumberEF()

    // Read my number
    const myNumber = await this.readBinary(16)

    // 通信終了
    await this.disconnect()

    return String.fromCharCode(...myNumber.slice(3, 15))
  }

  public async getPersonalData(pin: string): Promise<PersonalData> {
    // マイナンバーカードに接続
    await this.device.connectToCard()

    // Select DF
    await this.selectCardInfoAP()

    // Select Pin EF
    await this.selectCardInfoPinEF()

    // Verify Pin
    await this.verifyPin(pin)

    // Select Personal Data EF
    await this.selectPersonalDataEF()

    // Read Personal data length
    const lengthPacket = await this.readBinary(7)
    const parser = new ASN1Partial(lengthPacket)

    // Read Personal Data
    const personalData = await this.readBinary(parser.size)

    // 通信終了
    await this.disconnect()

    return new PersonalData(personalData, parser.offsetSize)
  }

  public async signMessageWithPrivateKey(hashType: HashType, pin: string, message: string): Promise<Uint8Array> {
    // マイナンバーカードに接続
    await this.device.connectToCard()

    // Select DF
    await this.selectCertAP()

    // Select Pin EF
    await this.selectRSAPrivateKeyPinEF()

    // Verify PIN
    await this.verifyPin(pin)

    // Select Private Key IEF
    await this.selectRSAPrivateKeyIEF()

    // Sign
    const signedMessage = await this.signMessage(hashType, message)

    // 通信終了
    await this.disconnect()

    return signedMessage.data
  }

  public async getPublicKey() {
    // マイナンバーカードに接続
    await this.device.connectToCard()

    // Select DF
    await this.selectCertAP()

    // Select EF
    await this.selectRSAPublicKeyEF()

    // Check Public Key Length
    const publicKeyLength = await this.checkPublicKeyLength()

    // Get Public Key
    const publicKey = await this.readBinary(publicKeyLength)

    // 通信終了
    await this.disconnect()

    // 取得した公開鍵を返す
    return publicKey
  }
}
