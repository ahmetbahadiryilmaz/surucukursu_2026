import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from "@/components/providers/ThemeProvider";

export const ToastConfig = () => {
  const { theme } = useTheme();

  // Tema durumunu basit şekilde belirle
  const getToastTheme = () => {
    // Dark tema ise dark
    if (theme === "dark") {
      return "dark";
    }
    
    // System tema ise DOM'dan kontrol et
    if (theme === "system") {
      const isDark = document.documentElement.classList.contains('dark');
      return isDark ? "dark" : "dark"; // Light modda da dark kullan
    }
    
    // Light tema - dark kullan ki okunabilir olsun
    return "dark";
  };

  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={getToastTheme() as "light" | "dark" | "colored"}
      style={{ 
        zIndex: 99999,
        top: '80px'
      }}
    />
  );
};
