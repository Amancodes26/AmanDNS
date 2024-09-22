import * as dgram from "dgram";
import DNSHeader, { TDNSHeader, OPCODE, ResponseCode } from "./dns/header";
import { Question, writeQuestion, parseQuestion } from "./dns/question";
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
    let responseCode = ResponseCode.NO_ERROR; // Default to NOERROR (0)

    // Set RCODE to 4 (Not Implemented) if the query type is not supported
    if (requestHeader.OPCODE !== OPCODE.STANDARD_QUERY) {
        responseCode = ResponseCode.NOT_IMPLEMENTED; // Not Implemented
    }

    return {
        ID: requestHeader.ID,
        QR: true,
        OPCODE: requestHeader.OPCODE,
        AA: 0,
        TC: 0,
        RD: requestHeader.RD, // Set RD based on the request
        RA: 0,
        Z: 0,
        ResponseCode: responseCode, // Adjust based on request
        QDCount: requestHeader.QDCount,
        ANCount: answerCount,
        NSCount: 0,
        ARCount: 0,
    };
}

function parseDNSQuestions(buffer: Buffer, count: number): Question[] {
    const questions: Question[] = [];
    let offset = 0;

    for (let i = 0; i < count; i++) {
        const question = parseQuestion(buffer.slice(offset));
        questions.push(question);
        offset += question.domainName.split('.').reduce((acc, label) => acc + label.length + 1, 1) + 4; // domain length + null byte + type + class
    }

    return questions;
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

        const questions = parseDNSQuestions(data.slice(12), requestHeader.QDCount);
        console.log(`Parsed ${questions.length} questions`);

        questions.forEach((question, index) => {
            console.log(`Question ${index + 1}: ${question.domainName} - Type: ${question.type}, Class: ${question.class}`);
        });

        const answers: Answer[] = questions.map(question => ({
            domainName: question.domainName,
            type: 1,
            class: 1,
            ttl: 60,
            data: Buffer.from([8, 8, 8, 8])  // IP address in Buffer format
        }));

        const responseHeader = createResponseHeader(requestHeader, answers.length);

        const headerBuffer = DNSHeader.write(responseHeader);
        const questionBuffer = writeQuestion(questions);
        const answerBuffer = writeAnswer(answers);

        const response = Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);

        console.log(`Sending response with Header ID: ${responseHeader.ID}`);
        udpSocket.send(response, remoteAddr.port, remoteAddr.address, (err) => {
            if (err) {
                console.error('Error sending response:', err);
            } else {
                console.log(`Response sent to ${remoteAddr.address}:${remoteAddr.port} - Header ID: ${responseHeader.ID}`);
            }
        });
    } catch (e) {
        if (e instanceof BufferError) {
            console.error(`Buffer error: ${e.message}`);
        } else {
            console.error(`Error processing message: ${e}`);
        }
    }
});