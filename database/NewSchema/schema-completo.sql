-- Script de criação de schema e tabelas para Sistema SaaS Multi-Tenant de Restaurante
-- Banco de dados: PostgreSQL
-- Ajustado para alinhamento com menu

-- Apagar schema existente se necessário (comentar em produção)
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
    categoria VARCHAR(50) NOT NULL, -- 'geral', 'fiscal', 'impressao', 'interface'
    descricao TEXT,
    UNIQUE(tenant_id, chave)
);

CREATE INDEX idx_tenant_configuracoes_tenant_id ON tenant_configuracoes(tenant_id);
CREATE INDEX idx_tenant_configuracoes_categoria ON tenant_configuracoes(categoria);

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
    foto TEXT,
    pin_rapido VARCHAR(6), -- Para login rápido em PDV
    tema_interface VARCHAR(20) DEFAULT 'default', -- default, dark, light, etc.
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
    nivel_acesso INTEGER DEFAULT 1, -- Para controle granular de permissões
    cor VARCHAR(7), -- Cor de identificação (ex: #FF0000)
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_perfis_tenant_id ON perfis(tenant_id);

-- Tabela de Permissões (Global, compartilhada entre tenants)
CREATE TABLE permissoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    descricao TEXT,
    modulo VARCHAR(30) NOT NULL, -- 'pedidos', 'financeiro', 'estoque', etc.
    nivel_requisito INTEGER DEFAULT 1 -- Nível mínimo necessário
);

CREATE INDEX idx_permissoes_modulo ON permissoes(modulo);

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
-- TABELAS DE CLIENTES
-- =============================================

-- Tabela de Clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefone VARCHAR(20) NOT NULL,
    cpf VARCHAR(14),
    endereco VARCHAR(200),
    bairro VARCHAR(100),
    cidade VARCHAR(50),
    estado VARCHAR(2),
    cep VARCHAR(10),
    data_nascimento DATE,
    observacoes TEXT,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_visita TIMESTAMP,
    pontos_fidelidade INTEGER DEFAULT 0,
    classificacao VARCHAR(20), -- 'vip', 'regular', 'novo', 'inativo'
    limite_credito DECIMAL(10, 2) DEFAULT 0,
    foto TEXT,
    redes_sociais JSONB, -- {instagram, facebook, etc}
    preferencias JSONB, -- Preferências de mesa, pratos, etc.
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, telefone),
    UNIQUE(tenant_id, codigo)
);

CREATE INDEX idx_clientes_tenant_id ON clientes(tenant_id);
CREATE INDEX idx_clientes_nome ON clientes(nome);
CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_clientes_cpf ON clientes(cpf);
CREATE INDEX idx_clientes_ativo ON clientes(ativo);
CREATE INDEX idx_clientes_classificacao ON clientes(classificacao);

-- Endereços de Entrega do Cliente
CREATE TABLE enderecos_cliente (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL, -- ex: "Casa", "Trabalho"
    endereco VARCHAR(200) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(50) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    cep VARCHAR(10) NOT NULL,
    referencia TEXT,
    padrao BOOLEAN DEFAULT FALSE,
    coordenadas POINT -- Para geolocalização (longitude, latitude)
);

CREATE INDEX idx_enderecos_cliente_id ON enderecos_cliente(cliente_id);

-- Programas de Fidelidade
CREATE TABLE programas_fidelidade (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) NOT NULL, -- 'pontos', 'visitas', 'valor'
    pontos_por_valor DECIMAL(10, 2), -- Para tipo 'pontos': quantos pontos por real gasto
    valor_por_ponto DECIMAL(10, 2), -- Para resgate: quanto vale cada ponto em reais
    visitas_para_premio INTEGER, -- Para tipo 'visitas': quantas visitas para ganhar prêmio
    valor_minimo_acumulado DECIMAL(10, 2), -- Para tipo 'valor': valor mínimo acumulado
    validade_pontos INTEGER, -- Em dias
    regras JSONB, -- Regras específicas em formato JSON
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_programas_fidelidade_tenant_id ON programas_fidelidade(tenant_id);
CREATE INDEX idx_programas_fidelidade_ativo ON programas_fidelidade(ativo);

-- Histórico de pontos de fidelidade
CREATE TABLE historico_fidelidade (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    programa_id INTEGER NOT NULL REFERENCES programas_fidelidade(id) ON DELETE CASCADE,
    pedido_id INTEGER, -- Será referenciado depois da criação da tabela pedidos
    tipo VARCHAR(20) NOT NULL, -- 'credito', 'debito', 'ajuste', 'expiracao'
    pontos INTEGER NOT NULL,
    valor_referencia DECIMAL(10, 2), -- Valor gasto ou valor do resgate
    motivo VARCHAR(100) NOT NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_expiracao DATE,
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_historico_fidelidade_tenant_id ON historico_fidelidade(tenant_id);
CREATE INDEX idx_historico_fidelidade_cliente_id ON historico_fidelidade(cliente_id);
CREATE INDEX idx_historico_fidelidade_data_registro ON historico_fidelidade(data_registro);

-- =============================================
-- TABELAS DE FUNCIONÁRIOS
-- =============================================

-- Cargos
CREATE TABLE cargos (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    salario_base DECIMAL(10, 2),
    comissao_percentual DECIMAL(5, 2) DEFAULT 0,
    beneficios JSONB,
    responsabilidades TEXT,
    nivel_hierarquico INTEGER DEFAULT 1,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_cargos_tenant_id ON cargos(tenant_id);

-- Tabela de Funcionários
CREATE TABLE funcionarios (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14),
    rg VARCHAR(20),
    data_nascimento DATE,
    endereco VARCHAR(200),
    cidade VARCHAR(50),
    estado VARCHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    telefone_emergencia VARCHAR(20),
    email VARCHAR(100),
    cargo_id INTEGER REFERENCES cargos(id) ON DELETE SET NULL,
    salario DECIMAL(10, 2),
    data_contratacao DATE,
    data_demissao DATE,
    banco VARCHAR(50),
    agencia VARCHAR(10),
    conta VARCHAR(20),
    pix VARCHAR(100),
    foto TEXT,
    documentos JSONB, -- Para armazenar referências a documentos digitalizados
    observacoes TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, cpf)
);

