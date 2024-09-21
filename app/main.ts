import * as dgram from "dgram";
import DNSHeader, { TDNSHeader } from "./dns/header";
import { Question, writeQuestion } from "./dns/question";
import { Answer, writeAnswer } from "./dns/answer";

function parseDNSHeader(buffer: Buffer): TDNSHeader {
    return {
        ID: buffer.readUInt16BE(0),
        QR: (buffer[2] & 0b10000000) >> 7,
        OPCODE: (buffer[2] & 0b01111000) >> 3,
        AA: (buffer[2] & 0b00000100) >> 2,
        TC: (buffer[2] & 0b00000010) >> 1,
        RD: buffer[2] & 0b00000001,
        RA: (buffer[3] & 0b10000000) >> 7,
        Z: (buffer[3] & 0b01110000) >> 4,
        ResponseCode: buffer[3] & 0b00001111,
        QDCount: buffer.readUInt16BE(4),
        ANCount: buffer.readUInt16BE(6),
        NSCount: buffer.readUInt16BE(8),
        ARCount: buffer.readUInt16BE(10),
    };
}

function createResponseHeader(requestHeader: TDNSHeader, answerCount: number): TDNSHeader {
    return {
        ID: requestHeader.ID,
        QR: 1,
        OPCODE: requestHeader.OPCODE,
        AA: 0,
        TC: 0,
        RD: 1, // Ensure RD (Recursion Desired) is set to true
        RA: 0,
        Z: 0,
        ResponseCode: requestHeader.OPCODE === 0 ? 0 : 4,
        QDCount: requestHeader.QDCount,
        ANCount: answerCount,
        NSCount: 0,
        ARCount: 0,
    };
}

// Removed unused writeDNSHeader function

console.log("Logs from your program will appear here!");

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("listening", () => {
    const address = udpSocket.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
});

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
    try {
        console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);

        const requestHeader = parseDNSHeader(data);

        const question: Question[] = [{ class: 1, type: 1, domainName: 'codecrafters.io' }];

        const answers: Answer[] = [{
            domainName: 'codecrafters.io',
            type: 1,
            class: 1,
            ttl: 60,
            data: Buffer.from([8, 8, 8, 8])  // Correctly format the IP address as a Buffer
        }];

        const responseHeader = createResponseHeader(requestHeader, answers.length);

        const headerBuffer = DNSHeader.write(responseHeader);
        const questionBuffer = writeQuestion(question);
        const answerBuffer = writeAnswer(answers);
        // Ensure RD (Recursion Desired) is set to true in the response header
        if (requestHeader.RD) {
            responseHeader.RD = 1;
        }

        const response = Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);

        udpSocket.send(response, remoteAddr.port, remoteAddr.address);
    } catch (e) {
        console.log(`Error sending data: ${e}`);
    }
});
