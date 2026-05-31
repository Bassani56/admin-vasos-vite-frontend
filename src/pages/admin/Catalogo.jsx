import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import "./catalogo.css";

export default function Catalogo() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProdutos() {
      try {
        const res = await fetch(`${API_BASE_URL}/produtos`);
        const data = await res.json();
        setProdutos(Array.isArray(data) ? data : [data]);
      } catch (err) {
        console.error("Erro ao buscar produtos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProdutos();
  }, []);

  /* Pega a primeira imagem disponível para o card */
  function getCardImage(produto) {
    if (produto.imagem_geral?.length > 0) return produto.imagem_geral[0].url;
    if (produto.imagens_por_cor?.[0]?.imagens?.[0]?.url)
      return produto.imagens_por_cor[0].imagens[0].url;
    return null;
  }

  /* Preço mais baixo entre as variantes — fallback para 0 */
  function getPrecoMinimo(produto) {
    if (!produto.variantes?.length) return "0,00";
    const precos = produto.variantes
      .map((v) => Number(v.preco || 0))
      .filter((p) => p > 0);
    if (!precos.length) return "0,00";
    return Math.min(...precos)
      .toFixed(2)
      .replace(".", ",");
  }

  function handleClick(produto) {
    navigate(`/produto/${produto._id}`, { state: { produto } });
  }

  return (
    <div className="catalogo-page">
      <div className="catalogo-container">
        <p className="catalogo-heading">Produtos</p>

        {loading ? (
          <div className="catalogo-loading">Carregando…</div>
        ) : (
          <div className="catalogo-grid">
            {produtos.map((produto) => {
              const img = getCardImage(produto);
              return (
                <div
                  key={produto._id}
                  className="produto-card"
                  onClick={() => handleClick(produto)}
                >
                  {img ? (
                    <img
                      src={img}
                      alt={produto.titulo_geral}
                      className="produto-card-img"
                    />
                  ) : (
                    <div className="produto-card-img-placeholder" />
                  )}
                  <div className="produto-card-body">
                    <h3 className="produto-card-title">{produto.titulo_geral}</h3>
                    <p className="produto-card-from">A partir de</p>
                    <p className="produto-card-price">R$ {getPrecoMinimo(produto)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}