import { Button } from "@/components/ui/button";
import { Download, X, FileText, AlertCircle } from "lucide-react";
import { apiService } from "@/services/api-service";

interface CompletedDownload {
  id: number | string;
  studentId: number;
  type: string;
  filename: string;
  date: string;
}

interface OngoingJob {
  jobId: string;
  studentId: number;
  type: string;
  progress: number;
  message: string;
  startTime: Date;
}

interface FailedJob {
  jobId: string;
  studentId: number;
  type: string;
  errorMessage: string;
  timestamp: Date;
}

interface FileInfo {
  filename: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  modifiedAt: string;
  type: string;
}

interface DownloadsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  completedDownloads: CompletedDownload[];
  onRemoveDownload: (index: number) => void;
  onClearDownloads: () => void;
  ongoingJobs: OngoingJob[];
  failedJobs: FailedJob[];
  onRemoveFailedJob: (index: number) => void;
  onClearFailedJobs: () => void;
  myFiles: FileInfo[];
  loadingFiles: boolean;
  activeDrivingSchoolId?: number;
}

export default function DownloadsSidebar({
  isOpen,
  onClose,
  completedDownloads,
  onRemoveDownload,
  onClearDownloads,
  ongoingJobs,
  failedJobs,
  onRemoveFailedJob,
  onClearFailedJobs,
  myFiles,
  loadingFiles,
  activeDrivingSchoolId
}: DownloadsSidebarProps) {
  const handleFileDownload = async (filename: string) => {
    if (!activeDrivingSchoolId) return;
    try {
      const blob = await apiService.files.downloadFile(
        activeDrivingSchoolId.toString(),
        filename
      );
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
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Top Half: Downloads Section */}
          <div className="h-1/2 border-b border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                İndirilen Dosyalar
              </h3>
              <div className="flex gap-2 items-center">
                {(completedDownloads.length > 0 || failedJobs.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onClearDownloads();
                      onClearFailedJobs();
                    }}
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-1"
                  >
                    Temizle
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {/* Ongoing Jobs Section */}
              {ongoingJobs.length > 0 && (
                <div className="pb-3 mb-3 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Devam Eden İndirmeler ({ongoingJobs.length})
                  </h4>
                  <div className="space-y-2">
                    {ongoingJobs.map((job) => (
                      <div key={job.jobId} className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            <Download size={14} className="text-blue-500" />
                            <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                              Öğrenci {job.studentId}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {job.progress}%
                          </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-in-out"
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {job.message}
                        </p>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {job.startTime.toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Jobs Section */}
              {failedJobs.length > 0 && (
                <div className="pb-3 mb-3 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-medium text-red-600 dark:text-red-400 mb-2">
                    Başarısız İşlemler ({failedJobs.length})
                  </h4>
                  <div className="space-y-2">
                    {failedJobs.map((job, index) => (
                      <div key={`failed-${job.jobId}-${index}`} className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center space-x-2 flex-1">
                            <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-gray-900 dark:text-gray-100 text-xs block">
                                Öğrenci {job.studentId}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({job.type})
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => onRemoveFailedJob(index)}
                            className="h-5 w-5 flex-shrink-0"
                          >
                            <X className="h-3 w-3 text-gray-500" />
                          </Button>
                        </div>
                        
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {job.errorMessage}
                        </p>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {job.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Downloads Section */}
              {completedDownloads.length > 0 ? (
                completedDownloads.map((download, index) => (
                  <div
                    key={`${download.studentId}-${download.type}-${index}`}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-xs truncate">{download.filename}</p>
                        <p className="text-xs text-gray-500">{download.type}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onRemoveDownload(index)}
                        className="h-6 w-6"
                      >
                        <X className="h-3 w-3 text-gray-500" />
                      </Button>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {download.date}
                    </div>
                  </div>
                ))
              ) : ongoingJobs.length === 0 && failedJobs.length === 0 ? (
                <p className="text-center text-gray-500 text-xs">Henüz indirilen dosya yok</p>
              ) : null}
            </div>
          </div>

          {/* Bottom Half: Dosyalarım Section */}
          <div className="h-1/2 p-4 overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-500 dark:text-green-400" />
                Dosyalarım
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose} 
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="flex-1 space-y-2">
              {loadingFiles ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : myFiles.length > 0 ? (
                myFiles.map((file, index) => (
                  <div
                    key={index}
                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-md hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleFileDownload(file.filename)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{file.filename}</p>
                        <p className="text-xs text-gray-500">{file.sizeFormatted}</p>
                      </div>
                      <Download className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 text-xs mt-8">Henüz dosya yok</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40" 
          onClick={onClose}
        />
      )}
    </>
  );
}
