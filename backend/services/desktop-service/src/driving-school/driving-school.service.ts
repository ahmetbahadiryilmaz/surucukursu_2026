import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DrivingSchoolEntity,
  DrivingSchoolStudentEntity,
  DrivingSchoolSettingsEntity,
  SubscriptionEntity,
  TextEncryptor,
} from '@surucukursu/shared';

export interface MebbisAccountDto {
  id: number;
  label: string;
  username: string | null;
  password: string | null;
  simulatorType: string | null;
  subscriptionActive: boolean;
  subscription: {
    type: string | null;
    endsAt: number | null;
    pdfPrintUsed: number;
    pdfPrintLimit: number | null;
  } | null;
}

/**
 * Subscription is active when type === 'paid' AND ends_at is null (never expires)
 * OR ends_at > now. Demo subscriptions are blocked for now.
 */
function isSubscriptionActive(sub: SubscriptionEntity | null | undefined): boolean {
  if (!sub) return false;
  if (sub.type !== 'paid' && sub.type !== 'unlimited') return false;
  if (sub.ends_at == null) return true;
  return sub.ends_at > Math.floor(Date.now() / 1000);
}

// Matches UserTypes in api-server
enum UserTypes {
  DRIVING_SCHOOL_OWNER = 2,
  DRIVING_SCHOOL_MANAGER = 3,
}

@Injectable()
export class DrivingSchoolService {
  constructor(
    @InjectRepository(DrivingSchoolEntity)
    private schoolRepository: Repository<DrivingSchoolEntity>,
    @InjectRepository(DrivingSchoolStudentEntity)
    private studentRepository: Repository<DrivingSchoolStudentEntity>,
    @InjectRepository(DrivingSchoolSettingsEntity)
    private settingsRepository: Repository<DrivingSchoolSettingsEntity>,
    @InjectRepository(SubscriptionEntity)
    private subscriptionRepository: Repository<SubscriptionEntity>,
  ) {}

  async getMySchool(user: { id: number; userType: UserTypes }) {
    const whereClause =
      user.userType === UserTypes.DRIVING_SCHOOL_OWNER
        ? { owner_id: user.id }
        : { manager_id: user.id };

    const school = await this.schoolRepository.findOne({ where: whereClause });

    if (!school) {
      throw new NotFoundException('No driving school found for this account');
    }

    const settings = await this.settingsRepository.findOne({
      where: { driving_school_id: school.id },
    });

    return {
      id: school.id,
      name: school.name,
      address: school.address,
      phone: school.phone,
      settings: settings
        ? {
            simulator_type: settings.simulator_type,
          }
        : null,
    };
  }

  async getMyStudents(user: { id: number; userType: UserTypes }) {
    const whereClause =
      user.userType === UserTypes.DRIVING_SCHOOL_OWNER
        ? { owner_id: user.id }
        : { manager_id: user.id };

    const school = await this.schoolRepository.findOne({ where: whereClause });

    if (!school) {
      throw new NotFoundException('No driving school found for this account');
    }

    const students = await this.studentRepository.find({
      where: { school_id: school.id },
      select: ['id', 'name', 'tc_number', 'license_class', 'mebbis_status'],
    });

    return students;
  }

  /** Returns MEBBIS accounts (one per school) for the logged-in user. */
  async getMebbisAccounts(user: { id: number; userType: UserTypes }): Promise<MebbisAccountDto[]> {
    const whereClause =
      user.userType === UserTypes.DRIVING_SCHOOL_OWNER
        ? { owner_id: user.id }
        : { manager_id: user.id };

    const schools = await this.schoolRepository.find({ where: whereClause });

    return Promise.all(
      schools.map(async (school) => {
        const [settings, subscription] = await Promise.all([
          this.settingsRepository.findOne({ where: { driving_school_id: school.id } }),
          this.subscriptionRepository.findOne({ where: { driving_school_id: school.id } }),
        ]);

        return {
          id: school.id,
          label: school.name,
          username: school.mebbis_username
            ? TextEncryptor.mebbisUsernameDecrypt(school.mebbis_username)
            : null,
          password: school.mebbis_password
            ? TextEncryptor.mebbisPasswordDecrypt(school.mebbis_password)
            : null,
          simulatorType: settings?.simulator_type ?? null,
          subscriptionActive: isSubscriptionActive(subscription),
          subscription: subscription
            ? {
                type: subscription.type,
                endsAt: subscription.ends_at ?? null,
                pdfPrintUsed: subscription.pdf_print_used,
                pdfPrintLimit: subscription.pdf_print_limit ?? null,
              }
            : null,
        };
      }),
    );
  }

  /** Creates or updates MEBBIS credentials for a school owned by the user. */
  async upsertMebbisAccount(
    user: { id: number; userType: UserTypes },
    schoolId: number,
    data: { username: string; password: string; simulatorType?: string },
  ): Promise<MebbisAccountDto> {
    const whereClause =
      user.userType === UserTypes.DRIVING_SCHOOL_OWNER
        ? { id: schoolId, owner_id: user.id }
        : { id: schoolId, manager_id: user.id };

    const school = await this.schoolRepository.findOne({ where: whereClause });
    if (!school) {
      throw new NotFoundException('Driving school not found or access denied');
    }

    school.mebbis_username = TextEncryptor.mebbisUsernameEncrypt(data.username);
    school.mebbis_password = TextEncryptor.mebbisPasswordEncrypt(data.password);
    await this.schoolRepository.save(school);

    if (data.simulatorType !== undefined) {
      let settings = await this.settingsRepository.findOne({
        where: { driving_school_id: school.id },
      });
      if (settings) {
        settings.simulator_type = data.simulatorType as any;
        await this.settingsRepository.save(settings);
      } else {
        await this.settingsRepository.save(
          this.settingsRepository.create({
            driving_school_id: school.id,
            simulator_type: data.simulatorType as any,
          }),
        );
      }
    }

    const [settings, subscription] = await Promise.all([
      this.settingsRepository.findOne({ where: { driving_school_id: school.id } }),
      this.subscriptionRepository.findOne({ where: { driving_school_id: school.id } }),
    ]);

    return {
      id: school.id,
      label: school.name,
      username: data.username,
      password: data.password,
      simulatorType: settings?.simulator_type ?? null,
      subscriptionActive: isSubscriptionActive(subscription),
      subscription: subscription
        ? {
            type: subscription.type,
            endsAt: subscription.ends_at ?? null,
            pdfPrintUsed: subscription.pdf_print_used,
            pdfPrintLimit: subscription.pdf_print_limit ?? null,
          }
        : null,
    };
  }

  /** Clears MEBBIS credentials for a school owned by the user. */
  async removeMebbisAccount(
    user: { id: number; userType: UserTypes },
    schoolId: number,
  ): Promise<void> {
    const whereClause =
      user.userType === UserTypes.DRIVING_SCHOOL_OWNER
        ? { id: schoolId, owner_id: user.id }
        : { id: schoolId, manager_id: user.id };

    const school = await this.schoolRepository.findOne({ where: whereClause });
    if (!school) {
      throw new NotFoundException('Driving school not found or access denied');
    }

    school.mebbis_username = null;
    school.mebbis_password = null;
    await this.schoolRepository.save(school);
  }
}
