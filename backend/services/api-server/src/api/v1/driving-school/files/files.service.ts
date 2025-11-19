import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createReadStream, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { DrivingSchoolEntity } from '@surucukursu/shared';

@Injectable()
export class FilesService {
    private readonly storageBasePath: string;
    private readonly logger = new Logger(FilesService.name);
    // Use API Gateway URL so file requests go through the gateway proxy (which handles binary streaming correctly)
    // Gateway will forward /files/* requests to the file-server internally
    private readonly fileServerUrl = process.env.API_GATEWAY_URL || 'http://localhost:9501';

    constructor(
        @InjectRepository(DrivingSchoolEntity)
        private readonly drivingSchoolRepository: Repository<DrivingSchoolEntity>,
    ) {
        // Storage path is backend/storage - resolve from project root
        // Go up from dist/src/api/v1/driving-school/files to backend root, then to storage
        const devPath = join(__dirname, '../../../../../../storage');
        const prodPath = join(__dirname, '../../../../../../../storage');
        
        // Try dev path first (when running from backend/services/api-server/dist)
        if (existsSync(devPath)) {
            this.storageBasePath = resolve(devPath);
        } else if (existsSync(prodPath)) {
            this.storageBasePath = resolve(prodPath);
        } else {
            // Fallback: use process.cwd() to find storage from project root
            const fallbackPath = join(process.cwd(), 'backend', 'storage');
            if (existsSync(fallbackPath)) {
                this.storageBasePath = resolve(fallbackPath);
            } else {
                // Last resort: go up from services/api-server
                this.storageBasePath = resolve(join(process.cwd(), '..', '..', 'storage'));
            }
        }
        
        this.logger.log(`Storage base path: ${this.storageBasePath}`);
    }

    /**
     * Verify if user has access to the driving school
     */
    async verifyDrivingSchoolAccess(user: any, drivingSchoolId: string): Promise<boolean> {
        if (!user) {
            return false;
        }

        // Admin users (userType === 0) have access to all schools
        if (user.userType === 0) {
            return true;
        }

        // For driving school owners/managers, check if they own or manage this school
        const drivingSchools = await this.drivingSchoolRepository.find({
            where: [
                { id: parseInt(drivingSchoolId), owner_id: user.id },
                { id: parseInt(drivingSchoolId), manager_id: user.id },
            ]
        });

        return drivingSchools.length > 0;
    }

    /**
     * Get the directory path for a driving school
     */
    private getDrivingSchoolPath(drivingSchoolId: string): string {
        return join(this.storageBasePath, `DS${drivingSchoolId}`);
    }

    /**
     * Check if driving school directory exists
     */
    private checkDrivingSchoolDirectory(drivingSchoolId: string): void {
        const dirPath = this.getDrivingSchoolPath(drivingSchoolId);
        
        this.logger.debug(`Checking directory: ${dirPath}`);
        this.logger.debug(`Directory exists: ${existsSync(dirPath)}`);
        
        if (!existsSync(dirPath)) {
            throw new HttpException(
                `No files found for driving school DS${drivingSchoolId}`,
                HttpStatus.NOT_FOUND
            );
        }
    }

    /**
     * Get list of files for a driving school
     */
    async getFilesList(drivingSchoolId: string): Promise<any[]> {
        this.checkDrivingSchoolDirectory(drivingSchoolId);
        
        const dirPath = this.getDrivingSchoolPath(drivingSchoolId);
        
        try {
            const files = readdirSync(dirPath);
            
            const fileList = files
                .filter(file => file.endsWith('.pdf')) // Only PDF files
                .map(filename => {
                    const filePath = join(dirPath, filename);
                    const stats = statSync(filePath);
                    
                    return {
                        filename,
                        size: stats.size,
                        sizeFormatted: this.formatFileSize(stats.size),
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime,
                        type: 'pdf',
                        // File server URLs
                        downloadUrl: `${this.fileServerUrl}/files/download/DS${drivingSchoolId}/${filename}`,
                        viewUrl: `${this.fileServerUrl}/files/pdf/DS${drivingSchoolId}/${filename}`,
                        directUrl: `${this.fileServerUrl}/static/DS${drivingSchoolId}/${filename}`,
                    };
                })
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by newest first
            
            return fileList;
        } catch (error) {
            throw new HttpException(
                `Failed to read files from DS${drivingSchoolId}: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Get file URL from file server
     */
    async getFileUrl(drivingSchoolId: string, filename: string): Promise<string> {
        this.checkDrivingSchoolDirectory(drivingSchoolId);
        
        const filePath = join(this.getDrivingSchoolPath(drivingSchoolId), filename);
        
        // Check if file exists
        if (!existsSync(filePath)) {
            throw new HttpException(
                `File not found: ${filename}`,
                HttpStatus.NOT_FOUND
            );
        }

        // Verify it's a PDF file
        if (!filename.endsWith('.pdf')) {
            throw new HttpException(
                'Only PDF files can be accessed',
                HttpStatus.BAD_REQUEST
            );
        }

        // Return file server download URL
        return `${this.fileServerUrl}/files/download/DS${drivingSchoolId}/${filename}`;
    }

    /**
     * Get a file stream for download
     */
    async downloadFile(drivingSchoolId: string, filename: string): Promise<any> {
        this.checkDrivingSchoolDirectory(drivingSchoolId);
        
        const filePath = join(this.getDrivingSchoolPath(drivingSchoolId), filename);
        
        // Check if file exists
        if (!existsSync(filePath)) {
            throw new HttpException(
                `File not found: ${filename}`,
                HttpStatus.NOT_FOUND
            );
        }

        // Verify it's a PDF file
        if (!filename.endsWith('.pdf')) {
            throw new HttpException(
                'Only PDF files can be downloaded',
                HttpStatus.BAD_REQUEST
            );
        }

        try {
            return createReadStream(filePath);
        } catch (error) {
            throw new HttpException(
                `Failed to read file: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Get file metadata
     */
    async getFileInfo(drivingSchoolId: string, filename: string): Promise<any> {
        this.checkDrivingSchoolDirectory(drivingSchoolId);
        
        const filePath = join(this.getDrivingSchoolPath(drivingSchoolId), filename);
        
        // Check if file exists
        if (!existsSync(filePath)) {
            throw new HttpException(
                `File not found: ${filename}`,
                HttpStatus.NOT_FOUND
            );
        }

        try {
            const stats = statSync(filePath);
            
            return {
                filename,
                path: `DS${drivingSchoolId}`,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                type: 'pdf',
                isDirectory: stats.isDirectory()
            };
        } catch (error) {
            throw new HttpException(
                `Failed to get file info: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Format file size to human-readable format
     */
    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}