CREATE INDEX idx_funcionarios_tenant_id ON funcionarios(tenant_id);
CREATE INDEX idx_funcionarios_usuario_id ON funcionarios(usuario_id);
CREATE INDEX idx_funcionarios_cargo_id ON funcionarios(cargo_id);
CREATE INDEX idx_funcionarios_ativo ON funcionarios(ativo);

-- Tabela de Escalas de Trabalho
CREATE TABLE escalas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    cor VARCHAR(7), -- Cor para visualização no calendário
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
    data_final DATE,
    recorrente BOOLEAN DEFAULT TRUE,
    observacoes TEXT
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
    intervalo_inicio TIME,
    intervalo_fim TIME,
    horas_trabalhadas DECIMAL(5, 2), -- Calculado após registro da saída
    horas_extras DECIMAL(5, 2) DEFAULT 0,
    observacao TEXT,
    ip_registro VARCHAR(45),
    geolocalizacao POINT,
    usuario_registro_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_registro_ponto_funcionario_id ON registro_ponto(funcionario_id);
CREATE INDEX idx_registro_ponto_data ON registro_ponto(data);

-- Férias e licenças
CREATE TABLE ferias_licencas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL, -- 'ferias', 'licenca_medica', 'licenca_maternidade', 'outros'
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    observacoes TEXT,
    anexos JSONB, -- Referências a documentos (atestados, etc.)
    status VARCHAR(20) DEFAULT 'aprovado', -- 'solicitado', 'aprovado', 'negado', 'cancelado'
    aprovado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_aprovacao TIMESTAMP
);

CREATE INDEX idx_ferias_licencas_tenant_id ON ferias_licencas(tenant_id);
CREATE INDEX idx_ferias_licencas_funcionario_id ON ferias_licencas(funcionario_id);
CREATE INDEX idx_ferias_licencas_data_inicio ON ferias_licencas(data_inicio);

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
    cor VARCHAR(7),
    ordem INTEGER DEFAULT 0,
    ativa BOOLEAN DEFAULT TRUE,
    destacada BOOLEAN DEFAULT FALSE,
    categoria_pai_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    icone VARCHAR(50),
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_categorias_tenant_id ON categorias(tenant_id);
CREATE INDEX idx_categorias_ativa ON categorias(ativa);
CREATE INDEX idx_categorias_categoria_pai_id ON categorias(categoria_pai_id);

-- Tabela de Unidades de Medida (Global, compartilhada entre tenants)
CREATE TABLE unidades_medida (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(20) NOT NULL UNIQUE,
    simbolo VARCHAR(5) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL -- 'peso', 'volume', 'unidade', 'comprimento'
);

CREATE INDEX idx_unidades_medida_tipo ON unidades_medida(tipo);

-- Grupos de Modificadores (para opções de personalização de produtos)
CREATE TABLE grupos_modificadores (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    minimo_selecao INTEGER DEFAULT 0,
    maximo_selecao INTEGER DEFAULT 1,
    obrigatorio BOOLEAN DEFAULT FALSE,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_grupos_modificadores_tenant_id ON grupos_modificadores(tenant_id);

-- Modificadores (opções para os produtos: ex: ponto da carne, acompanhamentos, etc)
CREATE TABLE modificadores (
    id SERIAL PRIMARY KEY,
    grupo_id INTEGER NOT NULL REFERENCES grupos_modificadores(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    preco_adicional DECIMAL(10, 2) DEFAULT 0,
    disponivel BOOLEAN DEFAULT TRUE,
    padrao BOOLEAN DEFAULT FALSE,
    ordem INTEGER DEFAULT 0
);

CREATE INDEX idx_modificadores_grupo_id ON modificadores(grupo_id);
CREATE INDEX idx_modificadores_disponivel ON modificadores(disponivel);

-- Tabela de Produtos
CREATE TABLE produtos (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    codigo_barras VARCHAR(30),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    descricao_curta VARCHAR(255),
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    preco_custo DECIMAL(10, 2) NOT NULL,
    preco_venda DECIMAL(10, 2) NOT NULL,
    estoque_atual DECIMAL(10, 2) DEFAULT 0,
    estoque_minimo DECIMAL(10, 2) DEFAULT 0,
    unidade_medida_id INTEGER REFERENCES unidades_medida(id) ON DELETE SET NULL,
    imagem TEXT,
    imagens_adicionais JSONB, -- Array de URLs/caminhos de imagens
    tempo_preparo INTEGER, -- Tempo médio em minutos
    destacado BOOLEAN DEFAULT FALSE,
    controlar_estoque BOOLEAN DEFAULT TRUE,
    disponivel_venda BOOLEAN DEFAULT TRUE,
    disponivel_delivery BOOLEAN DEFAULT TRUE,
    tipo VARCHAR(20) NOT NULL DEFAULT 'produto', -- 'produto', 'combo', 'servico', 'insumo'
    aliquota_icms DECIMAL(5, 2),
    ncm VARCHAR(10), -- Nomenclatura Comum do Mercosul
    cest VARCHAR(10), -- Código Especificador da Substituição Tributária
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, codigo)
);

CREATE INDEX idx_produtos_tenant_id ON produtos(tenant_id);
CREATE INDEX idx_produtos_categoria_id ON produtos(categoria_id);
CREATE INDEX idx_produtos_codigo_barras ON produtos(codigo_barras);
CREATE INDEX idx_produtos_disponivel_venda ON produtos(disponivel_venda);
CREATE INDEX idx_produtos_disponivel_delivery ON produtos(disponivel_delivery);
CREATE INDEX idx_produtos_controlar_estoque ON produtos(controlar_estoque);
CREATE INDEX idx_produtos_tipo ON produtos(tipo);
CREATE INDEX idx_produtos_destacado ON produtos(destacado);

-- Relação entre produtos e grupos de modificadores
CREATE TABLE produtos_grupos_modificadores (
    id SERIAL PRIMARY KEY,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    grupo_modificador_id INTEGER NOT NULL REFERENCES grupos_modificadores(id) ON DELETE CASCADE,
    UNIQUE(produto_id, grupo_modificador_id)
);

CREATE INDEX idx_produtos_grupos_produto_id ON produtos_grupos_modificadores(produto_id);
CREATE INDEX idx_produtos_grupos_grupo_id ON produtos_grupos_modificadores(grupo_modificador_id);

-- Composição de produtos (para produtos compostos/combos)
CREATE TABLE produtos_composicao (
    id SERIAL PRIMARY KEY,
    produto_principal_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    produto_componente_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade DECIMAL(10, 3) NOT NULL,
    UNIQUE(produto_principal_id, produto_componente_id)
);

CREATE INDEX idx_produtos_composicao_principal_id ON produtos_composicao(produto_principal_id);
CREATE INDEX idx_produtos_composicao_componente_id ON produtos_composicao(produto_componente_id);

-- Tabela de Fornecedores
CREATE TABLE fornecedores (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    nome VARCHAR(100) NOT NULL,
    razao_social VARCHAR(100),
    cnpj VARCHAR(20),
    inscricao_estadual VARCHAR(20),
    endereco VARCHAR(200),
    cidade VARCHAR(50),
    estado VARCHAR(2),
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email VARCHAR(100),
    site VARCHAR(100),
    contato_nome VARCHAR(100),
    contato_telefone VARCHAR(20),
    contato_email VARCHAR(100),
    prazo_entrega INTEGER, -- dias médios para entrega
    condicao_pagamento VARCHAR(50),
    observacoes TEXT,
    produtos_fornecidos JSONB, -- Lista de produtos que este fornecedor fornece
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, cnpj),
    UNIQUE(tenant_id, codigo)
);

