// Documento pronto para manipulação
document.addEventListener('DOMContentLoaded', function() {
    // Referências aos elementos DOM
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle');
    const mainContent = document.querySelector('.main-content');
    const menuItems = document.querySelectorAll('.menu-item.has-submenu');
    const notificationsBtn = document.querySelector('.notifications');
    const quickActionBtn = document.querySelector('.action-btn');
    const mesaElements = document.querySelectorAll('.mesa');
    const dataTableRows = document.querySelectorAll('.data-table tbody tr');
    const buyButtons = document.querySelectorAll('.btn-small');
    
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
    
// Submenu item click handling
const submenuItems = document.querySelectorAll('.submenu a');
submenuItems.forEach(subItem => {
    subItem.addEventListener('click', function(e) {
        // Se o item clicado for "Novos Pedidos", permitir navegação normal
        if (this.getAttribute('href') === 'pedidos.html') {
            return; // Permite a navegação padrão para href="pedidos.html"
        }
        
        // Para outros itens, previna o comportamento padrão
        e.preventDefault();
        
        // Remove a classe active de todos os itens de menu
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Adiciona a classe active ao item pai
        const parentItem = this.closest('.menu-item');
        if (parentItem) {
            parentItem.classList.add('active');
        }
        
        // Simula a mudança de página
        simulatePage(this.getAttribute('href'));
        
        // Fecha o menu em dispositivos móveis
        if (window.innerWidth < 992) {
            sidebar.classList.remove('open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    });
});
    
    // Simulação de mudança de página (para demonstração)
    function simulatePage(pageId) {
        // Remove # do início do ID
        pageId = pageId.substring(1);
        
        // Atualiza o título da página
        const pageHeader = document.querySelector('.page-header h1');
        if (pageHeader) {
            pageHeader.textContent = formatPageTitle(pageId);
        }
        
        // Atualiza o breadcrumb
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = `<span>Home</span> / <span>${formatPageTitle(pageId)}</span>`;
        }
        
        // Em uma aplicação real, aqui você carregaria o conteúdo da página
        console.log(`Navegando para a página: ${pageId}`);
    }
    
    // Formata o ID da página para um título legível
    function formatPageTitle(pageId) {
        // Substitui hífens por espaços
        const title = pageId.replace(/-/g, ' ');
        // Capitaliza a primeira letra de cada palavra
        return title.split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }
    
    // Interação com mesas
    mesaElements.forEach(mesa => {
        mesa.addEventListener('click', function() {
            const mesaNumber = this.querySelector('.mesa-number').textContent;
            const mesaStatus = this.querySelector('.mesa-status').textContent;
            
            // Modal de visualização ou ação
            showMesaModal(mesaNumber, mesaStatus, this);
        });
    });
    
    // Mostra modal de mesa
    function showMesaModal(number, status, mesaElement) {
        // Cria um modal simples para demonstração
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = `<h3>Mesa ${number}</h3><button class="modal-close">&times;</button>`;
        
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        
        // Conteúdo diferente baseado no status da mesa
        if (status.toLowerCase() === 'livre') {
            modalBody.innerHTML = `
                <p>Esta mesa está disponível.</p>
                <div class="modal-actions">
                    <button class="btn ocupar-mesa">Ocupar Mesa</button>
                    <button class="btn reservar-mesa">Reservar Mesa</button>
                </div>
            `;
        } else if (status.toLowerCase() === 'ocupada') {
            modalBody.innerHTML = `
                <p>Esta mesa está ocupada.</p>
                <div class="modal-actions">
                    <button class="btn novo-pedido">Novo Pedido</button>
                    <button class="btn ver-pedidos">Ver Pedidos</button>
                    <button class="btn fechar-conta">Fechar Conta</button>
                </div>
            `;
        } else if (status.toLowerCase() === 'reservada') {
            modalBody.innerHTML = `
                <p>Esta mesa está reservada.</p>
                <div class="modal-actions">
                    <button class="btn confirmar-reserva">Confirmar Chegada</button>
                    <button class="btn cancelar-reserva">Cancelar Reserva</button>
                </div>
            `;
        }
        
        modal.appendChild(modalHeader);
        modal.appendChild(modalBody);
        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);
        
        // Evento para fechar modal
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', function() {
            modalOverlay.remove();
        });
        
        // Fecha modal ao clicar fora
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        });
        
        // Eventos dos botões do modal
        const buttons = modal.querySelectorAll('.modal-actions button');
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                // Ações com base no botão clicado
                const action = this.className.replace('btn', '').trim();
                handleMesaAction(number, action, mesaElement);
                modalOverlay.remove();
            });
        });
    }
    
    // Lidar com ações da mesa
    function handleMesaAction(mesaNumber, action, mesaElement) {
        console.log(`Ação "${action}" para Mesa ${mesaNumber}`);
        
        // Simulação de mudanças de estado para demonstração
        switch (action) {
            case 'ocupar-mesa':
                mesaElement.classList.remove('livre');
                mesaElement.classList.add('ocupada');
                mesaElement.querySelector('.mesa-status').textContent = 'Ocupada';
                
                // Adiciona info de pessoas se não existir
                let mesaInfo = mesaElement.querySelector('.mesa-info');
                if (!mesaInfo) {
                    mesaInfo = document.createElement('span');
                    mesaInfo.className = 'mesa-info';
                    mesaElement.appendChild(mesaInfo);
                }
                mesaInfo.textContent = '2 pessoas';
                break;
                
            case 'reservar-mesa':
                mesaElement.classList.remove('livre');
                mesaElement.classList.add('reservada');
                mesaElement.querySelector('.mesa-status').textContent = 'Reservada';
                
                // Adiciona horário se não existir
                mesaInfo = mesaElement.querySelector('.mesa-info');
                if (!mesaInfo) {
                    mesaInfo = document.createElement('span');
                    mesaInfo.className = 'mesa-info';
                    mesaElement.appendChild(mesaInfo);
                }
                mesaInfo.textContent = '19:00';
                break;
                
            case 'fechar-conta':
                mesaElement.classList.remove('ocupada');
                mesaElement.classList.add('livre');
                mesaElement.querySelector('.mesa-status').textContent = 'Livre';
                
                // Remove info de pessoas
                const mesaInfoFechar = mesaElement.querySelector('.mesa-info');
                if (mesaInfoFechar) {
                    mesaInfoFechar.remove();
                }
                break;
                
            case 'confirmar-reserva':
                mesaElement.classList.remove('reservada');
                mesaElement.classList.add('ocupada');
                mesaElement.querySelector('.mesa-status').textContent = 'Ocupada';
                mesaElement.querySelector('.mesa-info').textContent = '2 pessoas';
                break;
                
            case 'cancelar-reserva':
                mesaElement.classList.remove('reservada');
                mesaElement.classList.add('livre');
                mesaElement.querySelector('.mesa-status').textContent = 'Livre';
                
                // Remove info de horário
                const reservaInfo = mesaElement.querySelector('.mesa-info');
                if (reservaInfo) {
                    reservaInfo.remove();
                }
                break;
        }
    }
    
    // Interação com linhas da tabela
    dataTableRows.forEach(row => {
        row.addEventListener('click', function(e) {
            // Evita ativar quando clica nos botões
            if (e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'i') {
                return;
            }
            
            const pedidoId = this.cells[0].textContent;
            const mesa = this.cells[1].textContent;
            const status = this.querySelector('.status').textContent;
            
            console.log(`Visualizando pedido ${pedidoId} da mesa ${mesa} (${status})`);
            // Aqui você poderia abrir um modal com detalhes do pedido
        });
        
        // Manipuladores para botões de ação dentro da tabela
        const actionButtons = row.querySelectorAll('.action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', function() {
                const pedidoId = this.closest('tr').cells[0].textContent;
                const action = this.querySelector('i').className.includes('eye') ? 'visualizar' : 'editar';
                
                console.log(`Ação: ${action} pedido ${pedidoId}`);
                // Implementar visualização ou edição do pedido
            });
        });
    });
    
    // Interação com os botões de compra nos alertas de estoque
    buyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const produto = this.closest('.alerta-card').querySelector('h4').textContent;
            console.log(`Iniciando compra de: ${produto}`);
            
            // Simulação de interação
            const card = this.closest('.alerta-card');
            this.textContent = 'Processando...';
            
            // Simula processamento
            setTimeout(() => {
                card.style.opacity = '0.5';
                this.textContent = 'Solicitado';
                this.disabled = true;
            }, 1000);
        });
    });
    
    // Notificações dropdown
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
                    { title: 'Estoque Baixo', desc: 'Cerveja Pilsen está acabando', time: '5 min atrás', unread: true },
                    { title: 'Nova Reserva', desc: 'Mesa 08 reservada para 20:00', time: '15 min atrás', unread: true },
                    { title: 'Conta Fechada', desc: 'Mesa 03 concluiu pagamento', time: '1 hora atrás', unread: false }
                ];
                
                notifications.forEach(notification => {
                    const item = document.createElement('div');
                    item.className = 'notification-item';
                    if (notification.unread) {
                        item.classList.add('unread');
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
    
    // Botão de ação rápida (novo pedido)
// Botão de ação rápida (novo pedido)
if (quickActionBtn) {
    quickActionBtn.addEventListener('click', function() {
        window.location.href = 'pedidos.html';
    });
}
    
    // Adiciona estilos CSS necessários para o JavaScript
    addDynamicStyles();
    
    // Ajustes adicionais para o novo menu
    function ajustarMenuAtualizado() {
        // Verificar altura dos submenus e ajustar max-height dinamicamente se necessário
        const submenus = document.querySelectorAll('.submenu');
        submenus.forEach(submenu => {
            const items = submenu.querySelectorAll('a');
            // Se tiver mais de 5 itens, podemos adicionar uma classe especial
            if (items.length > 5) {
                submenu.closest('.menu-item').classList.add('has-large-submenu');
            }
        });

        // Melhorar experiência de navegação entre seções
        const mainMenuItems = document.querySelectorAll('.main-menu > ul > li > a');
        mainMenuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // Não prevenimos o comportamento padrão aqui para preservar
                // a navegação se o usuário clicar exatamente no link principal
                
                // Podemos destacar visualmente a seção ativa 
                mainMenuItems.forEach(otherItem => {
                    otherItem.parentElement.classList.remove('highlighted-section');
                });
                
                this.parentElement.classList.add('highlighted-section');
            });
        });
        
        // Ajustar comportamento para direcionar ao primeiro submenu quando clicar no item principal
        const menuItemsWithSubmenu = document.querySelectorAll('.menu-item.has-submenu');
        menuItemsWithSubmenu.forEach(menuItem => {
            menuItem.addEventListener('click', function(e) {
                // Se o clique for exatamente no link principal (não no ícone de seta)
                if (e.target === menuItem.querySelector('a') && menuItem.classList.contains('open')) {
                    // Redirecionar para o primeiro item do submenu
                    const firstSubmenuItem = menuItem.querySelector('.submenu a');
                    if (firstSubmenuItem) {
                        // Simular clique no primeiro item do submenu
                        simulatePage(firstSubmenuItem.getAttribute('href'));
                    }
                }
            });
        });
    }

    // Chamar a função ao final do carregamento
    ajustarMenuAtualizado();
});

