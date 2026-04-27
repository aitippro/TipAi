declare module "better-sqlite3" {
  namespace Database {
    interface Database {
      pragma(query: string): unknown;
      close(): void;
      prepare(sql: string): {
        run(...params: unknown[]): { lastInsertRowid: number; changes: number };
        get(...params: unknown[]): unknown;
        all(...params: unknown[]): unknown[];
      };
    }
  }

  class Database implements Database.Database {
    constructor(path: string);
    pragma(query: string): unknown;
    close(): void;
    prepare(sql: string): {
      run(...params: unknown[]): { lastInsertRowid: number; changes: number };
      get(...params: unknown[]): unknown;
      all(...params: unknown[]): unknown[];
    };
  }

  export = Database;
}
