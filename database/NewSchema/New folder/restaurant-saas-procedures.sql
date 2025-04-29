-- =============================================
-- PROCEDURES E FUNCTIONS PARA SISTEMA SAAS MULTI-TENANT DE RESTAURANTE
-- Database: PostgreSQL
-- =============================================

SET search_path TO restaurante;

-- =============================================
-- 1. GERENCIAMENTO DE TENANTS
-- =============================================

-- Criar novo tenant (restaurante)
CREATE OR REPLACE PROCEDURE criar_tenant(
    p_codigo VARCHAR(50),
    p_nome_restaurante VARCHAR(100),
    p_razao_social VARCHAR(100),
    p_cnpj VARCHAR(20),
    p_email VARCHAR(100),
    p_telefone VARCHAR(20),
    p_plano VARCHAR(20) DEFAULT 'basico'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tenant_id INTEGER;
    v_admin_perfil_id INTEGER;
BEGIN
    -- Validar dados básicos
    IF p_codigo IS NULL OR p_nome_restaurante IS NULL THEN
        RAISE EXCEPTION 'Código e nome do restaurante são obrigatórios';
    END IF;
    
    -- Verificar se o código já existe
    IF EXISTS (SELECT 1 FROM tenants WHERE codigo = p_codigo) THEN
        RAISE EXCEPTION 'Código de tenant já existe: %', p_codigo;
    END IF;
    
    -- Verificar se o CNPJ já existe (se não for nulo)
    IF p_cnpj IS NOT NULL AND EXISTS (SELECT 1 FROM tenants WHERE cnpj = p_cnpj) THEN
        RAISE EXCEPTION 'CNPJ já cadastrado: %', p_cnpj;
    END IF;
    
    -- Inserir o novo tenant
    INSERT INTO tenants (
        codigo, 
        nome_restaurante, 
        razao_social, 
        cnpj, 
        email, 
        telefone, 
        plano,
        data_criacao,
        data_atualizacao,
        ativo
    )
    VALUES (
        p_codigo, 
        p_nome_restaurante, 
        p_razao_social, 
        p_cnpj, 
        p_email, 
        p_telefone, 
        p_plano,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        TRUE
    )
    RETURNING id INTO v_tenant_id;
    
    -- Criar perfil de administrador para o tenant
    INSERT INTO perfis (tenant_id, nome, descricao)
    VALUES (v_tenant_id, 'Administrador', 'Acesso total ao sistema')
    RETURNING id INTO v_admin_perfil_id;
    
    -- Associar todas as permissões ao perfil de administrador
    INSERT INTO perfis_permissoes (perfil_id, permissao_id)
    SELECT v_admin_perfil_id, id FROM permissoes;
    
    -- Configurar dados iniciais para o tenant
    -- Configurações padrão
    INSERT INTO tenant_configuracoes (tenant_id, chave, valor)
    VALUES
        (v_tenant_id, 'moeda', 'BRL'),
        (v_tenant_id, 'fuso_horario', 'America/Sao_Paulo'),
        (v_tenant_id, 'formato_data', 'DD/MM/YYYY');
    
    -- Criar categorias básicas
    INSERT INTO categorias (tenant_id, nome, descricao, ativa)
    VALUES
        (v_tenant_id, 'Pratos Principais', 'Pratos principais do cardápio', TRUE),
        (v_tenant_id, 'Bebidas', 'Refrigerantes, sucos e outras bebidas', TRUE),
        (v_tenant_id, 'Sobremesas', 'Doces e sobremesas', TRUE),
        (v_tenant_id, 'Entradas', 'Aperitivos e entradas', TRUE);
    
    -- Associar formas de pagamento padrão
    INSERT INTO tenant_formas_pagamento (tenant_id, forma_pagamento_id, ativo)
    SELECT v_tenant_id, id, TRUE FROM formas_pagamento WHERE ativo = TRUE;
    
    COMMIT;
    
    RAISE NOTICE 'Tenant criado com sucesso: ID=%, Código=%', v_tenant_id, p_codigo;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao criar tenant: %', SQLERRM;
END;
$$;

-- Desativar tenant
CREATE OR REPLACE PROCEDURE desativar_tenant(
    p_tenant_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar se o tenant existe
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Tenant ID % não encontrado', p_tenant_id;
    END IF;
    
    -- Desativar o tenant
    UPDATE tenants
    SET ativo = FALSE,
        data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = p_tenant_id;
    
    -- Registrar log
    INSERT INTO logs_sistema (tenant_id, nivel, origem, mensagem, dados_adicionais)
    VALUES (
        p_tenant_id, 
        'INFO', 
        'desativar_tenant', 
        'Tenant desativado', 
        jsonb_build_object('tenant_id', p_tenant_id)
    );
    
    COMMIT;
    
    RAISE NOTICE 'Tenant ID=% desativado com sucesso', p_tenant_id;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao desativar tenant: %', SQLERRM;
END;
$$;

-- Obter informações do tenant por código
CREATE OR REPLACE FUNCTION get_tenant_info(
    p_codigo VARCHAR(50)
)
RETURNS TABLE (
    id INTEGER,
    codigo VARCHAR(50),
    nome_restaurante VARCHAR(100),
    plano VARCHAR(20),
    ativo BOOLEAN,
    data_criacao TIMESTAMP,
    data_expiracao DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.codigo,
        t.nome_restaurante,
        t.plano,
        t.ativo,
        t.data_criacao,
        t.data_expiracao
    FROM tenants t
    WHERE t.codigo = p_codigo;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant com código % não encontrado', p_codigo;
    END IF;
END;
$$;

-- =============================================
-- 2. SEGURANÇA E AUTENTICAÇÃO
-- =============================================

-- Criar usuário em um tenant
CREATE OR REPLACE PROCEDURE criar_usuario(
    p_tenant_id INTEGER,
    p_nome VARCHAR(100),
    p_email VARCHAR(100),
    p_senha VARCHAR(255),
    p_telefone VARCHAR(20),
    p_perfil_id INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_usuario_id INTEGER;
BEGIN
    -- Validar dados básicos
    IF p_tenant_id IS NULL OR p_nome IS NULL OR p_email IS NULL OR p_senha IS NULL THEN
        RAISE EXCEPTION 'Tenant ID, nome, email e senha são obrigatórios';
    END IF;
    
    -- Verificar se o tenant existe e está ativo
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND ativo = TRUE) THEN
        RAISE EXCEPTION 'Tenant ID % não encontrado ou inativo', p_tenant_id;
    END IF;
    
    -- Verificar se o email já existe para este tenant
    IF EXISTS (SELECT 1 FROM usuarios WHERE tenant_id = p_tenant_id AND email = p_email) THEN
        RAISE EXCEPTION 'Email já cadastrado para este tenant: %', p_email;
    END IF;
    
    -- Inserir o novo usuário
    INSERT INTO usuarios (
        tenant_id,
        nome,
        email,
        senha,
        telefone,
        data_criacao,
        ultimo_acesso,
        ativo
    )
    VALUES (
        p_tenant_id,
        p_nome,
        p_email,
        p_senha, -- Idealmente a senha já deveria vir criptografada
        p_telefone,
        CURRENT_TIMESTAMP,
        NULL,
        TRUE
    )
    RETURNING id INTO v_usuario_id;
    
    -- Associar ao perfil se informado
    IF p_perfil_id IS NOT NULL THEN
        -- Verificar se o perfil existe e pertence ao tenant
        IF NOT EXISTS (SELECT 1 FROM perfis WHERE id = p_perfil_id AND tenant_id = p_tenant_id) THEN
            RAISE EXCEPTION 'Perfil ID % não encontrado ou não pertence ao tenant %', p_perfil_id, p_tenant_id;
        END IF;
        
        INSERT INTO usuarios_perfis (usuario_id, perfil_id)
        VALUES (v_usuario_id, p_perfil_id);
    END IF;
    
    -- Registrar log
    INSERT INTO logs_sistema (
        tenant_id, 
        nivel, 
        origem, 
        mensagem, 
        dados_adicionais
    )
    VALUES (
        p_tenant_id,
        'INFO',
        'criar_usuario',
        'Novo usuário criado',
        jsonb_build_object(
            'usuario_id', v_usuario_id,
            'nome', p_nome,
            'email', p_email
        )
    );
    
    COMMIT;
    
    RAISE NOTICE 'Usuário criado com sucesso: ID=%, Email=%', v_usuario_id, p_email;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao criar usuário: %', SQLERRM;
END;
$$;

-- Verificar autenticação de usuário
CREATE OR REPLACE FUNCTION autenticar_usuario(
    p_email VARCHAR(100),
    p_senha VARCHAR(255),
    p_ip_origem VARCHAR(45)
)
RETURNS TABLE (
    usuario_id INTEGER,
    tenant_id INTEGER,
    nome VARCHAR(100),
    auth_status VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id INTEGER;
    v_tenant_id INTEGER;
    v_nome VARCHAR(100);
    v_status VARCHAR(20);
BEGIN
    -- Tentar localizar o usuário
    SELECT u.id, u.tenant_id, u.nome INTO v_user_id, v_tenant_id, v_nome
    FROM usuarios u
    WHERE u.email = p_email AND u.ativo = TRUE;
    
    -- Verificar se o usuário existe
    IF v_user_id IS NULL THEN
        -- Registrar tentativa de login com usuário não encontrado
        INSERT INTO logs_acesso (
            tenant_id,
            email,
            ip_origem,
            acao,
            sucesso,
            detalhes
        )
        VALUES (
            NULL,
            p_email,
            p_ip_origem,
            'LOGIN_FAILED',
            FALSE,
            'Usuário não encontrado'
        );
        
        RETURN QUERY SELECT NULL::INTEGER, NULL::INTEGER, NULL::VARCHAR, 'USUARIO_NAO_ENCONTRADO'::VARCHAR;
        RETURN;
    END IF;
    
    -- Verificar se o tenant está ativo
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id AND ativo = TRUE) THEN
        INSERT INTO logs_acesso (
            tenant_id,
            usuario_id,
            email,
            ip_origem,
            acao,
            sucesso,
            detalhes
        )
        VALUES (
            v_tenant_id,
            v_user_id,
            p_email,
            p_ip_origem,
            'LOGIN_FAILED',
            FALSE,
            'Tenant inativo'
        );
        
        RETURN QUERY SELECT NULL::INTEGER, NULL::INTEGER, NULL::VARCHAR, 'TENANT_INATIVO'::VARCHAR;
        RETURN;
    END IF;
    
    -- Verificar senha
    IF EXISTS (SELECT 1 FROM usuarios WHERE id = v_user_id AND senha = p_senha) THEN
        -- Atualizar último acesso
        UPDATE usuarios 
        SET ultimo_acesso = CURRENT_TIMESTAMP 
        WHERE id = v_user_id;
        
        -- Registrar login bem sucedido
        INSERT INTO logs_acesso (
            tenant_id,
            usuario_id,
            email,
            ip_origem,
            acao,
            sucesso,
            detalhes
        )
        VALUES (
            v_tenant_id,
            v_user_id,
            p_email,
            p_ip_origem,
            'LOGIN',
            TRUE,
            'Login bem sucedido'
        );
        
        v_status := 'SUCESSO';
    ELSE
        -- Registrar tentativa de login com senha incorreta
        INSERT INTO logs_acesso (
            tenant_id,
            usuario_id,
            email,
            ip_origem,
            acao,
            sucesso,
            detalhes
        )
        VALUES (
            v_tenant_id,
            v_user_id,
            p_email,
            p_ip_origem,
            'LOGIN_FAILED',
            FALSE,
            'Senha incorreta'
        );
        
        v_status := 'SENHA_INCORRETA';
    END IF;
    
    -- Retornar resultado
    RETURN QUERY SELECT v_user_id, v_tenant_id, v_nome, v_status;
END;
$$;

-- Verificar permissões de usuário
CREATE OR REPLACE FUNCTION verificar_permissao(
    p_usuario_id INTEGER,
    p_permissao_nome VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    tem_permissao BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM usuarios_perfis up
        JOIN perfis_permissoes pp ON up.perfil_id = pp.perfil_id
        JOIN permissoes p ON pp.permissao_id = p.id
        WHERE up.usuario_id = p_usuario_id
        AND p.nome = p_permissao_nome
    ) INTO tem_permissao;
    
    RETURN tem_permissao;
END;
$$;

-- =============================================
-- 3. GESTÃO DE ESTOQUE
-- =============================================

-- Registrar entrada de estoque
CREATE OR REPLACE PROCEDURE registrar_entrada_estoque(
    p_tenant_id INTEGER,
    p_produto_id INTEGER,
    p_fornecedor_id INTEGER,
    p_quantidade DECIMAL(10, 2),
    p_preco_unitario DECIMAL(10, 2),
    p_data_entrada DATE,
    p_numero_nota_fiscal VARCHAR(20),
    p_observacao TEXT,
    p_usuario_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_produto_tenant_id INTEGER;
    v_fornecedor_tenant_id INTEGER;
    v_valor_total DECIMAL(10, 2);
    v_entrada_id INTEGER;
BEGIN
    -- Validar dados básicos
    IF p_tenant_id IS NULL OR p_produto_id IS NULL OR p_quantidade IS NULL OR p_preco_unitario IS NULL THEN
        RAISE EXCEPTION 'Tenant ID, produto ID, quantidade e preço unitário são obrigatórios';
    END IF;
    
    -- Verificar se o produto pertence ao tenant
    SELECT tenant_id INTO v_produto_tenant_id FROM produtos WHERE id = p_produto_id;
    
    IF v_produto_tenant_id IS NULL OR v_produto_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Produto ID % não encontrado ou não pertence ao tenant %', p_produto_id, p_tenant_id;
    END IF;
    
    -- Verificar se o fornecedor pertence ao tenant (se informado)
    IF p_fornecedor_id IS NOT NULL THEN
        SELECT tenant_id INTO v_fornecedor_tenant_id FROM fornecedores WHERE id = p_fornecedor_id;
        
        IF v_fornecedor_tenant_id IS NULL OR v_fornecedor_tenant_id != p_tenant_id THEN
            RAISE EXCEPTION 'Fornecedor ID % não encontrado ou não pertence ao tenant %', p_fornecedor_id, p_tenant_id;
        END IF;
    END IF;
    
    -- Calcular valor total
    v_valor_total := p_quantidade * p_preco_unitario;
    
    -- Registrar entrada de estoque
    INSERT INTO entradas_estoque (
        tenant_id,
        produto_id,
        fornecedor_id,
        quantidade,
        preco_unitario,
        valor_total,
        data_entrada,
        numero_nota_fiscal,
        observacao,
        usuario_id
    )
    VALUES (
        p_tenant_id,
        p_produto_id,
        p_fornecedor_id,
        p_quantidade,
        p_preco_unitario,
        v_valor_total,
        COALESCE(p_data_entrada, CURRENT_DATE),
        p_numero_nota_fiscal,
        p_observacao,
        p_usuario_id
    )
    RETURNING id INTO v_entrada_id;
    
    -- Atualizar estoque do produto
    UPDATE produtos
    SET estoque_atual = estoque_atual + p_quantidade,
        preco_custo = p_preco_unitario, -- Atualiza preço de custo com a última entrada
        data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = p_produto_id;
    
    -- Registrar log
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_novos
    )
    VALUES (
        p_tenant_id,
        p_usuario_id,
        'ENTRADA_ESTOQUE',
        'entradas_estoque',
        v_entrada_id,
        jsonb_build_object(
            'produto_id', p_produto_id,
            'quantidade', p_quantidade,
            'valor_total', v_valor_total
        )
    );
    
    COMMIT;
    
    RAISE NOTICE 'Entrada de estoque registrada com sucesso: ID=%, Produto=%, Quantidade=%', 
                v_entrada_id, p_produto_id, p_quantidade;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao registrar entrada de estoque: %', SQLERRM;
END;
$$;

-- Registrar saída de estoque
CREATE OR REPLACE PROCEDURE registrar_saida_estoque(
    p_tenant_id INTEGER,
    p_produto_id INTEGER,
    p_quantidade DECIMAL(10, 2),
    p_motivo VARCHAR(50),
    p_observacao TEXT,
    p_usuario_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_produto_tenant_id INTEGER;
    v_estoque_atual DECIMAL(10, 2);
    v_saida_id INTEGER;
BEGIN
    -- Validar dados básicos
    IF p_tenant_id IS NULL OR p_produto_id IS NULL OR p_quantidade IS NULL OR p_motivo IS NULL THEN
        RAISE EXCEPTION 'Tenant ID, produto ID, quantidade e motivo são obrigatórios';
    END IF;
    
    -- Verificar se o produto pertence ao tenant
    SELECT tenant_id, estoque_atual 
    INTO v_produto_tenant_id, v_estoque_atual 
    FROM produtos 
    WHERE id = p_produto_id;
    
    IF v_produto_tenant_id IS NULL OR v_produto_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Produto ID % não encontrado ou não pertence ao tenant %', p_produto_id, p_tenant_id;
    END IF;
    
    -- Verificar se há estoque suficiente
    IF v_estoque_atual < p_quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente. Atual: %, Solicitado: %', v_estoque_atual, p_quantidade;
    END IF;
    
    -- Registrar saída de estoque
    INSERT INTO saidas_estoque (
        tenant_id,
        produto_id,
        quantidade,
        motivo,
        data_saida,
        observacao,
        usuario_id
    )
    VALUES (
        p_tenant_id,
        p_produto_id,
        p_quantidade,
        p_motivo,
        CURRENT_DATE,
        p_observacao,
        p_usuario_id
    )
    RETURNING id INTO v_saida_id;
    
    -- Atualizar estoque do produto
    UPDATE produtos
    SET estoque_atual = estoque_atual - p_quantidade,
        data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = p_produto_id;
    
    -- Registrar log
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_novos
    )
    VALUES (
        p_tenant_id,
        p_usuario_id,
        'SAIDA_ESTOQUE',
        'saidas_estoque',
        v_saida_id,
        jsonb_build_object(
            'produto_id', p_produto_id,
            'quantidade', p_quantidade,
            'motivo', p_motivo
        )
    );
    
    COMMIT;
    
    RAISE NOTICE 'Saída de estoque registrada com sucesso: ID=%, Produto=%, Quantidade=%', 
                v_saida_id, p_produto_id, p_quantidade;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao registrar saída de estoque: %', SQLERRM;
END;
$$;

-- Verificar produtos com estoque baixo
CREATE OR REPLACE FUNCTION produtos_estoque_baixo(
    p_tenant_id INTEGER
)
RETURNS TABLE (
    produto_id INTEGER,
    codigo VARCHAR(20),
    nome VARCHAR(100),
    categoria VARCHAR(50),
    estoque_atual DECIMAL(10, 2),
    estoque_minimo DECIMAL(10, 2),
    unidade VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS produto_id,
        p.codigo,
        p.nome,
        c.nome AS categoria,
        p.estoque_atual,
        p.estoque_minimo,
        um.nome AS unidade
    FROM 
        produtos p
    LEFT JOIN 
        categorias c ON p.categoria_id = c.id
    LEFT JOIN 
        unidades_medida um ON p.unidade_medida_id = um.id
    WHERE 
        p.tenant_id = p_tenant_id
        AND p.controlar_estoque = TRUE
        AND p.estoque_atual <= p.estoque_minimo
    ORDER BY
        (p.estoque_atual / NULLIF(p.estoque_minimo, 0)) ASC;
END;
$$;

-- =============================================
-- 4. OPERAÇÕES DE VENDA E PEDIDOS
-- =============================================

-- Abrir novo pedido
CREATE OR REPLACE PROCEDURE abrir_pedido(
    p_tenant_id INTEGER,
    p_mesa_id INTEGER,
    p_cliente_nome VARCHAR(100),
    p_observacao TEXT,
    p_usuario_id INTEGER,
    OUT p_pedido_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_mesa_tenant_id INTEGER;
    v_mesa_status VARCHAR(20);
BEGIN
    -- Validar dados básicos
    IF p_tenant_id IS NULL OR p_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID e usuário ID são obrigatórios';
    END IF;
    
    -- Verificar mesa se fornecida
    IF p_mesa_id IS NOT NULL THEN
        SELECT tenant_id, status 
        INTO v_mesa_tenant_id, v_mesa_status 
        FROM mesas 
        WHERE id = p_mesa_id;
        
        IF v_mesa_tenant_id IS NULL OR v_mesa_tenant_id != p_tenant_id THEN
            RAISE EXCEPTION 'Mesa ID % não encontrada ou não pertence ao tenant %', p_mesa_id, p_tenant_id;
        END IF;
        
        IF v_mesa_status != 'Livre' AND v_mesa_status != 'Reservada' THEN
            RAISE EXCEPTION 'Mesa ID % não está disponível (status atual: %)', p_mesa_id, v_mesa_status;
        END IF;
        
        -- Atualizar status da mesa
        UPDATE mesas
        SET status = 'Ocupada'
        WHERE id = p_mesa_id;
    END IF;
    
    -- Criar pedido
    INSERT INTO pedidos (
        tenant_id,
        mesa_id,
        cliente_nome,
        status,
        observacao,
        data_pedido,
        usuario_abertura
    )
    VALUES (
        p_tenant_id,
        p_mesa_id,
        p_cliente_nome,
        'Aberto',
        p_observacao,
        CURRENT_TIMESTAMP,
        p_usuario_id
    )
    RETURNING id INTO p_pedido_id;
    
    -- Registrar log
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_novos
    )
    VALUES (
        p_tenant_id,
        p_usuario_id,
        'ABERTURA_PEDIDO',
        'pedidos',
        p_pedido_id,
        jsonb_build_object(
            'mesa_id', p_mesa_id,
            'cliente_nome', p_cliente_nome
        )
    );
    
    COMMIT;
    
    RAISE NOTICE 'Pedido aberto com sucesso: ID=%', p_pedido_id;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao abrir pedido: %', SQLERRM;
END;
$$;

-- Adicionar item ao pedido
CREATE OR REPLACE PROCEDURE adicionar_item_pedido(
    p_tenant_id INTEGER,
    p_pedido_id INTEGER,
    p_produto_id INTEGER,
    p_quantidade DECIMAL(10, 2),
    p_observacao TEXT,
    p_usuario_id INTEGER,
    OUT p_item_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pedido_tenant_id INTEGER;
    v_pedido_status VARCHAR(20);
    v_produto_tenant_id INTEGER;
    v_produto_disponivel BOOLEAN;
    v_preco_unitario DECIMAL(10, 2);
    v_controlar_estoque BOOLEAN;
    v_estoque_atual DECIMAL(10, 2);
    v_valor_total DECIMAL(10, 2);
BEGIN
    -- Validar dados básicos
    IF p_tenant_id IS NULL OR p_pedido_id IS NULL OR p_produto_id IS NULL OR p_quantidade IS NULL THEN
        RAISE EXCEPTION 'Tenant ID, pedido ID, produto ID e quantidade são obrigatórios';
    END IF;
    
    -- Verificar pedido
    SELECT tenant_id, status 
    INTO v_pedido_tenant_id, v_pedido_status 
    FROM pedidos 
    WHERE id = p_pedido_id;
    
    IF v_pedido_tenant_id IS NULL OR v_pedido_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Pedido ID % não encontrado ou não pertence ao tenant %', p_pedido_id, p_tenant_id;
    END IF;
    
    IF v_pedido_status != 'Aberto' AND v_pedido_status != 'Em Preparo' THEN
        RAISE EXCEPTION 'Pedido ID % não está aberto para adicionar itens (status atual: %)', 
                      p_pedido_id, v_pedido_status;
    END IF;
    
    -- Verificar produto
    SELECT 
        p.tenant_id, 
        p.disponivel_venda, 
        p.preco_venda, 
        p.controlar_estoque, 
        p.estoque_atual
    INTO 
        v_produto_tenant_id, 
        v_produto_disponivel, 
        v_preco_unitario, 
        v_controlar_estoque, 
        v_estoque_atual
    FROM produtos p
    WHERE p.id = p_produto_id;
    
    IF v_produto_tenant_id IS NULL OR v_produto_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Produto ID % não encontrado ou não pertence ao tenant %', p_produto_id, p_tenant_id;
    END IF;
    
    IF NOT v_produto_disponivel THEN
        RAISE EXCEPTION 'Produto ID % não está disponível para venda', p_produto_id;
    END IF;
    
    -- Verificar estoque
    IF v_controlar_estoque AND v_estoque_atual < p_quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto ID %. Atual: %, Solicitado: %', 
                      p_produto_id, v_estoque_atual, p_quantidade;
    END IF;
    
    -- Calcular valor total
    v_valor_total := p_quantidade * v_preco_unitario;
    
    -- Adicionar item ao pedido
    INSERT INTO itens_pedido (
        pedido_id,
        produto_id,
        quantidade,
        preco_unitario,
        valor_total,
        observacao,
        status,
        data_pedido
    )
    VALUES (
        p_pedido_id,
        p_produto_id,
        p_quantidade,
        v_preco_unitario,
        v_valor_total,
        p_observacao,
        'Pendente',
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO p_item_id;
    
    -- Atualizar valor do pedido
    UPDATE pedidos
    SET valor_subtotal = valor_subtotal + v_valor_total,
        valor_total = valor_total + v_valor_total
    WHERE id = p_pedido_id;
    
    -- Baixar estoque se controlar_estoque = TRUE
    IF v_controlar_estoque THEN
        UPDATE produtos
        SET estoque_atual = estoque_atual - p_quantidade,
            data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = p_produto_id;
    END IF;
    
    -- Registrar log
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_novos
    )
    VALUES (
        p_tenant_id,
        p_usuario_id,
        'ADICAO_ITEM_PEDIDO',
        'itens_pedido',
        p_item_id,
        jsonb_build_object(
            'pedido_id', p_pedido_id,
            'produto_id', p_produto_id,
            'quantidade', p_quantidade,
            'valor_total', v_valor_total
        )
    );
    
    COMMIT;
    
    RAISE NOTICE 'Item adicionado ao pedido com sucesso: ID=%, Pedido=%, Produto=%, Valor=%', 
                p_item_id, p_pedido_id, p_produto_id, v_valor_total;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao adicionar item ao pedido: %', SQLERRM;
END;
$$;

-- Atualizar status do pedido
CREATE OR REPLACE PROCEDURE atualizar_status_pedido(
    p_tenant_id INTEGER,
    p_pedido_id INTEGER,
    p_novo_status VARCHAR(20),
    p_usuario_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pedido_tenant_id INTEGER;
    v_pedido_status VARCHAR(20);
    v_pedido_mesa_id INTEGER;
    v_status_validos TEXT[];
BEGIN
    -- Validar dados básicos
    IF p_tenant_id IS NULL OR p_pedido_id IS NULL OR p_novo_status IS NULL THEN
        RAISE EXCEPTION 'Tenant ID, pedido ID e novo status são obrigatórios';
    END IF;
    
    -- Verificar status válidos
    v_status_validos := ARRAY['Aberto', 'Em Preparo', 'Entregue', 'Fechado', 'Cancelado'];
    
    IF NOT (p_novo_status = ANY(v_status_validos)) THEN
        RAISE EXCEPTION 'Status de pedido inválido: %. Status válidos: %', 
                      p_novo_status, array_to_string(v_status_validos, ', ');
    END IF;
    
    -- Verificar pedido
    SELECT tenant_id, status, mesa_id 
    INTO v_pedido_tenant_id, v_pedido_status, v_pedido_mesa_id 
    FROM pedidos 
    WHERE id = p_pedido_id;
    
    IF v_pedido_tenant_id IS NULL OR v_pedido_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Pedido ID % não encontrado ou não pertence ao tenant %', p_pedido_id, p_tenant_id;
    END IF;
    
    -- Verificar se o status atual permite a mudança
    IF v_pedido_status = 'Fechado' AND p_novo_status != 'Fechado' THEN
        RAISE EXCEPTION 'Pedido já está fechado e não pode mudar para status %', p_novo_status;
    END IF;
    
    IF v_pedido_status = 'Cancelado' AND p_novo_status != 'Cancelado' THEN
        RAISE EXCEPTION 'Pedido já está cancelado e não pode mudar para status %', p_novo_status;
    END IF;
    
    -- Atualizar status do pedido
    UPDATE pedidos
    SET status = p_novo_status,
        data_fechamento = CASE WHEN p_novo_status IN ('Fechado', 'Cancelado') THEN CURRENT_TIMESTAMP ELSE data_fechamento END,
        usuario_fechamento = CASE WHEN p_novo_status IN ('Fechado', 'Cancelado') THEN p_usuario_id ELSE usuario_fechamento END
    WHERE id = p_pedido_id;
    
    -- Se o pedido for fechado ou cancelado e tiver mesa, liberar a mesa
    IF p_novo_status IN ('Fechado', 'Cancelado') AND v_pedido_mesa_id IS NOT NULL THEN
        UPDATE mesas
        SET status = 'Livre'
        WHERE id = v_pedido_mesa_id;
    END IF;
    
    -- Registrar log
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_anteriores,
        dados_novos
    )
    VALUES (
        p_tenant_id,
        p_usuario_id,
        'ATUALIZACAO_STATUS_PEDIDO',
        'pedidos',
        p_pedido_id,
        jsonb_build_object('status_anterior', v_pedido_status),
        jsonb_build_object('novo_status', p_novo_status)
    );
    
    COMMIT;
    
    RAISE NOTICE 'Status do pedido atualizado com sucesso: ID=%, Status=% -> %', 
                p_pedido_id, v_pedido_status, p_novo_status;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao atualizar status do pedido: %', SQLERRM;
END;
$$;

-- =============================================
-- 5. FUNÇÕES FINANCEIRAS
-- =============================================

-- Abrir caixa
CREATE OR REPLACE PROCEDURE abrir_caixa(
    p_tenant_id INTEGER,
    p_usuario_id INTEGER,
    p_valor_abertura DECIMAL(10, 2),
    p_observacao TEXT,
    OUT p_caixa_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_caixa_aberto_id INTEGER;
BEGIN
    -- Validar dados básicos
    IF p_tenant_id IS NULL OR p_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID e usuário ID são obrigatórios';
    END IF;
    
    -- Verificar se já existe caixa aberto para o tenant
    SELECT id INTO v_caixa_aberto_id
    FROM caixas
    WHERE tenant_id = p_tenant_id AND status = 'Aberto';
    
    IF v_caixa_aberto_id IS NOT NULL THEN
        RAISE EXCEPTION 'Já existe um caixa aberto para este tenant (ID: %)', v_caixa_aberto_id;
    END IF;
    
    -- Abrir novo caixa
    INSERT INTO caixas (
        tenant_id,
        usuario_id,
        data_abertura,
        valor_abertura,
        observacao,
        status
    )
    VALUES (
        p_tenant_id,
        p_usuario_id,
        CURRENT_TIMESTAMP,
        COALESCE(p_valor_abertura, 0),
        p_observacao,
        'Aberto'
    )
    RETURNING id INTO p_caixa_id;
    
    -- Registrar movimento de abertura de caixa se valor_abertura > 0
    IF COALESCE(p_valor_abertura, 0) > 0 THEN
        INSERT INTO movimentacoes_financeiras (
            tenant_id,
            caixa_id,
            tipo,
            descricao,
            valor,
            data_movimento,
            categoria,
            usuario_id
        )
        VALUES (
            p_tenant_id,
            p_caixa_id,
            'Entrada',
            'Abertura de caixa',
            p_valor_abertura,
            CURRENT_TIMESTAMP,
            'Abertura',
            p_usuario_id
        );
    END IF;
    
    -- Registrar log
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_novos
    )
    VALUES (
        p_tenant_id,
        p_usuario_id,
        'ABERTURA_CAIXA',
        'caixas',
        p_caixa_id,
        jsonb_build_object(
            'valor_abertura', p_valor_abertura,
            'data_abertura', CURRENT_TIMESTAMP
        )
    );
    
    COMMIT;
    
    RAISE NOTICE 'Caixa aberto com sucesso: ID=%, Valor Abertura=%', p_caixa_id, p_valor_abertura;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao abrir caixa: %', SQLERRM;
END;
$$;

-- Fechar caixa
CREATE OR REPLACE PROCEDURE fechar_caixa(
    p_tenant_id INTEGER,
    p_usuario_id INTEGER,
    p_valor_fechamento DECIMAL(10, 2),
    p_observacao TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_caixa_id INTEGER;
    v_valor_sistema DECIMAL(10, 2);
    v_diferenca DECIMAL(10, 2);
BEGIN
    -- Validar dados básicos
    IF p_tenant_id IS NULL OR p_usuario_id IS NULL OR p_valor_fechamento IS NULL THEN
        RAISE EXCEPTION 'Tenant ID, usuário ID e valor de fechamento são obrigatórios';
    END IF;
    
    -- Verificar se existe caixa aberto para o tenant
    SELECT id INTO v_caixa_id
    FROM caixas
    WHERE tenant_id = p_tenant_id AND status = 'Aberto';
    
    IF v_caixa_id IS NULL THEN
        RAISE EXCEPTION 'Não há caixa aberto para este tenant';
    END IF;
    
    -- Calcular valor no sistema (valor abertura + entradas - saídas)
    SELECT 
        COALESCE(c.valor_abertura, 0) + 
        COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.valor ELSE 0 END), 0) - 
        COALESCE(SUM(CASE WHEN m.tipo = 'Saída' THEN m.valor ELSE 0 END), 0)
    INTO v_valor_sistema
    FROM caixas c
    LEFT JOIN movimentacoes_financeiras m ON c.id = m.caixa_id
    WHERE c.id = v_caixa_id;
    
    -- Calcular diferença
    v_diferenca := p_valor_fechamento - v_valor_sistema;
    
    -- Fechar o caixa
    UPDATE caixas
    SET 
        status = 'Fechado',
        data_fechamento = CURRENT_TIMESTAMP,
        valor_fechamento = p_valor_fechamento,
        valor_sistema = v_valor_sistema,
        diferenca = v_diferenca,
        observacao = CASE 
                        WHEN observacao IS NULL THEN p_observacao
                        WHEN p_observacao IS NULL THEN observacao
                        ELSE observacao || E'\n' || p_observacao
                     END
    WHERE id = v_caixa_id;
    
    -- Registrar log
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_novos
    )
    VALUES (
        p_tenant_id,
        p_usuario_id,
        'FECHAMENTO_CAIXA',
        'caixas',
        v_caixa_id,
        jsonb_build_object(
            'valor_fechamento', p_valor_fechamento,
            'valor_sistema', v_valor_sistema,
            'diferenca', v_diferenca,
            'data_fechamento', CURRENT_TIMESTAMP
        )
    );
    
    COMMIT;
    
    RAISE NOTICE 'Caixa fechado com sucesso: ID=%, Valor Sistema=%, Valor Informado=%, Diferença=%', 
                v_caixa_id, v_valor_sistema, p_valor_fechamento, v_diferenca;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao fechar caixa: %', SQLERRM;
END;
$$;

-- Registrar pagamento de pedido
CREATE OR REPLACE PROCEDURE registrar_pagamento_pedido(
    p_tenant_id INTEGER,
    p_pedido_id INTEGER,
    p_forma_pagamento_id INTEGER,
    p_valor DECIMAL(10, 2),
    p_referencia VARCHAR(100),
    p_observacao TEXT,
    p_usuario_id INTEGER,
    OUT p_pagamento_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_pedido_tenant_id INTEGER;
    v_pedido_status VARCHAR(20);
    v_pedido_valor_total DECIMAL(10, 2);
    v_valor_ja_pago DECIMAL(10, 2);
    v_caixa_id INTEGER;
BEGIN
    -- Validar dados básicos
    IF p_tenant_id IS NULL OR p_pedido_id IS NULL OR p_forma_pagamento_id IS NULL OR p_valor IS NULL THEN
        RAISE EXCEPTION 'Tenant ID, pedido ID, forma de pagamento ID e valor são obrigatórios';
    END IF;
    
    -- Verificar pedido
    SELECT tenant_id, status, valor_total 
    INTO v_pedido_tenant_id, v_pedido_status, v_pedido_valor_total 
    FROM pedidos 
    WHERE id = p_pedido_id;
    
    IF v_pedido_tenant_id IS NULL OR v_pedido_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Pedido ID % não encontrado ou não pertence ao tenant %', p_pedido_id, p_tenant_id;
    END IF;
    
    IF v_pedido_status = 'Cancelado' THEN
        RAISE EXCEPTION 'Não é possível registrar pagamento para um pedido cancelado';
    END IF;
    
    -- Verificar forma de pagamento
    IF NOT EXISTS (
        SELECT 1 
        FROM tenant_formas_pagamento 
        WHERE tenant_id = p_tenant_id AND forma_pagamento_id = p_forma_pagamento_id AND ativo = TRUE
    ) THEN
        RAISE EXCEPTION 'Forma de pagamento ID % não disponível para este tenant', p_forma_pagamento_id;
    END IF;
    
    -- Calcular total já pago
    SELECT COALESCE(SUM(valor), 0) INTO v_valor_ja_pago
    FROM pagamentos
    WHERE tenant_id = p_tenant_id AND pedido_id = p_pedido_id;
    
    -- Verificar valor do pagamento
    IF (v_valor_ja_pago + p_valor) > v_pedido_valor_total THEN
        RAISE EXCEPTION 'Valor do pagamento excede o saldo pendente. Total: %, Já pago: %, Tentando pagar: %',
                      v_pedido_valor_total, v_valor_ja_pago, p_valor;
    END IF;
    
    -- Verificar se existe caixa aberto
    SELECT id INTO v_caixa_id
    FROM caixas
    WHERE tenant_id = p_tenant_id AND status = 'Aberto';
    
    IF v_caixa_id IS NULL THEN
        RAISE EXCEPTION 'Não há caixa aberto para registrar o pagamento';
    END IF;
    
    -- Registrar pagamento
    INSERT INTO pagamentos (
        tenant_id,
        pedido_id,
        forma_pagamento_id,
        valor,
        data_pagamento,
        referencia,
        observacao,
        usuario_id
    )
    VALUES (
        p_tenant_id,
        p_pedido_id,
        p_forma_pagamento_id,
        p_valor,
        CURRENT_TIMESTAMP,
        p_referencia,
        p_observacao,
        p_usuario_id
    )
    RETURNING id INTO p_pagamento_id;
    
    -- Registrar movimento no caixa
    INSERT INTO movimentacoes_financeiras (
        tenant_id,
        caixa_id,
        tipo,
        descricao,
        valor,
        data_movimento,
        forma_pagamento_id,
        pedido_id,
        categoria,
        usuario_id
    )
    VALUES (
        p_tenant_id,
        v_caixa_id,
        'Entrada',
        'Pagamento de pedido #' || p_pedido_id,
        p_valor,
        CURRENT_TIMESTAMP,
        p_forma_pagamento_id,
        p_pedido_id,
        'Venda',
        p_usuario_id
    );
    
    -- Verificar se o pedido foi totalmente pago e atualizar status
    IF (v_valor_ja_pago + p_valor) >= v_pedido_valor_total THEN
        UPDATE pedidos
        SET status = 'Fechado',
            data_fechamento = CURRENT_TIMESTAMP,
            usuario_fechamento = p_usuario_id
        WHERE id = p_pedido_id AND status != 'Fechado';
    END IF;
    
    -- Registrar log
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_novos
    )
    VALUES (
        p_tenant_id,
        p_usuario_id,
        'PAGAMENTO_PEDIDO',
        'pagamentos',
        p_pagamento_id,
        jsonb_build_object(
            'pedido_id', p_pedido_id,
            'forma_pagamento_id', p_forma_pagamento_id,
            'valor', p_valor
        )
    );
    
    COMMIT;
    
    RAISE NOTICE 'Pagamento registrado com sucesso: ID=%, Pedido=%, Valor=%', 
                p_pagamento_id, p_pedido_id, p_valor;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao registrar pagamento: %', SQLERRM;
END;
$$;

-- Relatório de vendas por período
CREATE OR REPLACE FUNCTION relatorio_vendas_periodo(
    p_tenant_id INTEGER,
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS TABLE (
    data_venda DATE,
    quantidade_pedidos BIGINT,
    valor_total DECIMAL(12, 2),
    valor_medio DECIMAL(12, 2),
    produtos_vendidos BIGINT,
    cancelamentos BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH vendas_diarias AS (
        SELECT 
            date_trunc('day', p.data_pedido)::date AS data_venda,
            COUNT(DISTINCT p.id) AS quantidade_pedidos,
            SUM(CASE WHEN p.status != 'Cancelado' THEN p.valor_total ELSE 0 END) AS valor_total,
            COUNT(DISTINCT CASE WHEN p.status = 'Cancelado' THEN p.id ELSE NULL END) AS cancelamentos,
            SUM(CASE WHEN p.status != 'Cancelado' THEN 
                (SELECT COALESCE(SUM(ip.quantidade), 0) FROM itens_pedido ip WHERE ip.pedido_id = p.id)
                ELSE 0 END) AS produtos_vendidos
        FROM 
            pedidos p
        WHERE 
            p.tenant_id = p_tenant_id
            AND p.data_pedido >= p_data_inicio
            AND p.data_pedido < (p_data_fim + INTERVAL '1 day')
        GROUP BY 
            date_trunc('day', p.data_pedido)::date
    )
    SELECT 
        vd.data_venda,
        vd.quantidade_pedidos,
        vd.valor_total,
        CASE WHEN vd.quantidade_pedidos > 0 
             THEN (vd.valor_total / vd.quantidade_pedidos)
             ELSE 0 
        END AS valor_medio,
        vd.produtos_vendidos,
        vd.cancelamentos
    FROM 
        vendas_diarias vd
    ORDER BY 
        vd.data_venda;
END;
$$;

-- =============================================
-- 6. UTILITÁRIOS E MANUTENÇÃO
-- =============================================

-- Função para registrar log de sistema
CREATE OR REPLACE PROCEDURE registrar_log(
    p_tenant_id INTEGER,
    p_nivel VARCHAR(20),
    p_origem VARCHAR(100),
    p_mensagem TEXT,
    p_stack_trace TEXT DEFAULT NULL,
    p_dados_adicionais JSONB DEFAULT NULL,
    p_usuario_id INTEGER DEFAULT NULL,
    p_ip_origem VARCHAR(45) DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO logs_sistema (
        tenant_id,
        nivel,
        origem,
        mensagem,
        stack_trace,
        dados_adicionais,
        ip_origem,
        usuario_id,
        data_hora
    )
    VALUES (
        p_tenant_id,
        p_nivel,
        p_origem,
        p_mensagem,
        p_stack_trace,
        p_dados_adicionais,
        p_ip_origem,
        p_usuario_id,
        CURRENT_TIMESTAMP
    );
    
    -- Dependendo do nível do log, podemos logar no console do PostgreSQL
    IF p_nivel IN ('ERROR', 'CRITICAL') THEN
        RAISE WARNING 'LOG %: % - %', p_nivel, p_origem, p_mensagem;
    END IF;
END;
$$;

-- Limpar logs antigos
CREATE OR REPLACE PROCEDURE limpar_logs_antigos(
    p_tenant_id INTEGER,
    p_dias_logs_sistema INTEGER DEFAULT 90,
    p_dias_logs_acesso INTEGER DEFAULT 180,
    p_dias_logs_atividade INTEGER DEFAULT 365
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_logs_sistema_removidos INTEGER;
    v_logs_acesso_removidos INTEGER;
    v_logs_atividade_removidos INTEGER;
BEGIN
    -- Limpar logs do sistema
    DELETE FROM logs_sistema
    WHERE tenant_id = p_tenant_id
    AND data_hora < (CURRENT_DATE - p_dias_logs_sistema);
    GET DIAGNOSTICS v_logs_sistema_removidos = ROW_COUNT;
    
    -- Limpar logs de acesso
    DELETE FROM logs_acesso
    WHERE tenant_id = p_tenant_id
    AND data_hora < (CURRENT_DATE - p_dias_logs_acesso);
    GET DIAGNOSTICS v_logs_acesso_removidos = ROW_COUNT;
    
    -- Limpar logs de atividade
    DELETE FROM logs_atividade
    WHERE tenant_id = p_tenant_id
    AND data_hora < (CURRENT_DATE - p_dias_logs_atividade);
    GET DIAGNOSTICS v_logs_atividade_removidos = ROW_COUNT;
    
    COMMIT;
    
    RAISE NOTICE 'Logs antigos removidos: Sistema=%, Acesso=%, Atividade=%', 
                v_logs_sistema_removidos, v_logs_acesso_removidos, v_logs_atividade_removidos;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE EXCEPTION 'Erro ao limpar logs antigos: %', SQLERRM;
END;
$$;

-- Obter estatísticas de uso do tenant
CREATE OR REPLACE FUNCTION estatisticas_tenant(
    p_tenant_id INTEGER
)
RETURNS TABLE (
    usuarios_ativos BIGINT,
    produtos_cadastrados BIGINT,
    produtos_baixo_estoque BIGINT,
    mesas_ativas BIGINT,
    mesas_ocupadas BIGINT,
    pedidos_abertos BIGINT,
    pedidos_mes_atual BIGINT,
    faturamento_mes_atual DECIMAL(12, 2),
    faturamento_mes_anterior DECIMAL(12, 2),
    ticket_medio_mes_atual DECIMAL(12, 2),
    produtos_mais_vendidos JSON
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_mes_atual DATE := date_trunc('month', CURRENT_DATE);
    v_mes_anterior DATE := date_trunc('month', CURRENT_DATE - INTERVAL '1 month');
    v_produtos_mais_vendidos JSON;
BEGIN
    -- Obter top produtos mais vendidos do mês atual
    SELECT json_agg(temp)
    INTO v_produtos_mais_vendidos
    FROM (
        SELECT 
            p.id,
            p.nome,
            SUM(ip.quantidade) AS quantidade_vendida,
            SUM(ip.valor_total) AS valor_total
        FROM 
            produtos p
        JOIN 
            itens_pedido ip ON p.id = ip.produto_id
        JOIN 
            pedidos pe ON ip.pedido_id = pe.id
        WHERE 
            p.tenant_id = p_tenant_id
            AND pe.tenant_id = p_tenant_id
            AND pe.status != 'Cancelado'
            AND pe.data_pedido >= v_mes_atual
        GROUP BY 
            p.id, p.nome
        ORDER BY 
            SUM(ip.quantidade) DESC
        LIMIT 5
    ) temp;

    RETURN QUERY
    SELECT
        -- Usuários ativos
        (SELECT COUNT(*) FROM usuarios WHERE tenant_id = p_tenant_id AND ativo = TRUE),
        
        -- Produtos cadastrados
        (SELECT COUNT(*) FROM produtos WHERE tenant_id = p_tenant_id),
        
        -- Produtos com estoque abaixo do mínimo
        (SELECT COUNT(*) 
         FROM produtos 
         WHERE tenant_id = p_tenant_id 
           AND controlar_estoque = TRUE 
           AND estoque_atual <= estoque_minimo),
        
        -- Mesas ativas
        (SELECT COUNT(*) FROM mesas WHERE tenant_id = p_tenant_id AND ativa = TRUE),
        
        -- Mesas ocupadas
        (SELECT COUNT(*) FROM mesas WHERE tenant_id = p_tenant_id AND status = 'Ocupada'),
        
        -- Pedidos abertos
        (SELECT COUNT(*) 
         FROM pedidos 
         WHERE tenant_id = p_tenant_id 
           AND status IN ('Aberto', 'Em Preparo')),
        
        -- Pedidos no mês atual
        (SELECT COUNT(*) 
         FROM pedidos 
         WHERE tenant_id = p_tenant_id 
           AND data_pedido >= v_mes_atual),
        
        -- Faturamento mês atual
        (SELECT COALESCE(SUM(valor_total), 0) 
         FROM pedidos 
         WHERE tenant_id = p_tenant_id 
           AND status != 'Cancelado'
           AND data_pedido >= v_mes_atual),
        
        -- Faturamento mês anterior
        (SELECT COALESCE(SUM(valor_total), 0) 
         FROM pedidos 
         WHERE tenant_id = p_tenant_id 
           AND status != 'Cancelado'
           AND data_pedido >= v_mes_anterior
           AND data_pedido < v_mes_atual),
        
        -- Ticket médio mês atual
        (SELECT CASE 
                  WHEN COUNT(*) > 0 THEN SUM(valor_total) / COUNT(*)
                  ELSE 0
                END
         FROM pedidos 
         WHERE tenant_id = p_tenant_id 
           AND status != 'Cancelado'
           AND data_pedido >= v_mes_atual),
        
        -- Produtos mais vendidos
        v_produtos_mais_vendidos;
END;
$$;

-- Função para validar permissões em nível de tenant
CREATE OR REPLACE FUNCTION verificar_acesso_tenant(
    p_usuario_id INTEGER,
    p_tenant_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_usuario_tenant_id INTEGER;
BEGIN
    -- Verificar se o usuário existe e está ativo
    SELECT tenant_id INTO v_usuario_tenant_id
    FROM usuarios
    WHERE id = p_usuario_id AND ativo = TRUE;
    
    -- Verificar se o tenant do usuário corresponde ao tenant requisitado
    RETURN (v_usuario_tenant_id = p_tenant_id);
END;
$$;
