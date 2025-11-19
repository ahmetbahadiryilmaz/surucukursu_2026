import { Controller, Get, Param, Res, NotFoundException, Logger, HttpStatus, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { FilesService } from './files.service';
import * as path from 'path';
import * as fs from 'fs';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {}

  @Get(':folder/:filename')
  @ApiOperation({ summary: 'Serve static file from storage subdirectory' })
  @ApiParam({ name: 'folder', description: 'Folder name (e.g., DS1, DS2)' })
  @ApiParam({ name: 'filename', description: 'Name of the file to serve' })
  @ApiResponse({ status: 200, description: 'File served successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async serveFileFromFolder(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() reply: FastifyReply,
  ) {
    try {
      const filePath = `${folder}/${filename}`;
      console.log(`\n📁 FILE REQUEST: Serve ${filePath}`);
      this.logger.log(`Serving file from folder: ${filePath}`);
      
      const fileInfo = await this.filesService.getFile(filePath);
      
      if (!fileInfo.exists) {
        this.logger.warn(`File not found: ${filePath}`);
        throw new NotFoundException('File not found');
      }

      // Set appropriate headers
      reply.header('Content-Type', fileInfo.mimeType);
      reply.header('Content-Length', fileInfo.size);
      reply.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      // For PDFs, set inline disposition to view in browser
      if (fileInfo.mimeType === 'application/pdf') {
        reply.header('Content-Disposition', `inline; filename="${filename}"`);
      } else {
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      }

      const fileStream = fs.createReadStream(fileInfo.fullPath);
      return reply.send(fileStream);
    } catch (error) {
      this.logger.error(`Error serving file ${folder}/${filename}:`, error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Internal server error while serving file',
      });
    }
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Serve static file from storage' })
  @ApiParam({ name: 'filename', description: 'Name of the file to serve' })
  @ApiResponse({ status: 200, description: 'File served successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async serveFile(
    @Param('filename') filename: string,
    @Res() reply: FastifyReply,
  ) {
    try {
      this.logger.log(`Serving file: ${filename}`);
      
      const fileInfo = await this.filesService.getFile(filename);
      
      if (!fileInfo.exists) {
        this.logger.warn(`File not found: ${filename}`);
        throw new NotFoundException('File not found');
      }

      // Set appropriate headers
      reply.header('Content-Type', fileInfo.mimeType);
      reply.header('Content-Length', fileInfo.size);
      reply.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      // For PDFs, set inline disposition to view in browser
      if (fileInfo.mimeType === 'application/pdf') {
        reply.header('Content-Disposition', `inline; filename="${filename}"`);
      } else {
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      }

      const fileStream = fs.createReadStream(fileInfo.fullPath);
      return reply.send(fileStream);
    } catch (error) {
      this.logger.error(`Error serving file ${filename}:`, error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Internal server error while serving file',
      });
    }
  }

  @Get('pdf/:folder/:filename')
  @ApiOperation({ summary: 'Serve PDF file from subdirectory for inline viewing' })
  @ApiParam({ name: 'folder', description: 'Folder name (e.g., DS1, DS2)' })
  @ApiParam({ name: 'filename', description: 'Name of the PDF file to serve' })
  @ApiResponse({ status: 200, description: 'PDF file served successfully' })
  @ApiResponse({ status: 404, description: 'PDF file not found' })
  async servePdfFromFolder(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() reply: FastifyReply,
  ) {
    try {
      // Ensure the file has .pdf extension
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
      }

      const filePath = `${folder}/${filename}`;
      console.log(`\n📄 PDF REQUEST: ${filePath}`);
      this.logger.log(`Serving PDF file from folder: ${filePath}`);
      
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
      this.logger.error(`Error serving PDF ${folder}/${filename}:`, error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Internal server error while serving PDF',
      });
    }
  }

  @Get('pdf/:filename')
  @ApiOperation({ summary: 'Serve PDF file for inline viewing' })
  @ApiParam({ name: 'filename', description: 'Name of the PDF file to serve' })
  @ApiResponse({ status: 200, description: 'PDF file served successfully' })
  @ApiResponse({ status: 404, description: 'PDF file not found' })
  async servePdf(
    @Param('filename') filename: string,
    @Res() reply: FastifyReply,
  ) {
    try {
      // Ensure the file has .pdf extension
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
      }

      this.logger.log(`Serving PDF file: ${filename}`);
      
      const fileInfo = await this.filesService.getFile(filename);
      
      if (!fileInfo.exists) {
        this.logger.warn(`PDF file not found: ${filename}`);
        throw new NotFoundException('PDF file not found');
      }

      if (fileInfo.mimeType !== 'application/pdf') {
        this.logger.warn(`File is not a PDF: ${filename}`);
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
      this.logger.error(`Error serving PDF ${filename}:`, error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Internal server error while serving PDF',
      });
    }
  }

  @Get('download/:folder/:filename')
  @ApiOperation({ summary: 'Force download file from storage subdirectory' })
  @ApiParam({ name: 'folder', description: 'Folder name (e.g., DS1, DS2)' })
  @ApiParam({ name: 'filename', description: 'Name of the file to download' })
  @ApiResponse({ status: 200, description: 'File download started' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFileFromFolder(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() reply: FastifyReply,
  ) {
    try {
      const filePath = `${folder}/${filename}`;
      console.log(`\n📥 FILE REQUEST: Download ${filePath}`);
      this.logger.log(`Force downloading file from folder: ${filePath}`);
      
      const fileInfo = await this.filesService.getFile(filePath);
      
      if (!fileInfo.exists) {
        this.logger.warn(`File not found for download: ${filePath}`);
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
      this.logger.error(`Error downloading file ${folder}/${filename}:`, error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Internal server error while downloading file',
      });
    }
  }

  @Get('download/:filename')
  @ApiOperation({ summary: 'Force download file from storage' })
  @ApiParam({ name: 'filename', description: 'Name of the file to download' })
  @ApiResponse({ status: 200, description: 'File download started' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('filename') filename: string,
    @Res() reply: FastifyReply,
  ) {
    try {
      this.logger.log(`Force downloading file: ${filename}`);
      
      const fileInfo = await this.filesService.getFile(filename);
      
      if (!fileInfo.exists) {
        this.logger.warn(`File not found for download: ${filename}`);
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
      this.logger.error(`Error downloading file ${filename}:`, error.message);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: 'Internal server error while downloading file',
      });
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all files in storage' })
  @ApiResponse({ status: 200, description: 'Files listed successfully' })
  async listFiles() {
    try {
      const files = await this.filesService.listFiles();
      return {
        files,
        count: files.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error listing files:`, error.message);
      throw new Error('Failed to list files');
    }
  }
}