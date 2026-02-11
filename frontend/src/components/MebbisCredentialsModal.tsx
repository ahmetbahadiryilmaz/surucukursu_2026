import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import { apiService } from "@/services/api-service";

interface MebbisCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (username: string, password: string) => Promise<void>;
  errorMessage?: string;
  credentialsLocked?: boolean;
  initialUsername?: string;
}

export function MebbisCredentialsModal({
  isOpen,
  onClose,
  onSubmit,
  errorMessage,
  credentialsLocked: credentialsLockedProp,
  initialUsername,
}: MebbisCredentialsModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCreds, setIsFetchingCreds] = useState(false);
  const [error, setError] = useState<string>("");
  const [credentialsLocked, setCredentialsLocked] = useState(credentialsLockedProp ?? false);
  const { activeDrivingSchool } = drivingSchoolOwnerContext();

  // Reset error when modal opens
  useEffect(() => {
    if (isOpen) {
      setError("");
    }
  }, [isOpen]);

  // Fetch credentials from API when modal opens
  useEffect(() => {
    if (isOpen && activeDrivingSchool?.id) {
      const fetchCredentials = async () => {
        console.log("📋 Modal opened, fetching credentials from API for school:", activeDrivingSchool.id);
        setIsFetchingCreds(true);
        
        try {
          const response = await apiService.drivingSchool.getCredentials(activeDrivingSchool.id.toString());
          console.log("🔐 Credentials response:", response);
          
          const credsData = response?.data || response;
          
          // Set locked status
          const isLocked = credsData?.mebbis_credentials_locked ?? false;
          console.log("🔒 Credentials locked:", isLocked);
          setCredentialsLocked(isLocked);
          
          // Set username from API response
          if (credsData?.mebbis_username) {
            console.log("👤 Setting username from API:", credsData.mebbis_username);
            setUsername(credsData.mebbis_username);
          } else if (initialUsername) {
            console.log("👤 Setting username from prop:", initialUsername);
            setUsername(initialUsername);
          }
        } catch (err) {
          console.error("❌ Failed to fetch credentials:", err);
          // Fall back to context data
          if (activeDrivingSchool?.mebbis_username) {
            setUsername(activeDrivingSchool.mebbis_username);
          }
          if (activeDrivingSchool?.mebbis_credentials_locked !== undefined) {
            setCredentialsLocked(activeDrivingSchool.mebbis_credentials_locked);
          }
        } finally {
          setIsFetchingCreds(false);
        }
      };
      
      fetchCredentials();
    }
  }, [isOpen, activeDrivingSchool?.id, initialUsername]);

  // Update error message when prop changes
  useEffect(() => {
    if (errorMessage) {
      setError(errorMessage);
      console.log("⚠️ Error message from parent:", errorMessage);
    }
  }, [errorMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await onSubmit(username, password);
      // Clear form on success
      setUsername("");
      setPassword("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kimlik doğrulama başarısız oldu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>MEBBIS Kimlik Bilgileri</DialogTitle>
          <DialogDescription>
            MEBBIS kimlik bilgileriniz yanlış. Lütfen doğru bilgileri giriniz.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isFetchingCreds && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              Kimlik bilgileri yükleniyor...
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mebbis-username">Kullanıcı Adı</Label>
            <Input
              id="mebbis-username"
              type="text"
              placeholder={isFetchingCreds ? "Yükleniyor..." : "MEBBIS kullanıcı adınız"}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading || credentialsLocked || isFetchingCreds}
              readOnly={credentialsLocked}
              required
            />
            {credentialsLocked && (
              <p className="text-xs text-gray-500">Kullanıcı adı kilitlenmiştir. Sadece şifre değiştirebilirsiniz.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mebbis-password">Şifre</Label>
            <Input
              id="mebbis-password"
              type="password"
              placeholder="MEBBIS şifreniz"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading || isFetchingCreds}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isFetchingCreds}
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isFetchingCreds}
              className="flex-1"
            >
              {isFetchingCreds ? "Yükleniyor..." : isLoading ? "Doğrulanıyor..." : "Kimlik Bilgilerini Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
