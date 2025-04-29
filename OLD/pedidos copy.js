// Documento pronto para manipulação
document.addEventListener('DOMContentLoaded', function() {
    // Referências aos elementos DOM
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const mainContent = document.querySelector('.main-content');
    const menuItems = document.querySelectorAll('.menu-item.has-submenu');
    const notificationsBtn = document.querySelector('.notifications');
    
    // Elementos do formulário de pedidos
    const pedidoForm = document.getElementById('pedido-form');
    const mesaElements = document.querySelectorAll('.mesa');
    const mesaSelect = document.getElementById('mesa-select');
    const mesaNumeroInput = document.getElementById('mesa-numero');
    const mesaIdInput = document.getElementById('mesa-id');
    const numPessoasInput = document.getElementById('num-pessoas');
    
    // Elementos de seleção de produtos
    const produtoBusca = document.getElementById('produto-busca');
    const produtoSelect = document.getElementById('produto-select');
    const produtoQuantidade = document.getElementById('produto-quantidade');
    const produtoPreco = document.getElementById('produto-preco');
    const produtoId = document.getElementById('produto-id');
    const btnAdicionarItem = document.getElementById('btn-adicionar-item');
    const produtosRapidos = document.querySelectorAll('.produto-rapido');
    const itensTable = document.getElementById('itens-pedido-table').querySelector('tbody');
    
    // Elementos de cálculos
    const pedidoSubtotal = document.getElementById('pedido-subtotal');
    const resumoSubtotal = document.getElementById('resumo-subtotal');
    const pedidoDesconto = document.getElementById('pedido-desconto');
    const pedidoDescontoValor = document.getElementById('pedido-desconto-valor');
    const resumoDesconto = document.getElementById('resumo-desconto');
    const pedidoTaxaServico = document.getElementById('pedido-taxa-servico');
    const pedidoTaxaValor = document.getElementById('pedido-taxa-valor');
    const resumoTaxa = document.getElementById('resumo-taxa');
    const resumoTotal = document.getElementById('resumo-total');
    
    // Botões de ação do formulário
    const btnCancelar = document.getElementById('btn-cancelar');
    const btnSalvarRascunho = document.getElementById('btn-salvar-rascunho');
    const btnEnviarCozinha = document.getElementById('btn-enviar-cozinha');
    const btnFinalizar = document.getElementById('btn-finalizar');
    
    // Modais
    const modalProduto = document.getElementById('modal-produto');
    const modalCliente = document.getElementById('modal-cliente');
    const closeModalButtons = document.querySelectorAll('.modal-close, .modal-close-btn');
    
    // Elementos de cliente
    const clienteNome = document.getElementById('cliente-nome');
    const clienteTelefone = document.getElementById('cliente-telefone');
    const clienteId = document.getElementById('cliente-id');
    const btnNovoCliente = document.getElementById('btn-novo-cliente');
    const btnBuscarCliente = document.getElementById('btn-buscar-cliente');
    
    // Elementos de abas e filtros
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const areaBtns = document.querySelectorAll('.area-btn');
    const categoriaBtns = document.querySelectorAll('.categoria-btn');
    
    // Dados do pedido atual
    let pedidoAtual = {
        itens: [],
        subtotal: 0,
        desconto: 0,
        taxaServico: 0,
        total: 0,
        cliente: null,
        mesa: null,
        observacao: '',
        status: 'Aberto',
        formaPagamento: null
    };

    // ===========================================
    // FUNCIONALIDADES DE MENU E NAVEGAÇÃO
    // ===========================================
    
    // Toggle do menu lateral em telas pequenas
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        
        // Adiciona ou remove o overlay quando o menu é aberto em telas pequenas
        if (sidebar.classList.contains('open')) {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('open');
                this.remove();
            });
            document.body.appendChild(overlay);
        } else {
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    });
    
    // Toggle do submenu
    menuItems.forEach(item => {
        const link = item.querySelector('a');
        
        link.addEventListener('click', function(e) {
            // Previne a navegação ao clicar no item com submenu
            e.preventDefault();
            
            // Toggle da classe 'open' para mostrar/esconder o submenu
            item.classList.toggle('open');
            
            // Fecha outros submenus abertos
            menuItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('open')) {
                    otherItem.classList.remove('open');
                }
            });
        });
    });
    
    // Manipulação das abas
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove a classe active de todos os botões e painéis
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Adiciona a classe active ao botão clicado e ao painel correspondente
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Manipulação das áreas do restaurante
    areaBtns.forEach(button => {
        button.addEventListener('click', function() {
            // Remove a classe active de todos os botões
            areaBtns.forEach(btn => btn.classList.remove('active'));
            
            // Adiciona a classe active ao botão clicado
            this.classList.add('active');
            
            // Aqui adicionaríamos lógica para filtrar mesas por área
            const area = this.getAttribute('data-area');
            console.log(`Área selecionada: ${area}`);
            
            // Simulação: exibir diferentes mesas por área
            // Em uma implementação real, você faria uma solicitação AJAX para obter as mesas da área
            simularMudarArea(area);
        });
    });
    
    // Filtros de categorias de produtos
    categoriaBtns.forEach(button => {
        button.addEventListener('click', function() {
            // Remove a classe active de todos os botões
            categoriaBtns.forEach(btn => btn.classList.remove('active'));
            
            // Adiciona a classe active ao botão clicado
            this.classList.add('active');
            
            // Aqui adicionaríamos lógica para filtrar produtos por categoria
            const categoria = this.getAttribute('data-categoria');
            console.log(`Categoria selecionada: ${categoria}`);
            
            // Simulação: mudar produtos disponíveis por categoria
            simularMudarCategoria(categoria);
        });
    });
    
    // ===========================================
    // MANIPULAÇÃO DE MESAS
    // ===========================================
    
    // Interação com mesas no mapa visual
    mesaElements.forEach(mesa => {
        mesa.addEventListener('click', function() {
            // Verifica se a mesa está livre ou reservada
            const status = this.querySelector('.mesa-status').textContent.toLowerCase();
            
            if (status === 'ocupada') {
                // Simulação de modal para alertar que a mesa está ocupada
                alert('Esta mesa já está ocupada. Deseja adicionar itens ao pedido existente?');
                return;
            }
            
            // Remove a classe selected de todas as mesas
            mesaElements.forEach(m => m.classList.remove('selected'));
            
            // Adiciona a classe selected à mesa clicada
            this.classList.add('selected');
            
            // Atualiza os campos relacionados à mesa
            const mesaId = this.getAttribute('data-mesa-id');
            const mesaNumero = this.getAttribute('data-mesa-numero');
            
            mesaIdInput.value = mesaId;
            mesaNumeroInput.value = mesaNumero;
            mesaSelect.value = mesaId;
            
            // Atualiza o objeto de pedido
            pedidoAtual.mesa = {
                id: mesaId,
                numero: mesaNumero
            };
            
            console.log(`Mesa selecionada: ${mesaNumero}`);
        });
    });
    
    // Selecionar mesa pela lista suspensa
    mesaSelect.addEventListener('change', function() {
        const mesaId = this.value;
        if (!mesaId) {
            mesaIdInput.value = '';
            mesaNumeroInput.value = '';
            pedidoAtual.mesa = null;
            
            // Remove a seleção visual
            mesaElements.forEach(m => m.classList.remove('selected'));
            return;
        }
        
        // Encontra a mesa no mapa visual
        const mesaElement = document.querySelector(`.mesa[data-mesa-id="${mesaId}"]`);
        if (mesaElement) {
            // Simula um clique na mesa
            mesaElement.click();
        } else {
            // Caso a mesa não esteja no mapa visual (outra área)
            const mesaOption = this.options[this.selectedIndex];
            const mesaNumero = mesaOption.textContent.split(' - ')[0].replace('Mesa ', '');
            
            mesaIdInput.value = mesaId;
            mesaNumeroInput.value = mesaNumero;
            
            // Atualiza o objeto de pedido
            pedidoAtual.mesa = {
                id: mesaId,
                numero: mesaNumero
            };
        }
    });
    
    // Simulação de mudança de área (em um sistema real, isso carregaria mesas do banco de dados)
    function simularMudarArea(area) {
        // Em uma implementação real, você faria uma requisição AJAX para obter as mesas da área
        
        // Simulação: apenas modifica as classes das mesas existentes para demonstração
        if (area === 'salao') {
            document.querySelector('.mesa[data-mesa-id="1"]').classList.remove('hidden');
            document.querySelector('.mesa[data-mesa-id="2"]').classList.remove('hidden');
            document.querySelector('.mesa[data-mesa-id="3"]').classList.remove('hidden');
            document.querySelector('.mesa[data-mesa-id="4"]').classList.remove('hidden');
            document.querySelector('.mesa[data-mesa-id="5"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="6"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="7"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="8"]').classList.add('hidden');
        } else if (area === 'varanda') {
            document.querySelector('.mesa[data-mesa-id="1"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="2"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="3"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="4"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="5"]').classList.remove('hidden');
            document.querySelector('.mesa[data-mesa-id="6"]').classList.remove('hidden');
            document.querySelector('.mesa[data-mesa-id="7"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="8"]').classList.add('hidden');
        } else if (area === 'deck') {
            document.querySelector('.mesa[data-mesa-id="1"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="2"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="3"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="4"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="5"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="6"]').classList.add('hidden');
            document.querySelector('.mesa[data-mesa-id="7"]').classList.remove('hidden');
            document.querySelector('.mesa[data-mesa-id="8"]').classList.remove('hidden');
        }
        
        // Atualiza a lista suspensa de mesas
        atualizarListaMesas(area);
    }
    
    // Atualizar lista suspensa de mesas baseado na área
    function atualizarListaMesas(area) {
        // Limpa as opções atuais
        mesaSelect.innerHTML = '<option value="">Selecione uma mesa...</option>';
        
        // Adiciona apenas as mesas da área selecionada
        let mesasArea = [];
        
        if (area === 'salao') {
            mesasArea = [
                { id: 1, numero: '01', status: 'Livre' },
                { id: 4, numero: '04', status: 'Livre' }
            ];
        } else if (area === 'varanda') {
            mesasArea = [
                { id: 5, numero: '05', status: 'Livre' },
                { id: 6, numero: '06', status: 'Livre' }
            ];
        } else if (area === 'deck') {
            mesasArea = [
                { id: 7, numero: '07', status: 'Livre' },
                { id: 8, numero: '08', status: 'Livre' }
            ];
        }
        
        // Adiciona as opções ao select
        mesasArea.forEach(mesa => {
            const option = document.createElement('option');
            option.value = mesa.id;
            option.textContent = `Mesa ${mesa.numero} - ${mesa.status}`;
            mesaSelect.appendChild(option);
        });
    }
    
    // ===========================================
    // MANIPULAÇÃO DE PRODUTOS E ITENS DO PEDIDO
    // ===========================================
    
    // Array fictício de produtos (em um sistema real, isso viria do banco de dados)
    const produtos = [
        { id: 1, nome: 'Peixe Frito', preco: 78.50, categoria: 'peixes' },
        { id: 2, nome: 'Porção de Batatas', preco: 35.00, categoria: 'porcoes' },
        { id: 3, nome: 'Refrigerante', preco: 8.00, categoria: 'bebidas' },
        { id: 4, nome: 'Cerveja', preco: 12.00, categoria: 'bebidas' },
        { id: 5, nome: 'Camarão Alho e Óleo', preco: 98.00, categoria: 'peixes' },
        { id: 6, nome: 'Arroz', preco: 15.00, categoria: 'porcoes' },
        { id: 7, nome: 'Tilápia Grelhada', preco: 85.00, categoria: 'peixes' },
        { id: 8, nome: 'Pintado na Brasa', preco: 120.00, categoria: 'peixes' },
        { id: 9, nome: 'Água Mineral', preco: 5.00, categoria: 'bebidas' },
        { id: 10, nome: 'Suco Natural', preco: 10.00, categoria: 'bebidas' },
        { id: 11, nome: 'Porção de Mandioca', preco: 30.00, categoria: 'porcoes' },
        { id: 12, nome: 'Porção de Polenta', preco: 28.00, categoria: 'porcoes' },
        { id: 13, nome: 'Sorvete', preco: 15.00, categoria: 'sobremesas' },
        { id: 14, nome: 'Pudim', preco: 12.00, categoria: 'sobremesas' }
    ];
    
    // Função para simular mudança de categoria de produtos
    function simularMudarCategoria(categoria) {
        // Filtra os produtos pela categoria
        let produtosFiltrados = [];
        
        if (categoria === 'todos') {
            produtosFiltrados = produtos;
        } else {
            produtosFiltrados = produtos.filter(produto => produto.categoria === categoria);
        }
        
        // Atualiza o select de produtos
        produtoSelect.innerHTML = '<option value="">Selecione um produto...</option>';
        
        produtosFiltrados.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.nome} - R$ ${produto.preco.toFixed(2)}`;
            produtoSelect.appendChild(option);
        });
    }
    
    // Busca de produtos
    produtoBusca.addEventListener('input', function() {
        const termoBusca = this.value.toLowerCase();
        
        // Filtra os produtos pelo termo de busca
        if (termoBusca.length > 2) {
            const produtosFiltrados = produtos.filter(produto => 
                produto.nome.toLowerCase().includes(termoBusca)
            );
            
            // Exibe os resultados em uma lista suspensa ou dropdown
            console.log('Produtos encontrados:', produtosFiltrados);
            
            // Em uma implementação real, aqui você criaria uma lista dinâmica de sugestões
            // Para esta demonstração, vamos apenas atualizar o select
            produtoSelect.innerHTML = '<option value="">Selecione um produto...</option>';
            
            produtosFiltrados.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.id;
                option.textContent = `${produto.nome} - R$ ${produto.preco.toFixed(2)}`;
                produtoSelect.appendChild(option);
            });
            
            // Torna o select visível
            produtoSelect.classList.remove('hidden');
        } else {
            // Esconde o select se o termo de busca for muito curto
            produtoSelect.classList.add('hidden');
        }
    });
    
    // Seleção de produto no select
    produtoSelect.addEventListener('change', function() {
        const produtoId = this.value;
        if (!produtoId) {
            produtoPreco.value = '';
            document.getElementById('produto-id').value = '';
            return;
        }
        
        // Encontra o produto selecionado
        const produtoSelecionado = produtos.find(produto => produto.id == produtoId);
        if (produtoSelecionado) {
            produtoPreco.value = `R$ ${produtoSelecionado.preco.toFixed(2)}`;
            document.getElementById('produto-id').value = produtoSelecionado.id;
            
            // Atualiza o campo de busca
            produtoBusca.value = produtoSelecionado.nome;
        }
    });
    
    // Botão de adicionar item ao pedido
    btnAdicionarItem.addEventListener('click', function() {
        const produtoIdValue = document.getElementById('produto-id').value;
        
        if (!produtoIdValue) {
            alert('Selecione um produto primeiro.');
            return;
        }
        
        // Encontra o produto selecionado
        const produtoSelecionado = produtos.find(produto => produto.id == produtoIdValue);
        if (!produtoSelecionado) {
            alert('Produto não encontrado.');
            return;
        }
        
        const quantidade = parseInt(produtoQuantidade.value);
        if (isNaN(quantidade) || quantidade <= 0) {
            alert('Informe uma quantidade válida.');
            return;
        }
        
        // Adiciona o item ao pedido
        adicionarItemAoPedido(produtoSelecionado, quantidade);
        
        // Limpa os campos
        produtoBusca.value = '';
        produtoSelect.value = '';
        produtoPreco.value = '';
        document.getElementById('produto-id').value = '';
        produtoQuantidade.value = 1;
        
        // Esconde o select
        produtoSelect.classList.add('hidden');
    });
    
    // Botões de produtos rápidos
    produtosRapidos.forEach(button => {
        button.addEventListener('click', function() {
            const produtoId = this.getAttribute('data-id');
            const produtoNome = this.getAttribute('data-nome');
            const produtoPreco = parseFloat(this.getAttribute('data-preco'));
            
            // Encontra o produto
            const produtoSelecionado = produtos.find(produto => produto.id == produtoId);
            if (!produtoSelecionado) {
                alert('Produto não encontrado.');
                return;
            }
            
            // Abre o modal para confirmar quantidade e observações
            abrirModalProduto(produtoSelecionado);
        });
    });
    
    // Função para adicionar item ao pedido
    function adicionarItemAoPedido(produto, quantidade, observacao = '') {
        // Verifica se o item já existe no pedido
        const itemExistente = pedidoAtual.itens.find(item => item.produto.id === produto.id);
        
        if (itemExistente) {
            // Atualiza a quantidade do item existente
            itemExistente.quantidade += quantidade;
            itemExistente.subtotal = itemExistente.quantidade * itemExistente.precoUnitario;
            
            // Atualiza a observação se for passada
            if (observacao) {
                itemExistente.observacao = observacao;
            }
        } else {
            // Cria um novo item
            const novoItem = {
                id: pedidoAtual.itens.length + 1,
                produto: produto,
                quantidade: quantidade,
                precoUnitario: produto.preco,
                subtotal: quantidade * produto.preco,
                observacao: observacao
            };
            
            // Adiciona ao array de itens
            pedidoAtual.itens.push(novoItem);
        }
        
        // Atualiza a interface
        atualizarTabelaItens();
        calcularTotais();
    }
    
    // Função para abrir o modal de produto
    function abrirModalProduto(produto) {
        // Preenche os campos do modal
        document.getElementById('modal-produto-nome').value = produto.nome;
        document.getElementById('modal-produto-preco').value = `R$ ${produto.preco.toFixed(2)}`;
        document.getElementById('modal-produto-quantidade').value = 1;
        document.getElementById('modal-produto-observacao').value = '';
        
        // Exibe o modal
        modalProduto.style.display = 'flex';
        
        // Configura o botão de adicionar
        const btnAdicionar = document.getElementById('modal-produto-adicionar');
        btnAdicionar.onclick = function() {
            const quantidade = parseInt(document.getElementById('modal-produto-quantidade').value);
            const observacao = document.getElementById('modal-produto-observacao').value;
            
            if (isNaN(quantidade) || quantidade <= 0) {
                alert('Informe uma quantidade válida.');
                return;
            }
            
            // Adiciona o item ao pedido
            adicionarItemAoPedido(produto, quantidade, observacao);
            
            // Fecha o modal
            modalProduto.style.display = 'none';
        };
    }
    
    // Função para atualizar a tabela de itens
    function atualizarTabelaItens() {
        // Limpa a tabela
        itensTable.innerHTML = '';
        
        // Adiciona os itens
        pedidoAtual.itens.forEach((item, index) => {
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    ${item.produto.nome}
                    ${item.observacao ? `<small class="item-obs">${item.observacao}</small>` : ''}
                </td>
                <td>
                    <div class="quantidade-controls">
                        <button type="button" class="btn-qty" data-action="decrease" data-item="${item.id}">-</button>
                        <span>${item.quantidade}</span>
                        <button type="button" class="btn-qty" data-action="increase" data-item="${item.id}">+</button>
                    </div>
                </td>
                <td>R$ ${item.precoUnitario.toFixed(2)}</td>
                <td>R$ ${item.subtotal.toFixed(2)}</td>
                <td>
                    <button type="button" class="action-btn btn-editar-item" data-item="${item.id}"><i class="fas fa-edit"></i></button>
                    <button type="button" class="action-btn btn-remover-item" data-item="${item.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            
            itensTable.appendChild(tr);
        });
        
        // Adiciona eventos aos botões de quantidade
        document.querySelectorAll('.btn-qty').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item');
                const action = this.getAttribute('data-action');
                
                // Encontra o item
                const item = pedidoAtual.itens.find(item => item.id == itemId);
                if (!item) return;
                
                // Atualiza a quantidade
                if (action === 'decrease') {
                    if (item.quantidade > 1) {
                        item.quantidade--;
                    }
                } else if (action === 'increase') {
                    item.quantidade++;
                }
                
                // Atualiza o subtotal
                item.subtotal = item.quantidade * item.precoUnitario;
                
                // Atualiza a interface
                atualizarTabelaItens();
                calcularTotais();
            });
        });
        
        // Adiciona eventos aos botões de edição
        document.querySelectorAll('.btn-editar-item').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item');
                
                // Encontra o item
                const item = pedidoAtual.itens.find(item => item.id == itemId);
                if (!item) return;
                
                // Abre o modal de edição
                abrirModalEditarItem(item);
            });
        });
        
        // Adiciona eventos aos botões de remoção
        document.querySelectorAll('.btn-remover-item').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-item');
                
                // Remove o item do array
                pedidoAtual.itens = pedidoAtual.itens.filter(item => item.id != itemId);
                
                // Atualiza a interface
                atualizarTabelaItens();
                calcularTotais();
            });
        });
    }
    
    // Função para abrir o modal de edição de item
    function abrirModalEditarItem(item) {
        // Preenche os campos do modal
        document.getElementById('modal-produto-nome').value = item.produto.nome;
        document.getElementById('modal-produto-preco').value = `R$ ${item.precoUnitario.toFixed(2)}`;
        document.getElementById('modal-produto-quantidade').value = item.quantidade;
        document.getElementById('modal-produto-observacao').value = item.observacao || '';
        
        // Exibe o modal
        modalProduto.style.display = 'flex';
        
        // Configura o botão de adicionar
        const btnAdicionar = document.getElementById('modal-produto-adicionar');
        btnAdicionar.textContent = 'Atualizar Item';
        
        btnAdicionar.onclick = function() {
            const quantidade = parseInt(document.getElementById('modal-produto-quantidade').value);
            const observacao = document.getElementById('modal-produto-observacao').value;
            
            if (isNaN(quantidade) || quantidade <= 0) {
                alert('Informe uma quantidade válida.');
                return;
            }
            
            // Atualiza o item
            item.quantidade = quantidade;
            item.observacao = observacao;
            item.subtotal = quantidade * item.precoUnitario;
            
            // Atualiza a interface
            atualizarTabelaItens();
            calcularTotais();
            
            // Fecha o modal
            modalProduto.style.display = 'none';
            btnAdicionar.textContent = 'Adicionar ao Pedido';
        };
    }
    
    // ===========================================
    // CÁLCULOS DE TOTAIS
    // ===========================================
    
    // Função para calcular os totais
    function calcularTotais() {
        // Calcula o subtotal
        pedidoAtual.subtotal = pedidoAtual.itens.reduce((total, item) => total + item.subtotal, 0);
        
        // Atualiza os campos de subtotal
        pedidoSubtotal.textContent = `R$ ${pedidoAtual.subtotal.toFixed(2)}`;
        resumoSubtotal.textContent = `R$ ${pedidoAtual.subtotal.toFixed(2)}`;
        
        // Calcula o desconto
        const percentualDesconto = parseFloat(pedidoDesconto.value) || 0;
        pedidoAtual.desconto = (percentualDesconto / 100) * pedidoAtual.subtotal;
        
        // Atualiza os campos de desconto
        pedidoDescontoValor.value = `R$ ${pedidoAtual.desconto.toFixed(2)}`;
        resumoDesconto.textContent = `-R$ ${pedidoAtual.desconto.toFixed(2)}`;
        
        // Calcula a taxa de serviço
        const percentualTaxa = parseFloat(pedidoTaxaServico.value) || 0;
        pedidoAtual.taxaServico = (percentualTaxa / 100) * pedidoAtual.subtotal;
        
        // Atualiza os campos de taxa
        pedidoTaxaValor.value = `R$ ${pedidoAtual.taxaServico.toFixed(2)}`;
        resumoTaxa.textContent = `+R$ ${pedidoAtual.taxaServico.toFixed(2)}`;
        
        // Calcula o total
        pedidoAtual.total = pedidoAtual.subtotal - pedidoAtual.desconto + pedidoAtual.taxaServico;
        
        // Atualiza o campo de total
        resumoTotal.textContent = `R$ ${pedidoAtual.total.toFixed(2)}`;
    }
    
    // Eventos para recalcular os totais quando os valores de desconto ou taxa são alterados
    pedidoDesconto.addEventListener('input', calcularTotais);
    pedidoTaxaServico.addEventListener('input', calcularTotais);
    
    // ===========================================
    // MANIPULAÇÃO DE CLIENTES
    // ===========================================
    
    // Array fictício de clientes (em um sistema real, isso viria do banco de dados)
    const clientes = [
        { id: 1, nome: 'João Silva', telefone: '(11) 98765-4321', email: 'joao@email.com' },
        { id: 2, nome: 'Maria Oliveira', telefone: '(11) 91234-5678', email: 'maria@email.com' },
        { id: 3, nome: 'Carlos Souza', telefone: '(11) 99876-5432', email: 'carlos@email.com' }
    ];
    
    // Busca de clientes
    clienteNome.addEventListener('input', function() {
        const termoBusca = this.value.toLowerCase();
        
        // Filtra os clientes pelo termo de busca
        if (termoBusca.length > 2) {
            const clientesFiltrados = clientes.filter(cliente => 
                cliente.nome.toLowerCase().includes(termoBusca) ||
                cliente.telefone.includes(termoBusca)
            );
            
            console.log('Clientes encontrados:', clientesFiltrados);
            
            // Em uma implementação real, aqui você criaria uma lista dinâmica de sugestões
        }
    });
    
    // Botão de buscar cliente
    btnBuscarCliente.addEventListener('click', function() {
        const termoBusca = clienteNome.value.toLowerCase();
        
        if (termoBusca.length < 3) {
            alert('Digite pelo menos 3 caracteres para buscar um cliente.');
            return;
        }
        
        // Filtra os clientes pelo termo de busca
        const clientesFiltrados = clientes.filter(cliente => 
            cliente.nome.toLowerCase().includes(termoBusca) ||
            cliente.telefone.includes(termoBusca)
        );
        
        if (clientesFiltrados.length === 0) {
            alert('Nenhum cliente encontrado com esse nome ou telefone.');
            return;
        }
        
        // Para simplificar, vamos pegar o primeiro cliente encontrado
        const clienteEncontrado = clientesFiltrados[0];
        
        // Preenche os campos
        clienteNome.value = clienteEncontrado.nome;
        clienteTelefone.value = clienteEncontrado.telefone;
        clienteId.value = clienteEncontrado.id;
        
        // Atualiza o objeto de pedido
        pedidoAtual.cliente = clienteEncontrado;
        
        console.log('Cliente selecionado:', clienteEncontrado);
    });
    
    // Botão de novo cliente
    btnNovoCliente.addEventListener('click', function() {
        // Limpa os campos do modal
        document.getElementById('modal-cliente-nome').value = clienteNome.value || '';
        document.getElementById('modal-cliente-telefone').value = clienteTelefone.value || '';
        document.getElementById('modal-cliente-email').value = '';
        document.getElementById('modal-cliente-cpf').value = '';
        
        // Exibe o modal
        modalCliente.style.display = 'flex';
    });
    
    // Botão de salvar cliente
    document.getElementById('modal-cliente-salvar').addEventListener('click', function() {
        const nome = document.getElementById('modal-cliente-nome').value;
        const telefone = document.getElementById('modal-cliente-telefone').value;
        const email = document.getElementById('modal-cliente-email').value;
        const cpf = document.getElementById('modal-cliente-cpf').value;
        
        if (!nome || !telefone) {
            alert('Nome e telefone são obrigatórios.');
            return;
        }
        
        // Cria um novo cliente
        const novoCliente = {
            id: clientes.length + 1,
            nome: nome,
            telefone: telefone,
            email: email,
            cpf: cpf
        };
        
        // Adiciona ao array de clientes (em um sistema real, enviaria para o banco de dados)
        clientes.push(novoCliente);
        
        // Preenche os campos do formulário
        clienteNome.value = novoCliente.nome;
        clienteTelefone.value = novoCliente.telefone;
        clienteId.value = novoCliente.id;
        
        // Atualiza o objeto de pedido
        pedidoAtual.cliente = novoCliente;
        
        // Fecha o modal
        modalCliente.style.display = 'none';
        
        console.log('Novo cliente cadastrado:', novoCliente);
    });
    
    // ===========================================
    // MANIPULAÇÃO DE MODAIS
    // ===========================================
    
    // Fecha todos os modais
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal-container');
            modal.style.display = 'none';
        });
    });
    
    // Fecha modais ao clicar fora
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal-container')) {
            event.target.style.display = 'none';
        }
    });
    
    // ===========================================
    // BOTÕES DE AÇÃO DO FORMULÁRIO
    // ===========================================
    
    // Botão de cancelar
    btnCancelar.addEventListener('click', function() {
        if (confirm('Tem certeza que deseja cancelar este pedido? Todos os dados serão perdidos.')) {
            // Limpa o formulário
            limparFormulario();
        }
    });
    
    // Botão de salvar rascunho
    btnSalvarRascunho.addEventListener('click', function() {
        if (validarFormulario(false)) {
            // Simulação de salvamento
            alert('Pedido salvo como rascunho.');
            console.log('Pedido salvo:', pedidoAtual);
        }
    });
    
    // Botão de enviar para cozinha
    btnEnviarCozinha.addEventListener('click', function() {
        if (validarFormulario(true)) {
            // Simulação de envio para cozinha
            alert('Pedido enviado para a cozinha com sucesso!');
            console.log('Pedido enviado para cozinha:', pedidoAtual);
            
            // Atualiza o status do pedido
            document.getElementById('pedido-status').value = 'Em Preparo';
            pedidoAtual.status = 'Em Preparo';
        }
    });
    
    // Botão de finalizar pedido
    btnFinalizar.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (validarFormulario(true)) {
            // Forma de pagamento será definida no fechamento final pelo caixa
            
            // Simulação de finalização
            alert('Pedido finalizado com sucesso!');
            console.log('Pedido finalizado:', pedidoAtual);
            
            // Limpa o formulário para um novo pedido
            limparFormulario();
        }
    });
    
    // Função para validar o formulário
    function validarFormulario(completo) {
        // Validação básica
        if (pedidoAtual.itens.length === 0) {
            alert('Adicione pelo menos um item ao pedido.');
            return false;
        }
        
        // Para pedidos completos, verifica mesa e cliente
        if (completo) {
            if (!pedidoAtual.mesa) {
                alert('Selecione uma mesa.');
                return false;
            }
            
            // Cliente não é mais obrigatório, removendo validação
        }
        
        return true;
    }
    
    // Função para limpar o formulário
    function limparFormulario() {
        // Limpa os campos
        clienteNome.value = '';
        clienteTelefone.value = '';
        clienteId.value = '';
        
        mesaNumeroInput.value = '';
        mesaIdInput.value = '';
        mesaSelect.value = '';
        
        produtoBusca.value = '';
        produtoSelect.value = '';
        produtoPreco.value = '';
        document.getElementById('produto-id').value = '';
        produtoQuantidade.value = 1;
        
        document.getElementById('item-observacao').value = '';
        
        pedidoDesconto.value = 0;
        pedidoTaxaServico.value = 10;
        
        document.getElementById('pedido-forma-pagamento').value = '';
        
        // Remove a seleção visual da mesa
        mesaElements.forEach(mesa => mesa.classList.remove('selected'));
        
        // Reinicia o objeto de pedido
        pedidoAtual = {
            itens: [],
            subtotal: 0,
            desconto: 0,
            taxaServico: 0,
            total: 0,
            cliente: null,
            mesa: null,
            observacao: '',
            status: 'Aberto',
            formaPagamento: null
        };
        
        // Atualiza a interface
        atualizarTabelaItens();
        calcularTotais();
    }
    
    // Inicialização
    calcularTotais();
});

// Adiciona estilos CSS para elementos criados dinamicamente
document.head.insertAdjacentHTML('beforeend', `
<style>
    .btn-qty {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: var(--bg-light);
        color: var(--text-secondary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .btn-qty:hover {
        background-color: var(--primary-color);
        color: white;
    }
    
    .quantidade-controls {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .item-obs {
        display: block;
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 4px;
        font-style: italic;
    }
    
    .sidebar-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.4);
        z-index: 9;
    }
</style>
`);
