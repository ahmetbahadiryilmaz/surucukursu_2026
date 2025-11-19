import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

export interface FileInfo {
  exists: boolean;
  size: number;
  mimeType: string;
  basePath: string;
  fullPath: string;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly storagePath: string;

  constructor() {
    // Storage path relative to the file-server service
    this.storagePath = path.resolve(__dirname, '../../../../storage');
    this.logger.log(`Storage path initialized: ${this.storagePath}`);
    
    // Ensure storage directory exists
    this.ensureStorageExists();
  }

  private ensureStorageExists(): void {
    try {
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
        this.logger.log(`Created storage directory: ${this.storagePath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create storage directory: ${error.message}`);
    }
  }

  async getFile(filename: string): Promise<FileInfo> {
    const safePath = this.getSafeFilePath(filename);
    const fullPath = path.join(this.storagePath, safePath);
    
    try {
      const stats = await fs.promises.stat(fullPath);
      const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
      
      return {
        exists: true,
        size: stats.size,
        mimeType,
        basePath: this.storagePath,
        fullPath,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          exists: false,
          size: 0,
          mimeType: 'application/octet-stream',
          basePath: this.storagePath,
          fullPath,
        };
      }
      
      this.logger.error(`Error getting file info for ${filename}:`, error.message);
      throw error;
    }
  }

  async listFiles(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.storagePath);
      return files.filter(file => {
        const filePath = path.join(this.storagePath, file);
        return fs.statSync(filePath).isFile();
      });
    } catch (error) {
      this.logger.error(`Error listing files:`, error.message);
      return [];
    }
  }

  async deleteFile(filename: string): Promise<boolean> {
    const safePath = this.getSafeFilePath(filename);
    const fullPath = path.join(this.storagePath, safePath);
    
    try {
      await fs.promises.unlink(fullPath);
      this.logger.log(`Deleted file: ${filename}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn(`File not found for deletion: ${filename}`);
        return false;
      }
      
      this.logger.error(`Error deleting file ${filename}:`, error.message);
      throw error;
    }
  }

  getStoragePath(): string {
    return this.storagePath;
  }

  private getSafeFilePath(filename: string): string {
    // Normalize the path and remove leading slashes
    const normalized = path.normalize(filename).replace(/^[\/\\]+/, '');
    
    // Check for path traversal attempts
    if (normalized.includes('..')) {
      throw new Error('Invalid file path: path traversal not allowed');
    }
    
    // Ensure the resolved path is within storage directory
    const fullPath = path.resolve(this.storagePath, normalized);
    if (!fullPath.startsWith(this.storagePath)) {
      throw new Error('Invalid file path: outside storage directory');
    }
    
    return normalized;
  }
}