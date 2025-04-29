-- Script de criação do schema, tabelas e índices para o Sistema SaaS de Restaurante Pesqueiro
-- Banco de dados: PostgreSQL

-- Criação do Schema
CREATE SCHEMA IF NOT EXISTS restaurante_01;

-- Definir o schema como padrão para as operações subsequentes
SET search_path TO restaurante_01;

-- Tabela de Usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);

-- Tabela de Perfis de Acesso
CREATE TABLE perfis (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT
);

-- Tabela de Relação Usuários-Perfis
CREATE TABLE usuarios_perfis (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    perfil_id INTEGER REFERENCES perfis(id) ON DELETE CASCADE,
    UNIQUE(usuario_id, perfil_id)
);

CREATE INDEX idx_usuarios_perfis_usuario_id ON usuarios_perfis(usuario_id);
CREATE INDEX idx_usuarios_perfis_perfil_id ON usuarios_perfis(perfil_id);

-- Tabela de Permissões
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
CREATE INDEX idx_perfis_permissoes_permissao_id ON perfis_permissoes(permissao_id);

-- Tabela de Logs de Atividade
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(255) NOT NULL,
    tabela_afetada VARCHAR(50),
    registro_afetado INTEGER,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip VARCHAR(45),
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_usuario_id ON logs(usuario_id);
CREATE INDEX idx_logs_data_hora ON logs(data_hora);
CREATE INDEX idx_logs_tabela_afetada ON logs(tabela_afetada);

-- Tabela de Configurações do Restaurante
CREATE TABLE configuracoes (
    id SERIAL PRIMARY KEY,
    nome_restaurante VARCHAR(100) NOT NULL,
    razao_social VARCHAR(100),
    cnpj VARCHAR(20),
    endereco VARCHAR(200),
    cidade VARCHAR(50),
    estado VARCHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email VARCHAR(100),
    logo TEXT,  -- Pode ser um caminho de arquivo ou dados codificados em base64
    site VARCHAR(100),
    configuracoes_adicionais JSONB
);

-- Tabela de Funcionários
CREATE TABLE funcionarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    data_nascimento DATE,
    endereco VARCHAR(200),
    cidade VARCHAR(50),
    estado VARCHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email VARCHAR(100),
    cargo VARCHAR(50),
    salario DECIMAL(10, 2),
    data_contratacao DATE,
    data_demissao DATE,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_funcionarios_nome ON funcionarios(nome);
CREATE INDEX idx_funcionarios_cpf ON funcionarios(cpf);
CREATE INDEX idx_funcionarios_usuario_id ON funcionarios(usuario_id);
CREATE INDEX idx_funcionarios_cargo ON funcionarios(cargo);
CREATE INDEX idx_funcionarios_ativo ON funcionarios(ativo);

-- Tabela de Escala de Trabalho
CREATE TABLE escalas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT
);

