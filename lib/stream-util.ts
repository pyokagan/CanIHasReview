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

export class LineTransform extends stream.Transform {
    private mapFn: (line: Buffer) => Buffer;
    private leftover: Buffer[];
    private sep: number;

    constructor(mapFn: (line: Buffer) => Buffer, sep?: string | number) {
        super({});
        this.mapFn = mapFn;
        this.leftover = [];
        if (typeof sep === 'string') {
            this.sep = sep.charCodeAt(0);
        } else if (typeof sep === 'number') {
            this.sep = sep;
        } else {
            this.sep = '\n'.charCodeAt(0);
        }
    }

    _transform(chunk: Buffer, encoding: string, cb: (err?: any) => void): void {
        try {
            // Slice up the chunk
            let idx = 0, lastIdx = 0;
            while (true) {
                idx = chunk.indexOf(this.sep, lastIdx);
                if (idx < 0) {
                    break;
                }

                idx += 1;

                let line: Buffer;
                if (this.leftover.length) {
                    this.leftover.push(chunk.slice(lastIdx, idx));
                    line = Buffer.concat(this.leftover);
                    this.leftover.length = 0;
                } else {
                    line = chunk.slice(lastIdx, idx);
                }

                this.push(this.mapFn(line));
                lastIdx = idx;
            }

            if (lastIdx < chunk.length) {
                this.leftover.push(chunk.slice(lastIdx));
            }
        } catch (e) {
            cb(e);
            return;
        }

        cb();
    }

    _flush(cb: (err?: any) => void): void {
        try {
            if (this.leftover.length) {
                const lastBuf = this.leftover[this.leftover.length - 1];
                if (lastBuf[lastBuf.length - 1] !== this.sep) {
                    this.leftover.push(Buffer.from([this.sep]));
                }
                const line = Buffer.concat(this.leftover);
                this.push(this.mapFn(line));
            }
        } catch (e) {
            cb(e);
            return;
        }
        cb();
    }
}
