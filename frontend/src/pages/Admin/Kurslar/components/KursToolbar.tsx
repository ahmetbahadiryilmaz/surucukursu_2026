import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Filter, PlusCircle } from 'lucide-react';

interface KursToolbarProps {
  filterText: string;
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
  loading: boolean;
}

const KursToolbar: React.FC<KursToolbarProps> = ({ 
  filterText, 
  onFilterChange, 
  onRefresh, 
  onAdd, 
  loading 
}) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
    <div className="relative w-full md:w-1/2">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Filter className="h-4 w-4 text-gray-500" />
      </div>
      <input
        type="text"
        placeholder="Kurs adı, adres, telefon veya kişi ara..."
        className="border border-gray-300 rounded-lg pl-10 pr-3 py-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        value={filterText}
        onChange={(e) => onFilterChange(e.target.value)}
      />
    </div>
    
    <div className="flex space-x-3">
      <Button 
        className="bg-green-600 hover:bg-green-700 text-white font-medium" 
        onClick={onAdd}
      >
        <PlusCircle className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Yeni Kurs</span>
        <span className="sm:hidden">Ekle</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={onRefresh} 
        disabled={loading}
        className="border-gray-300 hover:bg-gray-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  </div>
);

export default KursToolbar;
