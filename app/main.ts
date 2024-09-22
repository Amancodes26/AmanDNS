import * as dgram from "dgram";
import DNSHeader, { TDNSHeader } from "./dns/header";
import { Question, parseQuestion, writeQuestion } from "./dns/question";
import { Answer, writeAnswer } from "./dns/answer";

const BUFFER_MIN_LENGTH = 12;
const BUFFER_MAX_LENGTH = 512;

class BufferError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "BufferError";
    }
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
        if (data.length < BUFFER_MIN_LENGTH || data.length > BUFFER_MAX_LENGTH) {
            throw new BufferError("Invalid buffer length");
        }

        // Parse DNS Header
        const header = parseHeader(data);
        console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port} - Header ID: ${header.ID}`);

        // Parse Questions
        const questions = parseQuestions(data, header.QDCount);
        console.log(`Parsed ${questions.length} questions`);
        questions.forEach((question, index) => {
            console.log(`Question ${index + 1}: ${question.domainName} - Type: ${question.type}, Class: ${question.class}`);
        });

        // Create Answers based on Questions
        const answers = createAnswers(questions);

        // Modify header for response
        header.QR = true; // Set response flag
        header.ANCount = answers.length;

        // Create DNS Response
        const response = createResponse(header, questions, answers);

        // Send Response back to the client
        sendResponse(response, remoteAddr, header.ID); // Use header.ID consistently
    } catch (e: unknown) {
        handleError(e as Error);
    }
});

function parseHeader(data: Buffer): TDNSHeader {
    const header = DNSHeader.fromBuffer(data);
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
    
    return header;
}

function parseQuestions(data: Buffer, qdCount: number): Question[] {
    let offset = 12;
    const questions: Question[] = [];
    for (let i = 0; i < qdCount; i++) {
        const question = parseQuestion(data.subarray(offset));
        questions.push(question);
        offset += question.byteLength; // Adjust the offset based on the question's byte length
        console.log(`Parsed question ${i + 1} at offset ${offset}`); // Debugging log for offset tracking
    }
    return questions;
}

function createAnswers(questions: Question[]): Answer[] {
    return questions.map(question => ({
        domainName: question.domainName,
        type: 1,  // A record
        class: 1,  // IN class
        ttl: 60,   // Time to live
        data: Buffer.from([8, 8, 8, 8])  // Example IP address (8.8.8.8)
    }));
}

function createResponse(header: TDNSHeader, questions: Question[], answers: Answer[]): Buffer {
    const headerBuffer = DNSHeader.write(header);
    const questionBuffer = Buffer.concat(questions.map((q: Question) => writeQuestion([q])));
    const answerBuffer = Buffer.concat(answers.map((a: Answer) => writeAnswer([a])));
    console.log("Creating response buffer...");
    return Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);
}

function sendResponse(response: Buffer, remoteAddr: dgram.RemoteInfo, headerId: number): void {
    udpSocket.send(response, remoteAddr.port, remoteAddr.address, (err) => {
        if (err) {
            console.error('Error sending response:', err);
        } else {
            console.log(`Response sent to ${remoteAddr.address}:${remoteAddr.port} - Header ID: ${headerId}`);
        }
    });
}

function handleError(e: Error): void {
    if (e instanceof BufferError) {
        console.error(`Buffer error: ${e.message}`);
    } else {
        console.error(`Error processing message: ${e}`);
    }
}
