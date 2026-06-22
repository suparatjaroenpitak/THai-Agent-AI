type OpenCodexFileSystemHandle = OpenCodexFileHandle | OpenCodexDirectoryHandle;

interface OpenCodexFileHandle {
  readonly kind: "file";
  readonly name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<OpenCodexWritableFileStream>;
}

interface OpenCodexDirectoryHandle {
  readonly kind: "directory";
  readonly name: string;
  entries(): AsyncIterableIterator<[string, OpenCodexFileSystemHandle]>;
  values(): AsyncIterableIterator<OpenCodexFileSystemHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<OpenCodexFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<OpenCodexDirectoryHandle>;
}

interface OpenCodexWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface Window {
  showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite" }) => Promise<OpenCodexDirectoryHandle>;
}
