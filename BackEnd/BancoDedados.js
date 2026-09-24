const Database = require('better-sqlite3');
const path = require('path');

// Abre/Cria o arquivo do banco de dados
const db = new Database(path.resolve(__dirname, 'cbicafe.db'));
db.pragma('foreign_keys = ON');

// Criar tabelas
db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoria_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco REAL NOT NULL,
        imagem_url TEXT DEFAULT 'https://placehold.co/180x140',
        ativo INTEGER DEFAULT 1,
        vendas_qtd INTEGER DEFAULT 0,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    );

    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        endereco TEXT,
        cargo TEXT NOT NULL DEFAULT 'cliente' CHECK(cargo IN ('cliente', 'adm')),
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        forma_pagamento TEXT NOT NULL,
        produtos TEXT NOT NULL,
        valor_total REAL NOT NULL,
        status TEXT DEFAULT 'pendente',
        is_finalizado INTEGER NOT NULL DEFAULT 0,
        is_avaliado INTEGER NOT NULL DEFAULT 0,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS log_pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER NOT NULL,
        Responsavel_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        observacao TEXT,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
        FOREIGN KEY (Responsavel_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS avaliacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pedido_id INTEGER UNIQUE,
        usuario_id INTEGER NOT NULL,
        nota INTEGER NOT NULL CHECK(nota BETWEEN 1 AND 5),
        comentario TEXT,
        permitir_publico INTEGER DEFAULT 0,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
`);

// Migração para bancos criados antes da coluna is_finalizado existir.
const colunasPedidos = db.prepare('PRAGMA table_info(pedidos)').all();
if (!colunasPedidos.some((coluna) => coluna.name === 'is_finalizado')) {
    db.exec('ALTER TABLE pedidos ADD COLUMN is_finalizado INTEGER NOT NULL DEFAULT 0');
    db.exec("UPDATE pedidos SET is_finalizado = CASE WHEN status = 'concluido' THEN 1 ELSE 0 END");
}

if (!colunasPedidos.some((coluna) => coluna.name === 'is_avaliado')) {
    db.exec('ALTER TABLE pedidos ADD COLUMN is_avaliado INTEGER NOT NULL DEFAULT 0');
    db.exec(`
        UPDATE pedidos
        SET is_avaliado = 1
        WHERE id IN (SELECT pedido_id FROM avaliacoes WHERE pedido_id IS NOT NULL)
    `);
}

// Função para popular dados iniciais se o banco estiver vazio
function popularBanco() {
    const total = db.prepare('SELECT COUNT(*) as count FROM categorias').get();

    if (total.count === 0) {
        console.log('Inserindo dados de teste no banco...');

        db.exec(`
            INSERT INTO categorias (nome, slug) VALUES 
            ('Cafés Quentes', 'quentes'),
            ('Gelados e Chás', 'gelados'),
            ('Salgados', 'salgados'),
            ('Sobremesas', 'sobremesas');

            INSERT INTO produtos (categoria_id, nome, descricao, preco, vendas_qtd) VALUES 
            (1, 'Espresso Observador', 'Grãos 100% arábica com torra média e notas de nozes.', 8.00, 42),
            (1, 'Cappuccino Tático', 'Espresso, leite vaporizado, cacau em pó e toque de canela.', 14.00, 25),
            (2, 'Chá Preto Tradicional', 'Infusão clássica de chá preto com aroma levemente defumado.', 12.00, 10),
            (2, 'Iced Latte Dedução', 'Café gelado expresso com leite, gelo e calda de caramelo.', 16.00, 30),
            (3, 'Croissant Artesanal', 'Massa folhada amanteigada, assada diariamente.', 11.00, 50),
            (3, 'Quiche de Alho-Poró', 'Massa leve recheada com alho-poró e queijo gruyère.', 15.00, 18),
            (4, 'Torta Red Velvet', 'Camadas macias com recheio leve de cream cheese.', 18.00, 22),
            (4, 'Cheesecake Vermelho', 'Base crocante com creme de queijo e calda de frutas vermelhas.', 17.00, 15);

            INSERT INTO usuarios (nome, email, senha, endereco, cargo) VALUES 
            ('Administrador', 'admin@cbicafe.com', 'admin123', 'Escritório Central', 'adm'),
            ('Ana Souza', 'ana@email.com', 'senha123', 'Rua das Flores, 123', 'cliente');

            INSERT INTO pedidos (usuario_id, forma_pagamento, produtos, valor_total, status) 
            VALUES (2, 'pix', '[{"id":1,"qtd":1},{"id":5,"qtd":1}]', 24.00, 'concluido');

            INSERT INTO avaliacoes (pedido_id, usuario_id, nota, comentario, permitir_publico) 
            VALUES (1, 2, 5, 'Café e croissant impecáveis! Atendimento nota 10.', 1);
        `);
    }
}

popularBanco();

module.exports = db;
