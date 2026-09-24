const db = require("../BancoDedados.js");

async function traformaIdEmProduto(produtos) {
  console.log(produtos);

  console.log(typeof produtos);

  if (typeof produtos == "string") {
    produtos = JSON.parse(produtos);
    if (typeof produtos == "string") {
      produtos = JSON.parse(produtos);
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
  return listaProdutoAtualizada;
}

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

let pedidoNovo = [];

module.exports = { traformaIdEmProduto, ValorPedido, pedidoNovo };
