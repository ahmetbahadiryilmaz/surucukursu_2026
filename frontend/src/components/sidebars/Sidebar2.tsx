import { Button } from "@/components/ui/button";
import { School, TerminalIcon, BarChart2 } from "lucide-react";


const AdminSidebar = () => {
    return (
      <div className="hidden md:flex w-64 bg-zinc-900 text-white h-screen p-4 flex-col border-r border-zinc-800">
        <div className="mb-4 flex flex-col">
          <span className="font-bold text-sm">test@surucukursu.com</span>
          <span className="text-xs text-gray-400">DEMO</span>
        </div>
        <nav className="flex-1">
          <ul className="space-y-2">
            <Button variant="ghost" className="w-full flex justify-start items-center gap-2">
              <School className="w-4 h-4" /> Driving School Owner
            </Button>
            <Button variant="ghost" className="w-full ml-4 text-gray-300 flex justify-start">Kurs Bilgileri</Button>
            <Button variant="ghost" className="w-full flex justify-start items-center gap-2">
              <TerminalIcon className="w-4 h-4" /> Tanımlamalar
            </Button>
            <Button variant="ghost" className="w-full ml-4 text-gray-300 flex justify-start">Kurs Bilgileri</Button>
            <Button variant="ghost" className="w-full flex justify-start items-center gap-2">
              <School className="w-4 h-4" /> Kursum
            </Button>
            <Button variant="ghost" className="w-full ml-4 text-gray-300 flex justify-start">Öğrenciler</Button>
            <Button variant="ghost" className="w-full ml-4 text-gray-300 flex justify-start">Araçlar</Button>
            <Button variant="ghost" className="w-full flex justify-start items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Toplu Raporlar
            </Button>
            <Button variant="ghost" className="w-full ml-4 text-gray-300 flex justify-start">Simülasyon Raporları</Button>
            <Button variant="ghost" className="w-full ml-4 text-gray-300 flex justify-start">Direksiyon Takip Raporları</Button>
          </ul>
        </nav>
        <div className="p-4 flex justify-center">
          <Button variant="ghost" className="text-gray-400">
            ⚡
          </Button>
        </div>
      </div>
    );
  };
  
export default AdminSidebar;
