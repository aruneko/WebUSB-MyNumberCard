class ASN1Error {
    constructor(message) {
        this.message = message;
        this.name = 'ASN1Error';
    }
    toString() {
        return this.name + ': ' + this.message;
    }
}
class FewBinarySizeError extends ASN1Error {
}
class UnexpectedTagSizeError extends ASN1Error {
}
class TruncatedTagOrLengthError extends ASN1Error {
}
export class ASN1Partial {
    constructor(binary) {
        this.binary = binary;
        this.offset = 0;
        this.length = 0;
        this.parseTag();
        this.parseLength();
    }
    parseTag() {
        let tagSize = 1;
        if (this.binary.byteLength < 2) {
            throw new FewBinarySizeError('few binary size');
        }
        if ((this.binary[0] & 0x1f) === 0x1f) {
            tagSize += 1;
            if ((this.binary[1] & 0x80) !== 0) {
                throw new UnexpectedTagSizeError('unexpected tag size');
            }
        }
        this.offset = tagSize;
    }
    parseLength() {
        if (this.offset >= this.binary.byteLength) {
            throw new FewBinarySizeError('few binary size');
        }
        let b = this.binary[this.offset];
        this.offset += 1;
        if ((b & 0x80) === 0) {
            this.length = b;
        }
        else {
            const lol = b & 0x7f;
            for (let n of [...Array(lol).keys()]) {
                if (this.offset >= this.binary.byteLength) {
                    throw new TruncatedTagOrLengthError('truncated tag or length');
                }
                b = this.binary[this.offset];
                this.offset += 1;
                this.length <<= 8;
                this.length |= b;
            }
        }
    }
    get offsetSize() {
        return this.offset;
    }
    get size() {
        return this.offset + this.length;
    }
}
