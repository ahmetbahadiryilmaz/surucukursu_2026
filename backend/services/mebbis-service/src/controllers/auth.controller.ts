import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Controller('api')
export class LoginController {
  constructor(private authService: AuthService) {}

  //trylogin without 2fa , only username and password validation
  @Post('mebbis/login/trylogin')
  async tryLogin(
    @Body() body: { username: string; password: string; tbMebbisId: number },
  ) {
    const { username, password, tbMebbisId } = body;
    return this.authService.tryLogin(username, password, tbMebbisId);
  }

  //login with code
  @Post('mebbis/login/withCode')
  async withCode(@Body() body: { tbMebbisId: number; code: string }) {
    const { code, tbMebbisId } = body;
    return this.authService.withCode(code, tbMebbisId);
  }

  //login with 2fa notification
  @Post('mebbis/login/withNotification')
  async withNotification(
    @Body() body: { username: string; password: string; tbMebbisId: number },
  ) {
    const { username, password, tbMebbisId } = body;
    return this.authService.withNotification(username, password, tbMebbisId);
  }

  //check is cookie is valid and accessing mebbis.meb.gov.tr
  @Post('mebbis/login/isLoggedIn')
  async isLoggedIn(@Body() body: { tbMebbisId: number }) {
    const { tbMebbisId } = body;
    return this.authService.isLoggedIn(tbMebbisId);
  }
}
