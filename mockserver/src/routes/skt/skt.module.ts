import { Module } from '@nestjs/common';
import { SktController } from './skt.controller';
import { SktService } from './skt.service';

@Module({
  controllers: [SktController],
  providers: [SktService],
  exports: [SktService]
})
export class SktModule { }
