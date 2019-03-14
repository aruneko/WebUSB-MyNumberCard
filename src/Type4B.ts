import { RCS380, ReceivedPacket } from 'rc_s380_driver'
import { Type4BPacket } from './Type4BPacket'

export class Type4BTag {
  private nfcID = new Uint8Array(0)
  private pni = 0
  private protocol = Uint8Array.of(
    0x0b,
    0x01,
    0x09,
    0x01,
    0x0c,
    0x01,
    0x0a,
    0x01,
    0x00,
    0x14
  )
  private rf = Uint8Array.of(0x03, 0x07, 0x0f, 0x07)

  constructor(readonly rcs380: RCS380) {}

  public static async connect(): Promise<Type4BTag> {
    const device = await RCS380.connect()
    return new Type4BTag(device)
  }

  private async sendSenseType4BCommand(): Promise<ReceivedPacket> {
    const payload = Uint8Array.of(0x05, 0x00, 0x10)
    return this.rcs380.inCommRf(payload, 0.03)
  }

  private async findType4BTag() {
    console.info('===== find Type 4B tag =====')
    // カードを検出するまでNFC IDを取得し続ける
    while (this.nfcID.byteLength === 0) {
      // TypeBタグを見つけるためのコマンド群
      await this.rcs380.sendPreparationCommands(this.rf, this.protocol)
      // ここでワンタイムNFC IDを取得してthis.nfcIDに書き込む
      const result = await this.sendSenseType4BCommand()
      // NFC-IDはデータのオフセット8から4bytes分
      this.nfcID = result.data.slice(8, 12)
    }
  }

  private async sendAttribute() {
    console.info('===== send attrib =====')

    await this.rcs380.sendPreparationCommands(this.rf, this.protocol)
    // 取得したNFC IDを利用して接続を確立する
    const attribute = new Uint8Array(1 + this.nfcID.byteLength + 4)
    attribute.set(Uint8Array.of(0x1d), 0)
    attribute.set(this.nfcID, 1)
    attribute.set(
      Uint8Array.of(0x00, 0x08, 0x01, 0x00),
      1 + this.nfcID.byteLength
    )
    await this.rcs380.inCommRf(attribute, 0.03)
  }

  public async connectToCard() {
    // ACKの送信とデバイスの初期化
    await this.rcs380.initDevice()
    // NFC TypeBタグを見つける
    await this.findType4BTag()
    // ATTRIBの送信
    await this.sendAttribute()
  }

  private async exchange(type4BCommand: Uint8Array, timeoutMs: number): Promise<Type4BPacket> {
    // pniからpfbを生成
    // pniは常に0か1が入っているので、pfbは常に2か3になる
    const pfb = 0x02 | this.pni
    // pfbとTypeB用コマンドを組み合わせてin_comm_rfに投げる
    const data = Uint8Array.of(pfb, ...type4BCommand)
    const response = await this.rcs380.inCommRf(data, timeoutMs)
    // よくわからないがデータのオフセット7を見てpniの判定を入れるらしい。
    if ((response.data[7] & 0b11101110) === 0x02) {
      this.pni = (this.pni + 1) % 2
    }
    if (Boolean(response.data[7] & 0b00010000)) {
      console.info('===== send a2 =====')
      // 長くて取得しきれなかった部分を追加で取得
      await this.rcs380.sendPreparationCommands(this.rf, this.protocol)
      const a2Response = await this.rcs380.inCommRf(
        Uint8Array.of(0xa2 | this.pni),
        timeoutMs
      )
      const a2Packet = new Type4BPacket(a2Response.data)
      // 元のレスポンスを拡張して不足分を追加
      const a2Result = Uint8Array.of(...response.data, ...a2Packet.data, ...a2Packet.status)
      this.pni = (this.pni + 1) % 2
      return new Type4BPacket(a2Result)
    } else {
      return new Type4BPacket(response.data)
    }
  }

  public async sendCommand(type4BCommand: Uint8Array): Promise<Type4BPacket> {
    await this.rcs380.sendPreparationCommands(this.rf, this.protocol)
    return this.exchange(type4BCommand, this.rcs380.timeout)
  }

  public resetNfcID() {
    this.nfcID = new Uint8Array(0)
  }
}
