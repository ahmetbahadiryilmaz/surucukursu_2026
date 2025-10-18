import React, { useState, useEffect, useRef } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import { apiService } from "@/services/api-service";
import { toast } from "react-toastify";
import { socketService } from "@/services/socket-service";

// Download için interface
interface CompletedDownload {
  id: number | string;
  studentId: number;
  type: string;
  filename: string;
  date: string;
}

interface OngoingJob {
  jobId: string;
  studentId: number;
  type: string;
  progress: number;
  message: string;
  startTime: Date;
}

interface Student {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface StudentsProps {
  onDownload?: (download: CompletedDownload) => void;
  onJobStart?: (job: OngoingJob) => void;
}

const StudentsTable: React.FC<StudentsProps> = ({ onDownload, onJobStart }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const lastFetchedSchoolId = useRef<number | null>(null);
  const { activeDrivingSchool, user, isLoading: contextLoading } = drivingSchoolOwnerContext();

  // Socket connection and hello message handling
  // const { isConnected, helloMessage } = useSocketContext();

  // Effect to fetch students when component mounts or active school changes
  useEffect(() => {
    // Wait for context to finish loading
    if (contextLoading) {
      return;
    }

    // Connect to socket if not connected
    if (!socketService.isConnected()) {
      socketService.connect().catch(error => {
        console.error('Failed to connect to socket:', error);
      });
    }

    // Use active driving school ID if available, otherwise fallback to first school
    let schoolId: number | null = null;
    
    if (activeDrivingSchool?.id) {
      schoolId = activeDrivingSchool.id;
    } else if (user?.drivingSchools && user.drivingSchools.length > 0) {
      schoolId = user.drivingSchools[0].id;
    }

    // Only fetch if we have a school ID and haven't fetched for this school yet
    if (schoolId && lastFetchedSchoolId.current !== schoolId) {
      fetchStudents(schoolId);
      lastFetchedSchoolId.current = schoolId; // Update the ref to prevent duplicate fetches
    } else if (!schoolId) {
      setError("Sürücü okulu bulunamadı.");
      setLoading(false);
    }
  }, [activeDrivingSchool?.id, user?.drivingSchools, contextLoading]); // Only depend on the actual data that matters

  const fetchStudents = async (schoolId: number) => {
    setError(null); // Reset error before fetching
    try {
      const response = await apiService.drivingSchool.getStudents(schoolId.toString());

      setStudents(response);
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setLoading(false);
      console.error("Öğrenciler getirilirken hata oluştu:", err);
    }
  };

  const handleRaporIndir = async (student: Student, type: string) => {
    try {
      // Get the driving school code
      let schoolCode: string | null = null;
      
      if (activeDrivingSchool?.id) {
        schoolCode = activeDrivingSchool.id.toString();
      } else if (user?.drivingSchools && user.drivingSchools.length > 0) {
        schoolCode = user.drivingSchools[0].id.toString();
      }

      if (!schoolCode) {
        toast.error('Sürücü okulu bilgisi bulunamadı');
        return;
      }

      // Generate random data for the PDF
      const randomData = {
        studentName: student.name,
        tcNumber: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        phone: student.phone,
        email: student.email,
        courseDate: new Date().toLocaleDateString('tr-TR'),
        certificateNumber: `CERT-${Date.now()}`,
        generatedDate: new Date().toLocaleDateString('tr-TR')
      };

      // Call PDF generation API with school code
      const response = await apiService.pdf.generateSingle(schoolCode, {
        studentId: student.id,
        template: 'certificate',
        data: randomData
      });

      const jobId = response.jobId;

      // Add job to ongoing jobs
      const newJob: OngoingJob = {
        jobId,
        studentId: student.id,
        type,
        progress: 0,
        message: 'Başlatılıyor...',
        startTime: new Date()
      };
      onJobStart?.(newJob);

      // Listen for completion events only (progress is handled by Layout)
      const handleCompleted = (event: any) => {
        const data = event.detail;
        if (data.jobId === jobId) {
          console.log('PDF completed');

          // Download the PDF
          const pdfData = atob(data.result.pdfData);
          const blob = new Blob([pdfData], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = data.result.fileName || `certificate_${jobId}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Show success toast
          toast.success('PDF başarıyla indirildi!');

          // Add to downloaded files
          const downloadInfo: CompletedDownload = {
            id: Date.now(),
            studentId: student.id,
            type,
            filename: data.result.fileName || `certificate_${jobId}.pdf`,
            date: new Date().toLocaleTimeString(),
          };
          onDownload?.(downloadInfo);

          // Clean up event listeners
          window.removeEventListener('pdf-completed', handleCompleted);
          window.removeEventListener('pdf-error', handleError);
        }
      };

      const handleError = (event: any) => {
        const data = event.detail;
        if (data.jobId === jobId) {
          toast.error(`PDF oluşturma hatası: ${data.error}`);
          console.error('PDF Error:', data.error);

          // Clean up event listeners
          window.removeEventListener('pdf-completed', handleCompleted);
          window.removeEventListener('pdf-error', handleError);
        }
      };

      // Add event listeners for completion only
      window.addEventListener('pdf-completed', handleCompleted);
      window.addEventListener('pdf-error', handleError);

      // Show initial message
      toast.info('PDF oluşturuluyor...');

    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('PDF oluşturma başlatılamadı');
    }
  };

  if (contextLoading || loading) {
    return <div>Yükleniyor...</div>;
  }

  if (error) {
    return <div>Hata: {error}</div>;
  }

  return (
    <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-black relative">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Öğrenci Raporları</h2>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Ad Soyad</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Raporlar</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length > 0 ? (
            students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>{student.name}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell>{student.phone}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs px-2 py-1 flex items-center gap-1"
                      onClick={() => handleRaporIndir(student, "simulasyon")}
                    >
                      <Download size={14} />
                      Simulasyon
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs px-2 py-1 flex items-center gap-1"
                      onClick={() => handleRaporIndir(student, "direksiyon")}
                    >
                      <Download size={14} />
                      Direksiyon Takip
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center">
                Veri bulunamadı.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default StudentsTable;