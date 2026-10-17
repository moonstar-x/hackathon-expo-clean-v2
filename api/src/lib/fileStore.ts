import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const missing = (err: unknown) => err instanceof Error && 'code' in err && err.code === 'ENOENT';

/**
 * Files kept on disk under one folder (FILES_PATH), by names the API makes itself, never by names
 * from a request. A write lands whole or not at all: it goes to a temporary file that is then
 * renamed into place, so a reader never sees half a file.
 */
export function fileStore(root: string) {
  const full = (name: string) => path.join(root, name);
  return {
    /** The file's bytes, or null when it doesn't exist. */
    read(name: string): Buffer | null {
      try {
        return fs.readFileSync(full(name));
      } catch (err) {
        if (missing(err)) return null;
        throw err;
      }
    },
    exists: (name: string) => fs.existsSync(full(name)),
    write(name: string, data: Buffer) {
      const target = full(name);
      const temporary = `${target}.${randomUUID()}.tmp`;
      fs.mkdirSync(path.dirname(target), { recursive: true });
      try {
        fs.writeFileSync(temporary, data);
        fs.renameSync(temporary, target);
      } finally {
        fs.rmSync(temporary, { force: true });
      }
    },
    /** Deletes the file; one that is already gone is fine. */
    remove: (name: string) => fs.rmSync(full(name), { force: true }),
  };
}

export type FileStore = ReturnType<typeof fileStore>;
