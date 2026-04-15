import { Repository } from 'typeorm';
import { CityEntity, DistrictEntity } from '@surucukursu/shared';
export declare class CitiesService {
    private readonly cityRepository;
    private readonly districtRepository;
    constructor(cityRepository: Repository<CityEntity>, districtRepository: Repository<DistrictEntity>);
    findAll(includeDistricts?: boolean): Promise<CityEntity[]>;
    findById(id: number, includeDistricts?: boolean): Promise<CityEntity>;
    findDistrictsByCity(cityId: number): Promise<DistrictEntity[]>;
    findAllDistricts(): Promise<DistrictEntity[]>;
    searchCities(query: string): Promise<CityEntity[]>;
    searchDistricts(query: string, cityId?: number): Promise<DistrictEntity[]>;
}
