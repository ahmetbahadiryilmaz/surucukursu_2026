import React from 'react';
import { useSocketContext } from '@/components/contexts/SocketContext';

const SocketDisconnectModal: React.FC = () => {
  const { isDisconnected, disconnectReason, connect } = useSocketContext();

  if (!isDisconnected) {
    return null;
  }

  const handleReconnect = async () => {
    if (disconnectReason === 'token_expired') {
      // For token expired, redirect to login instead of trying to reconnect
      window.location.href = '/';
      return;
    }

    try {
      await connect();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  };

  const getModalContent = () => {
    switch (disconnectReason) {
      case 'token_expired':
        return {
          icon: (
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          ),
          title: 'Oturum Süresi Doldu',
          message: 'Güvenlik nedeniyle oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
          buttonText: 'Giriş Sayfasına Git',
          showReconnectButton: false
        };

      case 'network':
      default:
        return {
          icon: (
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          ),
          title: 'Bağlantı Kesildi',
          message: 'Sunucuyla bağlantınız kesildi. Lütfen yeniden bağlanmak için aşağıdaki butona tıklayın.',
          buttonText: 'Yeniden Bağlan',
          showReconnectButton: true
        };
    }
  };

  const content = getModalContent();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              {content.icon}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {content.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {content.message}
          </p>
          <button
            onClick={handleReconnect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            {content.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocketDisconnectModal;