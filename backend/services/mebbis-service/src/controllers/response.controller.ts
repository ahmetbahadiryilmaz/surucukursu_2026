import { Controller, Get, Param } from '@nestjs/common';
import { ResponseService } from '../response.service';

@Controller('response')
export class ResponseController {
  constructor(private responseService: ResponseService) {}

  @Get(':id')
  getResponse(@Param('id') id: string) {
    return this.responseService.getResponse(id);
  }
}
