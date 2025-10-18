import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CityEntity, DistrictEntity } from '@surucukursu/shared';

@Injectable()
export class CitiesService {
  constructor(
    @InjectRepository(CityEntity)
    private readonly cityRepository: Repository<CityEntity>,
    @InjectRepository(DistrictEntity)
    private readonly districtRepository: Repository<DistrictEntity>,
  ) {}

  async findAll(includeDistricts = false) {
    if (includeDistricts) {
      return this.cityRepository.find({
        relations: ['districts'],
        order: { name: 'ASC' }
      });
    }
    return this.cityRepository.find({
      order: { name: 'ASC' }
    });
  }

  async findById(id: number, includeDistricts = false) {
    const city = await this.cityRepository.findOne({
      where: { id },
      relations: includeDistricts ? ['districts'] : [],
    });

    if (!city) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }

    if (includeDistricts && city.districts) {
      // Sort districts by name if included
      city.districts.sort((a, b) => a.name.localeCompare(b.name));
    }

    return city;
  }

  async findDistrictsByCity(cityId: number) {
    // First check if city exists
    const city = await this.cityRepository.findOne({
      where: { id: cityId }
    });

    if (!city) {
      throw new NotFoundException(`City with ID ${cityId} not found`);
    }

    return this.districtRepository.find({
      where: { city_id: cityId },
      relations: ['city'],
      order: { name: 'ASC' }
    });
  }

  async findAllDistricts() {
    return this.districtRepository.find({
      relations: ['city'],
      order: { name: 'ASC' }
    });
  }

  async searchCities(query: string) {
    return this.cityRepository
      .createQueryBuilder('city')
      .where('city.name LIKE :query', { query: `%${query}%` })
      .orderBy('city.name', 'ASC')
      .getMany();
  }

  async searchDistricts(query: string, cityId?: number) {
    const queryBuilder = this.districtRepository
      .createQueryBuilder('district')
      .leftJoinAndSelect('district.city', 'city')
      .where('district.name LIKE :query', { query: `%${query}%` })
      .orderBy('district.name', 'ASC');

    if (cityId) {
      queryBuilder.andWhere('district.city_id = :cityId', { cityId });
    }

    return queryBuilder.getMany();
  }
}
