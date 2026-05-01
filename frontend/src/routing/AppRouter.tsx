import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@/routing/AppRoutes";
import { ToastConfig } from "@/components/ToastConfig";

export const AppRouter = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppRoutes />
      <ToastConfig />
    </BrowserRouter>
  );
};
