import { Injectable, NotFoundException, ForbiddenException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DrivingSchoolEntity,
  DrivingSchoolStudentEntity,
  DrivingSchoolSettingsEntity,
  DrivingSchoolManagerEntity,
  DrivingSchoolOwnerEntity,
  SubscriptionEntity,
  TextEncryptor,
} from '@surucukursu/shared';

export interface MebbisAccountDto {
  id: number;
  label: string;
  ownerEmail: string | null;
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
  SUPER_ADMIN = -1,
  ADMIN = -2,
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
    @InjectRepository(DrivingSchoolManagerEntity)
    private managerRepository: Repository<DrivingSchoolManagerEntity>,
    @InjectRepository(DrivingSchoolOwnerEntity)
    private ownerRepository: Repository<DrivingSchoolOwnerEntity>,
  ) {}

  async getMySchool(user: { id: number; userType: UserTypes }) {
    const whereClause =
      user.userType === UserTypes.DRIVING_SCHOOL_OWNER
        ? { owner_id: user.id }
        : { manager_id: user.id };

    const school = await this.schoolRepository.findOne({ where: whereClause });

    if (!school) {
      return null;
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
          ownerEmail: null,
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

  /** Creates or updates MEBBIS credentials for a school owned by the user (or admin). */
  async upsertMebbisAccount(
    user: { id: number; userType: UserTypes },
    schoolId: number,
    data: { username: string; password: string; simulatorType?: string },
  ): Promise<MebbisAccountDto> {
    let school: DrivingSchoolEntity | null = null;
    if (user.userType === UserTypes.ADMIN || user.userType === UserTypes.SUPER_ADMIN) {
      school = await this.schoolRepository.findOne({ where: { id: schoolId } });
    } else {
      const whereClause =
        user.userType === UserTypes.DRIVING_SCHOOL_OWNER
          ? { id: schoolId, owner_id: user.id }
          : { id: schoolId, manager_id: user.id };
      school = await this.schoolRepository.findOne({ where: whereClause });
    }
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
      ownerEmail: null,
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

  /** Returns all driving schools with MEBBIS account info — admin only, dev-only. */
  async getAllSchools(user: { id: number; userType: number }): Promise<MebbisAccountDto[]> {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Not available in production');
    }
    if (user.userType !== UserTypes.ADMIN && user.userType !== UserTypes.SUPER_ADMIN) {
      throw new UnauthorizedException('Admin access required');
    }
    const schools = await this.schoolRepository.find();

    // Batch-fetch owners to avoid N+1
    const ownerIds = [...new Set(schools.map(s => s.owner_id).filter(Boolean))];
    const owners = ownerIds.length
      ? await this.ownerRepository.findByIds(ownerIds)
      : [];
    const ownerEmailMap = new Map(owners.map(o => [o.id, o.email]));

    return Promise.all(
      schools.map(async (school) => {
        const [settings, subscription] = await Promise.all([
          this.settingsRepository.findOne({ where: { driving_school_id: school.id } }),
          this.subscriptionRepository.findOne({ where: { driving_school_id: school.id } }),
        ]);
        return {
          id: school.id,
          label: school.name,
          ownerEmail: ownerEmailMap.get(school.owner_id) ?? null,
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

  /**
   * Creates a driving school (and a manager record if needed) for an owner who
   * has no school yet. Only owners can call this — managers always belong to an
   * existing school.
   */
  async setupMySchool(
    user: { id: number; userType: UserTypes },
    name: string,
  ): Promise<MebbisAccountDto> {
    if (user.userType !== UserTypes.DRIVING_SCHOOL_OWNER) {
      throw new ForbiddenException('Only driving school owners can create a school');
    }

    // Guard: owner must not already have a school
    const existing = await this.schoolRepository.findOne({ where: { owner_id: user.id } });
    if (existing) {
      throw new ConflictException('Driving school already exists for this account');
    }

    const owner = await this.ownerRepository.findOne({ where: { id: user.id } });
    if (!owner) throw new NotFoundException('Owner account not found');

    // Reuse or create the manager record (matched by email)
    let manager = await this.managerRepository.findOne({ where: { email: owner.email } });
    if (!manager) {
      manager = this.managerRepository.create({
        name: owner.name,
        email: owner.email,
        password: owner.password,   // same encrypted password
        phone: owner.phone,
        is_active: true,
      });
      manager = await this.managerRepository.save(manager);
    }

    const school = this.schoolRepository.create({
      name,
      address: '',
      phone: owner.phone,
      owner_id: owner.id,
      manager_id: manager.id,
    });
    const saved = await this.schoolRepository.save(school);

    return {
      id: saved.id,
      label: saved.name,
      ownerEmail: null,
      username: null,
      password: null,
      simulatorType: null,
      subscriptionActive: false,
      subscription: null,
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
