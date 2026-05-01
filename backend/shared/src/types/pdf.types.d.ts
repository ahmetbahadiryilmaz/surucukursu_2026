export declare enum PdfGenerationMode {
    SINGLE = "single",
    GROUP = "group"
}
export interface PdfGenerationRequest {
    id: string;
    type: string;
    mode: PdfGenerationMode;
    userId: number;
    data: SinglePdfData | GroupPdfData;
    simulationType?: string;
    socketId?: string;
}
export interface SinglePdfData {
    drivingSchoolId: string;
    studentId: number;
    template: string;
    data: Record<string, any>;
}
export interface GroupPdfData {
    drivingSchoolId: string;
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
