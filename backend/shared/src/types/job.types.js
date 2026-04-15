"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncCarsStage = exports.SimulationType = exports.JobType = exports.JobStatus = void 0;
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["PROCESSING"] = "processing";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var JobType;
(function (JobType) {
    JobType["SINGLE_SIMULATION"] = "single_simulation";
    JobType["SINGLE_DIREKSIYON_TAKIP"] = "single_direksiyon_takip";
    JobType["GROUP_SIMULATION"] = "group_simulation";
    JobType["GROUP_DIREKSIYON_TAKIP"] = "group_direksiyon_takip";
    JobType["SYNC_CARS"] = "sync_cars";
})(JobType || (exports.JobType = JobType = {}));
var SimulationType;
(function (SimulationType) {
    SimulationType["SESIM"] = "sesim";
    SimulationType["ANA_GRUP"] = "ana_grup";
})(SimulationType || (exports.SimulationType = SimulationType = {}));
var SyncCarsStage;
(function (SyncCarsStage) {
    SyncCarsStage["WAITING"] = "waiting";
    SyncCarsStage["AUTHENTICATING"] = "authenticating";
    SyncCarsStage["CONNECTING"] = "connecting";
    SyncCarsStage["DOWNLOADING_VEHICLES"] = "downloading_vehicles";
    SyncCarsStage["DOWNLOADING_SIMULATORS"] = "downloading_simulators";
    SyncCarsStage["PROCESSING"] = "processing";
    SyncCarsStage["SAVING"] = "saving";
    SyncCarsStage["COMPLETED"] = "completed";
})(SyncCarsStage || (exports.SyncCarsStage = SyncCarsStage = {}));
