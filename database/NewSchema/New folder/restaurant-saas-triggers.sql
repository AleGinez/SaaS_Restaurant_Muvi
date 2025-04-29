-- =============================================
-- TRIGGERS PARA SISTEMA SAAS MULTI-TENANT DE RESTAURANTE
-- Database: PostgreSQL
-- =============================================

SET search_path TO restaurante;

-- =============================================
-- 1. TRIGGERS DE SEGURANÇA MULTI-TENANT
-- =============================================

-- Função genérica para validar tenant_id
CREATE OR REPLACE FUNCTION fn_validar_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Garantir que tenant_id não seja NULL
    IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'O campo tenant_id não pode ser nulo';
    END IF;
    
    -- Verificar se o tenant existe e está ativo
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = NEW.tenant_id AND ativo = TRUE) THEN
        RAISE EXCEPTION 'O tenant_id % não existe ou está inativo', NEW.tenant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger a todas as tabelas principais
-- Exemplo para tabela de usuários:
CREATE TRIGGER tg_validar_tenant_id_usuarios
BEFORE INSERT OR UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION fn_validar_tenant_id();

CREATE TRIGGER tg_validar_tenant_id_produtos
BEFORE INSERT OR UPDATE ON produtos
FOR EACH ROW EXECUTE FUNCTION fn_validar_tenant_id();

CREATE TRIGGER tg_validar_tenant_id_categorias
BEFORE INSERT OR UPDATE ON categorias
FOR EACH ROW EXECUTE FUNCTION fn_validar_tenant_id();

CREATE TRIGGER tg_validar_tenant_id_fornecedores
BEFORE INSERT OR UPDATE ON fornecedores
FOR EACH ROW EXECUTE FUNCTION fn_validar_tenant_id();

CREATE TRIGGER tg_validar_tenant_id_mesas
BEFORE INSERT OR UPDATE ON mesas
FOR EACH ROW EXECUTE FUNCTION fn_validar_tenant_id();

CREATE TRIGGER tg_validar_tenant_id_pedidos
BEFORE INSERT OR UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_validar_tenant_id();

CREATE TRIGGER tg_validar_tenant_id_funcionarios
BEFORE INSERT OR UPDATE ON funcionarios
FOR EACH ROW EXECUTE FUNCTION fn_validar_tenant_id();

-- Função para prevenir acesso entre tenants em relações
CREATE OR REPLACE FUNCTION fn_validar_relacao_tenant()
RETURNS TRIGGER AS $$
DECLARE
    tabela_pai TEXT;
    coluna_pai TEXT;
    valor_id INTEGER;
    tenant_pai INTEGER;
    tenant_filho INTEGER;
BEGIN
    -- Determinar a tabela pai e coluna baseada no nome da coluna na tabela atual
    IF TG_TABLE_NAME = 'usuarios_perfis' THEN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            -- Verificar se o perfil e o usuário pertencem ao mesmo tenant
            SELECT u.tenant_id INTO tenant_filho FROM usuarios u WHERE u.id = NEW.usuario_id;
            SELECT p.tenant_id INTO tenant_pai FROM perfis p WHERE p.id = NEW.perfil_id;
            
            IF tenant_pai IS DISTINCT FROM tenant_filho THEN
                RAISE EXCEPTION 'Violação de segurança: usuário e perfil pertencem a tenants diferentes';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'cardapios_produtos' THEN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            -- Verificar se o cardápio e o produto pertencem ao mesmo tenant
            SELECT c.tenant_id INTO tenant_pai FROM cardapios c WHERE c.id = NEW.cardapio_id;
            SELECT p.tenant_id INTO tenant_filho FROM produtos p WHERE p.id = NEW.produto_id;
            
            IF tenant_pai IS DISTINCT FROM tenant_filho THEN
                RAISE EXCEPTION 'Violação de segurança: cardápio e produto pertencem a tenants diferentes';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'itens_pedido' THEN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            -- Verificar se o pedido e o produto pertencem ao mesmo tenant
            SELECT p.tenant_id INTO tenant_pai FROM pedidos p WHERE p.id = NEW.pedido_id;
            SELECT pr.tenant_id INTO tenant_filho FROM produtos pr WHERE pr.id = NEW.produto_id;
            
            IF tenant_pai IS DISTINCT FROM tenant_filho THEN
                RAISE EXCEPTION 'Violação de segurança: pedido e produto pertencem a tenants diferentes';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger a tabelas de relacionamento
