import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import "./dashboard.css";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${API_BASE_URL}/produtos`);
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.ativo !== false).length;
  const inactiveProducts = totalProducts - activeProducts;
  const withoutImage = products.filter(
    (p) => !p.imagem_geral || p.imagem_geral.length === 0
  ).length;
  const withoutVariants = products.filter(
    (p) => !p.variantes || p.variantes.length === 0
  ).length;

  const recentProducts = [...products]
    .sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
      const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
      return dateB - dateA;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Visão geral dos seus produtos</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📦</span>
          <div className="stat-info">
            <span className="stat-value">{totalProducts}</span>
            <span className="stat-label">Total de Produtos</span>
          </div>
        </div>
        <div className="stat-card stat-success">
          <span className="stat-icon">✅</span>
          <div className="stat-info">
            <span className="stat-value">{activeProducts}</span>
            <span className="stat-label">Ativos</span>
          </div>
        </div>
        <div className="stat-card stat-warning">
          <span className="stat-icon">⏸</span>
          <div className="stat-info">
            <span className="stat-value">{inactiveProducts}</span>
            <span className="stat-label">Inativos</span>
          </div>
        </div>
        <div className="stat-card stat-danger">
          <span className="stat-icon">⚠️</span>
          <div className="stat-info">
            <span className="stat-value">{withoutImage + withoutVariants}</span>
            <span className="stat-label">Incompletos</span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {(withoutImage > 0 || withoutVariants > 0) && (
        <div className="dashboard-warnings">
          <h3>Atenção</h3>
          {withoutImage > 0 && (
            <div className="warning-item">
              🖼️ <strong>{withoutImage}</strong> produto(s) sem imagem
            </div>
          )}
          {withoutVariants > 0 && (
            <div className="warning-item">
              📋 <strong>{withoutVariants}</strong> produto(s) sem variantes (podem quebrar no site)
            </div>
          )}
        </div>
      )}

      {/* Recent Products */}
      <div className="dashboard-recent">
        <div className="recent-header">
          <h3>Últimas Edições</h3>
          <button className="btn-link" onClick={() => navigate("/produtos")}>
            Ver todos →
          </button>
        </div>
        <div className="recent-list">
          {recentProducts.map((product) => (
            <div
              key={product._id || product.id}
              className="recent-item"
              onClick={() =>
                navigate(`/produtos/${product._id || product.id}/editar`)
              }
            >
              <div className="recent-img">
                {product.imagem_geral?.[0]?.url ? (
                  <img src={product.imagem_geral[0].url} alt="" />
                ) : (
                  <div className="recent-img-placeholder" />
                )}
              </div>
              <div className="recent-info">
                <span className="recent-title">{product.titulo_geral}</span>
                <span className="recent-meta">
                  {product.variantes?.length || 0} variantes •{" "}
                  {product.ativo !== false ? "Ativo" : "Inativo"}
                </span>
              </div>
              <span className="recent-arrow">→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
