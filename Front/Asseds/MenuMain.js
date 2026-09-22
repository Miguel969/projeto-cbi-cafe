const Categoria = document.getElementById("select-categoria")
const ListaProdutos = document.getElementById("grid-produtos")
let quantiadeDeProduto = 0
let dadosBanco = localStorage.getItem("Carinho") 
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

const contadorCarrinho = document.querySelector(".contador-carrinho")

const ListaProdutosCarinhoUi = document.querySelector(".preview-lista-itens")

const TotalConta = document.getElementById('TotalConta')
async function ListarCategoria(params) {
    let resultado = await fetch("/categorias")
    let dados = await resultado.json()
    Categoria.innerHTML ='<option value="">Todos</option>'
    dados.forEach(element => {
        Categoria.innerHTML += `<option value="${element.id}">${element.nome}</option>`
    });
}
ListarCategoria()

async function ListarProdutos(Filtro) {
    let resultado = await fetch("/produtos")
    let dados = await resultado.json()
    ListaProdutos.innerHTML = ''
    for (let index = 0; index < dados.length; index++) {
        const element = dados[index];
        if(element.categoria_id == Filtro || !Filtro)
        {
            ListaProdutos.innerHTML += `<article class="CardProduto quentes">
                <div class="ImgProduto">
                    <img src="${element.imagem_url}" alt="Espresso Observador">
                </div>
                <div class="InfoProduto">
                    <h4>${element.nome}</h4>
                    <p>${element.descricao}</p>
                </div>
                <div class="cardAddCarinho">
                    <span>R$ ${element.preco}</span>
                   <button onclick="AddProduto('${element.id}', '${element.nome}', ${element.preco})">Adicionar ao carrinho</button>
                </div>
            </article>`
        }
    }
}
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
    localStorage.setItem("Carinho", JSON.stringify({Produtos:produtosCarinho, quantiadeDeProduto:quantiadeDeProduto, valorTotal: valorTotal}))
}
AtualizarCarinho()
ListarProdutos()