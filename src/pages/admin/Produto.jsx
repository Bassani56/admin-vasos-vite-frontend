import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import "./produto.css";

/* ─── Card reutilizável para relacionados ───────────────────── */
function ProdutoCard({ produto, onClick }) {
  function getImg(p) {
    if (p.imagem_geral?.length > 0) return p.imagem_geral[0].url;
    if (p.imagens_por_cor?.[0]?.imagens?.[0]?.url)
      return p.imagens_por_cor[0].imagens[0].url;
    return null;
  }

  function getPreco(p) {
    if (!p.variantes?.length) return "0,00";
    const precos = p.variantes.map((v) => Number(v.preco || 0)).filter((n) => n > 0);
    if (!precos.length) return "0,00";
    return Math.min(...precos).toFixed(2).replace(".", ",");
  }

  const img = getImg(produto);

  return (
    <div className="produto-card" onClick={onClick} style={{ cursor: "pointer" }}>
      {img ? (
        <img src={img} alt={produto.titulo_geral} className="produto-card-img" />
      ) : (
        <div className="produto-card-img-placeholder" />
      )}
      <div className="produto-card-body">
        <h3 className="produto-card-title">{produto.titulo_geral}</h3>
        <p className="produto-card-from">A partir de</p>
        <p className="produto-card-price">R$ {getPreco(produto)}</p>
      </div>
    </div>
  );
}

