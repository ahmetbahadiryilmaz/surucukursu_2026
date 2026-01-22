import { Injectable } from '@nestjs/common';

declare const global: any;

@Injectable()
export class ResponseService {
  getResponse(id: string): string {
    const response = global.responseStore && global.responseStore[id];
    if (response) {
      return response.html;
    } else {
      return '<h1>Response not found</h1>';
    }
  }
}
