import { Module } from '@nestjs/common';
import { DesktopCodeController } from './desktop-code.controller';

@Module({
  controllers: [DesktopCodeController],
})
export class DesktopCodeModule {}
