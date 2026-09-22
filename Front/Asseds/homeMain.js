const ListaAvaliacao = document.querySelector(".ListaAvaliacao")
const ListaDestaques = document.querySelector(".ListaDestaques")
const contadorCarrinho = document.querySelector(".contador-carrinho")
let quantiadeDeProduto = 0
let dadosBanco = localStorage.getItem("Carinho") 
const AvaliacaoLista = document.getElementById("ListaAvaliacao")
dadosBanco = JSON.parse(dadosBanco)
  let produtosCarinho
  console.log(dadosBanco);
console.log((dadosBanco));
let valorTotal = 0
if(dadosBanco !== null)
{
  produtosCarinho = dadosBanco.Produtos 
  quantiadeDeProduto = dadosBanco.quantiadeDeProduto
  valorTotal = dadosBanco.valorTotal
}else{
    produtosCarinho = []
}


const ListaProdutosCarinhoUi = document.querySelector(".preview-lista-itens")

const TotalConta = document.getElementById('TotalConta')
async function ListarProdutos() {
    let resultado = await fetch("/destaques")
    let dados = await resultado.json()
    ListaDestaques.innerHTML = ''
    dados.forEach((element)=>{
        ListaDestaques.innerHTML += `<div class="CardDestaque">
                    <div class="ImgProduto">
                        <img src="https://placehold.co/100x100" alt="Café com chocolate">
                    </div>
                    <div class="InfoProduto">
                        <h3>${element.nome}</h3>
                        <p>${element.descricao}</p>
                    </div>
                    <div class="cardAddCarinho">
                        <span>R$ ${element.preco}</span>
<button onclick="AddProduto('${element.id}', '${element.nome}', ${element.preco})">Adicionar ao carrinho</button>
                    </div>
                </div>`
    })
}
ListarProdutos()

async function MostraAvaliacao()
{
    let resultado = await fetch("/avaliacoes")
    let dados = await resultado.json()
    AvaliacaoLista.innerHTML =''
    
    dados.forEach((element)=>{
        let estrela = ''
        for (let index = 0; index < element.nota; index++) {
            estrela += '<img src="/Front/Asseds/EstrelaAtivada.png" alt="Estrelas de avaliação">'
            
        }
        console.log(estrela);
        console.log(5-Number(element.nota));
        
        if((5-Number(element.nota))>0 )
        {
             for (let index = 0; index < (5-Number(element.nota)); index++) {
            estrela += '<img src="/Front/Asseds/EstrelaDesativada.png" alt="Estrelas de avaliação">'
            
            
        }
        }
        AvaliacaoLista.innerHTML += `<div class="cardAvaliacao">
                    <img src="https://placehold.co/100x100" alt="Foto da Julia">
                    <div>
                        <span>${element.nome}</span>
                    </div>
                    <div class="AvaliacaoText">
                        <p>${element.comentario}</p>
                        <div class="Estrelas" title='Nota: ${element.nota}/5'>
                            ${estrela}
                        </div>
                    </div>
                </div>`
    })
}
MostraAvaliacao()
function AddProduto(id,nome,valor)
{
    console.log(id,nome,valor);
   
    let produtoNoCarinho = produtosCarinho.find((value)=> value?.id == id)
    if(produtoNoCarinho)
    {
        produtoNoCarinho.quantidade +=1
    }else{
        produtosCarinho.push({id:id,nome:nome,quantidade:1,valor:valor})
    }
    valorTotal+= valor
     quantiadeDeProduto++
    AtualizarCarinho()
    SalvarBanco()
}
function AtualizarCarinho()
{
    
    contadorCarrinho.textContent = quantiadeDeProduto
    ListaProdutosCarinhoUi.innerHTML = ''
    produtosCarinho.forEach((element)=>{
        ListaProdutosCarinhoUi.innerHTML += `<li class="preview-item">
                <img src="https://placehold.co/40x40" alt="Espresso Observador">
                <div class="preview-detalhes">
                    <span class="preview-nome">${element.nome}</span>
                    <span class="preview-qtd-preco">${element.quantidade} R$ ${element.valor}</span>
                </div>
            </li>`
    })
    TotalConta.textContent = valorTotal + ' R$'
}
function SalvarBanco()
{
    localStorage.setItem("Carinho", JSON.stringify({Produtos:produtosCarinho, quantiadeDeProduto:quantiadeDeProduto,valorTotal:valorTotal}))
}
AtualizarCarinho()