-- =============================================
-- SCRIPT DE SETUP PARA NOVOS TENANTS
-- Sistema SaaS Multi-Tenant de Restaurante
-- Database: PostgreSQL
-- =============================================

-- Definir schema para operações
SET search_path TO restaurante;

-- =============================================
-- FUNÇÃO PRINCIPAL DE ONBOARDING
-- =============================================

CREATE OR REPLACE PROCEDURE setup_novo_tenant(
    -- Dados básicos do restaurante
    p_codigo VARCHAR(50),
    p_nome_restaurante VARCHAR(100),
    p_razao_social VARCHAR(100),
    p_cnpj VARCHAR(20),
    p_telefone VARCHAR(20),
    p_email VARCHAR(100),
    p_endereco VARCHAR(200),
    p_cidade VARCHAR(50),
    p_estado VARCHAR(2),
    p_cep VARCHAR(10),
    p_plano VARCHAR(20) DEFAULT 'basico',
    
    -- Dados do usuário administrador
    p_admin_nome VARCHAR(100),
    p_admin_email VARCHAR(100),
    p_admin_senha VARCHAR(255), -- Já deve vir hashada da aplicação
    p_admin_telefone VARCHAR(20)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tenant_id INTEGER;
    v_admin_id INTEGER;
    v_admin_perfil_id INTEGER;
    v_categoria_id INTEGER;
    v_unidade_id INTEGER;
    v_mesa_id INTEGER;
    v_cardapio_id INTEGER;
BEGIN
    -- Validar dados básicos obrigatórios
    IF p_codigo IS NULL OR p_nome_restaurante IS NULL THEN
        RAISE EXCEPTION 'Código e nome do restaurante são obrigatórios';
    END IF;
    
    IF p_admin_nome IS NULL OR p_admin_email IS NULL OR p_admin_senha IS NULL THEN
        RAISE EXCEPTION 'Nome, email e senha do administrador são obrigatórios';
    END IF;

    -- Iniciar transação
    BEGIN
        -- 1. CRIAR O TENANT
        INSERT INTO tenants (
            codigo,
            nome_restaurante,
            razao_social,
            cnpj,
            telefone,
            email,
            endereco,
            cidade,
            estado,
            cep,
            plano,
            logo,
            site,
            data_criacao,
            data_atualizacao,
            ativo,
            configuracoes
        )
        VALUES (
            p_codigo,
            p_nome_restaurante,
            p_razao_social,
            p_cnpj,
            p_telefone,
            p_email,
            p_endereco,
            p_cidade,
            p_estado,
            p_cep,
            p_plano,
            NULL, -- Logo (será configurada depois)
            NULL, -- Site (será configurado depois)
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            TRUE,
            '{"moeda": "BRL", "fuso_horario": "America/Sao_Paulo", "formato_data": "DD/MM/YYYY"}'::JSONB
        )
        RETURNING id INTO v_tenant_id;
        
        -- 2. CONFIGURAÇÕES BÁSICAS DO TENANT
        INSERT INTO tenant_configuracoes (tenant_id, chave, valor)
        VALUES
            (v_tenant_id, 'moeda', 'BRL'),
            (v_tenant_id, 'fuso_horario', 'America/Sao_Paulo'),
            (v_tenant_id, 'formato_data', 'DD/MM/YYYY'),
            (v_tenant_id, 'formato_hora', 'HH:mm'),
            (v_tenant_id, 'taxa_servico_padrao', '10'),
            (v_tenant_id, 'impressora_cozinha', 'Padrão'),
            (v_tenant_id, 'impressora_bar', 'Padrão'),
            (v_tenant_id, 'impressora_conta', 'Padrão'),
            (v_tenant_id, 'modo_operacao', 'completo'),
            (v_tenant_id, 'permitir_divisao_conta', 'true'),
            (v_tenant_id, 'exigir_comanda', 'false');
        
        -- 3. CRIAR PERFIS
        -- Perfil Administrador
        INSERT INTO perfis (tenant_id, nome, descricao)
        VALUES (v_tenant_id, 'Administrador', 'Acesso total ao sistema')
        RETURNING id INTO v_admin_perfil_id;
        
        -- Perfil Gerente
        INSERT INTO perfis (tenant_id, nome, descricao)
        VALUES (v_tenant_id, 'Gerente', 'Gerencia operações do restaurante, mas sem acesso a configurações');
        
        -- Perfil Garçom
        INSERT INTO perfis (tenant_id, nome, descricao)
        VALUES (v_tenant_id, 'Garçom', 'Atendimento, abertura e fechamento de pedidos');
        
        -- Perfil Caixa
        INSERT INTO perfis (tenant_id, nome, descricao)
        VALUES (v_tenant_id, 'Caixa', 'Gerencia pagamentos e caixa');
        
        -- Perfil Cozinha
        INSERT INTO perfis (tenant_id, nome, descricao)
        VALUES (v_tenant_id, 'Cozinha', 'Visualização e gerenciamento de pedidos para preparo');
        
        -- 4. CRIAR USUÁRIO ADMINISTRADOR
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
            v_tenant_id,
            p_admin_nome,
            p_admin_email,
            p_admin_senha,
            p_admin_telefone,
            CURRENT_TIMESTAMP,
            NULL,
            TRUE
        )
        RETURNING id INTO v_admin_id;
        
        -- Associar usuário ao perfil administrador
        INSERT INTO usuarios_perfis (usuario_id, perfil_id)
        VALUES (v_admin_id, v_admin_perfil_id);
        
        -- 5. CONFIGURAR CATEGORIAS DE PRODUTOS PADRÃO
        -- Pratos Principais
        INSERT INTO categorias (tenant_id, nome, descricao, ativa)
        VALUES (v_tenant_id, 'Pratos Principais', 'Pratos principais do cardápio', TRUE)
        RETURNING id INTO v_categoria_id;
        
        -- Bebidas
        INSERT INTO categorias (tenant_id, nome, descricao, ativa)
        VALUES (v_tenant_id, 'Bebidas', 'Refrigerantes, sucos e outras bebidas', TRUE);
        
        -- Sobremesas
        INSERT INTO categorias (tenant_id, nome, descricao, ativa)
        VALUES (v_tenant_id, 'Sobremesas', 'Doces e sobremesas', TRUE);
        
        -- Entradas
        INSERT INTO categorias (tenant_id, nome, descricao, ativa)
        VALUES (v_tenant_id, 'Entradas', 'Aperitivos e entradas', TRUE);
        
        -- Para restaurante pesqueiro
        INSERT INTO categorias (tenant_id, nome, descricao, ativa)
        VALUES (v_tenant_id, 'Peixes', 'Pratos à base de peixes', TRUE);
        
        INSERT INTO categorias (tenant_id, nome, descricao, ativa)
        VALUES (v_tenant_id, 'Frutos do Mar', 'Camarão, lagosta e outros frutos do mar', TRUE);
        
        -- 6. CONFIGURAR UNIDADES DE MEDIDA
        -- Verificar se existem unidades globais (compartilhadas entre tenants)
        IF NOT EXISTS (SELECT 1 FROM unidades_medida WHERE nome = 'Unidade') THEN
            -- Criar unidades de medida globais se não existirem
            INSERT INTO unidades_medida (nome, simbolo) VALUES 
                ('Unidade', 'un'),
                ('Quilograma', 'kg'),
                ('Grama', 'g'),
                ('Litro', 'l'),
                ('Mililitro', 'ml'),
                ('Porção', 'porç'),
                ('Caixa', 'cx'),
                ('Pacote', 'pct');
        END IF;
        
        -- 7. ASSOCIAR FORMAS DE PAGAMENTO
        -- Verificar se existem formas de pagamento globais
        IF NOT EXISTS (SELECT 1 FROM formas_pagamento WHERE nome = 'Dinheiro') THEN
            -- Criar formas de pagamento globais se não existirem
            INSERT INTO formas_pagamento (nome, ativo) VALUES 
                ('Dinheiro', TRUE),
                ('Cartão de Crédito', TRUE),
                ('Cartão de Débito', TRUE),
                ('PIX', TRUE),
                ('Vale Refeição', TRUE);
        END IF;
        
        -- Associar formas de pagamento ao tenant
        INSERT INTO tenant_formas_pagamento (tenant_id, forma_pagamento_id, ativo)
        SELECT v_tenant_id, id, TRUE FROM formas_pagamento WHERE ativo = TRUE;
        
        -- 8. CRIAR MESAS INICIAIS
        FOR i IN 1..10 LOOP
            INSERT INTO mesas (
                tenant_id,
                numero,
                capacidade,
                status,
                posicao_x,
                posicao_y,
                ativa
            )
            VALUES (
                v_tenant_id,
                i,
                4, -- Capacidade padrão
                'Livre',
                (i-1) % 5 * 120, -- Posição X inicial para visualização
                ((i-1) / 5)::integer * 120, -- Posição Y inicial para visualização
                TRUE
            )
            RETURNING id INTO v_mesa_id;
        END LOOP;
        
        -- 9. CRIAR CARDÁPIO PADRÃO
        INSERT INTO cardapios (
            tenant_id,
            nome,
            descricao,
            dias_semana,
            ativo
        )
        VALUES (
            v_tenant_id,
            'Cardápio Principal',
            'Cardápio completo do restaurante',
            '0123456', -- Todos os dias da semana
            TRUE
        )
        RETURNING id INTO v_cardapio_id;
        
        -- 10. REGISTRAR LOG DE CRIAÇÃO
        INSERT INTO logs_sistema (
            tenant_id,
            nivel,
            origem,
            mensagem,
            dados_adicionais,
            data_hora
        )
        VALUES (
            v_tenant_id,
            'INFO',
            'setup_novo_tenant',
            'Novo tenant criado com sucesso',
            jsonb_build_object(
                'tenant_id', v_tenant_id,
                'codigo', p_codigo,
                'nome_restaurante', p_nome_restaurante,
                'admin_email', p_admin_email
            ),
            CURRENT_TIMESTAMP
        );
        
        -- Commit da transação
        COMMIT;
        
        RAISE NOTICE 'Tenant criado com sucesso! ID: %, Código: %, Restaurante: %', 
                     v_tenant_id, p_codigo, p_nome_restaurante;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback em caso de erro
            ROLLBACK;
            RAISE EXCEPTION 'Erro ao criar tenant: %', SQLERRM;
    END;
