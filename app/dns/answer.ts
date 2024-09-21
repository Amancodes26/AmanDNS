export type Answer ={
    domainName: string;
    type: number;
    class: number;
    ttl: number;
    data: Buffer;
}


export const writeAnswer = (answers: Answer[]) => {
    return Buffer.concat(
      answers.map((q) => {
        // Convert the domain name to a proper DNS label format
        const domainLabels = q.domainName.split('.').map((label) => {
          const len = Buffer.from([label.length]);  // Length of the label
          const namePart = Buffer.from(label);      // Label itself
          return Buffer.concat([len, namePart]);
        });
        // Concatenate all the domain labels and append the null byte (0x00) at the end
        const domainBuffer = Buffer.concat([...domainLabels, Buffer.from([0])]);
  
        // Create a buffer for type, class, ttl, and data length
        const buffer = Buffer.alloc(10);
        buffer.writeUInt16BE(q.type, 0);  // Write the type (e.g., A record = 1)
        buffer.writeUInt16BE(q.class, 2); // Write the class (IN = 1)
        buffer.writeUInt32BE(q.ttl, 4);   // Write the TTL
        buffer.writeUInt16BE(q.data.length, 8);  // Write the data length (e.g., 4 for an IPv4 address)
  
        // Convert the data (IP address) to a buffer
        const dataBuffer = Buffer.from(q.data);
  
        // Concatenate domain name, buffer (type/class/ttl), and data
        return Buffer.concat([domainBuffer, buffer, dataBuffer]);
      })
    );
  };
  