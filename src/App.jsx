import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./components/AdminLayout.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import ProductList from "./pages/admin/ProductList.jsx";
import ProductEdit from "./pages/admin/ProductEdit.jsx";
import ProductCreate from "./pages/admin/ProductCreate.jsx";
import Catalogo from "./pages/admin/Catalogo.jsx";
import Produto from "./pages/admin/Produto.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <>
      <ToastContainer position="bottom-right" autoClose={3000} />
      <Routes>
        {/* Admin routes with sidebar layout */}
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="produtos" element={<ProductList />} />
          <Route path="produtos/novo" element={<ProductCreate />} />
          <Route path="produtos/:id/editar" element={<ProductEdit />} />
        </Route>

        {/* Preview routes (without sidebar) */}
        <Route path="/preview/catalogo" element={<Catalogo />} />
        <Route path="/preview/produto/:id" element={<Produto />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
