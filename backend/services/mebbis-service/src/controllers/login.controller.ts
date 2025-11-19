import { Controller, Post, Body } from '@nestjs/common';
import { PreloginService } from '../mebbis/prelogin.service';
import { IsLoggedInService } from '../mebbis/is-logged-in.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { TbMebbis } from '../entities/tb-mebbis.entity';
import { convertToNetscapeCookie } from '../lib/convert-to-netscape-cookie';

@Controller('api/mebbis/login')
export class LoginController {
  constructor(
    @InjectRepository(TbMebbis)
    private tbMebbisRepository: Repository<TbMebbis>,
  ) {}

  @Post('trylogin')
  async tryLogin(
    @Body() body: { username: string; password: string; tbMebbisId: number },
  ) {
    const { username, password, tbMebbisId } = body;
    const cookieName = 'mebbis' + tbMebbisId + '.txt';
    const prelogin = new PreloginService(
      'https://mebbisyd.meb.gov.tr/',
      cookieName,
    );
    const trylogin = await prelogin.tryLogin(username, password);
    if (trylogin.success) {
      return { message: 'login success' };
    } else {
      return {
        data: {},
        error: { message: trylogin.data },
        message: 'login failed',
      };
    }
  }

  @Post('withNotification')
  async withNotification(
    @Body() body: { username: string; password: string; tbMebbisId: number },
  ) {
    const { username, password, tbMebbisId } = body;
    const cookieName = 'mebbis' + tbMebbisId + '.txt';
    const prelogin = new PreloginService(
      'https://mebbisyd.meb.gov.tr/',
      cookieName,
    );

    try {
      const trylogin = await prelogin.login(username, password);

      if (trylogin.success) {
        // Update database
        await this.tbMebbisRepository.update(
          { id: tbMebbisId },
          {
            lastLogin: Math.floor(Date.now() / 1000),
            mebbislogin: true,
          },
        );

        return {
          message: 'login success',
          data: {
            tbMebbisId: tbMebbisId,
            inputs: trylogin.data.inputs,
          },
        };
      } else {
        return {
          data: {},
          error: { message: trylogin.data },
          message: 'login failedwith notif',
        };
      }
    } catch (e: any) {
      return {
        data: {},
        error: { message: e.message },
        message: 'login failed2',
      };
    }
  }

  @Post('isLoggedIn')
  async isLoggedIn(@Body() body: { tbMebbisId: number }) {
    const { tbMebbisId } = body;
    const cookieName = 'mebbis' + tbMebbisId + '.txt';
    const isLoggedInService = new IsLoggedInService(cookieName);
    const r = await isLoggedInService.isLoggedIn();

    if (r.success) {
      const loadpath = path.join(
        __dirname,
        '../../../storage/cookies/',
        cookieName,
      );
      convertToNetscapeCookie(loadpath);
      console.log('converted to netscape cookie', loadpath);
      const cookieString = fs.readFileSync(loadpath, 'utf8');
      await this.tbMebbisRepository.update(
        { id: tbMebbisId },
        {
          lastLogin: Math.floor(Date.now() / 1000),
          mebbislogin: true,
          cookie: cookieString,
        },
      );
      return { message: 'login success with ' + r.data };
    } else {
      await this.tbMebbisRepository.update(
        { id: tbMebbisId },
        { mebbislogin: false },
      );
      return {
        data: {},
        error: { message: r.data },
        message: 'login failed1',
      };
    }
  }

  @Post('withCode')
  async withCode(@Body() body: { tbMebbisId: number; code: string }) {
    const { code, tbMebbisId } = body;
    const cookieName = 'mebbis' + tbMebbisId + '.txt';
    const prelogin = new PreloginService(
      'https://mebbisyd.meb.gov.tr/',
      cookieName,
    );

    try {
      const trylogin = await prelogin.loginWithCode(code);
      if (trylogin.success) {
        const cookiepath = path.join(
          __dirname,
          '../../../storage/cookies/',
          cookieName,
        );
        const cookieString = fs.readFileSync(cookiepath, 'utf8');
        await this.tbMebbisRepository.update(
          { id: tbMebbisId },
          {
            lastLogin: Math.floor(Date.now() / 1000),
            mebbislogin: true,
            cookie: cookieString,
          },
        );

        return {
          success: true,
          message: 'login success',
          data: { tbMebbisId: tbMebbisId },
        };
      } else {
        return {
          data: {},
          error: { message: trylogin.data },
          message: 'login failedwith notif',
        };
      }
    } catch (e: any) {
      return {
        data: {},
        error: { message: e.message },
        message: 'login failed2',
      };
    }
  }
}
