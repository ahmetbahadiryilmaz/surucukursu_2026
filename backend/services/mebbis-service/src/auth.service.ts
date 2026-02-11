import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TbMebbis } from './entities/tb-mebbis.entity';
import { MebbisCookie } from '@surucukursu/shared';
import { PreloginService } from './mebbis/prelogin.service';
import { IsLoggedInService } from './mebbis/is-logged-in.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(TbMebbis)
    private tbMebbisRepository: Repository<TbMebbis>,
    @InjectRepository(MebbisCookie)
    private mebbisCookieRepository: Repository<MebbisCookie>,
  ) {}

  /**
   * Save cookie to database
   * @param drivingSchoolId - The driving school ID
   * @param cookieData - The cookie string to save
   */
  async saveCookie(
    drivingSchoolId: number,
    cookieData: string,
  ): Promise<void> {
    const existingCookie = await this.mebbisCookieRepository.findOne({
      where: { driving_school_id: drivingSchoolId },
    });

    if (existingCookie) {
      await this.mebbisCookieRepository.update(
        { id: existingCookie.id },
        {
          cookie_data: cookieData,
          is_valid: true,
          updated_at: new Date(),
        },
      );
    } else {
      await this.mebbisCookieRepository.save({
        driving_school_id: drivingSchoolId,
        cookie_data: cookieData,
        is_valid: true,
      });
    }
  }

  /**
   * Get cookie from database
   */
  async getCookie(drivingSchoolId: number): Promise<string | null> {
    const cookie = await this.mebbisCookieRepository.findOne({
      where: { driving_school_id: drivingSchoolId, is_valid: true },
    });

    return cookie ? cookie.cookie_data : null;
  }

  /**
   * Invalidate cookie in database
   */
  async invalidateCookie(drivingSchoolId: number): Promise<void> {
    await this.mebbisCookieRepository.update(
      { driving_school_id: drivingSchoolId },
      { is_valid: false },
    );
  }

  async tryLogin(username: string, password: string, drivingSchoolId: number) {
    const prelogin = new PreloginService(
      'https://mebbisyd.meb.gov.tr/',
      drivingSchoolId,
    );

    // Set callback to save cookies to database
    prelogin.setOnCookieUpdate(async (cookies: string) => {
      await this.saveCookie(drivingSchoolId, cookies);
    });

    // Load existing cookies if available
    const existingCookies = await this.getCookie(drivingSchoolId);
    if (existingCookies) {
      prelogin.setInitialCookies(existingCookies);
    }

    const trylogin = await prelogin.tryLogin(username, password);

    if (trylogin.success) {
      // Login successful - redirected to main page
      // Now we need to check if AJANDA KODU is required
      return { 
        message: 'login success',
        needsCode: true, // Session established, may need AJANDA KODU for further actions
      };
    }
    
    // Check if the error message indicates wrong credentials
    const errorMessage = trylogin.data?.toString() || '';
    const isWrongCredentials = 
      errorMessage.toLowerCase().includes('kullanıcı') ||
      errorMessage.toLowerCase().includes('şifre') ||
      errorMessage.toLowerCase().includes('hatalı') ||
      errorMessage.toLowerCase().includes('yanlış');
    
    return {
      data: {},
      error: { 
        message: errorMessage || 'Kullanıcı Adı veya Şifre yanlış',
        isWrongCredentials: isWrongCredentials,
      },
      message: 'login failed',
    };
  }

  async withNotification(
    username: string,
    password: string,
    drivingSchoolId: number,
  ) {
    const prelogin = new PreloginService(
      'https://mebbisyd.meb.gov.tr/',
      drivingSchoolId,
    );

    // Set callback to save cookies to database
    prelogin.setOnCookieUpdate(async (cookies: string) => {
      await this.saveCookie(drivingSchoolId, cookies);
    });

    // Load existing cookies if available
    const existingCookies = await this.getCookie(drivingSchoolId);
    if (existingCookies) {
      prelogin.setInitialCookies(existingCookies);
    }

    try {
      const trylogin = await prelogin.login(username, password);

      if (trylogin.success) {
        // Update database
        await this.tbMebbisRepository.update(
          { id: drivingSchoolId },
          {
            lastLogin: Math.floor(Date.now() / 1000),
            mebbislogin: true,
          },
        );

        return {
          message: 'login success',
          data: {
            drivingSchoolId: drivingSchoolId,
            inputs: trylogin.data.inputs,
          },
        };
      }
      return {
        data: {},
        error: { message: trylogin.data },
        message: 'login failedwith notif',
      };
    } catch (e: any) {
      return {
        data: {},
        error: { message: e.message },
        message: 'login failed2',
      };
    }
  }

  async isLoggedIn(tbMebbisId: number) {
    const isLoggedInService = new IsLoggedInService(tbMebbisId);
    const r = await isLoggedInService.isLoggedIn();

    if (r.success) {
      // Get cookie from database
      const cookieString = await this.getCookie(tbMebbisId);
      
      if (cookieString) {
        await this.tbMebbisRepository.update(
          { id: tbMebbisId },
          {
            lastLogin: Math.floor(Date.now() / 1000),
            mebbislogin: true,
          },
        );
        return { message: 'login success with ' + r.data };
      }
    }

    await this.tbMebbisRepository.update(
      { id: tbMebbisId },
      { mebbislogin: false },
    );
    await this.invalidateCookie(tbMebbisId);

    return {
      data: {},
      error: { message: r.data },
      message: 'login failed1',
    };
  }

  async withCode(code: string, tbMebbisId: number) {
    const prelogin = new PreloginService(
      'https://mebbisyd.meb.gov.tr/',
      tbMebbisId,
    );

    // Set callback to save cookies to database
    prelogin.setOnCookieUpdate(async (cookies: string) => {
      await this.saveCookie(tbMebbisId, cookies);
    });

    // Load existing cookies if available
    const existingCookies = await this.getCookie(tbMebbisId);
    if (existingCookies) {
      prelogin.setInitialCookies(existingCookies);
    }

    try {
      const trylogin = await prelogin.loginWithCode(code);
      if (trylogin.success) {
        // Get cookie from PreloginService (it stores in memory/temp)
        // For now, we'll get it from the service's internal state
        // In production, PreloginService should return the cookie data
        
        // Save to database
        const cookieData = trylogin.data?.cookie || '';
        if (cookieData) {
          await this.saveCookie(tbMebbisId, cookieData);
        }

        await this.tbMebbisRepository.update(
          { id: tbMebbisId },
          {
            lastLogin: Math.floor(Date.now() / 1000),
            mebbislogin: true,
          },
        );

        return {
          success: true,
          message: 'login success',
          data: { tbMebbisId: tbMebbisId },
        };
      }
      return {
        data: {},
        error: { message: trylogin.data },
        message: 'login failedwith notif',
      };
    } catch (e: any) {
      return {
        data: {},
        error: { message: e.message },
        message: 'login failed2',
      };
    }
  }
}
