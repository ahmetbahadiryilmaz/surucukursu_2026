import { Module } from '@nestjs/common';
import { mebbisYdIndexController } from './mebbisYdIndex.controller';
import { mebbisYdIndexService } from './mebbisYdIndex.service';

@Module({
  controllers: [mebbisYdIndexController],
  providers: [mebbisYdIndexService],
  exports: [mebbisYdIndexService]
})
export class MebbisYdIndexModule {}