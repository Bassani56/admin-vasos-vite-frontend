import React, { Suspense, lazy, useEffect, useState } from "react";

import AdminPage from "./pages/admin/AdminPage.jsx";
import EditPage from "./pages/admin/EditPage.jsx";
import { Routes, Route } from "react-router-dom";
import Catalogo from "./pages/admin/Catalogo.jsx";
import Produto from "./pages/admin/Produto.jsx";


function App() {

  return (
    <>
        {/* <AdminPage/> */}
        <Routes>
          <Route path="/admin" element={ <AdminPage/> }/>
          <Route path="/" element={ <EditPage/> }/>

          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/produto/:id" element={<Produto />} />
            
          <Route path="*" element={<h1>404 - Página Não Encontrada</h1>} />
        </Routes>
    </>
  )
}

export default App