CREATE INDEX idx_fornecedores_tenant_id ON fornecedores(tenant_id);
CREATE INDEX idx_fornecedores_nome ON fornecedores(nome);
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
    data_validade DATE,
    numero_nota_fiscal VARCHAR(20),
    serie_nota_fiscal VARCHAR(5),
    chave_nfe VARCHAR(44),
    lote VARCHAR(20),
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_entradas_estoque_tenant_id ON entradas_estoque(tenant_id);
CREATE INDEX idx_entradas_estoque_produto_id ON entradas_estoque(produto_id);
CREATE INDEX idx_entradas_estoque_data_entrada ON entradas_estoque(data_entrada);
CREATE INDEX idx_entradas_estoque_data_validade ON entradas_estoque(data_validade);

-- Tabela de Saídas de Estoque (não relacionadas a vendas)
CREATE TABLE saidas_estoque (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade DECIMAL(10, 2) NOT NULL,
    motivo VARCHAR(50) NOT NULL, -- 'perda', 'dano', 'consumo_interno', 'ajuste', 'vencimento'
    data_saida DATE NOT NULL,
    setor_destino VARCHAR(50), -- Para consumo interno: 'cozinha', 'bar', etc.
    funcionario_id INTEGER REFERENCES funcionarios(id) ON DELETE SET NULL, -- Quem retirou/solicitou
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL -- Quem registrou
);

CREATE INDEX idx_saidas_estoque_tenant_id ON saidas_estoque(tenant_id);
CREATE INDEX idx_saidas_estoque_produto_id ON saidas_estoque(produto_id);
CREATE INDEX idx_saidas_estoque_data_saida ON saidas_estoque(data_saida);
CREATE INDEX idx_saidas_estoque_motivo ON saidas_estoque(motivo);

-- Inventário de Estoque
CREATE TABLE inventarios_estoque (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    data_inventario DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'aberto', -- 'aberto', 'concluido', 'cancelado'
    observacoes TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_inventarios_estoque_tenant_id ON inventarios_estoque(tenant_id);
CREATE INDEX idx_inventarios_estoque_data_inventario ON inventarios_estoque(data_inventario);
CREATE INDEX idx_inventarios_estoque_status ON inventarios_estoque(status);

-- Itens do Inventário
CREATE TABLE itens_inventario (
    id SERIAL PRIMARY KEY,
    inventario_id INTEGER NOT NULL REFERENCES inventarios_estoque(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade_sistema DECIMAL(10, 2) NOT NULL,
    quantidade_real DECIMAL(10, 2),
    diferenca DECIMAL(10, 2), -- Calculado: quantidade_real - quantidade_sistema
    observacao TEXT,
    ajustado BOOLEAN DEFAULT FALSE -- Se já foi feito ajuste no estoque
);

CREATE INDEX idx_itens_inventario_inventario_id ON itens_inventario(inventario_id);
CREATE INDEX idx_itens_inventario_produto_id ON itens_inventario(produto_id);

-- =============================================
-- TABELAS DE ATENDIMENTO
-- =============================================

-- Áreas do Estabelecimento (Salão, Varanda, Bar, etc.)
CREATE TABLE areas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    cor VARCHAR(7),
    ativa BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_areas_tenant_id ON areas(tenant_id);
CREATE INDEX idx_areas_ativa ON areas(ativa);

-- Tabela de Mesas
CREATE TABLE mesas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    numero VARCHAR(10) NOT NULL,
    capacidade INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'Livre', -- 'Livre', 'Ocupada', 'Reservada', 'Manutenção'
    area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
    posicao_x INTEGER,
    posicao_y INTEGER,
    tipo VARCHAR(20) DEFAULT 'mesa', -- 'mesa', 'balcao', 'quiosque', etc.
    forma VARCHAR(20) DEFAULT 'redonda', -- 'redonda', 'quadrada', 'retangular'
    largura INTEGER, -- Para mesas não redondas
    altura INTEGER, -- Para mesas não redondas
    qrcode TEXT, -- URL ou dados do QR Code para acesso
    observacoes TEXT,
    ativa BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, numero)
);

