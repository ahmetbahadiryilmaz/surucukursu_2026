import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService as ApiService } from "@/services/api-service";

type Step = "step1" | "step2";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("step1");

  // Step 1
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error1, setError1] = useState<string | null>(null);
  const [loading1, setLoading1] = useState(false);

  // Step 2
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error2, setError2] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading2, setLoading2] = useState(false);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError1(null);
    if (!/^(0000000000|5\d{9})$/.test(phone)) {
      setError1("Telefon 10 haneli ve 5 ile başlamalıdır (5XXXXXXXXX).");
      return;
    }
    setLoading1(true);
    try {
      const result = await ApiService.authentication.forgotPassword(email, phone);
      if (result?.success === false) {
        setError1(result.message || "Bir hata oluştu.");
      } else {
        setStep("step2");
      }
    } catch (err: any) {
      setError1(err?.response?.data?.message || "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading1(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError2(null);
    setLoading2(true);
    try {
      const result = await ApiService.authentication.resetPasswordWithCode(email, code, newPassword);
      if (result?.success === false) {
        setError2(result.message || "Bir hata oluştu.");
      } else {
        setSuccess(result?.message || "Şifreniz başarıyla güncellendi!");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err: any) {
      setError2(err?.response?.data?.message || "Geçersiz kod veya bir hata oluştu.");
    } finally {
      setLoading2(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        {step === "step1" ? (
          <>
            <CardHeader>
              <CardTitle>Şifremi Unuttum</CardTitle>
              <CardDescription>
                E-posta ve telefon numaranızı girin, size doğrulama kodu gönderelim.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep1} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="5XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>
                {error1 && (
                  <p className="text-sm text-destructive">{error1}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading1}>
                  {loading1 ? "Gönderiliyor…" : "Kod Gönder"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/login")}
                >
                  ← Girişe Dön
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Kodu Girin</CardTitle>
              <CardDescription>
                E-postanıza gönderilen 6 haneli kodu ve yeni şifrenizi girin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep2} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="code">Doğrulama Kodu</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-password">Yeni Şifre</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Yeni şifreniz"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                {error2 && (
                  <p className="text-sm text-destructive">{error2}</p>
                )}
                {success && (
                  <p className="text-sm text-green-600">{success}</p>
                )}
                <Button type="submit" className="w-full" disabled={loading2 || !!success}>
                  {loading2 ? "Sıfırlanıyor…" : success ? "Tamamlandı" : "Şifremi Sıfırla"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setStep("step1"); setError2(null); setSuccess(null); }}
                >
                  ← Önceki Adım
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
