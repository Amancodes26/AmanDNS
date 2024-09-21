import * as dgram from "dgram";
import DNSHeader ,{OPCODE, ResponseCode,TDNSHeader} from "./dns/header" ;

const defaultHeader: TDNSHeader = {
    ID: 1234,
    QR: 1,
    OPCODE: OPCODE.STANDARD_QUERY,
    AA: false,
    TC: false,
    RD: false,
    RA: false,
    Z: 0,
    ResponseCode: ResponseCode.NO_ERROR,
    QDCount: 0,
    ANCount: 0,
    NSCount: 0,
    ARCount: 0,
}

console.log("Logs from your program will appear here!");

// Create a UDP server
const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
    try {
        console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);
        

        const header = DNSHeader.write(defaultHeader);
        const response = Buffer.concat([header, data]);

        udpSocket.send(response, remoteAddr.port, remoteAddr.address);
    } catch (e) {
        console.log(`Error sending data: ${e}`);
    }
});
