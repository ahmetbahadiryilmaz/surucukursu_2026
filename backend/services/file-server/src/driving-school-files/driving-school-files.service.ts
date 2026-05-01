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

export interface StorageInfo {
  totalUsed: number;
  totalUsedFormatted: string;
  totalLimit: number;
  totalLimitFormatted: string;
  usagePercentage: number;
  fileCount: number;
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

  async deleteFile(drivingSchoolCode: string, filename: string): Promise<boolean> {
    const folderPath = `DS${drivingSchoolCode}`;
    const storagePath = this.filesService.getStoragePath();
    const fullPath = path.join(storagePath, folderPath, filename);

    if (!fs.existsSync(fullPath)) {
      this.logger.warn(`File not found: ${folderPath}/${filename}`);
      return false;
    }

    try {
      await fs.promises.unlink(fullPath);
      this.logger.log(`Deleted file: ${folderPath}/${filename}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting file ${folderPath}/${filename}:`, error.message);
      throw error;
    }
  }

  async deleteAllFiles(drivingSchoolCode: string): Promise<{ deletedCount: number; errors: string[] }> {
    const folderPath = `DS${drivingSchoolCode}`;
    const storagePath = this.filesService.getStoragePath();
    const fullPath = path.join(storagePath, folderPath);

    if (!fs.existsSync(fullPath)) {
      this.logger.warn(`Driving school directory not found: ${folderPath}`);
      return { deletedCount: 0, errors: [] };
    }

    const errors: string[] = [];
    let deletedCount = 0;

    try {
      const files = await fs.promises.readdir(fullPath);
      
      for (const file of files) {
        const filePath = path.join(fullPath, file);
        const stats = await fs.promises.stat(filePath);
        
        if (stats.isFile() && file.endsWith('.pdf')) {
          try {
            await fs.promises.unlink(filePath);
            deletedCount++;
            this.logger.log(`Deleted file: ${folderPath}/${file}`);
          } catch (error) {
            errors.push(`Failed to delete ${file}: ${error.message}`);
            this.logger.error(`Error deleting file ${file}:`, error.message);
          }
        }
      }

      return { deletedCount, errors };
    } catch (error) {
      this.logger.error(`Error deleting files from ${folderPath}:`, error.message);
      throw error;
    }
  }

  async getStorageInfo(drivingSchoolCode: string): Promise<StorageInfo> {
    const folderPath = `DS${drivingSchoolCode}`;
    const storagePath = this.filesService.getStoragePath();
    const fullPath = path.join(storagePath, folderPath);

    // 5 GB limit (in bytes)
    const totalLimit = 5 * 1024 * 1024 * 1024;
    let totalUsed = 0;
    let fileCount = 0;

    if (fs.existsSync(fullPath)) {
      try {
        const files = await fs.promises.readdir(fullPath);
        
        for (const file of files) {
          const filePath = path.join(fullPath, file);
          const stats = await fs.promises.stat(filePath);
          
          if (stats.isFile()) {
            totalUsed += stats.size;
            fileCount++;
          }
        }
      } catch (error) {
        this.logger.error(`Error calculating storage for ${folderPath}:`, error.message);
      }
    }

    const usagePercentage = (totalUsed / totalLimit) * 100;

    return {
      totalUsed,
      totalUsedFormatted: this.formatFileSize(totalUsed),
      totalLimit,
      totalLimitFormatted: this.formatFileSize(totalLimit),
      usagePercentage: Math.round(usagePercentage * 100) / 100,
      fileCount,
    };
  }
}
