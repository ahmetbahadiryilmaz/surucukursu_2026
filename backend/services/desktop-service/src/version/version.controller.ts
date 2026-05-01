import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

// Single current version — this is the only version allowed (forceful update).
// Update CURRENT_VERSION each release and it becomes both the latest and minimum.
const CURRENT_VERSION = '1.2.1';

@ApiTags('Desktop Version')
@Controller('version')
export class VersionController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get current desktop app version (forceful — only this version is allowed)' })
  @ApiResponse({ status: 200, description: 'Version info returned' })
  getVersion() {
    return {
      version: CURRENT_VERSION,
      minimumVersion: CURRENT_VERSION,
      whatsNew: 'Windows 7 ve 8 desteği eklendi',
      message: 'Bu sürüm artık desteklenmiyor. Uygulamayı kullanabilmek için güncelleme yapmanız gerekmektedir.',
    };
  }
}
