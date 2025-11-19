export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum JobType {
  SINGLE_SIMULATION = 'single_simulation',
  SINGLE_DIREKSIYON_TAKIP = 'single_direksiyon_takip',
  GROUP_SIMULATION = 'group_simulation',
  GROUP_DIREKSIYON_TAKIP = 'group_direksiyon_takip'
}

export enum SimulationType {
  SESIM = 'sesim',
  ANA_GRUP = 'ana_grup'
}
