import React, { useState, useEffect, useRef } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download } from "lucide-react";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import { apiService } from "@/services/api-service";
import { toast } from "react-toastify";
import { socketService } from "@/services/socket-service";
import { MebbisCodeModal } from "@/components/Modals/MebbisCodeModal";
import { MebbisCredentialsModal } from "@/components/MebbisCredentialsModal";
import { useMebbisErrorHandler } from "@/hooks/useMebbisErrorHandler";

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
  const [syncing, setSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showEmptyDialog, setShowEmptyDialog] = useState<boolean>(false);
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);
  const [credentialsError, setCredentialsError] = useState<string>("");

  const lastFetchedSchoolId = useRef<number | null>(null);
  const { activeDrivingSchool, user, isLoading: contextLoading } = drivingSchoolOwnerContext();
  const { handleMebbisError } = useMebbisErrorHandler();

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
      
      // Show/hide empty dialog based on whether there are students
      if (!response || response.length === 0) {
        console.log("📭 No students found, showing empty dialog");
        setShowEmptyDialog(true);
      } else {
        console.log("📚 Students found, closing empty dialog");
        setShowEmptyDialog(false);
      }
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
        jobType: type === 'simulasyon' ? 'single_simulation' : 'single_direksiyon_takip',
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

      // Show initial message - display for 100ms
      toast.info('PDF oluşturuluyor...', { duration: 100 });

    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('PDF oluşturma başlatılamadı');
    }
  };

  const handleSync = async (): Promise<void> => {
    if (!activeDrivingSchool?.id) {
      setSyncMessage("Aktif sürücü kursu seçilmedi");
      return;
    }

    try {
      setSyncing(true);
      setSyncMessage("Senkronize ediliyor...");
      console.log("🔄 Syncing students for school:", activeDrivingSchool.id);
      
      const response = await apiService.drivingSchool.syncStudents(activeDrivingSchool.id.toString());
      console.log("✅ Sync response:", response);
      
      setSyncMessage("Senkronize başarılı! Öğrenciler güncelleniyor...");
      
      // Refresh students after sync
      await fetchStudents(activeDrivingSchool.id);
      
      setSyncMessage("✅ Senkronize başarıyla tamamlandı!");
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err) {
      const errorAction = handleMebbisError(err);
      setSyncMessage(null);

      if (errorAction.modalType === '2fa') {
        setShowCodeModal(true);
      } else if (errorAction.modalType === 'credentials') {
        setCredentialsError(errorAction.message);
        setShowCredentialsModal(true);
      } else {
        setSyncMessage(`❌ Hata: ${errorAction.message}`);
        setTimeout(() => setSyncMessage(null), 10000);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleCredentialsSaved = async (username: string, password: string): Promise<void> => {
    console.log("💾 Credentials saved, updating school...");
    
    try {
      // Update the school credentials via API
      await apiService.drivingSchool.updateMebbisCredentials(
        activeDrivingSchool?.id.toString() || "",
        username,
        password
      );

      console.log("✅ Credentials updated successfully");
      setShowCredentialsModal(false);
      setCredentialsError("");

      // Retry sync with updated credentials
      console.log("🔄 Retrying sync with updated credentials...");
      setSyncMessage("Güncellenmiş kimlik bilgileri ile senkronize ediliyor...");
      await handleSync();
    } catch (error) {
      console.error("❌ Error updating credentials:", error);
      
      // Extract the proper error message from AxiosError
      let errorMessage = "Kimlik doğrulama başarısız oldu";
      
      if ((error as any)?.response?.data?.message) {
        errorMessage = (error as any).response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.log("Final error message:", errorMessage);
      
      // Re-throw with the proper error message
      throw new Error(errorMessage);
    }
  };

  const handleCodeSubmitted = async (code: string): Promise<void> => {
    console.log("📝 Code submitted, retrying sync...");
    
    try {
      setShowCodeModal(false);
      setSyncMessage("AJANDA KODU ile senkronize ediliyor...");
      
      // Retry sync with AJANDA KODU
      if (!activeDrivingSchool?.id) {
        setSyncMessage("Aktif sürücü kursu seçilmedi");
        return;
      }

      const response = await apiService.drivingSchool.syncStudents(
        activeDrivingSchool.id.toString(),
        { ajandasKodu: code }
      );
      console.log("✅ Sync with AJANDA KODU successful:", response);
      
      setSyncMessage("✅ Senkronize başarıyla tamamlandı!");
      
      // Refresh students after sync
      await fetchStudents(activeDrivingSchool.id);
      
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (error) {
      console.error("❌ Error syncing with AJANDA KODU:", error);
      
      let errorMessage = "AJANDA KODU ile senkronize sırasında bir hata oluştu";
      
      if ((error as any)?.response?.data?.message) {
        errorMessage = (error as any).response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setSyncMessage(`❌ Hata: ${errorMessage}`);
      setTimeout(() => setSyncMessage(null), 10000);
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Öğrenci Raporları</h2>
        <Button 
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {syncing ? "Senkronize ediliyor..." : "Senkronize Et"}
        </Button>
      </div>

      {/* Sync message */}
      {syncMessage && (
        <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900 border border-blue-400 rounded text-sm text-blue-800 dark:text-blue-200">
          {syncMessage}
        </div>
      )}

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

      {/* Empty state dialog */}
      <AlertDialog open={showEmptyDialog} onOpenChange={setShowEmptyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kayıt Bulunamadı</AlertDialogTitle>
            <AlertDialogDescription>
              Hiç kayıt bulunamadı. Senkronize etmek ister misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hayır</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowEmptyDialog(false); handleSync(); }}>
              Evet, Senkronize Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MEBBIS Credentials Modal */}
      <MebbisCredentialsModal
        isOpen={showCredentialsModal}
        onClose={() => {
          setShowCredentialsModal(false);
          setCredentialsError("");
        }}
        errorMessage={credentialsError}
        onSubmit={handleCredentialsSaved}
      />

      {/* MEBBIS Code Modal */}
      <MebbisCodeModal
        isOpen={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        schoolCode={activeDrivingSchool?.id.toString() || ""}
        onSuccess={handleCodeSubmitted}
        onError={(error) => {
          setSyncMessage(`❌ Hata: ${error}`);
          setTimeout(() => setSyncMessage(null), 10000);
        }}
      />
    </div>
  );
};

export default StudentsTable;