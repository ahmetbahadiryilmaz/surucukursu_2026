import { DataSourceOptions } from 'typeorm';
export declare const baseDatabaseConfig: Partial<DataSourceOptions>;
export declare const getApiServerDatabaseConfig: () => DataSourceOptions;
export declare const getDatabaseServiceConfig: (entities: any[], migrations: string[]) => DataSourceOptions;
export declare const getDevelopmentConfig: () => Partial<DataSourceOptions>;
export declare const getProductionConfig: () => Partial<DataSourceOptions>;
export declare function getDatabaseConfig(options?: {
    autoLoadEntities?: boolean;
    entities?: any[];
    migrations?: string[];
    customConfig?: Partial<DataSourceOptions>;
}): DataSourceOptions;
