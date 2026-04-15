import { Controller, Post, Body } from '@nestjs/common';
import { TestService } from '../test.service';

@Controller('api/test')
export class TestController {
  constructor(private testService: TestService) {}

  @Post('socket')
  async socket(@Body() body: { tbMebbisId: number }) {
    const { tbMebbisId } = body;
    return this.testService.testSocket(tbMebbisId);
  }
}
