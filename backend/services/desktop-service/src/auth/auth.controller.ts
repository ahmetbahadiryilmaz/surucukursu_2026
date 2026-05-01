import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { DesktopLoginDto } from './dto/desktop-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../common/decorators/public.decorator';
import { DesktopAuthGuard } from '../common/guards/desktop-auth.guard';

@ApiTags('Desktop Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Desktop app login for driving school users' })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: DesktopLoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(DesktopAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Desktop app logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    return this.authService.logout(token);
  }

  @Get('profile')
  @UseGuards(DesktopAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile (name, email, phone)' })
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id, req.user.userType);
  }

  @Patch('profile')
  @UseGuards(DesktopAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Update current user phone number' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, req.user.userType, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send password reset code to email' })
  @ApiResponse({ status: 200, description: 'Reset code sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('verify-reset-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify the password reset code' })
  @ApiResponse({ status: 200, description: 'Code is valid' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password using verified code' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}

