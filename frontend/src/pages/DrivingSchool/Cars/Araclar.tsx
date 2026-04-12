import { useState, useEffect, useCallback } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import { apiService } from "@/services/api-service";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import { MebbisCodeModal } from "@/components/Modals/MebbisCodeModal";
import { MebbisCredentialsModal } from "@/components/MebbisCredentialsModal";
import { useMebbisErrorHandler } from "@/hooks/useMebbisErrorHandler";

/**
 * Araç bilgisi arayüzü
 */
interface Arac {
  id: number;
  model: string;
  brand: string;
  plate_number: string;
  year: number;
  school_id: number;
  car_type: string;
  status: string;
  purchase_date: string | null;
  last_inspection_date: string | null;
  inspection_validity_date: string | null;
  driver_count: number | null;
  lesson_count: number | null;
  excuse_days: number | null;
  serial_number: string | null;
  start_date: string | null;
  last_maintenance_date: string | null;
  usage_hours: number | null;
  license_validity_date: string | null;
  created_at: number;
  updated_at: number;
}

const AraclarTable = (): JSX.Element => {
  const [araclar, setAraclar] = useState<Arac[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);
  const [showEmptyDialog, setShowEmptyDialog] = useState<boolean>(false);
  const [selectedArac, setSelectedArac] = useState<Arac | null>(null);
  const [credentialsError, setCredentialsError] = useState<string>("");

  const { activeDrivingSchool } = drivingSchoolOwnerContext();
  const { handleMebbisError } = useMebbisErrorHandler();

  // Debug: log modal state changes
  useEffect(() => {
    console.log("📋 Modal state changed - showCodeModal:", showCodeModal);
  }, [showCodeModal]);

  const fetchAraclar = useCallback(async (schoolId: string): Promise<void> => {
    console.log("🔍 fetchAraclar called with schoolId:", schoolId);
    
    if (!schoolId) {
      console.log("❌ No schoolId provided, returning early");
      setLoading(false);
      return;
    }
    
    try {
      console.log("📡 Making API call to get cars...");
      setLoading(true);
      const response = await apiService.drivingSchool.getCars(schoolId);
      console.log("📦 Raw API response:", response);
      console.log("📦 Response data:", response?.data);
      console.log("📦 Response data type:", typeof response?.data);
      console.log("📦 Is response.data an array?", Array.isArray(response?.data));
      
      // Try different ways to access the data
      let carsData: Arac[] = [];
      if (Array.isArray(response)) {
        console.log("✅ Response is already an array");
        carsData = response;
      } else if (response?.data && Array.isArray(response.data)) {
        console.log("✅ Response.data is an array");
        carsData = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        console.log("✅ Response.data.data is an array");
        carsData = response.data.data;
      } else {
        console.log("❌ Could not find array in response, using test data");
        // Use test data to verify the table works
        carsData = [
          { id: 1, model: "Test Car 1", plate_number: "TEST001", year: 2020, school_id: 1 },
          { id: 2, model: "Test Car 2", plate_number: "TEST002", year: 2021, school_id: 1 }
        ];
      }
      
      console.log("🚗 Final cars data:", carsData);
      console.log("🚗 Cars count:", carsData.length);
      
      setAraclar(carsData);
      setError(null);

      // Show dialog if no cars found
      if (carsData.length === 0) {
        setShowEmptyDialog(true);
      }
    } catch (err) {
      console.error("💥 Error in fetchAraclar:", err);
      const errorMessage = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu";
      setError(errorMessage);
      
      // Even on error, set some test data to verify the table works
      console.log("Setting test data due to error");
      setAraclar([
        { id: 1, model: "Error Test Car", plate_number: "ERR001", year: 2020, school_id: 1 }
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSync = useCallback(async (): Promise<void> => {
    if (!activeDrivingSchool?.id) {
      setSyncMessage("Aktif sürücü kursu seçilmedi");
      return;
    }

    try {
      setSyncing(true);
      setSyncMessage("Senkronize ediliyor...");
      console.log("🔄 Syncing cars for school:", activeDrivingSchool.id);
      
      const response = await apiService.drivingSchool.syncCars(activeDrivingSchool.id.toString());
      console.log("✅ Sync response:", response);
      
      setSyncMessage("Senkronize başarılı! Araçlar güncelleniyor...");
      
      // Refresh cars after sync
      await fetchAraclar(activeDrivingSchool.id.toString());
      
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
  }, [activeDrivingSchool?.id, fetchAraclar]);

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

      const response = await apiService.drivingSchool.syncCars(
        activeDrivingSchool.id.toString(),
        { ajandasKodu: code }
      );
      
      console.log("✅ Sync with code response:", response);
      setSyncMessage("✅ Senkronize başarıyla tamamlandı!");
      
      // Refresh cars
      await fetchAraclar(activeDrivingSchool.id.toString());
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (error) {
      console.error("❌ Error during code sync:", error);
      let errorMessage = "Senkronize sırasında bir hata oluştu";
      
      if ((error as any)?.response?.data?.message) {
        errorMessage = (error as any).response.data.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setSyncMessage(`❌ Hata: ${errorMessage}`);
      setTimeout(() => setSyncMessage(null), 10000);
    }
  };

  useEffect(() => {
    console.log("🏫 Active driving school changed:", activeDrivingSchool);
    console.log("🏫 Active driving school ID:", activeDrivingSchool?.id);
    console.log("🏫 Active driving school ID type:", typeof activeDrivingSchool?.id);
    
    if (activeDrivingSchool?.id) {
      console.log("🚀 Calling fetchAraclar with:", activeDrivingSchool.id.toString());
      fetchAraclar(activeDrivingSchool.id.toString());
    } else {
      console.log("⚠️ No active driving school or no ID - trying with hardcoded ID 1");
      // Try with hardcoded ID for testing
      fetchAraclar("1");
    }
  }, [activeDrivingSchool?.id, fetchAraclar]);

  console.log("🔄 Araclar component render - araclar:", araclar, "loading:", loading, "error:", error);
  
  if (loading) {
    return <div>Yükleniyor...</div>;
  }
  
  if (error) {
    return <div>Hata: {error}</div>;
  }
  
  return (
    <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-black">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Araçlar</h2>
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
      
      {/* Debug info */}
      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm">
        <p><strong>Active School:</strong> {activeDrivingSchool ? `${activeDrivingSchool.name} (ID: ${activeDrivingSchool.id})` : 'None'}</p>
        <p><strong>Cars Count:</strong> {araclar?.length || 0}</p>
        <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
        <p><strong>Error:</strong> {error || 'None'}</p>
      </div>
      
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Marka</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Plaka</TableHead>
            <TableHead>Yıl</TableHead>
            <TableHead>Hizmette</TableHead>
            <TableHead className="text-right">Detay</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {araclar?.length > 0 ? (
            araclar.map((arac) => (
              <TableRow key={arac.id}>
                <TableCell>{arac.brand}</TableCell>
                <TableCell>{arac.model}</TableCell>
                <TableCell>{arac.plate_number}</TableCell>
                <TableCell>{arac.year}</TableCell>
                <TableCell>
                  {arac.status && arac.status.toLowerCase().includes('hizmette') ? (
                    <span className="text-green-600 font-medium">Hizmette</span>
                  ) : (
                    <span className="text-red-500 font-medium">Hizmette Değil</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedArac(arac)}
                    title="Detay Gör"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                Veri bulunamadı.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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
        schoolCode={activeDrivingSchool?.id.toString() || ''}
        onSuccess={handleCodeSubmitted}
        onError={(error) => {
          setSyncMessage(`❌ Hata: ${error}`);
          setTimeout(() => setSyncMessage(null), 5000);
        }}
      />

      {/* Empty cars dialog */}
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

      {/* Vehicle detail dialog */}
      <Dialog open={!!selectedArac} onOpenChange={(open) => { if (!open) setSelectedArac(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Araç Detayı</DialogTitle>
            <DialogDescription>
              {selectedArac?.plate_number} - {selectedArac?.brand} {selectedArac?.model}
            </DialogDescription>
          </DialogHeader>
          {selectedArac && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="font-medium text-muted-foreground">Marka</div>
              <div>{selectedArac.brand || '-'}</div>
              <div className="font-medium text-muted-foreground">Model</div>
              <div>{selectedArac.model || '-'}</div>
              <div className="font-medium text-muted-foreground">Plaka</div>
              <div>{selectedArac.plate_number || '-'}</div>
              <div className="font-medium text-muted-foreground">Model Yılı</div>
              <div>{selectedArac.year || '-'}</div>
              <div className="font-medium text-muted-foreground">Araç Türü</div>
              <div>{selectedArac.car_type === 'simulator' ? 'Simülatör' : 'Eğitim Aracı'}</div>
              <div className="font-medium text-muted-foreground">Durum</div>
              <div>{selectedArac.status || '-'}</div>
              <div className="font-medium text-muted-foreground">Hizmete Giriş Tarihi</div>
              <div>{selectedArac.purchase_date ? new Date(selectedArac.purchase_date).toLocaleDateString('tr-TR') : '-'}</div>
              <div className="font-medium text-muted-foreground">Son Muayene Tarihi</div>
              <div>{selectedArac.last_inspection_date ? new Date(selectedArac.last_inspection_date).toLocaleDateString('tr-TR') : '-'}</div>
              <div className="font-medium text-muted-foreground">Muayene Geçerlilik Tarihi</div>
              <div>{selectedArac.inspection_validity_date ? new Date(selectedArac.inspection_validity_date).toLocaleDateString('tr-TR') : '-'}</div>
              <div className="font-medium text-muted-foreground">Sürücü Sayısı</div>
              <div>{selectedArac.driver_count ?? '-'}</div>
              <div className="font-medium text-muted-foreground">Ders Sayısı</div>
              <div>{selectedArac.lesson_count ?? '-'}</div>
              <div className="font-medium text-muted-foreground">Özür Günü</div>
              <div>{selectedArac.excuse_days ?? '-'}</div>
              {selectedArac.car_type === 'simulator' && (
                <>
                  <div className="font-medium text-muted-foreground">Seri No</div>
                  <div>{selectedArac.serial_number || '-'}</div>
                  <div className="font-medium text-muted-foreground">Kullanım Saati</div>
                  <div>{selectedArac.usage_hours ?? '-'}</div>
                  <div className="font-medium text-muted-foreground">Lisans Geçerlilik</div>
                  <div>{selectedArac.license_validity_date ? new Date(selectedArac.license_validity_date).toLocaleDateString('tr-TR') : '-'}</div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AraclarTable;
