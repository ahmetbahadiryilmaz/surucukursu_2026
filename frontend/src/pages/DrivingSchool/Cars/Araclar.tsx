import { useState, useEffect, useCallback } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { apiService } from "@/services/api-service";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
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
  const [error, setError] = useState<string | null>(null);

  const { activeDrivingSchool } = drivingSchoolOwnerContext();

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
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Araçlar</h2>
      
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
    </div>
  );
};

export default AraclarTable;
