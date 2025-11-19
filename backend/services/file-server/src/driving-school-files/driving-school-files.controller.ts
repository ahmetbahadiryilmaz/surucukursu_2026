import { Controller, Get, Param, Res, NotFoundException, Logger, HttpStatus, Header, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { DrivingSchoolFilesService } from './driving-school-files.service';
import * as fs from 'fs';

@ApiTags('Driving School Files')
@Controller('files/driving-school/:code')
export class DrivingSchoolFilesController {
  private readonly logger = new Logger(DrivingSchoolFilesController.name);

  constructor(private readonly filesService: DrivingSchoolFilesService) {}

  /**
   * List all files for a driving school
   */
  @Get()
  @ApiOperation({ summary: 'List all files for a driving school' })
  @ApiParam({ name: 'code', description: 'Driving school code' })
  @ApiResponse({ status: 200, description: 'Files listed successfully' })
  @ApiResponse({ status: 404, description: 'Driving school not found' })
  async listFiles(@Param('code') code: string) {
    try {
      console.log(`\n� FILE-SERVER: Received request to list files`);
      console.log(`   Driving School Code: ${code}`);
      console.log(`   Route: GET /files/driving-school/${code}`);
      
      this.logger.log(`Listing files for driving school: ${code}`);
      
      const files = await this.filesService.getFilesList(code);
      
      console.log(`   ✅ Found ${files.length} files`);
      
      return {
        success: true,
        drivingSchoolId: code,
        files,
        count: files.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      this.logger.error(`Error listing files for ${code}:`, error.message);
      throw new NotFoundException(`Driving school files not found: ${code}`);
    }
  }

  /**
   * Download a specific file from a driving school
   */
  @Get('download/:filename')
  @ApiOperation({ summary: 'Download a file from driving school storage' })
  @ApiParam({ name: 'code', description: 'Driving school code' })
  @ApiParam({ name: 'filename', description: 'Name of the file to download' })
  @ApiResponse({ status: 200, description: 'File download started' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('code') code: string,
    @Param('filename') filename: string,
    @Res() reply: FastifyReply,
  ) {
    try {
      const filePath = `DS${code}/${filename}`;
      console.log(`\n📥 DRIVING SCHOOL FILE DOWNLOAD: ${filePath}`);
      this.logger.log(`Downloading file for driving school ${code}: ${filename}`);
      
      const fileInfo = await this.filesService.getFile(filePath);
      
      if (!fileInfo.exists) {
        this.logger.warn(`File not found: ${filePath}`);
        throw new NotFoundException('File not found');
      }

      // Set download headers
      reply.header('Content-Type', 'application/octet-stream');
      reply.header('Content-Length', fileInfo.size);
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.header('Cache-Control', 'no-cache');

      const fileStream = fs.createReadStream(fileInfo.fullPath);
      return reply.send(fileStream);
    } catch (error) {
      this.logger.error(`Error downloading file ${code}/${filename}:`, error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Internal server error while downloading file',
      });
    }
  }

  /**
   * View PDF file inline (for preview in browser)
   */
  @Get('view/:filename')
  @ApiOperation({ summary: 'View PDF file inline for a driving school' })
  @ApiParam({ name: 'code', description: 'Driving school code' })
  @ApiParam({ name: 'filename', description: 'Name of the PDF file to view' })
  @ApiResponse({ status: 200, description: 'PDF file served successfully' })
  @ApiResponse({ status: 404, description: 'PDF file not found' })
  async viewFile(
    @Param('code') code: string,
    @Param('filename') filename: string,
    @Res() reply: FastifyReply,
  ) {
    try {
      const filePath = `DS${code}/${filename}`;
      console.log(`\n📄 DRIVING SCHOOL PDF VIEW: ${filePath}`);
      this.logger.log(`Viewing PDF for driving school ${code}: ${filename}`);
      
      const fileInfo = await this.filesService.getFile(filePath);
      
      if (!fileInfo.exists) {
        this.logger.warn(`PDF file not found: ${filePath}`);
        throw new NotFoundException('PDF file not found');
      }

      if (fileInfo.mimeType !== 'application/pdf') {
        this.logger.warn(`File is not a PDF: ${filePath}`);
        throw new NotFoundException('File is not a PDF');
      }

      // Set PDF-specific headers for inline viewing
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Length', fileInfo.size);
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      reply.header('Cache-Control', 'public, max-age=3600');
      reply.header('X-Content-Type-Options', 'nosniff');

      const fileStream = fs.createReadStream(fileInfo.fullPath);
      return reply.send(fileStream);
    } catch (error) {
      this.logger.error(`Error viewing PDF ${code}/${filename}:`, error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Internal server error while viewing PDF',
      });
    }
  }
}
