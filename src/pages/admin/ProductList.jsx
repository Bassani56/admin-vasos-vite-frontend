import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import { toast } from "react-toastify";
import "./productlist.css";

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, inactive
  const [filterCategory, setFilterCategory] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [savingOrder, setSavingOrder] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch(`${API_BASE_URL}/produtos`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : [data];
      items.sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity));
      setProducts(items);
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }

  // All unique categories
  const allCategories = [
    ...new Set(products.flatMap((p) => p.categorias || [])),
  ].sort();

  // Filter products
  const filtered = products.filter((p) => {
    const matchSearch = p.titulo_geral
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && p.ativo !== false) ||
      (filterStatus === "inactive" && p.ativo === false);
    const matchCategory =
      !filterCategory || (p.categorias || []).includes(filterCategory);
    return matchSearch && matchStatus && matchCategory;
  });

  const getId = (p) => p._id || p.id;

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(getId)));
    }
  }

  // Bulk toggle active/inactive
  async function bulkToggleStatus(active) {
    const ids = Array.from(selected);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`${API_BASE_URL}/produto/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ativo: active }),
          })
        )
      );
      setProducts((prev) =>
        prev.map((p) =>
          ids.includes(getId(p)) ? { ...p, ativo: active } : p
        )
      );
      setSelected(new Set());
      toast.success(
        `${ids.length} produto(s) ${active ? "ativado(s)" : "desativado(s)"}`
      );
    } catch (err) {
      toast.error("Erro ao atualizar produtos");
    }
  }

  // Single product toggle
  async function toggleProduct(product) {
    const id = getId(product);
    const newStatus = product.ativo === false ? true : false;
    try {
      await fetch(`${API_BASE_URL}/produto/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: newStatus }),
      });
      setProducts((prev) =>
        prev.map((p) => (getId(p) === id ? { ...p, ativo: newStatus } : p))
      );
      toast.success(
        `Produto ${newStatus ? "ativado" : "desativado"}`
      );
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  }

  // Change order
  async function handleChangeOrdem(productId, novaOrdem) {
    const novaOrdemNum = Number(novaOrdem);
    if (isNaN(novaOrdemNum)) return;

    setSavingOrder(true);
    try {
      await fetch(`${API_BASE_URL}/produto/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordem: novaOrdemNum }),
      });
      setProducts((prev) => {
        const updated = prev.map((p) =>
          getId(p) === productId ? { ...p, ordem: novaOrdemNum } : p
        );
        return updated.sort(
          (a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity)
        );
      });
    } catch (err) {
      toast.error("Erro ao salvar ordem");
    } finally {
      setSavingOrder(false);
    }
  }

  // Duplicate product
  async function duplicateProduct(product) {
    const { _id, id, ...rest } = product;
    const newProduct = {
      ...rest,
      titulo_geral: `${product.titulo_geral} (cópia)`,
      ativo: false,
    };
    try {
      const res = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setProducts((prev) => [...prev, created]);
      toast.success("Produto duplicado! Ele está inativo.");
      navigate(`/produtos/${getId(created)}/editar`);
    } catch (err) {
      toast.error("Erro ao duplicar produto");
    }
  }

  function getImage(product) {
    if (product.imagem_geral?.length > 0) return product.imagem_geral[0].url;
    if (product.imagens_por_cor?.[0]?.imagens?.[0]?.url)
      return product.imagens_por_cor[0].imagens[0].url;
    return null;
  }

  function getPrice(product) {
    if (!product.variantes?.length) return "—";
    const prices = product.variantes
      .map((v) => Number(v.preco || 0))
      .filter((p) => p > 0);
    if (!prices.length) return "—";
    return `R$ ${Math.min(...prices).toFixed(2).replace(".", ",")}`;
  }

  if (loading) {
    return (
      <div className="product-list-page">
        <div className="pl-loading">Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div className="product-list-page">
      {/* Header */}
      <div className="pl-header">
        <div>
          <h1>Produtos</h1>
          <p className="pl-subtitle">{totalCount()} produto(s) encontrado(s)</p>
        </div>
        <button
          className="pl-btn-primary"
          onClick={() => navigate("/produtos/novo")}
        >
          + Novo Produto
        </button>
      </div>

      {/* Filters */}
      <div className="pl-filters">
        <input
          type="text"
          placeholder="Buscar por nome..."
          className="pl-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="pl-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <select
          className="pl-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Todas categorias</option>
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="pl-bulk-bar">
          <span>{selected.size} selecionado(s)</span>
          <button onClick={() => bulkToggleStatus(true)}>Ativar</button>
          <button onClick={() => bulkToggleStatus(false)}>Desativar</button>
          <button onClick={() => setSelected(new Set())}>Limpar seleção</button>
        </div>
      )}

      {/* Saving order indicator */}
      {savingOrder && <div className="pl-saving">Salvando ordem...</div>}

      {/* Product Table */}
      <div className="pl-table-container">
        <table className="pl-table">
          <thead>
            <tr>
              <th className="pl-th-check">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && selected.size === filtered.length
                  }
                  onChange={selectAll}
                />
              </th>
              <th>Produto</th>
              <th>Preço</th>
              <th>Categorias</th>
              <th>Ordem</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((product) => {
              const id = getId(product);
              const img = getImage(product);
              return (
                <tr key={id} className={selected.has(id) ? "selected" : ""}>
                  <td className="pl-td-check">
                    <input
                      type="checkbox"
                      checked={selected.has(id)}
                      onChange={() => toggleSelect(id)}
                    />
                  </td>
                  <td>
                    <div className="pl-product-cell">
                      <div className="pl-product-img">
                        {img ? (
                          <img src={img} alt="" />
                        ) : (
                          <div className="pl-img-placeholder" />
                        )}
                      </div>
                      <div className="pl-product-info">
                        <span className="pl-product-name">
                          {product.titulo_geral}
                        </span>
                        <span className="pl-product-variants">
                          {product.variantes?.length || 0} variante(s)
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="pl-td-price">{getPrice(product)}</td>
                  <td className="pl-td-categories">
                    {(product.categorias || []).slice(0, 2).map((cat) => (
                      <span key={cat} className="pl-tag">
                        {cat}
                      </span>
                    ))}
                  </td>
                  <td className="pl-td-order">
                    <input
                      type="number"
                      className="pl-order-input"
                      defaultValue={product.ordem ?? ""}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val !== product.ordem) {
                          handleChangeOrdem(id, val);
                        }
                      }}
                    />
                  </td>
                  <td>
                    <button
                      className={`pl-toggle ${product.ativo !== false ? "active" : "inactive"}`}
                      onClick={() => toggleProduct(product)}
                    >
                      <span className="pl-toggle-knob" />
                    </button>
                  </td>
                  <td>
                    <div className="pl-actions">
                      <button
                        className="pl-action-btn"
                        title="Editar"
                        onClick={() => navigate(`/produtos/${id}/editar`)}
                      >
                        ✏️
                      </button>
                      <button
                        className="pl-action-btn"
                        title="Duplicar"
                        onClick={() => duplicateProduct(product)}
                      >
                        📋
                      </button>
                      <a
                        className="pl-action-btn"
                        title="Preview"
                        href={`/preview/produto/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        👁
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  function totalCount() {
    return filtered.length;
  }
}
