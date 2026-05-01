import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center text-red-600">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Silme Onayı
        </DialogTitle>
        <DialogDescription className="text-gray-600">
          Bu kursu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex space-x-2 justify-end">
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={loading}
          className="border-gray-300"
        >
          Vazgeç
        </Button>
        <Button 
          variant="destructive" 
          onClick={onConfirm}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700"
        >
          {loading ? 'Siliniyor...' : 'Sil'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default DeleteConfirmDialog;
