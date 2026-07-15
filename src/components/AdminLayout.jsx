import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import "./AdminLayout.css";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`admin-layout${collapsed ? " collapsed" : ""}`}>
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">Casa do Oleiro</h1>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className="nav-item">
            <span className="nav-icon">📊</span>
            <span className="nav-label">Dashboard</span>
          </NavLink>
          <NavLink to="/produtos" className="nav-item">
            <span className="nav-icon">📦</span>
            <span className="nav-label">Produtos</span>
          </NavLink>
          <NavLink to="/produtos/novo" className="nav-item">
            <span className="nav-icon">➕</span>
            <span className="nav-label">Novo Produto</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <a
            href="/preview/catalogo"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item preview-link"
          >
            <span className="nav-icon">👁</span>
            <span className="nav-label">Preview do Site</span>
          </a>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
