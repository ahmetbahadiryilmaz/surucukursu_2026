import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

interface FetchVehiclesResponse {
  session: {
    id: string;
    name: string;
    userId: string;
  };
  vehicles: any[];
  simulators: any[];
}

@Injectable()
export class MebbisClientService {
  private readonly logger = new Logger(MebbisClientService.name);
  private readonly httpClient: AxiosInstance;
  private readonly MEBBIS_SERVICE_URL = process.env.MEBBIS_SERVICE_URL || 'http://localhost:3003';

  constructor() {
    this.httpClient = axios.create({
      baseURL: this.MEBBIS_SERVICE_URL,
      timeout: 30000,
    });
  }

  async fetchVehiclesAndSimulators(
    mebbisUsername: string,
    mebbisPassword: string,
  ): Promise<FetchVehiclesResponse> {
    try {
      this.logger.log(`📡 Fetching vehicles and simulators from MEBBIS service...`);

      const response = await this.httpClient.post<FetchVehiclesResponse>(
        '/api/mebbis/vehicles/fetch',
        {
          username: mebbisUsername,
          password: mebbisPassword,
        },
      );

      this.logger.log(
        `✅ Successfully fetched ${response.data.vehicles.length} vehicles and ${response.data.simulators.length} simulators`,
      );

      return response.data;
    } catch (error) {
      this.logger.error('❌ Failed to fetch vehicles from MEBBIS service:', error);
      throw new Error(
        `Failed to fetch vehicles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
