declare module "better-sqlite3" {
  interface RunResult {
    lastInsertRowid: number;
    changes: number;
  }

  interface Statement {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    iterate(...params: unknown[]): IterableIterator<unknown>;
    pluck(toggle?: boolean): Statement;
    expand(toggle?: boolean): Statement;
    raw(toggle?: boolean): Statement;
    columns(): Array<{ name: string; column: string | null; table: string | null; database: string | null; type: string | null }>;
    bind(...params: unknown[]): Statement;
  }

  interface _Transaction {
    <T>(fn: (...args: unknown[]) => T): (...args: unknown[]) => T;
  }

  interface BackupOptions {
    progress?: (info: { totalPages: number; remainingPages: number }) => number;
  }

  class Database {
    constructor(path: string, options?: {
      readonly?: boolean;
      fileMustExist?: boolean;
      timeout?: number;
      verbose?: (message?: unknown, ...args: unknown[]) => void;
      nativeBinding?: string;
    });

    prepare(sql: string): Statement;
    exec(sql: string): this;
    transaction<T extends unknown[]>(fn: (...args: T) => unknown): (...args: T) => unknown;
    pragma(query: string, options?: { simple?: boolean }): unknown;
    backup(destPath: string | Database, options?: BackupOptions): Promise<void>;
    function(name: string, fn: (...args: unknown[]) => unknown): this;
    aggregate(name: string, options: {
      start?: unknown;
      step: (...args: unknown[]) => unknown;
      result?: (...args: unknown[]) => unknown;
      inverse?: (...args: unknown[]) => unknown;
    }): this;
    table(name: string, sql: string): this;
    loadExtension(path: string): this;
    close(): void;
    readonly open: boolean;
    readonly inTransaction: boolean;
    readonly name: string;
    readonly memory: boolean;
  }

  export = Database;
}
