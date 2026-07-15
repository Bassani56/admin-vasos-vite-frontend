import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import { toast } from "react-toastify";
import ImageManager from "../../components/ImageManager.jsx";
import "./productedit.css";

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`${API_BASE_URL}/produtos`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : [data];
        const found = items.find((p) => (p._id || p.id) === id);
        if (found) {
          setProduct(normalizeProduct(found));
        } else {
          toast.error("Produto não encontrado");
          navigate("/produtos");
        }
      } catch (err) {
        toast.error("Erro ao carregar produto");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  function normalizeProduct(p) {
    return {
      ...p,
      imagem_geral: normalizeImages(p.imagem_geral),
      imagens_por_cor: normalizeColorBuckets(p.imagens_por_cor),
      variantes: p.variantes || [],
      categorias: p.categorias || [],
      descricao: p.descricao || "",
    };
  }

  function normalizeImages(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.filter(Boolean).map((img) => ({
        url: img.url,
        filename: img.filename || null,
      }));
    }
    if (raw.url) return [{ url: raw.url, filename: raw.filename || null }];
    return [];
  }

  function normalizeColorBuckets(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      cor: item.cor,
      imagens: normalizeImages(item.imagens),
    }));
  }

  // Update handlers
  function updateField(field, value) {
    setProduct((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function updateVariant(index, field, value) {
    setProduct((prev) => {
      if (!prev) return prev;
      const newVariantes = [...prev.variantes];
      newVariantes[index] = { ...newVariantes[index], [field]: value };
      return { ...prev, variantes: newVariantes };
    });
  }

  function addVariant() {
    setProduct((prev) => {
      if (!prev) return prev;
      return {
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
      };
    });
  }

  function duplicateVariant(index) {
    setProduct((prev) => {
      if (!prev) return prev;
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
    setProduct((prev) => {
      if (!prev) return prev;
      return { ...prev, variantes: prev.variantes.filter((_, i) => i !== index) };
    });
  }

  function addCategory(cat) {
    if (!cat.trim()) return;
    setProduct((prev) => {
      if (!prev) return prev;
      if (prev.categorias.includes(cat)) return prev;
      return { ...prev, categorias: [...prev.categorias, cat] };
    });
  }

  function removeCategory(index) {
    setProduct((prev) => {
      if (!prev) return prev;
      return { ...prev, categorias: prev.categorias.filter((_, i) => i !== index) };
    });
  }

  // Image handlers
  function updateImages(field, images) {
    if (field === "imagem_geral") {
      setProduct((prev) => (prev ? { ...prev, imagem_geral: images } : prev));
    } else {
      setProduct((prev) => {
        if (!prev) return prev;
        const bucketIndex = prev.imagens_por_cor.findIndex((b) => b.cor === field);
        let newBuckets = [...prev.imagens_por_cor];
        if (bucketIndex >= 0) {
          newBuckets[bucketIndex] = { ...newBuckets[bucketIndex], imagens: images };
        } else {
          newBuckets.push({ cor: field, imagens: images });
        }
        return { ...prev, imagens_por_cor: newBuckets };
      });
    }
  }

  // Save
  async function handleSave() {
    if (!product) return;
    const productId = product._id || product.id;

    // Validation
    if (!product.titulo_geral?.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!product.variantes.length) {
      toast.warn("Produto sem variantes pode quebrar no site");
    }

    setSaving(true);
    try {
      // Auto-generate codigo if empty
      const codigo = product.codigo || (product._id || product.id || "").slice(-4);

      const payload = {
        titulo_geral: product.titulo_geral,
        descricao: product.descricao,
        categorias: product.categorias,
        imagem_geral: product.imagem_geral,
        imagens_por_cor: product.imagens_por_cor,
        variantes: product.variantes,
        ativo: product.ativo,
        ordem: product.ordem,
        novidade: product.novidade,
        personalizavel: product.personalizavel,
        destaque: product.destaque,
        codigo,
      };

      const res = await fetch(`${API_BASE_URL}/produto/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.erro || "Falha ao salvar");
      }

      const updated = await res.json();
      setProduct(normalizeProduct(updated));
      toast.success("Produto salvo com sucesso!");
    } catch (err) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Delete
  async function handleDelete() {
    if (!product) return;
    const productId = product._id || product.id;
    const confirmed = window.confirm(
      `Deletar "${product.titulo_geral}"?\nEsta ação não pode ser desfeita.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/produto/${productId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao deletar");
      toast.success("Produto deletado");
      navigate("/produtos");
    } catch (err) {
      toast.error("Erro ao deletar produto");
    } finally {
      setSaving(false);
    }
  }

  // SEO Preview
  function getSlug(title) {
    if (!title) return "";
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  if (loading) {
    return (
      <div className="pe-page">
        <div className="pe-loading">Carregando produto...</div>
      </div>
    );
  }

  if (!product) return null;

  const imageTypes = (() => {
    const types = new Set();
    product.variantes.forEach((v) => {
      const type = (v.acabamento || v.cor || "").toString();
      if (type) types.add(type);
    });
    return Array.from(types);
  })();

  return (
    <div className="pe-page">
      {/* Header */}
      <div className="pe-header">
        <div>
          <button className="pe-back" onClick={() => navigate("/produtos")}>
            ← Voltar
          </button>
          <h1>{product.titulo_geral || "Sem título"}</h1>
        </div>
        <div className="pe-header-actions">
          <button className="pe-btn-delete" onClick={handleDelete} disabled={saving}>
            Deletar
          </button>
          <button className="pe-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
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
        <button
          className={`pe-tab${activeTab === "seo" ? " active" : ""}`}
          onClick={() => setActiveTab("seo")}
        >
          SEO & Preview
        </button>
      </div>

      {/* Tab Content */}
      <div className="pe-content">
        {activeTab === "info" && (
          <TabInfo
            product={product}
            updateField={updateField}
            addCategory={addCategory}
            removeCategory={removeCategory}
          />
        )}
        {activeTab === "images" && (
          <TabImages
            product={product}
            imageTypes={imageTypes}
            updateImages={updateImages}
          />
        )}
        {activeTab === "variants" && (
          <TabVariants
            product={product}
            updateVariant={updateVariant}
            addVariant={addVariant}
            removeVariant={removeVariant}
            duplicateVariant={duplicateVariant}
          />
        )}
        {activeTab === "seo" && (
          <TabSEO product={product} getSlug={getSlug} />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  TAB: Informações                                          */
/* ═══════════════════════════════════════════════════════════ */
function TabInfo({ product, updateField, addCategory, removeCategory }) {
  const [newCat, setNewCat] = useState("");

  return (
    <div className="pe-tab-content">
      <div className="pe-card">
        <h3>Informações Básicas</h3>

        <div className="pe-field">
          <label>Título do Produto</label>
          <input
            type="text"
            value={product.titulo_geral || ""}
            onChange={(e) => updateField("titulo_geral", e.target.value)}
            placeholder="Ex: Vaso Parede Babado"
          />
        </div>

        <div className="pe-field">
          <label>Descrição</label>
          <textarea
            value={product.descricao || ""}
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
              value={product.codigo || "(será gerado ao salvar)"}
              readOnly
              className="pe-field-readonly"
            />
            <span className="pe-field-hint">
              Gerado com base no ID do produto. Variações usam ponto (ex: 1.1, 1.2).
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
          <label className="pe-toggle-item">
            <input
              type="checkbox"
              checked={!!product.destaque}
              onChange={(e) => updateField("destaque", e.target.checked)}
            />
            <span>Produto em Destaque</span>
          </label>
        </div>
      </div>

      <div className="pe-card">
        <h3>Categorias</h3>

        <div className="pe-tag-input">
          <input
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="Adicionar categoria"
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
          {product.categorias.length === 0 && (
            <span className="pe-empty">Nenhuma categoria</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  TAB: Imagens                                              */
/* ═══════════════════════════════════════════════════════════ */
function TabImages({ product, imageTypes, updateImages }) {
  return (
    <div className="pe-tab-content">
      <div className="pe-card">
        <h3>Imagens Gerais</h3>
        <p className="pe-help">
          Arraste para reordenar. A primeira imagem será a capa do produto.
        </p>
        <ImageManager
          images={product.imagem_geral}
          onChange={(imgs) => updateImages("imagem_geral", imgs)}
          bucketName="imagem_geral"
        />
      </div>

      {imageTypes.map((type) => {
        const bucket = product.imagens_por_cor.find((b) => b.cor === type);
        const images = bucket?.imagens || [];
        return (
          <div key={type} className="pe-card">
            <h3>Imagens — {type}</h3>
            <ImageManager
              images={images}
              onChange={(imgs) => updateImages(type, imgs)}
              bucketName={type}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  TAB: Variantes                                            */
/* ═══════════════════════════════════════════════════════════ */
function TabVariants({ product, updateVariant, addVariant, removeVariant, duplicateVariant }) {
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
            <p>Nenhuma variante cadastrada.</p>
            <p className="pe-empty-warning">
              ⚠️ Produtos sem variantes podem quebrar no site!
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
                    value={variant.acabamento || variant.cor || ""}
                    onChange={(e) => updateVariant(idx, "acabamento", e.target.value)}
                    placeholder="Ex: Natural, Pintado"
                  />
                </div>
                <div className="pe-field">
                  <label>Tamanho</label>
                  <input
                    type="text"
                    value={variant.tamanho || ""}
                    onChange={(e) => updateVariant(idx, "tamanho", e.target.value)}
                    placeholder="Ex: 20x30"
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

/* ═══════════════════════════════════════════════════════════ */
/*  TAB: SEO & Preview                                        */
/* ═══════════════════════════════════════════════════════════ */
function TabSEO({ product, getSlug }) {
  const slug = getSlug(product.titulo_geral);
  const fullUrl = `casadooleiroo.com.br/produtos/${slug}-${product._id || product.id || "ID"}`;
  const minPrice = product.variantes.length
    ? Math.min(...product.variantes.map((v) => Number(v.preco || 0)).filter((p) => p > 0))
    : 0;

  return (
    <div className="pe-tab-content">
      <div className="pe-card">
        <h3>Preview de URL</h3>
        <div className="pe-seo-preview">
          <span className="pe-seo-url">{fullUrl}</span>
        </div>
      </div>

      <div className="pe-card">
        <h3>Preview do Card (como aparece na home)</h3>
        <div className="pe-card-preview">
          <div className="pe-preview-card">
            <div className="pe-preview-img">
              {product.imagem_geral?.[0]?.url ? (
                <img src={product.imagem_geral[0].url} alt="" />
              ) : (
                <div className="pe-preview-img-placeholder">Sem imagem</div>
              )}
            </div>
            <div className="pe-preview-body">
              <h4>{product.titulo_geral || "Sem título"}</h4>
              <span className="pe-preview-from">A partir de</span>
              <span className="pe-preview-price">
                R$ {minPrice > 0 ? minPrice.toFixed(2).replace(".", ",") : "0,00"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pe-card">
        <h3>Validação</h3>
        <div className="pe-validation">
          <ValidationItem
            ok={!!product.titulo_geral?.trim()}
            label="Título preenchido"
          />
          <ValidationItem
            ok={product.imagem_geral.length > 0}
            label="Imagem geral adicionada"
          />
          <ValidationItem
            ok={product.variantes.length > 0}
            label="Pelo menos 1 variante"
          />
          <ValidationItem
            ok={product.variantes.every((v) => v.preco > 0)}
            label="Todas variantes com preço > 0"
          />
          <ValidationItem
            ok={product.categorias.length > 0}
            label="Pelo menos 1 categoria"
          />
          <ValidationItem
            ok={!!product.descricao?.trim()}
            label="Descrição preenchida"
          />
        </div>
      </div>
    </div>
  );
}

function ValidationItem({ ok, label }) {
  return (
    <div className={`pe-validation-item ${ok ? "ok" : "warn"}`}>
      <span className="pe-validation-icon">{ok ? "✅" : "⚠️"}</span>
      <span>{label}</span>
    </div>
  );
}
