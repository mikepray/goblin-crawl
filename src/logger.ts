import { createWriteStream } from 'node:fs';
import { Console } from 'node:console';
// Alternatively

const output = createWriteStream('./stdout.log');
const errorOutput = createWriteStream('./stderr.log');
// Custom simple logger
export const logger = new Console({ stdout: output, stderr: errorOutput });
