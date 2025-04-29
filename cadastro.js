/**
 * Recanto Rancho do Peixe - Cadastro de Funcionários
 * JavaScript para o módulo de cadastro de funcionários
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // ===================================================================
    // ELEMENT REFERENCES
    // ===================================================================
    // Tab navigation elements
    const formTabs = document.querySelectorAll('.form-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Form elements
    const form = document.getElementById('form-cadastro-funcionario');
    const btnSalvar = document.getElementById('btn-salvar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const btnExcluir = document.getElementById('btn-excluir-funcionario');
    const btnNovoFuncionario = document.getElementById('btn-novo-funcionario');
    
    // Photo upload elements
    const photoInput = document.getElementById('funcionario-foto');
    const photoPreview = document.getElementById('funcionario-foto-preview');
    
    // Password field elements
    const btnToggleSenha = document.getElementById('btn-toggle-senha');
    const btnToggleConfirmarSenha = document.getElementById('btn-toggle-confirmar-senha');
    const btnGerarSenha = document.getElementById('btn-gerar-senha');
    const senhaInput = document.getElementById('funcionario-senha');
    const confirmarSenhaInput = document.getElementById('funcionario-confirmar-senha');
    
    // Permission group elements
    const btnSelectAll = document.querySelectorAll('.btn-select-all');
    
    // Listagem
    const listagemContainer = document.getElementById('listagem-funcionarios');
    const cadastroContainer = document.querySelector('.card-container');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    
    // Status filters
    const filtroStatus = document.getElementById('filtro-status');
    const filtroCargo = document.getElementById('filtro-cargo');
    const filtroDepartamento = document.getElementById('filtro-departamento');
    
    // Modals
    const modalConfirmarDeletar = document.getElementById('modal-confirmar-deletar');
    const btnConfirmarExcluir = document.getElementById('btn-confirmar-excluir');
    const modalCloseBtns = document.querySelectorAll('.modal-close, .modal-close-btn');
    
    // ===================================================================
    // INITIALIZATION
    // ===================================================================
    // Initialize the application
    function init() {
        // Setup event listeners
        setupTabNavigation();
        setupPhotoUpload();
        setupPasswordToggle();
        setupPermissionGroups();
        setupFormSubmission();
        setupListagem();
        setupStatusFilters();
        setupModals();
        
        // Initialize input masks
        initInputMasks();
        
        // CEP lookup
        setupCepLookup();
    }
    
    // ===================================================================
    // TAB NAVIGATION
    // ===================================================================
    function setupTabNavigation() {
        formTabs.forEach(tab => {
            tab.addEventListener('click', function() {
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
                }
            });
        });
    }
    
    // ===================================================================
    // PHOTO UPLOAD
    // ===================================================================
    function setupPhotoUpload() {
        if (photoInput && photoPreview) {
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
                    };
                    reader.readAsDataURL(file);
                }
            });
            
            // Click on photo preview to trigger file input
            const formPhoto = document.querySelector('.form-photo');
            if (formPhoto) {
                formPhoto.addEventListener('click', function() {
                    photoInput.click();
                });
            }
        }
    }
    
    // ===================================================================
    // PASSWORD HANDLING
    // ===================================================================
    function setupPasswordToggle() {
        // Toggle password visibility
        if (btnToggleSenha && senhaInput) {
            btnToggleSenha.addEventListener('click', function() {
                togglePasswordVisibility(senhaInput, this);
            });
        }
        
        if (btnToggleConfirmarSenha && confirmarSenhaInput) {
            btnToggleConfirmarSenha.addEventListener('click', function() {
                togglePasswordVisibility(confirmarSenhaInput, this);
            });
        }
        
        // Generate random password
        if (btnGerarSenha && senhaInput && confirmarSenhaInput) {
            btnGerarSenha.addEventListener('click', function() {
                const randomPassword = generateRandomPassword();
                senhaInput.value = randomPassword;
                confirmarSenhaInput.value = randomPassword;
                
                // Show both passwords
                if (senhaInput.type === 'password') {
                    togglePasswordVisibility(senhaInput, btnToggleSenha);
                }
                if (confirmarSenhaInput.type === 'password') {
                    togglePasswordVisibility(confirmarSenhaInput, btnToggleConfirmarSenha);
                }
                
                showNotification('Senha aleatória gerada com sucesso', 'success');
            });
        }
    }
    
    // Toggle password field visibility
    function togglePasswordVisibility(inputElement, buttonElement) {
        if (inputElement.type === 'password') {
            inputElement.type = 'text';
            buttonElement.querySelector('i').classList.remove('fa-eye');
            buttonElement.querySelector('i').classList.add('fa-eye-slash');
        } else {
            inputElement.type = 'password';
            buttonElement.querySelector('i').classList.remove('fa-eye-slash');
            buttonElement.querySelector('i').classList.add('fa-eye');
        }
    }
    
    // Generate a random secure password
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
    
    // ===================================================================
    // PERMISSION GROUPS
    // ===================================================================
    function setupPermissionGroups() {
        btnSelectAll.forEach(btn => {
            btn.addEventListener('click', function() {
                const groupName = this.getAttribute('data-group');
                const permissionGroup = this.closest('.permission-group');
                
                if (permissionGroup) {
                    const checkboxes = permissionGroup.querySelectorAll('input[type="checkbox"]');
                    
                    // Check if all checkboxes are checked
                    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
                    
                    // Toggle all checkboxes
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = !allChecked;
                    });
                    
                    // Update button text
                    this.textContent = allChecked ? `Selecionar Todos` : `Desmarcar Todos`;
                }
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
    
    // Update the select all button based on checkbox states
    function updateSelectAllButton(permissionGroup) {
        if (!permissionGroup) return;
        
        const btn = permissionGroup.querySelector('.btn-select-all');
        const checkboxes = permissionGroup.querySelectorAll('input[type="checkbox"]');
        
        if (btn && checkboxes.length > 0) {
            const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
            btn.textContent = allChecked ? `Desmarcar Todos` : `Selecionar Todos`;
        }
    }
    
    // ===================================================================
    // FORM SUBMISSION
    // ===================================================================
    function setupFormSubmission() {
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Validate form
                if (validateForm()) {
                    // In a real application, this would send data to the server
                    // For now, we'll simulate success
                    saveFormData();
                }
            });
            
            // Button events
            if (btnSalvar) {
                btnSalvar.addEventListener('click', function() {
                    form.dispatchEvent(new Event('submit'));
                });
            }
            
            if (btnCancelar) {
                btnCancelar.addEventListener('click', function() {
                    if (confirm('Tem certeza que deseja cancelar? Todas as alterações serão perdidas.')) {
                        showListagem();
                    }
                });
            }
            
            if (btnExcluir) {
                btnExcluir.addEventListener('click', function() {
                    openModal(modalConfirmarDeletar);
                });
            }
            
            if (btnNovoFuncionario) {
                btnNovoFuncionario.addEventListener('click', function() {
                    showFormulario();
                    resetForm();
                });
            }
        }
    }
    
    // Validate the form before submission
    function validateForm() {
        let isValid = true;
        let firstInvalidElement = null;
        
        // Get all required inputs
        const requiredInputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        
        // Check each required input
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                markInvalid(input);
                
                if (!firstInvalidElement) {
                    firstInvalidElement = input;
                }
            } else {
                markValid(input);
                
                // Additional validation for specific types
                if (input.type === 'email' && !validateEmail(input.value)) {
                    isValid = false;
                    markInvalid(input);
                    
                    if (!firstInvalidElement) {
                        firstInvalidElement = input;
                    }
                }
            }
        });
        
        // Check password fields
        if (senhaInput && confirmarSenhaInput && senhaInput.value && confirmarSenhaInput.value) {
            if (senhaInput.value !== confirmarSenhaInput.value) {
                isValid = false;
                markInvalid(senhaInput);
                markInvalid(confirmarSenhaInput);
                
                if (!firstInvalidElement) {
                    firstInvalidElement = senhaInput;
                }
                
                showNotification('As senhas não conferem', 'error');
            }
        }
        
        // Focus the first invalid element
        if (firstInvalidElement) {
            // Find the tab containing this element
            const tabContent = firstInvalidElement.closest('.tab-content');
            if (tabContent) {
                const tabId = tabContent.getAttribute('id');
                const tab = document.querySelector(`[aria-controls="${tabId}"]`);
                
                if (tab) {
                    tab.click();
                }
            }
            
            firstInvalidElement.focus();
        }
        
        return isValid;
    }
    
    // Mark input as invalid
    function markInvalid(input) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        
        // Create or update error message
        let errorMessage = input.nextElementSibling;
        if (!errorMessage || !errorMessage.classList.contains('error-message')) {
            errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            input.parentNode.insertBefore(errorMessage, input.nextSibling);
        }
        
        const label = input.closest('.form-group').querySelector('label');
        const fieldName = label ? label.textContent : 'Este campo';
        
        errorMessage.textContent = `${fieldName} é obrigatório`;
        
        // Special message for email
        if (input.type === 'email') {
            errorMessage.textContent = 'Informe um email válido';
        }
    }
    
    // Mark input as valid
    function markValid(input) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        
        // Remove error message if exists
        const errorMessage = input.nextElementSibling;
        if (errorMessage && errorMessage.classList.contains('error-message')) {
            errorMessage.remove();
        }
    }
    
    // Validate email format
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    // Save form data (simulation)
    function saveFormData() {
        showNotification('Salvando dados do funcionário...', 'info');
        
        // Simulate API call
        setTimeout(() => {
            showNotification('Funcionário cadastrado com sucesso!', 'success');
            
            // Show the listing
            showListagem();
        }, 1500);
    }
    
    // Reset form to empty state
    function resetForm() {
        form.reset();
        
        // Reset photo preview
        if (photoPreview) {
            photoPreview.src = '/api/placeholder/150/150';
        }
        
        // Reset validation classes
        form.querySelectorAll('.is-invalid, .is-valid').forEach(el => {
            el.classList.remove('is-invalid', 'is-valid');
        });
        
        // Remove error messages
        form.querySelectorAll('.error-message').forEach(el => {
            el.remove();
        });
        
        // Reset status select
        const statusSelect = document.getElementById('funcionario-status');
        if (statusSelect) {
            statusSelect.value = 'ativo';
        }
        
        // Reset all checkboxes
        form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // Reset select all buttons
        document.querySelectorAll('.permission-group').forEach(group => {
            updateSelectAllButton(group);
        });
        
        // Go to first tab
        const firstTab = document.querySelector('.form-tab');
        if (firstTab) {
            firstTab.click();
        }
    }
    
    // ===================================================================
    // LISTAGEM HANDLING
    // ===================================================================
    function setupListagem() {
        // Initialize with showing form or listing based on URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        
        if (action === 'new' || action === 'edit') {
            showFormulario();
        } else {
            showListagem();
        }
        
        // Setup row actions
        setupTableRows();
    }
    
    // Show the listing and hide the form
    function showListagem() {
        if (cadastroContainer && listagemContainer) {
            cadastroContainer.classList.add('hidden');
            listagemContainer.classList.remove('hidden');
            
            // Update URL
            const url = new URL(window.location);
            url.searchParams.delete('action');
            url.searchParams.delete('id');
            window.history.pushState({}, '', url);
        }
    }
    
    // Show the form and hide the listing
    function showFormulario() {
        if (cadastroContainer && listagemContainer) {
            cadastroContainer.classList.remove('hidden');
            listagemContainer.classList.add('hidden');
            
            // Update URL if not already set
            const urlParams = new URLSearchParams(window.location.search);
            const action = urlParams.get('action');
            
            if (!action) {
                const url = new URL(window.location);
                url.searchParams.set('action', 'new');
                window.history.pushState({}, '', url);
            }
        }
    }
    
    // Setup table row interactions
    function setupTableRows() {
        // Edit buttons
        document.querySelectorAll('.action-btn .fa-edit').forEach(btn => {
            btn.parentElement.addEventListener('click', function() {
                const row = this.closest('tr');
                const nome = row.querySelector('.user-name').textContent;
                
                showFormulario();
                
                // In a real app, would load the employee data
                // For demo, we'll just set the name and status
                document.getElementById('funcionario-nome').value = nome;
                
                const status = row.querySelector('.status-badge').textContent.toLowerCase();
                document.getElementById('funcionario-status').value = status === 'ativo' ? 'ativo' : status === 'férias' ? 'ferias' : 'inativo';
                
                // Update URL
                const url = new URL(window.location);
                url.searchParams.set('action', 'edit');
                url.searchParams.set('id', '1'); // Demo ID
                window.history.pushState({}, '', url);
                
                showNotification(`Editando funcionário: ${nome}`, 'info');
            });
        });
        
        // View buttons
        document.querySelectorAll('.action-btn .fa-eye').forEach(btn => {
            btn.parentElement.addEventListener('click', function() {
                const row = this.closest('tr');
                const nome = row.querySelector('.user-name').textContent;
                showNotification(`Visualizando detalhes de: ${nome}`, 'info');
                
                // In a real app, this would open a view modal or page
            });
        });
    }
    
    // ===================================================================
    // STATUS FILTERS
    // ===================================================================
    function setupStatusFilters() {
        const filterInputs = [filtroStatus, filtroCargo, filtroDepartamento];
        
        filterInputs.forEach(filter => {
            if (filter) {
                filter.addEventListener('change', filterTable);
            }
        });
        
        if (btnLimparFiltros) {
            btnLimparFiltros.addEventListener('click', function() {
                filterInputs.forEach(filter => {
                    if (filter) {
                        filter.value = 'todos';
                    }
                });
                
                filterTable();
                showNotification('Filtros limpos', 'info');
            });
        }
    }
    
    // Filter the employees table
    function filterTable() {
        const statusValue = filtroStatus ? filtroStatus.value : 'todos';
        const cargoValue = filtroCargo ? filtroCargo.value : 'todos';
        const departamentoValue = filtroDepartamento ? filtroDepartamento.value : 'todos';
        
        // Get all rows
        const rows = document.querySelectorAll('#tabela-funcionarios tbody tr');
        
        rows.forEach(row => {
            // Get status, cargo and departamento from row
            const status = row.querySelector('.status-badge').textContent.toLowerCase();
            const cargo = row.querySelector('.user-role').textContent.toLowerCase();
            const departamento = row.cells[2].textContent.toLowerCase();
            
            // Check if row matches all selected filters
            const matchStatus = statusValue === 'todos' || 
                                (statusValue === 'ativo' && status === 'ativo') ||
                                (statusValue === 'inativo' && status === 'inativo') ||
                                (statusValue === 'ferias' && status === 'férias') ||
                                (statusValue === 'afastado' && status === 'afastado');
            
            const matchCargo = cargoValue === 'todos' || cargo === cargoValue;
            
            const matchDepartamento = departamentoValue === 'todos' || departamento === departamentoValue;
            
            // Show/hide row based on filters
            if (matchStatus && matchCargo && matchDepartamento) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
        
        // Update table info
        updateTableInfo();
    }
    
    // Update the table counter
    function updateTableInfo() {
        const tableInfo = document.querySelector('.table-info');
        if (!tableInfo) return;
        
        // Count visible rows
        const visibleRows = document.querySelectorAll('#tabela-funcionarios tbody tr:not([style*="display: none"])');
        const totalRows = document.querySelectorAll('#tabela-funcionarios tbody tr');
        
        tableInfo.textContent = `Mostrando ${visibleRows.length} de ${totalRows.length} funcionários`;
    }
    
    // ===================================================================
    // MODALS
    // ===================================================================
    function setupModals() {
        // Close button event
        modalCloseBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal-container');
                closeModal(modal);
            });
        });
        
        // Confirm delete button
        if (btnConfirmarExcluir) {
            btnConfirmarExcluir.addEventListener('click', function() {
                deleteEmployee();
                closeModal(modalConfirmarDeletar);
            });
        }
        
        // Close on outside click
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal-container')) {
                closeModal(e.target);
            }
        });
        
        // Close on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const openModals = document.querySelectorAll('.modal-container[style*="display: block"]');
                openModals.forEach(modal => {
                    closeModal(modal);
                });
            }
        });
    }
    
    // Open modal
    function openModal(modal) {
        if (!modal) return;
        
        modal.style.display = 'flex';
        
        // Set focus on first focusable element
        setTimeout(() => {
            const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable.length > 0) {
                focusable[0].focus();
            }
        }, 100);
    }
    
    // Close modal
    function closeModal(modal) {
        if (!modal) return;
        modal.style.display = 'none';
    }
    
    // Delete employee (simulation)
    function deleteEmployee() {
        showNotification('Excluindo funcionário...', 'info');
        
        // Simulate API call
        setTimeout(() => {
            showNotification('Funcionário excluído com sucesso!', 'success');
            showListagem();
        }, 1500);
    }
    
    // ===================================================================
    // INPUT MASKS
    // ===================================================================
    function initInputMasks() {
        // CPF mask
        const cpfInput = document.getElementById('funcionario-cpf');
        if (cpfInput) {
            cpfInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                
                if (value.length > 11) {
                    value = value.substring(0, 11);
                }
                
                if (value.length > 9) {
                    value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
                } else if (value.length > 6) {
                    value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
                } else if (value.length > 3) {
                    value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
                }
                
                e.target.value = value;
            });
        }
        
        // RG mask
        const rgInput = document.getElementById('funcionario-rg');
        if (rgInput) {
            rgInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                
                if (value.length > 9) {
                    value = value.substring(0, 9);
                }
                
                if (value.length > 7) {
                    value = value.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, '$1.$2.$3-$4');
                } else if (value.length > 5) {
                    value = value.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
                } else if (value.length > 2) {
                    value = value.replace(/(\d{2})(\d{1,3})/, '$1.$2');
                }
                
                e.target.value = value;
            });
        }
        
        // Phone mask
        const phoneInputs = [
            document.getElementById('funcionario-telefone'),
            document.getElementById('funcionario-telefone2'),
            document.getElementById('funcionario-emergencia')
        ];
        
        phoneInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', function(e) {
                    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                    
                    if (value.length > 11) {
                        value = value.substring(0, 11);
                    }
                    
                    if (value.length > 10) { // Celular with 9 digit
                        value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                    } else if (value.length > 6) { // Telefone fixo
                        value = value.replace(/(\d{2})(\d{4})(\d{1,4})/, '($1) $2-$3');
                    } else if (value.length > 2) { // DDD
                        value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
                    }
                    
                    e.target.value = value;
                });
            }
        });
        
        // CEP mask
        const cepInput = document.getElementById('funcionario-cep');
        if (cepInput) {
            cepInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                
                if (value.length > 8) {
                    value = value.substring(0, 8);
                }
                
                if (value.length > 5) {
                    value = value.replace(/(\d{5})(\d{1,3})/, '$1-$2');
                }
                
                e.target.value = value;
            });
        }
        
        // Currency mask for salary
        const salarioInput = document.getElementById('funcionario-salario');
        if (salarioInput) {
            salarioInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                
                if (value === '') {
                    e.target.value = '';
                    return;
                }
                
                // Convert to cents
                value = parseInt(value, 10);
                
                // Format as currency
                value = (value / 100).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                e.target.value = value;
            });
        }
    }
    
    // ===================================================================
    // CEP LOOKUP
    // ===================================================================
    function setupCepLookup() {
        const cepInput = document.getElementById('funcionario-cep');
        const btnBuscarCep = document.getElementById('btn-buscar-cep');
        
        if (cepInput && btnBuscarCep) {
            btnBuscarCep.addEventListener('click', function() {
                const cep = cepInput.value.replace(/\D/g, '');
                
                if (cep.length !== 8) {
                    showNotification('CEP inválido. O CEP deve ter 8 dígitos.', 'error');
                    return;
                }
                
                showNotification('Buscando endereço...', 'info');
                
                // Simulate API call to a CEP service
                setTimeout(() => {
                    // In a real application, this would be an API call to viacep or similar
                    // For demonstration, we'll simulate a successful response
                    const endereco = {
                        logradouro: 'Avenida Paulista',
                        bairro: 'Bela Vista',
                        localidade: 'São Paulo',
                        uf: 'SP'
                    };
                    
                    // Fill address fields
                    document.getElementById('funcionario-endereco').value = endereco.logradouro;
                    document.getElementById('funcionario-bairro').value = endereco.bairro;
                    document.getElementById('funcionario-cidade').value = endereco.localidade;
                    document.getElementById('funcionario-estado').value = endereco.uf;
                    
                    // Focus on number field
                    document.getElementById('funcionario-numero').focus();
                    
                    showNotification('Endereço encontrado!', 'success');
                }, 1000);
            });
            
            // Auto-search when CEP has 8 digits
            cepInput.addEventListener('blur', function() {
                const cep = this.value.replace(/\D/g, '');
                if (cep.length === 8) {
                    btnBuscarCep.click();
                }
            });
        }
    }
    
    // ===================================================================
    // NOTIFICATIONS
    // ===================================================================
    function showNotification(message, type = 'info') {
        // Get or create notification container
        let container = document.querySelector('.notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        
        // Add icon based on type
        let icon = 'info-circle';
        switch (type) {
            case 'success': icon = 'check-circle'; break;
            case 'error': icon = 'exclamation-circle'; break;
            case 'warning': icon = 'exclamation-triangle'; break;
        }
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${icon}" aria-hidden="true"></i>
            </div>
            <div class="notification-content">
                <p>${message}</p>
            </div>
            <button class="notification-close" aria-label="Fechar notificação">&times;</button>
        `;
        
        // Add to container
        container.appendChild(notification);
        
        // Handle close button
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                notification.classList.add('fadeOut');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            });
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fadeOut');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, 5000);
    }
    
    // Initialize the application
    init();
    
    // Expose functions for external use (e.g., from other scripts)
    window.funcionariosApp = {
        showNotification,
        resetForm,
        showFormulario,
        showListagem
    };
});