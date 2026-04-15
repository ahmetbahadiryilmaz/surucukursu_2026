export declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    phone: string;
}
export declare class CreateSubscriptionDto {
    type: string;
    ends_at?: string;
    pdf_print_limit?: number;
}
export declare class CreateDrivingSchoolDto {
    name: string;
    address: string;
    phone: string;
    owner_id: number;
    manager_id: number;
    city_id?: number;
    district_id?: number;
    subscription?: CreateSubscriptionDto;
}
export declare class UpdateDrivingSchoolDto {
    name: string;
    address: string;
    phone: string;
    owner_id: number;
    manager_id: number;
    city_id?: number;
    district_id?: number;
    subscription?: CreateSubscriptionDto;
}
