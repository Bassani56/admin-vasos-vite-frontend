import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import { toast } from "react-toastify";
import ImageManager from "../../components/ImageManager.jsx";
import "./productedit.css";

export default function ProductCreate() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  // Form state
  const [product, setProduct] = useState({
    titulo_geral: "",
    descricao: "",
    categorias: [],
    imagem_geral: [],
    imagens_por_cor: [],
    variantes: [],
    ativo: true,
    novidade: false,
    personalizavel: false,
    ordem: null,
    codigo: "",
  });

  // Available options from DB
  const [availableCategorias, setAvailableCategorias] = useState([]);
  const [availableCores, setAvailableCores] = useState([]);

  useEffect(() => {
    async function loadForms() {
      try {
        const res = await fetch(`${API_BASE_URL}/forms`);
        const data = await res.json();
        const form = data[0];
        setAvailableCategorias(form?.categorias || []);
        setAvailableCores(form?.cores || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadForms();
  }, []);

  function updateField(field, value) {
    setProduct((prev) => ({ ...prev, [field]: value }));
  }

  function addCategory(cat) {
    if (!cat.trim() || product.categorias.includes(cat)) return;
    setProduct((prev) => ({ ...prev, categorias: [...prev.categorias, cat] }));
  }

  function removeCategory(index) {
    setProduct((prev) => ({
      ...prev,
      categorias: prev.categorias.filter((_, i) => i !== index),
    }));
  }

  function updateVariant(index, field, value) {
    setProduct((prev) => {
      const newV = [...prev.variantes];
      newV[index] = { ...newV[index], [field]: value };
      return { ...prev, variantes: newV };
    });
  }

  function addVariant() {
    setProduct((prev) => ({
      ...prev,
      variantes: [
        ...prev.variantes,
        {
          id: `new-${Date.now()}`,
          acabamento: "",
          tamanho: "",
          dimensoes: { altura: 0, largura: 0 },
          preco: 0,
        },
      ],
    }));
  }

  function duplicateVariant(index) {
    setProduct((prev) => {
      const source = prev.variantes[index];
      const copy = {
        ...source,
        id: `copy-${Date.now()}`,
        dimensoes: { ...source.dimensoes },
      };
      const newVariantes = [...prev.variantes];
      newVariantes.splice(index + 1, 0, copy);
      return { ...prev, variantes: newVariantes };
    });
    toast.success("Variante duplicada!");
  }

  function removeVariant(index) {
    setProduct((prev) => ({
      ...prev,
      variantes: prev.variantes.filter((_, i) => i !== index),
    }));
  }

  function updateImages(field, images) {
    if (field === "imagem_geral") {
      setProduct((prev) => ({ ...prev, imagem_geral: images }));
    } else {
      setProduct((prev) => {
        const bucketIdx = prev.imagens_por_cor.findIndex((b) => b.cor === field);
        let newBuckets = [...prev.imagens_por_cor];
        if (bucketIdx >= 0) {
          newBuckets[bucketIdx] = { ...newBuckets[bucketIdx], imagens: images };
        } else {
          newBuckets.push({ cor: field, imagens: images });
        }
        return { ...prev, imagens_por_cor: newBuckets };
      });
    }
  }

  async function handleSave() {
    if (!product.titulo_geral?.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (product.variantes.length === 0) {
      toast.warn("Recomendado adicionar pelo menos 1 variante");
    }

    setSaving(true);
    try {
      // Auto-generate codigo from timestamp if not set
      const productToSave = {
        ...product,
        codigo: product.codigo || String(Date.now()).slice(-6),
      };

      const res = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productToSave),
      });

      if (!res.ok) throw new Error("Erro ao salvar");

      const created = await res.json();
      toast.success("Produto criado com sucesso!");
      navigate(`/produtos/${created._id || created.id}/editar`);
    } catch (err) {
      toast.error("Erro ao criar produto");
    } finally {
      setSaving(false);
    }
  }

  const imageTypes = [
    ...new Set(
      product.variantes.map((v) => v.acabamento || "").filter(Boolean)
    ),
  ];

  return (
    <div className="pe-page">
      {/* Header */}
      <div className="pe-header">
        <div>
          <button className="pe-back" onClick={() => navigate("/produtos")}>
            ← Voltar
          </button>
          <h1>Novo Produto</h1>
        </div>
        <div className="pe-header-actions">
          <button className="pe-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Criando..." : "Criar Produto"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="pe-tabs">
        <button
          className={`pe-tab${activeTab === "info" ? " active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          Informações
        </button>
        <button
          className={`pe-tab${activeTab === "images" ? " active" : ""}`}
          onClick={() => setActiveTab("images")}
        >
          Imagens
        </button>
        <button
          className={`pe-tab${activeTab === "variants" ? " active" : ""}`}
          onClick={() => setActiveTab("variants")}
        >
          Variantes & Preços
        </button>
      </div>

      {/* Tab Content */}
      <div className="pe-content">
        {activeTab === "info" && (
          <TabInfoCreate
            product={product}
            updateField={updateField}
            addCategory={addCategory}
            removeCategory={removeCategory}
            availableCategorias={availableCategorias}
          />
        )}
        {activeTab === "images" && (
          <div className="pe-tab-content">
            <div className="pe-card">
              <h3>Imagens Gerais</h3>
              <p className="pe-help">
                Arraste para reordenar. A primeira imagem será a capa.
              </p>
              <ImageManager
                images={product.imagem_geral}
                onChange={(imgs) => updateImages("imagem_geral", imgs)}
                bucketName="imagem_geral"
              />
            </div>
            {imageTypes.map((type) => {
              const bucket = product.imagens_por_cor.find((b) => b.cor === type);
              return (
                <div key={type} className="pe-card">
                  <h3>Imagens — {type}</h3>
                  <ImageManager
                    images={bucket?.imagens || []}
                    onChange={(imgs) => updateImages(type, imgs)}
                    bucketName={type}
                  />
                </div>
              );
            })}
            {imageTypes.length === 0 && product.variantes.length === 0 && (
              <div className="pe-card">
                <p className="pe-empty">
                  Adicione variantes com acabamentos para ver upload por cor.
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === "variants" && (
          <TabVariantsCreate
            product={product}
            updateVariant={updateVariant}
            addVariant={addVariant}
            removeVariant={removeVariant}
            duplicateVariant={duplicateVariant}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Tab Info (Create) ────────────────────────────────── */
function TabInfoCreate({
  product,
  updateField,
  addCategory,
  removeCategory,
  availableCategorias,
}) {
  const [newCat, setNewCat] = useState("");

  return (
    <div className="pe-tab-content">
      <div className="pe-card">
        <h3>Informações Básicas</h3>

        <div className="pe-field">
          <label>Título do Produto</label>
          <input
            type="text"
            value={product.titulo_geral}
            onChange={(e) => updateField("titulo_geral", e.target.value)}
            placeholder="Ex: Vaso Parede Babado com Prato"
          />
        </div>

        <div className="pe-field">
          <label>Descrição</label>
          <textarea
            value={product.descricao}
            onChange={(e) => updateField("descricao", e.target.value)}
            placeholder="Descrição detalhada do produto..."
            rows={6}
          />
        </div>

        <div className="pe-field-row">
          <div className="pe-field">
            <label>Ordem na Home</label>
            <input
              type="number"
              value={product.ordem ?? ""}
              onChange={(e) =>
                updateField("ordem", e.target.value ? Number(e.target.value) : null)
              }
              placeholder="1, 2, 3..."
            />
          </div>
          <div className="pe-field">
            <label>Código (gerado automaticamente)</label>
            <input
              type="text"
              value={product.codigo || "(será gerado ao criar)"}
              readOnly
              className="pe-field-readonly"
            />
            <span className="pe-field-hint">
              Gerado automaticamente ao salvar.
            </span>
          </div>
        </div>
      </div>

      <div className="pe-card">
        <h3>Status & Badges</h3>
        <div className="pe-toggles">
          <label className="pe-toggle-item">
            <input
              type="checkbox"
              checked={product.ativo !== false}
              onChange={(e) => updateField("ativo", e.target.checked)}
            />
            <span>Produto Ativo</span>
          </label>
          <label className="pe-toggle-item">
            <input
              type="checkbox"
              checked={!!product.novidade}
              onChange={(e) => updateField("novidade", e.target.checked)}
            />
            <span>Novidade</span>
          </label>
          <label className="pe-toggle-item">
            <input
              type="checkbox"
              checked={!!product.personalizavel}
              onChange={(e) => updateField("personalizavel", e.target.checked)}
            />
            <span>Personalizável</span>
          </label>
        </div>
      </div>

      <div className="pe-card">
        <h3>Categorias</h3>

        {availableCategorias.length > 0 && (
          <div className="pe-field" style={{ marginBottom: "12px" }}>
            <label>Selecionar existente</label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addCategory(e.target.value);
                  e.target.value = "";
                }
              }}
              style={{
                padding: "9px 12px",
                border: "1.5px solid #e0dbd3",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "'DM Sans', sans-serif",
                background: "#fafaf8",
              }}
            >
              <option value="">Escolher categoria...</option>
              {availableCategorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="pe-tag-input">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Nova categoria"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory(newCat);
                setNewCat("");
              }
            }}
          />
          <button
            onClick={() => {
              addCategory(newCat);
              setNewCat("");
            }}
          >
            Adicionar
          </button>
        </div>

        <div className="pe-tags">
          {product.categorias.map((cat, idx) => (
            <span key={idx} className="pe-tag">
              {cat}
              <button onClick={() => removeCategory(idx)}>×</button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Tab Variants (Create) ────────────────────────────── */
function TabVariantsCreate({ product, updateVariant, addVariant, removeVariant, duplicateVariant }) {
  return (
    <div className="pe-tab-content">
      <div className="pe-card">
        <div className="pe-card-header">
          <h3>Variantes ({product.variantes.length})</h3>
          <button className="pe-btn-add" onClick={addVariant}>
            + Adicionar Variante
          </button>
        </div>

        {product.variantes.length === 0 && (
          <div className="pe-empty-state">
            <p>Nenhuma variante ainda.</p>
            <p className="pe-empty-warning">
              ⚠️ Adicione pelo menos 1 variante para o produto funcionar no site.
            </p>
          </div>
        )}

        <div className="pe-variants-grid">
          {product.variantes.map((variant, idx) => (
            <div key={idx} className="pe-variant-card">
              <div className="pe-variant-header">
                <span className="pe-variant-number">#{idx + 1}</span>
                <div className="pe-variant-actions">
                  <button
                    className="pe-variant-duplicate"
                    onClick={() => duplicateVariant(idx)}
                    title="Duplicar esta variante"
                  >
                    📋 Duplicar
                  </button>
                  <button
                    className="pe-variant-remove"
                    onClick={() => removeVariant(idx)}
                  >
                    Remover
                  </button>
                </div>
              </div>
              <div className="pe-variant-fields">
                <div className="pe-field">
                  <label>Acabamento / Cor</label>
                  <input
                    type="text"
                    value={variant.acabamento || ""}
                    onChange={(e) => updateVariant(idx, "acabamento", e.target.value)}
                    placeholder="Natural, Pintado..."
                  />
                </div>
                <div className="pe-field">
                  <label>Tamanho</label>
                  <input
                    type="text"
                    value={variant.tamanho || ""}
                    onChange={(e) => updateVariant(idx, "tamanho", e.target.value)}
                    placeholder="20x30"
                  />
                </div>
                <div className="pe-field">
                  <label>Altura (cm)</label>
                  <input
                    type="number"
                    value={variant.dimensoes?.altura || ""}
                    onChange={(e) => {
                      const dim = { ...variant.dimensoes, altura: parseFloat(e.target.value) || 0 };
                      updateVariant(idx, "dimensoes", dim);
                    }}
                  />
                </div>
                <div className="pe-field">
                  <label>Largura (cm)</label>
                  <input
                    type="number"
                    value={variant.dimensoes?.largura || ""}
                    onChange={(e) => {
                      const dim = { ...variant.dimensoes, largura: parseFloat(e.target.value) || 0 };
                      updateVariant(idx, "dimensoes", dim);
                    }}
                  />
                </div>
                <div className="pe-field pe-field-price">
                  <label>Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.preco || ""}
                    onChange={(e) =>
                      updateVariant(idx, "preco", parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
