export enum PdfGenerationMode {
  SINGLE = 'single',
  GROUP = 'group'
}

export interface PdfGenerationRequest {
  id: string;
  mode: PdfGenerationMode;
  userId: number;
  data: SinglePdfData | GroupPdfData;
  socketId?: string; // For progress updates
}

export interface SinglePdfData {
  studentId: number;
  template: string;
  data: Record<string, any>;
}

export interface GroupPdfData {
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