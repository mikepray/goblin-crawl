"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputKey = exports.CreatureStatus = void 0;
var CreatureStatus;
(function (CreatureStatus) {
    CreatureStatus[CreatureStatus["AWAKE"] = 0] = "AWAKE";
    CreatureStatus[CreatureStatus["ASLEEP"] = 1] = "ASLEEP";
    CreatureStatus[CreatureStatus["DEAD"] = 2] = "DEAD";
})(CreatureStatus || (exports.CreatureStatus = CreatureStatus = {}));
var InputKey;
(function (InputKey) {
    InputKey["UP"] = "\u001B[A";
    InputKey["DOWN"] = "\u001B[B";
    InputKey["RIGHT"] = "\u001B[C";
    InputKey["LEFT"] = "\u001B[D";
})(InputKey || (exports.InputKey = InputKey = {}));
