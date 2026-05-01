import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { apiService } from "@/services/api-service";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MebbisCredentials {
  mebbis_username: string;
  mebbis_password?: string;
  mebbis_credentials_locked?: boolean;
  [key: string]: any;
}

const KursumTable = () => {
  const { user, activeDrivingSchool, isLoading: contextLoading } = drivingSchoolOwnerContext();

  const [formData, setFormData] = useState<MebbisCredentials>({
    mebbis_username: "",
    mebbis_password: "",
  });
  const [savedData, setSavedData] = useState<MebbisCredentials | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const schoolId = activeDrivingSchool?.id;
  const [editing, setEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
 
  useEffect(() => {
    const fetchCredentials = async () => {
      // Context henüz yükleniyorsa bekle
      if (contextLoading) {
        return;
      }

      if (!schoolId) {
        console.log("School ID bulunamadı:", schoolId);
        console.log("Active Driving School:", activeDrivingSchool);
        console.log("User:", user);
        setError("Sürücü kursu bilgisi bulunamadı. Giriş yapmayı deneyin.");
        setLoading(false);
        return;
      }

      try {
        setError(""); // Önce hatayı temizle
        console.log("Credentials çekiliyor, School ID:", schoolId);
        
        const response = await apiService.drivingSchool.getCredentials(schoolId.toString());
        console.log("API Response:", response);
        
        // API response'u kontrol et - null olabilir (henüz credentials kaydedilmemiş)
        if (response && response.mebbis_username) {
          setSavedData(response);
          setFormData({
            mebbis_username: response.mebbis_username || "",
            mebbis_password: "",
          });
        } else {
          // Henüz credentials kaydedilmemiş, boş form göster
          console.log("Henüz credentials kaydedilmemiş");
          setSavedData(null);
          setFormData({
            mebbis_username: "",
            mebbis_password: "",
          });
        }
        
      } catch (err: any) {
        console.error("MEBBIS bilgileri yüklenirken hata:", err);
        console.error("Error details:", {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
        
        // 404 hatası normal (henüz credentials yok), diğer hatalar için mesaj göster
        if (err.response?.status === 404) {
          console.log("404 - Henüz credentials yok, bu normal");
          setSavedData(null);
        } else {
          setError(`Bilgiler yüklenirken hata oluştu: ${err.response?.data?.message || err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCredentials();
  }, [schoolId, contextLoading]); // contextLoading'i dependency'e ekle

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("Token bulunamadı. Lütfen giriş yapın.");
      }

      if (!schoolId) {
        throw new Error("Sürücü kursu ID'si bulunamadı.");
      }

      console.log("Credentials güncelleniyor:", {
        schoolId,
        formData: { ...formData, mebbis_password: "***" } // Password'u log'a yazmayalım
      });
      
      await apiService.drivingSchool.updateCredentials(schoolId.toString(), formData);
      
      // Güncellenen veriyi tekrar çek
      const response = await apiService.drivingSchool.getCredentials(schoolId.toString());
      console.log("Güncellenmiş credentials:", response);

      setSavedData(response);
      setSuccess(true);
      setEditing(false);
      
      // Form'u temizle
      setFormData({
        mebbis_username: response.mebbis_username || "",
        mebbis_password: "",
      });
      
      console.log(`School ID: ${schoolId}, Güncellenmiş MEBBIS Bilgileri:`, response);
      
      // 3 saniye sonra başarı mesajını kaldır
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Bir hata oluştu.");
      console.error("MEBBIS bilgileri kaydedilirken hata:", err);
    }
  };

  const handleEdit = () => {
    if (savedData) {
      setFormData({
        mebbis_username: savedData.mebbis_username,
        mebbis_password: "",
      });
    }
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError("");
    // Form'u kayıtlı verilerle resetle
    if (savedData) {
      setFormData({
        mebbis_username: savedData.mebbis_username,
        mebbis_password: "",
      });
    }
  };

  // Debug bilgileri
  console.log("Kursum Component Debug:", {
    contextLoading,
    user: user ? { id: user.id, email: user.email } : null,
    activeDrivingSchool,
    schoolId,
    savedData: savedData ? { ...savedData, mebbis_password: "***" } : null,
    loading,
    error
  });

  // Context henüz yükleniyorsa loading göster
  if (contextLoading) {
    return (
      <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          MEBBIS Bilgileri
        </h2>
        <p>Kullanıcı bilgileri yükleniyor...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-gray-900">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          MEBBIS Bilgileri
        </h2>
        <p>MEBBIS bilgileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        MEBBIS Bilgileri
      </h2>

      {/* Debug bilgileri - sadece development modunda */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm">
          <p><strong>School ID:</strong> {schoolId || 'null'}</p>
          <p><strong>User:</strong> {user ? `${user.email} (ID: ${user.id})` : 'null'}</p>
          <p><strong>Active School:</strong> {activeDrivingSchool ? `${activeDrivingSchool.name} (ID: ${activeDrivingSchool.id})` : 'null'}</p>
          <p><strong>Has Saved Data:</strong> {savedData ? 'Yes' : 'No'}</p>
        </div>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-200">
          <CheckCircle className="h-4 w-4 mr-2" />
          <AlertDescription>Bilgiler başarıyla kaydedildi!</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {savedData && !editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kayıtlı MEBBIS Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-medium">Kullanıcı Adı:</Label>
              <p className="mt-1">{savedData.mebbis_username}</p>
            </div>
            <div>
              <Label className="font-medium">Şifre:</Label>
              <p className="mt-1">*****</p>
            </div>
            <Button 
              onClick={handleEdit} 
              className="mt-4"
            >
              Düzenle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editing ? "MEBBIS Bilgilerini Düzenle" : "MEBBIS Bilgilerini Gir"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TooltipProvider>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mebbis_username">MEBBIS Kullanıcı Adı</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        id="mebbis_username"
                        name="mebbis_username"
                        value={formData.mebbis_username}
                        onChange={handleInputChange}
                        disabled={savedData?.mebbis_credentials_locked}
                        required
                      />
                    </TooltipTrigger>
                    {savedData?.mebbis_credentials_locked && (
                      <TooltipContent>
                        Kullanıcı adı değiştirilemez.
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mebbis_password">MEBBIS Şifre</Label>
                  <Input
                    id="mebbis_password"
                    type="password"
                    name="mebbis_password"
                    value={formData.mebbis_password}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    type="submit"
                  >
                    Kaydet
                  </Button>
                  {editing && (
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      İptal
                    </Button>
                  )}
                </div>
              </form>
            </TooltipProvider>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KursumTable;
