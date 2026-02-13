declare module "archiver" {
  import { Readable } from "stream";
  function archiver(format: string, options?: Record<string, unknown>): {
    append(source: string | Buffer | Readable, data: { name: string; store?: boolean }): void;
    pipe(destination: NodeJS.WritableStream): void;
    finalize(): void;
    on(event: string, listener: (...args: unknown[]) => void): void;
  };
  export = archiver;
}
