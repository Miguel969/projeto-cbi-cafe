const HEADER_HTML = `<div class="Logo">
    <img src="/Front/Asseds/Logo.png" alt="Logo CBI Café">
</div>
<div><h1>CBI Café</h1></div>
<nav id="navMenu" aria-label="Navegação principal">
    <a href="/Front/Paginas/Home.html">Home</a>
    <a href="/Front/Paginas/Menu.html">Menu</a>
    <a href="/Front/Paginas/MeuPedidos.html">Meus Pedidos</a>
</nav>
<div id="Perfil"></div>`;

const FOOTER_HTML = `<p>&copy; 2026 CBI Café. Todos os direitos reservados.</p>
<p>Horário: Segunda a Sábado - 07h às 20h | Contato: contato@cbicafe.com.br</p>`;
const cssHEeader= '    <link rel="stylesheet" href="../Asseds/HeaderFooter.css">'
function garantirElemento(tagName, seletor, referencia, posicao) {
    let elemento = document.querySelector(seletor);
    if (!elemento) {
        elemento = document.createElement(tagName);
        referencia.insertAdjacentElement(posicao, elemento);
    }
    return elemento;
}
document.querySelector("head").innerHTML += cssHEeader
async function InciarHeader() {
    const header = garantirElemento("header", "header", document.body, "afterbegin");
    const footer = garantirElemento("footer", "footer", document.body, "beforeend");
    header.innerHTML = HEADER_HTML;
    footer.innerHTML = FOOTER_HTML;

    const resultado = await fetch("/autenticar/perfil");
    const perfil = document.getElementById("Perfil");
    if (resultado.ok) {
        const dados = await resultado.json();
        perfil.innerHTML = `<span>${dados.nome}${dados.cargo === "adm" ? " - Administrador" : ""}</span>
            <button type="button" onclick="SairConta()">Sair</button>`;
    } else {
        perfil.innerHTML = `<button type="button" onclick="IrParaOlogin()">Fazer login</button>`;
    }
}

function IrParaOlogin() { window.location.href = "/Front/Paginas/Login.html"; }

async function SairConta() {
    await fetch("/autenticar/logout", { method: "POST" });
    window.location.reload();
}

InciarHeader().catch((erro) => console.error("Não foi possível carregar o cabeçalho:", erro));