CREATE TRIGGER tg_validar_relacao_tenant_usuarios_perfis
BEFORE INSERT OR UPDATE ON usuarios_perfis
FOR EACH ROW EXECUTE FUNCTION fn_validar_relacao_tenant();

CREATE TRIGGER tg_validar_relacao_tenant_cardapios_produtos
BEFORE INSERT OR UPDATE ON cardapios_produtos
FOR EACH ROW EXECUTE FUNCTION fn_validar_relacao_tenant();

CREATE TRIGGER tg_validar_relacao_tenant_itens_pedido
BEFORE INSERT OR UPDATE ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_validar_relacao_tenant();

-- =============================================
-- 2. TRIGGERS DE AUDITORIA
-- =============================================

-- Função para registrar alterações em tabelas críticas
CREATE OR REPLACE FUNCTION fn_registrar_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    usuario_id INTEGER;
    tenant_id INTEGER;
    dados_anteriores JSONB := NULL;
    dados_novos JSONB := NULL;
    acao TEXT;
BEGIN
    -- Determinar tenant_id
    IF TG_OP = 'DELETE' THEN
        tenant_id := OLD.tenant_id;
    ELSE
        tenant_id := NEW.tenant_id;
    END IF;
    
    -- Não registrar logs para operações de sistema
    IF current_setting('restaurante.audit_user_id', TRUE) IS NOT NULL THEN
        usuario_id := current_setting('restaurante.audit_user_id')::INTEGER;
    ELSE
        usuario_id := NULL;
    END IF;
    
    -- Determinar ação
    CASE TG_OP
        WHEN 'INSERT' THEN 
            acao := 'INSERT';
            dados_novos := to_jsonb(NEW);
        WHEN 'UPDATE' THEN 
            acao := 'UPDATE';
            dados_anteriores := to_jsonb(OLD);
            dados_novos := to_jsonb(NEW);
        WHEN 'DELETE' THEN 
            acao := 'DELETE';
            dados_anteriores := to_jsonb(OLD);
    END CASE;
    
    -- Registrar log
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_anteriores,
        dados_novos,
        ip,
        data_hora
    ) VALUES (
        tenant_id,
        usuario_id,
        acao,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        dados_anteriores,
        dados_novos,
        current_setting('restaurante.client_ip', TRUE),
        CURRENT_TIMESTAMP
    );
    
    -- Retornar conforme a operação
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de auditoria a tabelas críticas
CREATE TRIGGER tg_auditoria_usuarios
AFTER INSERT OR UPDATE OR DELETE ON usuarios
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria();

CREATE TRIGGER tg_auditoria_produtos
AFTER INSERT OR UPDATE OR DELETE ON produtos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria();

CREATE TRIGGER tg_auditoria_pedidos
AFTER INSERT OR UPDATE OR DELETE ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria();

CREATE TRIGGER tg_auditoria_pagamentos
AFTER INSERT OR UPDATE OR DELETE ON pagamentos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria();

CREATE TRIGGER tg_auditoria_caixas
AFTER INSERT OR UPDATE OR DELETE ON caixas
FOR EACH ROW EXECUTE FUNCTION fn_registrar_auditoria();

-- =============================================
-- 3. TRIGGERS DE REGRAS DE NEGÓCIO
-- =============================================

-- Trigger para atualizar estoque ao adicionar item ao pedido
CREATE OR REPLACE FUNCTION fn_atualizar_estoque_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_controlar_estoque BOOLEAN;
    v_tenant_id INTEGER;
    v_produto_tenant_id INTEGER;
