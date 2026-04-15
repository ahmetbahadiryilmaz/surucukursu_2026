import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve the mebbis-service root directory reliably,
 * whether running from source (ts-node / nest start --watch) or compiled dist/.
 */
function resolveServiceRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'package.json');
    if (
      fs.existsSync(candidate) &&
      fs.readFileSync(candidate, 'utf8').includes('@surucukursu/mebbis-service')
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export class FileLogger {
  private logsDir: string;

  constructor() {
    this.logsDir = path.join(resolveServiceRoot(), 'logs');
    this.ensureLogsDirectory();
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getDateFolder(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateFolder = `${year}-${month}-${day}`;
    const dateDir = path.join(this.logsDir, dateFolder);

    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true });
    }

    return dateDir;
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  log(filename: string, message: string, data?: any): void {
    try {
      const dateFolder = this.getDateFolder();
      const filePath = path.join(dateFolder, `${filename}.log`);
      const timestamp = this.getTimestamp();

      let logEntry = `[${timestamp}] ${message}`;
      if (data) {
        logEntry += `\n${JSON.stringify(data, null, 2)}`;
      }
      logEntry += '\n\n';

      fs.appendFileSync(filePath, logEntry, 'utf8');
    } catch (error) {
      console.error('Error writing to log file:', error);
    }
  }
}

export const fileLogger = new FileLogger();
