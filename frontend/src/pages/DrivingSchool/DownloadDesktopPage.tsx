import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Monitor } from "lucide-react";

export default function DownloadDesktopPage() {
  const handleDownload = async () => {
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
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-2xl shadow-lg">
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
          <Button size="lg" onClick={handleDownload} className="gap-2 px-8 py-6 text-base">
            <Download className="w-5 h-5" />
            Masaüstü Uygulamasını İndir
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Windows için en son sürüm. Kurulumdan sonra hesabınızla giriş yapabilirsiniz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
