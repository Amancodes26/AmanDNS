import * as dgram from "dgram";
import DNSHeader ,{OPCODE, ResponseCode,TDNSHeader} from "./dns/header" ;
import { Question , writeQuestion } from "./dns/question";
import { Answer, writeAnswer } from "./dns/answer";


function parseDNSHeader(buffer: Buffer): TDNSHeader {
    return {
      ID: buffer.readUInt16BE(0),              // ID field (16 bits)
      QR: (buffer[2] & 0b10000000) >> 7,       // QR field (1 bit)
      OPCODE: (buffer[2] & 0b01111000) >> 3,   // OPCODE field (4 bits)
      AA: (buffer[2] & 0b00000100) >> 2,       // AA field (1 bit)
      TC: (buffer[2] & 0b00000010) >> 1,       // TC field (1 bit)
      RD: buffer[2] & 0b00000001,              // Parse RD field from request (correct)
      RA: (buffer[3] & 0b10000000) >> 7,       // RA field (1 bit)
      Z: (buffer[3] & 0b01110000) >> 4,        // Z field (3 bits)
      ResponseCode: buffer[3] & 0b00001111,     // RCODE field (4 bits)
      QDCount: buffer.readUInt16BE(4),          // QDCount field (16 bits)
      ANCount: buffer.readUInt16BE(6),          // ANCount field (16 bits)
      NSCount: buffer.readUInt16BE(8),          // NSCount field (16 bits)
      ARCount: buffer.readUInt16BE(10),         // ARCount field (16 bits)
    }; 
  }


  
  function createResponseHeader(requestHeader: TDNSHeader, answerCount: number): TDNSHeader {
    return {
      ID: requestHeader.ID,                    // Mimic the ID from the request
      QR: 1,                                   // This is a response (1)
      OPCODE: requestHeader.OPCODE,            // Mimic the OPCODE from the request
      AA: 0,                                   // Authoritative Answer (0)
      TC: 0,                                   // Truncation (0)
      RD: requestHeader.RD,                    // Mimic the RD (Recursion Desired)
      RA: 0,                                   // Recursion Available (0)
      Z: 0,                                    // Reserved (Z) (3 bits set to 0)
      ResponseCode: requestHeader.OPCODE === 0 ? 0 : 4,  // Response Code: 0 if OPCODE is 0, else 4 (Not Implemented)
      QDCount: requestHeader.QDCount,          // Use the same QDCount
      ANCount: answerCount,                    // Set to the number of answers
      NSCount: 0,                              // NSCount (0)
      ARCount: 0,                              // ARCount (0)
    };
  }
  

console.log("Logs from your program will appear here!");

// Create a UDP server
const udpSocket: dgram.Socket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");

udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
    try {
      console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);
  
      // Parse the DNS header from the incoming packet
      const requestHeader = parseDNSHeader(data);
  
      // Define DNS question
      const question: Question[] = [{ class: 1, type: 1, domainName: 'codecrafters.io' }];
  
      // DNS answers (A record with IP address 8.8.8.8)
      const answers: Answer[] = [{
        domainName: 'codecrafters.io',
        type: 1,  // A record
        class: 1, // IN (Internet)
        ttl: 60,
        data: '\x08\x08\x08\x08'  // Binary IP address 8.8.8.8
      }];
  
      // Construct the response header
      const responseHeader = createResponseHeader(requestHeader, answers.length);
  
      // Serialize the header, question, and answer
      const headerBuffer = DNSHeader.write(responseHeader);
      const questionBuffer = writeQuestion(question);
      const answerBuffer = writeAnswer(answers);
  
      // Concatenate the header, question, and answer to form the response
      const response = Buffer.concat([headerBuffer, questionBuffer, answerBuffer]);
  
      // Send the response
      udpSocket.send(response, remoteAddr.port, remoteAddr.address);
    } catch (e) {
      console.log(`Error sending data: ${e}`);
    }
  });
  