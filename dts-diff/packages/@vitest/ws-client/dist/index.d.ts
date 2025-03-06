import { BirpcReturn } from 'birpc';
import { UserConsoleLog, WebSocketEvents, WebSocketHandlers } from 'vitest';
import { File, Task, TaskResultPack, Suite, TaskEventPack } from '@vitest/runner';
export * from '@vitest/runner/utils';

declare class StateManager {
    filesMap: Map<string, File[]>;
    pathsSet: Set<string>;
    idMap: Map<string, Task>;
    getPaths(): string[];
    /**
     * Return files that were running or collected.
     */
    getFiles(keys?: string[]): File[];
    getFilepaths(): string[];
    getFailedFilepaths(): string[];
    collectPaths(paths?: string[]): void;
    collectFiles(files?: File[]): void;
    clearFiles(_project: {
        config: {
            name: string | undefined;
            root: string;
        };
    }, paths?: string[]): void;
    updateId(task: Task): void;
    updateTasks(packs: TaskResultPack[]): void;
    updateUserLog(log: UserConsoleLog): void;
}

type Arrayable<T> = T | Array<T>;

declare function hasBenchmark(suite: Arrayable<Suite>): boolean;
declare function hasFailedSnapshot(suite: Arrayable<Task>): boolean;
declare function convertTasksToEvents(file: File, onTask?: (task: Task) => void): {
    packs: TaskResultPack[];
    events: TaskEventPack[];
};

interface VitestClientOptions {
    handlers?: Partial<WebSocketEvents>;
    autoReconnect?: boolean;
    reconnectInterval?: number;
    reconnectTries?: number;
    connectTimeout?: number;
    reactive?: <T>(v: T, forKey: 'state' | 'idMap' | 'filesMap') => T;
    ref?: <T>(v: T) => {
        value: T;
    };
    WebSocketConstructor?: typeof WebSocket;
}
interface VitestClient {
    ws: WebSocket;
    state: StateManager;
    rpc: BirpcReturn<WebSocketHandlers, WebSocketEvents>;
    waitForConnection: () => Promise<void>;
    reconnect: () => Promise<void>;
}
declare function createClient(url: string, options?: VitestClientOptions): VitestClient;

export { type VitestClient, type VitestClientOptions, convertTasksToEvents, createClient, hasBenchmark, hasFailedSnapshot };
