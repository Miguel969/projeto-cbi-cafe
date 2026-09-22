const ListaPedidos = document.getElementById("ListaPedidos")
let idPedidoAtual = 0
const evtSource = new EventSource()
async function ListarPedidos() {
    let resultado = await fetch("/listarPedidosAtivo")
    let dados = await resultado.json()
    console.log(dados);

    ListaPedidos.innerHTML = ''
    for (let index = 0; index < dados.length; index++) {
        const element = dados[index];

        let produtosElemento = ''
        for (let index = 0; index < element.produtos.length; index++) {
            const produto = element.produtos[index];
            produtosElemento += `<span>${produto.nome} ${produto.quantidade}x</span>`
        }
        console.log(element);
        await CriarCardPedido(element,produtosElemento)
        

    };
}
ListarPedidos()
async function CriarCardPedido(element,produtosElemento) {
     let elemento = ListaPedidos.insertAdjacentHTML('beforeend', `<div class="CardPedido">
                <div class="TopCard">
                    <span value=0>#${element.id}</span>
                    <span class="Timer" >00:00</span>
                    <button><img src="../Asseds/IconeProblema.png" alt=""></button>
                </div>
                <div class="Produtos">
                    ${produtosElemento}
                </div>
                <div class="BtEntregar">
                    <button onclick="finalizarPedido(${element.id},this.parentElement.parentElement)">Pedido Pronto</button>
                </div>
            </div>`)
    elemento = ListaPedidos.lastElementChild;

    let timer = await elemento.querySelector(".Timer")

    Cronometro(timer)
}
function AtualizarStatus() {
   
}
async function finalizarPedido(id_pedido,ui) {
    let dados = {id_pedido:id_pedido}
    let resultado = await fetch("/finalizarPedido",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(dados)})
    if(resultado.ok)
    {
        ui.remove()
    }
}
function Cronometro(textTempo) {
    let tempo = 0;

    setInterval(() => {
        tempo++;

        const minutos = Math.floor(tempo / 60);
        const segundos = tempo % 60;

        // Adiciona o zero à esquerda para manter o formato 00:00
        const minFormatado = String(minutos).padStart(2, '0');
        const segFormatado = String(segundos).padStart(2, '0');

        // Se for um <input>, usa .value; se for <span> ou <div>, usa .textContent
        if ('value' in textTempo) {
            textTempo.value = `${minFormatado}:${segFormatado}`;
        } else {
            textTempo.textContent = `${minFormatado}:${segFormatado}`;
        }
    }, 1000);


}

