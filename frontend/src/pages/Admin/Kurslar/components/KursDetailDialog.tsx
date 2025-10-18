import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DrivingSchool } from '@/services/api-service';

interface KursDetailDialogProps {
  kurs: DrivingSchool | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  getOwnerName: (owner_id: string | number | null | undefined) => string;
  getManagerName: (manager_id: string | number | null | undefined) => string;
}

const KursDetailDialog: React.FC<KursDetailDialogProps> = ({
  kurs,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  getOwnerName,
  getManagerName
}) => {
  if (!kurs) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{kurs.name || "İsimsiz Kurs"}</DialogTitle>
          <DialogDescription className="text-gray-600">
            Kurs ID: {kurs.id}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-2">
            <span className="font-semibold text-gray-700">Adres:</span>
            <span className="col-span-2 text-gray-900">{kurs.address}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-semibold text-gray-700">Telefon:</span>
            <span className="col-span-2 text-gray-900">{kurs.phone}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-semibold text-gray-700">Kurs Sahibi:</span>
            <span className="col-span-2 text-gray-900">{getOwnerName(kurs.owner_id)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="font-semibold text-gray-700">Yönetici:</span>
            <span className="col-span-2 text-gray-900">{getManagerName(kurs.manager_id)}</span>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-gray-300"
          >
            Kapat
          </Button>
          <div className="flex space-x-2">
            <Button 
              variant="default" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                onEdit(kurs.id);
                onClose();
              }}
            >
              Düzenle
            </Button>
            <Button 
              variant="destructive" 
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onDelete(kurs.id);
                onClose();
              }}
            >
              Sil
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KursDetailDialog;
