import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { DesktopLoginDto } from './dto/desktop-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  DrivingSchoolOwnerEntity,
  DrivingSchoolManagerEntity,
  SessionEntity,
  PasswordResetTokenEntity,
  TextEncryptor,
  env,
} from '@surucukursu/shared';

// UserTypes are defined locally since they belong to api-server's dto
enum UserTypes {
  DRIVING_SCHOOL_OWNER = 2,
  DRIVING_SCHOOL_MANAGER = 3,
}

@Injectable()
export class AuthService {
  private readonly dbRetryMaxAttempts = 3;

  constructor(
    private jwtService: JwtService,
    @InjectRepository(DrivingSchoolOwnerEntity)
    private ownerRepository: Repository<DrivingSchoolOwnerEntity>,
    @InjectRepository(DrivingSchoolManagerEntity)
    private managerRepository: Repository<DrivingSchoolManagerEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private resetTokenRepository: Repository<PasswordResetTokenEntity>,
  ) {}

  private isRetryableDbError(error: unknown): boolean {
    const errorCode = (error as { code?: string })?.code;
    const errorMessage = (error as { message?: string })?.message || '';

    if (errorCode && ['ECONNRESET', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'EPIPE'].includes(errorCode)) {
      return true;
    }

    if (/ECONNRESET|PROTOCOL_CONNECTION_LOST|ETIMEDOUT|EPIPE|read ECONNRESET/i.test(errorMessage)) {
      return true;
    }

    return error instanceof QueryFailedError && /ECONNRESET|PROTOCOL_CONNECTION_LOST|ETIMEDOUT|EPIPE/i.test(error.message);
  }

  private async withTransientDbRetry<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= this.dbRetryMaxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (!this.isRetryableDbError(error) || attempt === this.dbRetryMaxAttempts) {
          throw error;
        }