CREATE INDEX idx_mesas_tenant_id ON mesas(tenant_id);
CREATE INDEX idx_mesas_status ON mesas(status);
CREATE INDEX idx_mesas_area_id ON mesas(area_id);
CREATE INDEX idx_mesas_ativa ON mesas(ativa);

-- Tabela de Reservas
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    mesa_id INTEGER REFERENCES mesas(id) ON DELETE SET NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(100) NOT NULL,
    cliente_telefone VARCHAR(20) NOT NULL,
    cliente_email VARCHAR(100),
    data_reserva DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME,
    num_pessoas INTEGER NOT NULL,
    origem VARCHAR(20) DEFAULT 'local', -- 'local', 'telefone', 'site', 'app'
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'Confirmada', -- 'Confirmada', 'Cancelada', 'Concluída', 'No-show'
    motivo_cancelamento TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacoes_internas TEXT, -- Visível apenas para funcionários
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_reservas_tenant_id ON reservas(tenant_id);
CREATE INDEX idx_reservas_mesa_id ON reservas(mesa_id);
CREATE INDEX idx_reservas_cliente_id ON reservas(cliente_id);
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
    hora_inicio TIME,
    hora_fim TIME,
    tipo VARCHAR(20) DEFAULT 'padrao', -- 'padrao', 'promocional', 'especial'
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_cardapios_tenant_id ON cardapios(tenant_id);
CREATE INDEX idx_cardapios_ativo ON cardapios(ativo);
CREATE INDEX idx_cardapios_tipo ON cardapios(tipo);

-- Tabela de Relação Cardápio-Produtos
CREATE TABLE cardapios_produtos (
    id SERIAL PRIMARY KEY,
    cardapio_id INTEGER REFERENCES cardapios(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id) ON DELETE CASCADE,
    preco_especial DECIMAL(10, 2),
    destaque BOOLEAN DEFAULT FALSE,
    disponivel BOOLEAN DEFAULT TRUE,
    ordem INTEGER DEFAULT 0,
    UNIQUE(cardapio_id, produto_id)
);

CREATE INDEX idx_cardapios_produtos_cardapio_id ON cardapios_produtos(cardapio_id);
CREATE INDEX idx_cardapios_produtos_produto_id ON cardapios_produtos(produto_id);
CREATE INDEX idx_cardapios_produtos_disponivel ON cardapios_produtos(disponivel);

-- =============================================
-- TABELAS DE VENDAS E PEDIDOS
-- =============================================

-- Origens de Pedido (para personalização de tipos de pedido)
CREATE TABLE origens_pedido (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50),
    cor VARCHAR(7),
    requer_cliente BOOLEAN DEFAULT FALSE,
    requer_endereco BOOLEAN DEFAULT FALSE,
    requer_mesa BOOLEAN DEFAULT FALSE,
    requer_entregador BOOLEAN DEFAULT FALSE,
    taxa_servico DECIMAL(5, 2) DEFAULT 0, -- Percentual
    taxa_entrega_padrao DECIMAL(10, 2) DEFAULT 0, -- Valor fixo
    ativa BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_origens_pedido_tenant_id ON origens_pedido(tenant_id);
CREATE INDEX idx_origens_pedido_ativa ON origens_pedido(ativa);

-- Status de Pedido (para personalização de fluxo)
CREATE TABLE status_pedido (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    icone VARCHAR(50),
    cor VARCHAR(7),
    ordem INTEGER NOT NULL,
    permite_alteracao BOOLEAN DEFAULT TRUE,
    permite_cancelamento BOOLEAN DEFAULT TRUE,
    status_final BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    acoes_automaticas JSONB, -- Ações que ocorrem ao atingir este status
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_status_pedido_tenant_id ON status_pedido(tenant_id);
CREATE INDEX idx_status_pedido_ativo ON status_pedido(ativo);
CREATE INDEX idx_status_pedido_ordem ON status_pedido(ordem);

-- Tabela de Pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20), -- Código para visualização do cliente
    origem_id INTEGER REFERENCES origens_pedido(id) ON DELETE SET NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'local', -- 'local', 'viagem', 'delivery', 'drive_thru', 'ifood'
    mesa_id INTEGER REFERENCES mesas(id) ON DELETE SET NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(100),
    cliente_telefone VARCHAR(20),
    endereco_entrega_id INTEGER REFERENCES enderecos_cliente(id) ON DELETE SET NULL,
    status_id INTEGER REFERENCES status_pedido(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'Aberto', -- Para compatibilidade
    funcionario_id INTEGER REFERENCES funcionarios(id) ON DELETE SET NULL, -- Atendente
    observacao TEXT,
    observacao_interna TEXT, -- Apenas para funcionários
    observacao_entrega TEXT, -- Instruções para entrega
    tempo_preparo_estimado INTEGER, -- Em minutos
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_preparacao TIMESTAMP,
    data_finalizado TIMESTAMP,
    data_entrega TIMESTAMP,
    data_fechamento TIMESTAMP,
    subtotal DECIMAL(10, 2) DEFAULT 0, -- Soma dos itens
    desconto_percentual DECIMAL(5, 2) DEFAULT 0,
    desconto_valor DECIMAL(10, 2) DEFAULT 0, -- Calculado a partir do percentual ou fixo
    acrescimo_percentual DECIMAL(5, 2) DEFAULT 0,
    acrescimo_valor DECIMAL(10, 2) DEFAULT 0, -- Calculado a partir do percentual ou fixo
    taxa_entrega DECIMAL(10, 2) DEFAULT 0,
    taxa_servico DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) DEFAULT 0, -- Calculado final
    cupom_id INTEGER, -- Será referenciado após criação da tabela de cupons
    entregador_id INTEGER REFERENCES funcionarios(id) ON DELETE SET NULL,
    usuario_abertura INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_fechamento INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    dispositivo_origem VARCHAR(50), -- 'app', 'web', 'totem', 'caixa'
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    origem_integracao VARCHAR(50), -- Para pedidos de integrações: 'ifood', 'rappi', 'site'
    codigo_integracao VARCHAR(50), -- Número do pedido na plataforma externa
    json_integracao JSONB -- Dados adicionais da integração
);

