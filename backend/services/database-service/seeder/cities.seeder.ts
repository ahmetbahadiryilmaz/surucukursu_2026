/**
 * Cities and Districts Seeder
 */

import { Seeder } from '@jorgebodega/typeorm-seeding';
import { DataSource } from 'typeorm';
import { CityEntity, DistrictEntity } from '@surucukursu/shared';
import * as fs from 'fs';
import * as path from 'path';

export class CitiesSeeder extends Seeder {
  async run(dataSource: DataSource): Promise<void> {
    console.log('🌍 Seeding cities and districts...');

    const cityRepository = dataSource.getRepository(CityEntity);
    const districtRepository = dataSource.getRepository(DistrictEntity);

    try {
      const turkeyData = await this.loadCitiesData();

      if (turkeyData && turkeyData.cities && turkeyData.districts) {
        console.log('📦 Using cities and districts from JSON file...');

        // Prepare cities data
        const citiesData = [];
        const validCityIds = new Set();

        for (const city of turkeyData.cities) {
          if (city && city.Id && city.name) {
            const cityId = parseInt(city.Id);
            const cityName = city.name.toString().trim();

            if (cityId && cityName) {
              citiesData.push({ id: cityId, name: cityName });
              validCityIds.add(cityId);
            }
          }
        }

        // Bulk insert cities
        console.log(`🏙️ Inserting ${citiesData.length} cities in batch...`);
        await cityRepository
          .createQueryBuilder()
          .insert()
          .into(CityEntity)
          .values(citiesData)
          .execute();

        // Prepare districts data
        const districtsData = [];
        let districtId = 1;

        for (const district of turkeyData.districts) {
          if (district && district.name && district.cityId) {
            const districtName = district.name.toString().trim();
            const cityId = parseInt(district.cityId);

            if (districtName && cityId && validCityIds.has(cityId)) {
              districtsData.push({
                id: districtId++,
                name: districtName,
                city_id: cityId
              });
            }
          }
        }

        // Bulk insert districts
        console.log(`🏘️ Inserting ${districtsData.length} districts in batch...`);
        await districtRepository
          .createQueryBuilder()
          .insert()
          .into(DistrictEntity)
          .values(districtsData)
          .execute();

        console.log(`✅ Successfully created ${citiesData.length} cities and ${districtsData.length} districts from JSON file`);
        return;
      } else {
        console.log('⚠️ Failed to load JSON data, creating sample data...');
      }

      // Fallback to sample data
      // Skip clearing since tables are already fresh from migration
      // await districtRepository.clear();
      // await cityRepository.clear();
      await this.createSampleCitiesAndDistricts(cityRepository, districtRepository);
      console.log('✅ Created sample cities and districts');

    } catch (error) {
      console.log('⚠️ Skipping cities and districts:', (error as Error).message);
    }
  }

  private async loadCitiesData(): Promise<any> {
    try {
      const filePath = path.join(__dirname, 'citiesDistricts.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.log('⚠️ Could not load local cities data:', (error as Error).message);
      return null;
    }
  }

  private async createSampleCitiesAndDistricts(cityRepository: any, districtRepository: any) {
    const sampleCities = [
      { id: 1, name: 'İstanbul' },
      { id: 6, name: 'Ankara' },
      { id: 35, name: 'İzmir' },
      { id: 7, name: 'Antalya' },
      { id: 16, name: 'Bursa' }
    ];

    const sampleDistricts = [
      { id: 1, name: 'Kadıköy', city_id: 1 },
      { id: 2, name: 'Beşiktaş', city_id: 1 },
      { id: 3, name: 'Çankaya', city_id: 6 },
      { id: 4, name: 'Keçiören', city_id: 6 },
      { id: 5, name: 'Konak', city_id: 35 }
    ];

    await cityRepository
      .createQueryBuilder()
      .insert()
      .into(CityEntity)
      .values(sampleCities)
      .execute();

    await districtRepository
      .createQueryBuilder()
      .insert()
      .into(DistrictEntity)
      .values(sampleDistricts)
      .execute();
  }
}