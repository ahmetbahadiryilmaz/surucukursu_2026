import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Monitor, ShieldAlert, Sparkles } from "lucide-react";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";

interface VersionInfo {
  version?: string;
  whatsNew?: string | string[];
  downloadUrl?: string;
}

export default function DownloadDesktopPage() {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const { activeDrivingSchool } = drivingSchoolOwnerContext();

  const handleWhatsAppClick = () => {
    const schoolName = activeDrivingSchool?.name || '';
    const message = `Sürücü kursu ${schoolName}, masaüstü indirirken hata ile karşılaştım.`;
    const url = `https://wa.me/905078819080?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://api.mtsk.app/desktop/desktop-service/version');
        const data = await res.json();
        setInfo(data);
      } catch {
        setInfo({});
      }
    })();
  }, []);

  const handleDownload = async () => {
    if (info?.downloadUrl) {
      window.location.href = info.downloadUrl;
      return;
    }
    try {
      const res = await fetch('https://mtsk.app/desktop-updates/latest.yml');
      const text = await res.text();
      const match = text.match(/^path:\s*(.+)$/m);
      const filename = match ? match[1].trim() : 'MTSK_APP Setup 1.2.3.exe';
      window.location.href = `https://mtsk.app/desktop-updates/${encodeURIComponent(filename)}`;
    } catch {
      window.location.href = 'https://mtsk.app/desktop-updates/MTSK_APP%20Setup%201.2.3.exe';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-4">
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
              <Monitor className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Masaüstü Son Sürümü İndirin</CardTitle>
            <CardDescription className="text-base">
              Sürücü Kursu yönetim panelini kullanabilmek için en güncel masaüstü uygulamasını
              indirip kurmanız gerekmektedir.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            {info?.version && (
              <div className="w-full bg-muted/50 border rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Mevcut Sürüm</span>
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary font-semibold px-2.5 py-0.5 rounded-md text-sm">
                    v{info.version}
                  </span>
                </div>
                {info.whatsNew && (() => {
                  const items = Array.isArray(info.whatsNew)
                    ? info.whatsNew
                    : info.whatsNew.split(/\r?\n+/).filter(Boolean);
                  return (
                    <div className="flex items-start gap-2 pt-2 border-t">
                      <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Yenilikler</p>
                        <ul className="text-sm text-foreground space-y-1.5 list-disc list-outside pl-4 marker:text-primary">
                          {items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            <Button size="lg" onClick={handleDownload} className="gap-2 px-8 py-6 text-base">
              <Download className="w-5 h-5" />
              Masaüstü Uygulamasını İndir
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Windows için en son sürüm. Kurulumdan sonra hesabınızla giriş yapabilirsiniz.
            </p>
          </CardContent>
        </Card>

        {/* SmartScreen warning help — always visible */}
        <Card className="shadow-sm border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm mb-3">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              "Windows kişisel bilgisayarınızı korudu" uyarısı çıkarsa ne yapmalıyım?
            </div>
            <div className="flex flex-col gap-4 text-sm text-muted-foreground">
              <p>
                Uygulama henüz Microsoft tarafından tanınan bir sertifikaya sahip olmadığından
                Windows SmartScreen bu uyarıyı gösterebilir. Güvenle çalıştırabilirsiniz.
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="font-medium text-foreground">Uyarı ekranında <span className="text-blue-600 underline">"Ek bilgi"</span> bağlantısına tıklayın.</p>
                    <img
                      src="https://cdn.deneyapkart.org/media/uploads/2021/12/22/image-20211222151741-1.png"
                      alt="SmartScreen Ek bilgi adımı"
                      className="mt-2 rounded border max-w-sm w-full"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="font-medium text-foreground">Açılan ekranda <span className="font-semibold">"Yine de çalıştır"</span> düğmesine tıklayın.</p>
                    <img
                      src="https://cdn.deneyapkart.org/media/uploads/2021/12/22/image-20211222151742-2.png"
                      alt="SmartScreen Yine de çalıştır adımı"
                      className="mt-2 rounded border max-w-sm w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky WhatsApp support button */}
      <button
        onClick={handleWhatsAppClick}
        aria-label="WhatsApp ile destek al"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-medium px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6"
        >
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
        </svg>
        <span className="hidden sm:inline whitespace-nowrap">Destek için yazın</span>
      </button>
    </div>
  );
}
