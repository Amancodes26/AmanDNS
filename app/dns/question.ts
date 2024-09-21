 export type Question = {
    type: number;
    class: number;
    domainName: string;
}

export const writeQuestion = (question: Question[])=>{
    return Buffer.concat(question.map((q)=>{
        const typeAndClass = Buffer.alloc(4);
        const s =q.domainName.split(".").map(e=> `${String.fromCharCode(e.length)}${e}`).join('');
        typeAndClass.writeUInt16BE(q.type,0)
        typeAndClass.writeUInt16BE(q.class,2)
        return Buffer.concat([Buffer.from(s),typeAndClass])
    }))
}