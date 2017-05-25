import sinon from 'sinon';

interface StubLoggerConsoleFunc extends sinon.SinonStub {
    (message: string): void;
}

export interface StubLoggerConsole {
    log: StubLoggerConsoleFunc;
    info: StubLoggerConsoleFunc;
    warn: StubLoggerConsoleFunc;
    error: StubLoggerConsoleFunc;
}

export function createStubConsole(): StubLoggerConsole {
    return {
        error: sinon.stub(),
        info: sinon.stub(),
        log: sinon.stub(),
        warn: sinon.stub(),
    };
}