END;
$$;

-- =============================================
-- EXEMPLO DE USO
-- =============================================

/*
CALL setup_novo_tenant(
    'restaurante001', -- código único
    'Sabor do Mar', -- nome do restaurante
    'Restaurante Sabor do Mar LTDA', -- razão social
    '12.345.678/0001-90', -- CNPJ
    '(11) 98765-4321', -- telefone
    'contato@sabordomar.com.br', -- email
    'Av. Beira Mar, 1000', -- endereço
    'Santos', -- cidade
    'SP', -- estado
    '11030-000', -- CEP
    'standard', -- plano
    
    'Administrador', -- nome do admin
    'admin@sabordomar.com.br', -- email do admin
    '$2a$12$1234hashedpasswordexample', -- senha hash
    '(11) 99999-9999' -- telefone do admin
);
*/

-- =============================================
-- SCRIPT DE VERIFICAÇÃO DE SETUP
-- =============================================

CREATE OR REPLACE FUNCTION verificar_setup_tenant(p_tenant_id INTEGER)
RETURNS TABLE (
    componente TEXT,
    status TEXT,
    quantidade INTEGER,
    detalhes TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar se o tenant existe
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
        RETURN QUERY SELECT 'Tenant', 'ERRO', 0, 'Tenant ID ' || p_tenant_id || ' não encontrado';
        RETURN;
    END IF;
    
    -- Verificar configurações
    RETURN QUERY
    SELECT 'Configurações', 
           CASE WHEN COUNT(*) >= 5 THEN 'OK' ELSE 'INCOMPLETO' END, 
           COUNT(*)::INTEGER,
           'Verificado'
    FROM tenant_configuracoes WHERE tenant_id = p_tenant_id;
    
    -- Verificar perfis
    RETURN QUERY
    SELECT 'Perfis', 
           CASE WHEN COUNT(*) >= 3 THEN 'OK' ELSE 'INCOMPLETO' END, 
           COUNT(*)::INTEGER,
           STRING_AGG(nome, ', ')
    FROM perfis WHERE tenant_id = p_tenant_id;
    
    -- Verificar usuários
    RETURN QUERY
    SELECT 'Usuários', 
           CASE WHEN COUNT(*) >= 1 THEN 'OK' ELSE 'INCOMPLETO' END, 
           COUNT(*)::INTEGER,
           STRING_AGG(nome, ', ')
    FROM usuarios WHERE tenant_id = p_tenant_id;
    
    -- Verificar categorias
    RETURN QUERY
    SELECT 'Categorias', 
           CASE WHEN COUNT(*) >= 4 THEN 'OK' ELSE 'INCOMPLETO' END, 
           COUNT(*)::INTEGER,
           STRING_AGG(nome, ', ')
    FROM categorias WHERE tenant_id = p_tenant_id;
    
    -- Verificar formas de pagamento
    RETURN QUERY
    SELECT 'Formas de Pagamento', 
           CASE WHEN COUNT(*) >= 3 THEN 'OK' ELSE 'INCOMPLETO' END, 
           COUNT(*)::INTEGER,
           'Verificado'
    FROM tenant_formas_pagamento WHERE tenant_id = p_tenant_id;
    
    -- Verificar mesas
    RETURN QUERY
    SELECT 'Mesas', 
           CASE WHEN COUNT(*) >= 1 THEN 'OK' ELSE 'INCOMPLETO' END, 
           COUNT(*)::INTEGER,
           'Verificado'
    FROM mesas WHERE tenant_id = p_tenant_id;
    
    -- Verificar cardápios
    RETURN QUERY
    SELECT 'Cardápios', 
           CASE WHEN COUNT(*) >= 1 THEN 'OK' ELSE 'INCOMPLETO' END, 
           COUNT(*)::INTEGER,
           STRING_AGG(nome, ', ')
    FROM cardapios WHERE tenant_id = p_tenant_id;
END;
$$;
