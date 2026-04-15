import { CitiesService } from './cities.service';
export declare class CitiesController {
    private readonly citiesService;
    constructor(citiesService: CitiesService);
    getAllCities(includeDistricts?: boolean): Promise<import("@surucukursu/shared").CityEntity[]>;
    getCityById(id: string, includeDistricts?: boolean): Promise<import("@surucukursu/shared").CityEntity>;
    getAllDistricts(): Promise<import("@surucukursu/shared").DistrictEntity[]>;
    getDistrictsByCity(id: string): Promise<import("@surucukursu/shared").DistrictEntity[]>;
}
