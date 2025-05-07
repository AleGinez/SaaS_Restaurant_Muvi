/**
 * Recanto Rancho do Peixe - Sistema de Pedidos
 * JavaScript principal para gerenciamento de pedidos
 */

// Namespace global para o módulo de pedidos (acessível para script.js)
window.pedidosApp = {};

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // Verificar se já inicializado para evitar duplicação
    if (window.pedidosApp._initialized) {
        console.log('Módulo de pedidos já inicializado');
        return;
    }
    
    // Flag de debug para acompanhamento
    const DEBUG = true;
    
    function debug(message) {
        if (DEBUG) {
            console.log(`[PEDIDOS] ${message}`);
        }
    }
    
    debug('Script de pedidos carregado');
    
    /**
     * SELEÇÃO DE ELEMENTOS DOM
     */
    let elements = {
        // Elementos de navegação
        sidebar: null,
        menuToggle: null,
        submenuToggles: null,
        
        // Elementos de tipo de pedido
        pedidoTypeTabs: null,
        tabContents: null,
        
        // Elementos de mesa
        mesaItems: null,
        
        // Elementos de produtos
        categoriaBtns: null,
        produtoCards: null,
        btnBuscarProduto: null,
        produtoBusca: null,
        
        // Elementos de ações
        btnLimparPedido: null,
        btnBuscarCliente: null,
        btnClienteRapido: null,
        btnSalvarRascunho: null,
        btnEnviarCozinha: null,
        btnFinalizar: null,
        
        // Modais
        modalContainers: null,
        modalCloseBtns: null,
        modalProduto: null,
        modalCliente: null,
        modalNovoCliente: null,
        btnModalProdutoAdicionar: null,
        btnNovoCliente: null,
        btnModalClienteSalvar: null,
        btnSelecionarCliente: null,
        
        // Elementos para cálculos do pedido
        pedidoItems: null,
        pedidoSubtotal: null,
        pedidoDescontoValor: null,
        pedidoTaxaValor: null,
        pedidoTotal: null,
        descontoPercentual: null,
        taxaPercentual: null
    };
    
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
     * FUNÇÃO DE INICIALIZAÇÃO
     * Exposta globalmente para ser chamada pelo script.js
     */
    function init() {
        debug('Inicializando módulo de pedidos');
        
        // Carregar referências DOM
        loadDOMReferences();
        
        // Se os elementos não foram encontrados, pode ser que o DOM ainda não esteja pronto
        if (!elements.pedidoItems) {
            debug('Elementos DOM não encontrados, tentando novamente em 100ms');
            setTimeout(init, 100);
            return false;
        }
        
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
        
        // Marcar como inicializado
        window.pedidosApp._initialized = true;
        debug('Módulo de pedidos inicializado com sucesso');
        
        return true;
    }
    
    /**
     * CARREGAR REFERÊNCIAS DOM
     */
    function loadDOMReferences() {
        debug('Carregando referências DOM');
        
        elements = {
            // Elementos de navegação
            sidebar: document.querySelector('.sidebar'),
            menuToggle: document.querySelector('.menu-toggle'),
            submenuToggles: document.querySelectorAll('.submenu-toggle'),
            
            // Elementos de tipo de pedido
            pedidoTypeTabs: document.querySelectorAll('.pedido-type-tab'),
            tabContents: document.querySelectorAll('.tab-content'),
            
            // Elementos de mesa
            mesaItems: document.querySelectorAll('.mesa-item'),
            
            // Elementos de produtos
            categoriaBtns: document.querySelectorAll('.categoria-btn'),
            produtoCards: document.querySelectorAll('.produto-card'),
            btnBuscarProduto: document.getElementById('btn-buscar-produto'),
            produtoBusca: document.getElementById('produto-busca'),
            
            // Elementos de ações
            btnLimparPedido: document.getElementById('btn-limpar-pedido'),
            btnBuscarCliente: document.getElementById('btn-buscar-cliente'),
            btnClienteRapido: document.getElementById('btn-cliente-rapido'),
            btnSalvarRascunho: document.getElementById('btn-salvar-rascunho'),
            btnEnviarCozinha: document.getElementById('btn-enviar-cozinha'),
            btnFinalizar: document.getElementById('btn-finalizar'),
            
            // Modais
            modalContainers: document.querySelectorAll('.modal-container'),
            modalCloseBtns: document.querySelectorAll('.modal-close, .modal-close-btn'),
            modalProduto: document.getElementById('modal-produto'),
            modalCliente: document.getElementById('modal-cliente'),
            modalNovoCliente: document.getElementById('modal-novo-cliente'),
            btnModalProdutoAdicionar: document.getElementById('modal-produto-adicionar'),
            btnNovoCliente: document.getElementById('btn-novo-cliente'),
            btnModalClienteSalvar: document.getElementById('modal-cliente-salvar'),
            btnSelecionarCliente: document.querySelectorAll('.btn-selecionar-cliente'),
            
            // Elementos para cálculos do pedido
            pedidoItems: document.querySelector('.pedido-items'),
            pedidoSubtotal: document.getElementById('pedido-subtotal'),
            pedidoDescontoValor: document.getElementById('pedido-desconto-valor'),
            pedidoTaxaValor: document.getElementById('pedido-taxa-valor'),
            pedidoTotal: document.getElementById('pedido-total'),
            descontoPercentual: document.getElementById('desconto-percentual'),
            taxaPercentual: document.getElementById('taxa-percentual')
        };
        
        // Log para debug
        debug(`Elementos carregados: pedidoItems encontrado: ${!!elements.pedidoItems}`);
    }
    
    /**
     * NAVEGAÇÃO
     */
    function configurarEventosNavegacao() {
        debug('Configurando eventos de navegação');
        
        // Toggle do menu lateral em telas pequenas
        if (elements.menuToggle) {
            elements.menuToggle.addEventListener('click', function() {
                if (elements.sidebar) {
                    elements.sidebar.classList.toggle('open');
                }
            });
        }
        
        // Toggle de submenus
        if (elements.submenuToggles) {
            elements.submenuToggles.forEach(toggle => {
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
    }
    
    /**
     * TIPO DE PEDIDO
     */
    function configurarEventosTipoPedido() {
        debug('Configurando eventos de tipo de pedido');
        
        // Alternar entre tipos de pedido (Mesa, Viagem, Delivery)
        if (!elements.pedidoTypeTabs) {
            debug('pedidoTypeTabs não encontrado');
            return;
        }
        
        elements.pedidoTypeTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                debug(`Tab clicada: ${this.textContent.trim()}`);
                
                // Remove classe ativa de todas as tabs
                elements.pedidoTypeTabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                
                // Esconde todos os conteúdos
                elements.tabContents.forEach(content => {
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
                    debug(`Conteúdo ativado: ${tabId}`);
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
        debug('Configurando eventos de mesa');
        
        if (!elements.mesaItems) {
            debug('mesaItems não encontrado');
            return;
        }
        
        // Seleção de mesa
        elements.mesaItems.forEach(mesa => {
            mesa.addEventListener('click', function() {
                debug(`Mesa clicada: ${this.textContent.trim()}`);
                
                // Não permite selecionar mesas ocupadas ou reservadas
                if (this.classList.contains('ocupada') || this.classList.contains('reservada')) {
                    mostrarNotificacao('Esta mesa não está disponível', 'error');
                    return;
                }
                
                // Remove seleção anterior
                elements.mesaItems.forEach(m => {
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
        debug('Configurando eventos de produto');
        
        // Filtro de categoria de produtos
        if (elements.categoriaBtns) {
            elements.categoriaBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    debug(`Categoria clicada: ${this.textContent.trim()}`);
                    
                    // Remove classe ativa de todos os botões
                    elements.categoriaBtns.forEach(b => {
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
        }
        
        // Busca de produtos
        if (elements.btnBuscarProduto && elements.produtoBusca) {
            elements.btnBuscarProduto.addEventListener('click', function() {
                const termoBusca = elements.produtoBusca.value.trim().toLowerCase();
                if (termoBusca) {
                    buscarProdutos(termoBusca);
                } else {
                    // Restaura todos os produtos se a busca estiver vazia
                    if (elements.produtoCards) {
                        elements.produtoCards.forEach(card => {
                            card.style.display = 'flex';
                        });
                    }
                    // Resetar o filtro de categoria
                    if (elements.categoriaBtns) {
                        elements.categoriaBtns.forEach(b => b.classList.remove('active'));
                        const todosBtn = document.querySelector('.categoria-btn[data-categoria="todos"]');
                        if (todosBtn) todosBtn.classList.add('active');
                    }
                }
            });
        }
        
        // Busca ao pressionar Enter
        if (elements.produtoBusca) {
            elements.produtoBusca.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && elements.btnBuscarProduto) {
                    elements.btnBuscarProduto.click();
                }
            });
        }
        
        // Clique nos cards de produtos
        if (elements.produtoCards) {
            elements.produtoCards.forEach(card => {
                card.addEventListener('click', function() {
                    debug(`Produto clicado: ${this.getAttribute('data-nome')}`);
                    
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
    }
    
    /**
     * FUNÇÕES DE FILTRO DE PRODUTO
     */
    function filtrarProdutos(categoria) {
        if (!elements.produtoCards) return;
        
        debug(`Filtrando produtos por categoria: ${categoria}`);
        
        elements.produtoCards.forEach(card => {
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
        if (!elements.produtoCards) return;
        
        debug(`Buscando produtos com termo: ${termo}`);
        
        let encontrouAlgum = false;
        
        elements.produtoCards.forEach(card => {
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
        debug('Configurando eventos de ações');
        
        // Limpar pedido
        if (elements.btnLimparPedido) {
            elements.btnLimparPedido.addEventListener('click', function() {
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
        }
        
        // Buscar cliente
        if (elements.btnBuscarCliente && elements.modalCliente) {
            elements.btnBuscarCliente.addEventListener('click', function() {
                abrirModal(elements.modalCliente);
            });
        }
        
        // Cliente rápido
        if (elements.btnClienteRapido && elements.modalNovoCliente) {
            elements.btnClienteRapido.addEventListener('click', function() {
                abrirModal(elements.modalNovoCliente);
            });
        }
        
        // Botões de salvar rascunho
        if (elements.btnSalvarRascunho) {
            elements.btnSalvarRascunho.addEventListener('click', function() {
                if (validarPedidoMinimo()) {
                    salvarPedido('rascunho');
                }
            });
        }
        
        // Botão enviar para cozinha
        if (elements.btnEnviarCozinha) {
            elements.btnEnviarCozinha.addEventListener('click', function() {
                if (validarPedido()) {
                    salvarPedido('cozinha');
                }
            });
        }
        
        // Botão finalizar pedido
        if (elements.btnFinalizar) {
            elements.btnFinalizar.addEventListener('click', function() {
                if (validarPedido()) {
                    salvarPedido('finalizado');
                }
            });
        }
        
        // Event delegation para botões de quantidade e remoção dentro da lista de itens
        if (elements.pedidoItems) {
            elements.pedidoItems.addEventListener('click', function(e) {
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
    }
    
    /**
     * MODAIS
     */
    function configurarEventosModais() {
        debug('Configurando eventos de modais');
        
        if (!elements.modalCloseBtns || !elements.modalContainers) {
            debug('Elementos modais não encontrados');
            return;
        }
        
        // Fechar modais
        elements.modalCloseBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal-container');
                fecharModal(modal);
            });
        });
        
        // Fechar modais ao clicar fora
        elements.modalContainers.forEach(container => {
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
        if (elements.btnModalProdutoAdicionar) {
            elements.btnModalProdutoAdicionar.addEventListener('click', function() {
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
                    
                    fecharModal(elements.modalProduto);
                    mostrarNotificacao(`${produtoAtual.nome} adicionado ao pedido`, 'success');
                }
            });
        }
        
        // Abrir modal novo cliente
        if (elements.btnNovoCliente && elements.modalCliente && elements.modalNovoCliente) {
            elements.btnNovoCliente.addEventListener('click', function() {
                fecharModal(elements.modalCliente);
                abrirModal(elements.modalNovoCliente);
            });
        }
        
        // Salvar novo cliente
        if (elements.btnModalClienteSalvar) {
            elements.btnModalClienteSalvar.addEventListener('click', function() {
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
                const clienteNomeField = document.getElementById('cliente-nome');
                const clienteTelefoneField = document.getElementById('cliente-telefone');
                
                if (clienteNomeField) clienteNomeField.value = nomeCliente;
                if (clienteTelefoneField) clienteTelefoneField.value = telefoneCliente;
                
                fecharModal(elements.modalNovoCliente);
                mostrarNotificacao('Cliente cadastrado com sucesso', 'success');
            });
        }
        
        // Selecionar cliente existente
        if (elements.btnSelecionarCliente) {
            elements.btnSelecionarCliente.forEach(btn => {
                btn.addEventListener('click', function() {
                    const clienteId = this.getAttribute('data-id');
                    const clienteRow = this.closest('tr');
                    const clienteNome = clienteRow.cells[0].textContent;
                    const clienteTelefone = clienteRow.cells[1].textContent;
                    
                    // Atualiza os campos no formulário principal
                    const clienteNomeField = document.getElementById('cliente-nome');
                    const clienteTelefoneField = document.getElementById('cliente-telefone');
                    
                    if (clienteNomeField) clienteNomeField.value = clienteNome;
                    if (clienteTelefoneField) clienteTelefoneField.value = clienteTelefone;
                    
                    pedidoData.cliente = {
                        id: clienteId,
                        nome: clienteNome,
                        telefone: clienteTelefone
                    };
                    
                    fecharModal(elements.modalCliente);
                    mostrarNotificacao(`Cliente ${clienteNome} selecionado`, 'success');
                });
            });
        }
    }
    
    /**
     * FORMULÁRIOS
     */
    function configurarEventosFormulario() {
        debug('Configurando eventos de formulário');
        
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
        if (!modal) {
            debug('Modal não encontrado');
            return;
        }
        
        debug('Abrindo modal: ' + modal.id);
        
        // Esconde todos os outros modais
        if (elements.modalContainers) {
            elements.modalContainers.forEach(container => {
                container.style.display = 'none';
                container.setAttribute('aria-hidden', 'true');
            });
        }
        
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
        if (!modal) return;
        
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        // Remove classe para desbloquear scroll
        document.body.classList.remove('modal-open');
    }
    
    function abrirModalProduto(produto) {
        produtoAtual = produto;
        
        if (!elements.modalProduto) {
            debug('Modal de produto não encontrado');
            return;
        }
        
        debug('Abrindo modal de produto: ' + produto.nome);
        
        // Preenche os dados no modal
        const nomeProdutoField = document.getElementById('modal-produto-nome');
        const precoProdutoField = document.getElementById('modal-produto-preco');
        const quantidadeField = document.getElementById('modal-produto-quantidade');
        const observacaoField = document.getElementById('modal-produto-observacao');
        
        if (nomeProdutoField) nomeProdutoField.value = produto.nome;
        if (precoProdutoField) precoProdutoField.value = `R$ ${parseFloat(produto.preco).toFixed(2).replace('.', ',')}`;
        if (quantidadeField) quantidadeField.value = 1;
        if (observacaoField) observacaoField.value = '';
        
        // Limpa as opções marcadas
        document.querySelectorAll('#modal-produto-modificadores input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        abrirModal(elements.modalProduto);
    }
    
    /**
     * GERENCIAMENTO DE ITENS
     */
    function adicionarItemAoPedido(item) {
        debug(`Adicionando item ao pedido: ${item.nome} x${item.quantidade}`);
        
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
        debug(`Alterando quantidade do item ${itemId} por ${delta}`);
        
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
        debug(`Removendo item ${itemId} do pedido`);
        
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
        if (!elements.pedidoItems) {
            debug('Container de itens não encontrado');
            return;
        }
        
        debug(`Renderizando ${pedidoData.itens.length} itens no pedido`);
        
        // Limpa o container
        elements.pedidoItems.innerHTML = '';
        
        // Se não houver itens, mostra mensagem
        if (pedidoData.itens.length === 0) {
            elements.pedidoItems.innerHTML = `
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
            
            elements.pedidoItems.appendChild(itemCard);
            
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
        if (!elements.pedidoSubtotal) {
            debug('Elementos de totais não encontrados');
            return;
        }
        
        debug('Atualizando totais do pedido');
        
        // Calcula o subtotal
        pedidoData.subtotal = pedidoData.itens.reduce((total, item) => {
            return total + (parseFloat(item.preco) * item.quantidade);
        }, 0);
        
        // Calcula desconto (baseado no percentual)
        const percentualDesconto = (elements.descontoPercentual) ? 
            parseFloat(elements.descontoPercentual.textContent) || 0 : 0;
        
        pedidoData.desconto = (pedidoData.subtotal * percentualDesconto) / 100;
        
        // Calcula taxa de serviço (baseado no percentual)
        const percentualTaxa = (elements.taxaPercentual) ? 
            parseFloat(elements.taxaPercentual.textContent) || 0 : 0;
        
        pedidoData.taxa = (pedidoData.subtotal * percentualTaxa) / 100;
        
        // Calcula total
        pedidoData.total = pedidoData.subtotal - pedidoData.desconto + pedidoData.taxa;
        
        // Formata valores para exibição
        const subtotalFormatado = pedidoData.subtotal.toFixed(2).replace('.', ',');
        const descontoFormatado = pedidoData.desconto.toFixed(2).replace('.', ',');
        const taxaFormatada = pedidoData.taxa.toFixed(2).replace('.', ',');
        const totalFormatado = pedidoData.total.toFixed(2).replace('.', ',');
        
        // Atualiza a interface
        if (elements.pedidoSubtotal) elements.pedidoSubtotal.textContent = `R$ ${subtotalFormatado}`;
        if (elements.pedidoDescontoValor) elements.pedidoDescontoValor.textContent = `R$ ${descontoFormatado}`;
        if (elements.pedidoTaxaValor) elements.pedidoTaxaValor.textContent = `R$ ${taxaFormatada}`;
        if (elements.pedidoTotal) elements.pedidoTotal.textContent = `R$ ${totalFormatado}`;
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
            const endereco = document.getElementById('delivery-endereco') ? 
                document.getElementById('delivery-endereco').value.trim() : '';
                
            const bairro = document.getElementById('delivery-bairro') ?
                document.getElementById('delivery-bairro').value.trim() : '';
            
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
        debug(`Salvando pedido com status: ${status}`);
        
        // Coleta dados adicionais
        const observacaoPedido = document.getElementById('pedido-observacao') ? 
            document.getElementById('pedido-observacao').value : '';
            
        pedidoData.observacao = observacaoPedido;
        
        // Coleta dados de entrega se for delivery
        if (pedidoData.tipo === 'delivery') {
            const enderecoField = document.getElementById('delivery-endereco');
            const bairroField = document.getElementById('delivery-bairro');
            const taxaField = document.getElementById('delivery-taxa');
            const tempoField = document.getElementById('delivery-tempo');
            
            pedidoData.entrega = {
                endereco: enderecoField ? enderecoField.value : '',
                bairro: bairroField ? bairroField.value : '',
                taxa: taxaField ? taxaField.value : '',
                tempo: tempoField ? tempoField.value : ''
            };
        }
        
        // Coleta dados de viagem se for para viagem
        if (pedidoData.tipo === 'viagem') {
            const retiradaField = document.getElementById('viagem-retirada');
            const obsField = document.getElementById('viagem-obs');
            
            pedidoData.viagem = {
                horario: retiradaField ? retiradaField.value : '',
                observacao: obsField ? obsField.value : ''
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
        debug('Limpando formulário para novo pedido');
        
        // Limpa os itens
        pedidoData.itens = [];
        renderizarItensPedido();
        
        // Limpa cliente
        pedidoData.cliente = null;
        
        const clienteNomeField = document.getElementById('cliente-nome');
        const clienteTelefoneField = document.getElementById('cliente-telefone');
        
        if (clienteNomeField) clienteNomeField.value = '';
        if (clienteTelefoneField) clienteTelefoneField.value = '';
        
        // Limpa mesa selecionada
        pedidoData.mesa = null;
        if (elements.mesaItems) {
            elements.mesaItems.forEach(m => {
                m.classList.remove('selected');
                m.setAttribute('aria-selected', 'false');
            });
        }
        
        // Limpa observações
        const observacaoField = document.getElementById('pedido-observacao');
        if (observacaoField) observacaoField.value = '';
        pedidoData.observacao = '';
        
        // Limpa campos de delivery
        const enderecoField = document.getElementById('delivery-endereco');
        const bairroField = document.getElementById('delivery-bairro');
        
        if (enderecoField) enderecoField.value = '';
        if (bairroField) bairroField.value = '';
        
        // Limpa campos de viagem
        const retiradaField = document.getElementById('viagem-retirada');
        const viagemObsField = document.getElementById('viagem-obs');
        
        if (retiradaField) retiradaField.value = '';
        if (viagemObsField) viagemObsField.value = '';
        
        // Atualiza totais
        atualizarTotais();
        
        // Volta para o tipo "mesa" por padrão
        pedidoData.tipo = 'mesa';
        const tabMesaBtn = document.getElementById('tab-mesa-btn');
        if (tabMesaBtn) tabMesaBtn.click();
        
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
        debug('Inicializando suporte a acessibilidade');
        
        // Adiciona atributos ARIA para melhorar a acessibilidade
        if (elements.mesaItems) {
            elements.mesaItems.forEach(mesa => {
                // Atributos já adicionados no HTML
                
                // Adiciona suporte a teclado
                mesa.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.click();
                    }
                });
            });
        }
        
        if (elements.produtoCards) {
            elements.produtoCards.forEach(card => {
                // Atributos já adicionados no HTML
                
                // Adiciona suporte a teclado
                card.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.click();
                    }
                });
            });
        }
        
        // Trap focus em modais
        if (elements.modalContainers) {
            elements.modalContainers.forEach(modal => {
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
    }
    
    /**
     * DADOS DE EXEMPLO
     */
    function carregarPedidoDemonstracao() {
        debug('Carregando dados de demonstração');
        
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
    
    // Expõe a função de inicialização para ser chamada pelo script.js
    window.pedidosApp = {
        init: init,
        adicionarItem: adicionarItemAoPedido,
        removerItem: removerItemDoPedido,
        limparPedido: limparFormularioPedido,
        mostrarNotificacao: mostrarNotificacao,
        getPedidoData: () => ({ ...pedidoData }),
        
        // Funções equivalentes ao padrão usado nos outros módulos
        showListagem: () => {
            const listagemContainer = document.querySelector('.listagem-container');
            const pedidoContainer = document.querySelector('.pedido-container');
            
            if (listagemContainer && pedidoContainer) {
                pedidoContainer.classList.add('hidden');
                listagemContainer.classList.remove('hidden');
            }
        },
        
        showFormulario: () => {
            const listagemContainer = document.querySelector('.listagem-container');
            const pedidoContainer = document.querySelector('.pedido-container');
            
            if (listagemContainer && pedidoContainer) {
                listagemContainer.classList.add('hidden');
                pedidoContainer.classList.remove('hidden');
            }
        },
        
        resetForm: limparFormularioPedido,
        
        // Flag de inicialização
        _initialized: false
    };
    
    // Se este script for carregado diretamente (não via carregamento dinâmico),
    // inicializa automaticamente
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 100);
    } else {
        window.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 100);
        });
    }
});