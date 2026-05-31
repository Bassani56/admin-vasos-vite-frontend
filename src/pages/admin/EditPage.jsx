import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";
import "./editpage.css";

export default function EditPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [editorData, setEditorData] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const getProductKey = (p) => p?.id || p?._id || null;

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${API_BASE_URL}/produtos`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : [data];
        // dedupe products by id/_id to avoid duplicate keys
        const seen = new Set();
        const deduped = items.filter((it) => {
          const k = getProductKey(it);
          if (!k) return true;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        setProducts(deduped);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      }
    }

    fetchProducts();
  }, []);

  const normalizeImages = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.filter(Boolean).map((img) => ({
        url: img.url,
        filename: img.filename || null,
      }));
    }
    if (raw.url) {
      return [{ url: raw.url, filename: raw.filename || null }];
    }
    return [];
  };

  const normalizeColorBuckets = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => ({
      cor: item.cor,
      imagens: normalizeImages(item.imagens),
    }));
  };

  const selectProduct = (product) => {
    setSelectedProductId(product.id || product._id || null);
    setEditorData({
      ...product,
      imagem_geral: normalizeImages(product.imagem_geral),
      imagens_por_cor: normalizeColorBuckets(product.imagens_por_cor),
    });
    setStatusMessage("");
  };

  const getPrice = (product) => {
    if (product.variantes && product.variantes.length > 0) {
      const prices = product.variantes
        .map((v) => Number(v.preco || 0))
        .filter((p) => !isNaN(p) && p > 0);
      if (prices.length) return Math.min(...prices);
    }
    return "0.00";
  };

  const getImage = (product) => {
    if (product.variantes && product.variantes.length > 0) {
      for (const v of product.variantes) {
        if (v.imagem && v.imagem.url) return v.imagem.url;
      }
    }
    if (product.imagem_geral && product.imagem_geral.url) return product.imagem_geral.url;
    if (Array.isArray(product.imagem_geral) && product.imagem_geral.length > 0) return product.imagem_geral[0].url;

    console.log("Produto sem imagem encontrada:", product);

    return null;
  };

  const imageTypes = (() => {
    if (!editorData) return [];

    const types = new Set();
    const hasNatural = editorData.variantes?.some(
      (v) => (v.acabamento || v.cor || "").toString().toLowerCase() === "natural"
    );

    if (hasNatural) {
      types.add("natural");
    }

    editorData.variantes?.forEach((v) => {
      const type = (v.acabamento || v.cor || "").toString();
      if (type && type.toLowerCase() !== "natural") {
        types.add(type);
      }
    });

    editorData.imagens_por_cor?.forEach((bucket) => {
      if (bucket.cor) {
        types.add(bucket.cor);
      }
    });

    return Array.from(types);
  })();

  const updateVariant = (index, field, value) => {
    if (!editorData || !editorData.variantes) return;

    setEditorData((prev) => {
      if (!prev || !prev.variantes) return prev;
      const newVariantes = [...prev.variantes];
      newVariantes[index] = { ...newVariantes[index], [field]: value };
      return { ...prev, variantes: newVariantes };
    });
  };

  const updateProductTitle = (newTitle) => {
    if (!editorData) return;
    setEditorData((prev) => (prev ? { ...prev, titulo_geral: newTitle } : prev));
  };

  const addCategory = () => {
    if (!editorData) return;
    const category = newCategory.trim();
    if (!category) return;

    setEditorData((prev) => {
      if (!prev) return prev;
      const nextCategories = Array.isArray(prev.categorias) ? [...prev.categorias] : [];
      if (!nextCategories.includes(category)) {
        nextCategories.push(category);
      }
      return { ...prev, categorias: nextCategories };
    });

    setNewCategory("");
  };

  const removeCategory = (index) => {
    if (!editorData) return;
    setEditorData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categorias: (prev.categorias || []).filter((_, i) => i !== index),
      };
    });
  };

  const addVariant = () => {
    if (!editorData) return;
    const newVariant = {
      id: `new-${Date.now()}`,
      titulo: null,
      imagem: { url: null, filename: null },
      acabamento: "nova cor",
      desenho: null,
      tamanho: null,
      dimensoes: { altura: 0, largura: 0 },
      preco: 0,
    };
    setEditorData((prev) =>
      prev ? { ...prev, variantes: [...(prev.variantes || []), newVariant] } : prev
    );
  };

  const removeVariant = (index) => {
    if (!editorData || !editorData.variantes) return;
    setEditorData((prev) =>
      prev
        ? {
            ...prev,
            variantes: prev.variantes.filter((_, i) => i !== index),
          }
        : prev
    );
  };

  const getBucketImages = (type) => {
    if (!editorData) return [];
    if (type === "imagem_geral") {
      return normalizeImages(editorData.imagem_geral);
    }
    const bucket = editorData.imagens_por_cor?.find((item) => item.cor === type);
    return bucket?.imagens ? normalizeImages(bucket.imagens) : [];
  };

  const uploadImages = async (files) => {
    if (!files || files.length === 0) return [];
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return Array.isArray(data.images)
      ? data.images.map((img) => ({ url: img.url, filename: img.fileName }))
      : [];
  };

  const handleUploadBucketImages = async (type, files) => {
    if (!files || files.length === 0 || !editorData) return;

    try {
      setUploading(true);
      setStatusMessage(`Enviando imagens para ${type}...`);

      const uploadedImages = await uploadImages(files);
      if (uploadedImages.length === 0) {
        setStatusMessage("Nenhuma imagem enviada.");
        return;
      }

      setEditorData((prev) => {
        if (!prev) return prev;

        const next = {
          ...prev,
          imagem_geral: normalizeImages(prev.imagem_geral),
          imagens_por_cor: normalizeColorBuckets(prev.imagens_por_cor),
        };

        if (type === "imagem_geral") {
          next.imagem_geral = [...next.imagem_geral, ...uploadedImages];
        } else {
          const bucketIndex = next.imagens_por_cor.findIndex((item) => item.cor === type);
          if (bucketIndex >= 0) {
            const bucket = next.imagens_por_cor[bucketIndex];
            next.imagens_por_cor[bucketIndex] = {
              ...bucket,
              imagens: [...normalizeImages(bucket.imagens), ...uploadedImages],
            };
          } else {
            next.imagens_por_cor = [
              ...next.imagens_por_cor,
              { cor: type, imagens: uploadedImages },
            ];
          }
        }

        return next;
      });

      setStatusMessage(`Imagens adicionadas a ${type}.`);
    } catch (error) {
      console.error(error);
      setStatusMessage("Erro ao enviar imagens.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (type, index) => {
    if (!editorData) return;

    setEditorData((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        imagem_geral: normalizeImages(prev.imagem_geral),
        imagens_por_cor: normalizeColorBuckets(prev.imagens_por_cor),
      };

      if (type === "imagem_geral") {
        next.imagem_geral = next.imagem_geral.filter((_, i) => i !== index);
      } else {
        next.imagens_por_cor = next.imagens_por_cor.map((bucket) => {
          if (bucket.cor !== type) return bucket;
          return { ...bucket, imagens: bucket.imagens.filter((_, i) => i !== index) };
        });
      }

      return next;
    });
  };

  const handleSave = async () => {
    console.log("Salvando produto:", editorData);

    if (!editorData) return;
    const id = editorData.id || editorData._id;
    if (!id) {
      setStatusMessage("Produto inválido para salvar.");
      return;
    }

    try {
      setUploading(true);
      setStatusMessage("Salvando alterações...");

      const payload = {
        titulo_geral: editorData.titulo_geral,
        categorias: editorData.categorias || [],
        imagem_geral: normalizeImages(editorData.imagem_geral),
        imagens_por_cor: normalizeColorBuckets(editorData.imagens_por_cor),
        variantes: editorData.variantes || [],
      };

      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.erro ||
          errorData.details?.join(", ") ||
          "Falha ao salvar produto"
        );
      }

      const updatedProduct = await res.json();
      setStatusMessage("Produto atualizado com sucesso.");
      setEditorData({
        ...updatedProduct,
        imagem_geral: normalizeImages(updatedProduct.imagem_geral),
        imagens_por_cor: normalizeColorBuckets(updatedProduct.imagens_por_cor),
      });

      setProducts((prev) => {
        const key = getProductKey(updatedProduct);
        if (!key) return prev.map((p) => (p === updatedProduct ? updatedProduct : p));
        // replace existing product with same key, or add if missing — keep list unique
        const others = prev.filter((p) => getProductKey(p) !== key);
        return [updatedProduct, ...others];
      });
    } catch (err) {
      console.error(err);
      setStatusMessage(`Erro ao salvar produto: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!editorData) return;
    const id = editorData.id || editorData._id;
    if (!id) {
      setStatusMessage("Produto inválido para deletar.");
      return;
    }

    // Confirm deletion
    const confirmed = window.confirm(
      `Tem certeza que deseja deletar o produto "${editorData.titulo_geral}"?\n\nEsta ação não pode ser desfeita. Todas as imagens serão deletadas do AWS também.`
    );

    if (!confirmed) return;

    try {
      setUploading(true);
      setStatusMessage("Deletando produto e imagens...");

      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.erro || "Falha ao deletar produto");
      }

      setStatusMessage("Produto deletado com sucesso.");
      
      // Remove from products list
      setProducts((prev) =>
        prev.filter((product) => product._id !== id && product.id !== id)
      );
      
      // Clear editor
      setEditorData(null);
      setSelectedProductId(null);
    } catch (err) {
      console.error(err);
      setStatusMessage(`Erro ao deletar produto: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="edit-page-container">
      <div className="central-container">
        {products.map((product) => (
          <div
            className="product-card"
            key={product.id || product._id}
            onClick={() => selectProduct(product)}
            style={{ cursor: "pointer", border: selectedProductId === (product.id || product._id) ? "2px solid #007BFF" : "none" }}
          >
            <img src={getImage(product)} alt={product.titulo_geral} className="product-image" />
            <div style={{ padding: "12px" }}>
              <h3>{product.titulo_geral}</h3>
              <p>A PARTIR DE</p>
              <p>Preço: R$ {getPrice(product)}</p>
            </div>
          </div>
        ))}
      </div>

      {editorData && (
        <div style={{ width: "100%", padding: "24px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h2>Editar imagens de: {editorData.titulo_geral}</h2>
            <p style={{ color: "#333" }}>{statusMessage}</p>
          </div>

          <section style={{ marginBottom: "24px" }}>
            <h3>Imagens gerais</h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
              {getBucketImages("imagem_geral").map((image, index) => (
                <div key={`${image.url}-${index}`} style={{ position: "relative", width: "140px" }}>
                  <img src={image.url} alt={`Geral ${index}`} style={{ width: "100%", borderRadius: "4px" }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage("imagem_geral", index)}
                    style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                handleUploadBucketImages("imagem_geral", Array.from(event.target.files));
                event.target.value = "";
              }}
            />
          </section>

          {imageTypes.map((type) => (
            <section key={type} style={{ marginBottom: "24px" }}>
              <h3>{type === "natural" ? "Natural" : `Cor ${type}`}</h3>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
                {getBucketImages(type).map((image, index) => (
                  <div key={`${type}-${image.url}-${index}`} style={{ position: "relative", width: "140px" }}>
                    <img src={image.url} alt={`${type} ${index}`} style={{ width: "100%", borderRadius: "4px" }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(type, index)}
                      style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  handleUploadBucketImages(type, Array.from(event.target.files));
                  event.target.value = "";
                }}
              />
            </section>
          ))}

          <section style={{ marginBottom: "24px", padding: "16px", border: "1px solid #ddd", borderRadius: "6px" }}>
            <h3>Informações do Produto</h3>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Título</label>
              <input
                type="text"
                value={editorData.titulo_geral || ""}
                onChange={(e) => updateProductTitle(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ddd", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Categorias</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Adicionar categoria"
                  style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ddd", boxSizing: "border-box" }}
                />
                <button
                  type="button"
                  onClick={addCategory}
                  style={{ padding: "10px 16px", background: "#007BFF", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
                >
                  Adicionar
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                {(editorData.categorias || []).length > 0 ? (
                  (editorData.categorias || []).map((category, index) => (
                    <div
                      key={`${category}-${index}`}
                      style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f3f4f6", padding: "8px 12px", borderRadius: "999px" }}
                    >
                      <span>{category}</span>
                      <button
                        type="button"
                        onClick={() => removeCategory(index)}
                        style={{ background: "transparent", border: "none", color: "#dc3545", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <p style={{ margin: 0, color: "#666" }}>Nenhuma categoria definida.</p>
                )}
              </div>
            </div>

            <h4>Variantes</h4>
            {editorData.variantes && editorData.variantes.length > 0 ? (
              <div style={{ display: "grid", gap: "16px" }}>
                {editorData.variantes.map((variant, idx) => (
                  <div key={idx} style={{ padding: "12px", border: "1px solid #eee", borderRadius: "4px", background: "#f9f9f9", position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Remover
                    </button>
                    
                    <p style={{ margin: "0 0 12px 0", fontWeight: "bold", paddingRight: "80px" }}>
                      ID: {variant.id || `Variante ${idx + 1}`}
                    </p>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Cor/Acabamento</label>
                        <input
                          type="text"
                          value={variant.acabamento || variant.cor || ""}
                          onChange={(e) => updateVariant(idx, "acabamento", e.target.value)}
                          style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Tamanho</label>
                        <input
                          type="text"
                          value={variant.tamanho || ""}
                          onChange={(e) => updateVariant(idx, "tamanho", e.target.value)}
                          style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd", boxSizing: "border-box" }}
                          placeholder="Ex: 20x30"
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Altura</label>
                        <input
                          type="number"
                          value={variant.dimensoes?.altura || ""}
                          onChange={(e) => {
                            const newDim = { ...variant.dimensoes, altura: parseFloat(e.target.value) || 0 };
                            updateVariant(idx, "dimensoes", newDim);
                          }}
                          style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Largura</label>
                        <input
                          type="number"
                          value={variant.dimensoes?.largura || ""}
                          onChange={(e) => {
                            const newDim = { ...variant.dimensoes, largura: parseFloat(e.target.value) || 0 };
                            updateVariant(idx, "dimensoes", newDim);
                          }}
                          style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd", boxSizing: "border-box" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>Preço</label>
                        <input
                          type="number"
                          value={variant.preco || ""}
                          onChange={(e) => updateVariant(idx, "preco", parseFloat(e.target.value) || 0)}
                          style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #ddd", boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Nenhuma variante cadastrada.</p>
            )}
            <button
              type="button"
              onClick={addVariant}
              style={{
                marginTop: "12px",
                padding: "10px 16px",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              + Adicionar Variante
            </button>
          </section>

          <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={uploading}
              style={{ padding: "12px 20px", background: "#007BFF", color: "white", border: "none", borderRadius: "6px", cursor: uploading ? "not-allowed" : "pointer" }}
            >
              {uploading ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              style={{ padding: "12px 20px", background: "#dc3545", color: "white", border: "none", borderRadius: "6px", cursor: uploading ? "not-allowed" : "pointer" }}
            >
              {uploading ? "Deletando..." : "Deletar Produto"}
            </button>
          </div>
        </div>
      )}
      <a href="/admin" >Adcionar Produto</a>
    </div>
  );
}
