export type Question = {
  byteLength: number;
  type: number;
  class: number;
  domainName: string;
}

export const writeQuestion = (question: Question[]) => {
  return Buffer.concat(
      question.map((q) => {
          // Convert the domain name to a proper DNS label format
          const domainLabels = q.domainName.split(".").map((label) => {
              const len = Buffer.from([label.length]);  // Length of the label
              const namePart = Buffer.from(label);      // Label itself
              return Buffer.concat([len, namePart]);
          });

          // Concatenate all the domain labels and append the null byte (0x00) at the end
          const domainBuffer = Buffer.concat([...domainLabels, Buffer.from([0])]);

          // Create the buffer for type and class (4 bytes total)
          const typeAndClass = Buffer.alloc(4);
          typeAndClass.writeUInt16BE(q.type, 0);   // Write the type (16-bit, big-endian)
          typeAndClass.writeUInt16BE(q.class, 2);  // Write the class (16-bit, big-endian)

          // Concatenate the domain buffer with the type and class
          return Buffer.concat([domainBuffer, typeAndClass]);
      })
  );
};

export const parseQuestion = (buffer: Buffer): Question => {
  let offset = 0;
  const labels: string[] = [];

  while (buffer[offset] !== 0) {
      const labelLength = buffer[offset];
      offset += 1;
      labels.push(buffer.slice(offset, offset + labelLength).toString('ascii'));
      offset += labelLength;
  }

  const domainName = labels.join('.');
  offset += 1; // Skip the null byte that terminates the domain name

  const type = buffer.readUInt16BE(offset);
  offset += 2;

  const qclass = buffer.readUInt16BE(offset);
  offset += 2;

  return {
      domainName,
      type,
      class: qclass,
      byteLength: offset
  };
};