import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { apiService } from "@/services/api-service";


interface MebbisCredentials {
  mebbis_username: string;
  mebbis_password?: string;
  [key: string]: any;
}

const KursumTable = () => {
  const [formData, setFormData] = useState<MebbisCredentials>({
    mebbis_username: "",
    mebbis_password: "",
  });
  const [savedData, setSavedData] = useState<MebbisCredentials | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [editing, setEditing] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        
        if (!token) {
          throw new Error("Token bulunamadı. Lütfen giriş yapın.");
        }

        const response = {
                data:await apiService.me()
        }


        if (response.data.drivingSchools && response.data.drivingSchools.length > 0) {
          const schoolId = response.data.drivingSchools[0].id;
          setSchoolId(schoolId);

          // Okul ID'si ile MEBBIS bilgilerini al
          const credsResponse = await axios.get(
            `https://test.mtsk.app/api/v1/driving-school/${schoolId}/creds`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          setSavedData(credsResponse.data);
          console.log(`School ID: ${schoolId}, MEBBIS Bilgileri:`, credsResponse.data);
        } else {
          setError("Sürücü kursu bilgisi bulunamadı.");
        }
      } catch (err) {
        console.error("Kullanıcı veya MEBBIS bilgileri getirilirken hata:", err);
        setError("Bilgiler alınırken bir hata oluştu.");
      }
    };

    fetchUserData();
  }, []);

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

      await axios.post(
        `https://test.mtsk.app/api/v1/driving-school/${schoolId}/creds`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // API'den güncellenmiş verileri al
      const response = await axios.get(
        `https://test.mtsk.app/api/v1/driving-school/${schoolId}/creds`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSavedData(response.data);
      setSuccess(true);
      setEditing(false);
      console.log(`School ID: ${schoolId}, Güncellenmiş MEBBIS Bilgileri:`, response.data);
      
      // 3 saniye sonra başarı mesajını kaldır
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Bir hata oluştu.");
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
  };

  return (
    <div className="p-6 rounded-lg shadow-lg bg-white dark:bg-gray-900">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        MEBBIS Bilgileri
      </h2>

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
            <Button onClick={handleEdit} className="mt-4">
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mebbis_username">MEBBIS Kullanıcı Adı</Label>
                <Input
                  id="mebbis_username"
                  name="mebbis_username"
                  value={formData.mebbis_username}
                  onChange={handleInputChange}
                  required
                />
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
                <Button type="submit">
                  Kaydet
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    İptal
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KursumTable;
