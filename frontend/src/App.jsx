import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth, homeFor } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import SellerDashboard from './pages/seller/SellerDashboard.jsx';
import VehicleForm from './pages/seller/VehicleForm.jsx';
import VehicleDetails from './pages/seller/VehicleDetails.jsx';
import InspectionQueue from './pages/evaluator/InspectionQueue.jsx';
import InspectionForm from './pages/evaluator/InspectionForm.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import InventoryManagement from './pages/admin/InventoryManagement.jsx';
import Marketplace from './pages/buyer/Marketplace.jsx';
import VehicleDetailsPage from './pages/buyer/VehicleDetailsPage.jsx';

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/seller" element={<ProtectedRoute roles={['seller']}><SellerDashboard /></ProtectedRoute>} />
        <Route path="/seller/new" element={<ProtectedRoute roles={['seller']}><VehicleForm /></ProtectedRoute>} />
        <Route path="/seller/vehicles/:id" element={<ProtectedRoute roles={['seller']}><VehicleDetails /></ProtectedRoute>} />
        <Route path="/evaluator" element={<ProtectedRoute roles={['evaluator']}><InspectionQueue /></ProtectedRoute>} />
        <Route path="/evaluator/inspections/:id" element={<ProtectedRoute roles={['evaluator']}><InspectionForm /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/inventory" element={<ProtectedRoute roles={['admin']}><InventoryManagement /></ProtectedRoute>} />
        <Route path="/marketplace/vehicles/:id" element={<ProtectedRoute roles={['buyer']}><VehicleDetailsPage /></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute roles={['buyer']}><Marketplace /></ProtectedRoute>} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
