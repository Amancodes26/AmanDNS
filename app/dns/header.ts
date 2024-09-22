export enum OPCODE {
    STANDARD_QUERY = 0,
    INVERSE_QUERY = 1,
    SERVER_STATUS_REQUEST = 2,
    RESERVED = 3,
}

export enum ResponseCode {
    NO_ERROR = 0,
    FORMAT_ERROR = 1,
    SERVER_FAILURE = 2,
    NAME_ERROR = 3,
    NOT_IMPLEMENTED = 4,
    REFUSED = 5,
}

export enum QueryType {
    A = 1,
    NS = 2,
    CNAME = 5,
    SOA = 6,
    PTR = 12,
    MX = 15,
    TXT = 16,
    AAAA = 28,
}

export enum QueryClass {
    IN = 1,
    CH = 3,
    HS = 4,
}

export interface TDNSHeader {
    ID: number;
    QR: boolean;
    OPCODE: OPCODE;
    AA: boolean;
    TC: boolean;
    RD: boolean;
    RA: boolean;
    Z: number;
    ResponseCode: ResponseCode;
    QDCount: number;
    ANCount: number;
    NSCount: number;
    ARCount: number;
}

class DNSHeader {
    ID: number = 0;
    QR: boolean = false;
    OPCODE: OPCODE = OPCODE.STANDARD_QUERY;
    AA: boolean = false;
    TC: boolean = false;
    RD: boolean = false;
    RA: boolean = false;
    Z: number = 0;
    ResponseCode: ResponseCode = ResponseCode.NO_ERROR;
    QDCount: number = 0;
    ANCount: number = 0;
    NSCount: number = 0;
    ARCount: number = 0;

    static write(values: TDNSHeader): Buffer {
        const header = Buffer.alloc(12);

        const flags = (values.QR ? 1 : 0) << 15 |
                      (values.OPCODE << 11) |
                      (values.AA ? 1 : 0) << 10 |
                      (values.TC ? 1 : 0) << 9 |
                      (values.RD ? 1 : 0) << 8 |
                      (values.RA ? 1 : 0) << 7 |
                      (values.Z << 4) |
                      values.ResponseCode;

        header.writeUInt16BE(values.ID, 0);
        header.writeUInt16BE(flags, 2);
        header.writeUInt16BE(values.QDCount, 4);
        header.writeUInt16BE(values.ANCount, 6);
        header.writeUInt16BE(values.NSCount, 8);
        header.writeUInt16BE(values.ARCount, 10);

        return header; // Return the buffer
    }

    static fromBuffer(data: Buffer): TDNSHeader {
        const header = new DNSHeader();

        header.ID = data.readUInt16BE(0);

        const flags1 = data.readUInt8(2);
        header.QR = (flags1 & 0x80) !== 0;
        header.OPCODE = (flags1 >> 3) & 0x0F;
        header.AA = (flags1 & 0x04) !== 0;
        header.TC = (flags1 & 0x02) !== 0;
        header.RD = (flags1 & 0x01) !== 0;

        const flags2 = data.readUInt8(3);
        header.RA = (flags2 & 0x80) !== 0;
        header.Z = (flags2 >> 4) & 0x07;
        header.ResponseCode = flags2 & 0x0F;

        header.QDCount = data.readUInt16BE(4);
        header.ANCount = data.readUInt16BE(6);
        header.NSCount = data.readUInt16BE(8);
        header.ARCount = data.readUInt16BE(10);

        return {
            ID: header.ID,
            QR: header.QR,
            OPCODE: header.OPCODE,
            AA: header.AA,
            TC: header.TC,
            RD: header.RD,
            RA: header.RA,
            Z: header.Z,
            ResponseCode: header.ResponseCode,
            QDCount: header.QDCount,
            ANCount: header.ANCount,
            NSCount: header.NSCount,
            ARCount: header.ARCount
        };
    }
}

export default DNSHeader;
