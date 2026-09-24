const express = require("express");
const router = express.Router();
const db = require("../BancoDedados.js");
const {
  verificarAutenticacao,
  permitirCargos,
} = require("../Autenticar.js");
const { traformaIdEmProduto, pedidoNovo } = require("./Servicos.js");

router.get(
  "/listarPedidosAtivo",
  verificarAutenticacao,
  permitirCargos("adm"),
  async (req, res) => {
    let dados = await db
      .prepare(
        "SELECT id, criado_em, produtos FROM pedidos WHERE is_finalizado = 0",
      )
      .all();
    console.log(dados);
    for (let index = 0; index < dados.length; index++) {
      const element = dados[index].produtos;
      console.log(element);
      console.log(await traformaIdEmProduto(element));

      dados[index].produtos = await traformaIdEmProduto(element);
    }
    res.json(dados);
  },
);
router.post(
  "/finalizarPedido",
  verificarAutenticacao,
  permitirCargos("adm"),
  async (req, res) => {
    let { id_pedido } = req.body;
    await db
      .prepare("UPDATE pedidos SET is_finalizado = 1 WHERE id = ?")
      .run(id_pedido);
    await db
      .prepare("UPDATE pedidos SET status = 'Finalizado' WHERE id = ?")
      .run(id_pedido);

    await db
      .prepare(
        "INSERT INTO log_pedidos (pedido_id, responsavel_id, status, observacao) VALUES (?,?,?,?)",
      )
      .run(
        id_pedido,
        req.usuario.id,
        "Saiu para entrega",
        "Pedido finalizado e saiu para entrega!",
      );
    await db
      .prepare(
        "INSERT INTO log_pedidos (pedido_id, responsavel_id, status, observacao) VALUES (?,?,?,?)",
      )
      .run(id_pedido, req.usuario.id, "Entregue", "Pedido entregue!");
    res.end();
  },
);
router.get(
  "/pedidoNovo",
  verificarAutenticacao,
  permitirCargos("adm"),
  async (req, res) => {
    res.header("content-type", "text/event-stream");
    res.header("connection", "keep-alive");
    const intevaloPedido = setInterval(() => {
      while(pedidoNovo.length > 0)
      {
        let element = pedidoNovo.shift()
        res.write("data: " + JSON.stringify(element) + "\n\n");
      }

    },1000);
    req.on("close", () => {
      clearInterval(intevaloPedido);
      res.end();
    });
  },
);

module.exports = router;
