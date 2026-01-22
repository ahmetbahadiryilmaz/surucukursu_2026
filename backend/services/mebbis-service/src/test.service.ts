import { Injectable } from '@nestjs/common';

@Injectable()
export class TestService {
  testSocket(tbMebbisId: number) {
    // Note: Socket.io integration would need to be implemented
    // For now, just return the tbMebbisId
    return tbMebbisId;
  }
}
