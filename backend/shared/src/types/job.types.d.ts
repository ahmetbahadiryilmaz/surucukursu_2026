export declare enum JobStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare enum JobType {
    SINGLE_SIMULATION = "single_simulation",
    SINGLE_DIREKSIYON_TAKIP = "single_direksiyon_takip",
    GROUP_SIMULATION = "group_simulation",
    GROUP_DIREKSIYON_TAKIP = "group_direksiyon_takip",
    SYNC_CARS = "sync_cars"
}
export declare enum SimulationType {
    SESIM = "sesim",
    ANA_GRUP = "ana_grup"
}
export declare enum SyncCarsStage {
    WAITING = "waiting",
    AUTHENTICATING = "authenticating",
    CONNECTING = "connecting",
    DOWNLOADING_VEHICLES = "downloading_vehicles",
    DOWNLOADING_SIMULATORS = "downloading_simulators",
    PROCESSING = "processing",
    SAVING = "saving",
    COMPLETED = "completed"
}
