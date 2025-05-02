// Script principal do MVP - Integrado com autenticação e módulo de pedidos
document.addEventListener('DOMContentLoaded', function() {
    // VERIFICAR AUTENTICAÇÃO PRIMEIRO
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Referências aos elementos DOM
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const menuItems = document.querySelectorAll('.menu-item.has-submenu');
    const notificationsBtn = document.querySelector('.notifications');
    const contentArea = document.getElementById('content-area');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // INTERCEPTADOR DE REQUISIÇÕES - Para adicionar token automaticamente
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        // Se não for requisição de autenticação
        if (!url.includes('/api/auth/login') && !url.includes('/api/auth/refresh-token')) {
            // Adicionar header de autorização
            options.headers = options.headers || {};
            
            const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
            if (token) {
                options.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        try {
            // Realizar a requisição
            const response = await originalFetch(url, options);
            
            // Se receber resposta 401 ou 403 (não autorizado/acesso negado)
            if (response.status === 401 || response.status === 403) {
                // Tentar renovar o token
                const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
                
                if (refreshToken) {
                    try {
                        const refreshResponse = await originalFetch('http://localhost:3000/api/auth/refresh-token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ refreshToken })
                        });
                        
                        const refreshData = await refreshResponse.json();
                        
                        if (refreshData.accessToken) {
                            // Atualizar o token
                            if (localStorage.getItem('accessToken')) {
                                localStorage.setItem('accessToken', refreshData.accessToken);
                            } else {
                                sessionStorage.setItem('accessToken', refreshData.accessToken);
                            }
                            
                            // Retentar a requisição original
                            options.headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
                            return originalFetch(url, options);
                        } else {
                            // Falha - fazer logout
                            doLogout();
                            throw new Error('Sessão expirada. Faça login novamente.');
                        }
                    } catch (refreshError) {
                        // Erro no refresh - fazer logout
                        doLogout();
                        throw new Error('Sessão expirada. Faça login novamente.');
                    }
                } else {
                    // Sem refresh token - fazer logout
                    doLogout();
                    throw new Error('Sessão expirada. Faça login novamente.');
                }
            }
            
            return response;
        } catch (error) {
            console.error('Erro na requisição:', error);
            throw error;
        }
    };
    
    // Função para realizar logout
    function doLogout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('tenantId');
        
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('userData');
        sessionStorage.removeItem('tenantId');
        
        window.location.href = 'login.html';
    }
    
    // PREENCHER INFORMAÇÕES DO USUÁRIO
    const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData') || '{}');
    if (userData) {
        const userNameElement = document.querySelector('.user-name');
        const userRoleElement = document.querySelector('.user-role');
        
        if (userNameElement) userNameElement.textContent = userData.nome || 'Usuário';
        if (userRoleElement) userRoleElement.textContent = userData.perfil || 'Padrão';
    }
    
    // CONFIGURAR BOTÃO DE LOGOUT
    const logoutLink = document.querySelector('a[href="#sair"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Mostrar indicador de carregamento
            if (loadingIndicator) loadingIndicator.style.display = 'flex';
            
            // Chamar API de logout
            fetch('http://localhost:3000/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(() => {
                doLogout();
            })
            .catch(error => {
                console.error('Erro ao fazer logout:', error);
                doLogout();
            })
            .finally(() => {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            });
        });
    }
    
    // Mapeamento de páginas para seus arquivos HTML (versão MVP)
    const pageMap = {
        'dashboard': 'dashboard.html',
        'pedidos': 'pedidos.html',
        'pedidos-andamento': 'pedidos-andamento.html',
        'historico-pedidos': 'historico-pedidos.html',
        'painel-cozinha': 'cozinha.html',
        'pedidos-prontos': 'pedidos-prontos.html',
        'mapa-mesas': 'mapa-mesas.html',
        'reservas': 'reservas.html',
        'gerenciar-itens': 'gerenciar-itens.html',
        'categorias': 'categorias.html',
        'perfil-restaurante': 'perfil-restaurante.html',
        'usuarios-permissoes': 'usuarios-permissoes.html'
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
    if (menuItems.length > 0) {
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
    }
    
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
            
            // Atualizar dados do usuário após restaurar o dashboard
            const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData') || '{}');
            if (userData) {
                const userNameElement = document.querySelector('.user-name');
                const userRoleElement = document.querySelector('.user-role');
                
                if (userNameElement) userNameElement.textContent = userData.nome || 'Usuário';
                if (userRoleElement) userRoleElement.textContent = userData.perfil || 'Padrão';
            }
            return;
        }
        
        // Tratamento especial para páginas de cozinha
        if (pageName === 'painel-cozinha') {
            // Abre a interface da cozinha em outra aba
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
        
        // Tratamento especial para a página de pedidos - carregar o módulo completo
        if (pageName === 'pedidos') {
            // Carrega pedidos.html e seus recursos associados
            fetch('pedidos.html')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erro HTTP: ${response.status}`);
                    }
                    return response.text();
                })
                .then(html => {
                    // Criar um parser para extrair o conteúdo relevante
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    
                    // Extrair o conteúdo da área de conteúdo
                    const pedidosContent = doc.querySelector('.content-area');
                    
                    if (pedidosContent) {
                        // Inserir o conteúdo no contentArea
                        contentArea.innerHTML = pedidosContent.innerHTML;
                        
                        // Verificar se pedidos.css já foi carregado
                        if (!document.querySelector('link[href="pedidos.css"]')) {
                            // Adicionar o CSS de pedidos
                            const linkCss = document.createElement('link');
                            linkCss.rel = 'stylesheet';
                            linkCss.href = 'pedidos.css';
                            document.head.appendChild(linkCss);
                        }
                        
                        // Verificar se pedidos.js já foi carregado
                        if (!document.querySelector('script[src="pedidos.js"]')) {
                            // Adicionar o script de pedidos
                            const scriptJs = document.createElement('script');
                            scriptJs.src = 'pedidos.js';
                            document.body.appendChild(scriptJs);
                        }
                        
                        // Atualizar o menu ativo
                        updateActiveMenu(pageName);
                        
                        // Esconder o indicador de carregamento
                        loadingIndicator.style.display = 'none';
                    } else {
                        // Fallback se não conseguir extrair o conteúdo corretamente
                        contentArea.innerHTML = `
                            <div class="page-header">
                                <h1>Pedidos</h1>
                                <div class="breadcrumb">
                                    <span>Home</span> / <span>Pedidos</span>
                                </div>
                            </div>
                            <div class="error-message">
                                <h2>Erro ao carregar módulo de pedidos</h2>
                                <p>Não foi possível carregar corretamente o módulo de pedidos.</p>
                                <button class="btn" onclick="window.location.reload()">Tentar Novamente</button>
                            </div>
                        `;
                        loadingIndicator.style.display = 'none';
                    }
                })
                .catch(error => {
                    console.error('Erro ao carregar a página de pedidos:', error);
                    contentArea.innerHTML = `
                        <div class="page-header">
                            <h1>Pedidos</h1>
                            <div class="breadcrumb">
                                <span>Home</span> / <span>Pedidos</span>
                            </div>
                        </div>
                        <div class="error-message">
                            <h2>Erro ao carregar a página</h2>
                            <p>${error.message}</p>
                            <button class="btn" onclick="window.location.reload()">Tentar Novamente</button>
                        </div>
                    `;
                    loadingIndicator.style.display = 'none';
                });
                
            // Atualizar a URL
            updateUrl(pageName);
            return;
        }
        
        // Para outras páginas, simula carregamento de página (MVP não carrega realmente arquivos HTML externos)
        setTimeout(() => {
            // Em um MVP real, aqui teríamos o código para carregar a página via fetch ou XMLHttpRequest
            // Para simplificar, apenas exibimos uma mensagem de página em construção
            
            let pageTitle = formatPageTitle(pageName);
            let pageContent = `
                <div class="page-header">
                    <h1>${pageTitle}</h1>
                    <div class="breadcrumb">
                        <span>Home</span> / <span>${pageTitle}</span>
                    </div>
                </div>
                <div class="content-fade-in">
                    <div class="card" style="padding: 30px; text-align: center;">
                        <h2 style="margin-bottom: 20px;">Página em Desenvolvimento</h2>
                        <p style="margin-bottom: 20px;">Esta funcionalidade será implementada nas próximas sprints do MVP.</p>
                        <button class="btn" onclick="history.back()">Voltar</button>
                    </div>
                </div>
            `;
            
            // Páginas específicas podem ter conteúdo especial aqui
            if (pageName === 'mapa-mesas') {
                pageContent = getMapaMesasTemplate();
            }
            
            contentArea.innerHTML = pageContent;
            updateActiveMenu(pageName);
            loadingIndicator.style.display = 'none';
            
            // Atualizar a URL
            updateUrl(pageName);
        }, 500); // Simula o tempo de carregamento
    }
    
    // Template básico para o mapa de mesas
    function getMapaMesasTemplate() {
        return `
            <div class="page-header">
                <h1>Mapa de Mesas</h1>
                <div class="breadcrumb">
                    <span>Home</span> / <span>Mesas</span> / <span>Mapa de Mesas</span>
                </div>
            </div>
            
            <div class="mapa-container">
                <div class="mesas-grid">
                    <div class="mesa livre">
                        <span class="mesa-number">01</span>
                        <span class="mesa-status">Livre</span>
                    </div>
                    
                    <div class="mesa ocupada">
                        <span class="mesa-number">02</span>
                        <span class="mesa-status">Ocupada</span>
                        <span class="mesa-info">2 pessoas</span>
                    </div>
                    
                    <div class="mesa ocupada">
                        <span class="mesa-number">03</span>
                        <span class="mesa-status">Ocupada</span>
                        <span class="mesa-info">4 pessoas</span>
                    </div>
                    
                    <div class="mesa reservada">
                        <span class="mesa-number">04</span>
                        <span class="mesa-status">Reservada</span>
                        <span class="mesa-info">19:00</span>
                    </div>
                    
                    <div class="mesa livre">
                        <span class="mesa-number">05</span>
                        <span class="mesa-status">Livre</span>
                    </div>
                    
                    <div class="mesa livre">
                        <span class="mesa-number">06</span>
                        <span class="mesa-status">Livre</span>
                    </div>
                    
                    <div class="mesa livre">
                        <span class="mesa-number">07</span>
                        <span class="mesa-status">Livre</span>
                    </div>
                    
                    <div class="mesa livre">
                        <span class="mesa-number">08</span>
                        <span class="mesa-status">Livre</span>
                    </div>
                    
                    <div class="mesa livre">
                        <span class="mesa-number">09</span>
                        <span class="mesa-status">Livre</span>
                    </div>
                    
                    <div class="mesa ocupada">
                        <span class="mesa-number">10</span>
                        <span class="mesa-status">Ocupada</span>
                        <span class="mesa-info">6 pessoas</span>
                    </div>
                    
                    <div class="mesa livre">
                        <span class="mesa-number">11</span>
                        <span class="mesa-status">Livre</span>
                    </div>
                    
                    <div class="mesa reservada">
                        <span class="mesa-number">12</span>
                        <span class="mesa-status">Reservada</span>
                        <span class="mesa-info">20:30</span>
                    </div>
                </div>
                
                <div class="mapa-acoes" style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="btn">
                        <i class="fas fa-plus"></i> Nova Mesa
                    </button>
                    <button class="btn">
                        <i class="fas fa-edit"></i> Editar Layout
                    </button>
                    <button class="btn">
                        <i class="fas fa-print"></i> Imprimir
                    </button>
                </div>
            </div>
        `;
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
    
    // Botão Novo Pedido
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
    
    // Adicione o CSS específico para submenus dinâmicos
    function addAdditionalCSS() {
        if (!document.getElementById('additional-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'additional-styles';
            styleSheet.textContent = `
                /* Estilos adicionais para o menu e submenu */
                .submenu {
                    background-color: rgba(30, 136, 229, 0.03);
                    overflow: hidden;
                    max-height: 0;
                    transition: all 0.3s ease;
                }
                
                .has-submenu.open .submenu {
                    max-height: 400px;
                    overflow-y: auto;
                }
                
                .submenu li {
                    opacity: 0;
                    transform: translateY(-10px);
                    transition: all 0.3s ease;
                    transition-delay: 0.05s;
                }
                
                .has-submenu.open .submenu li {
                    opacity: 1;
                    transform: translateY(0);
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }
    
    // Adiciona os estilos adicionais
    addAdditionalCSS();
    
    // Notificações
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
                
                // Itens de notificação de exemplo
                const notifications = [
                    { 
                        title: 'Pedido Pronto', 
                        desc: 'Pedido #1254 está pronto para servir', 
                        time: '2 min atrás', 
                        unread: true,
                        type: 'kitchen' 
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
    
    // Função para mostrar notificações
    function showNotification(message, type = 'info') {
        // Busca o container de notificações
        let container = document.querySelector('.notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
        
        // Cria o elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
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
        `;
        document.head.appendChild(styleSheet);
    }
    
    // Verifica se há parâmetros na URL para carregar a página correta
    function loadPageFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        
        if (page && pageMap[page]) {
            loadPage(page);
        }
    }
    
    // Carrega a página inicial ou a definida na URL
    loadPageFromUrl();
});