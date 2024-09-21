export type Answer ={
    domainName: string;
    type: number;
    class: number;
    ttl: number;
    data: string;
}


export const writeAnswer = (answers: Answer[]) =>{
    return Buffer.concat(answers.map((q)=>{
        const buffer = Buffer.alloc(10)
        const s = q.domainName.split('.').map(e=> `${String.fromCharCode(e.length)}${e}`).join('')
        buffer.writeInt16BE(q.type,0)
        buffer.writeInt16BE(q.class,2)
        buffer.writeInt32BE(q.ttl,4)
        buffer.writeInt16BE(q.data.length,8)
        return Buffer.concat([Buffer.from(s + '\0', 'binary'), buffer, Buffer.from(q.data + '\0', 'binary')])

    }))
}