BEGIN
    -- Verificar se o produto controla estoque
    SELECT tenant_id, controlar_estoque 
    INTO v_produto_tenant_id, v_controlar_estoque 
    FROM produtos 
    WHERE id = NEW.produto_id;
    
    -- Obter tenant_id do pedido
    SELECT tenant_id INTO v_tenant_id FROM pedidos WHERE id = NEW.pedido_id;
    
    -- Verificar se produto e pedido pertencem ao mesmo tenant
    IF v_produto_tenant_id <> v_tenant_id THEN
        RAISE EXCEPTION 'Produto e pedido pertencem a tenants diferentes';
    END IF;
    
    -- Se controla estoque e é uma inserção, atualizar estoque
    IF v_controlar_estoque AND TG_OP = 'INSERT' THEN
        UPDATE produtos
        SET estoque_atual = estoque_atual - NEW.quantidade,
            data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = NEW.produto_id;
    
    -- Se controla estoque e é uma atualização, ajustar a diferença
    ELSIF v_controlar_estoque AND TG_OP = 'UPDATE' THEN
        UPDATE produtos
        SET estoque_atual = estoque_atual - (NEW.quantidade - OLD.quantidade),
            data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = NEW.produto_id;
    
    -- Se controla estoque e é uma exclusão, devolver ao estoque
    ELSIF v_controlar_estoque AND TG_OP = 'DELETE' THEN
        UPDATE produtos
        SET estoque_atual = estoque_atual + OLD.quantidade,
            data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = OLD.produto_id;
    END IF;
    
    -- Retornar conforme a operação
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar valores totais do pedido
CREATE OR REPLACE FUNCTION fn_atualizar_valores_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_pedido_id INTEGER;
    v_subtotal DECIMAL(10, 2);
BEGIN
    -- Determinar o id do pedido com base na operação
    IF TG_OP = 'DELETE' THEN
        v_pedido_id := OLD.pedido_id;
    ELSE
        v_pedido_id := NEW.pedido_id;
    END IF;
    
    -- Calcular o novo subtotal
    SELECT COALESCE(SUM(valor_total), 0)
    INTO v_subtotal
    FROM itens_pedido
    WHERE pedido_id = v_pedido_id;
    
    -- Atualizar o pedido
    UPDATE pedidos
    SET valor_subtotal = v_subtotal,
        valor_total = v_subtotal - valor_desconto
    WHERE id = v_pedido_id;
    
    -- Retornar conforme a operação
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de estoque e valores
CREATE TRIGGER tg_atualizar_estoque_pedido
AFTER INSERT OR UPDATE OR DELETE ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_estoque_pedido();

CREATE TRIGGER tg_atualizar_valores_pedido
AFTER INSERT OR UPDATE OR DELETE ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_valores_pedido();

-- Trigger para garantir valor_total no item do pedido
CREATE OR REPLACE FUNCTION fn_calcular_valor_total_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular valor_total com base na quantidade e preço unitário
    NEW.valor_total := NEW.quantidade * NEW.preco_unitario;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_calcular_valor_total_item
BEFORE INSERT OR UPDATE ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_calcular_valor_total_item();

-- Trigger para atualizar status de mesa conforme status do pedido
CREATE OR REPLACE FUNCTION fn_atualizar_status_mesa()
RETURNS TRIGGER AS $$
DECLARE
    v_mesa_id INTEGER;
