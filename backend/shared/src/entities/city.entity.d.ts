import { BaseEntity } from './base.entity';
import { DistrictEntity } from './district.entity';
export declare class CityEntity extends BaseEntity {
    name: string;
    districts: DistrictEntity[];
}
