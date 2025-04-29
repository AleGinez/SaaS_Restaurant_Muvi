-- Script de criação do schema otimizado para Sistema SaaS Multi-Tenant de Restaurante
-- Banco de dados: PostgreSQL

-- Apagar schema existente se necessário
DROP SCHEMA IF EXISTS restaurante CASCADE;

-- Criação do Schema
CREATE SCHEMA restaurante;

-- Definir o schema como padrão para as operações subsequentes
SET search_path TO restaurante;

-- =============================================
-- TABELAS DE GERENCIAMENTO DE TENANTS
-- =============================================

-- Tabela de Tenants (Restaurantes)
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nome_restaurante VARCHAR(100) NOT NULL,
    razao_social VARCHAR(100),
    cnpj VARCHAR(20) UNIQUE,
    endereco VARCHAR(200),
    cidade VARCHAR(50),
    estado VARCHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email VARCHAR(100),
    site VARCHAR(100),
    logo TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    plano VARCHAR(20) NOT NULL DEFAULT 'basico',  -- basico, standard, premium
    ativo BOOLEAN DEFAULT TRUE,
    data_expiracao DATE,
    configuracoes JSONB
);

CREATE INDEX idx_tenants_codigo ON tenants(codigo);
CREATE INDEX idx_tenants_ativo ON tenants(ativo);

-- Tabela de Configurações por Tenant
CREATE TABLE tenant_configuracoes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    chave VARCHAR(50) NOT NULL,
    valor TEXT,
    UNIQUE(tenant_id, chave)
);

CREATE INDEX idx_tenant_configuracoes_tenant_id ON tenant_configuracoes(tenant_id);

-- =============================================
-- TABELAS DE USUÁRIOS E SEGURANÇA
-- =============================================

-- Tabela de Usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, email)
);

CREATE INDEX idx_usuarios_tenant_id ON usuarios(tenant_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);

-- Tabela de Perfis de Acesso
CREATE TABLE perfis (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_perfis_tenant_id ON perfis(tenant_id);

-- Tabela de Permissões (Global, compartilhada entre tenants)
CREATE TABLE permissoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT
);

-- Tabela de Relação Perfis-Permissões
CREATE TABLE perfis_permissoes (
    id SERIAL PRIMARY KEY,
    perfil_id INTEGER REFERENCES perfis(id) ON DELETE CASCADE,
    permissao_id INTEGER REFERENCES permissoes(id) ON DELETE CASCADE,
    UNIQUE(perfil_id, permissao_id)
);

CREATE INDEX idx_perfis_permissoes_perfil_id ON perfis_permissoes(perfil_id);

-- Tabela de Relação Usuários-Perfis
CREATE TABLE usuarios_perfis (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    perfil_id INTEGER REFERENCES perfis(id) ON DELETE CASCADE,
    UNIQUE(usuario_id, perfil_id)
);

CREATE INDEX idx_usuarios_perfis_usuario_id ON usuarios_perfis(usuario_id);

-- =============================================
-- TABELAS DE FUNCIONÁRIOS
-- =============================================

-- Tabela de Funcionários
CREATE TABLE funcionarios (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14),
    data_nascimento DATE,
    endereco VARCHAR(200),
    telefone VARCHAR(20),
    email VARCHAR(100),
    cargo VARCHAR(50),
    salario DECIMAL(10, 2),
    data_contratacao DATE,
    data_demissao DATE,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, cpf)
);

CREATE INDEX idx_funcionarios_tenant_id ON funcionarios(tenant_id);
CREATE INDEX idx_funcionarios_usuario_id ON funcionarios(usuario_id);
CREATE INDEX idx_funcionarios_ativo ON funcionarios(ativo);

-- Tabela de Escalas de Trabalho
CREATE TABLE escalas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_escalas_tenant_id ON escalas(tenant_id);

