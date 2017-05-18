/**
 * @module
 * Shell scripting utility.
 * (Node only)
 */
import childProcess from 'child_process';
import stream from 'stream';

export interface ShellOptions {
    stdin?: 'ignore' | 'inherit' | stream.Readable;
    stdout?: 'ignore' | 'inherit' | stream.Writable;
    stderr?: 'ignore' | 'inherit' | stream.Writable;
    cwd?: string;
    env?: { [key: string]: string };
    encoding?: string;
    console?: Console;
}

export class Shell {
    private options: ShellOptions;

    constructor(options?: ShellOptions) {
        this.options = Object.assign({}, options);
    }

    call(command: string, args: string[], options?: ShellOptions): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const opts = Object.assign({}, this.options, options);
            const spawnOpts: childProcess.SpawnOptions = {
                cwd: opts.cwd,
                env: opts.env,
                stdio: [
                    toPipe(opts.stdin) || 'inherit',
                    toPipe(opts.stdout) || 'inherit',
                    toPipe(opts.stderr) || 'inherit',
                ],
            };
            if (opts.console) {
                opts.console.log(`Running ${command} ${JSON.stringify(args)}`);
            }
            const cp = childProcess.spawn(command, args, spawnOpts);
            cp.on('error', e => {
                reject(e);
            });
            cp.on('exit', (code, signal) => {
                resolve(code);
            });
            if (opts.stdin instanceof stream.Readable) {
                opts.stdin.pipe(cp.stdin);
            }
            if (opts.stdout instanceof stream.Writable) {
                cp.stdout.pipe(opts.stdout, { end: false });
            }
            if (opts.stderr instanceof stream.Writable) {
                cp.stderr.pipe(opts.stderr, { end: false });
            }
        });
    }

    checkCall(command: string, args: string[], options?: ShellOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const opts = Object.assign({}, this.options, options);
            const spawnOpts: childProcess.SpawnOptions = {
                cwd: opts.cwd,
                env: opts.env,
                stdio: [
                    toPipe(opts.stdin) || 'inherit',
                    toPipe(opts.stdout) || 'inherit',
                    toPipe(opts.stderr) || 'inherit',
                ],
            };
            if (opts.console) {
                opts.console.log(`Running ${command} ${JSON.stringify(args)}`);
            }
            const cp = childProcess.spawn(command, args, spawnOpts);
            cp.on('error', e => {
                reject(e);
            });
            cp.on('exit', (code, signal) => {
                if (code === 0) {
                    return resolve();
                }
                reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
            });
            if (opts.stdin instanceof stream.Readable) {
                opts.stdin.pipe(cp.stdin);
            }
            if (opts.stdout instanceof stream.Writable) {
                cp.stdout.pipe(opts.stdout, { end: false });
            }
            if (opts.stderr instanceof stream.Writable) {
                cp.stderr.pipe(opts.stderr, { end: false });
            }
        });
    }

    checkOutput(command: string, args: string[], options?: ShellOptions): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const opts = Object.assign({}, this.options, options);
            const spawnOpts: childProcess.SpawnOptions = {
                cwd: opts.cwd,
                env: opts.env,
                stdio: [ toPipe(opts.stdin) || 'inherit', 'pipe', toPipe(opts.stderr) || 'inherit' ],
            };
            if (opts.console) {
                opts.console.log(`Running ${command} ${JSON.stringify(args)}`);
            }
            const encoding = opts.encoding || 'utf-8';
            const cp = childProcess.spawn(command, args, spawnOpts);
            const outBuf: string[] = [];
            cp.on('error', e => {
                reject(e);
            });
            cp.stdout.on('data', data => {
                outBuf.push(typeof data === 'string' ? data : data.toString(encoding));
            });
            cp.on('exit', (code, signal) => {
                const output = outBuf.join('');
                if (code === 0) {
                    return resolve(output);
                }
                const err: any = new Error(`Command failed: ${command} ${args.join(' ')}`);
                err.stdout = output;
                reject(err);
            });
            if (opts.stdin instanceof stream.Readable) {
                opts.stdin.pipe(cp.stdin);
            }
            if (opts.stderr instanceof stream.Writable) {
                cp.stderr.pipe(opts.stderr, { end: false });
            }
        });
    }
}

function toPipe(x?: string | stream.Stream): string | undefined {
    if (!x || typeof x === 'string') {
        return;
    } else {
        return 'pipe';
    }
}

export default Shell;
