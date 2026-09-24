const express = require("express");
const router = express.Router();
const initDb = require("../BancoDedados.js");
const db = require("../BancoDedados.js");
const { verificarAutenticacao } = require("../Autenticar.js");
const {
  ValorPedido,
  traformaIdEmProduto,
  pedidoNovo,
} = require("./Servicos.js");

router.get("/produtos", async (req, res) => {
  let dados = await initDb.prepare("SELECT * FROM produtos").all();
  res.json(dados);
});
router.get("/destaques", async (req, res) => {
  let dados = await initDb
    .prepare("SELECT * FROM produtos ORDER BY vendas_qtd DESC LIMIT 3")
    .all();
  res.json(dados);
});
router.get("/categorias", async (req, res) => {
  let dados = await initDb.prepare("SELECT * FROM categorias").all();
  res.json(dados);
});
router.get("/avaliacoes", async (req, res) => {
  let dados = await initDb
    .prepare(
      "SELECT avaliacoes.*,usuarios.nome FROM avaliacoes  INNER JOIN usuarios ON usuarios.id = avaliacoes.usuario_id ORDER BY criado_em DESC LIMIT 3",
    )
    .all();
  res.json(dados);
});
router.post("/avaliar", verificarAutenticacao, async (req, res) => {
  let { idPedido, cometario, isPublicar, nota } = req.body;
  isPublicar = isPublicar == "on" ? "1" : "0";
  console.log(
    Number(idPedido),
    Number(req.usuario.id),
    Number(nota),
    cometario,
    isPublicar,
  );

  let dados = await initDb
    .prepare("SELECT * FROM log_pedidos WHERE id = ?")
    .get(idPedido);
  if (dados) {
    db.prepare(
      `
  INSERT INTO avaliacoes
  (pedido_id, usuario_id, nota, comentario, permitir_publico)
  VALUES (?, ?, ?, ?, ?)
`,
    ).run(
      Number(idPedido),
      Number(req.usuario.id),
      Number(nota),
      cometario,
      isPublicar,
    );
    db.prepare(
      "UPDATE pedidos SET is_avaliado = 1   WHERE id = ? AND usuario_id = ?",
    ).run(Number(idPedido), Number(req.usuario.id));
    res.status(201).end();
  } else {
    res.status(409).end();
  }
});
router.post("/pedido", verificarAutenticacao, async (req, res) => {
  let { produtos, endereco, forma_pagamento } = req.body;
  console.log(produtos, endereco, forma_pagamento);

  let valorDoPedido = await ValorPedido(produtos);
  if (produtos && endereco && forma_pagamento) {
    try {
      const stmtPedido = db.prepare(`
            INSERT INTO pedidos (usuario_id, forma_pagamento, produtos, valor_total) 
            VALUES (?, ?, ?, ?)
        `);

      let ProdutosId = [];
      for (let index = 0; index < produtos.length; index++) {
        const element = produtos[index];
        ProdutosId.push({ id: element.id, quantidade: element.quantidade });
      }
      console.log(ProdutosId);
      ProdutosId = await JSON.stringify(ProdutosId);
      console.log(ProdutosId);
      console.log(
        req.usuario.id,
        forma_pagamento,
        JSON.stringify(ProdutosId),
        valorDoPedido,
      );

      const infoPedido = stmtPedido.run(
        req.usuario.id,
        forma_pagamento,
        JSON.stringify(ProdutosId),
        valorDoPedido,
      );

      const stmtLog = db.prepare(`
            INSERT INTO log_pedidos (pedido_id, Responsavel_id, status, observacao) 
            VALUES (?, ?, ?, ?)
        `);

      stmtLog.run(
        infoPedido.lastInsertRowid,
        req.usuario.id,
        "Em preparaÃ§Ã£o",
        "Pedido aprovado!",
      );
      produtos = await traformaIdEmProduto(produtos)
      console.log(produtos);
      
      pedidoNovo.push({ id: infoPedido.lastInsertRowid, produtos: produtos });
      console.log(pedidoNovo);

      res.status(201).end();
    } catch (err) {
      console.error("Erro ao registrar pedido:", err);
    }
  }
});
router.get("/meuspedidos", verificarAutenticacao, (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    if (!usuarioId) {
      return res.status(401).json({ erro: "UsuÃ¡rio nÃ£o autenticado." });
    }

    const pedidos = db
      .prepare("SELECT * FROM pedidos WHERE usuario_id = ?")
      .all(usuarioId);

    res.json(pedidos);
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).json({ erro: "Erro ao buscar os pedidos do usuÃ¡rio." });
  }
});
router.get("/Pedido/:idpedido", verificarAutenticacao, async (req, res) => {
  let pedido = await db
    .prepare("SELECT * FROM pedidos WHERE id=? AND usuario_id = ?")
    .get(req.params.idpedido, req.usuario.id);
  if (!pedido) {
    return res.status(404).end();
  }
  let produtos = pedido.produtos;
  if (typeof produtos === "string") produtos = JSON.parse(produtos);
  if (typeof produtos === "string") produtos = JSON.parse(produtos);

  console.log(produtos);

  pedido.produtos = await traformaIdEmProduto(produtos);
  res.json(pedido);
});
router.get("/historico/:idpedido", verificarAutenticacao, async (req, res) => {
  let dados = await db
    .prepare(
      `
    SELECT 
        log_pedidos.status, 
        log_pedidos.observacao, 
        log_pedidos.criado_em 
    FROM log_pedidos 
    INNER JOIN pedidos ON pedidos.id = log_pedidos.pedido_id 
    WHERE pedidos.usuario_id = ? AND pedidos.id = ?
    ORDER BY log_pedidos.criado_em ASC, log_pedidos.id ASC
`,
    )
    .all(req.usuario.id, req.params.idpedido);
  res.json(dados);
});

module.exports = router;
