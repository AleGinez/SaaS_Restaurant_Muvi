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
                // Processar o HTML para extrair apenas o conteúdo necessário
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Extrair o título da página
                const pageTitle = doc.querySelector('title')?.textContent || formatPageTitle(pageName);
                
                // Para a página de pedidos, extrair o conteúdo do formulário
                let content;
                if (pageName === 'pedidos') {
                    // Preparar o container da página com breadcrumb e título
                    content = `
                        <div class="page-header">
                            <h1>Novo Pedido</h1>
                            <div class="breadcrumb">
                                <span>Home</span> / <span>Pedidos</span> / <span>Novo Pedido</span>
                            </div>
                        </div>
                        <div class="content-fade-in">
                    `;
                    
                    // Tentativa de extrair apenas o formulário de pedidos
                    const pedidoForm = doc.querySelector('.pedido-form') || 
                                      doc.querySelector('form') || 
                                      doc.querySelector('.content-area');
                    
                    if (pedidoForm) {
                        content += pedidoForm.outerHTML;
                    } else {
                        // Se não encontrar elementos específicos, use todo o body
                        content += doc.body.innerHTML;
                    }
                    
                    content += '</div>'; // Fecha o content-fade-in
                } else {
                    // Para outras páginas, prepara o container e tenta extrair o conteúdo principal
                    content = `
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
                    
                    // Se encontrar .content-area, pega apenas seu conteúdo interno, caso contrário todo o elemento
                    if (mainContent.classList && mainContent.classList.contains('content-area')) {
                        content += mainContent.innerHTML;
                    } else {
                        content += mainContent.outerHTML;
                    }
                    
                    content += '</div>'; // Fecha o content-fade-in
                }
                
                // Inserir o conteúdo na área de conteúdo
                contentArea.innerHTML = content;
                
                // Atualizar a classe active no menu
                updateActiveMenu(pageName);
                
                // Esconder indicador de carregamento
                loadingIndicator.style.display = 'none';
                
                // Inicializar scripts específicos da página, se necessário
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
        
        // Esta função contém o código existente para inicializar o formulário de pedidos
        // Seria o mesmo código que já estava em script.js para esta funcionalidade
        
        // Adicionar novo botão para enviar pedido para a cozinha se não existir
        const btnEnviarCozinha = document.getElementById('btn-enviar-cozinha');
        if (btnEnviarCozinha) {
            // Atualiza a classe para usar a cor da cozinha
            btnEnviarCozinha.classList.add('cozinha');
            
            // Atualiza o evento de clique para notificar sobre o envio para a cozinha
            btnEnviarCozinha.addEventListener('click', function() {
                // O código existente para validação pode permanecer aqui
                
                // Adiciona notificação sobre o pedido enviado à cozinha
                showNotification('Pedido enviado para a cozinha com sucesso!', 'success');
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
        // Remove qualquer notificação existente
        const existingNotification = document.querySelector('.system-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Cria o elemento de notificação
        const notification = document.createElement('div');
        notification.className = `system-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            </div>
            <div class="notification-content">
                <p>${message}</p>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // Adiciona a notificação ao DOM
        document.body.appendChild(notification);
        
        // Mostra a notificação com animação
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
    }

    // Adiciona estilos para notificações do sistema se ainda não existirem
    if (!document.getElementById('system-notification-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'system-notification-styles';
        styleSheet.textContent = `
            .system-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                display: flex;
                align-items: center;
                padding: 15px 20px;
                background-color: white;
                border-left: 4px solid var(--info-color);
                border-radius: var(--radius-sm);
                box-shadow: var(--shadow-md);
                z-index: 9999;
                transform: translateX(120%);
                transition: transform 0.3s ease;
                max-width: 400px;
            }
            
            .system-notification.show {
                transform: translateX(0);
            }
            
            .system-notification.success {
                border-left-color: var(--success-color);
            }
            
            .system-notification.error {
                border-left-color: var(--error-color);
            }
            
            .system-notification.kitchen {
                border-left-color: var(--cozinha-color);
            }
            
            .notification-icon {
                margin-right: 15px;
                font-size: 1.5rem;
                color: var(--info-color);
            }
            
            .system-notification.success .notification-icon {
                color: var(--success-color);
            }
            
            .system-notification.error .notification-icon {
                color: var(--error-color);
            }
            
            .system-notification.kitchen .notification-icon {
                color: var(--cozinha-color);
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
                font-size: 1.2rem;
                color: var(--text-secondary);
                cursor: pointer;
                margin-left: 10px;
                padding: 0 5px;
            }
            
            .notification-close:hover {
                color: var(--text-primary);
            }
            
            @media (max-width: 576px) {
                .system-notification {
                    left: 20px;
                    right: 20px;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(styleSheet);
    }
});