// Adiciona estilos CSS para elementos criados dinamicamente pelo JavaScript
function addDynamicStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        .sidebar-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.4);
            z-index: 9;
        }
        
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .modal {
            background-color: #fff;
            border-radius: 8px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        .modal-header {
            padding: 16px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 1.25rem;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #757575;
        }
        
        .modal-body {
            padding: 16px;
        }
        
        .modal-actions {
            display: flex;
            gap: 8px;
            margin-top: 16px;
            flex-wrap: wrap;
        }
        
        .notifications-dropdown {
            background-color: #fff;
            border-radius: 8px;
            width: 320px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
            z-index: 100;
            overflow: hidden;
            animation: fadeIn 0.2s ease-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .dropdown-header {
            padding: 12px 16px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .dropdown-header h4 {
            margin: 0;
            font-size: 1rem;
        }
        
        .dropdown-content {
            max-height: 320px;
            overflow-y: auto;
        }
        
        .notification-item {
            padding: 12px 16px;
            border-bottom: 1px solid #f5f5f5;
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .notification-item:hover {
            background-color: #f9f9f9;
        }
        
        .notification-item.unread {
            background-color: #e3f2fd;
        }
        
        .notification-item.unread:hover {
            background-color: #bbdefb;
        }
        
        .notification-content {
            flex: 1;
        }
        
        .notification-content h5 {
            margin: 0 0 4px 0;
            font-size: 0.9rem;
        }
        
        .notification-content p {
            margin: 0 0 4px 0;
            font-size: 0.8rem;
            color: #757575;
        }
        
        .notification-content .time {
            font-size: 0.75rem;
            color: #9e9e9e;
        }
        
        .mark-read {
            background: none;
            border: none;
            color: #1e88e5;
            cursor: pointer;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
        }
        
        .mark-read:hover {
            background-color: rgba(30, 136, 229, 0.1);
        }
        
        .dropdown-footer {
            padding: 8px 16px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
        }
        
        .dropdown-footer a {
            color: #1e88e5;
            font-size: 0.9rem;
            text-decoration: none;
        }
        
        .clear-all {
            background: none;
            border: none;
            color: #f44336;
            font-size: 0.8rem;
            cursor: pointer;
        }
        
        /* Ajustes para mobile */
        @media (max-width: 576px) {
            .modal {
                width: 95%;
            }
            
            .notifications-dropdown {
                width: 290px;
                right: 10px !important;
            }
        }
        
        /* Animação para indicar que um menu tem submenu */
        .has-submenu > a:hover .submenu-arrow {
            animation: bounce 0.5s ease infinite;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
        }
        
        /* Estilo para os itens de submenu grande */
        .has-large-submenu .submenu {
            border-left: 3px solid var(--primary-color);
            background-color: rgba(30, 136, 229, 0.05);
        }
    `;
    
    document.head.appendChild(styleSheet);
}
