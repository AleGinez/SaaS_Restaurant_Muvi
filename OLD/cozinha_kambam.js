/**
 * Recanto Rancho do Peixe - Kitchen Panel - Kanban Version
 * Tablet-optimized JavaScript for kitchen operations with Kanban layout
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // ===================================================================
    // ELEMENT REFERENCES
    // ===================================================================
    const currentTimeElement = document.getElementById('current-time');
    const btnAtualizar = document.getElementById('btn-atualizar');
    const btnConfiguracoes = document.getElementById('btn-configuracoes');
    const btnVoltar = document.getElementById('btn-voltar');
    const filterToggle = document.getElementById('filter-toggle');
    const filterControls = document.getElementById('filter-controls');
    const filterTipo = document.getElementById('filter-tipo');
    const filterPrioridade = document.getElementById('filter-prioridade');
    const sortOption = document.getElementById('sort-option');
    const searchInput = document.getElementById('search-pedido');
    const btnSearch = document.getElementById('btn-search');
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    const btnRelatorio = document.getElementById('btn-relatorio');
    const btnImprimir = document.getElementById('btn-imprimir');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalDetalhesPedido = document.getElementById('modal-detalhes-pedido');
    const modalConfiguracoes = document.getElementById('modal-configuracoes');
    const swipeGuide = document.getElementById('swipe-guide');
    const btnDismissGuide = document.querySelector('.btn-dismiss');
    const offlineIndicator = document.getElementById('offline-indicator');
    const notificationsContainer = document.getElementById('notifications-container');
    
    // Kanban specific elements
    const kanbanContainer = document.getElementById('kanban-container');
    const kanbanColumns = document.querySelectorAll('.kanban-column');
    const columnContents = document.querySelectorAll('.kanban-column-content');
    
    // Column counters
    const counterPendente = document.getElementById('counter-pendente');
    const counterEmPreparo = document.getElementById('counter-em-preparo');
    const counterPronto = document.getElementById('counter-pronto');
    const counterEntregue = document.getElementById('counter-entregue');
    
    // Column content containers
    const pendenteContent = document.getElementById('pendente-content');
    const preparoContent = document.getElementById('preparo-content');
    const prontoContent = document.getElementById('pronto-content');
    const entregueContent = document.getElementById('entregue-content');
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    
    // Sound toggle
    const soundToggle = document.getElementById('sound-toggle');
    
    // Font size selector
    const fontSizeSelect = document.getElementById('font-size');
    
    // Save config button
    const btnSaveConfig = document.getElementById('btn-save-config');
    
    // Alert time inputs
    const alertTimeInput = document.getElementById('alert-time');
    const criticalTimeInput = document.getElementById('critical-time');
    
    // ===================================================================
    // GLOBAL STATE
    // ===================================================================
    const state = {
        activeTipoFilter: 'todos',
        activePrioridadeFilter: 'todos',
        activeSort: 'time-asc',
        searchQuery: '',
        pedidos: [],
        touchStartX: 0,
        touchEndX: 0,
        swipedElement: null,
        lastFocusedElement: null,
        darkMode: false,
        soundEnabled: true,
        fontSize: 'medium',
        alertTime: 20, // Minutes before warning
        criticalTime: 40, // Minutes before critical
        isFiltersOpen: false,
        hasShownSwipeGuide: localStorage.getItem('hasShownSwipeGuide') === 'true',
        isOffline: !navigator.onLine,
        pendingActions: JSON.parse(localStorage.getItem('pendingActions') || '[]'),
        notificationSounds: {
            newOrder: new Audio('sounds/new-order.mp3'),
            orderComplete: new Audio('sounds/order-complete.mp3'),
            alert: new Audio('sounds/alert.mp3')
        }
    };
    
    // ===================================================================
    // INITIALIZATION
    // ===================================================================
    function init() {
        // Load preferences first
        loadPreferences();
        
        // Load pedidos state
        loadPedidosState();
        
        // Setup clock
        updateClock();
        setInterval(updateClock, 1000);
        
        // Setup timers for orders
        setInterval(updateTimers, 60000); // Update every minute
        
        // Setup event listeners
        setupEventListeners();
        
        // Apply initial filters
        applyFilters();
        
        // Sort and distribute orders to columns
        distributeOrdersToColumns();
        
        // Update counters
        updateCounters();
        
        // Check for offline status
        checkOfflineStatus();
        
        // Process any pending actions (if back online)
        if (navigator.onLine && state.pendingActions.length > 0) {
            processPendingActions();
        }
        
        // Show swipe gesture guide if not shown before
        if (!state.hasShownSwipeGuide) {
            setTimeout(() => {
                showSwipeGuide();
            }, 2000);
        }
        
        // Show welcome notification
        showNotification('Painel da cozinha inicializado', 'success');
        
        // Preload audio
        if (state.soundEnabled) {
            preloadAudio();
        }
        
        // Initialize empty state placeholders
        initEmptyStatePlaceholders();
    }
    
    // Initialize preferences
    function loadPreferences() {
        state.darkMode = localStorage.getItem('darkMode') === 'true';
        state.soundEnabled = localStorage.getItem('soundEnabled') !== 'false'; // Default to true
        state.fontSize = localStorage.getItem('fontSize') || 'medium';
        state.alertTime = parseInt(localStorage.getItem('alertTime')) || 20;
        state.criticalTime = parseInt(localStorage.getItem('criticalTime')) || 40;
        
        // Apply preferences
        applyDarkMode(state.darkMode);
        applyFontSize(state.fontSize);
        
        // Update UI controls
        if (darkModeToggle) darkModeToggle.checked = state.darkMode;
        if (soundToggle) soundToggle.checked = state.soundEnabled;
        if (fontSizeSelect) fontSizeSelect.value = state.fontSize;
        if (alertTimeInput) alertTimeInput.value = state.alertTime;
        if (criticalTimeInput) criticalTimeInput.value = state.criticalTime;
    }
    
    // Apply dark mode
    function applyDarkMode(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
    
    // Apply font size
    function applyFontSize(size) {
        document.documentElement.setAttribute('data-font-size', size);
    }
    
    // Preload audio files
    function preloadAudio() {
        Object.values(state.notificationSounds).forEach(audio => {
            audio.load();
            audio.volume = 0.5; // 50% volume
        });
    }
    
    // Play notification sound
    function playSound(type) {
        if (!state.soundEnabled) return;
        
        const sound = state.notificationSounds[type];
        if (sound) {
            // Stop and reset any playing sounds
            sound.pause();
            sound.currentTime = 0;
            
            // Play sound
            const playPromise = sound.play();
            
            // Handle potential play() promise rejection (happens in some browsers)
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("Audio play failed:", error);
                });
            }
        }
    }
    
    // ===================================================================
    // KANBAN SPECIFIC FUNCTIONS
    // ===================================================================
    
    // Distribute orders to their respective columns based on status
    function distributeOrdersToColumns() {
        // Clear existing content in all columns
        clearAllColumns();
        
        // Filter orders based on current filters
        const filteredOrders = getFilteredOrders();
        
        // Sort the filtered orders
        const sortedOrders = sortOrders(filteredOrders);
        
        // Distribute orders to columns based on status
        sortedOrders.forEach(order => {
            const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${order.id}"]`);
            if (pedidoCard) {
                // Determine column based on order status
                let targetColumn;
                if (pedidoCard.classList.contains('pendente')) {
                    targetColumn = pendenteContent;
                } else if (pedidoCard.classList.contains('em-preparo')) {
                    targetColumn = preparoContent;
                } else if (pedidoCard.classList.contains('pronto')) {
                    targetColumn = prontoContent;
                } else if (pedidoCard.classList.contains('entregue')) {
                    targetColumn = entregueContent;
                }
                
                // Add to appropriate column if it meets filter criteria
                if (targetColumn && isVisibleAfterFilter(pedidoCard)) {
                    targetColumn.appendChild(pedidoCard);
                }
            }
        });
        
        // Check for empty columns and add placeholders
        checkEmptyColumns();
    }
    
    // Clear all columns
    function clearAllColumns() {
        columnContents.forEach(column => {
            // Keep any placeholder elements, remove only order cards
            const cards = column.querySelectorAll('.pedido-card');
            cards.forEach(card => card.remove());
        });
    }
    
    // Create placeholders for empty columns
    function initEmptyStatePlaceholders() {
        columnContents.forEach(column => {
            const placeholder = document.createElement('div');
            placeholder.className = 'kanban-column-empty';
            placeholder.innerHTML = `
                <i class="fas fa-clipboard-list"></i>
                <p class="column-placeholder-text">Nenhum pedido neste status</p>
            `;
            column.appendChild(placeholder);
        });
        
        // Initially hide all placeholders, will be shown based on content
        checkEmptyColumns();
    }
    
    // Check if columns are empty and show/hide placeholders
    function checkEmptyColumns() {
        columnContents.forEach(column => {
            const cards = column.querySelectorAll('.pedido-card');
            const placeholder = column.querySelector('.kanban-column-empty');
            
            if (cards.length === 0 && placeholder) {
                placeholder.style.display = 'flex';
            } else if (placeholder) {
                placeholder.style.display = 'none';
            }
        });
    }
    
    // Get filtered orders based on current filter settings
    function getFilteredOrders() {
        return state.pedidos.filter(order => {
            // Type filter
            if (state.activeTipoFilter !== 'todos' && order.tipo !== state.activeTipoFilter) {
                return false;
            }
            
            // Priority filter
            if (state.activePrioridadeFilter !== 'todos' && order.prioridade !== state.activePrioridadeFilter) {
                return false;
            }
            
            // Search filter
            if (state.searchQuery) {
                const searchLower = state.searchQuery.toLowerCase();
                const orderContent = `${order.id} ${order.mesa} ${order.itens.map(i => `${i.nome} ${i.observacao || ''}`).join(' ')}`.toLowerCase();
                if (!orderContent.includes(searchLower)) {
                    return false;
                }
            }
            
            return true;
        });
    }
    
    // Sort orders based on current sort option
    function sortOrders(orders) {
        return [...orders].sort((a, b) => {
            switch (state.activeSort) {
                case 'time-asc': // Oldest first
                    return a.tempo - b.tempo;
                case 'time-desc': // Newest first
                    return b.tempo - a.tempo;
                case 'priority': // By priority (alta, normal, baixa)
                    const priorityOrder = { 'alta': 0, 'normal': 1, 'baixa': 2 };
                    const aPriority = a.prioridade || 'normal';
                    const bPriority = b.prioridade || 'normal';
                    
                    // If same priority, sort by time
                    if (priorityOrder[aPriority] === priorityOrder[bPriority]) {
                        return a.tempo - b.tempo;
                    }
                    
                    return priorityOrder[aPriority] - priorityOrder[bPriority];
                default:
                    return 0;
            }
        });
    }
    
    // Check if a card should be visible after applying filters
    function isVisibleAfterFilter(card) {
        // Type filter
        if (state.activeTipoFilter !== 'todos') {
            const cardTipo = card.getAttribute('data-tipo');
            if (cardTipo !== state.activeTipoFilter) {
                return false;
            }
        }
        
        // Priority filter
        if (state.activePrioridadeFilter !== 'todos') {
            const cardPrioridade = card.getAttribute('data-prioridade');
            if (cardPrioridade !== state.activePrioridadeFilter) {
                return false;
            }
        }
        
        // Search filter
        if (state.searchQuery) {
            const cardContent = card.textContent.toLowerCase();
            if (!cardContent.includes(state.searchQuery.toLowerCase())) {
                return false;
            }
        }
        
        return true;
    }
    
    // Move a card to a different column with animation
    function moveCardToColumn(card, targetColumn, animate = true) {
        // Exit if card is already in the target column
        const currentParent = card.parentElement;
        if (currentParent === targetColumn) return;
        
        // Add transition class for animation
        if (animate) {
            card.classList.add('highlight-transition');
            setTimeout(() => {
                card.classList.remove('highlight-transition');
            }, 500);
        }
        
        // Move the card to the new column
        targetColumn.appendChild(card);
        
        // Check if columns need placeholders
        checkEmptyColumns();
        
        // Update counters
        updateCounters();
    }
    
    // ===================================================================
    // EVENT LISTENERS
    // ===================================================================
    function setupEventListeners() {
        // Filter toggle
        if (filterToggle) {
            filterToggle.addEventListener('click', toggleFilters);
        }
        
        // Dropdown filters
        if (filterTipo) filterTipo.addEventListener('change', applyFilters);
        if (filterPrioridade) filterPrioridade.addEventListener('change', applyFilters);
        if (sortOption) sortOption.addEventListener('change', applySort);
        
        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('keyup', function(e) {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
        }
        if (btnSearch) btnSearch.addEventListener('click', performSearch);
        
        // Action buttons for orders
        document.addEventListener('click', function(e) {
            const button = e.target.closest('.btn-status');
            if (button && !button.classList.contains('disabled')) {
                const pedidoId = button.getAttribute('data-pedido');
                const action = button.getAttribute('data-action');
                
                handleOrderAction(pedidoId, action);
                
                // Track this as last focused element
                state.lastFocusedElement = button;
            }
        });
        
        // Swipe gestures for action buttons - touchstart
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        
        // Swipe gestures for action buttons - touchend
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // Order cards click for details
        document.addEventListener('click', function(e) {
            const card = e.target.closest('.pedido-card');
            if (card && !e.target.closest('.btn-status') && !e.target.closest('.btn-expand')) {
                const pedidoId = card.getAttribute('data-pedido-id');
                openOrderDetails(pedidoId);
                
                // Track this as last focused element
                state.lastFocusedElement = card;
            }
        });
        
        // Scroll event for back to top button
        document.querySelector('.cozinha-content').addEventListener('scroll', toggleScrollToTopButton);
        
        // Scroll to top button click
        if (scrollToTopBtn) {
            scrollToTopBtn.addEventListener('click', scrollToTop);
        }
        
        // Button actions
        if (btnAtualizar) btnAtualizar.addEventListener('click', refreshData);
        if (btnConfiguracoes) btnConfiguracoes.addEventListener('click', openConfigModal);
        if (btnVoltar) btnVoltar.addEventListener('click', confirmExit);
        if (btnRelatorio) btnRelatorio.addEventListener('click', openReportModal);
        if (btnImprimir) btnImprimir.addEventListener('click', printOrders);
        
        // Modal close buttons
        const modalCloseBtns = document.querySelectorAll('.modal-close, .modal-close-btn');
        modalCloseBtns.forEach(btn => {
            btn.addEventListener('click', closeAllModals);
        });
        
        // Close modals on overlay click
        if (modalOverlay) {
            modalOverlay.addEventListener('click', closeAllModals);
        }
        
        // Swipe guide dismiss
        if (btnDismissGuide) {
            btnDismissGuide.addEventListener('click', dismissSwipeGuide);
        }
        
        // Preference controls
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', function() {
                state.darkMode = this.checked;
                applyDarkMode(state.darkMode);
                savePreferences();
            });
        }
        
        if (soundToggle) {
            soundToggle.addEventListener('change', function() {
                state.soundEnabled = this.checked;
                savePreferences();
            });
        }
        
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', function() {
                state.fontSize = this.value;
                applyFontSize(state.fontSize);
                savePreferences();
            });
        }
        
        if (btnSaveConfig) {
            btnSaveConfig.addEventListener('click', saveAllConfig);
        }
        
        // Close modals on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });
        
        // Online/offline events
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
    }
    
    // ===================================================================
    // FILTERS AND SORTING
    // ===================================================================
    
    // Toggle filters panel
    function toggleFilters() {
        state.isFiltersOpen = !state.isFiltersOpen;
        
        // Update aria-expanded
        filterToggle.setAttribute('aria-expanded', state.isFiltersOpen);
        
        // Toggle class on filter controls
        if (filterControls) {
            if (state.isFiltersOpen) {
                filterControls.classList.add('show');
            } else {
                filterControls.classList.remove('show');
            }
        }
        
        // Rotate chevron
        const chevron = filterToggle.querySelector('.filter-chevron');
        if (chevron) {
            chevron.style.transform = state.isFiltersOpen ? 'rotate(180deg)' : '';
        }
    }
    
    // Apply all active filters
    function applyFilters() {
        // Get current filter values
        if (filterTipo) state.activeTipoFilter = filterTipo.value;
        if (filterPrioridade) state.activePrioridadeFilter = filterPrioridade.value;
        
        // Redistribute orders to columns with new filter applied
        distributeOrdersToColumns();
    }
    
    // Apply sorting
    function applySort() {
        state.activeSort = sortOption.value;
        distributeOrdersToColumns();
    }
    
    // Perform search
    function performSearch() {
        if (!searchInput) return;
        
        state.searchQuery = searchInput.value.trim();
        applyFilters();
    }
    
    // Reset all filters
    function resetFilters() {
        // Reset filter selections
        if (filterTipo) filterTipo.value = 'todos';
        if (filterPrioridade) filterPrioridade.value = 'todos';
        if (sortOption) sortOption.value = 'time-asc';
        
        // Clear search
        if (searchInput) {
            searchInput.value = '';
            state.searchQuery = '';
        }
        
        // Reset state
        state.activeTipoFilter = 'todos';
        state.activePrioridadeFilter = 'todos';
        state.activeSort = 'time-asc';
        
        // Apply reset
        distributeOrdersToColumns();
    }
    
    // ===================================================================
    // ORDER ACTIONS
    // ===================================================================
    
    // Handle order action (iniciar, concluir, entregar)
    function handleOrderAction(pedidoId, action) {
        // If offline, queue the action
        if (state.isOffline) {
            queueOfflineAction(pedidoId, action);
            showNotification('Ação será processada quando voltar online', 'warning');
            return;
        }
        
        const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pedidoId}"]`);
        if (!pedidoCard) return;
        
        // Remove status classes
        pedidoCard.classList.remove('pendente', 'em-preparo', 'pronto', 'entregue');
        
        // Update status based on action
        const statusElement = pedidoCard.querySelector('.pedido-status');
        if (!statusElement) return;
        
        // Store current status for undo functionality
        const currentStatus = statusElement.textContent.trim().toLowerCase();
        
        // Apply new status based on action
        switch (action) {
            case 'iniciar':
                updateToPreparing(pedidoCard, statusElement);
                playSound('newOrder');
                // Move card to Em Preparo column
                moveCardToColumn(pedidoCard, preparoContent);
                break;
                
            case 'concluir':
                updateToReady(pedidoCard, statusElement);
                playSound('orderComplete');
                // Move card to Prontos column
                moveCardToColumn(pedidoCard, prontoContent);
                break;
                
            case 'entregar':
                updateToDelivered(pedidoCard, statusElement);
                // Move card to Entregues column
                moveCardToColumn(pedidoCard, entregueContent);
                break;
        }
        
        // Update pedido state
        savePedidosFromDOM();
        
        // Add success feedback - vibration
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    }
    
    // Update to preparing state
    function updateToPreparing(pedidoCard, statusElement) {
        pedidoCard.classList.add('em-preparo');
        statusElement.textContent = 'Em Preparo';
        statusElement.className = 'pedido-status em-preparo';
        
        // Add progress bar if doesn't exist
        if (!pedidoCard.querySelector('.progress-container')) {
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            progressContainer.innerHTML = `
                <div class="progress-bar">
                    <div class="progress" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <div class="progress-text">0% concluído</div>
            `;
            
            const pedidoBody = pedidoCard.querySelector('.pedido-body');
            if (pedidoBody && pedidoBody.firstChild) {
                pedidoBody.insertBefore(progressContainer, pedidoBody.firstChild);
                
                // Animate progress bar
                setTimeout(() => {
                    const progress = pedidoBody.querySelector('.progress');
                    if (progress) progress.style.width = '10%';
                    
                    const progressText = pedidoBody.querySelector('.progress-text');
                    if (progressText) progressText.textContent = '10% concluído';
                }, 100);
            }
        }
        
        // Update action button
        updateActionButton(pedidoCard, 'concluir');
        
        showNotification(`Pedido #${pedidoCard.getAttribute('data-pedido-id')} em preparo`, 'success');
    }
    
    // Update to ready state
    function updateToReady(pedidoCard, statusElement) {
        pedidoCard.classList.add('pronto');
        statusElement.textContent = 'Pronto';
        statusElement.className = 'pedido-status pronto';
        
        // Replace progress bar with ready indicator
        const progressContainer = pedidoCard.querySelector('.progress-container');
        if (progressContainer) {
            const readyIndicator = document.createElement('div');
            readyIndicator.className = 'ready-indicator';
            readyIndicator.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i><span>Pronto para entrega!</span>';
            progressContainer.parentNode.replaceChild(readyIndicator, progressContainer);
        }
        
        // Update action button
        updateActionButton(pedidoCard, 'entregar');
        
        showNotification(`Pedido #${pedidoCard.getAttribute('data-pedido-id')} concluído!`, 'success');
    }
    
    // Update to delivered state
    function updateToDelivered(pedidoCard, statusElement) {
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
        
        // Add timestamps if they don't exist
        if (!pedidoCard.querySelector('.pedido-timestamps')) {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;
            
            const footer = pedidoCard.querySelector('.pedido-footer');
            const actions = pedidoCard.querySelector('.pedido-actions');
            
            if (footer && actions) {
                const timestamps = document.createElement('div');
                timestamps.className = 'pedido-timestamps';
                timestamps.innerHTML = `
                    <div class="timestamp"><i class="fas fa-utensils" aria-hidden="true"></i> Entregue: ${timeStr}</div>
                `;
                
                footer.insertBefore(timestamps, actions);
                
                // Clean up actions area
                actions.innerHTML = '';
            }
        }
        
        showNotification(`Pedido #${pedidoCard.getAttribute('data-pedido-id')} entregue!`, 'success');
    }
    
    // Update action button
    function updateActionButton(pedidoCard, nextAction) {
        const actionArea = pedidoCard.querySelector('.action-swipe-area');
        if (!actionArea) return;
        
        // Get pedido ID
        const pedidoId = pedidoCard.getAttribute('data-pedido-id');
        
        // Update button class and content
        let btnClass = '';
        let btnText = '';
        let btnIcon = '';
        
        switch (nextAction) {
            case 'iniciar':
                btnClass = 'btn-iniciar';
                btnText = 'Iniciar';
                btnIcon = 'fa-play';
                break;
            case 'concluir':
                btnClass = 'btn-concluir';
                btnText = 'Concluir';
                btnIcon = 'fa-check';
                break;
            case 'entregar':
                btnClass = 'btn-entregar';
                btnText = 'Entregar';
                btnIcon = 'fa-utensils';
                break;
        }
        
        // Create new button
        actionArea.innerHTML = `
            <button class="btn-status ${btnClass} swipe-btn" data-pedido="${pedidoId}" data-action="${nextAction}">
                <i class="fas ${btnIcon}" aria-hidden="true"></i>
                <span>${btnText}</span>
            </button>
        `;
    }
    
    // ===================================================================
    // TOUCH & SWIPE HANDLERS
    // ===================================================================
    
    // Handle touch start for swipe detection
    function handleTouchStart(e) {
        const swipeArea = e.target.closest('.action-swipe-area');
        if (!swipeArea) return;
        
        // Store the start position
        state.touchStartX = e.touches[0].clientX;
        state.swipedElement = swipeArea;
        
        // Add active class to button
        const actionBtn = swipeArea.querySelector('.swipe-btn');
        if (actionBtn) {
            actionBtn.classList.add('active-touch');
        }
    }
    
    // Handle touch end for swipe detection
    function handleTouchEnd(e) {
        if (!state.swipedElement) return;
        
        // Get the button
        const actionBtn = state.swipedElement.querySelector('.swipe-btn');
        if (!actionBtn) {
            resetSwipeState();
            return;
        }
        
        // Remove active touch class
        actionBtn.classList.remove('active-touch');
        
        // If this is a disabled button, ignore
        if (actionBtn.classList.contains('disabled')) {
            resetSwipeState();
            return;
        }
        
        // Calculate swipe distance
        state.touchEndX = e.changedTouches[0].clientX;
        const swipeDistance = state.touchEndX - state.touchStartX;
        
        // Check if swipe was long enough
        if (swipeDistance > 100) { // Minimum swipe distance
            // Get order action data
            const pedidoId = actionBtn.getAttribute('data-pedido');
            const action = actionBtn.getAttribute('data-action');
            
            // Execute action
            handleOrderAction(pedidoId, action);
            
            // Add swipe animation
            actionBtn.style.transform = 'translateX(100%)';
            setTimeout(() => {
                actionBtn.style.transform = '';
            }, 300);
        }
        
        resetSwipeState();
    }
    
    // Reset swipe state
    function resetSwipeState() {
        state.touchStartX = 0;
        state.touchEndX = 0;
        state.swipedElement = null;
    }
    
    // Show swipe gesture guide
    function showSwipeGuide() {
        if (swipeGuide) {
            swipeGuide.classList.add('show');
        }
    }
    
    // Dismiss swipe guide
    function dismissSwipeGuide() {
        if (swipeGuide) {
            swipeGuide.classList.remove('show');
            
            // Save to localStorage so we don't show it again
            localStorage.setItem('hasShownSwipeGuide', 'true');
            state.hasShownSwipeGuide = true;
        }
    }
    
    // ===================================================================
    // ORDER MANAGEMENT FUNCTIONS
    // ===================================================================
    
    // Refresh data from server
    function refreshData() {
        // In a real application, this would fetch data from server
        showNotification('Buscando novos pedidos...', 'info');
        
        // Simulate loading
        btnAtualizar.disabled = true;
        btnAtualizar.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> <span>Atualizando...</span>';
        
        // Simulate delay
        setTimeout(() => {
            // Reset button
            btnAtualizar.disabled = false;
            btnAtualizar.innerHTML = '<i class="fas fa-sync-alt" aria-hidden="true"></i> <span>Atualizar</span>';
            
            // In a tablet environment, sometimes we might want to vibrate the device
            // to notify the user even if they're not looking at the screen
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
            
            // Refresh orders display
            distributeOrdersToColumns();
            
            // Show completion notification
            showNotification('Dados atualizados com sucesso!', 'success');
        }, 1500);
    }
    
    // Get pedidos from DOM
    function getPedidosFromDOM() {
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
            
            // Get notes if available
            const notasEl = card.querySelector('.pedido-notas');
            const notas = notasEl ? notasEl.textContent.trim() : '';
            
            // Add pedido to array
            pedidos.push({
                id,
                tipo,
                prioridade,
                tempo,
                status,
                mesa,
                itens,
                notas,
                recebidoEm: new Date(new Date().getTime() - tempo * 60000).toISOString() // Simulate received time
            });
        });
        
        return pedidos;
    }
    
    // Save pedidos from DOM to state
    function savePedidosFromDOM() {
        state.pedidos = getPedidosFromDOM();
        savePedidosState();
    }
    
    // Get pedidos from DOM or load from cache to maintain state
    function loadPedidosState() {
        const cachedPedidos = localStorage.getItem('pedidosState');
        
        if (cachedPedidos) {
            try {
                state.pedidos = JSON.parse(cachedPedidos);
                return;
            } catch (e) {
                console.warn('Failed to parse cached pedidos', e);
            }
        }
        
        // If no cache or parsing failed, load from DOM
        state.pedidos = getPedidosFromDOM();
        savePedidosState();
    }
    
    // Save pedidos state to localStorage
    function savePedidosState() {
        try {
            localStorage.setItem('pedidosState', JSON.stringify(state.pedidos));
        } catch (e) {
            console.warn('Failed to save pedidos state', e);
        }
    }
    
    // ===================================================================
    // UI UPDATE FUNCTIONS
    // ===================================================================
    
    // Update clock display
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        if (currentTimeElement) {
            currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }
    
    // Update all counters
    function updateCounters() {
        // Count visible cards per column
        const countPendente = pendenteContent.querySelectorAll('.pedido-card').length;
        const countEmPreparo = preparoContent.querySelectorAll('.pedido-card').length;
        const countPronto = prontoContent.querySelectorAll('.pedido-card').length;
        const countEntregue = entregueContent.querySelectorAll('.pedido-card').length;
        const countTotal = countPendente + countEmPreparo + countPronto + countEntregue;
        
        // Update column counters
        updateCounter(counterPendente, countPendente);
        updateCounter(counterEmPreparo, countEmPreparo);
        updateCounter(counterPronto, countPronto);
        updateCounter(counterEntregue, countEntregue);
        
        // Update footer statistics
        updateStatValue('.estat-item:nth-child(1) .estat-valor', countPendente);
        updateStatValue('.estat-item:nth-child(2) .estat-valor', countEmPreparo);
        updateStatValue('.estat-item:nth-child(3) .estat-valor', countPronto);
    }
    
    // Update a counter element with animation
    function updateCounter(element, count) {
        if (!element) return;
        
        // Get previous count for animation
        const prevCount = parseInt(element.getAttribute('data-prev-count') || '0');
        
        // Update the counter text
        element.textContent = count;
        
        // Add animation if count changed
        if (prevCount !== count) {
            element.classList.add('count-changed');
            setTimeout(() => {
                element.classList.remove('count-changed');
            }, 500);
            
            // Store new count
            element.setAttribute('data-prev-count', count.toString());
        }
    }
    
    // Update stat value with animation
    function updateStatValue(selector, value) {
        const stat = document.querySelector(selector);
        if (stat) {
            const prevValue = stat.textContent;
            stat.textContent = value;
            
            // Animate if value changes
            if (prevValue !== value.toString()) {
                stat.classList.add('value-changed');
                setTimeout(() => {
                    stat.classList.remove('value-changed');
                }, 500);
            }
        }
    }
    
    // Update timers for all orders
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
                
                // Add warning class if ready for too long
                if (newTimeData > 15) {
                    timeClass = 'warning';
                }
            } else {
                timeText = `${newTimeData} min`;
                
                // Add warning or danger class based on time elapsed
                if (newTimeData > state.criticalTime) {
                    timeClass = 'danger';
                    // Play alert sound if newly critical
                    if (newTimeData === state.criticalTime + 1) {
                        playSound('alert');
                        showNotification(`Pedido #${card.getAttribute('data-pedido-id')} está em atraso crítico!`, 'error');
                        
                        // Vibrate device if available (helpful in noisy kitchens)
                        if (navigator.vibrate) {
                            navigator.vibrate([200, 100, 200]);
                        }
                    }
                } else if (newTimeData > state.alertTime) {
                    timeClass = 'warning';
                    // Alert when crossing threshold
                    if (newTimeData === state.alertTime + 1) {
                        showNotification(`Pedido #${card.getAttribute('data-pedido-id')} está demorando mais que o esperado`, 'warning');
                    }
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
                updateProgressBar(card, newTimeData);
            }
        });
        
        // Save updated pedidos state
        savePedidosFromDOM();
    }
    
    // Update progress bar for in-progress orders
    function updateProgressBar(card, timeData) {
        const progress = card.querySelector('.progress');
        const progressText = card.querySelector('.progress-text');
        
        if (progress) {
            // Simple progress calculation (could be more sophisticated in real app)
            // Assuming average completion time is 30 minutes
            const averageTime = 30;
            let progressPercent = Math.min(Math.floor((timeData / averageTime) * 100), 98);
            
            // Adjust progress for overdue orders so they never appear complete
            if (timeData > averageTime && progressPercent > 85) {
                progressPercent = 85 + Math.floor(Math.random() * 10); // Random fluctuation for orders that take longer
            }
            
            progress.style.width = `${progressPercent}%`;
            progress.setAttribute('aria-valuenow', progressPercent);
            
            if (progressText) {
                progressText.textContent = `${progressPercent}% concluído`;
            }
        }
    }
    
    // Toggle scroll to top button visibility
    function toggleScrollToTopButton() {
        if (!scrollToTopBtn) return;
        
        const scrollContent = document.querySelector('.cozinha-content');
        if (scrollContent.scrollTop > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    }
    
    // Scroll to top function
    function scrollToTop() {
        const scrollContent = document.querySelector('.cozinha-content');
        
        // Smooth scroll with fallback
        if ('scrollBehavior' in document.documentElement.style) {
            scrollContent.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            // Fallback for browsers that don't support smooth scrolling
            scrollContent.scrollTop = 0;
        }
    }
    
    // ===================================================================
    // MODALS
    // ===================================================================
    
    // Open order details modal
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
        if (!modalBody) return;
        
        // Clear previous content
        modalBody.innerHTML = '';
        
        // Create detailed view of order
        const detailContent = document.createElement('div');
        detailContent.className = 'pedido-details';
        
        // Status and type info
        const statusClass = getStatusClass(pedidoCard);
        const statusText = pedidoCard.querySelector('.pedido-status').textContent;
        const tipo = pedidoCard.getAttribute('data-tipo');
        const tipoText = getTipoText(tipo);
        const mesaInfo = pedidoCard.querySelector('.pedido-mesa').textContent;
        
        // Create detail header
        detailContent.innerHTML = `
            <div class="detail-header">
                <div class="detail-status ${statusClass}">${statusText}</div>
                <div class="detail-tipo">${tipoText}: ${mesaInfo}</div>
                <div class="detail-time">
                    <i class="fas fa-clock" aria-hidden="true"></i>
                    ${pedidoCard.querySelector('.tempo-valor').textContent}
                </div>
            </div>
        `;
        
        // Add items section
        addDetailItems(detailContent, pedidoCard);
        
        // Add notes if available
        addDetailNotes(detailContent, pedidoCard);
        
        // Add timestamps section
        addDetailTimestamps(detailContent, pedidoCard);
        
        // Add action buttons based on current status
        addDetailActions(detailContent, pedidoCard, pedidoId, statusClass);
        
        // Add content to modal
        modalBody.appendChild(detailContent);
        
        // Show modal
        openModal(modalDetalhesPedido);
    }
    
    // Get status class from card
    function getStatusClass(pedidoCard) {
        if (pedidoCard.classList.contains('pendente')) return 'pendente';
        if (pedidoCard.classList.contains('em-preparo')) return 'em-preparo';
        if (pedidoCard.classList.contains('pronto')) return 'pronto';
        if (pedidoCard.classList.contains('entregue')) return 'entregue';
        return '';
    }
    
    // Get tipo text
    function getTipoText(tipo) {
        switch (tipo) {
            case 'mesa': return 'Mesa';
            case 'viagem': return 'Viagem';
            case 'delivery': return 'Delivery';
            default: return tipo.charAt(0).toUpperCase() + tipo.slice(1);
        }
    }
    
    // Add items to detail view
    function addDetailItems(detailContent, pedidoCard) {
        const items = pedidoCard.querySelectorAll('.pedido-item');
        if (items.length === 0) return;
        
        // Create items section
        const itemsSection = document.createElement('div');
        itemsSection.className = 'detail-section';
        itemsSection.innerHTML = '<h3>Itens do Pedido</h3>';
        
        // Create items list
        const itemsList = document.createElement('ul');
        itemsList.className = 'detail-items';
        
        // Add each item
        items.forEach(item => {
            const qty = item.querySelector('.item-qty').textContent;
            const nome = item.querySelector('.item-nome').textContent;
            const obsElement = item.querySelector('.item-obs');
            const obs = obsElement ? obsElement.textContent : '';
            
            // Create item element
            const itemElement = document.createElement('li');
            itemElement.className = 'detail-item';
            
            itemElement.innerHTML = `
                <div class="detail-item-header">
                    <span class="detail-item-qty">${qty}</span>
                    <span class="detail-item-nome">${nome}</span>
                </div>
                ${obs ? `<div class="detail-item-obs">${obs}</div>` : ''}
            `;
            
            itemsList.appendChild(itemElement);
        });
        
        // Add list to section
        itemsSection.appendChild(itemsList);
        
        // Add section to detail content
        detailContent.appendChild(itemsSection);
    }
    
    // Add notes to detail view
    function addDetailNotes(detailContent, pedidoCard) {
        const notasElement = pedidoCard.querySelector('.pedido-notas');
        if (!notasElement) return;
        
        // Create notes section
        const notesSection = document.createElement('div');
        notesSection.className = 'detail-section';
        notesSection.innerHTML = `
            <h3>Observações</h3>
            <div class="detail-notes">${notasElement.textContent}</div>
        `;
        
        // Add section to detail content
        detailContent.appendChild(notesSection);
    }
    
    // Add timestamps to detail view
    function addDetailTimestamps(detailContent, pedidoCard) {
        // Create timestamps section
        const timestampsSection = document.createElement('div');
        timestampsSection.className = 'detail-section';
        timestampsSection.innerHTML = '<h3>Acompanhamento de Tempo</h3>';
        
        // Get status
        const statusClass = getStatusClass(pedidoCard);
        
        // Create timestamps container
        const timestampsContainer = document.createElement('div');
        timestampsContainer.className = 'detail-timestamps';
        
        // Add timestamps based on status
        timestampsContainer.innerHTML = `
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
        `;
        
        // Add timestamps to section
        timestampsSection.appendChild(timestampsContainer);
        
        // Add section to detail content
        detailContent.appendChild(timestampsSection);
    }
    
    // Add actions to detail view
    function addDetailActions(detailContent, pedidoCard, pedidoId, statusClass) {
        // Don't add actions for delivered orders
        if (statusClass === 'entregue') return;
        
        // Create actions section
        const actionsSection = document.createElement('div');
        actionsSection.className = 'detail-section detail-actions';
        actionsSection.innerHTML = '<h3>Ações Disponíveis</h3>';
        
        // Create buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'detail-buttons';
        
        // Get next action
        const nextAction = getNextAction(statusClass);
        
        // Add buttons
        buttonsContainer.innerHTML = `
            <button class="btn btn-primary btn-lg" id="modal-action-primary" data-pedido="${pedidoId}" data-action="${nextAction}">
                ${getActionText(nextAction)}
            </button>
            <button class="btn btn-secondary btn-lg" id="modal-action-print">
                <i class="fas fa-print" aria-hidden="true"></i> Imprimir Comanda
            </button>
        `;
        
        // Add buttons to section
        actionsSection.appendChild(buttonsContainer);
        
        // Add section to detail content
        detailContent.appendChild(actionsSection);
        
        // Add event listener for action button
        const actionBtn = buttonsContainer.querySelector('#modal-action-primary');
        if (actionBtn) {
            actionBtn.addEventListener('click', function() {
                const pedidoId = this.getAttribute('data-pedido');
                const action = this.getAttribute('data-action');
                
                handleOrderAction(pedidoId, action);
                closeAllModals();
            });
        }
        
        // Add event listener for print button
        const printBtn = buttonsContainer.querySelector('#modal-action-print');
        if (printBtn) {
            printBtn.addEventListener('click', function() {
                printOrderTicket(pedidoId);
            });
        }
    }
    
    // Get next action based on current status
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
    
    // Get action text for button
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
    
    // Open configuration modal
    function openConfigModal() {
        openModal(modalConfiguracoes);
    }
    
    // Open report modal
    function openReportModal() {
        // In a real app, this would open a report modal with statistics
        showNotification('Relatório de produção ainda não implementado', 'info');
    }
    
    // Open modal
    function openModal(modal) {
        if (!modal || !modalOverlay) return;
        
        // Store last focused element for accessibility
        state.lastFocusedElement = document.activeElement;
        
        // Show overlay
        modalOverlay.setAttribute('aria-hidden', 'false');
        
        // Show modal
        modal.setAttribute('aria-hidden', 'false');
        
        // Focus on first focusable element in modal
        setTimeout(() => {
            const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length > 0) {
                focusable[0].focus();
            }
        }, 100);
        
        // Prevent body scrolling
        document.body.classList.add('modal-open');
    }
    
    // Close all open modals
    function closeAllModals() {
        if (!modalOverlay) return;
        
        // Hide overlay
        modalOverlay.setAttribute('aria-hidden', 'true');
        
        // Hide all modals
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.setAttribute('aria-hidden', 'true');
        });
        
        // Return focus to last element
        if (state.lastFocusedElement) {
            state.lastFocusedElement.focus();
        }
        
        // Re-enable body scrolling
        document.body.classList.remove('modal-open');
    }
    
    // ===================================================================
    // OFFLINE SUPPORT
    // ===================================================================
    
    // Handle offline state
    function handleOffline() {
        state.isOffline = true;
        
        // Show offline indicator
        if (offlineIndicator) {
            offlineIndicator.style.display = 'flex';
        }
        
        // Show notification
        showNotification('Você está offline. As ações serão sincronizadas quando voltar online.', 'warning');
    }
    
    // Handle online state
    function handleOnline() {
        state.isOffline = false;
        
        // Hide offline indicator
        if (offlineIndicator) {
            offlineIndicator.style.display = 'none';
        }
        
        // Process any pending actions
        processPendingActions();
        
        // Show notification
        showNotification('Você está online novamente!', 'success');
    }
    
    // Check offline status
    function checkOfflineStatus() {
        state.isOffline = !navigator.onLine;
        
        if (offlineIndicator) {
            offlineIndicator.style.display = state.isOffline ? 'flex' : 'none';
        }
    }
    
    // Queue action for when back online
    function queueOfflineAction(pedidoId, action) {
        // Add action to queue
        state.pendingActions.push({
            pedidoId,
            action,
            timestamp: Date.now()
        });
        
        // Save to localStorage
        localStorage.setItem('pendingActions', JSON.stringify(state.pendingActions));
        
        // Apply optimistic UI update
        applyOptimisticUpdate(pedidoId, action);
    }
    
    // Apply optimistic UI update for offline actions
    function applyOptimisticUpdate(pedidoId, action) {
        const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pedidoId}"]`);
        if (!pedidoCard) return;
        
        // Add offline-pending class
        pedidoCard.classList.add('offline-pending');
        
        // Add an indicator to show it's pending sync
        const syncIndicator = document.createElement('div');
        syncIndicator.className = 'sync-pending';
        syncIndicator.innerHTML = '<i class="fas fa-sync-alt fa-spin" aria-hidden="true"></i>';
        
        // Add to card if not already present
        if (!pedidoCard.querySelector('.sync-pending')) {
            pedidoCard.appendChild(syncIndicator);
        }
        
        // Update visual state based on action
        const statusElement = pedidoCard.querySelector('.pedido-status');
        if (!statusElement) return;
        
        // Apply visual status based on action
        switch (action) {
            case 'iniciar':
                statusElement.textContent = 'Em Preparo (sync pendente)';
                statusElement.className = 'pedido-status em-preparo';
                break;
            case 'concluir':
                statusElement.textContent = 'Pronto (sync pendente)';
                statusElement.className = 'pedido-status pronto';
                break;
            case 'entregar':
                statusElement.textContent = 'Entregue (sync pendente)';
                statusElement.className = 'pedido-status entregue';
                break;
        }
    }
    
    // Process pending actions when back online
    function processPendingActions() {
        if (state.pendingActions.length === 0) return;
        
        // Show notification that we're syncing
        showNotification(`Sincronizando ${state.pendingActions.length} ações pendentes...`, 'info');
        
        // Simulate API calls with a small delay between each
        let delay = 0;
        
        state.pendingActions.forEach(pendingAction => {
            // Stagger the actions to avoid overwhelming the server
            setTimeout(() => {
                // Process action
                handleOrderAction(pendingAction.pedidoId, pendingAction.action);
                
                // Remove sync indicator
                const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pendingAction.pedidoId}"]`);
                if (pedidoCard) {
                    pedidoCard.classList.remove('offline-pending');
                    
                    const syncIndicator = pedidoCard.querySelector('.sync-pending');
                    if (syncIndicator) {
                        syncIndicator.remove();
                    }
                }
            }, delay);
            
            delay += 300; // Stagger by 300ms
        });
        
        // After all actions processed, clear pending actions
        setTimeout(() => {
            state.pendingActions = [];
            localStorage.removeItem('pendingActions');
            
            // Show completion notification
            showNotification('Todas as ações foram sincronizadas com sucesso!', 'success');
        }, delay + 500);
    }
    
    // ===================================================================
    // PRINTING
    // ===================================================================
    
    // Print all orders
    function printOrders() {
        // Add print-specific class to body
        document.body.classList.add('print-mode');
        
        // Print
        window.print();
        
        // Remove print class after printing
        setTimeout(() => {
            document.body.classList.remove('print-mode');
        }, 1000);
    }
    
    // Print a single order ticket
    function printOrderTicket(pedidoId) {
        showNotification(`Imprimindo comanda do pedido #${pedidoId}`, 'success');
    }
    
    // ===================================================================
    // NOTIFICATIONS
    // ===================================================================
    
    // Show notification toast
    function showNotification(message, type = 'info') {
        if (!notificationsContainer) return;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.textContent = message;
        
        // Add to container
        notificationsContainer.appendChild(notification);
        
        // Play sound based on type
        if (type === 'success') playSound('orderComplete');
        if (type === 'error') playSound('alert');
        
        // Remove after animation completes
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000); // Match the CSS animation duration
    }
    
    // ===================================================================
    // CONFIG FUNCTIONS
    // ===================================================================
    
    // Save all configurations
    function saveAllConfig() {
        // Get values from form
        if (alertTimeInput) state.alertTime = parseInt(alertTimeInput.value) || 20;
        if (criticalTimeInput) state.criticalTime = parseInt(criticalTimeInput.value) || 40;
        
        // Save preferences
        savePreferences();
        
        // Close modal
        closeAllModals();
        
        // Show confirmation
        showNotification('Configurações salvas com sucesso', 'success');
    }
    
    // Save preferences to localStorage
    function savePreferences() {
        localStorage.setItem('darkMode', state.darkMode);
        localStorage.setItem('soundEnabled', state.soundEnabled);
        localStorage.setItem('fontSize', state.fontSize);
        localStorage.setItem('alertTime', state.alertTime);
        localStorage.setItem('criticalTime', state.criticalTime);
    }
    
    // Confirm before exiting
    function confirmExit() {
        // Check if there are any pending orders
        const pendingOrders = document.querySelectorAll('.pedido-card.pendente, .pedido-card.em-preparo, .pedido-card.pronto').length;
        
        let message = 'Tem certeza que deseja sair do painel da cozinha?';
        
        if (pendingOrders > 0) {
            message = `Ainda existem ${pendingOrders} pedidos pendentes. Tem certeza que deseja sair?`;
        }
        
        if (confirm(message)) {
            // Save state before exiting
            savePedidosState();
            
            // Navigate back to main system
            window.location.href = 'index.html';
        }
    }
    
    // Initialize the application
    init();
});