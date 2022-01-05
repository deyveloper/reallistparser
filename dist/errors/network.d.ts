export declare class UnknownStatusCode {
    waitingFor: number[];
    recieved: number;
    msg?: string;
    constructor({ waitingFor, recieved, msg }: {
        waitingFor: number[];
        recieved: number;
        msg?: string;
    });
}
