const ListaPedidos = document.getElementById("ListaPedidos");
const TituloDetalhe = document.getElementById("TituloDetalhe");
const HistoricoLista = document.getElementById("HistoricoLista");
const ListaProdutosComprados = document.getElementById(
  "ListaProdutosComprados",
);
const ValorTotal = document.getElementById("ValorTotal");
const DetalheUI = document.getElementById("DetalhePedido");
const StatusAtualDetalhe = document.getElementById("StatusAtualDetalhe");
const BtAvaliar = document.getElementById("AvaliarBt");
const ListaEstrelaForm = document.querySelectorAll(".NotaEstrela img");
let notaAtual = 0;
let pedido_id = 0
const ModalAvaliacao = document.querySelector(".ModalAvaliacao");
const FormAvaliacao = document.getElementById("FormAvaliacao");
async function ListarPedidos() {
  let resultado = await fetch("/meuspedidos");
  let dados = await resultado.json();
  ListaPedidos.innerHTML = "";
  dados.forEach((element) => {
    ListaPedidos.innerHTML += ` <article class="CardPedido Ativo" onclick='MostrarPedido(${element.id})'>
            <div class="InfoPedido">
              <span class="CodigoPedido">#${element.id}</span>
              <span class="DataPedido">${element.criado_em}</span>
            </div>
            <div class="StatusEntrega">
              <span>${element.status}</span>
            </div>
            <div class="Preco">
              <span>R$ ${element.valor_total}</span>
            </div>
          </article>`;
  });
}
async function MostrarPedido(idPedido) {
  let resultadoPedido = await fetch(`/Pedido/${idPedido}`);
  let dadosPedido = await resultadoPedido.json();
  let resultadoLog = await fetch(`/historico/${idPedido}`);
  let dadosLog = await resultadoLog.json();
  DetalheUI.style.display = "flex";
  TituloDetalhe.textContent = `Detalhe do pedido #${idPedido}`;
  StatusAtualDetalhe.textContent = dadosPedido.status;
  HistoricoLista.innerHTML = "";
  dadosLog.forEach((element) => {
    HistoricoLista.innerHTML += ` <li><div class="Registro">
                <p> ${element.status} - ${element.criado_em}</p>
                <p>${element.observacao}</p>
              </div></li>`;
  });
  MostrarProdutos(dadosPedido);
        BtAvaliar.style.color = 'white'

  if (dadosPedido.is_avaliado == false && dadosPedido.is_finalizado == true) {
    BtAvaliar.disabled = false;

  } else {
    BtAvaliar.disabled = true;
    if (dadosPedido.is_avaliado == true)
    {
      BtAvaliar.textContent = 'Avaliado'
      BtAvaliar.style.color = 'var(--color-success)'
    }
  }
  InciarEstrela();
  pedido_id = dadosPedido.id
}
function MostrarProdutos(dadosPedido) {
  ListaProdutosComprados.innerHTML = "";
  dadosPedido.produtos.forEach((element) => {
    ListaProdutosComprados.innerHTML += `<td>${element.nome}</td>
                <td>${element.quantidade}</td>
                <td>R$${element.valor}</td>`;
    ValorTotal.textContent = `R$ ${dadosPedido.valor_total}`;
  });
}
function InciarEstrela() {
  notaAtual = 0;
  for (let index = 0; index < ListaEstrelaForm.length; index++) {
    const element = ListaEstrelaForm[index];
    element.src = "../Asseds/EstrelaDesativada.png";
    element.addEventListener("click", () => {
      Nota(index + 1);
    });
  }
}
InciarEstrela();
function Nota(nota) {
  notaAtual = nota;
  for (let index = 0; index < 5; index++) {
    const element = ListaEstrelaForm[index];
    if (index < nota) {
      element.src = "../Asseds/EstrelaAtivada.png";
    } else {
      element.src = "../Asseds/EstrelaDesativada.png";
    }
    console.log(element);
  }
  if (nota < 5) {
    for (let index = nota - 5; index < 5; index++) {}
  }
}
function FecharForm() {
  ModalAvaliacao.style.display = "none";
}
function AbrirForm() {
  ModalAvaliacao.style.display = "flex";
}
FormAvaliacao.addEventListener("submit", async (event) => {
  event.preventDefault();
  let dados = {idPedido:pedido_id, cometario:document.getElementById("Cometario").value , isPublicar:document.getElementById("Permitir").value, nota:notaAtual}
  let resultado = await fetch('/avaliar',{method:"POST", headers:{"Content-Type":"application/json"},body: JSON.stringify(dados)})
  if(resultado.ok)
  {
    alert("Pedido avaliado com sucesso! Obrigado(a)!")
    FecharForm()
  }else{
    alert("Erro ao avaliar o pedido!")
    FecharForm()
  }
});
ListarPedidos();
