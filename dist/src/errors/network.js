"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnknownStatusCode = void 0;
class UnknownStatusCode {
    constructor({ waitingFor, recieved, msg }) {
        this.waitingFor = [];
        this.recieved = -1;
        this.waitingFor = waitingFor;
        this.recieved = recieved;
        this.msg = msg;
    }
}
exports.UnknownStatusCode = UnknownStatusCode;
//# sourceMappingURL=network.js.map