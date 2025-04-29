// JavaScript para a tela touch da Cozinha
document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const currentTimeElement = document.getElementById('current-time');
    const btnAtualizar = document.getElementById('btn-atualizar');
    const btnConfiguracoes = document.getElementById('btn-configuracoes');
    const btnVoltar = document.getElementById('btn-voltar');
    const cozinhaTabs = document.querySelectorAll('.cozinha-tab');
    const filterTipo = document.getElementById('filter-tipo');
    const viewButtons = document.querySelectorAll('.view-btn');
    const pedidosContainer = document.getElementById('pedidos-container');
    const statusButtons = document.querySelectorAll('.btn-status');
    
    // Atualiza o relógio em tempo real
    function updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    // Inicia o relógio e atualiza a cada segundo
    updateClock();
    setInterval(updateClock, 1000);
    
    // Filtro por tabs (Todos, Pendentes, Em Preparo, etc)
    cozinhaTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove a classe active de todas as tabs
            cozinhaTabs.forEach(t => t.classList.remove('active'));
            
            // Adiciona a classe active à tab clicada
            this.classList.add('active');
            
            // Filtra os pedidos com base no valor do atributo data-filter
            const filter = this.getAttribute('data-filter');
            filterPedidos('status', filter);
        });
    });
    
    // Filtro por tipo de pedido (Mesa, Viagem, Delivery)
    filterTipo.addEventListener('change', function() {
        filterPedidos('tipo', this.value);
    });
    
    // Troca entre visualização de cards e lista
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove a classe active de todos os botões de view
            viewButtons.forEach(btn => btn.classList.remove('active'));
            
            // Adiciona a classe active ao botão clicado
            this.classList.add('active');
            
            // Obtém o valor do atributo data-view
            const viewType = this.getAttribute('data-view');
            
            // Aplica a visualização correspondente
            if (viewType === 'list') {
                pedidosContainer.classList.add('list-view');
            } else {
                pedidosContainer.classList.remove('list-view');
            }
        });
    });
    
    // Atualizar Status dos Pedidos
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-status') || e.target.closest('.btn-status')) {
            const button = e.target.classList.contains('btn-status') ? e.target : e.target.closest('.btn-status');
            
            // Não faz nada se estiver desabilitado
            if (button.classList.contains('disabled')) {
                return;
            }
            
            const pedidoId = button.getAttribute('data-pedido');
            const action = button.getAttribute('data-action');
            
            // Encontra o card do pedido
            const pedidoCard = document.querySelector(`.pedido-card[data-pedido-id="${pedidoId}"]`);
            
            // Processa a ação
            processarAcao(pedidoCard, action);
        }
    });
    
    // Função para processar a ação nos pedidos
    function processarAcao(pedidoCard, action) {
        // Remove todas as classes de status
        pedidoCard.classList.remove('pendente', 'em-preparo', 'pronto', 'entregue');
        
        // Atualiza o status com base na ação
        const statusElement = pedidoCard.querySelector('.pedido-status');
        
        // Desabilita todos os botões e depois ativa apenas os relevantes
        const buttons = pedidoCard.querySelectorAll('.btn-status');
        buttons.forEach(btn => btn.classList.add('disabled'));
        
        if (action === 'iniciar') {
            pedidoCard.classList.add('em-preparo');
            statusElement.textContent = 'Em Preparo';
            statusElement.className = 'pedido-status em-preparo';
            
            // Ativa os botões relevantes
            pedidoCard.querySelector('.btn-concluir').classList.remove('disabled');
            
            showNotification('Pedido iniciado com sucesso!');
        } 
        else if (action === 'concluir') {
            pedidoCard.classList.add('pronto');
            statusElement.textContent = 'Pronto';
            statusElement.className = 'pedido-status pronto';
            
            // Ativa os botões relevantes
            pedidoCard.querySelector('.btn-entregar').classList.remove('disabled');
            
            showNotification('Pedido concluído com sucesso!');
        } 
        else if (action === 'entregar') {
            pedidoCard.classList.add('entregue');
            statusElement.textContent = 'Entregue';
            statusElement.className = 'pedido-status entregue';
            
            showNotification('Pedido marcado como entregue!');
        }
        
        // Atualiza as estatísticas
        updateEstatisticas();
        
        // Em um sistema real, aqui enviaria uma requisição para o servidor
        console.log(`Pedido #${pedidoCard.getAttribute('data-pedido-id')} - Ação: ${action}`);
        
        // Simula um highlight temporário no card
        pedidoCard.classList.add('highlight-success');
        setTimeout(() => {
            pedidoCard.classList.remove('highlight-success');
        }, 2000);
    }
    
    // Função para filtrar pedidos
    function filterPedidos(filterType, value) {
        const pedidos = document.querySelectorAll('.pedido-card');
        
        pedidos.forEach(pedido => {
            pedido.style.display = 'flex'; // Resetar display
            
            if (value === 'todos') {
                return; // Mostra todos
            }
            
            if (filterType === 'status') {
                // Filtrar por status (pendente, em-preparo, etc)
                if (!pedido.classList.contains(value)) {
                    pedido.style.display = 'none';
                }
            } 
            else if (filterType === 'tipo') {
                // Filtrar por tipo (mesa, viagem, delivery)
                const pedidoTipo = pedido.getAttribute('data-tipo');
                if (pedidoTipo !== value && value !== 'todos') {
                    pedido.style.display = 'none';
                }
            }
        });
    }
    
    // Função para mostrar notificações
    function showNotification(message, type = 'success') {
        // Remove qualquer notificação existente
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Cria uma nova notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type === 'error' ? 'notification-error' : type === 'info' ? 'notification-info' : ''}`;
        notification.textContent = message;
        
        // Adiciona ao DOM
        document.body.appendChild(notification);
        
        // Mostra a notificação
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Esconde e remove após alguns segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    // Função para atualizar as estatísticas na barra inferior
    function updateEstatisticas() {
        const pendentes = document.querySelectorAll('.pedido-card.pendente').length;
        const emPreparo = document.querySelectorAll('.pedido-card.em-preparo').length;
        const prontos = document.querySelectorAll('.pedido-card.pronto').length;
        
        const estatItems = document.querySelectorAll('.estat-valor');
        estatItems[0].textContent = pendentes;
        estatItems[1].textContent = emPreparo;
        estatItems[2].textContent = prontos;
    }
    
    // Botão Atualizar
    btnAtualizar.addEventListener('click', function() {
        // Simula atualização da página
        showNotification('Buscando novos pedidos...', 'info');
        
        // Em um sistema real, aqui faria uma requisição AJAX para buscar novos pedidos
        
        // Simula carregamento
        setTimeout(() => {
            showNotification('Pedidos atualizados!');
        }, 1000);
    });
    
    // Botão Configurações
    btnConfiguracoes.addEventListener('click', function() {
        // Abre modal de configurações
        alert('Modal de configurações seria exibido aqui');
    });
    
    // Botão Voltar
    btnVoltar.addEventListener('click', function() {
        // Confirma se deseja sair
        if (confirm('Deseja realmente sair da tela da cozinha?')) {
            window.location.href = 'index.html';
        }
    });
    
    // Inicialização
    updateEstatisticas();
    
    // Mostra notificação inicial
    showNotification('Painel da Cozinha iniciado com sucesso!');
});
