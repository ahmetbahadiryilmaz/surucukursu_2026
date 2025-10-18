import { All, Controller, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller()
export class AppController {
  constructor(private readonly httpService: HttpService) {}

  @All('*')
  async proxy(@Req() req: any, @Res() res: any) {
    const baseUrl = process.env.MEBBIS_BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}${req.url}`;
    const method = req.method;
    const headers = { ...req.headers };
    delete headers.host; // Remove host header

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          headers,
          data: req.body,
          params: req.query,
        })
      );
      res.status(response.status).send(response.data);
    } catch (error: any) {
      if (error.response) {
        res.status(error.response.status).send(error.response.data);
      } else {
        res.status(500).send({ error: 'Proxy error' });
      }
    }
  }
}
