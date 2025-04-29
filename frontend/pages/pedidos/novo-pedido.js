// JavaScript para Tela de Novos Pedidos
// Integração com banco de dados PostgreSQL

document.addEventListener('DOMContentLoaded', function() {
    // Referências globais aos elementos da UI
    const tipoPedidoSelect = document.getElementById('tipo-pedido');
    const mesaContainer = document.getElementById('mesa-container');
    const mesaSelect = document.getElementById('mesa');
    const clienteInput = document.getElementById('cliente');
    const clienteIdInput = document.getElementById('cliente-id');
    const atendenteSelect = document.getElementById('atendente');
    const categoriasBtns = document.querySelector('.categorias-filter');
    const produtosGrid = document.getElementById('produtos-grid');
    const buscaProdutoInput = document.getElementById('busca-produto');
    const carrinhoItens = document.getElementById('carrinho-itens');
    const observacoesTextarea = document.getElementById('observacoes');
    const descontoPercentualInput = document.getElementById('desconto-percentual');
    const descontoValorInput = document.getElementById('desconto-valor');
    const aplicarTaxaServicoCheckbox = document.getElementById('aplicar-taxa-servico');
    const taxaServicoValorSpan = document.getElementById('taxa-servico-valor');
    const subtotalSpan = document.getElementById('pedido-subtotal');
    const totalSpan = document.getElementById('pedido-total');
    const btnCancelar = document.querySelector('.btn-cancelar');
    const btnSalvarRascunho = document.querySelector('.btn-salvar-rascunho');
    const btnConfirmarPedido = document.querySelector('.btn-confirmar-pedido');
    const btnLimparCarrinho = document.getElementById('limpar-carrinho');
    
    // Referências aos modais
    const modalProduto = document.getElementById('modal-produto-detalhes');
    const modalMapaMesas = document.getElementById('modal-mapa-mesas');
    const modalBuscaCliente = document.getElementById('modal-busca-cliente');
    const modalNovoCliente = document.getElementById('modal-novo-cliente');
    
    // Variáveis de estado
    let categorias = [];
    let produtos = [];
    let mesas = [];
    let areas = [];
    let atendentes = [];
    let clientes = [];
    let gruposModificadores = [];
    let modificadores = [];
    let carrinhoAtual = [];
    let mesaSelecionadaNoMapa = null;
    let produtoAtual = null;
    let tenant_id = 1; // Valor padrão, deve ser obtido da sessão do usuário
    let usuario_id = 1; // Valor padrão, deve ser obtido da sessão do usuário
    
    // Constantes
    const TAXA_SERVICO_PERCENTUAL = 10;
    
    // Inicialização
    async function inicializar() {
        await carregarDadosIniciais();
        configurarEventListeners();
        atualizarInterface();
    }
    
    // Carregamento de dados iniciais do banco
    async function carregarDadosIniciais() {
        try {
            // Carregar todos os dados necessários em paralelo
            const [
                categoriasData, 
                produtosData, 
                mesasData, 
                areasData, 
                atendentesData
            ] = await Promise.all([
                fetchCategorias(),
                fetchProdutos(),
                fetchMesas(),
                fetchAreas(),
                fetchAtendentes()
            ]);
            
            categorias = categoriasData;
            produtos = produtosData;
            mesas = mesasData;
            areas = areasData;
            atendentes = atendentesData;
            
            // Carregar modificadores apenas após ter produtos
            const grupos = await fetchGruposModificadores();
            gruposModificadores = grupos;
            
            const modsPromises = grupos.map(g => fetchModificadoresPorGrupo(g.id));
            const todosModificadores = await Promise.all(modsPromises);
            modificadores = todosModificadores.flat();
            
            // Inicializar elementos da interface
            renderizarCategorias();
            renderizarProdutos();
            renderizarMesas();
            renderizarAtendentes();
            
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            exibirNotificacao('Erro ao carregar dados. Tente novamente.', 'error');
        }
    }
    
    // Funções para buscar dados do banco
    async function fetchCategorias() {
        try {
            const response = await fetch(`/api/categorias?tenant_id=${tenant_id}&ativa=true`);
            if (!response.ok) throw new Error('Erro ao buscar categorias');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            return [];
        }
    }
    
    async function fetchProdutos() {
        try {
            const response = await fetch(`/api/produtos?tenant_id=${tenant_id}&disponivel_venda=true`);
            if (!response.ok) throw new Error('Erro ao buscar produtos');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            return [];
        }
    }
    
    async function fetchMesas() {
        try {
            const response = await fetch(`/api/mesas?tenant_id=${tenant_id}&ativa=true`);
            if (!response.ok) throw new Error('Erro ao buscar mesas');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar mesas:', error);
            return [];
        }
    }
    
    async function fetchAreas() {
        try {
            const response = await fetch(`/api/areas?tenant_id=${tenant_id}&ativa=true`);
            if (!response.ok) throw new Error('Erro ao buscar áreas');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar áreas:', error);
            return [];
        }
    }
    
    async function fetchAtendentes() {
        try {
            const response = await fetch(`/api/funcionarios?tenant_id=${tenant_id}&ativo=true`);
            if (!response.ok) throw new Error('Erro ao buscar atendentes');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar atendentes:', error);
            return [];
        }
    }
    
    async function fetchGruposModificadores() {
        try {
            const response = await fetch(`/api/grupos-modificadores?tenant_id=${tenant_id}`);
            if (!response.ok) throw new Error('Erro ao buscar grupos de modificadores');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar grupos de modificadores:', error);
            return [];
        }
    }
    
    async function fetchModificadoresPorGrupo(grupoId) {
        try {
            const response = await fetch(`/api/modificadores?grupo_id=${grupoId}&disponivel=true`);
            if (!response.ok) throw new Error('Erro ao buscar modificadores');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar modificadores:', error);
            return [];
        }
    }
    
    async function buscarClientes(termo) {
        try {
            const response = await fetch(`/api/clientes?tenant_id=${tenant_id}&busca=${termo}&ativo=true`);
            if (!response.ok) throw new Error('Erro ao buscar clientes');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
            return [];
        }
    }
    
    async function buscarClientePorId(id) {
        try {
            const response = await fetch(`/api/clientes/${id}?tenant_id=${tenant_id}`);
            if (!response.ok) throw new Error('Erro ao buscar cliente');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            return null;
        }
    }
    
    async function buscarProdutosPorCategoria(categoriaId) {
        // Se categoriaId for 'all', retorna todos os produtos
        if (categoriaId === 'all') {
            return produtos;
        }
        
        return produtos.filter(p => p.categoria_id === parseInt(categoriaId));
    }
    
    async function buscarGruposModificadoresPorProduto(produtoId) {
        try {
            const response = await fetch(`/api/produtos/${produtoId}/grupos-modificadores`);
            if (!response.ok) throw new Error('Erro ao buscar grupos de modificadores do produto');
            const data = await response.json();
            
            // Para cada grupo, busca os modificadores
            const gruposDetalhados = await Promise.all(
                data.map(async (grupo) => {
                    const modificadoresGrupo = await fetchModificadoresPorGrupo(grupo.grupo_modificador_id);
                    // Encontra o objeto do grupo completo
                    const grupoCompleto = gruposModificadores.find(g => g.id === grupo.grupo_modificador_id);
                    return {
                        ...grupoCompleto,
                        modificadores: modificadoresGrupo
                    };
                })
            );
            
            return gruposDetalhados;
        } catch (error) {
            console.error('Erro ao buscar grupos de modificadores do produto:', error);
            return [];
        }
    }
    
    // Funções de renderização da interface
    function renderizarCategorias() {
        // Limpa botões de categoria existentes, exceto o "Todos"
        const todosBotoes = categoriasBtns.querySelectorAll('.categoria-btn:not([data-id="all"])');
        todosBotoes.forEach(btn => btn.remove());
        
        // Adiciona botões para cada categoria
        categorias.forEach(categoria => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'categoria-btn';
            btn.dataset.id = categoria.id;
            btn.textContent = categoria.nome;
            
            // Adiciona estilo de cor se a categoria tiver cor definida
            if (categoria.cor) {
                btn.style.borderLeft = `3px solid ${categoria.cor}`;
            }
            
            categoriasBtns.appendChild(btn);
        });
    }
    
    function renderizarProdutos(filtroCategoria = 'all', termoBusca = '') {
        // Limpa a grade de produtos
        produtosGrid.innerHTML = '';
        
        // Filtra produtos por categoria e termo de busca
        let produtosFiltrados = [...produtos];
        
        if (filtroCategoria !== 'all') {
            produtosFiltrados = produtosFiltrados.filter(p => p.categoria_id === parseInt(filtroCategoria));
        }
        
        if (termoBusca) {
            const termoLower = termoBusca.toLowerCase();
            produtosFiltrados = produtosFiltrados.filter(p => 
                p.nome.toLowerCase().includes(termoLower) || 
                (p.descricao && p.descricao.toLowerCase().includes(termoLower))
            );
        }
        
        // Renderiza cada produto filtrado
        produtosFiltrados.forEach(produto => {
            const categoria = categorias.find(c => c.id === produto.categoria_id);
            const produtoCard = document.createElement('div');
            produtoCard.className = 'produto-card';
            produtoCard.dataset.id = produto.id;
            produtoCard.dataset.categoria = produto.categoria_id || '';
            
            produtoCard.innerHTML = `
                <div class="produto-imagem">
                    <img src="${produto.imagem || '/api/placeholder/100/100'}" alt="${produto.nome}">
                </div>
                <div class="produto-info">
                    <h3 class="produto-nome">${produto.nome}</h3>
                    <p class="produto-descricao">${produto.descricao_curta || ''}</p>
                    <span class="produto-preco">${formatarMoeda(produto.preco_venda)}</span>
                </div>
            `;
            
            // Adiciona uma borda ou indicador da categoria se disponível
            if (categoria && categoria.cor) {
                produtoCard.style.borderLeft = `3px solid ${categoria.cor}`;
            }
            
            produtosGrid.appendChild(produtoCard);
        });
        
        // Mensagem se nenhum produto for encontrado
        if (produtosFiltrados.length === 0) {
            produtosGrid.innerHTML = `
                <div class="sem-resultados">
                    <p>Nenhum produto encontrado. Tente outro termo ou categoria.</p>
                </div>
            `;
        }
    }
    
    function renderizarMesas() {
        // Limpa o select de mesas
        mesaSelect.innerHTML = '<option value="">Selecione uma mesa</option>';
        
        // Adiciona apenas mesas com status "Livre" ou "Reservada"
        const mesasDisponiveis = mesas.filter(m => 
            m.status.toLowerCase() === 'livre' || 
            m.status.toLowerCase() === 'reservada'
        );
        
        // Ordena as mesas pelo número
        mesasDisponiveis.sort((a, b) => {
            // Converte para número se possível, senão compara como string
            const numA = parseInt(a.numero);
            const numB = parseInt(b.numero);
            
            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            
            return a.numero.localeCompare(b.numero);
        });
        
        // Adiciona cada mesa ao select
        mesasDisponiveis.forEach(mesa => {
            const option = document.createElement('option');
            option.value = mesa.id;
            option.textContent = `Mesa ${mesa.numero} (${mesa.capacidade} lugares)`;
            
            // Adiciona classes ou dados adicionais baseado no status
            if (mesa.status.toLowerCase() === 'reservada') {
                option.classList.add('mesa-reservada');
                option.dataset.status = 'reservada';
            }
            
            mesaSelect.appendChild(option);
        });
    }
    
    function renderizarAtendentes() {
        // Limpa o select de atendentes
        atendenteSelect.innerHTML = '<option value="">Selecione um atendente</option>';
        
        // Filtra apenas funcionários que podem ser atendentes (garçons, etc.)
        // Isso pode ser melhorado com um filtro específico por cargo
        const atendentesDisponiveis = atendentes;
        
        // Ordena por nome
        atendentesDisponiveis.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Adiciona cada atendente ao select
        atendentesDisponiveis.forEach(atendente => {
            const option = document.createElement('option');
            option.value = atendente.id;
            option.textContent = atendente.nome;
            atendenteSelect.appendChild(option);
        });
    }
    
    function renderizarMapaMesas() {
        const mesasGrid = document.getElementById('mesas-grid');
        const filtroArea = document.getElementById('filtro-area');
        
        // Limpa o grid de mesas
        mesasGrid.innerHTML = '';
        
        // Prepara o filtro de áreas
        filtroArea.innerHTML = '<option value="all">Todas as Áreas</option>';
        
        // Adiciona áreas ao filtro
        areas.forEach(area => {
            const option = document.createElement('option');
            option.value = area.id;
            option.textContent = area.nome;
            filtroArea.appendChild(option);
        });
        
        // Renderiza cada mesa
        mesas.forEach(mesa => {
            const mesaItem = document.createElement('div');
            mesaItem.className = `mesa-item ${mesa.status.toLowerCase()}`;
            mesaItem.dataset.id = mesa.id;
            mesaItem.dataset.numero = mesa.numero;
            
            const area = areas.find(a => a.id === mesa.area_id);
            
            mesaItem.innerHTML = `
                <span class="mesa-numero">${mesa.numero}</span>
                <span class="mesa-capacidade">${mesa.capacidade} lugares</span>
                <span class="mesa-status">${mesa.status}</span>
                ${area ? `<span class="mesa-area">${area.nome}</span>` : ''}
            `;
            
            // Se a mesa estiver selecionada, adiciona a classe
            if (mesa.id === mesaSelecionadaNoMapa) {
                mesaItem.classList.add('selecionada');
            }
            
            mesasGrid.appendChild(mesaItem);
        });
    }
    
    function renderizarModificadoresProduto(grupos) {
        const container = document.getElementById('modal-modificadores-container');
        container.innerHTML = '';
        
        grupos.forEach(grupo => {
            const grupoDiv = document.createElement('div');
            grupoDiv.className = 'modificadores-grupo';
            grupoDiv.dataset.id = grupo.id;
            
            const isSingleSelect = grupo.maximo_selecao === 1;
            const inputType = isSingleSelect ? 'radio' : 'checkbox';
            
            grupoDiv.innerHTML = `
                <h4 class="grupo-titulo">${grupo.nome}</h4>
                <p class="grupo-desc">${grupo.descricao || ''}</p>
                <div class="modificadores-opcoes">
                    ${grupo.modificadores.map(mod => `
                        <label class="checkbox-container">
                            <input type="${inputType}" name="grupo_${grupo.id}" value="${mod.id}" 
                                ${mod.padrao ? 'checked' : ''} 
                                data-nome="${mod.nome}" 
                                data-preco="${mod.preco_adicional || 0}">
                            <span class="checkmark"></span>
                            <span class="opcao-texto">${mod.nome}</span>
                            ${mod.preco_adicional > 0 ? `<span class="opcao-preco">+${formatarMoeda(mod.preco_adicional)}</span>` : ''}
                        </label>
                    `).join('')}
                </div>
                ${grupo.obrigatorio ? '<p class="grupo-obrigatorio">* Seleção obrigatória</p>' : ''}
            `;
            
            container.appendChild(grupoDiv);
        });
        
        // Se não houver modificadores
        if (grupos.length === 0) {
            container.innerHTML = '<p>Este produto não possui opções de personalização.</p>';
        }
    }
    
    function renderizarCarrinho() {
        // Limpa o container de itens do carrinho
        carrinhoItens.innerHTML = '';
        
        if (carrinhoAtual.length === 0) {
            carrinhoItens.innerHTML = `
                <div class="carrinho-vazio">
                    <p>Seu pedido está vazio.</p>
                    <p>Adicione produtos clicando nos itens do cardápio.</p>
                </div>
            `;
            return;
        }
        
        // Renderiza cada item do carrinho
        carrinhoAtual.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'carrinho-item';
            itemDiv.dataset.id = index; // Usamos o índice como identificador
            
            const modificadoresTexto = item.modificadores.length > 0 
                ? item.modificadores.map(m => m.nome).join(', ') 
                : '';
            
            const observacaoTexto = item.observacao ? item.observacao : '';
            
            const modificadoresHTML = modificadoresTexto || observacaoTexto 
                ? `<p class="item-modificadores">${modificadoresTexto}${observacaoTexto ? (modificadoresTexto ? ' - ' : '') + observacaoTexto : ''}</p>` 
                : '';
            
            itemDiv.innerHTML = `
                <div class="item-info">
                    <span class="item-quantidade">${item.quantidade}x</span>
                    <div class="item-detalhes">
                        <h4 class="item-nome">${item.nome}</h4>
                        ${modificadoresHTML}
                    </div>
                </div>
                <div class="item-acoes">
                    <span class="item-preco">${formatarMoeda(item.valorTotal)}</span>
                    <div class="item-controles">
                        <button type="button" class="btn-icon btn-edit-item">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn-icon btn-remove-item">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
            
            carrinhoItens.appendChild(itemDiv);
        });
        
        // Atualiza os totais
        atualizarTotais();
    }
    
    function renderizarResultadosCliente(resultados) {
        const container = document.getElementById('clientes-resultados');
        container.innerHTML = '';
        
        if (resultados.length === 0) {
            container.innerHTML = `
                <div class="sem-resultados">
                    <p>Nenhum cliente encontrado. Tente outro termo ou cadastre um novo cliente.</p>
                </div>
            `;
            return;
        }
        
        resultados.forEach(cliente => {
            const clienteDiv = document.createElement('div');
            clienteDiv.className = 'cliente-resultado';
            clienteDiv.dataset.id = cliente.id;
            
            clienteDiv.innerHTML = `
                <div class="cliente-info">
                    <h4 class="cliente-nome">${cliente.nome}</h4>
                    <p class="cliente-contato">${cliente.telefone}${cliente.email ? ' | ' + cliente.email : ''}</p>
                </div>
                <button type="button" class="btn btn-sm btn-selecionar-cliente">Selecionar</button>
            `;
            
            container.appendChild(clienteDiv);
        });
    }
    
    // Event Listeners
    function configurarEventListeners() {
        // Tipo de pedido muda o que é exibido (mesa, endereço, etc)
        tipoPedidoSelect.addEventListener('change', handleTipoPedidoChange);
        
        // Botão para abrir o mapa de mesas
        document.getElementById('ver-mapa-mesas').addEventListener('click', abrirModalMapaMesas);
        
        // Filtro de categorias
        categoriasBtns.addEventListener('click', handleCategoriaBtnClick);
        
        // Busca de produtos
        buscaProdutoInput.addEventListener('input', handleBuscaProduto);
        
        // Clique em um produto abre o modal
        produtosGrid.addEventListener('click', handleProdutoClick);
        
        // Controles de quantidade no modal de produto
        document.getElementById('btn-reduzir-qty').addEventListener('click', () => {
            const qtyInput = document.getElementById('modal-quantidade');
            if (qtyInput.value > 1) {
                qtyInput.value = parseInt(qtyInput.value) - 1;
                atualizarProdutoModalTotal();
            }
        });
        
        document.getElementById('btn-aumentar-qty').addEventListener('click', () => {
            const qtyInput = document.getElementById('modal-quantidade');
            qtyInput.value = parseInt(qtyInput.value) + 1;
            atualizarProdutoModalTotal();
        });
        
        document.getElementById('modal-quantidade').addEventListener('change', atualizarProdutoModalTotal);
        
        // Modificadores no modal afetam o preço total
        document.getElementById('modal-modificadores-container').addEventListener('change', atualizarProdutoModalTotal);
        
        // Botões do modal de produto
        document.getElementById('modal-btn-cancelar').addEventListener('click', () => fecharModal(modalProduto));
        document.getElementById('modal-btn-adicionar').addEventListener('click', adicionarProdutoAoCarrinho);
        
        // Fechar modais ao clicar no X
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                fecharModal(modal);
            });
        });
        
        // Modal do mapa de mesas
        document.getElementById('mesas-grid').addEventListener('click', handleMesaClick);
        document.getElementById('filtro-area').addEventListener('change', (e) => {
            const areaId = e.target.value;
            filtrarMesasPorArea(areaId);
        });
        document.getElementById('modal-btn-selecionar-mesa').addEventListener('click', selecionarMesaDoMapa);
        
        // Campo de cliente e botão de adicionar cliente
        clienteInput.addEventListener('focus', abrirModalBuscaCliente);
        document.getElementById('adicionar-cliente').addEventListener('click', abrirModalNovoCliente);
        
        // Modal de busca de cliente
        document.getElementById('busca-cliente-input').addEventListener('input', handleBuscaCliente);
        document.getElementById('clientes-resultados').addEventListener('click', handleSelecionarCliente);
        document.getElementById('modal-btn-novo-cliente').addEventListener('click', () => {
            fecharModal(modalBuscaCliente);
            abrirModalNovoCliente();
        });
        
        // Modal de novo cliente
        document.getElementById('modal-btn-cancelar-cliente').addEventListener('click', () => fecharModal(modalNovoCliente));
        document.getElementById('modal-btn-salvar-cliente').addEventListener('click', salvarNovoCliente);
        
        // Eventos do carrinho
        carrinhoItens.addEventListener('click', handleCarrinhoItemClick);
        btnLimparCarrinho.addEventListener('click', limparCarrinho);
        
        // Controles de desconto
        descontoPercentualInput.addEventListener('input', handleDescontoPercentual);
        descontoValorInput.addEventListener('input', handleDescontoValor);
        
        // Taxa de serviço
        aplicarTaxaServicoCheckbox.addEventListener('change', atualizarTotais);
        
        // Botões de ação principais
        btnCancelar.addEventListener('click', cancelarPedido);
        btnSalvarRascunho.addEventListener('click', salvarPedidoRascunho);
        btnConfirmarPedido.addEventListener('click', confirmarPedido);
    }
    
    // Handlers de eventos
    function handleTipoPedidoChange() {
        const tipo = tipoPedidoSelect.value;
        
        // Mostra/esconde o container de mesa baseado no tipo
        if (tipo === 'local') {
            mesaContainer.style.display = 'block';
        } else {
            mesaContainer.style.display = 'none';
            mesaSelect.value = '';
        }
        
        // Aqui podemos adicionar lógica para mostrar campos de endereço, entregador, etc
        // dependendo do tipo de pedido (delivery, viagem, etc)
    }
    
    function handleCategoriaBtnClick(e) {
        // Verifica se o clique foi em um botão de categoria
        if (!e.target.classList.contains('categoria-btn')) return;
        
        // Remove a classe "active" de todos os botões
        categoriasBtns.querySelectorAll('.categoria-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Adiciona a classe "active" ao botão clicado
        e.target.classList.add('active');
        
        // Filtra os produtos pela categoria selecionada
        const categoriaId = e.target.dataset.id;
        renderizarProdutos(categoriaId, buscaProdutoInput.value);
    }
    
    function handleBuscaProduto(e) {
        const termo = e.target.value;
        const categoriaAtiva = categoriasBtns.querySelector('.categoria-btn.active');
        const categoriaId = categoriaAtiva ? categoriaAtiva.dataset.id : 'all';
        
        renderizarProdutos(categoriaId, termo);
    }
    
    function handleProdutoClick(e) {
        // Encontra o card do produto clicado
        const produtoCard = e.target.closest('.produto-card');
        if (!produtoCard) return;
        
        const produtoId = parseInt(produtoCard.dataset.id);
        abrirModalProduto(produtoId);
    }
    
    async function handleBuscaCliente(e) {
        const termo = e.target.value;
        
        if (termo.length < 3) {
            document.getElementById('clientes-resultados').innerHTML = `
                <div class="sem-resultados">
                    <p>Digite pelo menos 3 caracteres para buscar.</p>
                </div>
            `;
            return;
        }
        
        // Busca clientes no banco de dados
        const resultados = await buscarClientes(termo);
        renderizarResultadosCliente(resultados);
    }
    
    function handleSelecionarCliente(e) {
        const btnSelecionar = e.target.closest('.btn-selecionar-cliente');
        if (!btnSelecionar) return;
        
        const clienteDiv = btnSelecionar.closest('.cliente-resultado');
        const clienteId = clienteDiv.dataset.id;
        const clienteNome = clienteDiv.querySelector('.cliente-nome').textContent;
        
        // Preenche os campos de cliente
        clienteInput.value = clienteNome;
        clienteIdInput.value = clienteId;
        
        fecharModal(modalBuscaCliente);
    }
    
    function handleMesaClick(e) {
        const mesaItem = e.target.closest('.mesa-item');
        if (!mesaItem) return;
        
        // Desmarca a mesa anteriormente selecionada
        const mesaSelecionadaAnterior = document.querySelector('.mesa-item.selecionada');
        if (mesaSelecionadaAnterior) {
            mesaSelecionadaAnterior.classList.remove('selecionada');
        }
        
        // Marca a mesa clicada como selecionada
        mesaItem.classList.add('selecionada');
        mesaSelecionadaNoMapa = parseInt(mesaItem.dataset.id);
    }
    
    function handleCarrinhoItemClick(e) {
        const btnEditar = e.target.closest('.btn-edit-item');
        const btnRemover = e.target.closest('.btn-remove-item');
        
        if (!btnEditar && !btnRemover) return;
        
        const itemDiv = e.target.closest('.carrinho-item');
        const itemIndex = parseInt(itemDiv.dataset.id);
        
        if (btnEditar) {
            editarItemCarrinho(itemIndex);
        } else if (btnRemover) {
            removerItemCarrinho(itemIndex);
        }
    }
    
    function handleDescontoPercentual(e) {
        const percentual = parseFloat(e.target.value) || 0;
        
        // Limita o percentual a 100%
        if (percentual > 100) {
            e.target.value = 100;
            return;
        }
        
        // Calcula o valor do desconto baseado no percentual
        const subtotal = calcularSubtotal();
        const valorDesconto = (subtotal * percentual) / 100;
        
        // Atualiza o input de valor sem disparar seu evento
        descontoValorInput.value = valorDesconto.toFixed(2);
        
        // Atualiza os totais
        atualizarTotais();
    }
    
    function handleDescontoValor(e) {
        const valor = parseFloat(e.target.value) || 0;
        const subtotal = calcularSubtotal();
        
        // Limita o valor ao subtotal
        if (valor > subtotal) {
            e.target.value = subtotal.toFixed(2);
            return;
        }
        
        // Calcula o percentual baseado no valor
        const percentual = (valor / subtotal) * 100;
        
        // Atualiza o input de percentual sem disparar seu evento
        descontoPercentualInput.value = percentual.toFixed(2);
        
        // Atualiza os totais
        atualizarTotais();
    }
    
    // Funções de manipulação de modais
    function abrirModal(modal) {
        modal.style.display = 'block';
        // Impede o scroll no body quando o modal está aberto
        document.body.style.overflow = 'hidden';
    }
    
    function fecharModal(modal) {
        modal.style.display = 'none';
        // Restaura o scroll no body
        document.body.style.overflow = 'auto';
    }
    
    async function abrirModalProduto(produtoId) {
        // Busca os detalhes do produto
        produtoAtual = produtos.find(p => p.id === produtoId);
        
        if (!produtoAtual) {
            exibirNotificacao('Produto não encontrado', 'error');
            return;
        }
        
        // Preenche o modal com os dados do produto
        document.getElementById('modal-produto-nome').textContent = produtoAtual.nome;
        document.getElementById('modal-produto-imagem').src = produtoAtual.imagem || '/api/placeholder/200/200';
        document.getElementById('modal-quantidade').value = 1;
        document.getElementById('modal-observacao').value = '';
        document.getElementById('modal-produto-preco-unitario').textContent = formatarMoeda(produtoAtual.preco_venda);
        document.getElementById('modal-produto-preco-total').textContent = formatarMoeda(produtoAtual.preco_venda);
        
        // Busca grupos de modificadores do produto
        const grupos = await buscarGruposModificadoresPorProduto(produtoId);
        renderizarModificadoresProduto(grupos);
        
        // Abre o modal
        abrirModal(modalProduto);
    }
    
    function abrirModalMapaMesas() {
        renderizarMapaMesas();
        abrirModal(modalMapaMesas);
    }
    
    function abrirModalBuscaCliente() {
        document.getElementById('busca-cliente-input').value = '';
        document.getElementById('clientes-resultados').innerHTML = `
            <div class="sem-resultados">
                <p>Digite para buscar um cliente pelo nome, telefone ou e-mail.</p>
            </div>
        `;
        abrirModal(modalBuscaCliente);
    }
    
    function abrirModalNovoCliente() {
        // Limpa o formulário de novo cliente
        document.getElementById('form-novo-cliente').reset();
        abrirModal(modalNovoCliente);
    }
    
    // Funções de manipulação de dados
    function atualizarProdutoModalTotal() {
        if (!produtoAtual) return;
        
        const quantidade = parseInt(document.getElementById('modal-quantidade').value) || 1;
        let precoTotal = produtoAtual.preco_venda * quantidade;
        
        // Adiciona o preço dos modificadores selecionados
        const modificadoresSelecionados = document.querySelectorAll('#modal-modificadores-container input:checked');
        modificadoresSelecionados.forEach(input => {
            const precoAdicional = parseFloat(input.dataset.preco) || 0;
            precoTotal += precoAdicional * quantidade;
        });
        
        document.getElementById('modal-produto-preco-total').textContent = formatarMoeda(precoTotal);
    }
    
    function adicionarProdutoAoCarrinho() {
        if (!produtoAtual) return;
        
        const quantidade = parseInt(document.getElementById('modal-quantidade').value) || 1;
        const observacao = document.getElementById('modal-observacao').value;
        
        // Coleta os modificadores selecionados
        const modificadoresSelecionados = [];
        document.querySelectorAll('#modal-modificadores-container input:checked').forEach(input => {
            modificadoresSelecionados.push({
                id: parseInt(input.value),
                nome: input.dataset.nome,
                preco: parseFloat(input.dataset.preco) || 0
            });
        });
        
        // Calcula o preço total do item
        let precoUnitario = produtoAtual.preco_venda;
        modificadoresSelecionados.forEach(mod => {
            precoUnitario += mod.preco;
        });
        
        const valorTotal = precoUnitario * quantidade;
        
        // Cria o objeto do item de carrinho
        const novoItem = {
            produto_id: produtoAtual.id,
            nome: produtoAtual.nome,
            quantidade: quantidade,
            precoUnitario: precoUnitario,
            valorTotal: valorTotal,
            modificadores: modificadoresSelecionados,
            observacao: observacao
        };
        
        // Adiciona ao carrinho
        carrinhoAtual.push(novoItem);
        
        // Atualiza a interface
        renderizarCarrinho();
        
        // Fecha o modal
        fecharModal(modalProduto);
        
        // Notificação
        exibirNotificacao(`${quantidade}x ${produtoAtual.nome} adicionado ao pedido`, 'success');
    }
    
    function editarItemCarrinho(index) {
        const item = carrinhoAtual[index];
        
        // Busca o produto para preencher os dados básicos
        produtoAtual = produtos.find(p => p.id === item.produto_id);
        
        if (!produtoAtual) {
            exibirNotificacao('Erro ao editar item', 'error');
            return;
        }
        
        // Preenche o modal com os dados do item
        document.getElementById('modal-produto-nome').textContent = produtoAtual.nome;
        document.getElementById('modal-produto-imagem').src = produtoAtual.imagem || '/api/placeholder/200/200';
        document.getElementById('modal-quantidade').value = item.quantidade;
        document.getElementById('modal-observacao').value = item.observacao || '';
        
        // Busca e renderiza os modificadores
        buscarGruposModificadoresPorProduto(produtoAtual.id).then(grupos => {
            renderizarModificadoresProduto(grupos);
            
            // Marca os modificadores já selecionados
            item.modificadores.forEach(mod => {
                const input = document.querySelector(`#modal-modificadores-container input[value="${mod.id}"]`);
                if (input) input.checked = true;
            });
            
            // Atualiza o preço
            atualizarProdutoModalTotal();
            
            // Configura o botão para atualizar ao invés de adicionar
            const btnAdicionar = document.getElementById('modal-btn-adicionar');
            btnAdicionar.textContent = 'Atualizar Item';
            btnAdicionar.onclick = () => {
                atualizarItemCarrinho(index);
            };
            
            // Abre o modal
            abrirModal(modalProduto);
        });
    }
    
    function atualizarItemCarrinho(index) {
        const quantidade = parseInt(document.getElementById('modal-quantidade').value) || 1;
        const observacao = document.getElementById('modal-observacao').value;
        
        // Coleta os modificadores selecionados
        const modificadoresSelecionados = [];
        document.querySelectorAll('#modal-modificadores-container input:checked').forEach(input => {
            modificadoresSelecionados.push({
                id: parseInt(input.value),
                nome: input.dataset.nome,
                preco: parseFloat(input.dataset.preco) || 0
            });
        });
        
        // Calcula o preço total do item
        let precoUnitario = produtoAtual.preco_venda;
        modificadoresSelecionados.forEach(mod => {
            precoUnitario += mod.preco;
        });
        
        const valorTotal = precoUnitario * quantidade;
        
        // Atualiza o item no carrinho
        carrinhoAtual[index] = {
            produto_id: produtoAtual.id,
            nome: produtoAtual.nome,
            quantidade: quantidade,
            precoUnitario: precoUnitario,
            valorTotal: valorTotal,
            modificadores: modificadoresSelecionados,
            observacao: observacao
        };
        
        // Atualiza a interface
        renderizarCarrinho();
        
        // Fecha o modal
        fecharModal(modalProduto);
        
        // Restaura o botão para adicionar
        const btnAdicionar = document.getElementById('modal-btn-adicionar');
        btnAdicionar.textContent = 'Adicionar ao Pedido';
        btnAdicionar.onclick = adicionarProdutoAoCarrinho;
        
        // Notificação
        exibirNotificacao(`Item atualizado no pedido`, 'success');
    }
    
    function removerItemCarrinho(index) {
        // Remove o item pelo índice
        carrinhoAtual.splice(index, 1);
        
        // Atualiza a interface
        renderizarCarrinho();
        
        // Notificação
        exibirNotificacao('Item removido do pedido', 'info');
    }
    
    function limparCarrinho() {
        // Confirma com o usuário
        if (!confirm('Tem certeza que deseja limpar o carrinho? Todos os itens serão removidos.')) {
            return;
        }
        
        // Limpa o array do carrinho
        carrinhoAtual = [];
        
        // Atualiza a interface
        renderizarCarrinho();
        
        // Notificação
        exibirNotificacao('Carrinho limpo com sucesso', 'info');
    }
    
    function filtrarMesasPorArea(areaId) {
        const mesasGrid = document.getElementById('mesas-grid');
        
        // Se for "all", mostra todas as mesas
        if (areaId === 'all') {
            mesasGrid.querySelectorAll('.mesa-item').forEach(mesa => {
                mesa.style.display = 'flex';
            });
            return;
        }
        
        // Filtra apenas as mesas da área selecionada
        const areaIdInt = parseInt(areaId);
        
        mesasGrid.querySelectorAll('.mesa-item').forEach(mesa => {
            const mesaId = parseInt(mesa.dataset.id);
            const mesaObj = mesas.find(m => m.id === mesaId);
            
            if (mesaObj && mesaObj.area_id === areaIdInt) {
                mesa.style.display = 'flex';
            } else {
                mesa.style.display = 'none';
            }
        });
    }
    
    function selecionarMesaDoMapa() {
        if (!mesaSelecionadaNoMapa) {
            exibirNotificacao('Selecione uma mesa antes de continuar', 'warning');
            return;
        }
        
        // Encontra a mesa selecionada nos dados
        const mesa = mesas.find(m => m.id === mesaSelecionadaNoMapa);
        
        if (!mesa) {
            exibirNotificacao('Mesa não encontrada', 'error');
            return;
        }
        
        // Verifica se a mesa está disponível
        if (mesa.status.toLowerCase() === 'ocupada' || mesa.status.toLowerCase() === 'manutenção') {
            exibirNotificacao(`Mesa ${mesa.numero} não está disponível`, 'warning');
            return;
        }
        
        // Seleciona a mesa no select
        mesaSelect.value = mesa.id;
        
        // Fecha o modal
        fecharModal(modalMapaMesas);
    }
    
    async function salvarNovoCliente() {
        // Valida o formulário
        const form = document.getElementById('form-novo-cliente');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Coleta os dados do formulário
        const novoCliente = {
            tenant_id: tenant_id,
            nome: document.getElementById('cliente-nome').value,
            telefone: document.getElementById('cliente-telefone').value,
            email: document.getElementById('cliente-email').value || null,
            cpf: document.getElementById('cliente-cpf').value || null,
            endereco: document.getElementById('cliente-endereco').value || null,
            bairro: document.getElementById('cliente-bairro').value || null,
            cidade: document.getElementById('cliente-cidade').value || null,
            estado: document.getElementById('cliente-estado').value || null,
            observacoes: document.getElementById('cliente-observacoes').value || null,
            data_cadastro: new Date().toISOString(),
            ativo: true
        };
        
        try {
            // Salva o cliente no banco
            const response = await fetch('/api/clientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novoCliente)
            });
            
            if (!response.ok) {
                throw new Error('Erro ao salvar cliente');
            }
            
            const clienteSalvo = await response.json();
            
            // Atualiza o campo de cliente no formulário principal
            clienteInput.value = clienteSalvo.nome;
            clienteIdInput.value = clienteSalvo.id;
            
            // Fecha o modal
            fecharModal(modalNovoCliente);
            
            // Notificação
            exibirNotificacao('Cliente cadastrado com sucesso', 'success');
            
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            exibirNotificacao('Erro ao cadastrar cliente. Tente novamente.', 'error');
        }
    }
    
    // Funções de cálculo e atualização
    function calcularSubtotal() {
        return carrinhoAtual.reduce((total, item) => total + item.valorTotal, 0);
    }
    
    function calcularTaxaServico(subtotal) {
        if (!aplicarTaxaServicoCheckbox.checked) return 0;
        return (subtotal * TAXA_SERVICO_PERCENTUAL) / 100;
    }
    
    function calcularDesconto(subtotal) {
        const valorDesconto = parseFloat(descontoValorInput.value) || 0;
        return valorDesconto;
    }
    
    function calcularTotal() {
        const subtotal = calcularSubtotal();
        const desconto = calcularDesconto(subtotal);
        const taxaServico = calcularTaxaServico(subtotal);
        
        return subtotal - desconto + taxaServico;
    }
    
    function atualizarTotais() {
        const subtotal = calcularSubtotal();
        const taxaServico = calcularTaxaServico(subtotal);
        const total = calcularTotal();
        
        // Atualiza os elementos na interface
        subtotalSpan.textContent = formatarMoeda(subtotal);
        taxaServicoValorSpan.textContent = formatarMoeda(taxaServico);
        totalSpan.textContent = formatarMoeda(total);
    }
    
    function atualizarInterface() {
        // Configura o formulário baseado no tipo de pedido inicial
        handleTipoPedidoChange();
        
        // Inicializa o carrinho vazio
        renderizarCarrinho();
    }
    
    // Funções para salvar pedido
    async function validarFormulario() {
        // Verifica se há itens no carrinho
        if (carrinhoAtual.length === 0) {
            exibirNotificacao('Adicione pelo menos um item ao pedido', 'warning');
            return false;
        }
        
        // Verifica o tipo de pedido e seus campos obrigatórios
        const tipo = tipoPedidoSelect.value;
        
        if (tipo === 'local' && !mesaSelect.value) {
            exibirNotificacao('Selecione uma mesa para o pedido', 'warning');
            return false;
        }
        
        // Verifica se há atendente selecionado
        if (!atendenteSelect.value) {
            exibirNotificacao('Selecione um atendente para o pedido', 'warning');
            return false;
        }
        
        return true;
    }
    
    async function salvarPedido(status = 'Aberto') {
        if (!validarFormulario()) return null;
        
        try {
            // Prepara os dados do pedido
            const subtotal = calcularSubtotal();
            const descontoValor = calcularDesconto(subtotal);
            const descontoPercentual = (descontoValor / subtotal) * 100;
            const taxaServico = calcularTaxaServico(subtotal);
            const total = calcularTotal();
            
            const novoPedido = {
                tenant_id: tenant_id,
                tipo: tipoPedidoSelect.value,
                mesa_id: tipoPedidoSelect.value === 'local' ? parseInt(mesaSelect.value) : null,
                cliente_id: clienteIdInput.value ? parseInt(clienteIdInput.value) : null,
                cliente_nome: clienteInput.value || 'Cliente não identificado',
                cliente_telefone: null, // Seria obtido do cadastro do cliente
                funcionario_id: parseInt(atendenteSelect.value),
                observacao: observacoesTextarea.value,
                data_pedido: new Date().toISOString(),
                subtotal: subtotal,
                desconto_percentual: descontoPercentual,
                desconto_valor: descontoValor,
                taxa_servico: taxaServico,
                valor_total: total,
                status: status,
                usuario_abertura: usuario_id
            };
            
            // Salva o pedido no banco
            const responsePedido = await fetch('/api/pedidos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(novoPedido)
            });
            
            if (!responsePedido.ok) {
                throw new Error('Erro ao salvar pedido');
            }
            
            const pedidoSalvo = await responsePedido.json();
            
            // Salva os itens do pedido
            for (const item of carrinhoAtual) {
                const novoItem = {
                    pedido_id: pedidoSalvo.id,
                    produto_id: item.produto_id,
                    nome_produto: item.nome,
                    quantidade: item.quantidade,
                    preco_unitario: item.precoUnitario,
                    subtotal: item.valorTotal,
                    valor_total: item.valorTotal,
                    observacao: item.observacao,
                    status: 'Pendente',
                    data_pedido: new Date().toISOString()
                };
                
                const responseItem = await fetch('/api/itens-pedido', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(novoItem)
                });
                
                if (!responseItem.ok) {
                    throw new Error('Erro ao salvar item do pedido');
                }
                
                const itemSalvo = await responseItem.json();
                
                // Salva os modificadores do item
                for (const mod of item.modificadores) {
                    const novoMod = {
                        item_pedido_id: itemSalvo.id,
                        modificador_id: mod.id,
                        nome_modificador: mod.nome,
                        preco_adicional: mod.preco
                    };
                    
                    await fetch('/api/itens-pedido-modificadores', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(novoMod)
                    });
                }
            }
            
            // Se for pedido em mesa, atualiza o status da mesa para "Ocupada"
            if (tipoPedidoSelect.value === 'local' && mesaSelect.value) {
                const mesaId = parseInt(mesaSelect.value);
                
                await fetch(`/api/mesas/${mesaId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        status: 'Ocupada'
                    })
                });
            }
            
            return pedidoSalvo;
            
        } catch (error) {
            console.error('Erro ao salvar pedido:', error);
            exibirNotificacao('Erro ao salvar pedido. Tente novamente.', 'error');
            return null;
        }
    }
    
    async function salvarPedidoRascunho() {
        const pedido = await salvarPedido('Rascunho');
        
        if (pedido) {
            exibirNotificacao('Pedido salvo como rascunho', 'success');
            // Redireciona para a lista de pedidos ou limpa o formulário
            setTimeout(() => {
                window.location.href = '/pedidos';
            }, 1500);
        }
    }
    
    async function confirmarPedido() {
        const pedido = await salvarPedido('Aberto');
        
        if (pedido) {
            exibirNotificacao('Pedido confirmado com sucesso', 'success');
            // Redireciona para a página do pedido ou lista de pedidos
            setTimeout(() => {
                window.location.href = `/pedidos/${pedido.id}`;
            }, 1500);
        }
    }
    
    function cancelarPedido() {
        // Confirma com o usuário se há itens no carrinho
        if (carrinhoAtual.length > 0) {
            if (!confirm('Tem certeza que deseja cancelar o pedido? Todos os itens serão perdidos.')) {
                return;
            }
        }
        
        // Redireciona para a página de pedidos
        window.location.href = '/pedidos';
    }
    
    // Funções utilitárias
    function formatarMoeda(valor) {
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
    }
    
    function exibirNotificacao(mensagem, tipo) {
        // Verifica se já existe uma notificação
        let notificacao = document.querySelector('.notificacao');
        
        // Se não existir, cria uma nova
        if (!notificacao) {
            notificacao = document.createElement('div');
            notificacao.className = 'notificacao';
            document.body.appendChild(notificacao);
        }
        
        // Limpa classes de tipo anteriores
        notificacao.classList.remove('success', 'warning', 'error', 'info');
        notificacao.classList.add(tipo);
        
        notificacao.innerHTML = `
            <div class="notificacao-conteudo">
                <i class="fas fa-${getTipoIcone(tipo)}"></i>
                <span>${mensagem}</span>
            </div>
            <button class="notificacao-fechar">&times;</button>
        `;
        
        // Exibe a notificação
        notificacao.classList.add('visivel');
        
        // Configura o evento para fechar
        notificacao.querySelector('.notificacao-fechar').addEventListener('click', () => {
            notificacao.classList.remove('visivel');
        });
        
        // Fecha automaticamente após 5 segundos
        setTimeout(() => {
            if (notificacao.classList.contains('visivel')) {
                notificacao.classList.remove('visivel');
            }
        }, 5000);
    }
    
    function getTipoIcone(tipo) {
        switch (tipo) {
            case 'success': return 'check-circle';
            case 'warning': return 'exclamation-triangle';
            case 'error': return 'times-circle';
            case 'info': 
            default: return 'info-circle';
        }
    }
    
    // Inicializa o aplicativo
    inicializar();
});