-- Tabela de Relação Funcionários-Escalas
CREATE TABLE funcionarios_escalas (
    id SERIAL PRIMARY KEY,
    funcionario_id INTEGER REFERENCES funcionarios(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL, -- 0 = Domingo, 6 = Sábado
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    data_inicial DATE NOT NULL,
    data_final DATE
);

CREATE INDEX idx_funcionarios_escalas_funcionario_id ON funcionarios_escalas(funcionario_id);
CREATE INDEX idx_funcionarios_escalas_dia_semana ON funcionarios_escalas(dia_semana);

-- Tabela de Registro de Ponto
CREATE TABLE registro_ponto (
    id SERIAL PRIMARY KEY,
    funcionario_id INTEGER REFERENCES funcionarios(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    hora_entrada TIME NOT NULL,
    hora_saida TIME,
    observacao TEXT
);

CREATE INDEX idx_registro_ponto_funcionario_id ON registro_ponto(funcionario_id);
CREATE INDEX idx_registro_ponto_data ON registro_ponto(data);

-- =============================================
-- TABELAS DE PRODUTOS E ESTOQUE
-- =============================================

-- Tabela de Categorias de Produtos
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    imagem TEXT,
    ativa BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_categorias_tenant_id ON categorias(tenant_id);
CREATE INDEX idx_categorias_ativa ON categorias(ativa);

-- Tabela de Unidades de Medida (Global, compartilhada entre tenants)
CREATE TABLE unidades_medida (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(20) NOT NULL UNIQUE,
    simbolo VARCHAR(5) NOT NULL UNIQUE
);

-- Tabela de Produtos
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    preco_custo DECIMAL(10, 2) NOT NULL,
    preco_venda DECIMAL(10, 2) NOT NULL,
    estoque_atual DECIMAL(10, 2) DEFAULT 0,
    estoque_minimo DECIMAL(10, 2) DEFAULT 0,
    unidade_medida_id INTEGER REFERENCES unidades_medida(id) ON DELETE SET NULL,
    imagem TEXT,
    controlar_estoque BOOLEAN DEFAULT TRUE,
    disponivel_venda BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, codigo)
);

CREATE INDEX idx_produtos_tenant_id ON produtos(tenant_id);
CREATE INDEX idx_produtos_categoria_id ON produtos(categoria_id);
CREATE INDEX idx_produtos_disponivel_venda ON produtos(disponivel_venda);
CREATE INDEX idx_produtos_controlar_estoque ON produtos(controlar_estoque);

-- Tabela de Fornecedores
CREATE TABLE fornecedores (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    razao_social VARCHAR(100),
    cnpj VARCHAR(20),
    endereco VARCHAR(200),
    cidade VARCHAR(50),
    estado VARCHAR(2),
    telefone VARCHAR(20),
    email VARCHAR(100),
    contato_nome VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, cnpj)
);

CREATE INDEX idx_fornecedores_tenant_id ON fornecedores(tenant_id);
CREATE INDEX idx_fornecedores_ativo ON fornecedores(ativo);

-- Tabela de Entrada de Estoque
CREATE TABLE entradas_estoque (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE RESTRICT,
    fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
    quantidade DECIMAL(10, 2) NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    valor_total DECIMAL(10, 2) NOT NULL,
    data_entrada DATE NOT NULL,
    numero_nota_fiscal VARCHAR(20),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_entradas_estoque_tenant_id ON entradas_estoque(tenant_id);
CREATE INDEX idx_entradas_estoque_produto_id ON entradas_estoque(produto_id);
CREATE INDEX idx_entradas_estoque_data_entrada ON entradas_estoque(data_entrada);

-- Tabela de Saídas de Estoque (não relacionadas a vendas)
CREATE TABLE saidas_estoque (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade DECIMAL(10, 2) NOT NULL,
    motivo VARCHAR(50) NOT NULL,
    data_saida DATE NOT NULL,
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_saidas_estoque_tenant_id ON saidas_estoque(tenant_id);
CREATE INDEX idx_saidas_estoque_produto_id ON saidas_estoque(produto_id);
CREATE INDEX idx_saidas_estoque_data_saida ON saidas_estoque(data_saida);

-- =============================================
-- TABELAS DE ATENDIMENTO
-- =============================================

-- Tabela de Mesas
CREATE TABLE mesas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    capacidade INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'Livre', -- Livre, Ocupada, Reservada
    posicao_x INTEGER,
    posicao_y INTEGER,
    ativa BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, numero)
);

CREATE INDEX idx_mesas_tenant_id ON mesas(tenant_id);
CREATE INDEX idx_mesas_status ON mesas(status);
CREATE INDEX idx_mesas_ativa ON mesas(ativa);

