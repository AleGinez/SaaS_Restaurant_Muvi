// Documento pronto para manipulação
document.addEventListener('DOMContentLoaded', function() {
    // Referências aos elementos DOM
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const mainContent = document.querySelector('.main-content');
    const menuItems = document.querySelectorAll('.menu-item.has-submenu');
    const notificationsBtn = document.querySelector('.notifications');
    const contentArea = document.getElementById('content-area');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Mapeamento de páginas para seus arquivos HTML
    const pageMap = {
        'dashboard': 'dashboard.html',
        'pedidos': 'pedidos.html',
        'pedidos-mesa': 'pedidos-mesa.html',
        'pedidos-viagem': 'pedidos-viagem.html',
        'pedidos-delivery': 'pedidos-delivery.html',
        'pedidos-andamento': 'pedidos-andamento.html',
        'cancelar-pedidos': 'cancelar-pedidos.html',
        'historico-pedidos': 'historico-pedidos.html',
        'monitoramento-pedidos': 'monitoramento-pedidos.html',
        'fluxo-pedidos': 'fluxo-pedidos.html',
        'mapa-mesas': 'mapa-mesas.html',
        'reservas': 'reservas.html',
        'nova-reserva': 'nova-reserva.html',
        'gerenciar-reservas': 'gerenciar-reservas.html',
        'gerenciar-itens': 'gerenciar-itens.html',
        'adicionar-item': 'adicionar-item.html',
        'editar-item': 'editar-item.html',
        'categorias': 'categorias.html',
        'modificadores': 'modificadores.html',
        'cadastro-clientes': 'cadastro-clientes.html',
        'historico-cliente': 'historico-cliente.html',
        'programas-fidelidade': 'programas-fidelidade.html',
        'configurar-promocoes': 'configurar-promocoes.html',
        'controle-estoque': 'controle-estoque.html',
        'alertas-estoque': 'alertas-estoque.html',
        'fornecedores': 'fornecedores.html',
        'historico-compras': 'historico-compras.html',
        'relatorios-consumo': 'relatorios-consumo.html',
        // Novas páginas para a cozinha
        'painel-cozinha': 'cozinha.html',
        'fila-pedidos': 'fila-pedidos.html',
        'gerenciar-preparacao': 'gerenciar-preparacao.html',
        'pedidos-prontos': 'pedidos-prontos.html',
        'historico-producao': 'historico-producao.html'
    };
    
    // Histórico de navegação para controle de "voltar"
    const navigationHistory = [];
    let currentPage = 'dashboard';
    
    // Guarda o estado original do dashboard para poder retornar a ele
    const originalDashboardContent = contentArea.innerHTML;
    
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
    
    // Função para carregar uma página específica
    function loadPage(pageName) {
        // Valida se a página solicitada existe no mapeamento
        if (!pageMap[pageName]) {
            console.warn(`Página '${pageName}' não encontrada no mapeamento. Redirecionando para o dashboard.`);
            pageName = 'dashboard';
        }
        
        // Esconde mensagem de erro se estiver visível
        const errorMessage = document.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
        
        // Adiciona a página atual ao histórico de navegação
        if (currentPage !== pageName) {
            navigationHistory.push(currentPage);
            currentPage = pageName;
        }
        
        // Se for a página do dashboard, apenas restaura o conteúdo original
        if (pageName === 'dashboard') {
            contentArea.innerHTML = originalDashboardContent;
            updateActiveMenu(pageName);
            return;
        }
        
        // Tratamento especial para páginas de cozinha
        if (pageName === 'painel-cozinha') {
            // Abre a interface completa da cozinha em outra aba/janela
            window.open('cozinha.html', '_blank');
            
            // Exibe uma mensagem informativa no conteúdo principal
            contentArea.innerHTML = `
                <div class="page-header">
                    <h1>Painel da Cozinha</h1>
                    <div class="breadcrumb">
                        <span>Home</span> / <span>Cozinha</span> / <span>Painel da Cozinha</span>
                    </div>
                </div>
                <div class="card" style="padding: 30px; text-align: center;">
                    <h2 style="margin-bottom: 20px;">Interface da Cozinha aberta em nova janela</h2>
                    <p style="margin-bottom: 30px;">A interface touch da cozinha foi aberta em uma nova janela, otimizada para uso em tablets e telas touch na área de preparo de alimentos.</p>
                    <button class="btn cozinha" onclick="window.open('cozinha.html', '_blank')">
                        <i class="fas fa-external-link-alt"></i> Abrir Novamente
                    </button>
                </div>
            `;
            
            updateActiveMenu(pageName);
            return;
        }
        
        // Mostrar indicador de carregamento
        loadingIndicator.style.display = 'flex';
        
        // Obter o caminho do arquivo
        const filePath = pageMap[pageName];
        
        // Usar fetch para carregar o conteúdo da página
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                // MODIFICAÇÃO IMPORTANTE: Tratamento especial para a página de pedidos
                if (pageName === 'pedidos') {
                    // Para a página de pedidos, carrega o conteúdo direto no contentArea
                    // Isso garante que os estilos CSS sejam aplicados corretamente
                    
                    // Primeiro, verifica se há um elemento content-area no HTML carregado
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // Prepara o container da página com breadcrumb e título
                    let pageContent = `
                        <div class="page-header">
                            <h1>Novo Pedido</h1>
                            <div class="breadcrumb">
                                <span>Home</span> / <span>Pedidos</span> / <span>Novo Pedido</span>
                            </div>
                        </div>
                    `;
                    
                    // Adiciona o conteúdo principal da página, mantendo a estrutura correta
                    const mainContent = doc.querySelector('.content-area') || 
                                       doc.querySelector('.pedido-container');
                    
                    if (mainContent) {
                        pageContent += mainContent.outerHTML;
                    } else {
                        // Se não encontrar os elementos específicos, usar a estrutura do body,
                        // mas pular o head, scripts e elementos META
                        pageContent += doc.body.innerHTML;
                    }
                    
                    // Insere o conteúdo na área de conteúdo
                    contentArea.innerHTML = pageContent;
                } else {
                    // Para outras páginas, processar o HTML normalmente
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // Extrair o título da página
                    const pageTitle = doc.querySelector('title')?.textContent || formatPageTitle(pageName);
                    
                    // Preparar o container da página com breadcrumb e título
                    let content = `
                        <div class="page-header">
                            <h1>${pageTitle}</h1>
                            <div class="breadcrumb">
                                <span>Home</span> / <span>${formatPageTitle(pageName)}</span>
                            </div>
                        </div>
                        <div class="content-fade-in">
                    `;
                    
                    const mainContent = doc.querySelector('.content-area') || 
                                      doc.querySelector('main') || 
                                      doc.body;
                    
                    // Se encontrar .content-area, pega apenas seu conteúdo interno
                    if (mainContent.classList && mainContent.classList.contains('content-area')) {
                        content += mainContent.innerHTML;
                    } else {
                        content += mainContent.innerHTML;
                    }
                    
                    content += '</div>'; // Fecha o content-fade-in
                    
                    // Inserir o conteúdo na área de conteúdo
                    contentArea.innerHTML = content;
                }
                
                // Atualizar a classe active no menu
                updateActiveMenu(pageName);
                
                // Esconder indicador de carregamento
                loadingIndicator.style.display = 'none';
                
                // Inicializar scripts específicos da página
                initPageScripts(pageName);
                
                // Atualizar a URL com parâmetro de página
                updateUrl(pageName);
                
                // Rolar para o topo da página
                window.scrollTo(0, 0);
            })
            .catch(error => {
                console.error('Erro ao carregar a página:', error);
                contentArea.innerHTML = `
                    <div class="error-message">
                        <h2>Erro ao carregar a página</h2>
                        <p>${error.message}</p>
                        <button class="btn" onclick="window.location.reload()">Tentar Novamente</button>
                    </div>
                `;
                loadingIndicator.style.display = 'none';
            });
    }
    
    // Formata o ID da página para um título legível
    function formatPageTitle(pageId) {
        // Converte hífens em espaços
        const title = pageId.replace(/-/g, ' ');
        // Capitaliza a primeira letra de cada palavra
        return title.split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }
    
    // Atualiza a classe active no menu
    function updateActiveMenu(pageName) {
        // Remove a classe active de todos os itens de menu e submenu
        document.querySelectorAll('.menu-item, .submenu li').forEach(item => {
            item.classList.remove('active');
        });
        
        // Adiciona a classe active ao item correspondente
        const menuItem = document.querySelector(`.menu-item a[data-page="${pageName}"]`);
        if (menuItem) {
            const parentItem = menuItem.closest('.menu-item');
            parentItem.classList.add('active');
            
            // Se for um item de submenu, também marca o li como active
            const subMenuItem = menuItem.closest('.submenu li');
            if (subMenuItem) {
                subMenuItem.classList.add('active');
                
                // Certifica-se de que o submenu está aberto
                const hasSubmenu = parentItem.classList.contains('has-submenu');
                if (hasSubmenu) {
                    parentItem.classList.add('open');
                }
            }
        }
    }
    
    // Inicializa scripts específicos para cada página
    function initPageScripts(pageName) {
        if (pageName === 'pedidos') {
            // Inicializa o formulário de pedidos
            initPedidosForm();
        } else if (pageName === 'mapa-mesas') {
            // Inicializa o mapa de mesas
            initMapaMesas();
        } else if (pageName.includes('cozinha') || pageName.includes('pedidos-prontos')) {
            // Inicializa funcionalidades específicas da cozinha
            initCozinhaInterface();
        }
    }
    
    // Atualiza a URL com parâmetro de página
    function updateUrl(pageName) {
        const url = new URL(window.location);
        url.searchParams.set('page', pageName);
        window.history.pushState({}, '', url);
    }
    
    // Tratamento para links com data-page
    document.addEventListener('click', function(e) {
        // Busca o elemento clicado ou seu ancestral que tenha o atributo data-page
        const pageLink = e.target.closest('[data-page]');
        
        if (pageLink) {
            e.preventDefault(); // Impede a navegação padrão
            
            const pageName = pageLink.getAttribute('data-page');
            loadPage(pageName);
            
            // Fecha o menu em dispositivos móveis
            if (window.innerWidth < 992) {
                sidebar.classList.remove('open');
                const overlay = document.querySelector('.sidebar-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
        }
    });
    
    // Tratamento especial para o botão Novo Pedido
    const novoPedidoBtn = document.getElementById('novo-pedido-btn');
    if (novoPedidoBtn) {
        novoPedidoBtn.addEventListener('click', function() {
            loadPage('pedidos');
        });
    }
    
    // Lidar com o botão voltar do navegador
    window.addEventListener('popstate', function(e) {
        // Obter o parâmetro da URL
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page') || 'dashboard';
        
        // Carregar a página da URL atual
        loadPage(page);
    });
    
    // Receber parâmetros da URL para carregamento direto de página
    function loadPageFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        
        if (page && pageMap[page]) {
            loadPage(page);
        }
    }
    
    // Carregar página da URL ao iniciar
    loadPageFromUrl();
    
    // Tratamento para Notificações
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Verifica se o dropdown já existe
            let dropdown = document.querySelector('.notifications-dropdown');
            
            if (dropdown) {
                // Se existe, remove (toggle)
                dropdown.remove();
            } else {
                // Cria dropdown
                dropdown = document.createElement('div');
                dropdown.className = 'notifications-dropdown';
                
                // Adiciona cabeçalho
                const header = document.createElement('div');
                header.className = 'dropdown-header';
                header.innerHTML = '<h4>Notificações</h4><button class="clear-all">Limpar</button>';
                dropdown.appendChild(header);
                
                // Conteúdo de exemplo
                const content = document.createElement('div');
                content.className = 'dropdown-content';
                
                // Itens de notificação de exemplo com uma nova notificação da cozinha
                const notifications = [
                    { 
                        title: 'Pedido Pronto', 
                        desc: 'Pedido #1254 está pronto para servir', 
                        time: '2 min atrás', 
                        unread: true,
                        type: 'kitchen' 
                    },
                    { 
                        title: 'Estoque Baixo', 
                        desc: 'Cerveja Pilsen está acabando', 
                        time: '5 min atrás', 
                        unread: true 
                    },
                    { 
                        title: 'Nova Reserva', 
                        desc: 'Mesa 08 reservada para 20:00', 
                        time: '15 min atrás', 
                        unread: true 
                    },
                    { 
                        title: 'Conta Fechada', 
                        desc: 'Mesa 03 concluiu pagamento', 
                        time: '1 hora atrás', 
                        unread: false 
                    }
                ];
                
                notifications.forEach(notification => {
                    const item = document.createElement('div');
                    item.className = 'notification-item';
                    if (notification.unread) {
                        item.classList.add('unread');
                    }
                    if (notification.type === 'kitchen') {
                        item.classList.add('kitchen');
                    }
                    
                    item.innerHTML = `
                        <div class="notification-content">
                            <h5>${notification.title}</h5>
                            <p>${notification.desc}</p>
                            <span class="time">${notification.time}</span>
                        </div>
                        <button class="mark-read"><i class="fas fa-check"></i></button>
                    `;
                    
                    // Adiciona evento para notificações da cozinha
                    if (notification.type === 'kitchen') {
                        item.addEventListener('click', function(e) {
                            if (!e.target.classList.contains('mark-read') && 
                                !e.target.closest('.mark-read')) {
                                loadPage('pedidos-prontos');
                                dropdown.remove();
                            }
                        });
                    }
                    
                    content.appendChild(item);
                });
                
                dropdown.appendChild(content);
                
                // Adiciona footer
                const footer = document.createElement('div');
                footer.className = 'dropdown-footer';
                footer.innerHTML = '<a href="#todas-notificacoes">Ver todas</a>';
                dropdown.appendChild(footer);
                
                // Posiciona e adiciona ao DOM
                dropdown.style.position = 'absolute';
                dropdown.style.top = '60px';
                dropdown.style.right = '20px';
                
                document.body.appendChild(dropdown);
                
                // Eventos para botões dentro do dropdown
                const clearAllBtn = dropdown.querySelector('.clear-all');
                clearAllBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    // Remove todos os itens de notificação
                    dropdown.querySelectorAll('.notification-item').forEach(item => {
                        item.remove();
                    });
                    
                    // Atualiza o badge de notificação
                    const badge = document.querySelector('.notifications .badge');
                    if (badge) {
                        badge.textContent = '0';
                    }
                });
                
                // Evento para marcar notificação como lida
                const markReadBtns = dropdown.querySelectorAll('.mark-read');
                markReadBtns.forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        const item = this.closest('.notification-item');
                        item.classList.remove('unread');
                        
                        // Atualiza o badge (exemplo)
                        const badge = document.querySelector('.notifications .badge');
                        if (badge) {
                            let count = parseInt(badge.textContent) - 1;
                            count = count < 0 ? 0 : count;
                            badge.textContent = count;
                        }
                    });
                });
                
                // Fecha dropdown ao clicar fora
                document.addEventListener('click', function closeDropdown(e) {
                    if (!dropdown.contains(e.target) && e.target !== notificationsBtn) {
                        dropdown.remove();
                        document.removeEventListener('click', closeDropdown);
                    }
                });
            }
        });
    }
    
    // Inicialização de funcionalidades para a interface da cozinha
    function initCozinhaInterface() {
        console.log('Inicializando funcionalidades de cozinha...');
        
        // Aqui seriam adicionadas funcionalidades específicas para as páginas da cozinha
        // que são exibidas dentro do sistema principal, não na interface separada
        
        // Exemplo: adicionar um card resumo da cozinha, se estiver na página certa
        const summaryCards = document.querySelector('.summary-cards');
        if (summaryCards) {
            // Adiciona um card de resumo da cozinha ao dashboard se não existir
            if (!document.querySelector('.card.cozinha')) {
                const cozinhaCard = document.createElement('div');
                cozinhaCard.className = 'card cozinha';
                cozinhaCard.innerHTML = `
                    <div class="card-icon">
                        <i class="fas fa-fire"></i>
                    </div>
                    <div class="card-info">
                        <h3>Cozinha</h3>
                        <div class="card-numbers">
                            <span class="number">5</span>
                            <span class="status">pedidos em preparo</span>
                        </div>
                    </div>
                `;
                
                summaryCards.appendChild(cozinhaCard);
                
                // Adiciona evento de clique para ir para o painel da cozinha
                cozinhaCard.addEventListener('click', function() {
                    loadPage('painel-cozinha');
                });
            }
        }
        
        // Atualiza a interface para outras páginas relacionadas à cozinha
        if (currentPage === 'fila-pedidos') {
            // Código específico para a fila de pedidos
        } else if (currentPage === 'pedidos-prontos') {
            // Código específico para a página de pedidos prontos
        }
    }

    // ===========================================
    // FUNÇÕES PARA O FORMULÁRIO DE PEDIDOS
    // ===========================================
    
    // Inicializa o formulário de pedidos
    function initPedidosForm() {
        console.log('Inicializando formulário de pedidos...');
        
        // MELHORADO: Implementa a funcionalidade de abas para o tipo de pedido
        const pedidoTabs = document.querySelectorAll('.pedido-tab');
        const tabContents = document.querySelectorAll('.pedido-tab-content');
        
        if (pedidoTabs.length > 0) {
            pedidoTabs.forEach(tab => {
                tab.addEventListener('click', function() {
                    const tabId = this.getAttribute('data-tab');
                    
                    // Remove classe ativa de todas as tabs
                    pedidoTabs.forEach(t => t.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));
                    
                    // Adiciona classe ativa à tab e conteúdo selecionados
                    this.classList.add('active');
                    document.getElementById(tabId)?.classList.add('active');
                    
                    // Atualiza o tipo de pedido no select se existir
                    const pedidoTipo = document.getElementById('pedido-tipo');
                    if (pedidoTipo) {
                        if (tabId === 'tab-mesas') {
                            pedidoTipo.value = 'mesa';
                        } else if (tabId === 'tab-viagem') {
                            pedidoTipo.value = 'viagem';
                        } else if (tabId === 'tab-delivery') {
                            pedidoTipo.value = 'delivery';
                        }
                    }
                });
            });
        }
        
        // MELHORADO: Inicializa configuração das mesas
        const mesaItems = document.querySelectorAll('.mesa-item');
        if (mesaItems.length > 0) {
            mesaItems.forEach(mesa => {
                mesa.addEventListener('click', function() {
                    // Não permite selecionar mesas ocupadas ou reservadas
                    if (this.classList.contains('ocupada') || this.classList.contains('reservada')) {
                        showNotification('Esta mesa não está disponível', 'error');
                        return;
                    }
                    
                    // Remove seleção anterior
                    mesaItems.forEach(m => m.classList.remove('selected'));
                    
                    // Seleciona a mesa clicada
                    this.classList.add('selected');
                    
                    // Mostra notificação
                    const mesaNumero = this.querySelector('.mesa-numero').textContent;
                    showNotification(`Mesa ${mesaNumero} selecionada`, 'success');
                });
            });
        }
        
        // MELHORADO: Inicializa filtros de categoria
        const categoriaBtns = document.querySelectorAll('.categoria-btn');
        const produtoCards = document.querySelectorAll('.produto-card');
        
        if (categoriaBtns.length > 0) {
            categoriaBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    // Remove classe ativa
                    categoriaBtns.forEach(b => b.classList.remove('active'));
                    
                    // Adiciona classe ativa
                    this.classList.add('active');
                    
                    // Filtra produtos
                    const categoria = this.getAttribute('data-categoria');
                    
                    produtoCards.forEach(card => {
                        if (categoria === 'todos') {
                            card.style.display = 'flex';
                        } else {
                            const categoriaProduto = card.getAttribute('data-categoria') || '';
                            if (categoriaProduto.includes(categoria)) {
                                card.style.display = 'flex';
                            } else {
                                card.style.display = 'none';
                            }
                        }
                    });
                });
            });
        }
        
        // MELHORADO: Inicializa busca de produtos
        const btnBuscarProduto = document.getElementById('btn-buscar-produto');
        const produtoBusca = document.getElementById('produto-busca');
        
        if (btnBuscarProduto && produtoBusca) {
            btnBuscarProduto.addEventListener('click', function() {
                const termo = produtoBusca.value.trim().toLowerCase();
                if (!termo) {
                    // Restaura visualização
                    produtoCards.forEach(card => card.style.display = 'flex');
                    document.querySelector('.categoria-btn[data-categoria="todos"]')?.classList.add('active');
                    return;
                }
                
                // Remove classe ativa dos filtros
                categoriaBtns.forEach(b => b.classList.remove('active'));
                
                // Busca produtos
                let encontrado = false;
                produtoCards.forEach(card => {
                    const nome = card.getAttribute('data-nome')?.toLowerCase() || '';
                    if (nome.includes(termo)) {
                        card.style.display = 'flex';
                        encontrado = true;
                    } else {
                        card.style.display = 'none';
                    }
                });
                
                // Notificação se não encontrou
                if (!encontrado) {
                    showNotification('Nenhum produto encontrado', 'info');
                }
            });
            
            // Tecla Enter no campo de busca
            produtoBusca.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    btnBuscarProduto.click();
                }
            });
        }
        
        // MELHORADO: Inicializa cards de produtos
        if (produtoCards.length > 0) {
            produtoCards.forEach(card => {
                card.addEventListener('click', function() {
                    // Abre o modal do produto
                    const id = this.getAttribute('data-id');
                    const nome = this.getAttribute('data-nome');
                    const preco = this.getAttribute('data-preco');
                    
                    // Referência ao modal
                    const modalProduto = document.getElementById('modal-produto');
                    if (modalProduto) {
                        // Preenche dados no modal
                        document.getElementById('modal-produto-nome').value = nome;
                        document.getElementById('modal-produto-preco').value = `R$ ${parseFloat(preco).toFixed(2).replace('.', ',')}`;
                        
                        // Exibe o modal
                        modalProduto.style.display = 'flex';
                        
                        // Guarda o produto atual em variável global temporária
                        window.produtoAtual = { id, nome, preco };
                    }
                });
            });
        }
        
        // MELHORADO: Inicializa botões para fechar modais
        const modalCloseBtns = document.querySelectorAll('.modal-close, .modal-close-btn');
        if (modalCloseBtns.length > 0) {
            modalCloseBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const modal = this.closest('.modal-container');
                    if (modal) {
                        modal.style.display = 'none';
                    }
                });
            });
        }
        
        // MELHORADO: Inicializa o botão de adicionar produto no modal
        const btnModalProdutoAdicionar = document.getElementById('modal-produto-adicionar');
        if (btnModalProdutoAdicionar) {
            btnModalProdutoAdicionar.addEventListener('click', function() {
                if (!window.produtoAtual) return;
                
                const modalProduto = document.getElementById('modal-produto');
                const quantidadeEl = document.getElementById('modal-produto-quantidade');
                const observacaoEl = document.getElementById('modal-produto-observacao');
                
                if (!quantidadeEl || !observacaoEl) return;
                
                const quantidade = parseInt(quantidadeEl.value) || 1;
                const observacao = observacaoEl.value.trim();
                
                // Adiciona o item no pedido - esta função deve ser implementada no arquivo pedidos.js
                // Aqui apenas simulamos o comportamento
                
                // Fecha o modal
                if (modalProduto) {
                    modalProduto.style.display = 'none';
                }
                
                // Exibe notificação
                showNotification(`${window.produtoAtual.nome} adicionado ao pedido`, 'success');
            });
        }
        
        // Adiciona um evento de limpar pedido
        const btnLimparPedido = document.getElementById('btn-limpar-pedido');
        if (btnLimparPedido) {
            btnLimparPedido.addEventListener('click', function() {
                if (confirm('Deseja realmente limpar todos os itens do pedido?')) {
                    // Limpar itens - implementado no pedidos.js
                    const pedidoItems = document.querySelector('.pedido-items');
                    if (pedidoItems) {
                        pedidoItems.innerHTML = `
                            <div class="no-items">
                                <i class="fas fa-shopping-cart"></i>
                                <p>Nenhum item adicionado ao pedido</p>
                                <p>Selecione produtos da lista para adicionar</p>
                            </div>
                        `;
                    }
                    
                    showNotification('Pedido limpo com sucesso', 'success');
                }
            });
        }
        
        // MELHORADO: Botão enviar para cozinha
        const btnEnviarCozinha = document.getElementById('btn-enviar-cozinha');
        if (btnEnviarCozinha) {
            btnEnviarCozinha.classList.add('btn-cozinha');
            
            btnEnviarCozinha.addEventListener('click', function() {
                // Verifica se tem itens no pedido
                const pedidoItems = document.querySelector('.pedido-items');
                if (pedidoItems && !pedidoItems.querySelector('.no-items')) {
                    // Enviar para cozinha - simulação
                    showNotification('Pedido enviado para a cozinha!', 'success');
                } else {
                    showNotification('Adicione itens ao pedido primeiro', 'error');
                }
            });
        }
        
        // MELHORADO: Botão finalizar pedido
        const btnFinalizar = document.getElementById('btn-finalizar');
        if (btnFinalizar) {
            btnFinalizar.addEventListener('click', function() {
                // Verifica se tem itens no pedido
                const pedidoItems = document.querySelector('.pedido-items');
                if (pedidoItems && !pedidoItems.querySelector('.no-items')) {
                    // Finalizar pedido - simulação
                    showNotification('Pedido finalizado com sucesso!', 'success');
                    
                    setTimeout(() => {
                        if (confirm('Deseja iniciar um novo pedido?')) {
                            // Limpar formulário para novo pedido
                            // Implementação completa em pedidos.js
                            
                            // Simula limpeza básica
                            if (pedidoItems) {
                                pedidoItems.innerHTML = `
                                    <div class="no-items">
                                        <i class="fas fa-shopping-cart"></i>
                                        <p>Nenhum item adicionado ao pedido</p>
                                        <p>Selecione produtos da lista para adicionar</p>
                                    </div>
                                `;
                            }
                        }
                    }, 1500);
                } else {
                    showNotification('Adicione itens ao pedido primeiro', 'error');
                }
            });
        }
    }
    
    // Inicializa o mapa de mesas
    function initMapaMesas() {
        console.log('Inicializando mapa de mesas...');
        // Implementar funcionalidades específicas para o mapa de mesas
    }
    
    // Função para mostrar notificações
    function showNotification(message, type = 'info') {
        // Busca o container de notificações
        let container = document.querySelector('.notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications-container';
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }
        
        // Cria o elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            </div>
            <div class="notification-content">
                <p>${message}</p>
            </div>
            <button class="notification-close" aria-label="Fechar notificação">&times;</button>
        `;
        
        // Adiciona a notificação ao DOM
        container.appendChild(notification);
        
        // Adiciona a classe 'show' após um pequeno delay para ativar a animação
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Configura o evento de fechar
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            });
        }
        
        // Remove a notificação após alguns segundos
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
        
        return notification;
    }
    
    // Adiciona estilos para notificações se não existirem
    if (!document.getElementById('notification-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'notification-styles';
        styleSheet.textContent = `
            .notification {
                background-color: var(--bg-white);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-md);
                padding: 15px;
                margin-bottom: 10px;
                display: flex;
                align-items: flex-start;
                transform: translateX(120%);
                transition: transform 0.3s ease;
                max-width: 320px;
                position: relative;
                border-left: 4px solid var(--info-color);
            }
            
            .notification.show {
                transform: translateX(0);
            }
            
            .notification.success {
                border-left-color: var(--success-color);
            }
            
            .notification.success .notification-icon {
                color: var(--success-color);
            }
            
            .notification.error {
                border-left-color: var(--error-color);
            }
            
            .notification.error .notification-icon {
                color: var(--error-color);
            }
            
            .notification-icon {
                margin-right: 12px;
                font-size: 1.2rem;
                color: var(--info-color);
            }
            
            .notification-content {
                flex: 1;
            }
            
            .notification-content p {
                margin: 0;
                font-size: 0.9rem;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: var(--text-secondary);
                font-size: 1.2rem;
                cursor: pointer;
                margin-left: 10px;
                padding: 0;
            }
            
            .notifications-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
            }
            
            @media (max-width: 576px) {
                .notifications-container {
                    width: calc(100% - 40px);
                }
                
                .notification {
                    max-width: 100%;
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }
});