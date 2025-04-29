/**
 * Recanto Rancho do Peixe - Sistema de Pedidos
 * JavaScript principal para gerenciamento de pedidos
 */

document.addEventListener('DOMContentLoaded', function() {
    /**
     * SELEÇÃO DE ELEMENTOS DOM
     */
    // Elementos de navegação
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const submenuToggles = document.querySelectorAll('.submenu-toggle');
    
    // Elementos de tipo de pedido
    const pedidoTypeTabs = document.querySelectorAll('.pedido-type-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Elementos de mesa
    const mesaItems = document.querySelectorAll('.mesa-item');
    
    // Elementos de produtos
    const categoriaBtns = document.querySelectorAll('.categoria-btn');
    const produtoCards = document.querySelectorAll('.produto-card');
    const btnBuscarProduto = document.getElementById('btn-buscar-produto');
    const produtoBusca = document.getElementById('produto-busca');
    
    // Elementos de ações
    const btnLimparPedido = document.getElementById('btn-limpar-pedido');
    const btnBuscarCliente = document.getElementById('btn-buscar-cliente');
    const btnClienteRapido = document.getElementById('btn-cliente-rapido');
    const btnSalvarRascunho = document.getElementById('btn-salvar-rascunho');
    const btnEnviarCozinha = document.getElementById('btn-enviar-cozinha');
    const btnFinalizar = document.getElementById('btn-finalizar');
    
    // Modais
    const modalContainers = document.querySelectorAll('.modal-container');
    const modalCloseBtns = document.querySelectorAll('.modal-close, .modal-close-btn');
    const modalProduto = document.getElementById('modal-produto');
    const modalCliente = document.getElementById('modal-cliente');
    const modalNovoCliente = document.getElementById('modal-novo-cliente');
    const btnModalProdutoAdicionar = document.getElementById('modal-produto-adicionar');
    const btnNovoCliente = document.getElementById('btn-novo-cliente');
    const btnModalClienteSalvar = document.getElementById('modal-cliente-salvar');
    const btnSelecionarCliente = document.querySelectorAll('.btn-selecionar-cliente');
    
    // Elementos para cálculos do pedido
    const pedidoItems = document.querySelector('.pedido-items');
    const pedidoSubtotal = document.getElementById('pedido-subtotal');
    const pedidoDescontoValor = document.getElementById('pedido-desconto-valor');
    const pedidoTaxaValor = document.getElementById('pedido-taxa-valor');
    const pedidoTotal = document.getElementById('pedido-total');
    const descontoPercentual = document.getElementById('desconto-percentual');
    const taxaPercentual = document.getElementById('taxa-percentual');
    
    /**
     * VARIÁVEIS DE ESTADO
     */
    let produtoAtual = null;
    
    const pedidoData = {
        itens: [],
        subtotal: 0,
        desconto: 0,
        taxa: 0,
        total: 0,
        cliente: null,
        mesa: null,
        tipo: 'mesa',
        observacao: ''
    };
    
    /**
     * INICIALIZAÇÃO
     */
    function inicializar() {
        // Configurar listeners de eventos
        configurarEventosNavegacao();
        configurarEventosTipoPedido();
        configurarEventosMesa();
        configurarEventosProduto();
        configurarEventosAcoes();
        configurarEventosModais();
        configurarEventosFormulario();
        
        // Carregar dados iniciais
        carregarPedidoDemonstracao();
        atualizarTotais();
        
        // Inicializar acessibilidade
        inicializarAcessibilidade();
    }
    
    /**
     * NAVEGAÇÃO
     */
    function configurarEventosNavegacao() {
        // Toggle do menu lateral em telas pequenas
        if (menuToggle) {
            menuToggle.addEventListener('click', function() {
                sidebar.classList.toggle('open');
            });
        }
        
        // Toggle de submenus
        submenuToggles.forEach(toggle => {
            toggle.addEventListener('click', function() {
                const menuItem = this.closest('.menu-item');
                const isOpen = menuItem.classList.contains('open');
                
                // Fecha todos os outros submenus
                document.querySelectorAll('.menu-item.has-submenu').forEach(item => {
                    if (item !== menuItem) {
                        item.classList.remove('open');
                        const submenuToggle = item.querySelector('.submenu-toggle');
                        if (submenuToggle) submenuToggle.setAttribute('aria-expanded', 'false');
                    }
                });
                
                // Abre/fecha o submenu atual
                menuItem.classList.toggle('open', !isOpen);
                this.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
            });
        });
    }
    
    /**
     * TIPO DE PEDIDO
     */
    function configurarEventosTipoPedido() {
        // Alternar entre tipos de pedido (Mesa, Viagem, Delivery)
        pedidoTypeTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove classe ativa de todas as tabs
                pedidoTypeTabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                
                // Esconde todos os conteúdos
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    content.hidden = true;
                });
                
                // Ativa a tab clicada
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');
                
                // Mostra o conteúdo correspondente
                const tabId = this.getAttribute('aria-controls');
                const tabContent = document.getElementById(tabId);
                if (tabContent) {
                    tabContent.classList.add('active');
                    tabContent.hidden = false;
                }
                
                // Atualiza o tipo de pedido no estado
                if (tabId === 'tab-mesa-content') {
                    pedidoData.tipo = 'mesa';
                } else if (tabId === 'tab-viagem-content') {
                    pedidoData.tipo = 'viagem';
                } else if (tabId === 'tab-delivery-content') {
                    pedidoData.tipo = 'delivery';
                }
            });
        });
    }
    
    /**
     * MESAS
     */
    function configurarEventosMesa() {
        // Seleção de mesa
        mesaItems.forEach(mesa => {
            mesa.addEventListener('click', function() {
                // Não permite selecionar mesas ocupadas ou reservadas
                if (this.classList.contains('ocupada') || this.classList.contains('reservada')) {
                    mostrarNotificacao('Esta mesa não está disponível', 'error');
                    return;
                }
                
                // Remove seleção anterior
                mesaItems.forEach(m => {
                    m.classList.remove('selected');
                    m.setAttribute('aria-selected', 'false');
                });
                
                // Seleciona a mesa clicada
                this.classList.add('selected');
                this.setAttribute('aria-selected', 'true');
                
                // Armazena a mesa selecionada
                const mesaNumero = this.querySelector('.mesa-numero').textContent;
                pedidoData.mesa = mesaNumero;
                
                mostrarNotificacao(`Mesa ${mesaNumero} selecionada`, 'success');
            });
            
            // Suporte a teclado para acessibilidade
            mesa.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });
    }
    
    /**
     * PRODUTOS
     */
    function configurarEventosProduto() {
        // Filtro de categoria de produtos
        categoriaBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                // Remove classe ativa de todos os botões
                categoriaBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                
                // Adiciona classe ativa ao botão clicado
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');
                
                // Filtra os produtos
                const categoria = this.getAttribute('data-categoria');
                filtrarProdutos(categoria);
            });
        });
        
        // Busca de produtos
        btnBuscarProduto.addEventListener('click', function() {
            const termoBusca = produtoBusca.value.trim().toLowerCase();
            if (termoBusca) {
                buscarProdutos(termoBusca);
            } else {
                // Restaura todos os produtos se a busca estiver vazia
                produtoCards.forEach(card => {
                    card.style.display = 'flex';
                });
                // Resetar o filtro de categoria
                categoriaBtns.forEach(b => b.classList.remove('active'));
                document.querySelector('.categoria-btn[data-categoria="todos"]').classList.add('active');
            }
        });
        
        // Busca ao pressionar Enter
        produtoBusca.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                btnBuscarProduto.click();
            }
        });
        
        // Clique nos cards de produtos
        produtoCards.forEach(card => {
            card.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const nome = this.getAttribute('data-nome');
                const preco = this.getAttribute('data-preco');
                
                abrirModalProduto({
                    id: id,
                    nome: nome,
                    preco: preco
                });
            });
        });
    }
    
    /**
     * FUNÇÕES DE FILTRO DE PRODUTO
     */
    function filtrarProdutos(categoria) {
        produtoCards.forEach(card => {
            if (categoria === 'todos') {
                card.style.display = 'flex';
            } else {
                const categoriasProduto = card.getAttribute('data-categoria') || '';
                if (categoriasProduto.includes(categoria)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    }
    
    function buscarProdutos(termo) {
        let encontrouAlgum = false;
        
        produtoCards.forEach(card => {
            const nomeProduto = card.getAttribute('data-nome').toLowerCase();
            if (nomeProduto.includes(termo)) {
                card.style.display = 'flex';
                encontrouAlgum = true;
            } else {
                card.style.display = 'none';
            }
        });
        
        if (!encontrouAlgum) {
            mostrarNotificacao('Nenhum produto encontrado com este termo', 'info');
        }
    }
    
    /**
     * AÇÕES DO PEDIDO
     */
    function configurarEventosAcoes() {
        // Limpar pedido
        btnLimparPedido.addEventListener('click', function() {
            if (pedidoData.itens.length === 0) {
                mostrarNotificacao('O pedido já está vazio', 'info');
                return;
            }
            
            if (confirm('Deseja realmente limpar todos os itens do pedido?')) {
                pedidoData.itens = [];
                renderizarItensPedido();
                atualizarTotais();
                mostrarNotificacao('Pedido limpo com sucesso', 'success');
            }
        });
        
        // Buscar cliente
        btnBuscarCliente.addEventListener('click', function() {
            abrirModal(modalCliente);
        });
        
        // Cliente rápido
        btnClienteRapido.addEventListener('click', function() {
            abrirModal(modalNovoCliente);
        });
        
        // Botões de salvar rascunho
        btnSalvarRascunho.addEventListener('click', function() {
            if (validarPedidoMinimo()) {
                salvarPedido('rascunho');
            }
        });
        
        // Botão enviar para cozinha
        btnEnviarCozinha.addEventListener('click', function() {
            if (validarPedido()) {
                salvarPedido('cozinha');
            }
        });
        
        // Botão finalizar pedido
        btnFinalizar.addEventListener('click', function() {
            if (validarPedido()) {
                salvarPedido('finalizado');
            }
        });
        
        // Event delegation para botões de quantidade e remoção dentro da lista de itens
        pedidoItems.addEventListener('click', function(e) {
            // Botões de quantidade
            if (e.target.classList.contains('btn-qty') || e.target.closest('.btn-qty')) {
                const btn = e.target.classList.contains('btn-qty') ? e.target : e.target.closest('.btn-qty');
                const action = btn.getAttribute('data-action');
                const itemCard = btn.closest('.item-card');
                const itemId = itemCard.getAttribute('data-item-id');
                
                if (action === 'increase') {
                    alterarQuantidadeItem(itemId, 1);
                } else if (action === 'decrease') {
                    alterarQuantidadeItem(itemId, -1);
                }
            }
            
            // Botão de remover
            if (e.target.classList.contains('item-remover') || e.target.closest('.item-remover')) {
                const itemCard = e.target.closest('.item-card');
                const itemId = itemCard.getAttribute('data-item-id');
                removerItemDoPedido(itemId);
            }
        });
    }
    
    /**
     * MODAIS
     */
    function configurarEventosModais() {
        // Fechar modais
        modalCloseBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal-container');
                fecharModal(modal);
            });
        });
        
        // Fechar modais ao clicar fora
        modalContainers.forEach(container => {
            container.addEventListener('click', function(e) {
                if (e.target === this) {
                    fecharModal(this);
                }
            });
        });
        
        // Fechar modais ao pressionar ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modalAberto = document.querySelector('.modal-container[aria-hidden="false"]');
                if (modalAberto) {
                    fecharModal(modalAberto);
                }
            }
        });
        
        // Adicionar produto no modal
        btnModalProdutoAdicionar.addEventListener('click', function() {
            if (produtoAtual) {
                const quantidade = parseInt(document.getElementById('modal-produto-quantidade').value);
                const observacao = document.getElementById('modal-produto-observacao').value;
                
                // Coleta as opções marcadas
                const opcoesSelecionadas = [];
                document.querySelectorAll('#modal-produto-modificadores input[type="checkbox"]:checked').forEach(checkbox => {
                    opcoesSelecionadas.push(checkbox.getAttribute('value'));
                });
                
                adicionarItemAoPedido({
                    id: produtoAtual.id,
                    nome: produtoAtual.nome,
                    preco: parseFloat(produtoAtual.preco),
                    quantidade: quantidade,
                    observacao: observacao,
                    opcoes: opcoesSelecionadas
                });
                
                fecharModal(modalProduto);
                mostrarNotificacao(`${produtoAtual.nome} adicionado ao pedido`, 'success');
            }
        });
        
        // Abrir modal novo cliente
        btnNovoCliente.addEventListener('click', function() {
            fecharModal(modalCliente);
            abrirModal(modalNovoCliente);
        });
        
        // Salvar novo cliente
        btnModalClienteSalvar.addEventListener('click', function() {
            const nomeCliente = document.getElementById('modal-cliente-nome').value.trim();
            const telefoneCliente = document.getElementById('modal-cliente-telefone').value.trim();
            
            if (!nomeCliente || !telefoneCliente) {
                mostrarNotificacao('Nome e telefone são obrigatórios', 'error');
                return;
            }
            
            // Simula o salvamento do cliente
            pedidoData.cliente = {
                id: Date.now(), // Simulação de ID
                nome: nomeCliente,
                telefone: telefoneCliente
            };
            
            // Atualiza os campos no formulário principal
            document.getElementById('cliente-nome').value = nomeCliente;
            document.getElementById('cliente-telefone').value = telefoneCliente;
            
            fecharModal(modalNovoCliente);
            mostrarNotificacao('Cliente cadastrado com sucesso', 'success');
        });
        
        // Selecionar cliente existente
        btnSelecionarCliente.forEach(btn => {
            btn.addEventListener('click', function() {
                const clienteId = this.getAttribute('data-id');
                const clienteRow = this.closest('tr');
                const clienteNome = clienteRow.cells[0].textContent;
                const clienteTelefone = clienteRow.cells[1].textContent;
                
                // Atualiza os campos no formulário principal
                document.getElementById('cliente-nome').value = clienteNome;
                document.getElementById('cliente-telefone').value = clienteTelefone;
                
                pedidoData.cliente = {
                    id: clienteId,
                    nome: clienteNome,
                    telefone: clienteTelefone
                };
                
                fecharModal(modalCliente);
                mostrarNotificacao(`Cliente ${clienteNome} selecionado`, 'success');
            });
        });
    }
    
    /**
     * FORMULÁRIOS
     */
    function configurarEventosFormulario() {
        // Observações do pedido
        const pedidoObservacao = document.getElementById('pedido-observacao');
        if (pedidoObservacao) {
            pedidoObservacao.addEventListener('input', function() {
                pedidoData.observacao = this.value;
            });
        }
    }
    
    /**
     * FUNÇÕES DOS MODAIS
     */
    function abrirModal(modal) {
        // Esconde todos os outros modais
        modalContainers.forEach(container => {
            container.style.display = 'none';
            container.setAttribute('aria-hidden', 'true');
        });
        
        // Mostra o modal solicitado
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        
        // Foca no primeiro input
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([readonly])');
            if (firstInput) firstInput.focus();
        }, 100);
        
        // Adiciona classe para bloquear scroll
        document.body.classList.add('modal-open');
    }
    
    function fecharModal(modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        // Remove classe para desbloquear scroll
        document.body.classList.remove('modal-open');
    }
    
    function abrirModalProduto(produto) {
        produtoAtual = produto;
        
        // Preenche os dados no modal
        document.getElementById('modal-produto-nome').value = produto.nome;
        document.getElementById('modal-produto-preco').value = `R$ ${parseFloat(produto.preco).toFixed(2).replace('.', ',')}`;
        document.getElementById('modal-produto-quantidade').value = 1;
        document.getElementById('modal-produto-observacao').value = '';
        
        // Limpa as opções marcadas
        document.querySelectorAll('#modal-produto-modificadores input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        abrirModal(modalProduto);
    }
    
    /**
     * GERENCIAMENTO DE ITENS
     */
    function adicionarItemAoPedido(item) {
        // Verifica se o item já existe no pedido (mesmo produto, observação e opções)
        const itemExistente = pedidoData.itens.find(i => 
            i.id === item.id && 
            i.observacao === item.observacao && 
            JSON.stringify(i.opcoes) === JSON.stringify(item.opcoes)
        );
        
        if (itemExistente) {
            // Atualiza a quantidade
            itemExistente.quantidade += item.quantidade;
        } else {
            // Adiciona novo item
            pedidoData.itens.push({
                ...item,
                itemId: Date.now() // ID único para gerenciar o item no pedido
            });
        }
        
        // Renderiza os itens e atualiza totais
        renderizarItensPedido();
        atualizarTotais();
    }
    
    function alterarQuantidadeItem(itemId, delta) {
        const item = pedidoData.itens.find(i => i.itemId == itemId);
        
        if (item) {
            item.quantidade += delta;
            
            // Remove o item se a quantidade for zero ou menor
            if (item.quantidade <= 0) {
                removerItemDoPedido(itemId);
                return;
            }
            
            // Atualiza visualmente a quantidade
            const itemCard = document.querySelector(`.item-card[data-item-id="${itemId}"]`);
            if (itemCard) {
                const qtdSpan = itemCard.querySelector('.item-qtd');
                if (qtdSpan) {
                    qtdSpan.textContent = item.quantidade;
                    // Atualiza o ARIA label
                    qtdSpan.setAttribute('aria-label', `${item.quantidade} ${item.quantidade === 1 ? 'unidade' : 'unidades'}`);
                }
            }
            
            // Atualiza totais
            atualizarTotais();
        }
    }
    
    function removerItemDoPedido(itemId) {
        // Encontra o índice do item
        const index = pedidoData.itens.findIndex(i => i.itemId == itemId);
        
        if (index !== -1) {
            // Remove o item do array
            const itemRemovido = pedidoData.itens.splice(index, 1)[0];
            
            // Remove visualmente o item
            const itemCard = document.querySelector(`.item-card[data-item-id="${itemId}"]`);
            if (itemCard) {
                // Adiciona animação de saída
                itemCard.style.animation = 'fadeOut 0.3s forwards';
                
                // Remove após a animação
                setTimeout(() => {
                    itemCard.remove();
                    // Se não houver mais itens, mostra a mensagem vazia
                    if (pedidoData.itens.length === 0) {
                        renderizarItensPedido();
                    }
                }, 300);
            }
            
            // Atualiza totais
            atualizarTotais();
            
            // Notificação
            mostrarNotificacao(`${itemRemovido.nome} removido do pedido`, 'info');
        }
    }
    
    function renderizarItensPedido() {
        // Limpa o container
        pedidoItems.innerHTML = '';
        
        // Se não houver itens, mostra mensagem
        if (pedidoData.itens.length === 0) {
            pedidoItems.innerHTML = `
                <div class="no-items">
                    <i class="fas fa-shopping-cart" aria-hidden="true"></i>
                    <p>Nenhum item adicionado ao pedido</p>
                    <p>Selecione produtos da lista para adicionar</p>
                </div>
            `;
            return;
        }
        
        // Adiciona cada item
        pedidoData.itens.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            itemCard.setAttribute('data-item-id', item.itemId);
            
            // Formata o preço para exibição
            const precoUnitario = parseFloat(item.preco).toFixed(2).replace('.', ',');
            const precoTotal = (item.preco * item.quantidade).toFixed(2).replace('.', ',');
            
            // Concatena observação e opções selecionadas
            let obs = item.observacao || '';
            if (item.opcoes && item.opcoes.length > 0) {
                if (obs) obs += ', ';
                obs += item.opcoes.join(', ');
            }
            
            itemCard.innerHTML = `
                <div class="item-info">
                    <div class="item-top">
                        <div class="item-nome">${item.nome}</div>
                        <div class="item-price">R$ ${precoTotal}</div>
                    </div>
                    ${obs ? `<div class="item-obs">${obs}</div>` : ''}
                </div>
                <div class="item-actions">
                    <div class="item-quantity">
                        <button class="btn-qty" data-action="decrease" aria-label="Diminuir quantidade">
                            <i class="fas fa-minus" aria-hidden="true"></i>
                        </button>
                        <span class="item-qtd" aria-label="${item.quantidade} ${item.quantidade === 1 ? 'unidade' : 'unidades'}">${item.quantidade}</span>
                        <button class="btn-qty" data-action="increase" aria-label="Aumentar quantidade">
                            <i class="fas fa-plus" aria-hidden="true"></i>
                        </button>
                    </div>
                    <button class="item-remover" aria-label="Remover item">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
            `;
            
            pedidoItems.appendChild(itemCard);
            
            // Adiciona animação de entrada
            setTimeout(() => {
                itemCard.style.animation = 'slideUp 0.3s forwards';
            }, 10);
        });
    }
    
    /**
     * CÁLCULOS
     */
    function atualizarTotais() {
        // Calcula o subtotal
        pedidoData.subtotal = pedidoData.itens.reduce((total, item) => {
            return total + (parseFloat(item.preco) * item.quantidade);
        }, 0);
        
        // Calcula desconto (baseado no percentual)
        const percentualDesconto = parseFloat(descontoPercentual.textContent) || 0;
        pedidoData.desconto = (pedidoData.subtotal * percentualDesconto) / 100;
        
        // Calcula taxa de serviço (baseado no percentual)
        const percentualTaxa = parseFloat(taxaPercentual.textContent) || 0;
        pedidoData.taxa = (pedidoData.subtotal * percentualTaxa) / 100;
        
        // Calcula total
        pedidoData.total = pedidoData.subtotal - pedidoData.desconto + pedidoData.taxa;
        
        // Formata valores para exibição
        const subtotalFormatado = pedidoData.subtotal.toFixed(2).replace('.', ',');
        const descontoFormatado = pedidoData.desconto.toFixed(2).replace('.', ',');
        const taxaFormatada = pedidoData.taxa.toFixed(2).replace('.', ',');
        const totalFormatado = pedidoData.total.toFixed(2).replace('.', ',');
        
        // Atualiza a interface
        pedidoSubtotal.textContent = `R$ ${subtotalFormatado}`;
        pedidoDescontoValor.textContent = `R$ ${descontoFormatado}`;
        pedidoTaxaValor.textContent = `R$ ${taxaFormatada}`;
        pedidoTotal.textContent = `R$ ${totalFormatado}`;
    }
    
    /**
     * VALIDAÇÃO
     */
    function validarPedidoMinimo() {
        if (pedidoData.itens.length === 0) {
            mostrarNotificacao('Adicione pelo menos um item ao pedido', 'error');
            return false;
        }
        return true;
    }
    
    function validarPedido() {
        // Valida se tem itens
        if (!validarPedidoMinimo()) return false;
        
        // Valida mesa (se for pedido de mesa)
        if (pedidoData.tipo === 'mesa' && !pedidoData.mesa) {
            mostrarNotificacao('Selecione uma mesa para o pedido', 'error');
            return false;
        }
        
        // Valida entrega (se for delivery)
        if (pedidoData.tipo === 'delivery') {
            const endereco = document.getElementById('delivery-endereco').value.trim();
            const bairro = document.getElementById('delivery-bairro').value.trim();
            
            if (!endereco || !bairro) {
                mostrarNotificacao('Preencha o endereço de entrega completo', 'error');
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * AÇÕES DO PEDIDO
     */
    function salvarPedido(status) {
        // Coleta dados adicionais
        const observacaoPedido = document.getElementById('pedido-observacao').value;
        pedidoData.observacao = observacaoPedido;
        
        // Coleta dados de entrega se for delivery
        if (pedidoData.tipo === 'delivery') {
            pedidoData.entrega = {
                endereco: document.getElementById('delivery-endereco').value,
                bairro: document.getElementById('delivery-bairro').value,
                taxa: document.getElementById('delivery-taxa').value,
                tempo: document.getElementById('delivery-tempo').value
            };
        }
        
        // Coleta dados de viagem se for para viagem
        if (pedidoData.tipo === 'viagem') {
            pedidoData.viagem = {
                horario: document.getElementById('viagem-retirada').value,
                observacao: document.getElementById('viagem-obs').value
            };
        }
        
        // Adiciona o status do pedido
        pedidoData.status = status;
        pedidoData.timestamp = new Date().toISOString();
        
        // Simula o envio para o servidor
        console.log('Pedido salvo:', JSON.stringify(pedidoData, null, 2));
        
        // Mensagem com base no status
        let mensagem = '';
        let tipo = 'success';
        
        if (status === 'rascunho') {
            mensagem = 'Pedido salvo como rascunho';
        } else if (status === 'cozinha') {
            mensagem = 'Pedido enviado para a cozinha';
        } else if (status === 'finalizado') {
            mensagem = 'Pedido finalizado com sucesso';
        }
        
        // Feedback visual
        mostrarNotificacao(mensagem, tipo);
        
        // Se for enviado para a cozinha ou finalizado, poderia redirecionar ou limpar o formulário
        if (status === 'finalizado') {
            setTimeout(() => {
                if (confirm('Deseja iniciar um novo pedido?')) {
                    // Limpa o formulário para um novo pedido
                    limparFormularioPedido();
                }
            }, 1000);
        }
    }
    
    function limparFormularioPedido() {
        // Limpa os itens
        pedidoData.itens = [];
        renderizarItensPedido();
        
        // Limpa cliente
        pedidoData.cliente = null;
        document.getElementById('cliente-nome').value = '';
        document.getElementById('cliente-telefone').value = '';
        
        // Limpa mesa selecionada
        pedidoData.mesa = null;
        mesaItems.forEach(m => {
            m.classList.remove('selected');
            m.setAttribute('aria-selected', 'false');
        });
        
        // Limpa observações
        document.getElementById('pedido-observacao').value = '';
        pedidoData.observacao = '';
        
        // Limpa campos de delivery
        if (document.getElementById('delivery-endereco')) {
            document.getElementById('delivery-endereco').value = '';
            document.getElementById('delivery-bairro').value = '';
        }
        
        // Limpa campos de viagem
        if (document.getElementById('viagem-retirada')) {
            document.getElementById('viagem-retirada').value = '';
            document.getElementById('viagem-obs').value = '';
        }
        
        // Atualiza totais
        atualizarTotais();
        
        // Volta para o tipo "mesa" por padrão
        pedidoData.tipo = 'mesa';
        document.getElementById('tab-mesa-btn').click();
        
        // Notificação
        mostrarNotificacao('Formulário limpo para novo pedido', 'info');
    }
    
    /**
     * NOTIFICAÇÕES
     */
    function mostrarNotificacao(mensagem, tipo = 'info') {
        // Container para notificações
        let container = document.querySelector('.notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
        
        // Cria o elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${tipo}`;
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}" aria-hidden="true"></i>
            </div>
            <div class="notification-content">
                <p>${mensagem}</p>
            </div>
            <button class="notification-close" aria-label="Fechar notificação">&times;</button>
        `;
        
        // Adiciona a notificação ao DOM
        container.appendChild(notification);
        
        // Configura o evento de fechar
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                removerNotificacao(notification);
            });
        }
        
        // Remove a notificação após alguns segundos
        setTimeout(() => {
            removerNotificacao(notification);
        }, 5000);
        
        return notification;
    }
    
    function removerNotificacao(notification) {
        notification.classList.add('fadeOut');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
    
    /**
     * ACESSIBILIDADE
     */
    function inicializarAcessibilidade() {
        // Adiciona atributos ARIA para melhorar a acessibilidade
        mesaItems.forEach(mesa => {
            // Atributos já adicionados no HTML
            
            // Adiciona suporte a teclado
            mesa.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });
        
        produtoCards.forEach(card => {
            // Atributos já adicionados no HTML
            
            // Adiciona suporte a teclado
            card.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });
        
        // Trap focus em modais
        modalContainers.forEach(modal => {
            modal.addEventListener('keydown', function(e) {
                if (e.key === 'Tab' && this.getAttribute('aria-hidden') === 'false') {
                    const focusableElements = this.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            });
        });
    }
    
    /**
     * DADOS DE EXEMPLO
     */
    function carregarPedidoDemonstracao() {
        // Adiciona alguns itens ao pedido para demonstração
        pedidoData.itens = [
            {
                id: 1,
                itemId: 1001,
                nome: "Peixe Frito",
                preco: 78.50,
                quantidade: 1,
                observacao: "Bem passado, sem cebola"
            },
            {
                id: 2,
                itemId: 1002,
                nome: "Porção de Batatas",
                preco: 35.00,
                quantidade: 1,
                observacao: ""
            },
            {
                id: 3,
                itemId: 1003,
                nome: "Refrigerante",
                preco: 8.00,
                quantidade: 2,
                observacao: ""
            }
        ];
        
        // Pré-seleciona a mesa 3
        const mesa3 = document.querySelector('.mesa-item:nth-child(3)');
        if (mesa3) {
            mesa3.classList.add('selected');
            mesa3.setAttribute('aria-selected', 'true');
            pedidoData.mesa = "03";
        }
        
        // Renderiza os itens
        renderizarItensPedido();
    }
    
    // Inicializa a aplicação
    inicializar();
    
    // Expõe algumas funções para uso externo ou testes
    window.pedidosApp = {
        adicionarItem: adicionarItemAoPedido,
        removerItem: removerItemDoPedido,
        limparPedido: limparFormularioPedido,
        mostrarNotificacao: mostrarNotificacao,
        getPedidoData: () => ({ ...pedidoData })
    };
});