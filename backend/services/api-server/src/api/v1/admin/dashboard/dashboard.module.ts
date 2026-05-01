import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuardsModule } from '../../../../common/guards/guards.module';
import { SessionEntity } from '@surucukursu/shared';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity]),
    JwtModule.register({
      secret: process.env.ENCRYPTION_KEY,
      signOptions: { expiresIn: '24h' },
    }),
    GuardsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class AdminDashboardModule {}
