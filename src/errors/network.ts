export class UnknownStatusCode {
    waitingFor: number[] = [];
    recieved: number = -1;
    msg?: string;
    
    constructor({ waitingFor, recieved, msg }: {
        waitingFor: number[], recieved: number,
        msg?: string
    }) {
        this.waitingFor = waitingFor;
        this.recieved = recieved;
        this.msg = msg;
    }
}