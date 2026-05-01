import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DrivingSchool } from '@/services/api-service';

interface KursTableProps {
  kurslar: DrivingSchool[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  getOwnerName: (owner_id: string | number | null | undefined) => string;
  getManagerName: (manager_id: string | number | null | undefined) => string;
  filterText: string;
}

const KursTable: React.FC<KursTableProps> = ({ 
  kurslar, 
  onEdit, 
  onDelete,
  getOwnerName,
  getManagerName,
  filterText 
}) => (
  <div className="rounded-md border overflow-hidden shadow-sm">
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="font-semibold">ID</TableHead>
          <TableHead className="font-semibold">Kurs Adı</TableHead>
          <TableHead className="font-semibold">Adres</TableHead>
          <TableHead className="font-semibold">Telefon</TableHead>
          <TableHead className="font-semibold">Kurs Sahibi</TableHead>
          <TableHead className="font-semibold">Kurs Yöneticisi</TableHead>
          <TableHead className="font-semibold text-center">İşlemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {kurslar.length > 0 ? (
          kurslar.map((kurs) => (
            <TableRow key={kurs.id} className="hover:bg-gray-50 transition-colors">
              <TableCell className="font-mono text-sm">{kurs.id}</TableCell>
              <TableCell className="font-medium">{kurs.name}</TableCell>
              <TableCell className="text-sm">{kurs.address}</TableCell>
              <TableCell className="text-sm">{kurs.phone}</TableCell>
              <TableCell className="text-sm">{getOwnerName(kurs.owner_id)}</TableCell>
              <TableCell className="text-sm">{getManagerName(kurs.manager_id)}</TableCell>
              <TableCell>
                <div className="flex justify-center space-x-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => onEdit(kurs.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Düzenle
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => onDelete(kurs.id)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Sil
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
              {filterText ? "Arama kriterlerine uygun kurs bulunamadı." : "Henüz kurs bulunmuyor."}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);

export default KursTable;
