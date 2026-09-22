const listaProduto = document.querySelector('.lista-itens-checkout')
let dadosBanco = localStorage.getItem("Carinho")
dadosBanco = JSON.parse(dadosBanco).Produtos
let TotalUi = document.getElementById("Total")
let valor = 0
const sleep = (s) => new Promise((resolve) => setTimeout(resolve, s * 1000));
const InputCep = document.getElementById("cep")
const InputComplemento = document.getElementById("Nresidencia")
const EnderecoElemento = document.getElementById("Endereco")
let endereco = ''
let Nresidencia = ''
let formPedido = document.getElementById("checkout-container")
let formaPagamento = document.getElementById("pagamento")
async function MostrarProdutos() {
    listaProduto.innerHTML = ''
    for (const element of dadosBanco) {
        listaProduto.innerHTML += `<li>
                        <span>${element.nome} (x${element.quantidade})</span>
                        <strong>R$ ${element.valor * element.quantidade}</strong>
                    </li>`;

        valor += element.valor * element.quantidade;
        

        // Agora o await vai funcionar e pausar o loop de verdade
        
        await sleep(0.15);
    }
   await incrementarValor(valor)

}
InputCep.addEventListener("focusout", async (event) => {

    if (InputCep.value.length == 8 && Number(InputCep.value)) {
        let dadosCep = await fetch(`https://viacep.com.br/ws/${InputCep.value}/json/`)
            .then(response => response.json());
        if(dadosCep.erro)
        {
            alert("CEP não encontrado!")
            return
        }
        console.log(dadosCep)
        endereco = `${dadosCep.logradouro}, ${dadosCep.bairro} `
        EnderecoElemento.textContent = `${endereco},${Nresidencia}`
    }
})
InputComplemento.addEventListener("focusout", (event) => {
    if (Number(InputComplemento.value)) {
        Nresidencia = InputComplemento.value
        EnderecoElemento.textContent = `${endereco},${Nresidencia}`
    }
})
function incrementarValor(valorAlvo, duracaoMs = 1000) {
    let valorAtual = 0;
    const passos = 60; // Quantidade de atualizações na tela
    const incremento = valorAlvo / passos;
    const intervaloTempo = duracaoMs / passos;

    const timer = setInterval(() => {
        valorAtual += incremento;

        // Quando atingir ou passar do valor final, ajusta e para a animação
        if (valorAtual >= valorAlvo) {
            valorAtual = valorAlvo;
            clearInterval(timer);
        }

        // Formata para 2 casas decimais
        TotalUi.textContent = `${valorAtual.toFixed(2)} R$`;
    }, intervaloTempo);
}
formPedido.addEventListener("submit", async (event) => {
    event.preventDefault();

    // 1. Captura os valores dos elementos do DOM
    const listaProdutos = dadosBanco; // Lista com os itens do carrinho/pedido
    const endereco = EnderecoElemento.textContent.trim();
    const formaPagamentoValor = formaPagamento.value; // Renomeado para evitar ReferenceError

    // 2. Validações básicas antes do envio
    if (!listaProdutos || listaProdutos.length === 0) {
        alert("O carrinho está vazio.");
        return;
    }

    if (!endereco) {
        alert("Por favor, informe o endereço de entrega.");
        return;
    }

    // 3. Monta o payload do pedido
    const payload = {
        produtos: listaProdutos,
        endereco: endereco,
        forma_pagamento: formaPagamentoValor
    };

    try {
        // 4. Envia a requisição POST para o servidor
        const resposta = await fetch("/pedido", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        console.log(resposta);


        if (resposta.ok) {
            alert("Pedido realizado com sucesso!");
            // Exemplo: Limpar carrinho ou redirecionar para a página do pedido
            // window.location.href = `/pedido-confirmado/${resultado.id}`;
        } else {
            alert(`Erro ao realizar pedido: ${resultado.erro || "Tente novamente."}`);
        }
    } catch (erro) {
        console.error("Erro na requisição do pedido:", erro);
        alert("Falha na comunicação com o servidor.");
    }
});
MostrarProdutos()