import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

const MIN_VERSION_URL = 'https://mtsk.app/desktop-updates/minimum_version.json';
const DOWNLOAD_BASE = 'https://mtsk.app/desktop-updates';
const FALLBACK_VERSION = '1.2.3';
const CACHE_TTL_MS = 60_000; // 1 minute

let cache: { data: any; expiresAt: number } | null = null;

async function fetchMinimumVersion(): Promise<any> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.data;
  }
  try {
    const res = await fetch(MIN_VERSION_URL, { cache: 'no-store' as RequestCache });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
    return data;
  } catch {
    return null;
  }
}

@ApiTags('Desktop Version')
@Controller('version')
export class VersionController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Get current desktop app version (read from minimum_version.json on update server)' })
  @ApiResponse({ status: 200, description: 'Version info returned' })
  async getVersion() {
    const data = await fetchMinimumVersion();
    const version = data?.minimumVersion || FALLBACK_VERSION;
    return {
      version,
      minimumVersion: version,
      downloadUrl: `${DOWNLOAD_BASE}/MTSK_APP%20Setup%20${version}.exe`,
      whatsNew: data?.whatsNew || '',
      message: data?.message || 'Bu sürüm artık desteklenmiyor. Uygulamayı kullanabilmek için güncelleme yapmanız gerekmektedir.',
    };
  }
}
