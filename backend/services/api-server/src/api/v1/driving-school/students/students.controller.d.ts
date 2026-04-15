import { StudentsService } from './students.service';
export declare class StudentsController {
    private readonly studentsService;
    constructor(studentsService: StudentsService);
    getStudents(code: string): Promise<import("@surucukursu/shared").DrivingSchoolStudentEntity[]>;
    syncStudents(code: string, body?: {
        ajandasKodu?: string;
    }): Promise<{
        success: boolean;
        message: string;
        syncedCount: number;
    }>;
}
