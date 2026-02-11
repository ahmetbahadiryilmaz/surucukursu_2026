import { useEffect, useState } from 'react';
import { apiService } from '@/services/api-service';

interface MebbisCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolCode: string;
  onSuccess?: (code: string) => Promise<void> | void;
  onError?: (error: string) => void;
}

export const MebbisCodeModal = ({
  isOpen,
  onClose,
  schoolCode,
  onSuccess,
  onError,
}: MebbisCodeModalProps) => {
  const [ajandasKodu, setAjandasKodu] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("📱 MebbisCodeModal - isOpen:", isOpen);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ajandasKodu.trim()) {
      setError('MEBBIS AJANDA KODUNU giriniz');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSuccess?.(ajandasKodu.trim());
      setAjandasKodu('');
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-8">
        {/* Large Loading Indicator */}
        {loading && (
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative w-20 h-20 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          MEBBIS AJANDA KODU
        </h2>
        <p className="text-center text-gray-600 text-sm mb-6">
          Oturumunuz süresi dolmuş. MEBBIS AJANDA KODUNU giriniz.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={ajandasKodu}
              onChange={(e) => {
                setAjandasKodu(e.target.value);
                setError(null);
              }}
              placeholder="AJANDA KODUNU GİRİN"
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100 text-center text-lg font-semibold tracking-widest"
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !ajandasKodu.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium transition"
            >
              {loading ? 'Yükleniyor...' : 'Onayla'}
            </button>
          </div>
        </form>

        {/* Info Text */}
        <p className="text-center text-xs text-gray-500 mt-6">
          MEBBIS web sitesinde görünen AJANDA KODUNU buraya yapıştırın
        </p>
      </div>
    </div>
  );
};
