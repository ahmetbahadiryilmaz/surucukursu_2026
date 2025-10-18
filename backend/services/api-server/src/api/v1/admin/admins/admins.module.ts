import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';
import { JwtModule } from '@nestjs/jwt';
import { AdminEntity, SessionEntity } from '@surucukursu/shared';
import { GuardsModule } from '../../../../common/guards/guards.module';
import { env } from '@surucukursu/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminEntity, SessionEntity]),
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: '24h' },
    }),
    GuardsModule,
  ],
  controllers: [AdminsController],
  providers: [AdminsService],
})
export class AdminsModule {}