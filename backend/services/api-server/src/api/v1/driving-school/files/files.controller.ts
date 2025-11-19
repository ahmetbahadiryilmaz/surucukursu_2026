import { Controller, Get, Param, HttpException, HttpStatus, UseGuards, Req, StreamableFile, Header } from '@nestjs/common';
import { FilesService } from './files.service';
import { DrivingSchoolGuard } from '../../../../common/guards/driving-school.guard';

@Controller('driving-school/:code/files')
@UseGuards(DrivingSchoolGuard)
export class FilesController {
    constructor(private readonly filesService: FilesService) {}

    /**
     * Get list of files for a specific driving school
     * Only accessible by the driving school owner/manager
     */
    @Get()
    async getFiles(
        @Param('code') code: string,
        @Req() req: any
    ) {
        try {
            // Verify user has access to this driving school
            const hasAccess = await this.filesService.verifyDrivingSchoolAccess(req.user, code);
            
            if (!hasAccess) {
                throw new HttpException(
                    'You do not have permission to access this driving school files',
                    HttpStatus.FORBIDDEN
                );
            }

            // Get files list
            const files = await this.filesService.getFilesList(code);
            
            return {
                success: true,
                drivingSchoolId: code,
                files
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            
            throw new HttpException(
                error.message || 'Failed to retrieve files',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Download a specific file
     * Only accessible by the driving school owner/manager
     */
    @Get('download/:filename')
    @Header('Content-Type', 'application/pdf')
    async downloadFile(
        @Param('code') code: string,
        @Param('filename') filename: string,
        @Req() req: any,
    ): Promise<StreamableFile> {
        // Verify user has access to this driving school
        const hasAccess = await this.filesService.verifyDrivingSchoolAccess(req.user, code);
        
        if (!hasAccess) {
            throw new HttpException(
                'You do not have permission to access this file',
                HttpStatus.FORBIDDEN
            );
        }

        // Security check: prevent directory traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            throw new HttpException(
                'Invalid filename',
                HttpStatus.BAD_REQUEST
            );
        }

        // Get file stream
        const fileStream = await this.filesService.downloadFile(code, filename);
        
        // Return streamable file with proper disposition header
        return new StreamableFile(fileStream, {
            type: 'application/pdf',
            disposition: `attachment; filename="${filename}"`,
        });
    }

    /**
     * Get file metadata (size, creation date, etc.)
     */
    @Get('info/:filename')
    async getFileInfo(
        @Param('code') code: string,
        @Param('filename') filename: string,
        @Req() req: any
    ) {
        try {
            // Verify user has access to this driving school
            const hasAccess = await this.filesService.verifyDrivingSchoolAccess(req.user, code);
            
            if (!hasAccess) {
                throw new HttpException(
                    'You do not have permission to access this file',
                    HttpStatus.FORBIDDEN
                );
            }

            // Security check: prevent directory traversal
            if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                throw new HttpException(
                    'Invalid filename',
                    HttpStatus.BAD_REQUEST
                );
            }

            // Get file info
            const fileInfo = await this.filesService.getFileInfo(code, filename);
            
            return {
                success: true,
                file: fileInfo
            };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            
            throw new HttpException(
                error.message || 'Failed to retrieve file info',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
