const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cookieparser = require("cookie-parser")
const db = require('./BancoDedados');

// Configurações padrão via variáveis de ambiente
const JWT_SECRET = process.env.JWT_SECRET
const TEMP_TOKEN_TIME = '15m';
const TEMP_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutos em ms

router.use(express.json());
router.use(cookieparser())
// ==========================================
// FUNÇÕES AUXILIARES DE CRIPTOGRAFIA
// ==========================================
async function hashSenha(senha) {
    return bcrypt.hash(senha, 10);
}

async function verificarSenha(senha, senhaHash) {
    return bcrypt.compare(senha, senhaHash);
}

// ==========================================
// MIDDLEWARES DE AUTENTICAÇÃO E AUTORIZAÇÃO
// ==========================================

// Autentica o usuário por Token Temp ou Refresh Token
function verificarAutenticacao(req, res, next) {
    const tokenTemp = req.cookies?.tokenTemp;
    const tokenRefresh = req.cookies?.tokenRefresh;

    // 1. Valida o Token Temporário (Acesso rápido)
    if (tokenTemp) {
        try {
            const decoded = jwt.verify(tokenTemp, JWT_SECRET);
            req.usuario = { id: decoded.id, cargo: decoded.cargo };
            return next();
        } catch (err) {
            console.warn('Token temporário expirado ou inválido. Tentando Refresh Token.');
        }
    }

    // 2. Tenta revalidar via Refresh Token caso o Temp tenha expirado
    if (tokenRefresh) {
        try {
            const decodedRefresh = jwt.verify(tokenRefresh, JWT_SECRET);

            // better-sqlite3: .get() busca 1 único registro
            const user = db.prepare("SELECT id, cargo FROM usuarios WHERE id = ?").get(decodedRefresh.id);

            if (!user) {
                return res.status(401).json({ erro: "Usuário não encontrado." });
            }

            req.usuario = { id: user.id, cargo: user.cargo };

            // Gera novo token temporário e renova o cookie
            const novoTokenTemp = jwt.sign(
                { id: user.id, cargo: user.cargo },
                JWT_SECRET,
                { expiresIn: TEMP_TOKEN_TIME }
            );

            res.cookie('tokenTemp', novoTokenTemp, {
                maxAge: TEMP_COOKIE_MAX_AGE,
                httpOnly: true,
                sameSite: 'lax'
            });

            return next();

        } catch (err) {
            console.error('Refresh token inválido ou expirado.', err);
            return res.status(401).json({ erro: "Sessão expirada. Faça login novamente." });
        }
    }

    return res.status(401).json({ erro: "Acesso negado. Token não fornecido." });
}

// Middleware genérico para restrição de cargos ex: permitirCargos('adm')
function permitirCargos(...cargosPermitidos) {
    return (req, res, next) => {
        if (!req.usuario || !cargosPermitidos.includes(req.usuario.cargo)) {
            return res.status(403).json({ erro: "Permissão insuficiente para acessar este recurso." });
        }
        next();
    };
}

// ==========================================
// ROTAS DE AUTENTICAÇÃO
// ==========================================

// Criar Conta (Registro)
router.post("/registrar", async (req, res) => {
    const { email, nome, senha } = req.body;

    if (!email || !nome || !senha) {
        return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ erro: "Formato de e-mail inválido." });
    }

    if (nome.trim().length < 3) {
        return res.status(400).json({ erro: "O nome deve ter pelo menos 3 caracteres." });
    }

    if (senha.length < 8) {
        return res.status(400).json({ erro: "A senha deve ter pelo menos 8 caracteres." });
    }

    try {
        const senhaHash = await hashSenha(senha);

        // better-sqlite3: .run() para inserções
        db.prepare("INSERT INTO usuarios (nome, email, senha, cargo) VALUES (?, ?, ?, 'cliente')")
          .run(nome, email, senhaHash);

        return res.status(201).json({ mensagem: "Usuário cadastrado com sucesso!" });
    } catch (err) {
        console.error('Erro ao registrar usuário:', err);
        return res.status(409).json({ erro: "E-mail já cadastrado ou erro interno no servidor." });
    }
});

