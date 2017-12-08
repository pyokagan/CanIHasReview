/**
 * @module
 * (Node-only) stream utilities.
 */
import stream from 'stream';

export class DummyWritable extends stream.Writable implements NodeJS.WritableStream {
    constructor() {
        super({
            decodeStrings: false,
        });
    }

    _write(chunk: Buffer, encoding: string, callback: (e?: any) => void): void {
        callback();
    }
}

export function write(stream: NodeJS.WritableStream, chunk: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
        stream.on('close', reject);
        stream.on('error', reject);
        stream.write(chunk, () => {
            stream.removeListener('close', reject);
            stream.removeListener('error', reject);
            resolve();
        });
    });
}
