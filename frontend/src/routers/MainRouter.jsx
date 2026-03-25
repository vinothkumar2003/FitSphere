import { Suspense, lazy } from "react";
import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { AdminLayout } from "./layouts/AdminLayout";
import { TrainerLayout } from "./layouts/TrainerLayout";
import { ClientLayout } from "./layouts/ClientLayout";
import PageTitle from "../components/PageTitle";

const HomePage = lazy(() => import("../pages/public/HomePage"));
const LoginPage = lazy(() => import("../pages/public/LoginPage"));
const OtpVerifyPage = lazy(() => import("../pages/public/OtpVerifyPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const GymEquipmentPage = lazy(() => import("../pages/GymEquipmentPage"));
const GymPlansPage = lazy(() => import("../pages/GymPlansPage"));
const CreateGymPlanPage = lazy(() => import("../pages/CreateGymPlanPage"));
const AdminMyPlansPage = lazy(() => import("../pages/AdminMyPlansPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const PlanBookingPage = lazy(() => import("../pages/PlanBookingPage"));
const ClientBookingsPage = lazy(() => import("../pages/ClientBookingsPage"));
const UsersPage = lazy(() => import("../pages/UsersPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const DietFoodPage = lazy(() => import("../pages/DietFoodPage"));
const AdminBookingRequestsPage = lazy(() => import("../pages/AdminBookingRequestsPage"));
const AdminFinancePage = lazy(() => import("../pages/AdminFinancePage"));
const WorkDonePage = lazy(() => import("../pages/WorkDonePage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));

const loadingFallback = (
  <main className="gym-plans-page">
    <div
      style={{
        maxWidth:"100vw",height:"100vh",display: "flex",alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
        padding: 24,
        background: "#ffffff",
        borderRadius: 20,
        boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
        color: "#475569",
      }}
    >
      Loading page...
    </div>
  </main>
);

const withSuspense = (element) => <Suspense fallback={loadingFallback}>{element}</Suspense>;
const withTitle = (title, element) =>
  withSuspense(
    <>
      <PageTitle title={title} />
      {element}
    </>
  );

const adminRoutes = [
  { index: true, title: "Dashboard", element: <DashboardPage /> },
  { path: "gymplans", title: "Gym Plans", element: <GymPlansPage /> },
  { path: "gymplans/create", title: "Create Gym Plan", element: <CreateGymPlanPage /> },
  { path: "myplans", title: "My Plans", element: <AdminMyPlansPage /> },
  { path: "booking-requests", title: "Booking Requests", element: <AdminBookingRequestsPage /> },
  { path: "finance", title: "Finance", element: <AdminFinancePage /> },
  { path: "workdone", title: "Work Done", element: <WorkDonePage /> },
  { path: "settings", title: "Settings", element: <SettingsPage /> },
  { path: "users", title: "Users", element: <UsersPage /> },
  { path: "profile", title: "Profile", element: <ProfilePage /> },
  { path: "gym-equipment", title: "Gym Equipment", element: <GymEquipmentPage /> },
  { path: "dietfoot", title: "Diet Food", element: <DietFoodPage /> },
];

const trainerRoutes = [
  { index: true, title: "Dashboard", element: <DashboardPage /> },
  { path: "gymplans", title: "Gym Plans", element: <GymPlansPage /> },
  { path: "users", title: "Users", element: <UsersPage /> },
  { path: "workdone", title: "Work Done", element: <WorkDonePage /> },
  { path: "settings", title: "Settings", element: <SettingsPage /> },
  { path: "profile", title: "Profile", element: <ProfilePage /> },
  { path: "gym-equipment", title: "Gym Equipment", element: <GymEquipmentPage /> },
  { path: "dietfoot", title: "Diet Food", element: <DietFoodPage /> },
];

const clientRoutes = [
  { index: true, title: "Dashboard", element: <DashboardPage /> },
  { path: "gymplans", title: "Gym Plans", element: <GymPlansPage /> },
  { path: "plan-booking/:planId", title: "Plan Booking", element: <PlanBookingPage /> },
  { path: "bookings", title: "My Bookings", element: <ClientBookingsPage /> },
  { path: "gym-equipment", title: "Gym Equipment", element: <GymEquipmentPage /> },
  { path: "dietfoot", title: "Diet Food", element: <DietFoodPage /> },
  { path: "settings", title: "Settings", element: <SettingsPage /> },
  { path: "profile", title: "Profile", element: <ProfilePage /> },
];

const renderChildRoutes = (routes) =>
  routes.map((route) => (
    <Route
      key={route.path || "index"}
      index={route.index}
      path={route.path}
      element={withTitle(route.title, route.element)}
    />
  ));

const MainRouter = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={withTitle("FitSphere", <HomePage title="FitSphere" />)} />
        <Route path="login" element={withTitle("Login", <LoginPage title="Login" />)} />
        <Route path="otpverify" element={withTitle("Otpverify", <OtpVerifyPage title="Otpverify" />)} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          {renderChildRoutes(adminRoutes)}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["TRAINER"]} />}>
        <Route path="/trainer" element={<TrainerLayout />}>
          {renderChildRoutes(trainerRoutes)}
          <Route path="*" element={<Navigate to="/trainer" replace />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["CLIENT"]} />}>
        <Route path="/client" element={<ClientLayout />}>
          {renderChildRoutes(clientRoutes)}
          <Route path="*" element={<Navigate to="/client" replace />} />
        </Route>
      </Route>

      <Route path="*" element={withSuspense(<NotFoundPage />)} />
    </>
  )
);

export default MainRouter;
