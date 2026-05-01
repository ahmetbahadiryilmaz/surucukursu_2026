import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { LoginDto } from './dto/login.dto';
import { AdminUser, RequestWithUser, UserModel } from './dto/types';
import { SystemLogProcessTypes, UserTypes } from './dto/enum';
import { TextEncryptor } from '@surucukursu/shared';
import { SlackService } from '../../../utils/slack/slack.service';
import { AdminEntity, DrivingSchoolOwnerEntity, DrivingSchoolManagerEntity, SessionEntity, SystemLogsEntity, PasswordResetTokenEntity } from '@surucukursu/shared';
import { env } from '@surucukursu/shared';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private slackService: SlackService,
    @InjectRepository(AdminEntity)
    private adminRepository: Repository<AdminEntity>,
    @InjectRepository(DrivingSchoolOwnerEntity)
    private drivingSchoolOwnerRepository: Repository<DrivingSchoolOwnerEntity>,
    @InjectRepository(DrivingSchoolManagerEntity)
    private drivingSchoolManagerRepository: Repository<DrivingSchoolManagerEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
    @InjectRepository(SystemLogsEntity)
    private systemLogsRepository: Repository<SystemLogsEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private resetTokenRepository: Repository<PasswordResetTokenEntity>,
  ) { }

  async login(loginDto: LoginDto) {
    let user: UserModel | null = null;
    let userType: UserTypes

    // Try driving school owner
    if (!user) {
      const ownerUser = await this.drivingSchoolOwnerRepository.findOne({ where: { email: loginDto.email } });

      if (ownerUser && (loginDto.password) === TextEncryptor.userPasswordDecrypt(ownerUser.password)) {
        user = ownerUser as any;
        userType = UserTypes.DRIVING_SCHOOL_OWNER;
      }
    }

    // Try driving school manager
    if (!user) {
      const managerUser = await this.drivingSchoolManagerRepository.findOne({ where: { email: loginDto.email } });

      if (managerUser && (loginDto.password) === TextEncryptor.userPasswordDecrypt(managerUser.password)) {
        user = managerUser as any;
        userType = UserTypes.DRIVING_SCHOOL_MANAGER;
      }
    }

    if (!user) {
      // Try admin
      const adminUser = await this.adminRepository.findOne({ where: { email: loginDto.email } });

      if (adminUser && (loginDto.password) == TextEncryptor.userPasswordDecrypt(adminUser.password)) {
        user = adminUser as unknown as AdminUser;
        userType = UserTypes.ADMIN;
      }
    }

    if (!user || !userType) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      userType: userType,
      date: Math.floor(Date.now() / 1000),
      jwtid: crypto.randomUUID(),
    });


    const existingSessions = await this.sessionRepository.find({
      where: { user_id: user.id, user_type: userType }
    });

    if (existingSessions.length > 0) {
      await this.sessionRepository.delete({ user_id: user.id, user_type: userType } as any);
    }

    // Create session
    await this.sessionRepository.save({
      token,
      user_id: user.id,
      user_type: userType,
      expires_at: Math.floor(Date.now() / 1000) + env.session.expiry,
      last_activity: Math.floor(Date.now() / 1000),
      last_login: Math.floor(Date.now() / 1000),
    });

    // Log the login action
    await this.systemLogsRepository.save({
      user_id: user.id,
      user_type: userType,
      process: SystemLogProcessTypes.LOGIN,
      description: `User logged in: ${user.email} (${userType})`
    });
    await this.slackService.sendNotification(
      "Login Notification",
      `User logged in: ${user.email} (${userType})`,
      1
    );
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: userType,
      },
    };

  }

  async logout(req: RequestWithUser) {
    const authHeader = req.headers['authorization'];  // Use bracket notation
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    /* await this.prisma.session.deleteMany({
      where: {
        user_id: req.user.id,
        token: token
      }
    });*/

    await this.systemLogsRepository.save({
      user_id: req.user.id,
      user_type: req.user.role || UserTypes.ADMIN,
      process: SystemLogProcessTypes.LOGOUT,
      description: `User logged out: ${req.user.email} (${req.user.role})`
    });

    

    return { message: 'Successfully logged out' };
  }

  async forgotPassword(email: string, phone: string) {
    const normalizedPhone = phone.replace(/-/g, '');
    const bypassCheck = normalizedPhone === '0000000000';

    const owner = await this.drivingSchoolOwnerRepository.findOne({ where: { email } });
    const manager = await this.drivingSchoolManagerRepository.findOne({ where: { email } });
    const admin = await this.adminRepository.findOne({ where: { email } });
    const user = owner || manager || admin;

    if (!user) {
      return { success: false, message: 'Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.' };
    }

    if (!admin) {
      const rawStoredPhone = ((user as any).phone || '').replace(/-/g, '').replace(/^0/, '');
      const isZeroPhone = !rawStoredPhone || /^0+$/.test(rawStoredPhone);

      if (!bypassCheck && !isZeroPhone) {
        if (rawStoredPhone !== normalizedPhone) {
          return {
            success: false,
            message: `Telefon numarası eşleşmiyor. Kayıtlı numaranızın son 4 hanesi: ****${rawStoredPhone.slice(-4)}`,
          };
        }
      }

      // If stored phone is zero/empty, update it to the entered phone
      if (isZeroPhone && !bypassCheck) {
        if (owner) {
          await this.drivingSchoolOwnerRepository.update(owner.id, { phone });
        } else if (manager) {
          await this.drivingSchoolManagerRepository.update(manager.id, { phone });
        }

    return { success: true, message: 'Doğrulama kodu e-posta adresinize gönderildi.' };
  }

  async verifyResetCode(email: string, code: string) {
    const record = await this.resetTokenRepository.findOne({ where: { email, token: code, used: false } });
    if (!record) throw new BadRequestException('Geçersiz veya hatalı kod');
    if (record.expires_at < Math.floor(Date.now() / 1000)) throw new BadRequestException('Kodun süresi dolmuş. Lütfen tekrar deneyin.');
    return { valid: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const record = await this.resetTokenRepository.findOne({ where: { email, token: code, used: false } });
    if (!record) throw new BadRequestException('Geçersiz veya hatalı kod');
    if (record.expires_at < Math.floor(Date.now() / 1000)) throw new BadRequestException('Kodun süresi dolmuş. Lütfen tekrar deneyin.');

    const encrypted = TextEncryptor.userPasswordEncrypt(newPassword);

    const owner = await this.drivingSchoolOwnerRepository.findOne({ where: { email } });
    if (owner) await this.drivingSchoolOwnerRepository.update(owner.id, { password: encrypted });

    const manager = await this.drivingSchoolManagerRepository.findOne({ where: { email } });
    if (manager) await this.drivingSchoolManagerRepository.update(manager.id, { password: encrypted });

    const admin = await this.adminRepository.findOne({ where: { email } });
    if (admin) await this.adminRepository.update(admin.id, { password: encrypted });

    await this.resetTokenRepository.update(record.id, { used: true });

    return { success: true, message: 'Şifreniz başarıyla güncellendi.' };
  }

  private async sendResetCodeEmail(email: string, code: string) {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
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