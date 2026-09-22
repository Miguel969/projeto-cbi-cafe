const bcrypt = require('bcrypt');
const db = require('./BancoDedados');

// Dados de demonstração. O marcador torna a execução segura para rodar várias vezes.
db.exec(`
  CREATE TABLE IF NOT EXISTS seed_execucoes (
    nome TEXT PRIMARY KEY,
    executado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const nomeSeed = 'dados-demo-v1';
const seedJaExecutado = Boolean(db.prepare('SELECT 1 FROM seed_execucoes WHERE nome = ?').get(nomeSeed));

const senhaCliente = bcrypt.hashSync('cliente123', 10);
const senhaAdmin = bcrypt.hashSync('admin123', 10);

const inserirCategoria = db.prepare(`
  INSERT INTO categorias (nome, slug) VALUES (?, ?)
  ON CONFLICT(slug) DO UPDATE SET nome = excluded.nome
`);

const inserirProduto = db.prepare(`
  INSERT INTO produtos (categoria_id, nome, descricao, preco, imagem_url, vendas_qtd)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT DO NOTHING
`);

const inserirUsuario = db.prepare(`
  INSERT INTO usuarios (nome, email, senha, endereco, cargo)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET
    nome = excluded.nome,
    senha = excluded.senha,
    endereco = excluded.endereco,
    cargo = excluded.cargo
`);

const inserirPedido = db.prepare(`
  INSERT INTO pedidos (usuario_id, forma_pagamento, produtos, valor_total, status, is_finalizado)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const inserirLog = db.prepare(`
  INSERT INTO log_pedidos (pedido_id, Responsavel_id, status, observacao)
  VALUES (?, ?, ?, ?)
`);
const inserirAvaliacao = db.prepare(`
  INSERT INTO avaliacoes (pedido_id, usuario_id, nota, comentario, permitir_publico)
  VALUES (?, ?, ?, ?, 1)
`);

const ids = {};
const buscarCategoria = (slug) => db.prepare('SELECT id FROM categorias WHERE slug = ?').get(slug).id;
const buscarProduto = (nome) => db.prepare('SELECT id, preco FROM produtos WHERE nome = ?').get(nome);

const adicionarPedido = (email, itens, pagamento, status, historico, avaliacao) => {
  const usuario = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  const total = itens.reduce((soma, item) => soma + item.quantidade * item.produto.preco, 0);
  const produtos = JSON.stringify(itens.map((item) => ({ id: item.produto.id, quantidade: item.quantidade })));
  const pedido = inserirPedido.run(usuario.id, pagamento, produtos, total, status, status === 'concluido' ? 1 : 0);
  for (const etapa of historico) {
    inserirLog.run(pedido.lastInsertRowid, ids.admin, etapa.status, etapa.observacao);
  }
  if (avaliacao) {
    inserirAvaliacao.run(pedido.lastInsertRowid, usuario.id, avaliacao.nota, avaliacao.comentario);
    db.prepare('UPDATE pedidos SET is_avaliado = 1 WHERE id = ?').run(pedido.lastInsertRowid);
  }
};

const popular = db.transaction(() => {
  inserirCategoria.run('Cafés Quentes', 'quentes');
  inserirCategoria.run('Gelados e Chás', 'gelados');
  inserirCategoria.run('Salgados', 'salgados');
  inserirCategoria.run('Sobremesas', 'sobremesas');

  inserirProduto.run(buscarCategoria('quentes'), 'Mocha da Casa', 'Espresso, chocolate e leite vaporizado.', 15.5, 'https://placehold.co/180x140?text=Mocha', 36);
  inserirProduto.run(buscarCategoria('quentes'), 'Café Coado Especial', 'Café filtrado com grãos selecionados.', 9.5, 'https://placehold.co/180x140?text=Coado', 28);
  inserirProduto.run(buscarCategoria('gelados'), 'Cold Brew Cítrico', 'Café extraído a frio com laranja e gelo.', 17, 'https://placehold.co/180x140?text=Cold+Brew', 21);
  inserirProduto.run(buscarCategoria('gelados'), 'Chá Verde com Limão', 'Chá verde gelado, limão e hortelã.', 12.5, 'https://placehold.co/180x140?text=Cha', 19);
  inserirProduto.run(buscarCategoria('salgados'), 'Pão de Queijo Mineiro', 'Porção com seis unidades quentinhas.', 10, 'https://placehold.co/180x140?text=Pao+de+Queijo', 44);
  inserirProduto.run(buscarCategoria('salgados'), 'Sanduíche Caprese', 'Pão artesanal, muçarela de búfala, tomate e manjericão.', 22, 'https://placehold.co/180x140?text=Caprese', 16);
  inserirProduto.run(buscarCategoria('sobremesas'), 'Brownie com Nozes', 'Brownie de chocolate intenso com nozes.', 13.5, 'https://placehold.co/180x140?text=Brownie', 33);
  inserirProduto.run(buscarCategoria('sobremesas'), 'Cookie de Chocolate', 'Cookie crocante por fora e macio por dentro.', 8.5, 'https://placehold.co/180x140?text=Cookie', 31);

  inserirUsuario.run('Administrador', 'admin@cbicafe.com', senhaAdmin, 'Escritório Central', 'adm');
  inserirUsuario.run('Ana Souza', 'ana@email.com', senhaCliente, 'Rua das Flores, 123', 'cliente');
  inserirUsuario.run('Bruno Lima', 'bruno@email.com', senhaCliente, 'Av. Paulista, 800', 'cliente');
  inserirUsuario.run('Carla Mendes', 'carla@email.com', senhaCliente, 'Rua do Café, 45', 'cliente');
  ids.admin = db.prepare("SELECT id FROM usuarios WHERE email = 'admin@cbicafe.com'").get().id;

  const p = (nome) => buscarProduto(nome);
  adicionarPedido('ana@email.com', [{ produto: p('Mocha da Casa'), quantidade: 1 }, { produto: p('Brownie com Nozes'), quantidade: 2 }], 'pix', 'concluido', [
    { status: 'Pedido aprovado', observacao: 'Pagamento aprovado.' },
    { status: 'Em preparação', observacao: 'A cozinha começou a preparar o pedido.' },
    { status: 'Saiu para entrega', observacao: 'Pedido enviado para entrega.' },
    { status: 'Entregue', observacao: 'Pedido entregue ao cliente.' }
  ], { nota: 5, comentario: 'Tudo delicioso e chegou bem embalado!' });
  adicionarPedido('bruno@email.com', [{ produto: p('Cold Brew Cítrico'), quantidade: 1 }, { produto: p('Pão de Queijo Mineiro'), quantidade: 1 }], 'cartao', 'em_preparo', [
    { status: 'Pedido aprovado', observacao: 'Pagamento aprovado.' },
    { status: 'Em preparação', observacao: 'Itens sendo preparados.' }
  ]);
  adicionarPedido('carla@email.com', [{ produto: p('Sanduíche Caprese'), quantidade: 1 }, { produto: p('Cookie de Chocolate'), quantidade: 2 }], 'dinheiro', 'pendente', [
    { status: 'Pedido aprovado', observacao: 'Pedido recebido e aguardando confirmação do pagamento.' }
  ]);
  adicionarPedido('ana@email.com', [{ produto: p('Café Coado Especial'), quantidade: 2 }, { produto: p('Chá Verde com Limão'), quantidade: 1 }], 'pix', 'concluido', [
    { status: 'Pedido aprovado', observacao: 'Pagamento aprovado.' },
    { status: 'Em preparação', observacao: 'Pedido sendo preparado.' },
    { status: 'Saiu para entrega', observacao: 'Pedido enviado para entrega.' },
    { status: 'Entregue', observacao: 'Pedido pronto e entregue para retirada.' }
  ], { nota: 4, comentario: 'Café muito bom e atendimento rápido.' });

  db.prepare('INSERT INTO seed_execucoes (nome) VALUES (?)').run(nomeSeed);
});

if (!seedJaExecutado) {
  popular();
}

// Migração para bancos que já receberam a primeira versão do seed.
const nomeHistorico = 'historico-demo-v2';
if (!db.prepare('SELECT 1 FROM seed_execucoes WHERE nome = ?').get(nomeHistorico)) {
  const adicionarHistorico = db.transaction(() => {
    const admin = db.prepare("SELECT id FROM usuarios WHERE email = 'admin@cbicafe.com'").get();
    const pedidos = db.prepare(`
      SELECT pedidos.id, pedidos.status
      FROM pedidos
      INNER JOIN usuarios ON usuarios.id = pedidos.usuario_id
      WHERE usuarios.email IN ('ana@email.com', 'bruno@email.com', 'carla@email.com')
        AND pedidos.id > 1
      ORDER BY pedidos.id
    `).all();

    for (const pedido of pedidos) {
      const existente = db.prepare('SELECT COUNT(*) AS total FROM log_pedidos WHERE pedido_id = ?').get(pedido.id).total;
      if (existente > 1) continue;
      db.prepare('DELETE FROM log_pedidos WHERE pedido_id = ?').run(pedido.id);
      const etapas = pedido.status === 'concluido'
        ? [['Pedido aprovado', 'Pagamento aprovado.'], ['Em preparação', 'Pedido preparado.'], ['Saiu para entrega', 'Pedido enviado para entrega.'], ['Entregue', 'Pedido entregue ao cliente.']]
        : pedido.status === 'em_preparo'
          ? [['Pedido aprovado', 'Pagamento aprovado.'], ['Em preparação', 'Itens sendo preparados.']]
          : [['Pedido aprovado', 'Pedido recebido e aguardando confirmação do pagamento.']];
      for (const [status, observacao] of etapas) inserirLog.run(pedido.id, admin.id, status, observacao);
    }
    db.prepare('INSERT INTO seed_execucoes (nome) VALUES (?)').run(nomeHistorico);
  });
  adicionarHistorico();
}

console.log(seedJaExecutado ? 'Histórico dos pedidos atualizado.' : 'Dados de teste inseridos com sucesso.');
console.log('Login admin: admin@cbicafe.com / admin123');
console.log('Login cliente: ana@email.com / cliente123');
