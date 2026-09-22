const express = require("express");
const app = express();
const path = require("path");
const initDb = require("./BackEnd/BancoDedados.js");
const { router, verificarAutenticacao, permitirCargos } = require("./BackEnd/Autenticar.js");
const cookieParser = require("cookie-parser");
const db = require("./BackEnd/BancoDedados.js");
let BancoDedados;
console.log(path.join(__dirname, ""));
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, "")));
async function Inciar(params) {
  BancoDedados = await initDb;
}
Inciar();
app.use("/autenticar", router);
app.get("/produtos", async (req, res) => {
  let dados = await initDb.prepare("SELECT * FROM produtos").all();
  res.json(dados);
});
app.get("/destaques", async (req, res) => {
  let dados = await initDb
    .prepare("SELECT * FROM produtos ORDER BY vendas_qtd DESC LIMIT 3")
    .all();
  res.json(dados);
});
app.get("/categorias", async (req, res) => {
  let dados = await initDb.prepare("SELECT * FROM categorias").all();
  res.json(dados);
});
app.get("/avaliacoes", async (req, res) => {
  let dados = await initDb
    .prepare(
      "SELECT avaliacoes.*,usuarios.nome FROM avaliacoes  INNER JOIN usuarios ON usuarios.id = avaliacoes.usuario_id ORDER BY criado_em DESC LIMIT 3",
    )
    .all();
  res.json(dados);
});
app.post("/avaliar", verificarAutenticacao, async (req, res) => {
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
app.post("/pedido", verificarAutenticacao, async (req, res) => {
  let { produtos, endereco, forma_pagamento } = req.body;
  console.log(produtos, endereco, forma_pagamento);

  let valorDoPedido = await ValorPedido(produtos);
  if (produtos && endereco && forma_pagamento) {
    try {
      // 1. Inserir o pedido principal
      const stmtPedido = db.prepare(`
            INSERT INTO pedidos (usuario_id, forma_pagamento, produtos, valor_total) 
            VALUES (?, ?, ?, ?)
        `);

      // O método .run() retorna um objeto com informações da execução (como o ID gerado)
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

      // 2. Inserir no log do pedido usando o ID recém-criado (infoPedido.lastInsertRowid)
      const stmtLog = db.prepare(`
            INSERT INTO log_pedidos (pedido_id, Responsavel_id, status, observacao) 
            VALUES (?, ?, ?, ?)
        `);

      stmtLog.run(
        infoPedido.lastInsertRowid,
        req.usuario.id,
        "Em preparação",
        "Pedido aprovado!",
      );
      res.status(201).end();
    } catch (err) {
      console.error("Erro ao registrar pedido:", err);
    }
  }
});
app.get("/meuspedidos", verificarAutenticacao, (req, res) => {
  try {
    // Busca o ID do usuário (trata possíveis divergências de nomenclatura do middleware)
    const usuarioId = req.usuario.id;

    if (!usuarioId) {
      return res.status(401).json({ erro: "Usuário não autenticado." });
    }

    // Sem 'await' e usando '.all()' para trazer todos os pedidos daquele usuario_id
    const pedidos = db
      .prepare("SELECT * FROM pedidos WHERE usuario_id = ?")
      .all(usuarioId);

    res.json(pedidos);
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).json({ erro: "Erro ao buscar os pedidos do usuário." });
  }
});
app.get("/Pedido/:idpedido", verificarAutenticacao, async (req, res) => {
  let pedido = await db
    .prepare("SELECT * FROM pedidos WHERE id=? AND usuario_id = ?")
    .get(req.params.idpedido, req.usuario.id);
  if (!pedido) {
    return res.status(404).end();
  }
  let produtos = pedido.produtos;
  if (typeof produtos === "string") produtos = JSON.parse(produtos);
  // Mantém compatibilidade com pedidos antigos que foram serializados duas vezes.
  if (typeof produtos === "string") produtos = JSON.parse(produtos);

  console.log(produtos);
  
  pedido.produtos = await traformaIdEmProduto(produtos);
  res.json(pedido);
});
async function traformaIdEmProduto(produtos)
{
  console.log(produtos);
  
  console.log(typeof produtos);
  
  if( typeof produtos == 'string')
  {
    produtos = JSON.parse(produtos)
    if( typeof produtos == 'string')
    {
      produtos = JSON.parse(produtos)
    }
  }
  console.log(produtos);
   let listaProdutoAtualizada = [];
  for (let index = 0; index < produtos.length; index++) {
    const element = produtos[index];
    console.log(element);
    
    let dados = await db
      .prepare("SELECT * FROM produtos WHERE id =?")
      .get(Number(element.id));
    console.log(dados);
    
        let nome = dados.nome;
    let valor = dados.preco;
    listaProdutoAtualizada.push({
      nome: nome,
      quantidade: element.quantidade,
      valor: valor,
    });
  }
  return listaProdutoAtualizada
}
app.get("/historico/:idpedido", verificarAutenticacao, async (req, res) => {
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
async function ValorPedido(listaProduto) {
  console.log(listaProduto);
  if (!listaProduto) {
    return null;
  }
  let total = 0;
  for (let index = 0; index < listaProduto.length; index++) {
    const element = listaProduto[index];

    let produto = db
      .prepare("SELECT * FROM produtos WHERE id = ?")
      .get(element.id);

    total += produto.preco * element.quantidade;
  }
  return total;
}

app.get("/listarPedidosAtivo",verificarAutenticacao ,permitirCargos('adm'), async(req,res)=>{
  let dados = await db.prepare("SELECT id, criado_em, produtos FROM pedidos WHERE is_finalizado = 0").all()
  console.log(dados);
   for (let index = 0; index < dados.length; index++) {
    const element = dados[index].produtos;
    console.log(element);
    console.log(await traformaIdEmProduto(element));
    
    dados[index].produtos = await traformaIdEmProduto(element)
  }
  res.json(dados)
 
})
app.post("/finalizarPedido",verificarAutenticacao ,permitirCargos('adm'), async(req,res)=>{
  let {id_pedido} = req.body
  await db.prepare("UPDATE pedidos SET is_finalizado = 1 WHERE id = ?").run(id_pedido)
  await db.prepare("UPDATE pedidos SET status = 'Finalizado' WHERE id = ?").run(id_pedido)

  await db.prepare("INSERT INTO log_pedidos (pedido_id, responsavel_id, status, observacao) VALUES (?,?,?,?)").run(id_pedido, req.usuario.id, 'Saiu para entrega', 'Pedido finalizado e saiu para entrega!')
  await db.prepare("INSERT INTO log_pedidos (pedido_id, responsavel_id, status, observacao) VALUES (?,?,?,?)").run(id_pedido, req.usuario.id, 'Entregue', 'Pedido entregue!')
  res.end()
})
app.get("/pedidoNovo", verificarAutenticacao, permitirCargos("adm"))


app.listen(5501, (err) => {
  if (!err) {
    console.log("Servidor inciado com sucesso!");
  } else {
    console.error(err);
  }
});