CREATE INDEX idx_pedidos_tenant_id ON pedidos(tenant_id);
CREATE INDEX idx_pedidos_origem_id ON pedidos(origem_id);
CREATE INDEX idx_pedidos_mesa_id ON pedidos(mesa_id);
CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_status_id ON pedidos(status_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_data_pedido ON pedidos(data_pedido);
CREATE INDEX idx_pedidos_tipo ON pedidos(tipo);
CREATE INDEX idx_pedidos_funcionario_id ON pedidos(funcionario_id);
CREATE INDEX idx_pedidos_entregador_id ON pedidos(entregador_id);

-- Adicionando referências que dependiam da criação da tabela de pedidos
ALTER TABLE historico_fidelidade 
ADD CONSTRAINT fk_historico_fidelidade_pedido_id 
FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL;

-- Cupons de Desconto
CREATE TABLE cupons (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) NOT NULL, -- 'percentual', 'valor_fixo'
    valor DECIMAL(10, 2) NOT NULL, -- Percentual ou valor fixo
    valor_minimo_pedido DECIMAL(10, 2) DEFAULT 0,
    valor_maximo_desconto DECIMAL(10, 2), -- Para limitar desconto percentual
    data_inicio DATE NOT NULL,
    data_fim DATE,
    limite_usos INTEGER, -- NULL = ilimitado
    usos_restantes INTEGER,
    clientes_especificos JSONB, -- IDs de clientes específicos (NULL = todos)
    categorias_aplicaveis JSONB, -- IDs de categorias onde o cupom é válido (NULL = todas)
    produtos_aplicaveis JSONB, -- IDs de produtos onde o cupom é válido (NULL = todos)
    aplicavel_delivery BOOLEAN DEFAULT TRUE,
    aplicavel_local BOOLEAN DEFAULT TRUE,
    primeira_compra_apenas BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, codigo)
);

CREATE INDEX idx_cupons_tenant_id ON cupons(tenant_id);
CREATE INDEX idx_cupons_codigo ON cupons(codigo);
CREATE INDEX idx_cupons_data_inicio_fim ON cupons(data_inicio, data_fim);
CREATE INDEX idx_cupons_ativo ON cupons(ativo);

-- Adicionar referência ao cupom na tabela pedidos
ALTER TABLE pedidos 
ADD CONSTRAINT fk_pedidos_cupom_id 
FOREIGN KEY (cupom_id) REFERENCES cupons(id) ON DELETE SET NULL;

-- Tabela de Itens do Pedido
CREATE TABLE itens_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    codigo_produto VARCHAR(20),
    nome_produto VARCHAR(100) NOT NULL, -- Para histórico
    quantidade DECIMAL(10, 2) NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL, -- Preço no momento da venda
    subtotal DECIMAL(10, 2) NOT NULL, -- quantidade * preco_unitario
    desconto_percentual DECIMAL(5, 2) DEFAULT 0,
    desconto_valor DECIMAL(10, 2) DEFAULT 0,
    acrescimo_percentual DECIMAL(5, 2) DEFAULT 0,
    acrescimo_valor DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) NOT NULL, -- Calculado final com descontos/acréscimos
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'Pendente', -- 'Pendente', 'Em Preparo', 'Pronto', 'Entregue', 'Cancelado'
    impresso_cozinha BOOLEAN DEFAULT FALSE,
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_preparo TIMESTAMP,
    data_entrega TIMESTAMP,
    ordem_preparo INTEGER, -- Para definir prioridade na cozinha
    cancelado BOOLEAN DEFAULT FALSE,
    motivo_cancelamento TEXT,
    usuario_cancelamento INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_itens_pedido_pedido_id ON itens_pedido(pedido_id);
CREATE INDEX idx_itens_pedido_produto_id ON itens_pedido(produto_id);
CREATE INDEX idx_itens_pedido_status ON itens_pedido(status);
CREATE INDEX idx_itens_pedido_cancelado ON itens_pedido(cancelado);

-- Tabela de Modificadores Aplicados aos Itens
CREATE TABLE itens_pedido_modificadores (
    id SERIAL PRIMARY KEY,
    item_pedido_id INTEGER NOT NULL REFERENCES itens_pedido(id) ON DELETE CASCADE,
    modificador_id INTEGER NOT NULL REFERENCES modificadores(id) ON DELETE RESTRICT,
    nome_modificador VARCHAR(50) NOT NULL, -- Para histórico
    preco_adicional DECIMAL(10, 2) DEFAULT 0,
    observacao TEXT
);

CREATE INDEX idx_itens_pedido_modificadores_item_id ON itens_pedido_modificadores(item_pedido_id);
CREATE INDEX idx_itens_pedido_modificadores_modificador_id ON itens_pedido_modificadores(modificador_id);

-- =============================================
-- TABELAS FINANCEIRAS
-- =============================================

