import { Controller, Get, Param, Header } from '@nestjs/common';
import { ResponseService } from '../response.service';

@Controller('response')
export class ResponseController {
  constructor(private responseService: ResponseService) {}

  @Get(':id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getResponse(@Param('id') id: string) {
    return this.responseService.getResponse(id);
  }
}