-- Tabela de Reservas
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mesa_id INTEGER REFERENCES mesas(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(100) NOT NULL,
    cliente_telefone VARCHAR(20) NOT NULL,
    cliente_email VARCHAR(100),
    data_reserva DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME,
    num_pessoas INTEGER NOT NULL,
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'Confirmada', -- Confirmada, Cancelada, Concluída
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_reservas_tenant_id ON reservas(tenant_id);
CREATE INDEX idx_reservas_mesa_id ON reservas(mesa_id);
CREATE INDEX idx_reservas_data_reserva ON reservas(data_reserva);
CREATE INDEX idx_reservas_status ON reservas(status);

-- Tabela de Cardápios
CREATE TABLE cardapios (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_inicio DATE,
    data_fim DATE,
    dias_semana VARCHAR(7), -- '0123456' onde 0=Domingo, 6=Sábado
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_cardapios_tenant_id ON cardapios(tenant_id);
CREATE INDEX idx_cardapios_ativo ON cardapios(ativo);

-- Tabela de Relação Cardápio-Produtos
CREATE TABLE cardapios_produtos (
    id SERIAL PRIMARY KEY,
    cardapio_id INTEGER REFERENCES cardapios(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    preco_especial DECIMAL(10, 2),
    destaque BOOLEAN DEFAULT FALSE,
    disponivel BOOLEAN DEFAULT TRUE,
    UNIQUE(cardapio_id, produto_id)
);

CREATE INDEX idx_cardapios_produtos_cardapio_id ON cardapios_produtos(cardapio_id);
CREATE INDEX idx_cardapios_produtos_produto_id ON cardapios_produtos(produto_id);
CREATE INDEX idx_cardapios_produtos_disponivel ON cardapios_produtos(disponivel);

-- =============================================
-- TABELAS DE VENDAS E PEDIDOS
-- =============================================

-- Tabela de Pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mesa_id INTEGER REFERENCES mesas(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Aberto', -- Aberto, Em Preparo, Entregue, Fechado, Cancelado
    observacao TEXT,
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMP,
    valor_subtotal DECIMAL(10, 2) DEFAULT 0,
    valor_desconto DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) DEFAULT 0,
    usuario_abertura INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_fechamento INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_pedidos_tenant_id ON pedidos(tenant_id);
CREATE INDEX idx_pedidos_mesa_id ON pedidos(mesa_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_data_pedido ON pedidos(data_pedido);

-- Tabela de Itens do Pedido
CREATE TABLE itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade DECIMAL(10, 2) NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    valor_total DECIMAL(10, 2) NOT NULL,
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'Pendente', -- Pendente, Em Preparo, Pronto, Entregue, Cancelado
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_preparo TIMESTAMP,
    data_entrega TIMESTAMP
);

CREATE INDEX idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
CREATE INDEX idx_itens_pedido_produto_id ON itens_pedido(produto_id);
CREATE INDEX idx_itens_pedido_status ON itens_pedido(status);

-- =============================================
-- TABELAS FINANCEIRAS
-- =============================================

-- Tabela de Formas de Pagamento (Global, compartilhada entre tenants)
CREATE TABLE formas_pagamento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_formas_pagamento_ativo ON formas_pagamento(ativo);

-- Tabelas de Formas de Pagamento por Tenant
CREATE TABLE tenant_formas_pagamento (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT TRUE,
    configuracoes JSONB,
    UNIQUE(tenant_id, forma_pagamento_id)
);

CREATE INDEX idx_tenant_formas_pagamento_tenant_id ON tenant_formas_pagamento(tenant_id);
CREATE INDEX idx_tenant_formas_pagamento_ativo ON tenant_formas_pagamento(ativo);

-- Tabela de Pagamentos
CREATE TABLE pagamentos (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE RESTRICT,
    valor DECIMAL(10, 2) NOT NULL,
    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    referencia VARCHAR(100),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_pagamentos_tenant_id ON pagamentos(tenant_id);
CREATE INDEX idx_pagamentos_pedido_id ON pagamentos(pedido_id);
CREATE INDEX idx_pagamentos_data_pagamento ON pagamentos(data_pagamento);

-- Tabela de Caixas
CREATE TABLE caixas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_abertura TIMESTAMP NOT NULL,
    valor_abertura DECIMAL(10, 2) NOT NULL DEFAULT 0,
    data_fechamento TIMESTAMP,
    valor_fechamento DECIMAL(10, 2),
    valor_sistema DECIMAL(10, 2),
    diferenca DECIMAL(10, 2),
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'Aberto' -- Aberto, Fechado
);

CREATE INDEX idx_caixas_tenant_id ON caixas(tenant_id);
CREATE INDEX idx_caixas_usuario_id ON caixas(usuario_id);
CREATE INDEX idx_caixas_status ON caixas(status);

-- Tabela de Movimentações Financeiras
CREATE TABLE movimentacoes_financeiras (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    caixa_id INTEGER REFERENCES caixas(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL, -- Entrada, Saída
    descricao VARCHAR(200) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_movimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE SET NULL,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    categoria VARCHAR(50),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_movimentacoes_financeiras_tenant_id ON movimentacoes_financeiras(tenant_id);
CREATE INDEX idx_movimentacoes_financeiras_caixa_id ON movimentacoes_financeiras(caixa_id);
CREATE INDEX idx_movimentacoes_financeiras_tipo ON movimentacoes_financeiras(tipo);
CREATE INDEX idx_movimentacoes_financeiras_data_movimento ON movimentacoes_financeiras(data_movimento);

-- Tabela de Contas a Pagar
CREATE TABLE contas_pagar (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    descricao VARCHAR(200) NOT NULL,
    fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor_pago DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'Pendente', -- Pendente, Pago, Cancelado
    numero_documento VARCHAR(20),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_contas_pagar_tenant_id ON contas_pagar(tenant_id);
CREATE INDEX idx_contas_pagar_fornecedor_id ON contas_pagar(fornecedor_id);
CREATE INDEX idx_contas_pagar_data_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX idx_contas_pagar_status ON contas_pagar(status);

-- Tabela de Contas a Receber
CREATE TABLE contas_receber (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    descricao VARCHAR(200) NOT NULL,
    cliente_nome VARCHAR(100) NOT NULL,
    cliente_documento VARCHAR(20),
    valor DECIMAL(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    valor_recebido DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'Pendente', -- Pendente, Recebido, Cancelado
    numero_documento VARCHAR(20),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_contas_receber_tenant_id ON contas_receber(tenant_id);
CREATE INDEX idx_contas_receber_data_vencimento ON contas_receber(data_vencimento);
CREATE INDEX idx_contas_receber_status ON contas_receber(status);

-- =============================================
-- TABELAS DE LOGS E AUDITORIA
-- =============================================

-- Tabela de Logs do Sistema
CREATE TABLE logs_sistema (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    nivel VARCHAR(20) NOT NULL, -- INFO, WARNING, ERROR, CRITICAL
    origem VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    stack_trace TEXT,
    dados_adicionais JSONB,
    ip_origem VARCHAR(45),
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_sistema_tenant_id ON logs_sistema(tenant_id);
CREATE INDEX idx_logs_sistema_nivel ON logs_sistema(nivel);
CREATE INDEX idx_logs_sistema_data_hora ON logs_sistema(data_hora);

-- Tabela de Logs de Acesso
CREATE TABLE logs_acesso (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    email VARCHAR(100),
    ip_origem VARCHAR(45) NOT NULL,
    user_agent TEXT,
    acao VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_RESET
    sucesso BOOLEAN NOT NULL,
    detalhes TEXT,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_acesso_tenant_id ON logs_acesso(tenant_id);
CREATE INDEX idx_logs_acesso_usuario_id ON logs_acesso(usuario_id);
CREATE INDEX idx_logs_acesso_data_hora ON logs_acesso(data_hora);

-- Tabela de Logs de Atividade
CREATE TABLE logs_atividade (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(255) NOT NULL,
    tabela_afetada VARCHAR(50),
    registro_afetado INTEGER,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip VARCHAR(45),
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_atividade_tenant_id ON logs_atividade(tenant_id);
CREATE INDEX idx_logs_atividade_usuario_id ON logs_atividade(usuario_id);
CREATE INDEX idx_logs_atividade_data_hora ON logs_atividade(data_hora);

-- =============================================
-- TRIGGERS PARA MANUTENÇÃO DA INTEGRIDADE MULTI-TENANT
-- =============================================

-- Função para validar tenant_id em chaves estrangeiras
CREATE OR REPLACE FUNCTION check_tenant_id_constraint()
RETURNS TRIGGER AS $$
BEGIN
    -- A specific implementation would be needed for each table relationship
    -- This is just a generic example of the concept
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME 
        AND column_name = 'tenant_id'
    ) THEN
        IF NEW.tenant_id IS NULL THEN
            RAISE EXCEPTION 'tenant_id cannot be null';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Um exemplo de trigger para uma tabela específica (seria necessário criar para cada tabela):
CREATE TRIGGER check_tenant_constraint_produtos
BEFORE INSERT OR UPDATE ON produtos
FOR EACH ROW EXECUTE FUNCTION check_tenant_id_constraint();

-- Outras funções e triggers podem ser adicionados conforme necessidade
