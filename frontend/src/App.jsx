import {
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProductUpload from "./pages/ProductUpload";
import ProductList from "./pages/ProductList";
import AdminApprovals from "./pages/AdminApprovals";
import StaffManagement from "./pages/StaffManagement";
import AISearch from "./pages/AISearch";
import GmailInbox from "./pages/GmailInbox";
import KnowledgeBase from "./pages/KnowledgeBase";

export default function App() {
  return (
    <Routes>
      {/* Homepage: redirect to login */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* Public Route */}
      <Route
        path="/login"
        element={<Login />}
      />

      {/* Protected Routes - Admin and Staff */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/products/new"
            element={<ProductUpload />}
          />

          <Route
            path="/products"
            element={<ProductList />}
          />

          <Route
            path="/ai-search"
            element={<AISearch />}
          />

          <Route
              path="/knowledge"
              element={<KnowledgeBase />}
          />

          <Route
            path="/gmail-inbox"
            element={<GmailInbox />}
          />

          {/* Admin Only Routes */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route
              path="/approvals"
              element={<AdminApprovals />}
            />

            <Route
              path="/staff"
              element={<StaffManagement />}
            />
          </Route>
        </Route>
      </Route>

      {/* Redirect Unknown Routes */}
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}
