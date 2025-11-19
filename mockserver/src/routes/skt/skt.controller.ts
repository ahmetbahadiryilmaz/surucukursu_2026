import { Controller, Get, Post, Res, Body } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SktService } from './skt.service';

@ApiTags('SKT - Sürücü Kursu Takip')
@Controller('SKT')
export class SktController {
    constructor(private readonly sktService: SktService) {}

    @Get('skt00001.aspx')
    @ApiOperation({ summary: 'Get student registration form' })
    @ApiResponse({ status: 200, description: 'Returns the student registration form' })
    getSkt00001(@Res() reply: FastifyReply) {
        return this.sktService.handleSkt00001(reply);
    }

    @Post('skt00001.aspx')
    @ApiOperation({ summary: 'Handle validation code submission' })
    @ApiResponse({ status: 302, description: 'Redirects back to skt00001.aspx after validation' })
    postSkt00001(@Res() reply: FastifyReply) {
        return this.sktService.handleSkt00001Post(reply);
    }

    @Get('skt01001.aspx')
    @ApiOperation({ summary: 'Get student information form' })
    @ApiResponse({ status: 200, description: 'Returns the student information form' })
    getSkt01001(@Res() reply: FastifyReply) {
        return this.sktService.handleSkt01001(reply);
    }

    @Get('skt02006.aspx')
    @ApiOperation({ summary: 'Get course selection page' })
    @ApiResponse({ status: 200, description: 'Returns the course selection form' })
    getSkt02006(@Res() reply: FastifyReply) {
        return this.sktService.handleSkt02006Get(reply);
    }

    @Post('skt02006.aspx')
    @ApiOperation({ summary: 'Submit course selection' })
    @ApiResponse({ status: 200, description: 'Process course selection submission' })
    postSkt02006(@Res() reply: FastifyReply) {
        return this.sktService.handleSkt02006Post(reply);
    }

    @Get('skt02009.aspx')
    @ApiOperation({ summary: 'Get course progress tracking page' })
    @ApiResponse({ status: 200, description: 'Returns the course progress tracking view' })
    getSkt02009(@Res() reply: FastifyReply) {
        return this.sktService.handleSkt02009Get(reply);
    }

    @Post('skt02009.aspx')
    @ApiOperation({ summary: 'Submit course progress data' })
    @ApiResponse({ status: 200, description: 'Process course progress submission' })
    postSkt02009(@Res() reply: FastifyReply) {
        return this.sktService.handleSkt02009Post(reply);
    }

    @Get('skt04002.aspx')
    @ApiOperation({ summary: 'Get training records page' })
    @ApiResponse({ status: 200, description: 'Returns the training records retrieval form' })
    getSkt04002(@Res() reply: FastifyReply) {
        return this.sktService.handleSkt04002Get(reply);
    }

    @Post('skt04002.aspx')
    @ApiOperation({ summary: 'Submit training records form' })
    @ApiResponse({ status: 200, description: 'Process training records submission and return results' })
    postSkt04002(@Res() reply: FastifyReply, @Body() body: any) {
        return this.sktService.handleSkt04002Post(reply, body);
    }
 

 
    @Get('skt01002.aspx')
    @ApiOperation({ summary: 'Get student document upload' })
    @ApiResponse({ status: 200, description: 'Returns document upload form' })
    getSkt01002(@Res() reply: FastifyReply) {
        return this.sktService.renderView(reply, 'skt01002.hbs', {
            pageTitle: 'Belge Yükleme',
            formAction: 'skt01002.aspx'
        });
    }

    @Get('skt03001.aspx')
    @ApiOperation({ summary: 'Get theory lesson schedule' })
    @ApiResponse({ status: 200, description: 'Returns theory lesson schedule' })
    getSkt03001(@Res() reply: FastifyReply) {
        return this.sktService.renderView(reply, 'skt03001.hbs', {
            pageTitle: 'Teorik Ders Programı',
            scheduleType: 'theory'
        });
    }

    @Get('skt03002.aspx')
    @ApiOperation({ summary: 'Get practical lesson schedule' })
    @ApiResponse({ status: 200, description: 'Returns practical lesson schedule' })
    getSkt03002(@Res() reply: FastifyReply) {
        return this.sktService.renderView(reply, 'skt03002.hbs', {
            pageTitle: 'Pratik Ders Programı',
            scheduleType: 'practical'
        });
    }
}
