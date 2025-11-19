import { Controller, Post, Body } from '@nestjs/common';

@Controller('api/test')
export class TestController {
  @Post('socket')
  async socket(@Body() body: { tbMebbisId: number }) {
    const { tbMebbisId } = body;
    // Note: Socket.io integration would need to be implemented
    // For now, just return the tbMebbisId
    return tbMebbisId;
  }
}
