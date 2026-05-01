import { Controller, Post, Body, Get, UseGuards, Req, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { BaseUser, RequestWithUser } from './dto/types';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth() //edit here
  @ApiOperation({ summary: 'Get current user info1' })
  @ApiResponse({ status: 200, description: 'User info retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async me(@Req() req: RequestWithUser): Promise<BaseUser> {
    return req.user;
  }


  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Req() req: RequestWithUser) {
    return this.authService.logout(req);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request password reset code' })
  async forgotPassword(@Body() body: { email: string; phone: string }) {
    return this.authService.forgotPassword(body.email, body.phone);
  }

  @Public()
  @Post('verify-reset-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify reset code' })
  async verifyResetCode(@Body() body: { email: string; code: string }) {
    return this.authService.verifyResetCode(body.email, body.code);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password with code' })
  async resetPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    return this.authService.resetPassword(body.email, body.code, body.newPassword);
  }

}  