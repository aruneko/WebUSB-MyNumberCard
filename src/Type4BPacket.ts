export class Type4BPacket {
  constructor(private rawPacketData: Uint8Array) {}

  get header(): Uint8Array {
    return this.rawPacketData.slice(0, 8)
  }

  get data(): Uint8Array {
    return this.rawPacketData.slice(8, -2)
  }

  get status(): Uint8Array {
    return this.rawPacketData.slice(-2)
  }
}
