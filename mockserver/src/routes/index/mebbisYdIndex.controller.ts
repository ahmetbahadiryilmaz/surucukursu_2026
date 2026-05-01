import { Controller, Get, Post, Res, Body, Query } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { mebbisYdIndexService } from './mebbisYdIndex.service';

@ApiTags('mebbisYdIndex')
@Controller('/')
export class mebbisYdIndexController {
    constructor(private readonly mebbisYdIndexService: mebbisYdIndexService) {}

    @Get()
    @ApiOperation({ summary: 'Get index page' })
    @ApiResponse({ status: 200, description: 'Returns the homepage view' })
    getIndexView(@Res() reply: FastifyReply) {
        return this.mebbisYdIndexService.handleIndexView(reply);
    }

    @Post()
    @ApiOperation({ summary: 'Post index page - Login form submission' })
    @ApiResponse({ status: 302, description: 'Redirects to redirect.aspx after login' })
    postIndexView(@Res() reply: FastifyReply) {
        return this.mebbisYdIndexService.handleLoginSubmission(reply);
    }
    
    @Get("main.aspx")
    @ApiOperation({ summary: 'Get main page after successful verification' })
    @ApiResponse({ status: 200, description: 'Returns the main page view' })
    getMainPageView(@Res() reply: FastifyReply, @Query() query?: any) {
        return this.mebbisYdIndexService.handleMainPageView(reply, query);
    }

    @Get('default.aspx')
    @ApiOperation({ summary: 'Get initial login page' })
    @ApiResponse({ status: 200, description: 'Returns the login page view with form data and hidden inputs' })
    getDefaultAspx(@Res() reply: FastifyReply, @Query() query: any) {
        return this.mebbisYdIndexService.handleDefaultAspx(reply, query);
    }

    @Post('default.aspx')
    @ApiOperation({ summary: 'Post login credentials' })
    @ApiResponse({ status: 302, description: 'Redirects after login attempt' })
    postDefaultAspx(@Res() reply: FastifyReply, @Body() body: any, @Query() query: any) {
        return this.mebbisYdIndexService.handleDefaultAspxPost(reply, body, query);
    }

    @Get('index.aspx')
    @ApiOperation({ summary: 'Get redirect page after successful login' })
    @ApiResponse({ status: 302, description: 'Redirects to main page after login' })
    getIndexAspx(@Res() reply: FastifyReply) {
        return this.mebbisYdIndexService.handleIndexAspx(reply);
    }



    @Get('redirect.aspx')
    @ApiOperation({ summary: 'Get redirect page' })
    @ApiResponse({ status: 200, description: 'Returns the redirect view' })
    redirectAspx(@Res() reply: FastifyReply) {
        return this.mebbisYdIndexService.handleRedirectAspx(reply);
    }

    @Post('redirect.aspx')
    @ApiOperation({ summary: 'Post redirect page - Handle verification code submission' })
    @ApiResponse({ status: 302, description: 'Redirects to main page if valid 6-digit code' })
    redirectAspxPost(@Res() reply: FastifyReply, @Body() body: any) {
        return this.mebbisYdIndexService.handleRedirectAspxPost(reply, body);
    }

}