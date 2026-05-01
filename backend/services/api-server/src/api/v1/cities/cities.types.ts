export interface City {
  id: number;
  name: string;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  districts?: District[];
}

export interface District {
  id: number;
  name: string;
  city_id: number;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  city?: City;
}

export interface CityWithDistricts extends City {
  districts: District[];
}

export interface DistrictWithCity extends Omit<District, 'city'> {
  city: Pick<City, 'id' | 'name'>;
}
