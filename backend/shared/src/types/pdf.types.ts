export enum PdfGenerationMode {
  SINGLE = 'single',
  GROUP = 'group'
}

export interface PdfGenerationRequest {
  id: string;
  type: string; // Job type: pdf_generation, single_simulation, etc.
  mode: PdfGenerationMode;
  userId: number;
  data: SinglePdfData | GroupPdfData;
  simulationType?: string; // For simulation jobs: 'sesim' or 'ana_grup'
  socketId?: string; // For progress updates
}

export interface SinglePdfData {
  drivingSchoolId: string; // Driving school ID for folder naming (DS[id])
  studentId: number;
  template: string;
  data: Record<string, any>;
}

export interface GroupPdfData {
  drivingSchoolId: string; // Driving school ID for folder naming (DS[id])
  studentIds: number[];
  template: string;
  data: Record<string, any>[];
}

export interface PdfGenerationResult {
  success: boolean;
  fileUrl?: string;
  error?: string;
  fileName?: string;
  fileSize?: number;
}

export interface ProgressUpdate {
  jobId: string;
  progress: number;
  message: string;
  currentStep?: string;
  totalSteps?: number;
  currentStepIndex?: number;
}