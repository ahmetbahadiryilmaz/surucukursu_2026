import { Injectable, Logger } from '@nestjs/common';
import { FilesService, FileInfo } from '../files/files.service';
import * as fs from 'fs';
import * as path from 'path';

export interface FileListItem {
  filename: string;
  size: number;
  sizeFormatted: string;
  createdAt: Date;
  modifiedAt: Date;
  type: string;
  downloadUrl: string;
  viewUrl: string;
}

@Injectable()
export class DrivingSchoolFilesService {
  private readonly logger = new Logger(DrivingSchoolFilesService.name);

  constructor(private readonly filesService: FilesService) {}

  async getFile(filePath: string): Promise<FileInfo> {
    return this.filesService.getFile(filePath);
  }

  async getFilesList(drivingSchoolCode: string): Promise<FileListItem[]> {
    const drivingSchoolId = drivingSchoolCode;
    const folderPath = `DS${drivingSchoolId}`;
    const storagePath = this.filesService.getStoragePath();
    const fullPath = path.join(storagePath, folderPath);

    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      this.logger.warn(`Driving school directory not found: ${folderPath}`);
      return [];
    }

    try {
      const files = await fs.promises.readdir(fullPath);
      
      const fileList = await Promise.all(
        files
          .filter(file => {
            const filePath = path.join(fullPath, file);
            return fs.statSync(filePath).isFile() && file.endsWith('.pdf');
          })
          .map(async (filename) => {
            const filePath = path.join(fullPath, filename);
            const stats = await fs.promises.stat(filePath);
            
            // Base URL should point to the gateway
            const baseUrl = process.env.API_GATEWAY_URL || 'http://localhost:9501';
            
            return {
              filename,
              size: stats.size,
              sizeFormatted: this.formatFileSize(stats.size),
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
              type: 'pdf',
              downloadUrl: `${baseUrl}/files/driving-school/${drivingSchoolId}/download/${filename}`,
              viewUrl: `${baseUrl}/files/driving-school/${drivingSchoolId}/view/${filename}`,
            };
          })
      );

      return fileList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      this.logger.error(`Error reading files from ${folderPath}:`, error.message);
      throw error;
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
