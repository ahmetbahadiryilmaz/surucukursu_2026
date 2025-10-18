import { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress"; 
import { Sheet, SheetContent } from "@/components/ui/sheet";

// Rapor tipini tanımlıyoruz
interface Report {
  id: number;
  name: string;
  student: string;
  date: string;
  status: string;
}

const SimulasyonRaporlariTable = () => {
  const [raporlar] = useState<Report[]>([
    { id: 1, name: "Simülasyon Raporu 1", student: "Ramazan Said", date: "2025-01-01", status: "Tamamlandı" },
    { id: 2, name: "Simülasyon Raporu 2", student: "Esma", date: "2025-01-02", status: "Beklemede" },
    { id: 3, name: "Simülasyon Raporu 3", student: "Elisa", date: "2025-01-03", status: "Tamamlandı" },
  ]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [downloadingReports, setDownloadingReports] = useState<
    { id: number; name: string; progress: number }[]
  >([]);

  const handleDownload = (report: Report) => {
    setIsSidebarOpen(true);

    // Yeni rapor ekleniyor
    const newReport = { ...report, progress: 0 };
    setDownloadingReports((prev) => [...prev, newReport]);

    // Yeni rapor için interval oluşturuluyor
    const interval = setInterval(() => {
      setDownloadingReports((prevReports) =>
        prevReports.map((r) => {
          if (r.id === report.id) {
            const newProgress = r.progress + 10;
            if (newProgress >= 100) {
              clearInterval(interval);
              return { ...r, progress: 100 };
            }
            return { ...r, progress: newProgress };
          }
          return r;
        })
      );
    }, 300);
  };

  return (
    <div className="relative p-6 rounded-lg shadow-lg bg-white dark:bg-black">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Simülasyon Raporları</h2>
      <Table className="w-full border border-gray-300 dark:border-gray-700">
        <TableHeader className="bg-gray-200 dark:bg-gray-800">
          <TableRow className="border-b border-gray-300 dark:border-gray-700">
            <TableHead className="text-left text-gray-700 dark:text-gray-300 p-3">ID</TableHead>
            <TableHead className="text-left text-gray-700 dark:text-gray-300 p-3">Rapor Adı</TableHead>
            <TableHead className="text-left text-gray-700 dark:text-gray-300 p-3">Öğrenci</TableHead>
            <TableHead className="text-left text-gray-700 dark:text-gray-300 p-3">İndir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {raporlar.length > 0 ? (
            raporlar.map((rapor) => (
              <TableRow key={rapor.id} className="border-b border-gray-300 dark:border-gray-700">
                <TableCell className="p-3 text-gray-900 dark:text-gray-100">{rapor.id}</TableCell>
                <TableCell className="p-3 text-gray-900 dark:text-gray-100">{rapor.name}</TableCell>
                <TableCell className="p-3 text-gray-900 dark:text-gray-100">{rapor.student}</TableCell>
                <TableCell className="p-3 text-gray-900 dark:text-gray-100">
                  <Button variant="outline" onClick={() => handleDownload(rapor)}>
                    İndir
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500 dark:text-gray-400 p-4">
                Veri bulunamadı.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Sağ panelde sadece raporları gösterecek şekilde düzenledik */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="right" className="w-64 bg-white dark:bg-black text-gray-900 dark:text-gray-100 p-4">
          <h3 className="text-lg font-bold mb-2">Rapor İndiriliyor</h3>
          {/* Sağ panelde her rapor için ayrı bir ilerleme çubuğu gösteriliyor */}
          {downloadingReports.map((rapor) => (
            <div key={rapor.id} className="mb-6">
              <p className="mb-2">{rapor.name}</p>
              <Progress value={rapor.progress} className="mb-2" />
            </div>
          ))}
          <Button variant="outline" onClick={() => setIsSidebarOpen(false)}>
            Kapat
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SimulasyonRaporlariTable;
