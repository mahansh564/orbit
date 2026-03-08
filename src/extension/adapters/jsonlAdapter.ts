import { createReadStream, existsSync, readdirSync, statSync, watch } from 'node:fs';
import type { FSWatcher } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { createInterface } from 'node:readline';
import type { AgentConfig } from '@shared/types';
import { parseAgentEventLine } from '../parser';
import type {
  AgentSourceAdapter,
  AgentSourceAdapterInstance,
  AgentSourceAdapterOptions
} from './types';

/**
 * Built-in adapter id for newline-delimited JSON transcript files.
 */
export const JSONL_SOURCE_ADAPTER_ID = 'jsonl';

/**
 * Adapter that watches file or directory transcript paths containing JSONL events.
 */
export class JsonlSourceAdapter implements AgentSourceAdapter {
  readonly id = JSONL_SOURCE_ADAPTER_ID;

  /**
   * Creates a JSONL source instance.
   *
   * @param options Adapter runtime options.
   * @returns Running JSONL watcher instance.
   */
  createInstance(options: AgentSourceAdapterOptions): AgentSourceAdapterInstance {
    return new JsonlSourceInstance(options);
  }
}

class JsonlSourceInstance implements AgentSourceAdapterInstance {
  private agent: AgentConfig;
  private readonly onEvent: AgentSourceAdapterOptions['onEvent'];
  private readonly onError: AgentSourceAdapterOptions['onError'];
  private readonly offsets = new Map<string, number>();
  private readonly readingFiles = new Set<string>();
  private readonly pendingFiles = new Set<string>();
  private directoryPollTimer: NodeJS.Timeout | null = null;
  private rootDirectoryPath: string | null = null;
  private watchers: FSWatcher[] = [];

  /**
   * Creates JSONL source runtime and attaches filesystem watchers.
   *
   * @param options Adapter runtime options.
   */
  constructor(options: AgentSourceAdapterOptions) {
    this.agent = options.agent;
    this.onEvent = options.onEvent;
    this.onError = options.onError;
    this.initialize();
  }

  /**
   * Applies latest agent config to this JSONL instance.
   *
   * @param agent Latest agent configuration.
   */
  updateAgent(agent: AgentConfig): void {
    const transcriptPathChanged = this.agent.transcriptPath !== agent.transcriptPath;
    this.agent = agent;

    if (!transcriptPathChanged) {
      return;
    }

    this.teardownWatchers();
    this.offsets.clear();
    this.readingFiles.clear();
    this.pendingFiles.clear();
    this.initialize();
  }

  /**
   * Stops all active watchers and stream activity.
   */
  dispose(): void {
    this.teardownWatchers();
    this.offsets.clear();
    this.readingFiles.clear();
    this.pendingFiles.clear();
  }

  private initialize(): void {
    const transcriptPath = normalizeFsPath(this.agent.transcriptPath);

    try {
      const stats = statSync(transcriptPath);
      if (stats.isDirectory()) {
        this.attachDirectoryWatcher(transcriptPath);
        return;
      }

      this.attachFileWatcher(transcriptPath);
    } catch (error) {
      if (looksLikeDirectoryPath(transcriptPath)) {
        this.attachMissingDirectoryWatcher(transcriptPath);
        return;
      }

      this.reportError(error);
    }
  }

  private attachFileWatcher(filePath: string): void {
    const normalizedPath = normalizeFsPath(filePath);
    this.initializeOffset(normalizedPath, false);

    const watcher = watch(normalizedPath, () => {
      this.scheduleRead(normalizedPath);
    });

    this.registerWatcher(watcher);
  }

  private attachDirectoryWatcher(directoryPath: string): void {
    const normalizedDirectory = normalizeFsPath(directoryPath);
    if (!existsSync(normalizedDirectory)) {
      this.attachMissingDirectoryWatcher(normalizedDirectory);
      return;
    }

    this.rootDirectoryPath = normalizedDirectory;
    this.scanDirectory(normalizedDirectory, false, false);

    const watcher = watch(normalizedDirectory, (_eventType, filename) => {
      if (filename === null) {
        return;
      }

      const candidatePath = normalizeFsPath(join(normalizedDirectory, filename.toString()));
      if (!isWithinDirectory(candidatePath, normalizedDirectory)) {
        return;
      }

      this.handleDirectoryChange(candidatePath);
    });

    this.registerWatcher(watcher);
    this.startDirectoryPolling(normalizedDirectory);
  }

  private attachMissingDirectoryWatcher(missingDirectoryPath: string): void {
    const normalizedMissingDirectory = normalizeFsPath(missingDirectoryPath);
    if (isExistingDirectory(normalizedMissingDirectory)) {
      this.attachDirectoryWatcher(normalizedMissingDirectory);
      return;
    }

    const parentDirectory = normalizeFsPath(dirname(normalizedMissingDirectory));
    if (!isExistingDirectory(parentDirectory)) {
      return;
    }

    const watcher = watch(parentDirectory, (_eventType, filename) => {
      if (filename === null) {
        return;
      }

      const candidatePath = normalizeFsPath(join(parentDirectory, filename.toString()));
      if (candidatePath !== normalizedMissingDirectory) {
        return;
      }

      if (!isExistingDirectory(normalizedMissingDirectory)) {
        return;
      }

      this.teardownWatchers();
      this.attachDirectoryWatcher(normalizedMissingDirectory);
    });

    this.registerWatcher(watcher);
  }

