/**
 * Recanto Rancho do Peixe - Kitchen Panel
 * Tablet-optimized JavaScript for kitchen operations
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
    const cozinhaTabs = document.querySelectorAll('.cozinha-tab');
    const filterToggle = document.getElementById('filter-toggle');
    const filterControls = document.getElementById('filter-controls');
    const filterTipo = document.getElementById('filter-tipo');
    const filterPrioridade = document.getElementById('filter-prioridade');
    const sortOption = document.getElementById('sort-option');
    const searchInput = document.getElementById('search-pedido');
    const btnSearch = document.getElementById('btn-search');
    const viewButtons = document.querySelectorAll('.view-btn');
    const pedidosContainer = document.getElementById('pedidos-container');
    const expandButtons = document.querySelectorAll('.btn-expand');
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    const btnRelatorio = document.getElementById('btn-relatorio');
    const btnImprimir = document.getElementById('btn-imprimir');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalDetalhesPedido = document.getElementById('modal-detalhes-pedido');
    const modalConfiguracoes = document.getElementById('modal-configuracoes');
    const swipeGuide = document.getElementById('swipe-guide');
    const btnDismissGuide = document.querySelector('.btn-dismiss');
    const tabsContainer = document.getElementById('tabs-container');
    const offlineIndicator = document.getElementById('offline-indicator');
    const notificationsContainer = document.getElementById('notifications-container');
    
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
        activeFilter: 'todos',
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
    
    // Initialize with stored preferences
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
        
        // Update tab counters
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
    // EVENT LISTENERS
    // ===================================================================
    function setupEventListeners() {
        // Tab filters
        cozinhaTabs.forEach(tab => {
            tab.addEventListener('click', handleTabClick);
        });
        
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
        
        // View toggle
        viewButtons.forEach(button => {
            button.addEventListener('click', toggleView);
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
        
        // Prevent default browser refresh on pull-to-refresh on mobile
        document.addEventListener('touchmove', function(e) {
            if (document.querySelector('.cozinha-content').scrollTop === 0 && e.touches[0].clientY > 0) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Prevent double-tap zoom on iOS
        document.addEventListener('dblclick', function(e) {
            e.preventDefault();
        }, { passive: false });
    }
    
    // ===================================================================
    // CLOCK & TIME FUNCTIONS
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
    
    // ===================================================================
    // INTERACTION HANDLERS
    // ===================================================================
    
    // Handle tab click for filtering
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
        state.activeFilter = this.getAttribute('data-filter');
        
        // Apply filters
        applyFilters();
        
        // Update URL hash for bookmark support
        window.location.hash = `filter-${state.activeFilter}`;
    }
    
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
        
        // Get all pedido cards
        const pedidoCards = document.querySelectorAll('.pedido-card');
        
        // Count visible cards
        let visibleCount = 0;
        
        // Apply filters to each card
        pedidoCards.forEach(card => {
            let visible = true;
            
            // Status filter
            if (state.activeFilter !== 'todos' && !card.classList.contains(state.activeFilter)) {
                visible = false;
            }
            
            // Type filter
            if (state.activeTipoFilter !== 'todos') {
                const cardTipo = card.getAttribute('data-tipo');
                if (cardTipo !== state.activeTipoFilter) {
                    visible = false;
                }
            }
            
            // Priority filter
            if (state.activePrioridadeFilter !== 'todos') {
                const cardPrioridade = card.getAttribute('data-prioridade');
                if (cardPrioridade !== state.activePrioridadeFilter) {
                    visible = false;
                }
            }
            
            // Search filter
            if (state.searchQuery) {
                const cardContent = card.textContent.toLowerCase();
                if (!cardContent.includes(state.searchQuery.toLowerCase())) {
                    visible = false;
                }
            }
            
            // Apply visibility
            card.style.display = visible ? '' : 'none';
            
            // Count visible cards
            if (visible) visibleCount++;
        });
        
        // Check if no results and display message
        checkEmptyResults(visibleCount);
        
        // Update counters
        updateCounters();
    }
    
    // Apply sorting to orders
    function applySort() {
        if (!sortOption) return;
        
        state.activeSort = sortOption.value;
        const pedidosGrid = document.querySelector('.pedidos-grid');
        if (!pedidosGrid) return;
        
        const pedidoCards = Array.from(document.querySelectorAll('.pedido-card'));
        
        // Sort cards based on criteria
        pedidoCards.sort((a, b) => {
            switch (state.activeSort) {
                case 'time-asc': // Oldest first
                    return parseInt(a.getAttribute('data-tempo')) - parseInt(b.getAttribute('data-tempo'));
                case 'time-desc': // Newest first
                    return parseInt(b.getAttribute('data-tempo')) - parseInt(a.getAttribute('data-tempo'));
                case 'priority': // By priority (alta, normal, baixa)
                    const priorityOrder = { 'alta': 0, 'normal': 1, 'baixa': 2 };
                    const aPriority = a.getAttribute('data-prioridade') || 'normal';
                    const bPriority = b.getAttribute('data-prioridade') || 'normal';
                    
                    // If same priority, sort by time
                    if (priorityOrder[aPriority] === priorityOrder[bPriority]) {
                        return parseInt(a.getAttribute('data-tempo')) - parseInt(b.getAttribute('data-tempo'));
                    }
                    
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
    
    // Perform search based on input
    function performSearch() {
        if (!searchInput) return;
        
        state.searchQuery = searchInput.value.trim();
        applyFilters();
    }
    
    // Toggle view between cards and list
    function toggleView() {
        // Remove active class from all buttons
        viewButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        
        // Add active class to clicked button
        this.classList.add('active');
        this.setAttribute('aria-pressed', 'true');
        
        // Toggle view class on pedidos container
        const viewType = this.getAttribute('data-view');
        const pedidosGrid = document.querySelector('.pedidos-grid');
        
        if (pedidosGrid) {
            if (viewType === 'list') {
                pedidosGrid.classList.add('list-view');
            } else {
                pedidosGrid.classList.remove('list-view');
            }
            
            // Save preference
            localStorage.setItem('viewMode', viewType);
        }
    }
    
    // Toggle expanded/collapsed state of order items
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
    // ORDER ACTION HANDLERS
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
        const currentAction = getActionFromStatus(currentStatus);
        
        // Apply new status based on action
        switch (action) {
            case 'iniciar':
                updateToPreparing(pedidoCard, statusElement);
                playSound('newOrder');
                break;
                
            case 'concluir':
                updateToReady(pedidoCard, statusElement);
                playSound('orderComplete');
                break;
                
            case 'entregar':
                updateToDelivered(pedidoCard, statusElement);
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
    
    // Get action from status
    function getActionFromStatus(status) {
        switch (status) {
            case 'pendente':
                return 'iniciar';
            case 'em preparo':
                return 'concluir';
            case 'pronto':
                return 'entregar';
            default:
                return '';
        }
    }
    
    // ===================================================================
    // MODAL HANDLERS
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
    // DATA ACTIONS
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
            
            // Show completion notification
            showNotification('Dados atualizados com sucesso!', 'success');
        }, 1500);
    }
    
    // Confirm exit from kitchen module
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
    
    // Print all currently visible orders
    function printOrders() {
        // In a real app, we might want to set up a special print layout
        // For now, just use browser print
        window.print();
    }
    
    // Print a single order ticket
    function printOrderTicket(pedidoId) {
        // In a real app, we'd create a print-specific view for one order
        // For this demo, just show a confirmation
        showNotification(`Imprimindo comanda do pedido #${pedidoId}`, 'success');
    }
    
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
    
    // ===================================================================
    // OFFLINE FUNCTIONALITY
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
    // UTILITY FUNCTIONS
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
    
    // Update counters in tabs and footer
    function updateCounters() {
        // Get counts by status
        const countPendente = document.querySelectorAll('.pedido-card.pendente:not([style*="none"])').length;
        const countEmPreparo = document.querySelectorAll('.pedido-card.em-preparo:not([style*="none"])').length;
        const countPronto = document.querySelectorAll('.pedido-card.pronto:not([style*="none"])').length;
        const countEntregue = document.querySelectorAll('.pedido-card.entregue:not([style*="none"])').length;
        const countTotal = countPendente + countEmPreparo + countPronto + countEntregue;
        
        // Update tab counters
        updateTabCounter('counter-todos', countTotal);
        updateTabCounter('counter-pendente', countPendente);
        updateTabCounter('counter-em-preparo', countEmPreparo);
        updateTabCounter('counter-pronto', countPronto);
        updateTabCounter('counter-entregue', countEntregue);
        
        // Update footer statistics
        updateStatValue('.estat-item:nth-child(1) .estat-valor', countPendente);
        updateStatValue('.estat-item:nth-child(2) .estat-valor', countEmPreparo);
        updateStatValue('.estat-item:nth-child(3) .estat-valor', countPronto);
    }
    
    // Update tab counter
    function updateTabCounter(id, count) {
        const counter = document.getElementById(id);
        if (counter) {
            counter.textContent = count;
            
            // Animate if count changes
            if (counter.getAttribute('data-prev-count') !== count.toString()) {
                counter.classList.add('count-changed');
                setTimeout(() => {
                    counter.classList.remove('count-changed');
                }, 500);
                
                counter.setAttribute('data-prev-count', count.toString());
            }
        }
    }
    
    // Update stat value
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
    
    // Check for empty results and display message
    function checkEmptyResults(visibleCount) {
        // Get active tab content
        const tabContent = document.querySelector('.tab-content.active');
        if (!tabContent) return;
        
        // Check for existing empty state
        let emptyState = tabContent.querySelector('.empty-state');
        
        if (visibleCount === 0) {
            // If no empty state exists, create one
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = `
                    <i class="fas fa-search" aria-hidden="true"></i>
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Não há pedidos correspondentes aos filtros selecionados.</p>
                    <button class="btn btn-primary btn-touch" id="btn-limpar-filtros">
                        <i class="fas fa-sync" aria-hidden="true"></i> Limpar Filtros
                    </button>
                `;
                
                // Add to tab content
                tabContent.appendChild(emptyState);
                
                // Add event listener to reset button
                const resetBtn = emptyState.querySelector('#btn-limpar-filtros');
                if (resetBtn) {
                    resetBtn.addEventListener('click', resetFilters);
                }
            }
        } else {
            // Remove empty state if it exists
            if (emptyState) {
                emptyState.remove();
            }
        }
    }
    
    // Reset all filters to default
    function resetFilters() {
        // Reset tab selection
        const allTab = document.querySelector('.cozinha-tab[data-filter="todos"]');
        if (allTab) {
            allTab.click();
        }
        
        // Reset dropdowns
        if (filterTipo) filterTipo.value = 'todos';
        if (filterPrioridade) filterPrioridade.value = 'todos';
        if (sortOption) sortOption.value = 'time-asc';
        
        // Clear search
        if (searchInput) {
            searchInput.value = '';
            state.searchQuery = '';
        }
        
        // Apply reset
        applyFilters();
        applySort();
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
    
    // Initialize the application
    init();
});