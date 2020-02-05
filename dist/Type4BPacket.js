export class Type4BPacket {
    constructor(rawPacketData) {
        this.rawPacketData = rawPacketData;
    }
    get header() {
        return this.rawPacketData.slice(0, 8);
    }
    get data() {
        return this.rawPacketData.slice(8, -2);
    }
    get status() {
        return this.rawPacketData.slice(-2);
    }
}
