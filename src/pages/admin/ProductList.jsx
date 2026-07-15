import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import { toast } from "react-toastify";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./productlist.css";

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [savingOrder, setSavingOrder] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  const allCategories = [
    ...new Set(products.flatMap((p) => p.categorias || [])),
  ].sort();

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

  // Drag and drop reorder
  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filtered.findIndex((p) => getId(p) === active.id);
    const newIndex = filtered.findIndex((p) => getId(p) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder locally
    const reordered = arrayMove(filtered, oldIndex, newIndex);

    // Assign new ordem values based on position
    const updates = reordered.map((p, idx) => ({
      ...p,
      ordem: idx + 1,
    }));

    // Update full products list
    setProducts((prev) => {
      const updatedMap = new Map(updates.map((p) => [getId(p), p]));
      return prev
        .map((p) => updatedMap.get(getId(p)) || p)
        .sort((a, b) => (a.ordem ?? Infinity) - (b.ordem ?? Infinity));
    });

    // Save to backend
    setSavingOrder(true);
    try {
      await Promise.all(
        updates.map((p) =>
          fetch(`${API_BASE_URL}/produto/${getId(p)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ordem: p.ordem }),
          })
        )
      );
      toast.success("Ordem atualizada!");
    } catch (err) {
      toast.error("Erro ao salvar nova ordem");
    } finally {
      setSavingOrder(false);
    }
  }

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
      toast.success(`Produto ${newStatus ? "ativado" : "desativado"}`);
    } catch (err) {
      toast.error("Erro ao atualizar status");
    }
  }

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
          <p className="pl-subtitle">{filtered.length} produto(s) encontrado(s)</p>
        </div>
        <div className="pl-header-right">
          <div className="pl-view-toggle">
            <button
              className={`pl-view-btn${viewMode === "grid" ? " active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Visualização em grid (arrastar para reordenar)"
            >
              ▦
            </button>
            <button
              className={`pl-view-btn${viewMode === "table" ? " active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Visualização em tabela"
            >
              ≡
            </button>
          </div>
          <button
            className="pl-btn-primary"
            onClick={() => navigate("/produtos/novo")}
          >
            + Novo Produto
          </button>
        </div>
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

      {savingOrder && <div className="pl-saving">Salvando ordem...</div>}

      {/* Grid View (drag and drop) */}
      {viewMode === "grid" && (
        <div className="pl-grid-hint">
          💡 Arraste os cards para reordenar. A ordem é salva automaticamente.
        </div>
      )}

      {viewMode === "grid" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filtered.map(getId)}
            strategy={rectSortingStrategy}
          >
            <div className="pl-grid">
              {filtered.map((product) => (
                <SortableProductCard
                  key={getId(product)}
                  product={product}
                  id={getId(product)}
                  getImage={getImage}
                  getPrice={getPrice}
                  onEdit={() => navigate(`/produtos/${getId(product)}/editar`)}
                  onToggle={() => toggleProduct(product)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        /* Table View */
        <div className="pl-table-container">
          <table className="pl-table">
            <thead>
              <tr>
                <th className="pl-th-check">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
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
                          {img ? <img src={img} alt="" /> : <div className="pl-img-placeholder" />}
                        </div>
                        <div className="pl-product-info">
                          <span className="pl-product-name">{product.titulo_geral}</span>
                          <span className="pl-product-variants">
                            {product.variantes?.length || 0} variante(s)
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="pl-td-price">{getPrice(product)}</td>
                    <td className="pl-td-categories">
                      {(product.categorias || []).slice(0, 2).map((cat) => (
                        <span key={cat} className="pl-tag">{cat}</span>
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
                        <button className="pl-action-btn" title="Editar" onClick={() => navigate(`/produtos/${id}/editar`)}>✏️</button>
                        <button className="pl-action-btn" title="Duplicar" onClick={() => duplicateProduct(product)}>📋</button>
                        <a className="pl-action-btn" title="Preview" href={`/preview/produto/${id}`} target="_blank" rel="noopener noreferrer">👁</a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Sortable Product Card ────────────────────────────── */
function SortableProductCard({ product, id, getImage, getPrice, onEdit, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 100 : 1,
    scale: isDragging ? "1.03" : "1",
  };

  const img = getImage(product);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`pl-grid-card${isDragging ? " dragging" : ""}${product.ativo === false ? " inactive" : ""}`}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle indicator */}
      <div className="pl-grid-card-drag">⠿</div>

      {/* Order badge */}
      <div className="pl-grid-card-order">{product.ordem ?? "—"}</div>

      {/* Image */}
      <div className="pl-grid-card-img">
        {img ? <img src={img} alt="" draggable={false} /> : <div className="pl-grid-card-img-placeholder" />}
      </div>

      {/* Info */}
      <div className="pl-grid-card-body">
        <h4 className="pl-grid-card-title">{product.titulo_geral}</h4>
        <span className="pl-grid-card-price">{getPrice(product)}</span>
        <div className="pl-grid-card-meta">
          <span className={`pl-grid-card-status ${product.ativo !== false ? "active" : "inactive"}`}>
            {product.ativo !== false ? "Ativo" : "Inativo"}
          </span>
          <span className="pl-grid-card-variants">
            {product.variantes?.length || 0} var.
          </span>
        </div>
      </div>

      {/* Actions (stop propagation to prevent drag) */}
      <div className="pl-grid-card-actions" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={onEdit} title="Editar">✏️</button>
        <button onClick={onToggle} title={product.ativo !== false ? "Desativar" : "Ativar"}>
          {product.ativo !== false ? "⏸" : "▶"}
        </button>
      </div>
    </div>
  );
}
