import { Module } from '@nestjs/common';
import { DesktopUpdateController } from './desktop-update.controller';
import { DesktopUpdateService } from './desktop-update.service';

@Module({
  controllers: [DesktopUpdateController],
  providers: [DesktopUpdateService],
})
export class DesktopUpdateModule {}
