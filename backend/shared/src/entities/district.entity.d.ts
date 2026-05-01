import { BaseEntity } from './base.entity';
import { CityEntity } from './city.entity';
export declare class DistrictEntity extends BaseEntity {
    name: string;
    city_id: number;
    city: CityEntity;
}
