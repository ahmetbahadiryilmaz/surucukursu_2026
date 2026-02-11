import { useState, useEffect, useCallback } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { apiService } from "@/services/api-service";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import { MebbisCodeModal } from "@/components/Modals/MebbisCodeModal";
import { MebbisCredentialsModal } from "@/components/MebbisCredentialsModal";

/**
 * Araç bilgisi arayüzü
 */
interface Arac {
  id: number;
  model: string;
  plate_number: string;
  year: number;
  school_id: number;
}

const AraclarTable = (): JSX.Element => {
  const [araclar, setAraclar] = useState<Arac[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState<boolean>(false);
  const [credentialsError, setCredentialsError] = useState<string>("");

  const { activeDrivingSchool } = drivingSchoolOwnerContext();

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
      console.error("❌ Error syncing cars:", err);
      console.error("Error type:", typeof err);
      console.error("Error keys:", Object.keys(err || {}));
      
      let errorMessage = "Senkronize sırasında bir hata oluştu";
      
      // Try different ways to extract error message
      // For AxiosError, check response data first (server message)
      if ((err as any)?.response?.data?.message) {
        errorMessage = (err as any).response.data.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (typeof err === 'object' && err !== null) {
        // Check various properties where error message might be
        errorMessage = (err as any).message || (err as any).data?.message || JSON.stringify(err);
      }
      
      console.log("Final error message:", errorMessage);
      
      // Check if error message indicates AJANDA KODU is needed (check this FIRST)
      if (errorMessage && (
        errorMessage.toLowerCase().includes('ajanda kodu') ||
        errorMessage.toLowerCase().includes('ajanda') ||
        errorMessage.toLowerCase().includes('2fa') ||
        errorMessage.toLowerCase().includes('doğrulama kodu')
      )) {
        console.log("🎯 AJANDA KODU needed - showing modal");
        setSyncMessage(null);
        setShowCodeModal(true);
      }
      // Check if error indicates invalid credentials
      else if (
        errorMessage && 
        (errorMessage.toLowerCase().includes('kullanıcı adı') ||
         errorMessage.toLowerCase().includes('şifre') ||
         errorMessage.toLowerCase().includes('kimlik') ||
         errorMessage.toLowerCase().includes('hatalı') ||
         errorMessage.toLowerCase().includes('başarısız'))
      ) {
        console.log("🔑 Invalid credentials - showing credentials modal");
        setSyncMessage(null);
        setCredentialsError(errorMessage);
        setShowCredentialsModal(true);
      } else {
        setSyncMessage(`❌ Hata: ${errorMessage}`);
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
            <TableHead>Model</TableHead>
            <TableHead>Plaka</TableHead>
            <TableHead>Yıl</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {araclar?.length > 0 ? (
            araclar.map((arac) => (
              <TableRow key={arac.id}>
                <TableCell>{arac.model}</TableCell>
                <TableCell>{arac.plate_number}</TableCell>
                <TableCell>{arac.year}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center">
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
    </div>
  );
};

export default AraclarTable;
