import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle } from "lucide-react";
import { apiService } from "@/services/api-service";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";

// Simulation types from global enums
export enum SimulationType {
  SESIM = 'sesim',
  ANA_GRUP = 'ana_grup'
}

interface DrivingSchoolSettings {
  name?: string;
  simulator_type?: SimulationType;
  [key: string]: any;
}

const SurucuKursuAyarlari = () => {
  const { user, activeDrivingSchool, isLoading: contextLoading } = drivingSchoolOwnerContext();

  const [formData, setFormData] = useState<DrivingSchoolSettings>({
    name: "",
    simulator_type: undefined,
  });
  const [savedData, setSavedData] = useState<DrivingSchoolSettings | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const schoolId = activeDrivingSchool?.id;
  const [editing, setEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
 
  useEffect(() => {
    const fetchSettings = async () => {
      // Context henüz yükleniyorsa bekle
      if (contextLoading) {
        return;
      }

      if (!schoolId) {
        console.log("School ID bulunamadı:", schoolId);
        setError("Sürücü kursu bilgisi bulunamadı. Giriş yapmayı deneyin.");
        setLoading(false);
        return;
      }

      try {
        setError("");
        console.log("Ayarlar çekiliyor, School ID:", schoolId);
        
        // Fetch driving school details
        const response = await apiService.drivingSchool.get(schoolId.toString());
        console.log("API Response:", response);
        
        if (response) {
          setSavedData(response);
          setFormData({
            name: response.name || "",
            simulator_type: response.simulator_type || undefined,
          });
        }
        
      } catch (err: any) {
        console.error("Ayarlar yüklenirken hata:", err);
        setError(`Bilgiler yüklenirken hata oluştu: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [schoolId, contextLoading]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSimulatorTypeChange = (value: SimulationType) => {
    setFormData((prev) => ({
      ...prev,
      simulator_type: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError("");

    if (!schoolId) {
      setError("Sürücü kursu ID'si bulunamadı");
      return;
    }

    try {
      console.log("Ayarlar kaydediliyor:", formData);
      
      await apiService.drivingSchool.update(schoolId.toString(), formData);
      
      setSavedData(formData);
      setSuccess(true);
      setEditing(false);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error("Ayarlar kaydedilirken hata:", err);
      setError(err.response?.data?.message || "Bir hata oluştu");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Sürücü Kursu Ayarları</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Ayarlar başarıyla kaydedildi</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Kurs Adı</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!editing}
                  placeholder="Sürücü kursu adı"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="simulator_type">Simülatör Tipi</Label>
                <Select
                  value={formData.simulator_type}
                  onValueChange={handleSimulatorTypeChange}
                  disabled={!editing}
                >
                  <SelectTrigger id="simulator_type">
                    <SelectValue placeholder="Simülatör tipi seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SimulationType.SESIM}>
                      Sesim
                    </SelectItem>
                    <SelectItem value={SimulationType.ANA_GRUP}>
                      Ana Grup
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Kurumunuzda kullanılan simülatör sistemini seçiniz
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {!editing ? (
                <Button type="button" onClick={() => setEditing(true)}>
                  Düzenle
                </Button>
              ) : (
                <>
                  <Button type="submit">
                    Kaydet
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      if (savedData) {
                        setFormData({
                          name: savedData.name || "",
                          simulator_type: savedData.simulator_type || undefined,
                        });
                      }
                    }}
                  >
                    İptal
                  </Button>
                </>
              )}
            </div>
          </form>

          {savedData && !editing && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Mevcut Ayarlar:</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Kurs Adı:</strong> {savedData.name || "Belirtilmemiş"}</p>
                <p><strong>Simülatör Tipi:</strong> {savedData.simulator_type === SimulationType.SESIM ? "Sesim" : savedData.simulator_type === SimulationType.ANA_GRUP ? "Ana Grup" : "Belirtilmemiş"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SurucuKursuAyarlari;
