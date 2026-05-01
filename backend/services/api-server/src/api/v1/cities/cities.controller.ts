import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CitiesService } from './cities.service';

@ApiTags('Cities')
@Controller('api/v1/cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cities' })
  @ApiResponse({ status: 200, description: 'Returns all Turkish cities' })
  @ApiQuery({ name: 'includeDistricts', required: false, type: Boolean, description: 'Include districts in response' })
  async getAllCities(@Query('includeDistricts') includeDistricts?: boolean) {
    return this.citiesService.findAll(includeDistricts);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get city by ID' })
  @ApiResponse({ status: 200, description: 'Returns city details' })
  @ApiResponse({ status: 404, description: 'City not found' })
  @ApiParam({ name: 'id', type: 'number', description: 'City ID' })
  @ApiQuery({ name: 'includeDistricts', required: false, type: Boolean, description: 'Include districts in response' })
  async getCityById(
    @Param('id') id: string,
    @Query('includeDistricts') includeDistricts?: boolean
  ) {
    return this.citiesService.findById(+id, includeDistricts);
  }

  @Get('districts')
  @ApiOperation({ summary: 'Get all districts' })
  @ApiResponse({ status: 200, description: 'Returns all districts' })
  async getAllDistricts() {
    return this.citiesService.findAllDistricts();
  }

  @Get(':id/districts')
  @ApiOperation({ summary: 'Get districts for a specific city' })
  @ApiResponse({ status: 200, description: 'Returns districts for the city' })
  @ApiResponse({ status: 404, description: 'City not found' })
  @ApiParam({ name: 'id', type: 'number', description: 'City ID' })
  async getDistrictsByCity(@Param('id') id: string) {
    return this.citiesService.findDistrictsByCity(+id);
  }
}
