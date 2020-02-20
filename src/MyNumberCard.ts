import { Type4BTag } from './Type4B'
import { Type4BPacket } from './Type4BPacket';
import { ASN1Partial } from './ASN1';
import { PersonalData } from './PersonalData'

type MyNumberCardRes = Partial<PersonalData> & {numOfRetry?: number,
  status: "success" | "fail" | "locked" | "wrong_pin_length"}

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

  private async selectPersonalDataEF(): Promise<Type4BPacket> {
    return this.selectEF(Uint8Array.of(0x00, 0x02))
  }

  private async selectCardInfoPinEF(): Promise<Type4BPacket> {
    return this.selectEF(Uint8Array.of(0x00, 0x11))
  }

  private async selectCardInfoPinEFB(): Promise<Type4BPacket> {
    return this.selectEF(Uint8Array.of(0x00, 0x11))
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
  public async getPersonalData(pin: string): Promise<MyNumberCardRes> {
    // マイナンバーカードに接続
    await this.device.connectToCard()

    // Select DF
    await this.selectCardInfoAP()

    // Select Pin EF
    if (pin.length === 4) {
      await this.selectCardInfoPinEF()
    } else if (pin.length === 14) {
      await this.selectCardInfoPinEFB()
    } else {
      console.error("wrong pin length");
      await this.disconnect();
      return {status: "wrong_pin_length"}
    }

    // Verify Pin
    const result = await this.verifyPin(pin);

    // https://qiita.com/gebo/items/fa35c1f725f4c443f3f3#%EF%BC%93verify-%E8%AA%8D%E8%A8%BC%E7%94%A8pin
    const status = result.status;
    // pin is successfully verified
    if (status[0] === 0x90 && status[1] === 0x00)
    {
      // Select Personal Data EF
      await this.selectPersonalDataEF();

      // Read Personal data length
      const lengthPacket = await this.readBinary(7)
      const parser = new ASN1Partial(lengthPacket)

      // Read Personal Data
      const personalData = await this.readBinary(parser.size)

      // 通信終了
      await this.disconnect();
      const returnPersonalData = new PersonalData(personalData);
      return {
        ...returnPersonalData,
        status: "success"
      }
    } else if (status[0] === 0x69 && status[1] === 0x84) {
      // pin is locked
      await this.disconnect();
      return {
        status: "locked"
      }
    } else {
      // wrong pin
      await this.disconnect();
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Atomics/sub
      Atomics.sub(status, 1, 192);
      const numOfRetry = Atomics.load(status, 0);
      return {
        numOfRetry,
        status: "fail"
      }
    }
  }
}
