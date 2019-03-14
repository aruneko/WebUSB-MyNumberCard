import { Type4BTag } from './Type4B'
import { Type4BPacket } from './Type4BPacket';
import { ASN1Partial } from './ASN1';
import { HashType, MessagePacket } from './MessagePacket';

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

  private async selectRSAPrivateKeyEF(): Promise<Type4BPacket> {
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

  public async signMessageWithPrivateKey(hashType: HashType, pin: string, message: string): Promise<Uint8Array> {
    // マイナンバーカードに接続
    await this.device.connectToCard()

    // Select DF
    await this.selectCertAP()

    // Select EF
    await this.selectRSAPrivateKeyEF()

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

  private async getPublicKeyFromCard(publicKeyLength: number): Promise<Uint8Array> {
    console.info('===== get public key =====')
    // 公開鍵を格納する変数を定義
    const publicKey = new Uint8Array(publicKeyLength)
    let position = 0

    while (position < publicKeyLength) {
      // 256で割ったあまりをlengthとする
      let length = 0
      if (publicKeyLength - position > 0xff) {
        length = 0
      } else {
        length = publicKeyLength - position
      }
      // 公開鍵を読み込むコマンドを発行
      const readPublicKeyCommand = Uint8Array.of(
        0x00,
        0xb0,
        (position >> 8) & 0xff,
        position & 0xff,
        length
      )
      const response = await this.device.sendCommand(
        readPublicKeyCommand
      )
      // 読み込んだ公開鍵を後ろにつなげていく
      publicKey.set(response.data, position)
      position += response.data.byteLength
    }
    return publicKey
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
    const publicKey = await this.getPublicKeyFromCard(publicKeyLength)
    console.log(
      'publicKey: ',
      publicKey.reduce((memo: string, i: number) => {
        return memo + ', 0x' + ('0' + i.toString(16)).slice(-2)
      }, '')
    )

    // 通信終了
    await this.disconnect()

    // 取得した公開鍵を返す
    return publicKey
  }
}