-- Categorias Financeiras
CREATE TABLE categorias_financeiras (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'entrada', 'saida', 'ambos'
    descricao TEXT,
    cor VARCHAR(7), -- Código de cor HTML (#RRGGBB)
    icone VARCHAR(50), -- Código de ícone
    ordem INTEGER DEFAULT 0, -- Para ordenação na interface
    categoria_pai_id INTEGER REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_categorias_financeiras_tenant_id ON categorias_financeiras(tenant_id);
CREATE INDEX idx_categorias_financeiras_tipo ON categorias_financeiras(tipo);
CREATE INDEX idx_categorias_financeiras_ativo ON categorias_financeiras(ativo);

-- Centros de Custo
CREATE TABLE centros_custo (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT,
    responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    orcamento_mensal DECIMAL(10, 2),
    cor VARCHAR(7),
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_centros_custo_tenant_id ON centros_custo(tenant_id);
CREATE INDEX idx_centros_custo_ativo ON centros_custo(ativo);

-- Tabela de Formas de Pagamento (Global, compartilhada entre tenants)
CREATE TABLE formas_pagamento (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL, -- 'dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'cheque', 'outros'
    icone VARCHAR(50),
    ativo BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_formas_pagamento_ativo ON formas_pagamento(ativo);
CREATE INDEX idx_formas_pagamento_tipo ON formas_pagamento(tipo);

-- Tabelas de Formas de Pagamento por Tenant
CREATE TABLE tenant_formas_pagamento (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE CASCADE,
    taxa_percentual DECIMAL(5, 2) DEFAULT 0, -- Taxa cobrada pelo serviço (%)
    valor_minimo DECIMAL(10, 2) DEFAULT 0, -- Valor mínimo para aceitar esta forma
    prazo_recebimento INTEGER DEFAULT 0, -- Em dias
    instrucoes TEXT, -- Instruções específicas (ex: chave PIX)
    ordem INTEGER DEFAULT 0,
    permite_troco BOOLEAN DEFAULT FALSE,
    exige_comprovante BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    configuracoes JSONB, -- Configurações específicas da integração
    UNIQUE(tenant_id, forma_pagamento_id)
);

CREATE INDEX idx_tenant_formas_pagamento_tenant_id ON tenant_formas_pagamento(tenant_id);
CREATE INDEX idx_tenant_formas_pagamento_ativo ON tenant_formas_pagamento(ativo);

-- Tabela de Caixas
CREATE TABLE caixas (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    nome VARCHAR(50), -- Ex: "Caixa Principal", "Caixa Bar"
    terminal VARCHAR(20), -- Identificação do terminal físico
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_abertura TIMESTAMP NOT NULL,
    valor_abertura DECIMAL(10, 2) NOT NULL DEFAULT 0,
    data_fechamento TIMESTAMP,
    valor_fechamento DECIMAL(10, 2),
    valor_sistema DECIMAL(10, 2), -- Valor calculado pelo sistema
    diferenca DECIMAL(10, 2), -- Calculado: valor_fechamento - valor_sistema
    justificativa_diferenca TEXT,
    observacao TEXT,
    status VARCHAR(20) DEFAULT 'Aberto', -- 'Aberto', 'Fechado', 'Fechado com pendências'
    conferido BOOLEAN DEFAULT FALSE,
    conferido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_conferencia TIMESTAMP
);

CREATE INDEX idx_caixas_tenant_id ON caixas(tenant_id);
CREATE INDEX idx_caixas_usuario_id ON caixas(usuario_id);
CREATE INDEX idx_caixas_status ON caixas(status);
CREATE INDEX idx_caixas_data_abertura ON caixas(data_abertura);

-- Tabela de Pagamentos
CREATE TABLE pagamentos (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    caixa_id INTEGER REFERENCES caixas(id) ON DELETE SET NULL,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    tipo_pagamento VARCHAR(20) NOT NULL, -- 'pedido', 'conta_receber', 'outros'
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE RESTRICT,
    valor DECIMAL(10, 2) NOT NULL,
    valor_recebido DECIMAL(10, 2), -- Para cálculo de troco
    troco DECIMAL(10, 2) DEFAULT 0,
    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parcelas INTEGER DEFAULT 1,
    bandeira_cartao VARCHAR(30), -- Para pagamentos com cartão
    autorizacao VARCHAR(50), -- Código de autorização do cartão/transação
    nsu VARCHAR(30), -- Número Sequencial Único (para cartões)
    referencia VARCHAR(100), -- Identificação externa
    status VARCHAR(20) DEFAULT 'Confirmado', -- 'Confirmado', 'Pendente', 'Recusado', 'Estornado'
    comprovante TEXT, -- URL ou caminho para comprovante digitalizado
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_pagamentos_tenant_id ON pagamentos(tenant_id);
CREATE INDEX idx_pagamentos_caixa_id ON pagamentos(caixa_id);
CREATE INDEX idx_pagamentos_pedido_id ON pagamentos(pedido_id);
CREATE INDEX idx_pagamentos_forma_pagamento_id ON pagamentos(forma_pagamento_id);
CREATE INDEX idx_pagamentos_data_pagamento ON pagamentos(data_pagamento);
CREATE INDEX idx_pagamentos_status ON pagamentos(status);

-- Tabela de Movimentações Financeiras
CREATE TABLE movimentacoes_financeiras (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    caixa_id INTEGER REFERENCES caixas(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL, -- 'Entrada', 'Saída'
    descricao VARCHAR(200) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_movimento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE SET NULL,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    categoria_id INTEGER REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
    centro_custo_id INTEGER REFERENCES centros_custo(id) ON DELETE SET NULL,
    conta_pagar_id INTEGER, -- Será referenciado após criação da tabela
    conta_receber_id INTEGER, -- Será referenciado após criação da tabela
    referencia VARCHAR(100), -- Alguma referência externa ou número de documento
    comprovante TEXT, -- URL ou caminho para comprovante digitalizado
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_movimentacoes_financeiras_tenant_id ON movimentacoes_financeiras(tenant_id);
CREATE INDEX idx_movimentacoes_financeiras_caixa_id ON movimentacoes_financeiras(caixa_id);
CREATE INDEX idx_movimentacoes_financeiras_tipo ON movimentacoes_financeiras(tipo);
CREATE INDEX idx_movimentacoes_financeiras_data_movimento ON movimentacoes_financeiras(data_movimento);
CREATE INDEX idx_movimentacoes_financeiras_forma_pagamento_id ON movimentacoes_financeiras(forma_pagamento_id);
CREATE INDEX idx_movimentacoes_financeiras_categoria_id ON movimentacoes_financeiras(categoria_id);
CREATE INDEX idx_movimentacoes_financeiras_centro_custo_id ON movimentacoes_financeiras(centro_custo_id);

-- Tabela de Contas a Pagar
CREATE TABLE contas_pagar (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    descricao VARCHAR(200) NOT NULL,
    fornecedor_id INTEGER REFERENCES fornecedores(id) ON DELETE SET NULL,
    categoria_id INTEGER REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
    centro_custo_id INTEGER REFERENCES centros_custo(id) ON DELETE SET NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_emissao DATE,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor_pago DECIMAL(10, 2),
    juros DECIMAL(10, 2) DEFAULT 0,
    multa DECIMAL(10, 2) DEFAULT 0,
    desconto DECIMAL(10, 2) DEFAULT 0,
    valor_final DECIMAL(10, 2), -- Calculado após pagamento
    status VARCHAR(20) DEFAULT 'Pendente', -- 'Pendente', 'Pago', 'Parcial', 'Atrasado', 'Cancelado'
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE SET NULL,
    recorrente BOOLEAN DEFAULT FALSE,
    periodicidade VARCHAR(20), -- 'mensal', 'trimestral', 'semestral', 'anual'
    numero_documento VARCHAR(50),
    numero_parcela INTEGER,
    total_parcelas INTEGER,
    comprovante TEXT, -- URL ou caminho para documento digitalizado
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contas_pagar_tenant_id ON contas_pagar(tenant_id);
CREATE INDEX idx_contas_pagar_fornecedor_id ON contas_pagar(fornecedor_id);
CREATE INDEX idx_contas_pagar_categoria_id ON contas_pagar(categoria_id);
CREATE INDEX idx_contas_pagar_centro_custo_id ON contas_pagar(centro_custo_id);
CREATE INDEX idx_contas_pagar_data_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX idx_contas_pagar_status ON contas_pagar(status);

-- Tabela de Contas a Receber
CREATE TABLE contas_receber (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    codigo VARCHAR(20),
    descricao VARCHAR(200) NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(100) NOT NULL,
    cliente_documento VARCHAR(20),
    categoria_id INTEGER REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_emissao DATE,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    valor_recebido DECIMAL(10, 2),
    juros DECIMAL(10, 2) DEFAULT 0,
    multa DECIMAL(10, 2) DEFAULT 0,
    desconto DECIMAL(10, 2) DEFAULT 0,
    valor_final DECIMAL(10, 2), -- Calculado após recebimento
    status VARCHAR(20) DEFAULT 'Pendente', -- 'Pendente', 'Recebido', 'Parcial', 'Atrasado', 'Cancelado'
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE SET NULL,
    numero_documento VARCHAR(50),
    numero_parcela INTEGER,
    total_parcelas INTEGER,
    comprovante TEXT, -- URL ou caminho para documento digitalizado
    observacao TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contas_receber_tenant_id ON contas_receber(tenant_id);
CREATE INDEX idx_contas_receber_cliente_id ON contas_receber(cliente_id);
CREATE INDEX idx_contas_receber_categoria_id ON contas_receber(categoria_id);
CREATE INDEX idx_contas_receber_data_vencimento ON contas_receber(data_vencimento);
CREATE INDEX idx_contas_receber_status ON contas_receber(status);

-- Adicionando referências que dependiam da criação das tabelas
ALTER TABLE movimentacoes_financeiras 
ADD CONSTRAINT fk_movimentacoes_conta_pagar_id 
FOREIGN KEY (conta_pagar_id) REFERENCES contas_pagar(id) ON DELETE SET NULL;

ALTER TABLE movimentacoes_financeiras 
ADD CONSTRAINT fk_movimentacoes_conta_receber_id 
FOREIGN KEY (conta_receber_id) REFERENCES contas_receber(id) ON DELETE SET NULL;

-- Comissões de vendas
CREATE TABLE comissoes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    valor_venda DECIMAL(10, 2) NOT NULL,
    percentual_comissao DECIMAL(5, 2) NOT NULL,
    valor_comissao DECIMAL(10, 2) NOT NULL,
    data_venda DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente', -- 'pendente', 'pago', 'cancelado'
    data_pagamento DATE,
    forma_pagamento_id INTEGER REFERENCES formas_pagamento(id) ON DELETE SET NULL,
    observacoes TEXT,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_comissoes_tenant_id ON comissoes(tenant_id);
CREATE INDEX idx_comissoes_funcionario_id ON comissoes(funcionario_id);
CREATE INDEX idx_comissoes_pedido_id ON comissoes(pedido_id);
CREATE INDEX idx_comissoes_data_venda ON comissoes(data_venda);
CREATE INDEX idx_comissoes_status ON comissoes(status);

-- =============================================
-- TABELAS DE CONFIGURAÇÕES E ADMINISTRAÇÃO
-- =============================================

-- Configurações fiscais
CREATE TABLE configuracoes_fiscais (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    valor TEXT NOT NULL,
    descricao TEXT,
    categoria VARCHAR(50) NOT NULL, -- 'impostos', 'nfe', 'certificados', 'aliquotas'
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, nome)
);

CREATE INDEX idx_configuracoes_fiscais_tenant_id ON configuracoes_fiscais(tenant_id);
CREATE INDEX idx_configuracoes_fiscais_categoria ON configuracoes_fiscais(categoria);

-- Configurações de impressão
CREATE TABLE configuracoes_impressao (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'comanda', 'pedido_cozinha', 'conta', 'recibo'
    impressora VARCHAR(100),
    nome_impressora_local VARCHAR(100),
    tipo_conexao VARCHAR(20), -- 'local', 'rede', 'api'
    endereco_ip VARCHAR(45),
    porta VARCHAR(10),
    formato VARCHAR(20), -- 'A4', '80mm', '58mm', 'termica'
    copias_padrao INTEGER DEFAULT 1,
    modelo_layout TEXT, -- Template para impressão
    mostrar_logo BOOLEAN DEFAULT TRUE,
    cabecalho TEXT,
    rodape TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, tipo)
);

CREATE INDEX idx_configuracoes_impressao_tenant_id ON configuracoes_impressao(tenant_id);

-- Integrações com sistemas externos
CREATE TABLE integracoes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'ifood', 'uber_eats', 'pagseguro', 'mercadopago'
    nome VARCHAR(100) NOT NULL,
    chave_api VARCHAR(255),
    token_acesso TEXT,
    token_refresh TEXT,
    url_callback VARCHAR(255),
    url_webhook VARCHAR(255),
    configuracoes JSONB,
    ultima_sincronizacao TIMESTAMP,
    intervalo_sincronizacao INTEGER DEFAULT 5, -- Em minutos
    status VARCHAR(20) DEFAULT 'ativo', -- 'ativo', 'inativo', 'erro', 'configurando'
    mensagem_erro TEXT,
    data_expiracao_token TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, tipo)
);

CREATE INDEX idx_integracoes_tenant_id ON integracoes(tenant_id);
CREATE INDEX idx_integracoes_tipo ON integracoes(tipo);
CREATE INDEX idx_integracoes_status ON integracoes(status);

-- Backup e Restauração
CREATE TABLE backups (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'completo', 'parcial', 'configuracoes'
    tamanho_bytes BIGINT,
    caminho_arquivo TEXT,
    hash_verificacao VARCHAR(64),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    observacoes TEXT,
    status VARCHAR(20) DEFAULT 'sucesso', -- 'sucesso', 'erro', 'em_progresso'
    detalhes_erro TEXT
);

CREATE INDEX idx_backups_tenant_id ON backups(tenant_id);
CREATE INDEX idx_backups_data_criacao ON backups(data_criacao);

-- Atualizações do sistema
CREATE TABLE atualizacoes_sistema (
    id SERIAL PRIMARY KEY,
    versao VARCHAR(20) NOT NULL,
    data_lancamento DATE NOT NULL,
    detalhes TEXT,
    tipo VARCHAR(20) NOT NULL, -- 'major', 'minor', 'patch', 'hotfix'
    notas_versao TEXT,
    obrigatoria BOOLEAN DEFAULT FALSE,
    url_changelog VARCHAR(255),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_atualizacoes_sistema_versao ON atualizacoes_sistema(versao);
CREATE INDEX idx_atualizacoes_sistema_data_lancamento ON atualizacoes_sistema(data_lancamento);

-- Atualizações por tenant
CREATE TABLE tenant_atualizacoes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    atualizacao_id INTEGER NOT NULL REFERENCES atualizacoes_sistema(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'disponivel', -- 'disponivel', 'instalada', 'erro', 'agendada'
    data_instalacao TIMESTAMP,
    instalado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    mensagem_erro TEXT,
    UNIQUE(tenant_id, atualizacao_id)
);

CREATE INDEX idx_tenant_atualizacoes_tenant_id ON tenant_atualizacoes(tenant_id);
CREATE INDEX idx_tenant_atualizacoes_status ON tenant_atualizacoes(status);

-- Dashboard Widgets (configurações de painéis)
CREATE TABLE dashboard_widgets (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'vendas_dia', 'pedidos_abertos', 'estoque_critico', etc.
    posicao_x INTEGER NOT NULL,
    posicao_y INTEGER NOT NULL,
    largura INTEGER NOT NULL,
    altura INTEGER NOT NULL,
    configuracoes JSONB,
    titulo VARCHAR(100),
    atualizacao_automatica BOOLEAN DEFAULT TRUE,
    intervalo_atualizacao INTEGER DEFAULT 5, -- Em minutos
    visivel BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_dashboard_widgets_tenant_id ON dashboard_widgets(tenant_id);
CREATE INDEX idx_dashboard_widgets_usuario_id ON dashboard_widgets(usuario_id);

-- Notificações do sistema
CREATE TABLE notificacoes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL, -- 'sistema', 'estoque', 'financeiro', 'pedido', 'customizada'
    titulo VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    link VARCHAR(255),
    icone VARCHAR(50),
    nivel VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'success'
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expira_em TIMESTAMP,
    destinatarios JSONB -- Pode conter IDs de usuários específicos ou grupos
);

CREATE INDEX idx_notificacoes_tenant_id ON notificacoes(tenant_id);
CREATE INDEX idx_notificacoes_data_criacao ON notificacoes(data_criacao);
CREATE INDEX idx_notificacoes_nivel ON notificacoes(nivel);

-- Leitura de notificações por usuário
CREATE TABLE notificacoes_usuarios (
    id SERIAL PRIMARY KEY,
    notificacao_id INTEGER NOT NULL REFERENCES notificacoes(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    lida BOOLEAN DEFAULT FALSE,
    data_leitura TIMESTAMP,
    UNIQUE(notificacao_id, usuario_id)
);

CREATE INDEX idx_notificacoes_usuarios_notificacao_id ON notificacoes_usuarios(notificacao_id);
CREATE INDEX idx_notificacoes_usuarios_usuario_id ON notificacoes_usuarios(usuario_id);
CREATE INDEX idx_notificacoes_usuarios_lida ON notificacoes_usuarios(lida);

-- =============================================
-- TABELAS DE LOGS E AUDITORIA
-- =============================================

-- Tabela de Logs do Sistema
CREATE TABLE logs_sistema (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
    nivel VARCHAR(20) NOT NULL, -- 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
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
    acao VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET'
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
    dispositivo VARCHAR(100),
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_atividade_tenant_id ON logs_atividade(tenant_id);
CREATE INDEX idx_logs_atividade_usuario_id ON logs_atividade(usuario_id);
CREATE INDEX idx_logs_atividade_data_hora ON logs_atividade(data_hora);
CREATE INDEX idx_logs_atividade_acao ON logs_atividade(acao);