-- Tabela de Relação Funcionários-Escalas
CREATE TABLE funcionarios_escalas (
    id SERIAL PRIMARY KEY,
    funcionario_id INTEGER REFERENCES funcionarios(id) ON DELETE CASCADE,
    escala_id INTEGER REFERENCES escalas(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    dia_semana INTEGER,  -- 0 = Domingo, 6 = Sábado
    UNIQUE(funcionario_id, escala_id, data_inicio, dia_semana)
);

CREATE INDEX idx_funcionarios_escalas_funcionario_id ON funcionarios_escalas(funcionario_id);
CREATE INDEX idx_funcionarios_escalas_escala_id ON funcionarios_escalas(escala_id);
CREATE INDEX idx_funcionarios_escalas_dia_semana ON funcionarios_escalas(dia_semana);
CREATE INDEX idx_funcionarios_escalas_data_inicio ON funcionarios_escalas(data_inicio);

-- Tabela de Registro de Horas
CREATE TABLE registro_horas (
    id SERIAL PRIMARY KEY,
    funcionario_id INTEGER REFERENCES funcionarios(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    hora_entrada TIME NOT NULL,
    hora_saida TIME,
    observacao TEXT
);

CREATE INDEX idx_registro_horas_funcionario_id ON registro_horas(funcionario_id);
CREATE INDEX idx_registro_horas_data ON registro_horas(data);

-- Tabela de Folha de Pagamento
CREATE TABLE folha_pagamento (
    id SERIAL PRIMARY KEY,
    funcionario_id INTEGER REFERENCES funcionarios(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    salario_base DECIMAL(10, 2) NOT NULL,
    horas_extras DECIMAL(10, 2) DEFAULT 0,
    valor_horas_extras DECIMAL(10, 2) DEFAULT 0,
    beneficios DECIMAL(10, 2) DEFAULT 0,
    descontos DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) NOT NULL,
    data_pagamento DATE,
    observacao TEXT,
    UNIQUE(funcionario_id, mes, ano)
);

CREATE INDEX idx_folha_pagamento_funcionario_id ON folha_pagamento(funcionario_id);
CREATE INDEX idx_folha_pagamento_ano_mes ON folha_pagamento(ano, mes);
CREATE INDEX idx_folha_pagamento_data_pagamento ON folha_pagamento(data_pagamento);

-- Tabela de Mesas
CREATE TABLE mesas (
    id SERIAL PRIMARY KEY,
    numero INTEGER NOT NULL UNIQUE,
    capacidade INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'Livre',  -- Livre, Ocupada, Reservada
    posicao_x INTEGER,  -- Para mapeamento visual
    posicao_y INTEGER,  -- Para mapeamento visual
    ativa BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_mesas_status ON mesas(status);
CREATE INDEX idx_mesas_ativa ON mesas(ativa);

-- Tabela de Reservas
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    mesa_id INTEGER REFERENCES mesas(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(100) NOT NULL,
    cliente_telefone VARCHAR(20) NOT NULL,
    cliente_email VARCHAR(100),
    data_reserva DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME,
    num_pessoas INTEGER NOT NULL,
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'Confirmada',  -- Confirmada, Cancelada, Concluída
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_reservas_mesa_id ON reservas(mesa_id);
CREATE INDEX idx_reservas_data_reserva ON reservas(data_reserva);
CREATE INDEX idx_reservas_status ON reservas(status);
CREATE INDEX idx_reservas_cliente_nome ON reservas(cliente_nome);
CREATE INDEX idx_reservas_cliente_telefone ON reservas(cliente_telefone);

-- Tabela de Categorias de Produtos
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    imagem TEXT,  -- Caminho de arquivo ou dados codificados em base64
    ativa BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_categorias_ativa ON categorias(ativa);

-- Tabela de Unidades de Medida
CREATE TABLE unidades_medida (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(20) NOT NULL UNIQUE,
    simbolo VARCHAR(5) NOT NULL UNIQUE
);

-- Tabela de Produtos
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    preco_custo DECIMAL(10, 2) NOT NULL,
    preco_venda DECIMAL(10, 2) NOT NULL,
    estoque_atual DECIMAL(10, 2) DEFAULT 0,
    estoque_minimo DECIMAL(10, 2) DEFAULT 0,
    unidade_medida_id INTEGER REFERENCES unidades_medida(id) ON DELETE SET NULL,
    imagem TEXT,  -- Caminho de arquivo ou dados codificados em base64
    controlado_estoque BOOLEAN DEFAULT TRUE,
    disponivel_venda BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_produtos_codigo ON produtos(codigo);
CREATE INDEX idx_produtos_nome ON produtos(nome);
CREATE INDEX idx_produtos_categoria_id ON produtos(categoria_id);
CREATE INDEX idx_produtos_disponivel_venda ON produtos(disponivel_venda);
CREATE INDEX idx_produtos_controlado_estoque ON produtos(controlado_estoque);
CREATE INDEX idx_produtos_estoque_minimo ON produtos(estoque_minimo);

-- Tabela de Fornecedores
CREATE TABLE fornecedores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    razao_social VARCHAR(100),
    cnpj VARCHAR(20) UNIQUE,
    endereco VARCHAR(200),
    cidade VARCHAR(50),
    estado VARCHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email VARCHAR(100),
    contato_nome VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_fornecedores_nome ON fornecedores(nome);
CREATE INDEX idx_fornecedores_cnpj ON fornecedores(cnpj);
CREATE INDEX idx_fornecedores_ativo ON fornecedores(ativo);

-- Tabela de Entrada de Estoque
CREATE TABLE entradas_estoque (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
    quantidade DECIMAL(10, 2) NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    valor_total DECIMAL(10, 2) NOT NULL,
    data_entrada DATE NOT NULL,
    numero_nota_fiscal VARCHAR(20),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entradas_estoque_produto_id ON entradas_estoque(produto_id);
CREATE INDEX idx_entradas_estoque_fornecedor_id ON entradas_estoque(fornecedor_id);
CREATE INDEX idx_entradas_estoque_data_entrada ON entradas_estoque(data_entrada);
CREATE INDEX idx_entradas_estoque_numero_nota_fiscal ON entradas_estoque(numero_nota_fiscal);

-- Tabela de Pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    mesa_id INTEGER REFERENCES mesas(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Aberto',  -- Aberto, Em Preparo, Entregue, Fechado, Cancelado
    observacao TEXT,
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_fechamento TIMESTAMP,
    valor_subtotal DECIMAL(10, 2) DEFAULT 0,
    valor_desconto DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) DEFAULT 0,
    usuario_abertura INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_fechamento INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_pedidos_mesa_id ON pedidos(mesa_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_data_pedido ON pedidos(data_pedido);
CREATE INDEX idx_pedidos_data_fechamento ON pedidos(data_fechamento);
CREATE INDEX idx_pedidos_usuario_abertura ON pedidos(usuario_abertura);

-- Tabela de Itens do Pedido
CREATE TABLE itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
    quantidade DECIMAL(10, 2) NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    valor_total DECIMAL(10, 2) NOT NULL,
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'Pendente',  -- Pendente, Em Preparo, Pronto, Entregue, Cancelado
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_preparo TIMESTAMP,
    data_entrega TIMESTAMP
);

CREATE INDEX idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
CREATE INDEX idx_itens_pedido_produto_id ON itens_pedido(produto_id);
CREATE INDEX idx_itens_pedido_status ON itens_pedido(status);

-- Tabela de Formas de Pagamento
CREATE TABLE formas_pagamento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_formas_pagamento_ativo ON formas_pagamento(ativo);

-- Tabela de Pagamentos
CREATE TABLE pagamentos (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE SET NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    referencia VARCHAR(100),  -- Número de cartão, transação, etc.
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_pagamentos_pedido_id ON pagamentos(pedido_id);
CREATE INDEX idx_pagamentos_forma_pagamento_id ON pagamentos(forma_pagamento_id);
CREATE INDEX idx_pagamentos_data_pagamento ON pagamentos(data_pagamento);
CREATE INDEX idx_pagamentos_usuario_id ON pagamentos(usuario_id);

-- Tabela de Notas Fiscais
CREATE TABLE notas_fiscais (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    numero VARCHAR(20) UNIQUE,
    serie VARCHAR(5),
    data_emissao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valor_total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Emitida',  -- Emitida, Cancelada
    xml TEXT,
    pdf TEXT,
    chave_acesso VARCHAR(50),
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_notas_fiscais_pedido_id ON notas_fiscais(pedido_id);
CREATE INDEX idx_notas_fiscais_numero ON notas_fiscais(numero);
CREATE INDEX idx_notas_fiscais_data_emissao ON notas_fiscais(data_emissao);
CREATE INDEX idx_notas_fiscais_chave_acesso ON notas_fiscais(chave_acesso);
CREATE INDEX idx_notas_fiscais_status ON notas_fiscais(status);

-- Tabela de Contas a Pagar
CREATE TABLE contas_pagar (
    id SERIAL PRIMARY KEY,
    descricao VARCHAR(200) NOT NULL,
    fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor_pago DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'Pendente',  -- Pendente, Pago, Cancelado
    numero_documento VARCHAR(20),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contas_pagar_fornecedor_id ON contas_pagar(fornecedor_id);
CREATE INDEX idx_contas_pagar_data_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX idx_contas_pagar_data_pagamento ON contas_pagar(data_pagamento);

-- Tabela de Contas a Receber (para vendas faturadas, eventos ou outros recebimentos)
CREATE TABLE contas_receber (
    id SERIAL PRIMARY KEY,
    descricao VARCHAR(200) NOT NULL,
    cliente_nome VARCHAR(100) NOT NULL,
    cliente_documento VARCHAR(20),
    valor DECIMAL(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    valor_recebido DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'Pendente',  -- Pendente, Recebido, Cancelado
    numero_documento VARCHAR(20),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contas_receber_cliente_nome ON contas_receber(cliente_nome);
CREATE INDEX idx_contas_receber_data_vencimento ON contas_receber(data_vencimento);
CREATE INDEX idx_contas_receber_status ON contas_receber(status);
CREATE INDEX idx_contas_receber_data_recebimento ON contas_receber(data_recebimento);

-- Tabela de Movimentações Financeiras (Caixa)
CREATE TABLE movimentacoes_financeiras (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL, -- Entrada, Saída
    descricao VARCHAR(200) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_movimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE SET NULL,
    conta_pagar_id INTEGER REFERENCES contas_pagar(id) ON DELETE SET NULL,
    conta_receber_id INTEGER REFERENCES contas_receber(id) ON DELETE SET NULL,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    categoria VARCHAR(50),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_movimentacoes_financeiras_tipo ON movimentacoes_financeiras(tipo);
CREATE INDEX idx_movimentacoes_financeiras_data_movimento ON movimentacoes_financeiras(data_movimento);
CREATE INDEX idx_movimentacoes_financeiras_forma_pagamento_id ON movimentacoes_financeiras(forma_pagamento_id);
CREATE INDEX idx_movimentacoes_financeiras_categoria ON movimentacoes_financeiras(categoria);
CREATE INDEX idx_movimentacoes_financeiras_pedido_id ON movimentacoes_financeiras(pedido_id);

-- Tabela de Abertura e Fechamento de Caixa
CREATE TABLE caixas (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_abertura TIMESTAMP NOT NULL,
    valor_abertura DECIMAL(10, 2) NOT NULL DEFAULT 0,
    data_fechamento TIMESTAMP,
    valor_fechamento DECIMAL(10, 2),
    valor_sistema DECIMAL(10, 2),
    diferenca DECIMAL(10, 2),
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'Aberto'  -- Aberto, Fechado
);

CREATE INDEX idx_caixas_usuario_id ON caixas(usuario_id);
CREATE INDEX idx_caixas_data_abertura ON caixas(data_abertura);
CREATE INDEX idx_caixas_data_fechamento ON caixas(data_fechamento);
CREATE INDEX idx_caixas_status ON caixas(status);

-- Tabela para Controle de Saídas de Estoque (não relacionadas a vendas)
CREATE TABLE saidas_estoque (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    quantidade DECIMAL(10, 2) NOT NULL,
    motivo VARCHAR(50) NOT NULL,  -- Perda, Ajuste, Consumo Interno, etc.
    data_saida DATE NOT NULL,
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saidas_estoque_produto_id ON saidas_estoque(produto_id);
CREATE INDEX idx_saidas_estoque_data_saida ON saidas_estoque(data_saida);
CREATE INDEX idx_saidas_estoque_motivo ON saidas_estoque(motivo);

-- Tabela de Cardápio (pode ter diferentes cardápios para diferentes dias/períodos)
CREATE TABLE cardapios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_inicio DATE,
    data_fim DATE,
    dias_semana VARCHAR(7),  -- 0123456 onde 0=Domingo, 6=Sábado
    ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_cardapios_ativo ON cardapios(ativo);
CREATE INDEX idx_cardapios_data_inicio_fim ON cardapios(data_inicio, data_fim);
CREATE INDEX idx_cardapios_dias_semana ON cardapios(dias_semana);

-- Tabela de Relação Cardápio-Produtos
CREATE TABLE cardapios_produtos (
    id SERIAL PRIMARY KEY,
    cardapio_id INTEGER REFERENCES cardapios(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    preco_especial DECIMAL(10, 2),  -- Se NULL, usa o preço padrão do produto
    destaque BOOLEAN DEFAULT FALSE,
    disponivel BOOLEAN DEFAULT TRUE,
    UNIQUE(cardapio_id, produto_id)
);

CREATE INDEX idx_cardapios_produtos_cardapio_id ON cardapios_produtos(cardapio_id);
CREATE INDEX idx_cardapios_produtos_produto_id ON cardapios_produtos(produto_id);
CREATE INDEX idx_cardapios_produtos_disponivel ON cardapios_produtos(disponivel);
CREATE INDEX idx_cardapios_produtos_destaque ON cardapios_produtos(destaque);

-- Tabelas de Log do Sistema
CREATE TABLE logs_sistema (
    id SERIAL PRIMARY KEY,
    nivel VARCHAR(20) NOT NULL, -- INFO, WARNING, ERROR, CRITICAL
    origem VARCHAR(100) NOT NULL, -- Módulo ou componente de origem
    mensagem TEXT NOT NULL,
    stack_trace TEXT,
    dados_adicionais JSONB,
    ip_origem VARCHAR(45),
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_sistema_nivel ON logs_sistema(nivel);
CREATE INDEX idx_logs_sistema_data_hora ON logs_sistema(data_hora);
CREATE INDEX idx_logs_sistema_usuario_id ON logs_sistema(usuario_id);
CREATE INDEX idx_logs_sistema_origem ON logs_sistema(origem);

-- Tabela de Logs de Acesso
CREATE TABLE logs_acesso (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    email VARCHAR(100),
    ip_origem VARCHAR(45) NOT NULL,
    user_agent TEXT,
    acao VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_RESET, etc.
    sucesso BOOLEAN NOT NULL,
    detalhes TEXT,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_acesso_usuario_id ON logs_acesso(usuario_id);
CREATE INDEX idx_logs_acesso_data_hora ON logs_acesso(data_hora);
CREATE INDEX idx_logs_acesso_acao ON logs_acesso(acao);
CREATE INDEX idx_logs_acesso_sucesso ON logs_acesso(sucesso);