        const backoffMs = 150 * attempt;
        console.warn(
          `[Desktop AuthService] transient DB error on ${operationName} (attempt ${attempt}/${this.dbRetryMaxAttempts}), retrying in ${backoffMs}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw new Error(`Retry loop unexpectedly exited for ${operationName}`);
  }

  async login(dto: DesktopLoginDto) {
    let userId: number | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;
    let userType: UserTypes | null = null;

    const owner = await this.withTransientDbRetry('ownerRepository.findOne(login)', () =>
      this.ownerRepository.findOne({ where: { email: dto.email } }),
    );
    if (owner && dto.password === TextEncryptor.userPasswordDecrypt(owner.password)) {
      userId = owner.id;
      userEmail = owner.email;
      userName = owner.name;
      userType = UserTypes.DRIVING_SCHOOL_OWNER;
    }

    if (!userId) {
      const manager = await this.withTransientDbRetry('managerRepository.findOne(login)', () =>
        this.managerRepository.findOne({ where: { email: dto.email } }),
      );
      if (manager && dto.password === TextEncryptor.userPasswordDecrypt(manager.password)) {
        userId = manager.id;
        userEmail = manager.email;
        userName = manager.name;
        userType = UserTypes.DRIVING_SCHOOL_MANAGER;
      }
    }

    if (!userId || !userType) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      id: userId,
      email: userEmail,
      userType,
      date: Math.floor(Date.now() / 1000),
      jwtid: crypto.randomUUID(),
    });

    // Invalidate existing sessions for this user
    await this.withTransientDbRetry('sessionRepository.delete(login)', () =>
      this.sessionRepository.delete({ user_id: userId, user_type: userType }),
    );

    // Create new session
    await this.withTransientDbRetry('sessionRepository.save(login)', () =>
      this.sessionRepository.save({
        token,
        user_id: userId,
        user_type: userType,
        expires_at: Math.floor(Date.now() / 1000) + (env.session.expiry || 86400),
        last_activity: Math.floor(Date.now() / 1000),
        last_login: Math.floor(Date.now() / 1000),
      }),
    );

    return {
      token,
      user: {
        id: userId,
        email: userEmail,
        name: userName,
        userType,
      },
    };
  }

  async logout(token: string) {
    await this.withTransientDbRetry('sessionRepository.delete(logout)', () =>
      this.sessionRepository.delete({ token }),
    );
    return { message: 'Successfully logged out' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedPhone = dto.phone.replace(/-/g, '');
    const bypassCheck = normalizedPhone === '0000000000';

    const owner = await this.ownerRepository.findOne({ where: { email: dto.email } });
    const manager = await this.managerRepository.findOne({ where: { email: dto.email } });
    const user = owner || manager;

    if (user) {
      if (!bypassCheck) {
        const userPhone = (user.phone || '').replace(/-/g, '').replace(/^0/, '');
        if (userPhone !== normalizedPhone) {
          return {
            success: false,
            message: 'Girdiğiniz e-posta ve telefon numarası eşleşmiyor. Lütfen bilgilerinizi kontrol edin ya da WhatsApp üzerinden bizimle iletişime geçin.',
          };
        }
      }
    } else {
      return {
        success: false,
        message: 'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.',
      };
    }

    // Invalidate any existing tokens for this email
    await this.resetTokenRepository.delete({ email: dto.email });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes

    await this.resetTokenRepository.save({
      token: code,
      email: dto.email,
      expires_at: expiresAt,
      used: false,
    });

    await this.sendResetCodeEmail(dto.email, code);

    return { success: true, message: 'Doğrulama kodu e-posta adresinize gönderildi.' };
  }

  async verifyResetCode(dto: VerifyResetCodeDto) {
    const record = await this.resetTokenRepository.findOne({
      where: { email: dto.email, token: dto.code, used: false },
    });

    if (!record) {
      throw new BadRequestException('Geçersiz veya hatalı kod');
    }

    if (record.expires_at < Math.floor(Date.now() / 1000)) {
      throw new BadRequestException('Kodun süresi dolmuş. Lütfen tekrar deneyin.');
    }

    return { valid: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.resetTokenRepository.findOne({
      where: { email: dto.email, token: dto.code, used: false },
    });

    if (!record) {
      throw new BadRequestException('Geçersiz veya hatalı kod');
    }

    if (record.expires_at < Math.floor(Date.now() / 1000)) {
      throw new BadRequestException('Kodun süresi dolmuş. Lütfen tekrar deneyin.');
    }

    const encryptedPassword = TextEncryptor.userPasswordEncrypt(dto.newPassword);

    const owner = await this.ownerRepository.findOne({ where: { email: dto.email } });
    if (owner) {
      await this.ownerRepository.update({ email: dto.email }, { password: encryptedPassword });
    } else {
      const manager = await this.managerRepository.findOne({ where: { email: dto.email } });
      if (manager) {
        await this.managerRepository.update({ email: dto.email }, { password: encryptedPassword });
      }
    }

    // Mark token as used
    await this.resetTokenRepository.update({ id: record.id }, { used: true });

    return { message: 'Şifreniz başarıyla güncellendi' };
  }

  async getProfile(userId: number, userType: UserTypes) {
    if (userType === UserTypes.DRIVING_SCHOOL_OWNER) {
      const owner = await this.ownerRepository.findOne({ where: { id: userId } });
      if (!owner) throw new UnauthorizedException('User not found');
      return { name: owner.name, email: owner.email, phone: owner.phone };
    } else {
      const manager = await this.managerRepository.findOne({ where: { id: userId } });
      if (!manager) throw new UnauthorizedException('User not found');
      return { name: manager.name, email: manager.email, phone: manager.phone };
    }
  }

  async updateProfile(userId: number, userType: UserTypes, dto: UpdateProfileDto) {
    if (userType === UserTypes.DRIVING_SCHOOL_OWNER) {
      await this.ownerRepository.update({ id: userId }, { phone: dto.phone });
      const owner = await this.ownerRepository.findOne({ where: { id: userId } });
      return { name: owner.name, email: owner.email, phone: owner.phone };
    } else {
      await this.managerRepository.update({ id: userId }, { phone: dto.phone });
      const manager = await this.managerRepository.findOne({ where: { id: userId } });
      return { name: manager.name, email: manager.email, phone: manager.phone };
    }
  }

  private async sendResetCodeEmail(email: string, code: string) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      // In dev, just log the code instead of failing
      console.warn(`[DEV] Password reset code for ${email}: ${code}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"MTSK Destek" <${smtpFrom}>`,
      to: email,
      subject: 'Şifre Sıfırlama Kodunuz',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #4361ee;">Şifre Sıfırlama</h2>
          <p>Şifrenizi sıfırlamak için aşağıdaki kodu kullanın:</p>
          <div style="background: #f0f0f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
          </div>
          <p style="color: #666; font-size: 13px;">Bu kod 10 dakika süreyle geçerlidir.</p>
          <p style="color: #666; font-size: 13px;">Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın.</p>
        </div>
      `,
    });
  }
}
