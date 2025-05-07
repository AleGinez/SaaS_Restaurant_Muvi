// Script principal do MVP - Integrado com autenticação e módulo de pedidos
document.addEventListener('DOMContentLoaded', function() {
    // VERIFICAR AUTENTICAÇÃO PRIMEIRO
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Ativar debug para acompanhamento de carregamento
    const DEBUG = true;
    
    function debug(message) {
        if (DEBUG) {
            console.log(`[DEBUG] ${message}`);
        }
    }
    
    debug('Script principal inicializado');
    
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
        'usuarios': 'cadastro-usuario.html',
        'cadastro-funcionarios': 'cadastro.html'
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
    
    // =====================================
    // FUNÇÕES DE INICIALIZAÇÃO DE ELEMENTOS
    // =====================================
    
    // Inicializar elementos de navegação por tabs
    function setupTabNavigation() {
        debug('Inicializando navegação por tabs');
        const formTabs = document.querySelectorAll('.form-tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        if (formTabs.length === 0) {
            debug('Nenhuma tab encontrada para inicializar');
            return;
        }

        debug(`Encontradas ${formTabs.length} tabs e ${tabContents.length} conteúdos de tab`);
        
        formTabs.forEach(tab => {
            tab.addEventListener('click', function(event) {
                debug(`Tab clicada: ${this.textContent.trim()}`);
                event.preventDefault();
                
                // Remove active class from all tabs and hide content
                formTabs.forEach(t => {
                    t.classList.remove('active');
                    t.setAttribute('aria-selected', 'false');
                });
                
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    content.setAttribute('hidden', 'true');
                });
                
                // Add active class to clicked tab and show content
                this.classList.add('active');
                this.setAttribute('aria-selected', 'true');
                
                const tabId = this.getAttribute('aria-controls');
                const tabContent = document.getElementById(tabId);
                
                if (tabContent) {
                    tabContent.classList.add('active');
                    tabContent.removeAttribute('hidden');
                    debug(`Conteúdo da tab ativado: ${tabId}`);
                } else {
                    debug(`Erro: Conteúdo da tab não encontrado para id: ${tabId}`);
                }
            });
        });
    }
    
    // Configuração de upload de foto
    function setupPhotoUpload() {
        debug('Inicializando upload de foto');
        const photoInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
        
        photoInputs.forEach(photoInput => {
            const previewId = photoInput.getAttribute('data-preview') || photoInput.id + '-preview';
            const photoPreview = document.getElementById(previewId);
            
            if (!photoPreview) {
                debug(`Erro: Preview de foto não encontrado para input: ${photoInput.id}`);
                return;
            }
            
            photoInput.addEventListener('change', function() {
                const file = this.files[0];
                
                if (file) {
                    // Validate file type
                    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
                    if (!validTypes.includes(file.type)) {
                        showNotification('Por favor, selecione uma imagem válida (JPEG, PNG ou GIF)', 'error');
                        this.value = '';
                        return;
                    }
                    
                    // Validate file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        showNotification('A imagem deve ter no máximo 5MB', 'error');
                        this.value = '';
                        return;
                    }
                    
                    // Preview the image
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        photoPreview.src = e.target.result;
                        debug('Preview de foto atualizado');
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // Click on photo preview to trigger file input
            const formPhoto = photoPreview.closest('.form-photo');
            if (formPhoto) {
                formPhoto.addEventListener('click', function() {
                    photoInput.click();
                    debug('Clique na área de foto detectado');
                });
            }
        });
    }
    
    // Configuração de toggle de senha
    function setupPasswordToggle() {
        debug('Inicializando toggles de senha');
        const toggleButtons = document.querySelectorAll('[id^="btn-toggle-"]');
        
        toggleButtons.forEach(button => {
            // Extract the input ID from button ID (btn-toggle-senha -> senha)
            const inputId = button.id.replace('btn-toggle-', '');
            const input = document.getElementById(inputId);
            
            if (!input) {
                debug(`Erro: Campo de senha não encontrado para botão: ${button.id}`);
                return;
            }
            
            button.addEventListener('click', function() {
                debug(`Toggle de visibilidade para campo: ${inputId}`);
                if (input.type === 'password') {
                    input.type = 'text';
                    button.querySelector('i').classList.remove('fa-eye');
                    button.querySelector('i').classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    button.querySelector('i').classList.remove('fa-eye-slash');
                    button.querySelector('i').classList.add('fa-eye');
                }
            });
        });
        
        // Botões de gerar senha
        const gerarSenhaButtons = document.querySelectorAll('[id^="btn-gerar-senha"]');
        gerarSenhaButtons.forEach(button => {
            button.addEventListener('click', function() {
                debug('Gerando senha aleatória');
                const senha = generateRandomPassword();
                
                // Find password fields
                const senhaInput = document.getElementById('usuario-senha') || document.getElementById('funcionario-senha');
                const confirmarSenhaInput = document.getElementById('usuario-confirmar-senha') || document.getElementById('funcionario-confirmar-senha');
                
                if (senhaInput) senhaInput.value = senha;
                if (confirmarSenhaInput) confirmarSenhaInput.value = senha;
                
                showNotification('Senha aleatória gerada com sucesso', 'success');
            });
        });
    }
    
    // Gerar senha aleatória
    function generateRandomPassword() {
        const length = 10;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
        let password = '';
        
        // Ensure password has at least one uppercase, one lowercase, one number, and one special char
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        password += '0123456789'[Math.floor(Math.random() * 10)];
        password += '!@#$%^&*()-_=+'[Math.floor(Math.random() * 14)];
        
        // Fill the rest with random chars
        for (let i = 4; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        
        // Shuffle the password
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }
    
    // Configuração de grupos de permissões
    function setupPermissionGroups() {
        debug('Inicializando grupos de permissões');
        const selectAllButtons = document.querySelectorAll('.btn-select-all');
        
        selectAllButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const groupName = this.getAttribute('data-group');
                const permissionGroup = this.closest('.permission-group');
                
                if (!permissionGroup) {
                    debug(`Erro: Grupo de permissão não encontrado para botão: ${groupName}`);
                    return;
                }
                
                const checkboxes = permissionGroup.querySelectorAll('input[type="checkbox"]');
                
                // Check if all checkboxes are checked
                const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
                
                // Toggle all checkboxes
                checkboxes.forEach(checkbox => {
                    checkbox.checked = !allChecked;
                });
                
                // Update button text
                this.textContent = allChecked ? `Selecionar Todos` : `Desmarcar Todos`;
                debug(`Estado dos checkboxes alterado para: ${!allChecked ? 'todos marcados' : 'todos desmarcados'}`);
            });
        });
        
        // Update "Select All" button when individual permissions are changed
        document.querySelectorAll('.permission-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const permissionGroup = this.closest('.permission-group');
                updateSelectAllButton(permissionGroup);
            });
        });
    }
    
    // Atualizar botão de selecionar todos
    function updateSelectAllButton(permissionGroup) {
        if (!permissionGroup) return;
        
        const btn = permissionGroup.querySelector('.btn-select-all');
        const checkboxes = permissionGroup.querySelectorAll('input[type="checkbox"]');
        
        if (btn && checkboxes.length > 0) {
            const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
            btn.textContent = allChecked ? `Desmarcar Todos` : `Selecionar Todos`;
        }
    }
    
    // Configuração de formulários
    function setupForms() {
        debug('Inicializando formulários');
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            const saveBtn = form.querySelector('[type="submit"], #btn-salvar');
            const cancelBtn = form.querySelector('#btn-cancelar');
            const deleteBtn = form.querySelector('#btn-excluir-usuario, #btn-excluir-funcionario');
            
            if (saveBtn) {
                saveBtn.addEventListener('click', function(e) {
                    debug(`Botão salvar clicado para formulário: ${form.id}`);
                    e.preventDefault();
                    
                    if (validateForm(form)) {
                        showNotification('Salvando dados...', 'info');
                        
                        // Simulate API call
                        setTimeout(() => {
                            showNotification('Dados salvos com sucesso!', 'success');
                            try {
                                if (form.id === 'form-cadastro-funcionario' && window.funcionariosApp) {
                                    window.funcionariosApp.showListagem();
                                } else if (form.id === 'form-cadastro-usuario' && window.usuariosApp) {
                                    window.usuariosApp.showListagem();
                                } else {
                                    debug(`Não foi possível encontrar função de showListagem para o formulário: ${form.id}`);
                                }
                            } catch (err) {
                                debug(`Erro ao executar showListagem: ${err.message}`);
                                // Fallback if showListagem is not found
                                const listagemContainer = document.querySelector('.listagem-container');
                                const formContainer = document.querySelector('.card-container');
                                if (listagemContainer && formContainer) {
                                    formContainer.classList.add('hidden');
                                    listagemContainer.classList.remove('hidden');
                                }
                            }
                        }, 1000);
                    }
                });
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function(e) {
                    debug(`Botão cancelar clicado para formulário: ${form.id}`);
                    e.preventDefault();
                    
                    if (confirm('Tem certeza que deseja cancelar? Todas as alterações serão perdidas.')) {
                        try {
                            if (form.id === 'form-cadastro-funcionario' && window.funcionariosApp) {
                                window.funcionariosApp.showListagem();
                            } else if (form.id === 'form-cadastro-usuario' && window.usuariosApp) {
                                window.usuariosApp.showListagem();
                            } else {
                                debug(`Não foi possível encontrar função de showListagem para o formulário: ${form.id}`);
                            }
                        } catch (err) {
                            debug(`Erro ao executar showListagem: ${err.message}`);
                            // Fallback if showListagem is not found
                            const listagemContainer = document.querySelector('.listagem-container');
                            const formContainer = document.querySelector('.card-container');
                            if (listagemContainer && formContainer) {
                                formContainer.classList.add('hidden');
                                listagemContainer.classList.remove('hidden');
                            }
                        }
                    }
                });
            }
            
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function(e) {
                    debug(`Botão excluir clicado para formulário: ${form.id}`);
                    e.preventDefault();
                    
                    // Open delete confirmation modal
                    const modal = document.getElementById('modal-confirmar-deletar');
                    if (modal) {
                        modal.style.display = 'flex';
                    } else {
                        if (confirm('Tem certeza que deseja excluir este registro?')) {
                            showNotification('Excluindo registro...', 'info');
                            
                            setTimeout(() => {
                                showNotification('Registro excluído com sucesso!', 'success');
                                try {
                                    if (form.id === 'form-cadastro-funcionario' && window.funcionariosApp) {
                                        window.funcionariosApp.showListagem();
                                    } else if (form.id === 'form-cadastro-usuario' && window.usuariosApp) {
                                        window.usuariosApp.showListagem();
                                    }
                                } catch (err) {
                                    // Fallback if showListagem is not found
                                    const listagemContainer = document.querySelector('.listagem-container');
                                    const formContainer = document.querySelector('.card-container');
                                    if (listagemContainer && formContainer) {
                                        formContainer.classList.add('hidden');
                                        listagemContainer.classList.remove('hidden');
                                    }
                                }
                            }, 1000);
                        }
                    }
                });
            }
        });
    }
    
    // Validate form
    function validateForm(form) {
        let isValid = true;
        let firstInvalidField = null;
        
        // Get all required inputs
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                markInvalid(field);
                
                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
            } else {
                // Check for specific validations
                if (field.type === 'email' && !validateEmail(field.value)) {
                    isValid = false;
                    markInvalid(field);
                    if (!firstInvalidField) {
                        firstInvalidField = field;
                    }
                } else {
                    markValid(field);
                }
            }
        });
        
        // Check password confirmation
        const senhaInput = form.querySelector('#usuario-senha, #funcionario-senha');
        const confirmarSenhaInput = form.querySelector('#usuario-confirmar-senha, #funcionario-confirmar-senha');
        
        if (senhaInput && confirmarSenhaInput && senhaInput.value && confirmarSenhaInput.value) {
            if (senhaInput.value !== confirmarSenhaInput.value) {
                isValid = false;
                markInvalid(senhaInput);
                markInvalid(confirmarSenhaInput);
                
                if (!firstInvalidField) {
                    firstInvalidField = senhaInput;
                }
                
                showNotification('As senhas não conferem', 'error');
            }
        }
        
        // Focus first invalid field
        if (firstInvalidField) {
            firstInvalidField.focus();
            
            // Activate tab containing the invalid field
            const tabContent = firstInvalidField.closest('.tab-content');
            if (tabContent) {
                const tabId = tabContent.id;
                const tab = document.querySelector(`[aria-controls="${tabId}"]`);
                if (tab) {
                    tab.click();
                }
            }
        }
        
        return isValid;
    }
    
    // Mark field as invalid
    function markInvalid(field) {
        field.classList.add('is-invalid');
        field.classList.remove('is-valid');
        
        // Create or update error message
        let errorMsg = field.nextElementSibling;
        if (!errorMsg || !errorMsg.classList.contains('error-message')) {
            errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            field.parentNode.insertBefore(errorMsg, field.nextSibling);
        }
        
        // Get field label
        const fieldLabel = field.closest('.form-group')?.querySelector('label')?.textContent || 'Este campo';
        
        // Set error message based on field type
        if (field.type === 'email') {
            errorMsg.textContent = 'Formato de email inválido';
        } else {
            errorMsg.textContent = `${fieldLabel} é obrigatório`;
        }
    }
    
    // Mark field as valid
    function markValid(field) {
        field.classList.remove('is-invalid');
        field.classList.add('is-valid');
        
        // Remove error message if exists
        const errorMsg = field.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains('error-message')) {
            errorMsg.remove();
        }
    }
    
    // Validate email format
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Configurar ações nas linhas de tabela
    function setupTableRows() {
        debug('Configurando ações das linhas de tabela');
        
        // Edit buttons
        document.querySelectorAll('.action-btn .fa-edit').forEach(btn => {
            btn.parentElement.addEventListener('click', function() {
                const row = this.closest('tr');
                const nome = row.querySelector('.user-name')?.textContent;
                
                debug(`Botão editar clicado para: ${nome}`);
                
                const listagemContainer = document.querySelector('.listagem-container');
                const formContainer = document.querySelector('.card-container');
                
                if (listagemContainer && formContainer) {
                    listagemContainer.classList.add('hidden');
                    formContainer.classList.remove('hidden');
                    
                    // Fill form with data
                    const nomeInput = document.getElementById('usuario-nome') || document.getElementById('funcionario-nome');
                    if (nomeInput && nome) nomeInput.value = nome;
                    
                    // Update URL
                    const url = new URL(window.location);
                    url.searchParams.set('action', 'edit');
                    url.searchParams.set('id', '1'); // Demo ID
                    window.history.pushState({}, '', url);
                    
                    showNotification(`Editando: ${nome}`, 'info');
                }
            });
        });
        
        // View buttons
        document.querySelectorAll('.action-btn .fa-eye').forEach(btn => {
            btn.parentElement.addEventListener('click', function() {
                const row = this.closest('tr');
                const nome = row.querySelector('.user-name')?.textContent;
                
                debug(`Botão visualizar clicado para: ${nome}`);
                showNotification(`Visualizando detalhes de: ${nome}`, 'info');
            });
        });
    }
    
    // Configurar botões de filtro
    function setupFilters() {
        debug('Configurando filtros');
        
        const filterSelects = document.querySelectorAll('.filtro-item select');
        
        filterSelects.forEach(select => {
            select.addEventListener('change', function() {
                filterTable();
            });
        });
        
        const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', function() {
                filterSelects.forEach(select => {
                    select.value = 'todos';
                });
                filterTable();
                showNotification('Filtros limpos', 'info');
            });
        }
    }
    
    // Filtrar tabela
    function filterTable() {
        debug('Aplicando filtros à tabela');
        
        const statusFilter = document.getElementById('filtro-status')?.value || 'todos';
        const perfilFilter = document.getElementById('filtro-perfil')?.value || 'todos';
        const cargoFilter = document.getElementById('filtro-cargo')?.value || 'todos';
        const departamentoFilter = document.getElementById('filtro-departamento')?.value || 'todos';
        
        // Lista de tabelas possíveis
        const tables = [
            document.getElementById('tabela-usuarios'),
            document.getElementById('tabela-funcionarios')
        ];
        
        // Filtrar cada tabela
        tables.forEach(table => {
            if (!table) return;
            
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                let showRow = true;
                
                // Verificar filtro de status
                if (statusFilter !== 'todos') {
                    const statusCell = row.querySelector('.status-badge');
                    if (statusCell) {
                        const status = statusCell.textContent.toLowerCase();
                        if (status !== statusFilter) {
                            showRow = false;
                        }
                    }
                }
                
                // Verificar filtro de perfil/cargo
                if (perfilFilter !== 'todos' || cargoFilter !== 'todos') {
                    const roleCell = row.querySelector('.user-role');
                    if (roleCell) {
                        const role = roleCell.textContent.toLowerCase();
                        
                        if (perfilFilter !== 'todos' && role !== perfilFilter) {
                            showRow = false;
                        }
                        
                        if (cargoFilter !== 'todos' && role !== cargoFilter) {
                            showRow = false;
                        }
                    }
                }
                
                // Verificar filtro de departamento
                if (departamentoFilter !== 'todos') {
                    // Assumindo que o departamento está na terceira coluna (ajuste se necessário)
                    const deptCell = row.cells[2];
                    if (deptCell) {
                        const dept = deptCell.textContent.toLowerCase();
                        if (dept !== departamentoFilter) {
                            showRow = false;
                        }
                    }
                }
                
                // Exibir ou ocultar linha
                row.style.display = showRow ? '' : 'none';
            });
            
            // Atualizar informação de contagem
            const tableInfo = table.parentElement.querySelector('.table-info');
            if (tableInfo) {
                const visibleCount = table.querySelectorAll('tbody tr:not([style*="display: none"])').length;
                const totalCount = table.querySelectorAll('tbody tr').length;
                tableInfo.textContent = `Mostrando ${visibleCount} de ${totalCount} registros`;
            }
        });
    }
    
    // Configurar modais
    function setupModals() {
        debug('Configurando modais');
        
        const modals = document.querySelectorAll('.modal-container');
        
        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal-container');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Confirm delete buttons
        document.querySelectorAll('#btn-confirmar-excluir').forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal-container');
                
                showNotification('Excluindo registro...', 'info');
                
                setTimeout(() => {
                    showNotification('Registro excluído com sucesso!', 'success');
                    
                    if (modal) {
                        modal.style.display = 'none';
                    }
                    
                    // Show listing
                    const listagemContainer = document.querySelector('.listagem-container');
                    const formContainer = document.querySelector('.card-container');
                    
                    if (listagemContainer && formContainer) {
                        formContainer.classList.add('hidden');
                        listagemContainer.classList.remove('hidden');
                    }
                }, 1000);
            });
        });
        
        // Close on outside click
        window.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal-container')) {
                e.target.style.display = 'none';
            }
        });
        
        // Close on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                modals.forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });
    }
    
    // Inicializar todos os elementos interativos
    function initializeInteractiveElements() {
        debug('Inicializando elementos interativos');
        
        // Inicializar navegação por tabs
        setupTabNavigation();
        
        // Inicializar upload de fotos
        setupPhotoUpload();
        
        // Inicializar toggles de senha
        setupPasswordToggle();
        
        // Inicializar grupos de permissões
        setupPermissionGroups();
        
        // Inicializar formulários
        setupForms();
        
        // Inicializar ações das linhas de tabela
        setupTableRows();
        
        // Inicializar filtros
        setupFilters();
        
        // Inicializar modais
        setupModals();
        
        // Inicializar outros módulos específicos se existirem
        if (currentPage === 'cadastro-funcionarios' && window.funcionariosApp) {
            debug('Inicializando módulo de funcionários');
            try {
                if (typeof window.funcionariosApp.init === 'function') {
                    window.funcionariosApp.init();
                }
            } catch (err) {
                debug(`Erro ao inicializar módulo de funcionários: ${err.message}`);
            }
        } else if (currentPage === 'usuarios' && window.usuariosApp) {
            debug('Inicializando módulo de usuários');
            try {
                if (typeof window.usuariosApp.init === 'function') {
                    window.usuariosApp.init();
                }
            } catch (err) {
                debug(`Erro ao inicializar módulo de usuários: ${err.message}`);
            }
        } else if (currentPage === 'pedidos' && window.pedidosApp) {
            debug('Inicializando módulo de pedidos');
            try {
                if (typeof window.pedidosApp.init === 'function') {
                    window.pedidosApp.init();
                }
            } catch (err) {
                debug(`Erro ao inicializar módulo de pedidos: ${err.message}`);
            }
        }
        
        debug('Inicialização de elementos interativos concluída');
    }
    
    // Função para carregar uma página específica
    function loadPage(pageName) {
        // Valida se a página solicitada existe no mapeamento
        if (!pageMap[pageName]) {
            console.warn(`Página '${pageName}' não encontrada no mapeamento. Redirecionando para o dashboard.`);
            pageName = 'dashboard';
        }
        
        debug(`Carregando página: ${pageName}`);
        
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
        
        // Tratamento para carregamento de páginas dinâmicas
        // Carregando via fetch para permitir uso posterior
        fetch(pageMap[pageName])
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                debug(`HTML da página ${pageName} carregado com sucesso`);
                
                // Criar um parser para extrair o conteúdo relevante
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                // Extrair o conteúdo da área de conteúdo
                const pageContent = doc.querySelector('.content-area');
                
                if (pageContent) {
                    // Inserir o conteúdo no contentArea
                    contentArea.innerHTML = pageContent.innerHTML;
                    
                    // Carregar CSS específico da página se necessário
                    let cssLoaded = false;
                    if (pageName === 'pedidos' && !document.querySelector('link[href="pedidos.css"]')) {
                        const linkCss = document.createElement('link');
                        linkCss.rel = 'stylesheet';
                        linkCss.href = 'pedidos.css';
                        document.head.appendChild(linkCss);
                        cssLoaded = true;
                    }
                    
                    // Carregar script específico da página
                    let scriptFile = null;
                    if (pageName === 'pedidos') {
                        scriptFile = 'pedidos.js';
                    } else if (pageName === 'cadastro-funcionarios') {
                        scriptFile = 'cadastro.js';
                    } else if (pageName === 'usuarios') {
                        scriptFile = 'cadastro-usuario.js';
                    }
                    
                    if (scriptFile && !document.querySelector(`script[src="${scriptFile}"]`)) {
                        debug(`Carregando script específico: ${scriptFile}`);
                        const scriptJs = document.createElement('script');
                        scriptJs.src = scriptFile;
                        
                        // Adicionar event listener para verificar se o script foi carregado
                        scriptJs.onload = function() {
                            debug(`Script ${scriptFile} carregado com sucesso`);
                            // Inicializar elementos interativos após carregar o script
                            setTimeout(() => {
                                initializeInteractiveElements();
                            }, 100);
                        };
                        
                        scriptJs.onerror = function() {
                            debug(`Erro ao carregar script: ${scriptFile}`);
                            showNotification(`Erro ao carregar recursos da página ${pageName}`, 'error');
                        };
                        
                        document.body.appendChild(scriptJs);
                    } else {
                        // Inicializar elementos interativos mesmo sem script específico
                        setTimeout(() => {
                            initializeInteractiveElements();
                        }, 100);
                    }
                    
                    // Atualizar o menu ativo
                    updateActiveMenu(pageName);
                } else {
                    // Fallback se não conseguir extrair o conteúdo corretamente
                    debug(`Erro: Não foi possível encontrar o conteúdo principal na página ${pageName}`);
                    contentArea.innerHTML = `
                        <div class="page-header">
                            <h1>${formatPageTitle(pageName)}</h1>
                            <div class="breadcrumb">
                                <span>Home</span> / <span>${formatPageTitle(pageName)}</span>
                            </div>
                        </div>
                        <div class="error-message">
                            <h2>Erro ao carregar a página</h2>
                            <p>Não foi possível carregar corretamente o conteúdo da página.</p>
                            <button class="btn" onclick="window.location.reload()">Tentar Novamente</button>
                        </div>
                    `;
                }
            })
            .catch(error => {
                debug(`Erro ao carregar a página ${pageName}: ${error.message}`);
                
                // Template para página em construção
                const pageTitle = formatPageTitle(pageName);
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
                
                // Páginas específicas
                if (pageName === 'mapa-mesas') {
                    pageContent = getMapaMesasTemplate();
                }
                
                contentArea.innerHTML = pageContent;
                updateActiveMenu(pageName);
            })
            .finally(() => {
                // Esconder o indicador de carregamento
                loadingIndicator.style.display = 'none';
                
                // Atualizar a URL
                updateUrl(pageName);
                
                // Adicionar botão de inicialização manual em modo de debug
                if (DEBUG) {
                    addInitButton();
                }
            });
    }
    
    // Adiciona um botão de inicialização manual para debugging
    function addInitButton() {
        // Verifica se o botão já existe
        if (document.getElementById('btn-init-manual')) {
            return;
        }
        
        const btn = document.createElement('button');
        btn.id = 'btn-init-manual';
        btn.textContent = 'Inicializar Interatividade';
        btn.className = 'btn btn-primary';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = '9999';
        
        btn.addEventListener('click', function() {
            debug('Inicialização manual solicitada');
            initializeInteractiveElements();
            showNotification('Elementos interativos inicializados manualmente', 'info');
        });
        
        document.body.appendChild(btn);
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
            debug(`Link clicado para página: ${pageName}`);
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
                
                /* Estilos para mensagem de erro */
                .error-message {
                    background-color: #fff3f3;
                    border: 1px solid #ffcdd2;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                }
                
                .error-message h2 {
                    color: #d32f2f;
                    margin-bottom: 10px;
                }
                
                /* Estilos para o botão de inicialização manual em modo de debug */
                #btn-init-manual {
                    opacity: 0.8;
                    transition: opacity 0.3s ease;
                }
                
                #btn-init-manual:hover {
                    opacity: 1;
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
    
    // Expõe funções importantes globalmente para debugging
    window.appUtils = {
        loadPage,
        showNotification,
        initializeInteractiveElements,
        debug
    };
});