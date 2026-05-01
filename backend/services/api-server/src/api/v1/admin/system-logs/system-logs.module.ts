import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemLogsController } from './system-logs.controller';
import { SystemLogsService } from './system-logs.service';
import { JwtModule } from '@nestjs/jwt';
import { SystemLogsEntity, SessionEntity } from '@surucukursu/shared';
import { GuardsModule } from '../../../../common/guards/guards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SystemLogsEntity, SessionEntity]),
    JwtModule.register({
      secret: process.env.ENCRYPTION_KEY,
      signOptions: { expiresIn: '24h' },
    }),
    GuardsModule,
  ],
  controllers: [SystemLogsController],
  providers: [SystemLogsService]
})
export class SystemLogsModule {}