  private handleDirectoryChange(candidatePath: string): void {
    try {
      const normalizedCandidate = normalizeFsPath(candidatePath);
      const candidateStats = statSync(normalizedCandidate);
      if (candidateStats.isDirectory()) {
        this.scanDirectory(normalizedCandidate, true, false);
        return;
      }

      if (!candidateStats.isFile() || !isJsonlTranscriptFile(normalizedCandidate)) {
        return;
      }

      this.initializeOffset(normalizedCandidate, true);
      this.scheduleRead(normalizedCandidate);
    } catch {
      // Ignore delete/rename races from fs.watch events.
    }
  }

  private scanDirectory(
    directoryPath: string,
    readNewFilesFromStart: boolean,
    scheduleKnownReads: boolean
  ): void {
    try {
      const normalizedDirectory = normalizeFsPath(directoryPath);
      const directoryStats = statSync(normalizedDirectory);
      if (!directoryStats.isDirectory()) {
        return;
      }

      for (const entry of readdirSync(normalizedDirectory, { withFileTypes: true })) {
        const entryPath = normalizeFsPath(join(normalizedDirectory, entry.name));
        if (entry.isDirectory()) {
          this.scanDirectory(entryPath, readNewFilesFromStart, scheduleKnownReads);
          continue;
        }

        if (!entry.isFile() || !isJsonlTranscriptFile(entryPath)) {
          continue;
        }

        const knownFile = this.offsets.has(entryPath);
        if (!knownFile) {
          this.initializeOffset(entryPath, readNewFilesFromStart);
          if (readNewFilesFromStart) {
            this.scheduleRead(entryPath);
          }
          continue;
        }

        if (scheduleKnownReads) {
          this.scheduleRead(entryPath);
        }
      }
    } catch (error) {
      this.reportError(error);
    }
  }

  private startDirectoryPolling(directoryPath: string): void {
    if (this.directoryPollTimer !== null) {
      clearInterval(this.directoryPollTimer);
    }

    this.directoryPollTimer = setInterval(() => {
      this.scanDirectory(directoryPath, true, true);
    }, 1200);
  }

  private initializeOffset(filePath: string, readFromStart: boolean): void {
    const normalizedPath = normalizeFsPath(filePath);
    if (this.offsets.has(normalizedPath)) {
      return;
    }

    try {
      const fileStats = statSync(normalizedPath);
      this.offsets.set(normalizedPath, readFromStart ? 0 : fileStats.size);
    } catch {
      this.offsets.set(normalizedPath, 0);
    }
  }

  private scheduleRead(filePath: string): void {
    const normalizedPath = normalizeFsPath(filePath);

    if (this.readingFiles.has(normalizedPath)) {
      this.pendingFiles.add(normalizedPath);
      return;
    }

    void this.readAppendedLines(normalizedPath);
  }

  private async readAppendedLines(filePath: string): Promise<void> {
    this.readingFiles.add(filePath);

    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
        return;
      }

      const existingOffset = this.offsets.get(filePath) ?? 0;
      const startOffset = fileStats.size < existingOffset ? 0 : existingOffset;

      if (fileStats.size === startOffset) {
        return;
      }

      const stream = createReadStream(filePath, {
        start: startOffset,
        end: fileStats.size - 1,
        encoding: 'utf8'
      });

      const reader = createInterface({
        input: stream,
        crlfDelay: Infinity
      });

      for await (const line of reader) {
        const parsed = parseAgentEventLine(line, { id: this.agent.id, name: this.agent.name });
        if (parsed !== null) {
          this.onEvent(parsed);
        }
      }

      this.offsets.set(filePath, fileStats.size);
    } catch (error) {
      this.reportError(error);
    } finally {
      this.readingFiles.delete(filePath);
      if (this.pendingFiles.has(filePath)) {
        this.pendingFiles.delete(filePath);
        this.scheduleRead(filePath);
      }
    }
  }

  private teardownWatchers(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }

    if (this.directoryPollTimer !== null) {
      clearInterval(this.directoryPollTimer);
      this.directoryPollTimer = null;
    }

    this.watchers = [];
    this.rootDirectoryPath = null;
  }

  private registerWatcher(watcher: FSWatcher): void {
    watcher.on('error', (error) => {
      this.reportError(error);
    });
    this.watchers.push(watcher);
  }

  private reportError(error: unknown): void {
    if (this.onError === undefined) {
      return;
    }

    if (error instanceof Error) {
      this.onError(error);
      return;
    }

    this.onError(new Error(String(error)));
  }
}

function isJsonlTranscriptFile(filePath: string): boolean {
  return filePath.endsWith('.jsonl');
}

function normalizeFsPath(pathValue: string): string {
  return resolvePath(pathValue);
}

function isWithinDirectory(candidatePath: string, directoryPath: string): boolean {
  const normalizedDirectory =
    process.platform === 'win32' ? directoryPath.toLowerCase() : directoryPath;
  const normalizedCandidate =
    process.platform === 'win32' ? candidatePath.toLowerCase() : candidatePath;

  return (
    normalizedCandidate === normalizedDirectory ||
    normalizedCandidate.startsWith(`${normalizedDirectory}/`) ||
    normalizedCandidate.startsWith(`${normalizedDirectory}\\`)
  );
}

function looksLikeDirectoryPath(pathValue: string): boolean {
  return !pathValue.endsWith('.jsonl');
}

function isExistingDirectory(pathValue: string): boolean {
  if (!existsSync(pathValue)) {
    return false;
  }

  try {
    return statSync(pathValue).isDirectory();
  } catch {
    return false;
  }
}
