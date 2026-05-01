"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitiesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../shared/src");
let CitiesService = class CitiesService {
    constructor(cityRepository, districtRepository) {
        this.cityRepository = cityRepository;
        this.districtRepository = districtRepository;
    }
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
    async findById(id, includeDistricts = false) {
        const city = await this.cityRepository.findOne({
            where: { id },
            relations: includeDistricts ? ['districts'] : [],
        });
        if (!city) {
            throw new common_1.NotFoundException(`City with ID ${id} not found`);
        }
        if (includeDistricts && city.districts) {
            city.districts.sort((a, b) => a.name.localeCompare(b.name));
        }
        return city;
    }
    async findDistrictsByCity(cityId) {
        const city = await this.cityRepository.findOne({
            where: { id: cityId }
        });
        if (!city) {
            throw new common_1.NotFoundException(`City with ID ${cityId} not found`);
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
    async searchCities(query) {
        return this.cityRepository
            .createQueryBuilder('city')
            .where('city.name LIKE :query', { query: `%${query}%` })
            .orderBy('city.name', 'ASC')
            .getMany();
    }
    async searchDistricts(query, cityId) {
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
};
exports.CitiesService = CitiesService;
exports.CitiesService = CitiesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.CityEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(shared_1.DistrictEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CitiesService);
//# sourceMappingURL=cities.service.js.map