/* ─── Página de Produto ─────────────────────────────────────── */
export default function Produto() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [produto, setProduto] = useState(location.state?.produto || null);
  const [relacionados, setRelacionados] = useState([]);

  /* Imagens do carrossel: geral + por cor (todas juntas) */
  const todasImagens = (() => {
    if (!produto) return [];
    const imgs = [];
    (produto.imagem_geral || []).forEach((img) => imgs.push(img));
    (produto.imagens_por_cor || []).forEach((bucket) =>
      (bucket.imagens || []).forEach((img) => imgs.push({ ...img, cor: bucket.cor }))
    );
    return imgs;
  })();

  const [imagemAtiva, setImagemAtiva] = useState(null);

  /* Estado das opções selecionadas */
  const acabamentos = [...new Set((produto?.variantes || []).map((v) => v.acabamento))];
  const [acabamentoSel, setAcabamentoSel] = useState(acabamentos[0] || "");

  /* Tamanhos disponíveis para o acabamento selecionado */
  const tamanhosPorAcabamento = (produto?.variantes || [])
    .filter((v) => v.acabamento === acabamentoSel)
    .map((v) => v.tamanho)
    .filter(Boolean);

  const tamanhos = [...new Set(tamanhosPorAcabamento)];
  const [tamanhoSel, setTamanhoSel] = useState(tamanhos[0] || "");

  /* Variante correspondente à seleção atual */
  const varianteSelecionada = (produto?.variantes || []).find(
    (v) => v.acabamento === acabamentoSel && v.tamanho === tamanhoSel
  );

  const [quantidade, setQuantidade] = useState(1);

  /* Quando o acabamento mudar, resetar tamanho para o primeiro disponível */
  useEffect(() => {
    const novosTab = [...new Set(
      (produto?.variantes || [])
        .filter((v) => v.acabamento === acabamentoSel)
        .map((v) => v.tamanho)
        .filter(Boolean)
    )];
    setTamanhoSel(novosTab[0] || "");
  }, [acabamentoSel, produto]);

  /* Buscar produto se não veio via state */
  useEffect(() => {
    if (!produto && id) {
      fetch(`${API_BASE_URL}/produtos/${id}`)
        .then((r) => r.json())
        .then((data) => setProduto(data))
        .catch(console.error);
    }
  }, [id, produto]);

  /* Inicializar imagem ativa e buscar relacionados quando produto carregar */
  useEffect(() => {
    if (!produto) return;

    /* Imagem inicial: primeiro do carrossel */
    const imgs = [];
    (produto.imagem_geral || []).forEach((img) => imgs.push(img));
    (produto.imagens_por_cor || []).forEach((bucket) =>
      (bucket.imagens || []).forEach((img) => imgs.push(img))
    );
    if (imgs.length > 0) setImagemAtiva(imgs[0].url);

    /* Relacionados */
    fetch(`${API_BASE_URL}/relacionados`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto }),
    })
      .then((r) => r.json())
      .then((data) => setRelacionados(data.rel || []))
      .catch(() => setRelacionados([]));

    window.scrollTo(0, 0);
  }, [produto]);

  /* Quando acabamento muda, trocar imagem ativa para a cor correspondente */
  useEffect(() => {
    if (!produto) return;
    const bucket = (produto.imagens_por_cor || []).find((b) => b.cor === acabamentoSel);
    if (bucket?.imagens?.[0]?.url) {
      setImagemAtiva(bucket.imagens[0].url);
    }
  }, [acabamentoSel, produto]);

  /* Adicionar ao carrinho (localStorage) */
  function adicionarAoCarrinho() {
    if (!varianteSelecionada) return;

    const novoProduto = {
      id: produto._id,
      titulo: produto.titulo_geral,
      preco: varianteSelecionada.preco,
      quantidade,
      imagem: imagemAtiva,
      acabamento: acabamentoSel,
      tamanho: tamanhoSel,
    };

    try {
      const stored = JSON.parse(localStorage.getItem("carrinho") || "[]");
      const idx = stored.findIndex(
        (p) =>
          p.id === novoProduto.id &&
          p.acabamento === novoProduto.acabamento &&
          p.tamanho === novoProduto.tamanho
      );
      if (idx !== -1) {
        stored[idx].quantidade += quantidade;
      } else {
        stored.push(novoProduto);
      }
      localStorage.setItem("carrinho", JSON.stringify(stored));
      alert("Produto adicionado ao carrinho!");
    } catch (err) {
      console.error(err);
    }
  }

  /* ── Renderização ── */
  if (!produto) {
    return <div className="produto-loading">Carregando produto…</div>;
  }

  const precoAtual = varianteSelecionada?.preco ?? produto.variantes?.[0]?.preco ?? 0;

  return (
    <div className="produto-page">
      <div className="produto-page-container">

        {/* Back */}
        <a className="produto-back" onClick={() => navigate(-1)} href="#">
          ← Voltar
        </a>

        {/* ─── Seção principal ─────────────────────────────── */}
        <div className="produto-main">

          {/* DIV 1 — Carrossel lateral */}
          <div className="produto-carousel">
            {todasImagens.map((img, idx) => (
              <div
                key={idx}
                className={`produto-carousel-thumb${imagemAtiva === img.url ? " ativo" : ""}`}
                onClick={() => setImagemAtiva(img.url)}
              >
                <img src={img.url} alt={`Foto ${idx + 1}`} />
              </div>
            ))}
          </div>

          {/* DIV 2 — Imagem principal */}
          <div className="produto-imagem-principal">
            {imagemAtiva && (
              <img src={imagemAtiva} alt={produto.titulo_geral} />
            )}
          </div>

          {/* DIV 3 — Descrição e opções */}
          <div className="produto-descricao">
            <h1 className="produto-titulo">{produto.titulo_geral}</h1>

            <p className="produto-preco">
              R$ {Number(precoAtual).toFixed(2).replace(".", ",")}
            </p>

            <hr className="produto-divider" />

            {/* Opções de acabamento */}
            {acabamentos.length > 0 && (
              <div className="produto-opcao-grupo">
                <p className="produto-opcao-label">Acabamento</p>
                <div className="produto-opcao-botoes">
                  {acabamentos.map((acab) => (
                    <button
                      key={acab}
                      className={`btn-opcao${acabamentoSel === acab ? " ativo" : ""}`}
                      onClick={() => setAcabamentoSel(acab)}
                    >
                      {acab}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Opções de tamanho */}
            {tamanhos.length > 0 && (
              <div className="produto-opcao-grupo">
                <p className="produto-opcao-label">Medidas</p>
                <div className="produto-opcao-botoes">
                  {tamanhos.map((tam) => (
                    <button
                      key={tam}
                      className={`btn-opcao${tamanhoSel === tam ? " ativo" : ""}`}
                      onClick={() => setTamanhoSel(tam)}
                    >
                      {tam}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <hr className="produto-divider" />

            {/* Quantidade + CTA */}
            <div className="produto-cta">
              <div className="produto-quantidade-row">
                <div className="qtd-container">
                  <button
                    className="qtd-btn"
                    onClick={() => quantidade > 1 && setQuantidade((q) => q - 1)}
                  >
                    −
                  </button>
                  <span className="qtd-valor">{quantidade}</span>
                  <button
                    className="qtd-btn"
                    onClick={() => setQuantidade((q) => q + 1)}
                  >
                    +
                  </button>
                </div>
                <button className="btn-carrinho" onClick={adicionarAoCarrinho}>
                  Adicionar ao carrinho
                </button>
              </div>
              <button className="btn-whats">Entrar em contato</button>
            </div>
          </div>
        </div>

        {/* ─── Descrição geral ────────────────────────────── */}
        {produto.descricao && (
          <div className="produto-descr-geral">
            <p className="produto-descr-titulo">Descrição</p>
            <div className="produto-descr-texto">
              {produto.descricao.split("\n").map((linha, idx) => {
                if (linha.includes(":")) {
                  const colonIdx = linha.indexOf(":");
                  const titulo = linha.slice(0, colonIdx);
                  const conteudo = linha.slice(colonIdx + 1);
                  return (
                    <p key={idx}>
                      <strong>{titulo}:</strong>
                      {conteudo}
                    </p>
                  );
                }
                return <p key={idx}>{linha}</p>;
              })}
            </div>
          </div>
        )}

        {/* ─── Produtos relacionados ───────────────────────── */}
        {relacionados.filter((r) => r._id !== produto._id).length > 0 && (
          <div className="produto-relacionados-section">
            <p className="produto-relacionados-titulo">Produtos relacionados</p>
            <div className="produto-relacionados-grid">
              {relacionados
                .filter((r) => r._id !== produto._id)
                .map((rel) => (
                  <ProdutoCard
                    key={rel._id}
                    produto={rel}
                    onClick={() =>
                      navigate(`/produto/${rel._id}`, { state: { produto: rel } })
                    }
                  />
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}