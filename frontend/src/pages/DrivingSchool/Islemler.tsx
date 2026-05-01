import { useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

// Define a type for the islem (operation) object
type Islem = {
  id: number;
  ad: string;
  tarih: string;
  durum: 'Tamamlandı' | 'Bekliyor' | 'İşlemde' | 'İptal Edildi';
};

// Type-safe status color mapping
const STATUS_COLORS: Record<Islem['durum'], string> = {
  'Tamamlandı': 'text-green-600',
  'Bekliyor': 'text-orange-500', 
  'İşlemde': 'text-gray-600',
  'İptal Edildi': 'text-red-600'
};

// Duruma bağlı olarak rengi belirleyen fonksiyon
const getStatusColor = (durum: Islem['durum']): string => {
  return STATUS_COLORS[durum] || 'text-gray-800';
};

const IslemlerTable: React.FC = () => {
  const [islemler] = useState<Islem[]>([
    { id: 1, ad: "Öğrenci Kaydı", tarih: "2024-02-15", durum: "Tamamlandı" },
    { id: 2, ad: "Araç Bakımı", tarih: "2024-02-14", durum: "Bekliyor" },
    { id: 3, ad: "Ödeme Kontrolü", tarih: "2024-02-13", durum: "İşlemde" },
    { id: 4, ad: "Kayıt İptali", tarih: "2024-02-12", durum: "İptal Edildi" },
  ]);

  return (
    <div className="p-4 bg-card rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">İşlemler</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>İşlem Adı</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {islemler.map((islem) => (
            <TableRow key={islem.id}>
              <TableCell>{islem.id}</TableCell>
              <TableCell>{islem.ad}</TableCell>
              <TableCell>{islem.tarih}</TableCell>
              <TableCell className={`font-bold ${getStatusColor(islem.durum)}`}>
                {islem.durum}
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm">
                  Detay
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default IslemlerTable;
