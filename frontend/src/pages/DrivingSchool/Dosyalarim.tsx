import { useState, useEffect } from 'react';
import { apiService } from '@/services/api-service';
import { drivingSchoolOwnerContext } from '@/components/contexts/DrivingSchoolManagerContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2, AlertCircle, FolderOpen, Calendar, HardDrive, Trash2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface FileInfo {
  filename: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  modifiedAt: string;
  type: string;
}

interface StorageInfo {
  totalUsed: number;
  totalUsedFormatted: string;
  totalLimit: number;
  totalLimitFormatted: string;
  usagePercentage: number;
  fileCount: number;
}

export default function DosyalarimPage() {
  const { activeDrivingSchool } = drivingSchoolOwnerContext();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
    fetchStorageInfo();
  }, [activeDrivingSchool]);

  const fetchStorageInfo = async () => {
    if (!activeDrivingSchool) return;

    try {
      const response = await apiService.files.getStorageInfo(activeDrivingSchool.id.toString());
      if (response.success) {
        setStorageInfo(response.storage);
      }
    } catch (err: any) {
      console.error('Error fetching storage info:', err);
    }
  };

  const fetchFiles = async () => {
    if (!activeDrivingSchool) {
      setError('Lütfen bir sürücü kursu seçin');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.files.getFiles(activeDrivingSchool.id.toString());
      
      if (response.success) {
        setFiles(response.files);
      }
    } catch (err: any) {
      console.error('Error fetching files:', err);
      
      if (err.response?.status === 404) {
        setError('Bu sürücü kursu için henüz dosya bulunmamaktadır.');
        setFiles([]);
      } else if (err.response?.status === 403) {
        setError('Bu sürücü kursunun dosyalarına erişim yetkiniz bulunmamaktadır.');
        setFiles([]);
      } else {
        setError('Dosyalar yüklenirken bir hata oluştu: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filename: string) => {
    if (!activeDrivingSchool) {
      return;
    }

    try {
      setDownloadingFile(filename);
      
      const blob = await apiService.files.downloadFile(
        activeDrivingSchool.id.toString(),
        filename
      );
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (err: any) {
      console.error('Error downloading file:', err);
      alert('Dosya indirilirken bir hata oluştu: ' + (err.response?.data?.message || err.message));
    } finally {
      setDownloadingFile(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteClick = (filename: string) => {
    setFileToDelete(filename);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!activeDrivingSchool || !fileToDelete) return;

    try {
      setDeletingFile(fileToDelete);
      await apiService.files.deleteFile(activeDrivingSchool.id.toString(), fileToDelete);
      
      // Refresh the file list and storage info
      await fetchFiles();
      await fetchStorageInfo();
      
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (err: any) {
      console.error('Error deleting file:', err);
      alert('Dosya silinirken bir hata oluştu: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeletingFile(null);
    }
  };

  const handleDeleteAllClick = () => {
    setDeleteAllDialogOpen(true);
  };

  const handleDeleteAllConfirm = async () => {
    if (!activeDrivingSchool) return;

    try {
      setDeletingAll(true);
      const response = await apiService.files.deleteAllFiles(activeDrivingSchool.id.toString());
      
      // Refresh the file list and storage info
      await fetchFiles();
      await fetchStorageInfo();
      
      setDeleteAllDialogOpen(false);
      
      if (response.errors && response.errors.length > 0) {
        alert(`${response.deletedCount} dosya silindi, ${response.errors.length} hata oluştu.`);
      }
    } catch (err: any) {
      console.error('Error deleting all files:', err);
      alert('Dosyalar silinirken bir hata oluştu: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeletingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Dosyalar yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dosyalarım</h2>
          <p className="text-muted-foreground">
            {activeDrivingSchool ? `DS${activeDrivingSchool.id} - ${activeDrivingSchool.name}` : 'Sürücü kursu dosyaları'}
          </p>
        </div>
        <div className="flex gap-2">
          {files.length > 0 && (
            <Button 
              onClick={handleDeleteAllClick} 
              variant="destructive"
              disabled={deletingAll}
            >
              {deletingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Tümünü Sil
                </>
              )}
            </Button>
          )}
          <Button onClick={() => { fetchFiles(); fetchStorageInfo(); }} variant="outline">
            <FolderOpen className="mr-2 h-4 w-4" />
            Yenile
          </Button>
        </div>
      </div>

      {/* Storage Info Card */}
      {storageInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Depolama Alanı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {storageInfo.totalUsedFormatted} / {storageInfo.totalLimitFormatted} kullanıldı
              </span>
              <span className={cn(
                "font-medium",
                storageInfo.usagePercentage > 80 ? "text-red-600" : 
                storageInfo.usagePercentage > 60 ? "text-yellow-600" : 
                "text-green-600"
              )}>
                %{storageInfo.usagePercentage.toFixed(1)}
              </span>
            </div>
            <Progress 
              value={storageInfo.usagePercentage} 
              className={cn(
                "h-2",
                storageInfo.usagePercentage > 80 ? "[&>div]:bg-red-600" : 
                storageInfo.usagePercentage > 60 ? "[&>div]:bg-yellow-600" : 
                "[&>div]:bg-green-600"
              )}
            />
            <p className="text-xs text-muted-foreground">
              {storageInfo.fileCount} dosya
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && files.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Henüz dosya bulunmuyor</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Sürücü kursunuz için oluşturulan PDF belgeler burada görünecektir.
            </p>
          </CardContent>
        </Card>
      )}

      {!error && files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Dosya Listesi</CardTitle>
            <CardDescription>
              Toplam {files.length} dosya bulundu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.filename}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-lg">
                      <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{file.filename}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <HardDrive className="h-3 w-3" />
                          <span>{file.sizeFormatted}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(file.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDownload(file.filename)}
                      disabled={downloadingFile === file.filename}
                      size="sm"
                      variant="outline"
                    >
                      {downloadingFile === file.filename ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          İndiriliyor...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          İndir
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => handleDeleteClick(file.filename)}
                      disabled={deletingFile === file.filename}
                      size="sm"
                      variant="destructive"
                    >
                      {deletingFile === file.filename ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Single File Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dosyayı silmek istediğinizden emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{fileToDelete}</span> dosyası kalıcı olarak silinecektir. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Files Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Tüm dosyaları silmek istediğinizden emin misiniz?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{files.length} dosya</strong> kalıcı olarak silinecektir. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllConfirm} className="bg-red-600 hover:bg-red-700">
              Tümünü Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
