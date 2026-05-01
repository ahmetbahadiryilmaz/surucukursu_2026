import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Monitor, ShieldAlert, Sparkles } from "lucide-react";

interface VersionInfo {
  version?: string;
  whatsNew?: string | string[];
  downloadUrl?: string;
}

export default function DownloadDesktopPage() {
  const [info, setInfo] = useState<VersionInfo | null>(null);

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
    </div>
  );
}
