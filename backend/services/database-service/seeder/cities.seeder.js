"use strict";
/**
 * Cities and Districts Seeder
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitiesSeeder = void 0;
const typeorm_seeding_1 = require("@jorgebodega/typeorm-seeding");
const shared_1 = require("@surucukursu/shared");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class CitiesSeeder extends typeorm_seeding_1.Seeder {
    async run(dataSource) {
        console.log('🌍 Seeding cities and districts...');
        const cityRepository = dataSource.getRepository(shared_1.CityEntity);
        const districtRepository = dataSource.getRepository(shared_1.DistrictEntity);
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
                    .into(shared_1.CityEntity)
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
                    .into(shared_1.DistrictEntity)
                    .values(districtsData)
                    .execute();
                console.log(`✅ Successfully created ${citiesData.length} cities and ${districtsData.length} districts from JSON file`);
                return;
            }
            else {
                console.log('⚠️ Failed to load JSON data, creating sample data...');
            }
            // Fallback to sample data
            // Skip clearing since tables are already fresh from migration
            // await districtRepository.clear();
            // await cityRepository.clear();
            await this.createSampleCitiesAndDistricts(cityRepository, districtRepository);
            console.log('✅ Created sample cities and districts');
        }
        catch (error) {
            console.log('⚠️ Skipping cities and districts:', error.message);
        }
    }
    async loadCitiesData() {
        try {
            const filePath = path.join(__dirname, 'citiesDistricts.json');
            const fileContent = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(fileContent);
        }
        catch (error) {
            console.log('⚠️ Could not load local cities data:', error.message);
            return null;
        }
    }
    async createSampleCitiesAndDistricts(cityRepository, districtRepository) {
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
            .into(shared_1.CityEntity)
            .values(sampleCities)
            .execute();
        await districtRepository
            .createQueryBuilder()
            .insert()
            .into(shared_1.DistrictEntity)
            .values(sampleDistricts)
            .execute();
    }
}
exports.CitiesSeeder = CitiesSeeder;
