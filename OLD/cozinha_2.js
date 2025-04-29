/**
 * Recanto Rancho do Peixe - Kitchen Panel
 * JavaScript to power the kitchen module interface
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const currentTimeElement = document.getElementById('current-time');
    const btnAtualizar = document.getElementById('btn-atualizar');
    const btnConfiguracoes = document.getElementById('btn-configuracoes');
    const btnVoltar = document.getElementById('btn-voltar');
    const cozinhaTabs = document.querySelectorAll('.cozinha-tab');
    const filterTipo = document.getElementById('filter-tipo');
    const filterPrioridade = document.getElementById('filter-prioridade');
    const sortOption = document.getElementById('sort-option');
    const searchInput = document.getElementById('search-pedido');
    const btnSearch = document.getElementById('btn-search');
    const viewButtons = document.querySelectorAll('.view-btn');
    const pedidosContainer = document.getElementById('pedidos-container');
    const expandButtons = document.querySelectorAll('.btn-expand');
    const btnRelatorio = document.getElementById('btn-relatorio');
    const btnImprimir = document.getElementById('btn-imprimir');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalDetalhesPedido = document.getElementById('modal-detalhes-pedido');
    const modalRelatorio = document.getElementById('modal-relatorio');
    
    // State
    let activeFilter = 'todos';
    let activeTipoFilter = 'todos';
    let activePrioridadeFilter = 'todos';
    let activeSort = 'time-asc';
    let searchQuery = '';
    let pedidosState = [];
    let timerUpdateInterval;
    
    // Initialize
    function init() {
        // Start the clock
        updateClock();
        setInterval(updateClock, 1000);
        
        // Set up event listeners
        setupEventListeners();
        
        // Start timers update
        timerUpdateInterval = setInterval(updateTimers, 60000); // Update every minute
        
        // Initial page setup
        updateCounters();
        
        // Get initial state
        pedidosState = getPedidosState();
        
        // Show initialization notification
        showNotification('Painel da cozinha inicializado com sucesso!', 'success');
    }
    
    /**
     * Setup all event listeners for interactive elements
     */
    function setupEventListeners() {
        // Tab filters
        cozinhaTabs.forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });
        
        // Dropdown filters
        filterTipo.addEventListener('change', applyFilters);
        filterPrioridade.addEventListener('change', applyFilters);
        sortOption.addEventListener('change', applySort);
        
        // Search functionality
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        btnSearch.addEventListener('click', performSearch);
        
        // View toggle
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                viewButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Toggle view class on pedidos container
                const viewType = this.getAttribute('data-view');
                if (viewType === 'list') {
                    document.querySelector('.pedidos-grid').classList.add('list-view');
                } else {
                    document.querySelector('.pedidos-grid').classList.remove('list-view');
                }
            });
        });
        
        // Expand collapsed items
        expandButtons.forEach(button => {
            button.addEventListener('click', toggleItemsExpand);
        });
        
        // Action buttons for orders
        document.addEventListener('click', function(e) {
            const button = e.target.closest('.btn-status');
            if (button && !button.classList.contains('disabled')) {
                const pedidoId = button.getAttribute('data-pedido');
                const action = button.getAttribute('data-action');
                
                handleOrderAction(pedidoId, action);
            }
        });
        
        // Order cards click for details
        document.addEventListener('click', function(e) {
            const card = e.target.closest('.pedido-card');
            if (card && !e.target.closest('.btn-status') && !e.target.closest('.btn-expand')) {
                const pedidoId = card.getAttribute('data-pedido-id');
                openOrderDetails(pedidoId);
            }
        });
        
        // Button actions
        btnAtualizar.addEventListener('click', refreshData);
        btnConfiguracoes.addEventListener('click', openConfigModal);
        btnVoltar.addEventListener('click', confirmExit);
        btnRelatorio.addEventListener('click', openReportModal);
        btnImprimir.addEventListener('click', printOrders);
        
        // Modal close buttons
        const modalCloseBtns = document.querySelectorAll('.modal-close, .modal-close-btn');
        modalCloseBtns.forEach(btn => {
            btn.addEventListener('click', closeAllModals);
        });
        
        // Close modals on overlay click
        modalOverlay.addEventListener('click', closeAllModals);
        
        // Close modals on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });
    }
    
    /**
     * Update clock display
     */
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        if (currentTimeElement) {
            currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }
    
    /**
     * Handle tab click for filtering
     */
    function handleTabClick() {
        // Remove active class from all tabs
        cozinhaTabs.forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-selected', 'false');
        });
        
        // Add active class to clicked tab
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');
        
        // Set active filter
        activeFilter = this.getAttribute('data-filter');
        
        // Apply filters
        applyFilters();
    }
    
    /**
     * Apply all active filters
     */
    function applyFilters() {
        // Get current filter values
        activeTipoFilter = filterTipo.value;
        activePrioridadeFilter = filterPrioridade ? filterPrioridade.value : 'todos';
        
        // Get all pedido cards
        const pedidoCards = document.querySelectorAll('.pedido-card');
        
        // Apply filters to each card
        pedidoCards.forEach(card => {
            let visible = true;
            
            // Status filter
            if (activeFilter !== 'todos' && !card.classList.contains(activeFilter)) {
                visible = false;
            }
            
            // Type filter
            if (activeTipoFilter !== 'todos') {
                const cardTipo = card.getAttribute('data-tipo');
                if (cardTipo !== activeTipoFilter) {
                    visible = false;
                }
            }
            
            // Priority filter
            if (activePrioridadeFilter !== 'todos') {
                const cardPrioridade = card.getAttribute('data-prioridade');
                if (cardPrioridade !== activePrioridadeFilter) {
                    visible = false;
                }
            }
            
            // Search filter
            if (searchQuery) {
                const cardContent = card.textContent.toLowerCase();
                if (!cardContent.includes(searchQuery.toLowerCase())) {
                    visible = false;
                }
            }
            
            // Apply visibility
            card.style.display = visible ? '' : 'none';
        });
        
        // Check if no results and display message
        checkEmptyResults();
        
        // Update counters
        updateCounters();
    }
    
    /**
     * Apply sorting to orders
     */
    function applySort() {
        activeSort = sortOption.value;
        const pedidosGrid = document.querySelector('.pedidos-grid');
        const pedidoCards = Array.from(document.querySelectorAll('.pedido-card'));
        
        // Sort cards based on criteria
        pedidoCards.sort((a, b) => {
            switch (activeSort) {
                case 'time-asc': // Oldest first
                    return parseInt(a.getAttribute('data-tempo')) - parseInt(b.getAttribute('data-tempo'));
                case 'time-desc': // Newest first
                    return parseInt(b.getAttribute('data-tempo')) - parseInt(a.getAttribute('data-tempo'));
                case 'priority': // By priority (alta, normal, baixa)
                    const priorityOrder = { 'alta': 0, 'normal': 1, 'baixa': 2 };
                    const aPriority = a.getAttribute('data-prioridade') || 'normal';
                    const bPriority = b.getAttribute('data-prioridade') || 'normal';
                    return priorityOrder[aPriority] - priorityOrder[bPriority];
                default:
                    return 0;
            }
        });
        
        // Re-append in sorted order
        pedidoCards.forEach(card => {
            pedidosGrid.appendChild(card);
        });
    }
    
    /**
     * Perform search based on input
     */
    function performSearch() {
        searchQuery = searchInput.value.trim();
        applyFilters();
    }
    
    /**
     * Toggle expanded/collapsed state of order items
     */
    function toggleItemsExpand() {
        const itemsList = this.previousElementSibling;
        const isCollapsed = itemsList.classList.contains('collapsed');
        
        if (isCollapsed) {
            itemsList.classList.remove('collapsed');
            this.innerHTML = '<i class="fas fa-chevron-up" aria-hidden="true"></i><span>Mostrar menos</span>';
        } else {
            itemsList.classList.add('collapsed');
            this.innerHTML = '<i class="fas fa-chevron-down" aria-hidden="true"></i><span>Mostrar mais</span>';
        }
    }
    
    /**
     * Handle order action (iniciar, concluir, entregar)
     */
    function handleOrderAction(pedidoId, action) {
        const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pedidoId}"]`);
        if (!pedidoCard) return;
        
        // Remove status classes
        pedidoCard.classList.remove('pendente', 'em-preparo', 'pronto', 'entregue');
        
        // Update status based on action
        const statusElement = pedidoCard.querySelector('.pedido-status');
        if (!statusElement) return;
        
        // Disable all buttons initially
        const buttons = pedidoCard.querySelectorAll('.btn-status');
        buttons.forEach(btn => {
            btn.classList.add('disabled');
            btn.disabled = true;
        });
        
        // Apply new status based on action
        switch (action) {
            case 'iniciar':
                pedidoCard.classList.add('em-preparo');
                statusElement.textContent = 'Em Preparo';
                statusElement.className = 'pedido-status em-preparo';
                
                // Add progress bar if doesn't exist
                if (!pedidoCard.querySelector('.progress-bar')) {
                    const progressBar = document.createElement('div');
                    progressBar.className = 'progress-bar';
                    progressBar.innerHTML = '<div class="progress" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>';
                    
                    const pedidoBody = pedidoCard.querySelector('.pedido-body');
                    if (pedidoBody && pedidoBody.firstChild) {
                        pedidoBody.insertBefore(progressBar, pedidoBody.firstChild);
                        
                        // Animate progress bar
                        setTimeout(() => {
                            const progress = pedidoBody.querySelector('.progress');
                            if (progress) progress.style.width = '10%';
                        }, 100);
                    }
                }
                
                // Enable concluir button
                const btnConcluir = pedidoCard.querySelector('.btn-concluir');
                if (btnConcluir) {
                    btnConcluir.classList.remove('disabled');
                    btnConcluir.disabled = false;
                }
                
                showNotification('Pedido #' + pedidoId + ' iniciado com sucesso!', 'success');
                break;
                
            case 'concluir':
                pedidoCard.classList.add('pronto');
                statusElement.textContent = 'Pronto';
                statusElement.className = 'pedido-status pronto';
                
                // Replace progress bar with ready indicator
                const progressBar = pedidoCard.querySelector('.progress-bar');
                if (progressBar) {
                    const readyIndicator = document.createElement('div');
                    readyIndicator.className = 'ready-indicator';
                    readyIndicator.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i><span>Pronto para entrega!</span>';
                    progressBar.parentNode.replaceChild(readyIndicator, progressBar);
                }
                
                // Enable entregar button
                const btnEntregar = pedidoCard.querySelector('.btn-entregar');
                if (btnEntregar) {
                    btnEntregar.classList.remove('disabled');
                    btnEntregar.disabled = false;
                }
                
                showNotification('Pedido #' + pedidoId + ' concluído com sucesso!', 'success');
                break;
                
            case 'entregar':
                pedidoCard.classList.add('entregue');
                statusElement.textContent = 'Entregue';
                statusElement.className = 'pedido-status entregue';
                
                // Replace ready indicator with delivered indicator
                const readyIndicator = pedidoCard.querySelector('.ready-indicator');
                if (readyIndicator) {
                    const deliveredIndicator = document.createElement('div');
                    deliveredIndicator.className = 'delivered-indicator';
                    deliveredIndicator.innerHTML = '<i class="fas fa-check-double" aria-hidden="true"></i><span>Pedido entregue com sucesso</span>';
                    readyIndicator.parentNode.replaceChild(deliveredIndicator, readyIndicator);
                }
                
                showNotification('Pedido #' + pedidoId + ' entregue com sucesso!', 'success');
                break;
        }
        
        // Add transition highlight
        pedidoCard.classList.add('highlight-transition');
        setTimeout(() => {
            pedidoCard.classList.remove('highlight-transition');
        }, 1000);
        
        // Update counters after status change
        updateCounters();
        
        // Update pedido state
        updatePedidoState(pedidoId, action);
    }
    
    /**
     * Open order details modal
     */
    function openOrderDetails(pedidoId) {
        const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pedidoId}"]`);
        if (!pedidoCard) return;
        
        // Set modal title
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = `Detalhes do Pedido #${pedidoId}`;
        }
        
        // Clone card content for modal
        const modalBody = modalDetalhesPedido.querySelector('.modal-body');
        if (modalBody) {
            // Clear previous content
            modalBody.innerHTML = '';
            
            // Create detailed view of order
            const detailContent = document.createElement('div');
            detailContent.className = 'pedido-details';
            
            // Status and type info
            const statusClass = pedidoCard.classList.contains('pendente') ? 'pendente' : 
                                pedidoCard.classList.contains('em-preparo') ? 'em-preparo' : 
                                pedidoCard.classList.contains('pronto') ? 'pronto' : 'entregue';
            
            const statusText = pedidoCard.querySelector('.pedido-status').textContent;
            const tipo = pedidoCard.getAttribute('data-tipo');
            const tipoText = tipo === 'mesa' ? 'Mesa' : tipo === 'viagem' ? 'Viagem' : 'Delivery';
            const mesaInfo = pedidoCard.querySelector('.pedido-mesa').textContent;
            
            detailContent.innerHTML = `
                <div class="detail-header">
                    <div class="detail-status ${statusClass}">${statusText}</div>
                    <div class="detail-tipo">${tipoText}: ${mesaInfo}</div>
                </div>
                
                <div class="detail-section">
                    <h3>Itens do Pedido</h3>
                    <ul class="detail-items">
                        ${Array.from(pedidoCard.querySelectorAll('.pedido-item')).map(item => {
                            const qtd = item.querySelector('.item-qty').textContent;
                            const nome = item.querySelector('.item-nome').textContent;
                            const obs = item.querySelector('.item-obs') ? 
                                `<div class="detail-item-obs">${item.querySelector('.item-obs').textContent}</div>` : '';
                            
                            return `
                                <li class="detail-item">
                                    <div class="detail-item-header">
                                        <span class="detail-item-qty">${qtd}</span>
                                        <span class="detail-item-nome">${nome}</span>
                                    </div>
                                    ${obs}
                                </li>
                            `;
                        }).join('')}
                    </ul>
                </div>
            `;
            
            // Add notes if available
            const notasElement = pedidoCard.querySelector('.pedido-notas');
            if (notasElement) {
                detailContent.innerHTML += `
                    <div class="detail-section">
                        <h3>Observações</h3>
                        <div class="detail-notes">${notasElement.textContent}</div>
                    </div>
                `;
            }
            
            // Add timestamps section
            detailContent.innerHTML += `
                <div class="detail-section">
                    <h3>Acompanhamento de Tempo</h3>
                    <div class="detail-timestamps">
                        <div class="detail-timestamp">
                            <i class="fas fa-clock" aria-hidden="true"></i>
                            Recebido às 14:25
                        </div>
                        <div class="detail-timestamp ${statusClass === 'pendente' ? 'pending' : ''}">
                            <i class="fas fa-fire" aria-hidden="true"></i>
                            ${statusClass === 'pendente' ? 'Aguardando início' : 'Iniciado às 14:30'}
                        </div>
                        <div class="detail-timestamp ${statusClass === 'pendente' || statusClass === 'em-preparo' ? 'pending' : ''}">
                            <i class="fas fa-check" aria-hidden="true"></i>
                            ${statusClass === 'pendente' || statusClass === 'em-preparo' ? 'Aguardando conclusão' : 'Concluído às 14:40'}
                        </div>
                        <div class="detail-timestamp ${statusClass !== 'entregue' ? 'pending' : ''}">
                            <i class="fas fa-utensils" aria-hidden="true"></i>
                            ${statusClass !== 'entregue' ? 'Aguardando entrega' : 'Entregue às 14:50'}
                        </div>
                    </div>
                </div>
            `;
            
            // Add action buttons based on current status
            detailContent.innerHTML += `
                <div class="detail-section detail-actions">
                    <h3>Ações Disponíveis</h3>
                    <div class="detail-buttons">
                        <button class="btn btn-primary" id="modal-action-primary" data-pedido="${pedidoId}" data-action="${getNextAction(statusClass)}">
                            ${getActionText(getNextAction(statusClass))}
                        </button>
                        <button class="btn btn-secondary" id="modal-action-print">
                            <i class="fas fa-print" aria-hidden="true"></i> Imprimir Comanda
                        </button>
                    </div>
                </div>
            `;
            
            modalBody.appendChild(detailContent);
            
            // Add event listener for action button
            const actionBtn = modalBody.querySelector('#modal-action-primary');
            if (actionBtn) {
                actionBtn.addEventListener('click', function() {
                    const pedidoId = this.getAttribute('data-pedido');
                    const action = this.getAttribute('data-action');
                    
                    handleOrderAction(pedidoId, action);
                    closeAllModals();
                });
            }
            
            // Add event listener for print button
            const printBtn = modalBody.querySelector('#modal-action-print');
            if (printBtn) {
                printBtn.addEventListener('click', function() {
                    printOrderTicket(pedidoId);
                });
            }
        }
        
        // Show modal
        openModal(modalDetalhesPedido);
    }
    
    /**
     * Get next action based on current status
     */
    function getNextAction(status) {
        switch (status) {
            case 'pendente':
                return 'iniciar';
            case 'em-preparo':
                return 'concluir';
            case 'pronto':
                return 'entregar';
            default:
                return '';
        }
    }
    
    /**
     * Get action text for button
     */
    function getActionText(action) {
        switch (action) {
            case 'iniciar':
                return '<i class="fas fa-play" aria-hidden="true"></i> Iniciar Preparação';
            case 'concluir':
                return '<i class="fas fa-check" aria-hidden="true"></i> Marcar como Pronto';
            case 'entregar':
                return '<i class="fas fa-utensils" aria-hidden="true"></i> Confirmar Entrega';
            default:
                return '<i class="fas fa-check-double" aria-hidden="true"></i> Pedido Finalizado';
        }
    }
    
    /**
     * Update order state in data
     */
    function updatePedidoState(pedidoId, action) {
        // Find the pedido in state
        const pedidoIndex = pedidosState.findIndex(p => p.id === pedidoId);
        if (pedidoIndex === -1) return;
        
        // Update status based on action
        switch (action) {
            case 'iniciar':
                pedidosState[pedidoIndex].status = 'em-preparo';
                pedidosState[pedidoIndex].iniciadoEm = new Date();
                break;
            case 'concluir':
                pedidosState[pedidoIndex].status = 'pronto';
                pedidosState[pedidoIndex].concluidoEm = new Date();
                break;
            case 'entregar':
                pedidosState[pedidoIndex].status = 'entregue';
                pedidosState[pedidoIndex].entregueEm = new Date();
                break;
        }
        
        // In a real application, this would send data to server
        console.log('Order state updated:', pedidosState[pedidoIndex]);
    }
    
    /**
     * Update all timers for orders
     */
    function updateTimers() {
        const now = new Date();
        const pedidoCards = document.querySelectorAll('.pedido-card');
        
        pedidoCards.forEach(card => {
            const tempoElement = card.querySelector('.tempo-valor');
            if (!tempoElement) return;
            
            // Skip if already delivered
            if (card.classList.contains('entregue')) return;
            
            // Calculate time difference
            const timeData = parseInt(card.getAttribute('data-tempo')) || 0;
            const newTimeData = timeData + 1; // Increment by one minute
            
            // Update time data attribute
            card.setAttribute('data-tempo', newTimeData);
            
            // Format time text
            let timeText;
            let timeClass = '';
            
            if (card.classList.contains('pronto')) {
                timeText = `Pronto há ${newTimeData} min`;
                
                // Add warning class if waiting for more than 15 minutes
                if (newTimeData > 15) {
                    timeClass = 'warning';
                }
            } else {
                timeText = `${newTimeData} min`;
                
                // Add warning or danger class based on time elapsed
                if (newTimeData > 45) {
                    timeClass = 'danger';
                } else if (newTimeData > 20) {
                    timeClass = 'warning';
                }
            }
            
            // Update time display
            tempoElement.textContent = timeText;
            
            // Update time element class
            const timeParent = tempoElement.parentElement;
            if (timeParent) {
                timeParent.classList.remove('warning', 'danger');
                if (timeClass) {
                    timeParent.classList.add(timeClass);
                }
            }
            
            // Update progress bar for in-progress orders
            if (card.classList.contains('em-preparo')) {
                const progress = card.querySelector('.progress');
                if (progress) {
                    // Simple progress calculation (could be more sophisticated based on estimated time)
                    const progressPercent = Math.min(Math.floor((newTimeData / 30) * 100), 95);
                    progress.style.width = `${progressPercent}%`;
                    progress.setAttribute('aria-valuenow', progressPercent);
                }
            }
        });
    }
    
    /**
     * Update counters in tabs and footer
     */
    function updateCounters() {
        // Get counts by status
        const countPendente = document.querySelectorAll('.pedido-card.pendente').length;
        const countEmPreparo = document.querySelectorAll('.pedido-card.em-preparo').length;
        const countPronto = document.querySelectorAll('.pedido-card.pronto').length;
        const countEntregue = document.querySelectorAll('.pedido-card.entregue').length;
        const countTotal = countPendente + countEmPreparo + countPronto + countEntregue;
        
        // Update tab counters
        document.getElementById('counter-todos').textContent = countTotal;
        document.getElementById('counter-pendente').textContent = countPendente;
        document.getElementById('counter-em-preparo').textContent = countEmPreparo;
        document.getElementById('counter-pronto').textContent = countPronto;
        document.getElementById('counter-entregue').textContent = countEntregue;
        
        // Update footer statistics
        const estatPendentes = document.querySelector('.estat-item:nth-child(1) .estat-valor');
        const estatEmPreparo = document.querySelector('.estat-item:nth-child(2) .estat-valor');
        const estatProntos = document.querySelector('.estat-item:nth-child(3) .estat-valor');
        
        if (estatPendentes) estatPendentes.textContent = countPendente;
        if (estatEmPreparo) estatEmPreparo.textContent = countEmPreparo;
        if (estatProntos) estatProntos.textContent = countPronto;
    }
    
    /**
     * Check for empty results and show message
     */
    function checkEmptyResults() {
        const visibleCards = document.querySelectorAll('.pedido-card[style=""]').length;
        const emptyState = document.querySelector('.empty-state');
        
        if (visibleCards === 0) {
            // If no empty state exists, create one
            if (!emptyState) {
                const emptyStateElement = document.createElement('div');
                emptyStateElement.className = 'empty-state';
                emptyStateElement.innerHTML = `
                    <i class="fas fa-search" aria-hidden="true"></i>
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Não há pedidos correspondentes aos filtros selecionados.</p>
                    <button class="btn btn-primary" id="btn-limpar-filtros">
                        <i class="fas fa-sync" aria-hidden="true"></i> Limpar Filtros
                    </button>
                `;
                
                // Append to pedidos container
                const tabContent = document.querySelector('.tab-content.active');
                if (tabContent) {
                    tabContent.appendChild(emptyStateElement);
                    
                    // Add event listener to reset button
                    const resetBtn = emptyStateElement.querySelector('#btn-limpar-filtros');
                    if (resetBtn) {
                        resetBtn.addEventListener('click', resetFilters);
                    }
                }
            }
        } else {
            // Remove empty state if it exists
            if (emptyState) {
                emptyState.remove();
            }
        }
    }
    
    /**
     * Reset all filters to default
     */
    function resetFilters() {
        // Reset tab selection
        const allTab = document.querySelector('.cozinha-tab[data-filter="todos"]');
        if (allTab) {
            allTab.click();
        }
        
        // Reset dropdowns
        filterTipo.value = 'todos';
        if (filterPrioridade) filterPrioridade.value = 'todos';
        sortOption.value = 'time-asc';
        
        // Clear search
        searchInput.value = '';
        searchQuery = '';
        
        // Apply reset
        applyFilters();
        applySort();
    }
    
    /**
     * Refresh data from server
     */
    function refreshData() {
        // In a real application, this would fetch data from server
        showNotification('Buscando novos pedidos...', 'info');
        
        // Simulate loading
        btnAtualizar.disabled = true;
        btnAtualizar.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Atualizando...';
        
        // Simulate delay
        setTimeout(() => {
            // Reset button
            btnAtualizar.disabled = false;
            btnAtualizar.innerHTML = '<i class="fas fa-sync-alt" aria-hidden="true"></i> Atualizar';
            
            // Show completion notification
            showNotification('Dados atualizados com sucesso!', 'success');
        }, 1500);
    }
    
    /**
     * Open configuration modal
     */
    function openConfigModal() {
        alert('Modal de configurações seria implementado aqui.');
    }
    
    /**
     * Confirm exit from kitchen module
     */
    function confirmExit() {
        if (confirm('Tem certeza que deseja sair do painel da cozinha?')) {
            window.location.href = 'index.html';
        }
    }
    
    /**
     * Open report modal with statistics
     */
    function openReportModal() {
        const modalTitle = document.getElementById('modal-relatorio-title');
        if (modalTitle) {
            const today = new Date().toLocaleDateString('pt-BR');
            modalTitle.textContent = `Relatório de Produção - ${today}`;
        }
        
        const modalBody = modalRelatorio.querySelector('.modal-body');
        if (modalBody) {
            // Clear previous content
            modalBody.innerHTML = '';
            
            // Create report content
            const reportContent = document.createElement('div');
            reportContent.className = 'report-content';
            
            // Counts
            const countPendente = document.querySelectorAll('.pedido-card.pendente').length;
            const countEmPreparo = document.querySelectorAll('.pedido-card.em-preparo').length;
            const countPronto = document.querySelectorAll('.pedido-card.pronto').length;
            const countEntregue = document.querySelectorAll('.pedido-card.entregue').length;
            const countTotal = countPendente + countEmPreparo + countPronto + countEntregue;
            
            // Build report HTML
            reportContent.innerHTML = `
                <div class="report-summary">
                    <div class="report-stat">
                        <div class="report-stat-value">${countTotal}</div>
                        <div class="report-stat-label">Total de Pedidos</div>
                    </div>
                    <div class="report-stat">
                        <div class="report-stat-value">28</div>
                        <div class="report-stat-label">Pedidos Hoje</div>
                    </div>
                    <div class="report-stat">
                        <div class="report-stat-value">18 min</div>
                        <div class="report-stat-label">Tempo Médio</div>
                    </div>
                    <div class="report-stat">
                        <div class="report-stat-value">95%</div>
                        <div class="report-stat-label">Taxa de Conclusão</div>
                    </div>
                </div>
                
                <div class="report-section">
                    <h3>Status dos Pedidos</h3>
                    <div class="report-chart">
                        <div class="chart-bar">
                            <div class="chart-bar-label">Pendentes</div>
                            <div class="chart-bar-value" style="width: ${(countPendente/countTotal)*100}%;">${countPendente}</div>
                        </div>
                        <div class="chart-bar">
                            <div class="chart-bar-label">Em Preparo</div>
                            <div class="chart-bar-value" style="width: ${(countEmPreparo/countTotal)*100}%;">${countEmPreparo}</div>
                        </div>
                        <div class="chart-bar">
                            <div class="chart-bar-label">Prontos</div>
                            <div class="chart-bar-value" style="width: ${(countPronto/countTotal)*100}%;">${countPronto}</div>
                        </div>
                        <div class="chart-bar">
                            <div class="chart-bar-label">Entregues</div>
                            <div class="chart-bar-value" style="width: ${(countEntregue/countTotal)*100}%;">${countEntregue}</div>
                        </div>
                    </div>
                </div>
                
                <div class="report-section">
                    <h3>Itens Mais Pedidos</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Quantidade</th>
                                <th>Tempo Médio</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Peixe Frito</td>
                                <td>15</td>
                                <td>20 min</td>
                            </tr>
                            <tr>
                                <td>Camarão Alho e Óleo</td>
                                <td>12</td>
                                <td>25 min</td>
                            </tr>
                            <tr>
                                <td>Tilápia Grelhada</td>
                                <td>8</td>
                                <td>15 min</td>
                            </tr>
                            <tr>
                                <td>Porção de Batatas</td>
                                <td>7</td>
                                <td>10 min</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="report-section">
                    <h3>Desempenho por Cozinheiro</h3>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Cozinheiro</th>
                                <th>Pedidos</th>
                                <th>Tempo Médio</th>
                                <th>Avaliação</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Antônio</td>
                                <td>12</td>
                                <td>15 min</td>
                                <td>★★★★★</td>
                            </tr>
                            <tr>
                                <td>Márcia</td>
                                <td>9</td>
                                <td>18 min</td>
                                <td>★★★★☆</td>
                            </tr>
                            <tr>
                                <td>Pedro</td>
                                <td>7</td>
                                <td>22 min</td>
                                <td>★★★☆☆</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            
            modalBody.appendChild(reportContent);
        }
        
        // Show modal
        openModal(modalRelatorio);
    }
    
    /**
     * Print all currently visible orders
     */
    function printOrders() {
        // Send to printer
        window.print();
    }
    
    /**
     * Print a single order ticket
     */
    function printOrderTicket(pedidoId) {
        // In a real app, would create a print-specific view
        // For demo, just show confirmation
        alert(`Imprimindo comanda do pedido #${pedidoId}`);
    }
    
    /**
     * Open a modal
     */
    function openModal(modal) {
        modalOverlay.setAttribute('aria-hidden', 'false');
        modal.setAttribute('aria-hidden', 'false');
    }
    
    /**
     * Close all open modals
     */
    function closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modalOverlay.setAttribute('aria-hidden', 'true');
        
        modals.forEach(modal => {
            modal.setAttribute('aria-hidden', 'true');
        });
    }
    
    /**
     * Show notification toast
     */
    function showNotification(message, type = 'info') {
        const notificationsContainer = document.querySelector('.notifications-container');
        if (!notificationsContainer) return;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        
        // Add to container
        notificationsContainer.appendChild(notification);
        
        // Remove after animation completes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000); // Match the CSS animation duration
    }
    
    /**
     * Get pedidos state from actual DOM elements (in a real app, this would come from a server)
     */
    function getPedidosState() {
        const pedidoCards = document.querySelectorAll('.pedido-card');
        const pedidos = [];
        
        pedidoCards.forEach(card => {
            const id = card.getAttribute('data-pedido-id');
            const tipo = card.getAttribute('data-tipo');
            const prioridade = card.getAttribute('data-prioridade') || 'normal';
            const tempo = parseInt(card.getAttribute('data-tempo')) || 0;
            
            // Determine status
            let status = 'pendente';
            if (card.classList.contains('em-preparo')) status = 'em-preparo';
            if (card.classList.contains('pronto')) status = 'pronto';
            if (card.classList.contains('entregue')) status = 'entregue';
            
            // Get mesa info
            const mesaEl = card.querySelector('.pedido-mesa');
            const mesa = mesaEl ? mesaEl.textContent.trim() : '';
            
            // Get items
            const itens = [];
            card.querySelectorAll('.pedido-item').forEach(item => {
                const qtyEl = item.querySelector('.item-qty');
                const nameEl = item.querySelector('.item-nome');
                const obsEl = item.querySelector('.item-obs');
                
                if (qtyEl && nameEl) {
                    itens.push({
                        quantidade: qtyEl.textContent.trim().replace('x', '').trim(),
                        nome: nameEl.textContent.trim(),
                        observacao: obsEl ? obsEl.textContent.trim() : ''
                    });
                }
            });
            
            // Add pedido to array
            pedidos.push({
                id,
                tipo,
                prioridade,
                tempo,
                status,
                mesa,
                itens,
                recebidoEm: new Date(new Date().getTime() - tempo * 60000) // Simulate received time
            });
        });
        
        return pedidos;
    }
    
    // Initialize the application
    init();
});