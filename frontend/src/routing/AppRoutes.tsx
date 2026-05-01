import { Routes, Route } from "react-router-dom";
import { default as AdminLayout } from "@/pages/Admin/Layout";
import { default as DrivingSchoolLayout } from "@/pages/DrivingSchool/Layout";
import LoginPage from "@/pages/(Auth)/Login";
import Logout from "@/pages/(Auth)/Logout";
import ProtectedRoute from "@/routing/guards/ProtectedRoute";
import { UserTypes } from "@/shared/enums";

// Clean wrapper components for protected routes
const AdminRoute = () => (
  <ProtectedRoute allowedRole={[UserTypes.ADMIN, UserTypes.SUPER_ADMIN]}>
    <AdminLayout />
  </ProtectedRoute>
);

const DrivingSchoolRoute = () => (
  <ProtectedRoute allowedRole={[UserTypes.DRIVING_SCHOOL_OWNER, UserTypes.DRIVING_SCHOOL_MANAGER]}>
    <DrivingSchoolLayout />
  </ProtectedRoute>
);

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/admin/*" element={<AdminRoute />} />
      <Route path="/driving-school/*" element={<DrivingSchoolRoute />} />
      <Route path="/logout" element={<Logout />} />
    </Routes>
  );
};