BEGIN
    -- Se o pedido tiver mesa associada
    IF NEW.mesa_id IS NOT NULL THEN
        -- Se o status mudou para fechado ou cancelado
        IF (OLD.status <> NEW.status) AND (NEW.status IN ('Fechado', 'Cancelado')) THEN
            -- Verificar se não há outros pedidos abertos para a mesa
            IF NOT EXISTS (
                SELECT 1 
                FROM pedidos 
                WHERE mesa_id = NEW.mesa_id 
                AND id <> NEW.id 
                AND status NOT IN ('Fechado', 'Cancelado')
            ) THEN
                -- Liberar a mesa
                UPDATE mesas
                SET status = 'Livre'
                WHERE id = NEW.mesa_id;
            END IF;
        -- Se o status mudou para aberto ou em preparo
        ELSIF (OLD.status <> NEW.status) AND (NEW.status IN ('Aberto', 'Em Preparo')) THEN
            -- Marcar a mesa como ocupada
            UPDATE mesas
            SET status = 'Ocupada'
            WHERE id = NEW.mesa_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_status_mesa
AFTER UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_status_mesa();

-- =============================================
-- 4. TRIGGERS DE VALIDAÇÃO DE DADOS
-- =============================================

-- Trigger para validar valores negativos em campos críticos
CREATE OR REPLACE FUNCTION fn_validar_valores_negativos()
RETURNS TRIGGER AS $$
BEGIN
    -- Validações específicas para cada tabela
    IF TG_TABLE_NAME = 'produtos' THEN
        IF NEW.preco_venda < 0 THEN
            RAISE EXCEPTION 'O preço de venda não pode ser negativo';
        END IF;
        
        IF NEW.preco_custo < 0 THEN
            RAISE EXCEPTION 'O preço de custo não pode ser negativo';
        END IF;
        
        IF NEW.estoque_atual < 0 THEN
            RAISE EXCEPTION 'O estoque atual não pode ser negativo';
        END IF;
        
        IF NEW.estoque_minimo < 0 THEN
            RAISE EXCEPTION 'O estoque mínimo não pode ser negativo';
        END IF;
        
    ELSIF TG_TABLE_NAME = 'itens_pedido' THEN
        IF NEW.quantidade <= 0 THEN
            RAISE EXCEPTION 'A quantidade deve ser maior que zero';
        END IF;
        
        IF NEW.preco_unitario < 0 THEN
            RAISE EXCEPTION 'O preço unitário não pode ser negativo';
        END IF;
        
    ELSIF TG_TABLE_NAME = 'pedidos' THEN
        IF NEW.valor_subtotal < 0 THEN
            RAISE EXCEPTION 'O valor subtotal não pode ser negativo';
        END IF;
        
        IF NEW.valor_total < 0 THEN
            RAISE EXCEPTION 'O valor total não pode ser negativo';
        END IF;
        
    ELSIF TG_TABLE_NAME = 'pagamentos' THEN
        IF NEW.valor <= 0 THEN
            RAISE EXCEPTION 'O valor do pagamento deve ser maior que zero';
        END IF;
        
    ELSIF TG_TABLE_NAME = 'entradas_estoque' THEN
        IF NEW.quantidade <= 0 THEN
            RAISE EXCEPTION 'A quantidade deve ser maior que zero';
        END IF;
        
        IF NEW.preco_unitario < 0 THEN
            RAISE EXCEPTION 'O preço unitário não pode ser negativo';
        END IF;
        
    ELSIF TG_TABLE_NAME = 'saidas_estoque' THEN
        IF NEW.quantidade <= 0 THEN
            RAISE EXCEPTION 'A quantidade deve ser maior que zero';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de validação a tabelas relevantes
CREATE TRIGGER tg_validar_valores_produtos
BEFORE INSERT OR UPDATE ON produtos
FOR EACH ROW EXECUTE FUNCTION fn_validar_valores_negativos();

CREATE TRIGGER tg_validar_valores_itens_pedido
BEFORE INSERT OR UPDATE ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_validar_valores_negativos();

CREATE TRIGGER tg_validar_valores_pedidos
BEFORE INSERT OR UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_validar_valores_negativos();

CREATE TRIGGER tg_validar_valores_pagamentos
BEFORE INSERT OR UPDATE ON pagamentos
FOR EACH ROW EXECUTE FUNCTION fn_validar_valores_negativos();

CREATE TRIGGER tg_validar_valores_entradas_estoque
BEFORE INSERT OR UPDATE ON entradas_estoque
FOR EACH ROW EXECUTE FUNCTION fn_validar_valores_negativos();

