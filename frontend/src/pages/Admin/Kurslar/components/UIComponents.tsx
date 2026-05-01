import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, XCircle } from 'lucide-react';

interface ErrorAlertProps {
  error: string;
  className?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, className = "" }) => (
  <Alert className={`border-red-500 bg-red-50 ${className}`}>
    <XCircle className="h-4 w-4 text-red-600" />
    <AlertTitle className="text-red-800 font-semibold">Hata!</AlertTitle>
    <AlertDescription className="text-red-700">{error}</AlertDescription>
  </Alert>
);

interface LoadingSpinnerProps {
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ className = "" }) => (
  <div className={`flex justify-center my-8 ${className}`}>
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

interface EmptyStateProps {
  filterText: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ filterText, className = "" }) => (
  <div className={`text-center py-12 text-gray-500 ${className}`}>
    <div className="flex flex-col items-center space-y-3">
      <AlertTriangle className="h-12 w-12 text-gray-400" />
      <p className="text-lg font-medium">
        {filterText ? "Arama kriterlerine uygun kurs bulunamadı" : "Henüz kurs bulunmuyor"}
      </p>
      <p className="text-sm">
        {filterText ? "Farklı arama terimlerini deneyin" : "Yeni bir kurs ekleyerek başlayın"}
      </p>
    </div>
  </div>
);

export { ErrorAlert, LoadingSpinner, EmptyState };
