export declare abstract class BaseEntity {
    id: number;
    created_at: number;
    updated_at: number;
    deleted_at?: number | null;
    setCreatedAt(): void;
    setUpdatedAt(): void;
}