CREATE TRIGGER tg_validar_valores_saidas_estoque
BEFORE INSERT OR UPDATE ON saidas_estoque
FOR EACH ROW EXECUTE FUNCTION fn_validar_valores_negativos();

-- Trigger para garantir unicidade de código/número dentro do tenant
CREATE OR REPLACE FUNCTION fn_validar_unicidade_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- Validações específicas para cada tabela
    IF TG_TABLE_NAME = 'produtos' THEN
        IF NEW.codigo IS NOT NULL AND EXISTS (
            SELECT 1 FROM produtos 
            WHERE tenant_id = NEW.tenant_id 
            AND codigo = NEW.codigo 
            AND id <> COALESCE(NEW.id, -1)
        ) THEN
            RAISE EXCEPTION 'Já existe um produto com o código "%" neste tenant', NEW.codigo;
        END IF;
        
    ELSIF TG_TABLE_NAME = 'mesas' THEN
        IF EXISTS (
            SELECT 1 FROM mesas 
            WHERE tenant_id = NEW.tenant_id 
            AND numero = NEW.numero 
            AND id <> COALESCE(NEW.id, -1)
        ) THEN
            RAISE EXCEPTION 'Já existe uma mesa com o número % neste tenant', NEW.numero;
        END IF;
        
    ELSIF TG_TABLE_NAME = 'categorias' THEN
        IF EXISTS (
            SELECT 1 FROM categorias 
            WHERE tenant_id = NEW.tenant_id 
            AND nome = NEW.nome 
            AND id <> COALESCE(NEW.id, -1)
        ) THEN
            RAISE EXCEPTION 'Já existe uma categoria com o nome "%" neste tenant', NEW.nome;
        END IF;
        
    ELSIF TG_TABLE_NAME = 'fornecedores' THEN
        IF NEW.cnpj IS NOT NULL AND EXISTS (
            SELECT 1 FROM fornecedores 
            WHERE tenant_id = NEW.tenant_id 
            AND cnpj = NEW.cnpj 
            AND id <> COALESCE(NEW.id, -1)
        ) THEN
            RAISE EXCEPTION 'Já existe um fornecedor com o CNPJ "%" neste tenant', NEW.cnpj;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de unicidade a tabelas relevantes
CREATE TRIGGER tg_validar_unicidade_produtos
BEFORE INSERT OR UPDATE ON produtos
FOR EACH ROW EXECUTE FUNCTION fn_validar_unicidade_tenant();

CREATE TRIGGER tg_validar_unicidade_mesas
BEFORE INSERT OR UPDATE ON mesas
FOR EACH ROW EXECUTE FUNCTION fn_validar_unicidade_tenant();

CREATE TRIGGER tg_validar_unicidade_categorias
BEFORE INSERT OR UPDATE ON categorias
FOR EACH ROW EXECUTE FUNCTION fn_validar_unicidade_tenant();

CREATE TRIGGER tg_validar_unicidade_fornecedores
BEFORE INSERT OR UPDATE ON fornecedores
FOR EACH ROW EXECUTE FUNCTION fn_validar_unicidade_tenant();

-- =============================================
-- 5. TRIGGERS DE MANUTENÇÃO DE DADOS
-- =============================================

-- Trigger para atualizar timestamps de modificação
CREATE OR REPLACE FUNCTION fn_atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar o campo data_atualizacao
    NEW.data_atualizacao := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de atualização de timestamp às tabelas relevantes
CREATE TRIGGER tg_atualizar_timestamp_produtos
BEFORE UPDATE ON produtos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

