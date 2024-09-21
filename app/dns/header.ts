
export enum OPCODE{
    STANDARD_QUERY = 0,
    INVERSE_QUERY = 1,
    SERVER_STATUS_REQUEST = 2,
    RESERVED = 3,
}

export enum ResponseCode{
    NO_ERROR = 0,
    FORMAT_ERROR = 1,
    SERVER_FAILURE =2,
    NAME_ERROR=3,
    NOT_IMPLEMENTED=4,
    REFUSED=5,
}

export enum QueryType{
    A = 1,
    NS = 2,
    CNAME = 5,
    SOA = 6,
    PTR = 12,
    MX = 15,
    TXT = 16,
    AAAA = 28,
}

export enum QueryClass{
    IN = 1,
    CH = 3,
    HS = 4,
}

export interface TDNSHeader{
    ID:number,
    QR: number,
    OPCODE: OPCODE,
    AA:number,
    TC:number,
    RD:boolean,
    RA:number,
    Z:number,
    ResponseCode: ResponseCode,
    QDCount:number,
    ANCount:number,
    NSCount:number,
    ARCount:number,
}

class DNSHeader{
    static write(values: TDNSHeader){
        const header = Buffer.alloc(12);

        const flags = (values.QR << 15) | (values.AA ? 1 : 0) << 5 | (values.TC ? 1 : 0) << 6 | (values.RD ? 1 : 0) << 7 | (values.RA ? 1 : 0) << 8 | values.Z << 4 | values.ResponseCode;
        header.writeUInt16BE(values.ID, 0);
        header.writeUInt16BE(flags, 2);
        header.writeUInt16BE(values.QDCount, 4);
        header.writeUInt16BE(values.ANCount, 6);
        header.writeUInt16BE(values.NSCount, 8);
        header.writeUInt16BE(values.ARCount, 10);

        return header;
    }
    
}

export default DNSHeader;