// Realizar Login
router.post("/login", async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
    }

    try {
        // better-sqlite3: .get() busca o usuário pelo e-mail
        const user = db.prepare("SELECT id, senha, cargo FROM usuarios WHERE email = ?").get(email);

        if (!user || !(await verificarSenha(senha, user.senha))) {
            return res.status(401).json({ erro: "E-mail ou senha incorretos." });
        }

        const payload = { id: user.id, cargo: user.cargo };
        
        const tokenTemp = jwt.sign(payload, JWT_SECRET, { expiresIn: TEMP_TOKEN_TIME });
        const tokenRefresh = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('tokenTemp', tokenTemp, { maxAge: TEMP_COOKIE_MAX_AGE, httpOnly: true });
        res.cookie('tokenRefresh', tokenRefresh, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true });

        return res.status(200).json({ mensagem: "Login realizado com sucesso.", cargo: user.cargo });
    } catch (err) {
        console.error("Erro no login:", err);
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Obter Perfil do Usuário Logado
router.get("/perfil", verificarAutenticacao, (req, res) => {
    try {
        // better-sqlite3: .get() para retornar o objeto do usuário
        const user = db.prepare("SELECT id, nome, email, cargo FROM usuarios WHERE id = ?")
                       .get(req.usuario.id);
        
        return res.json(user);
    } catch (err) {
        return res.status(500).json({ erro: "Erro ao buscar dados do perfil." });
    }
});

// Encerrar Sessão (Logout)
router.post("/logout", verificarAutenticacao, (req, res) => {
    res.clearCookie('tokenTemp');
    res.clearCookie('tokenRefresh');
    return res.status(200).json({ mensagem: "Sessão encerrada com sucesso." });
});

// Alterar a Própria Senha
router.post("/trocar-senha", verificarAutenticacao, async (req, res) => {
    const { senha } = req.body;

    if (!senha || senha.length < 8) {
        return res.status(400).json({ erro: "A nova senha deve ter no mínimo 8 caracteres." });
    }

    try {
        const senhaHash = await hashSenha(senha);

        // better-sqlite3: .run() para atualizações
        db.prepare("UPDATE usuarios SET senha = ? WHERE id = ?").run(senhaHash, req.usuario.id);

        return res.status(200).json({ mensagem: "Senha alterada com sucesso." });
    } catch (err) {
        return res.status(500).json({ erro: "Erro ao atualizar senha." });
    }
});

// ==========================================
// ROTAS ADMINISTRATIVAS
// ==========================================

// Listar Usuários (Restrito a 'adm')
router.get("/admin/usuarios", verificarAutenticacao, permitirCargos('adm'), (req, res) => {
    const keyCache = 'listaUsuarios';

    if (cache && cache.get(keyCache)) {
        return res.json(cache.get(keyCache));
    }

    try {
        // better-sqlite3: .all() retorna uma array com todos os registros
        const usuarios = db.prepare("SELECT id, nome, email, cargo, criado_em FROM usuarios").all();
        
        if (cache) cache.set(keyCache, usuarios);
        return res.json(usuarios);
    } catch (err) {
        return res.status(500).json({ erro: "Erro ao listar usuários." });
    }
});

// Reset de Senha por Admin (Define uma senha temporária)
router.post("/admin/reset-senha", verificarAutenticacao, permitirCargos('adm'), async (req, res) => {
    const { id, novaSenha } = req.body;

    if (!id) {
        return res.status(400).json({ erro: "ID do usuário é obrigatório." });
    }

    const senhaFinal = novaSenha || '12345678';

    try {
        const senhaPadraoHash = await hashSenha(senhaFinal);

        db.prepare("UPDATE usuarios SET senha = ? WHERE id = ?").run(senhaPadraoHash, id);

        return res.status(200).json({ mensagem: `Senha do usuário ${id} resetada com sucesso.` });
    } catch (err) {
        return res.status(500).json({ erro: "Erro ao resetar senha." });
    }
});

// Alterar Cargo de Usuário (Restrito a 'adm')
router.patch("/admin/atualizar-cargo", verificarAutenticacao, permitirCargos('adm'), (req, res) => {
    const { id, cargo } = req.body;

    if (!id || !cargo) {
        return res.status(400).json({ erro: "ID e novo cargo são obrigatórios." });
    }

    try {
        db.prepare("UPDATE usuarios SET cargo = ? WHERE id = ?").run(cargo, id);

        if (cache) cache.del('listaUsuarios');

        return res.status(200).json({ mensagem: "Cargo atualizado com sucesso." });
    } catch (err) {
        return res.status(500).json({ erro: "Erro ao atualizar cargo." });
    }
});

module.exports = { router, verificarAutenticacao, permitirCargos };