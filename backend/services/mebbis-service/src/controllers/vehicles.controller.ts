import { Controller, Post, Body, Logger } from '@nestjs/common';
import { VehiclesSimulatorsService } from '../mebbis/vehicles-simulators.service';

interface FetchVehiclesRequest {
  cookieString: string;
  initialPageBody: string;
  session: {
    tbmebbis_id: string;
    adi: string;
    tbmebbisadi: string;
  };
}

@Controller('api/mebbis/vehicles')
export class VehiclesController {
  private readonly logger = new Logger(VehiclesController.name);

  constructor(private readonly vehiclesService: VehiclesSimulatorsService) {}

  @Post('fetch')
  async fetchVehiclesAndSimulators(@Body() body: FetchVehiclesRequest) {
    this.logger.log('📡 Received request to fetch vehicles and simulators');
    try {
      const result = await this.vehiclesService.fetchVehiclesAndSimulators(
        body.cookieString,
        body.initialPageBody,
        body.session,
      );
      this.logger.log('✅ Vehicles and simulators fetched successfully');
      return result;
    } catch (error) {
      this.logger.error('❌ Error fetching vehicles:', error);
      throw error;
    }
  }
}
