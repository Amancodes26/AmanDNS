import * as dgram from "dgram";
import DNSHeader, { TDNSHeader } from "./dns/header";
import { Question, writeQuestion } from "./dns/question";
import { Answer, writeAnswer } from "./dns/answer";

const BUFFER_MIN_LENGTH = 12;
const BUFFER_MAX_LENGTH = 512;

class BufferError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BufferError";
    }
}

function parseDNSHeader(buffer: Buffer): TDNSHeader {
    if (buffer.length < BUFFER_MIN_LENGTH) {
        throw new BufferError("Buffer too short to be a valid DNS header");
    } else if (buffer.length > BUFFER_MAX_LENGTH) {
        throw new BufferError("Buffer too long to be a valid DNS header");
    }

    return {
        ID: buffer.readUInt16BE(0),
        QR: (buffer[2] & 0b10000000) >> 7 === 1,
        OPCODE: (buffer[2] & 0b01111000) >> 3,
        AA: (buffer[2] & 0b00000100) >> 2,
        TC: (buffer[2] & 0b00000010) >> 1,
        RD: (buffer[2] & 0b00000001) === 1,
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
        QR: true,
        OPCODE: requestHeader.OPCODE,
        AA: 0,
        TC: 0,
        RD: requestHeader.RD, // Set RD based on the request
        RA: 0,
        Z: 0,
        ResponseCode: requestHeader.ResponseCode === 0 ? 0 : 4, // Adjust based on request
        QDCount: requestHeader.QDCount,
        ANCount: answerCount,
        NSCount: 0,
        ARCount: 0,
    };
}

console.log("Logs from your program will appear here!");

const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("listening", () => {
    const address = udpSocket.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
});

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
    try {
        const requestHeader = parseDNSHeader(data);
        console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port} - Header ID: ${requestHeader.ID}`);

        const question: Question[] = [{ class: 1, type: 1, domainName: 'codecrafters.io' }];
        const answers: Answer[] = [{
            domainName: 'codecrafters.io',
            type: 1,
            class: 1,
            ttl: 60,
            data: Buffer.from([8, 8, 8, 8])  // IP address in Buffer format
        }];

        const responseHeader = createResponseHeader(requestHeader, answers.length);

        const headerBuffer = DNSHeader.write(responseHeader);
        const questionBuffer = writeQuestion(question);
        const answerBuffer = writeAnswer(answers);

        const response = Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);

        udpSocket.send(response, remoteAddr.port, remoteAddr.address);
    } catch (e) {
        if (e instanceof BufferError) {
            console.error(`Buffer error: ${e.message}`);
        } else {
            console.error(`Error processing message: ${e}`);
        }
    }
});