CREATE TRIGGER tg_atualizar_timestamp_tenants
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- Trigger para verificar estoque mínimo e criar alerta
CREATE OR REPLACE FUNCTION fn_verificar_estoque_minimo()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o estoque atual ficou abaixo do mínimo
    IF NEW.controlar_estoque AND NEW.estoque_atual <= NEW.estoque_minimo THEN
        -- Registrar log informativo
        INSERT INTO logs_sistema (
            tenant_id,
            nivel,
            origem,
            mensagem,
            dados_adicionais
        ) VALUES (
            NEW.tenant_id,
            'WARNING',
            'estoque_minimo',
            'Produto com estoque abaixo do mínimo',
            jsonb_build_object(
                'produto_id', NEW.id,
                'produto_nome', NEW.nome,
                'estoque_atual', NEW.estoque_atual,
                'estoque_minimo', NEW.estoque_minimo
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_verificar_estoque_minimo
AFTER INSERT OR UPDATE ON produtos
FOR EACH ROW EXECUTE FUNCTION fn_verificar_estoque_minimo();

-- Trigger para proteger tabelas contra exclusão de tenants
CREATE OR REPLACE FUNCTION fn_proteger_exclusao_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- Em vez de excluir, desativar o tenant
    NEW.ativo := FALSE;
    NEW.data_atualizacao := CURRENT_TIMESTAMP;
    
    RAISE NOTICE 'Tenant ID % não pode ser excluído, apenas desativado', OLD.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_proteger_exclusao_tenant
BEFORE DELETE ON tenants
FOR EACH ROW EXECUTE FUNCTION fn_proteger_exclusao_tenant();

-- =============================================
-- 6. TRIGGERS DE RELATÓRIOS AUTOMÁTICOS
-- =============================================

-- Trigger para manter resumo de vendas diárias
CREATE OR REPLACE FUNCTION fn_atualizar_resumo_vendas()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id INTEGER;
    v_data_venda DATE;
BEGIN
    -- Definir tenant_id com base na operação
    IF TG_OP = 'DELETE' THEN
        v_tenant_id := OLD.tenant_id;
        v_data_venda := DATE(OLD.data_pedido);
    ELSE
        v_tenant_id := NEW.tenant_id;
        v_data_venda := DATE(NEW.data_pedido);
    END IF;
    
    -- Apenas atualizar vendas fechadas ou canceladas
    IF TG_OP = 'UPDATE' AND (
        (OLD.status <> 'Fechado' AND NEW.status = 'Fechado') OR
        (OLD.status <> 'Cancelado' AND NEW.status = 'Cancelado')
    ) THEN
        -- Aqui poderíamos atualizar uma tabela de resumo diário de vendas
        -- Para simplificar, apenas registramos o evento
        INSERT INTO logs_sistema (
            tenant_id,
            nivel,
            origem,
            mensagem,
            dados_adicionais
        ) VALUES (
            v_tenant_id,
            'INFO',
            'resumo_vendas',
            'Pedido fechado ou cancelado',
            jsonb_build_object(
                'pedido_id', NEW.id,
                'data_venda', v_data_venda,
                'status', NEW.status,
                'valor_total', NEW.valor_total
            )
        );
    END IF;
    
    RETURN NULL; -- Trigger é AFTER, então retorno é ignorado
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_resumo_vendas
AFTER UPDATE OF status ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_resumo_vendas();

-- Trigger para registrar alterações de preço (histórico)
CREATE OR REPLACE FUNCTION fn_registrar_alteracao_preco()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o preço de venda foi alterado
    IF OLD.preco_venda <> NEW.preco_venda THEN
        -- Registrar alteração no log do sistema
        INSERT INTO logs_sistema (
            tenant_id,
            nivel,
            origem,
            mensagem,
            dados_adicionais
        ) VALUES (
            NEW.tenant_id,
            'INFO',
            'alteracao_preco',
            'Preço de produto alterado',
            jsonb_build_object(
                'produto_id', NEW.id,
                'produto_nome', NEW.nome,
                'preco_anterior', OLD.preco_venda,
                'preco_novo', NEW.preco_venda,
                'data_alteracao', CURRENT_TIMESTAMP
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_registrar_alteracao_preco
AFTER UPDATE OF preco_venda ON produtos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_alteracao_preco();
