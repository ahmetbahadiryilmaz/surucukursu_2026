import { Controller, Get, Param } from '@nestjs/common';

declare const global: any;

@Controller('response')
export class ResponseController {
  @Get(':id')
  getResponse(@Param('id') id: string) {
    const response = global.responseStore && global.responseStore[id];
    if (response) {
      return response.html;
    } else {
      return '<h1>Response not found</h1>';
    }
  }
}
