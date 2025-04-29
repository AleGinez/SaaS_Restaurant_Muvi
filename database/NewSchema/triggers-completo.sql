-- =============================================
-- TRIGGERS PARA O SISTEMA DE RESTAURANTE
-- Banco de dados: PostgreSQL
-- =============================================

SET search_path TO restaurante;

-- =============================================
-- 1. TRIGGERS PARA CONTROLE DE ESTOQUE
-- =============================================

-- Função para atualizar estoque após entrada
CREATE OR REPLACE FUNCTION fn_atualizar_estoque_entrada()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza o estoque atual do produto
    UPDATE produtos
    SET estoque_atual = estoque_atual + NEW.quantidade,
        data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.produto_id;
    
    -- Registra log da movimentação
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_novos
    )
    VALUES (
        NEW.tenant_id,
        NEW.usuario_id,
        'ENTRADA_ESTOQUE',
        'produtos',
        NEW.produto_id,
        jsonb_build_object(
            'quantidade', NEW.quantidade,
            'estoque_anterior', (SELECT estoque_atual - NEW.quantidade FROM produtos WHERE id = NEW.produto_id),
            'estoque_atual', (SELECT estoque_atual FROM produtos WHERE id = NEW.produto_id)
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_estoque_entrada
AFTER INSERT ON entradas_estoque
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_estoque_entrada();

-- Função para atualizar estoque após saída manual
CREATE OR REPLACE FUNCTION fn_atualizar_estoque_saida()
RETURNS TRIGGER AS $$
DECLARE
    v_estoque_atual DECIMAL(10, 2);
BEGIN
    -- Verifica estoque atual
    SELECT estoque_atual INTO v_estoque_atual
    FROM produtos
    WHERE id = NEW.produto_id;
    
    -- Verifica se há estoque suficiente
    IF v_estoque_atual < NEW.quantidade THEN
        RAISE EXCEPTION 'Estoque insuficiente para o produto ID %. Atual: %, Requerido: %', 
            NEW.produto_id, v_estoque_atual, NEW.quantidade;
    END IF;
    
    -- Atualiza o estoque atual do produto
    UPDATE produtos
    SET estoque_atual = estoque_atual - NEW.quantidade,
        data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.produto_id;
    
    -- Registra log da movimentação
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_novos
    )
    VALUES (
        NEW.tenant_id,
        NEW.usuario_id,
        'SAIDA_ESTOQUE',
        'produtos',
        NEW.produto_id,
        jsonb_build_object(
            'quantidade', NEW.quantidade,
            'estoque_anterior', v_estoque_atual,
            'estoque_atual', v_estoque_atual - NEW.quantidade,
            'motivo', NEW.motivo
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_estoque_saida
AFTER INSERT ON saidas_estoque
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_estoque_saida();

-- Função para verificar e registrar alertas de estoque baixo
CREATE OR REPLACE FUNCTION fn_verificar_estoque_minimo()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o estoque ficou abaixo do mínimo, cria notificação
    IF NEW.estoque_atual <= NEW.estoque_minimo AND 
       (TG_OP = 'INSERT' OR OLD.estoque_atual > OLD.estoque_minimo) THEN
        
        -- Criar notificação de estoque baixo
        INSERT INTO notificacoes (
            tenant_id,
            tipo,
            titulo,
            mensagem,
            icone,
            nivel,
            link
        )
        VALUES (
            NEW.tenant_id,
            'estoque',
            'Estoque Baixo',
            'O produto "' || NEW.nome || '" está com estoque abaixo do mínimo. Atual: ' || 
            NEW.estoque_atual || ', Mínimo: ' || NEW.estoque_minimo,
            'exclamation-triangle',
            'warning',
            '/produtos/' || NEW.id
        );
        
        -- Registra log no sistema
        INSERT INTO logs_sistema (
            tenant_id,
            nivel,
            origem,
            mensagem,
            dados_adicionais
        )
        VALUES (
            NEW.tenant_id,
            'WARNING',
            'CONTROLE_ESTOQUE',
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
AFTER INSERT OR UPDATE OF estoque_atual ON produtos
FOR EACH ROW EXECUTE FUNCTION fn_verificar_estoque_minimo();

-- Função para atualizar estoque após inclusão de item no pedido
CREATE OR REPLACE FUNCTION fn_atualizar_estoque_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_controlar_estoque BOOLEAN;
    v_estoque_atual DECIMAL(10, 2);
    v_tenant_id INTEGER;
BEGIN
    -- Verifica se o produto controla estoque
    SELECT controlar_estoque, estoque_atual, tenant_id INTO v_controlar_estoque, v_estoque_atual, v_tenant_id
    FROM produtos
    WHERE id = NEW.produto_id;
    
    -- Se controla estoque, faz a baixa
    IF v_controlar_estoque THEN
        -- Verifica se há estoque suficiente
        IF v_estoque_atual < NEW.quantidade THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto ID %. Atual: %, Requerido: %', 
                NEW.produto_id, v_estoque_atual, NEW.quantidade;
        END IF;
        
        -- Atualiza o estoque atual do produto
        UPDATE produtos
        SET estoque_atual = estoque_atual - NEW.quantidade,
            data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = NEW.produto_id;
        
        -- Registra log da movimentação
        INSERT INTO logs_atividade (
            tenant_id,
            acao,
            tabela_afetada,
            registro_afetado,
            dados_novos
        )
        VALUES (
            v_tenant_id,
            'BAIXA_ESTOQUE_PEDIDO',
            'produtos',
            NEW.produto_id,
            jsonb_build_object(
                'quantidade', NEW.quantidade,
                'estoque_anterior', v_estoque_atual,
                'estoque_atual', v_estoque_atual - NEW.quantidade,
                'pedido_id', NEW.pedido_id,
                'item_id', NEW.id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_estoque_pedido
AFTER INSERT ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_estoque_pedido();

-- Função para retornar estoque ao cancelar item de pedido
CREATE OR REPLACE FUNCTION fn_retornar_estoque_cancelamento()
RETURNS TRIGGER AS $$
DECLARE
    v_controlar_estoque BOOLEAN;
    v_tenant_id INTEGER;
    v_pedido_status VARCHAR(20);
BEGIN
    -- Obter status do pedido
    SELECT status INTO v_pedido_status
    FROM pedidos
    WHERE id = NEW.pedido_id;
    
    -- Se o item foi cancelado e o pedido não foi entregue/fechado
    IF NEW.cancelado = TRUE AND OLD.cancelado = FALSE AND 
       v_pedido_status NOT IN ('Entregue', 'Fechado') THEN
        
        -- Verifica se o produto controla estoque
        SELECT controlar_estoque, tenant_id INTO v_controlar_estoque, v_tenant_id
        FROM produtos
        WHERE id = NEW.produto_id;
        
        -- Se controla estoque, devolve ao estoque
        IF v_controlar_estoque THEN
            UPDATE produtos
            SET estoque_atual = estoque_atual + NEW.quantidade,
                data_atualizacao = CURRENT_TIMESTAMP
            WHERE id = NEW.produto_id;
            
            -- Registra log da movimentação
            INSERT INTO logs_atividade (
                tenant_id,
                acao,
                tabela_afetada,
                registro_afetado,
                dados_novos
            )
            VALUES (
                v_tenant_id,
                'RETORNO_ESTOQUE_CANCELAMENTO',
                'produtos',
                NEW.produto_id,
                jsonb_build_object(
                    'quantidade', NEW.quantidade,
                    'estoque_anterior', (SELECT estoque_atual - NEW.quantidade FROM produtos WHERE id = NEW.produto_id),
                    'estoque_atual', (SELECT estoque_atual FROM produtos WHERE id = NEW.produto_id),
                    'pedido_id', NEW.pedido_id,
                    'item_id', NEW.id,
                    'motivo_cancelamento', NEW.motivo_cancelamento
                )
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_retornar_estoque_cancelamento
AFTER UPDATE OF cancelado ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_retornar_estoque_cancelamento();

-- =============================================
-- 2. TRIGGERS PARA CÁLCULOS FINANCEIROS
-- =============================================

-- Função para calcular valor total do item do pedido
CREATE OR REPLACE FUNCTION fn_calcular_valor_item_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular subtotal base
    NEW.subtotal := NEW.quantidade * NEW.preco_unitario;
    
    -- Aplicar descontos se houver
    IF NEW.desconto_percentual > 0 THEN
        NEW.desconto_valor := ROUND((NEW.subtotal * NEW.desconto_percentual / 100), 2);
    END IF;
    
    -- Aplicar acréscimos se houver
    IF NEW.acrescimo_percentual > 0 THEN
        NEW.acrescimo_valor := ROUND((NEW.subtotal * NEW.acrescimo_percentual / 100), 2);
    END IF;
    
    -- Calcular valor final
    NEW.valor_total := NEW.subtotal - NEW.desconto_valor + NEW.acrescimo_valor;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_calcular_valor_item_pedido
BEFORE INSERT OR UPDATE ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_calcular_valor_item_pedido();

-- Função para atualizar valores do pedido
CREATE OR REPLACE FUNCTION fn_atualizar_valores_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_subtotal DECIMAL(10, 2);
    v_taxa_servico DECIMAL(10, 2);
    v_taxa_entrega DECIMAL(10, 2);
    v_valor_desconto DECIMAL(10, 2);
    v_valor_acrescimo DECIMAL(10, 2);
    v_valor_total DECIMAL(10, 2);
    v_pedido_id INTEGER;
BEGIN
    -- Determinar qual pedido foi afetado
    IF TG_OP = 'DELETE' THEN
        v_pedido_id := OLD.pedido_id;
    ELSE
        v_pedido_id := NEW.pedido_id;
    END IF;
    
    -- Calcular o subtotal do pedido (soma dos itens não cancelados)
    SELECT COALESCE(SUM(valor_total), 0)
    INTO v_subtotal
    FROM itens_pedido
    WHERE pedido_id = v_pedido_id AND cancelado = FALSE;
    
    -- Obter valores atuais do pedido
    SELECT 
        taxa_servico,
        taxa_entrega,
        desconto_valor,
        acrescimo_valor
    INTO 
        v_taxa_servico,
        v_taxa_entrega,
        v_valor_desconto,
        v_valor_acrescimo
    FROM pedidos
    WHERE id = v_pedido_id;
    
    -- Calcular novo valor total
    v_valor_total := v_subtotal - v_valor_desconto + v_valor_acrescimo + v_taxa_servico + v_taxa_entrega;
    
    -- Atualizar o pedido
    UPDATE pedidos
    SET 
        subtotal = v_subtotal,
        valor_total = v_valor_total
    WHERE id = v_pedido_id;
    
    RETURN NULL; -- para after trigger
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_valores_pedido
AFTER INSERT OR UPDATE OR DELETE ON itens_pedido
FOR EACH STATEMENT EXECUTE FUNCTION fn_atualizar_valores_pedido();

-- Função para aplicar desconto e recalcular valor total do pedido
CREATE OR REPLACE FUNCTION fn_aplicar_desconto_pedido()
RETURNS TRIGGER AS $$
BEGIN
    -- Se alterou o percentual de desconto, calcular valor de desconto
    IF NEW.desconto_percentual != OLD.desconto_percentual THEN
        NEW.desconto_valor := ROUND((NEW.subtotal * NEW.desconto_percentual / 100), 2);
    END IF;
    
    -- Se alterou percentual de acréscimo, calcular valor de acréscimo
    IF NEW.acrescimo_percentual != OLD.acrescimo_percentual THEN
        NEW.acrescimo_valor := ROUND((NEW.subtotal * NEW.acrescimo_percentual / 100), 2);
    END IF;
    
    -- Recalcular valor total
    NEW.valor_total := NEW.subtotal - NEW.desconto_valor + NEW.acrescimo_valor + NEW.taxa_servico + NEW.taxa_entrega;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_aplicar_desconto_pedido
BEFORE UPDATE OF desconto_percentual, desconto_valor, acrescimo_percentual, acrescimo_valor, taxa_servico, taxa_entrega 
ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_aplicar_desconto_pedido();

-- Função para fechar caixa anterior ao abrir um novo
CREATE OR REPLACE FUNCTION fn_fechar_caixa_anterior()
RETURNS TRIGGER AS $$
DECLARE
    v_caixa_anterior_id INTEGER;
    v_valor_sistema DECIMAL(10, 2);
BEGIN
    -- Verificar se já existe caixa aberto para o usuário e tenant
    SELECT id INTO v_caixa_anterior_id
    FROM caixas
    WHERE tenant_id = NEW.tenant_id 
      AND terminal = NEW.terminal
      AND status = 'Aberto';
    
    -- Se existir, fecha o caixa aberto antes de abrir o novo
    IF v_caixa_anterior_id IS NOT NULL AND v_caixa_anterior_id != NEW.id THEN
        -- Calcular valor do sistema
        SELECT 
            COALESCE(c.valor_abertura, 0) + 
            COALESCE(SUM(CASE WHEN m.tipo = 'Entrada' THEN m.valor ELSE 0 END), 0) - 
            COALESCE(SUM(CASE WHEN m.tipo = 'Saída' THEN m.valor ELSE 0 END), 0) 
        INTO v_valor_sistema
        FROM caixas c
        LEFT JOIN movimentacoes_financeiras m ON c.id = m.caixa_id
        WHERE c.id = v_caixa_anterior_id
        GROUP BY c.id, c.valor_abertura;
        
        -- Fechar o caixa anterior
        UPDATE caixas
        SET 
            status = 'Fechado',
            data_fechamento = CURRENT_TIMESTAMP,
            valor_sistema = v_valor_sistema,
            valor_fechamento = v_valor_sistema,  -- Fechamento automático assume valor correto
            diferenca = 0,
            observacao = COALESCE(observacao, '') || E'\nFechado automaticamente ao abrir novo caixa.'
        WHERE id = v_caixa_anterior_id;
        
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
            NEW.tenant_id,
            NEW.usuario_id,
            'FECHAMENTO_AUTOMATICO_CAIXA',
            'caixas',
            v_caixa_anterior_id,
            jsonb_build_object(
                'valor_sistema', v_valor_sistema,
                'data_fechamento', CURRENT_TIMESTAMP
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_fechar_caixa_anterior
BEFORE INSERT ON caixas
FOR EACH ROW EXECUTE FUNCTION fn_fechar_caixa_anterior();

-- Função para registrar movimentação financeira quando um pagamento é registrado
CREATE OR REPLACE FUNCTION fn_registrar_movimentacao_pagamento()
RETURNS TRIGGER AS $$
DECLARE
    v_descricao VARCHAR(200);
    v_categoria_id INTEGER;
BEGIN
    -- Definir descrição com base no tipo de pagamento
    IF NEW.tipo_pagamento = 'pedido' THEN
        SELECT 'Pagamento do pedido #' || p.id || 
               CASE WHEN p.mesa_id IS NOT NULL 
                    THEN ' (Mesa ' || (SELECT numero FROM mesas WHERE id = p.mesa_id) || ')' 
                    ELSE '' 
               END
        INTO v_descricao
        FROM pedidos p
        WHERE p.id = NEW.pedido_id;
    ELSE
        v_descricao := 'Recebimento: ' || NEW.tipo_pagamento;
    END IF;
    
    -- Buscar categoria financeira padrão para vendas (assumindo que exista)
    SELECT id INTO v_categoria_id
    FROM categorias_financeiras
    WHERE tenant_id = NEW.tenant_id AND nome = 'Vendas' AND tipo = 'entrada'
    LIMIT 1;
    
    -- Registrar a movimentação financeira
    INSERT INTO movimentacoes_financeiras (
        tenant_id,
        caixa_id,
        tipo,
        descricao,
        valor,
        data_movimento,
        forma_pagamento_id,
        pedido_id,
        categoria_id,
        referencia,
        comprovante,
        observacao,
        usuario_id
    ) VALUES (
        NEW.tenant_id,
        NEW.caixa_id,
        'Entrada',
        v_descricao,
        NEW.valor,
        NEW.data_pagamento,
        NEW.forma_pagamento_id,
        NEW.pedido_id,
        v_categoria_id,
        NEW.referencia,
        NEW.comprovante,
        NEW.observacao,
        NEW.usuario_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_registrar_movimentacao_pagamento
AFTER INSERT ON pagamentos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_movimentacao_pagamento();

-- =============================================
-- 3. TRIGGERS PARA SISTEMA DE FIDELIDADE
-- =============================================

-- Função para atualizar pontos de fidelidade do cliente
CREATE OR REPLACE FUNCTION fn_atualizar_fidelidade()
RETURNS TRIGGER AS $$
DECLARE
    v_programa_id INTEGER;
    v_pontos_por_valor DECIMAL(10, 2);
    v_cliente_id INTEGER;
    v_pontos INTEGER;
    v_validade INTEGER;
BEGIN
    -- Verifica se o pedido foi fechado e tem cliente associado
    IF (NEW.status = 'Fechado' OR NEW.status_id IS NOT NULL) AND 
       OLD.status != 'Fechado' AND 
       NEW.cliente_id IS NOT NULL THEN
        
        -- Obter programa de fidelidade ativo
        SELECT id, pontos_por_valor, validade_pontos 
        INTO v_programa_id, v_pontos_por_valor, v_validade
        FROM programas_fidelidade
        WHERE tenant_id = NEW.tenant_id 
          AND tipo = 'pontos' 
          AND ativo = TRUE 
        LIMIT 1;
        
        -- Se existe programa de fidelidade ativo
        IF v_programa_id IS NOT NULL THEN
            -- Calcular pontos com base no valor total do pedido
            v_pontos := FLOOR(NEW.valor_total * v_pontos_por_valor);
            
            -- Se há pontos a adicionar
            IF v_pontos > 0 THEN
                -- Atualizar pontos do cliente
                UPDATE clientes
                SET pontos_fidelidade = pontos_fidelidade + v_pontos,
                    ultima_visita = CURRENT_TIMESTAMP
                WHERE id = NEW.cliente_id;
                
                -- Registrar no histórico de fidelidade
                INSERT INTO historico_fidelidade (
                    tenant_id,
                    cliente_id,
                    programa_id,
                    pedido_id,
                    tipo,
                    pontos,
                    valor_referencia,
                    motivo,
                    data_registro,
                    data_expiracao
                )
                VALUES (
                    NEW.tenant_id,
                    NEW.cliente_id,
                    v_programa_id,
                    NEW.id,
                    'credito',
                    v_pontos,
                    NEW.valor_total,
                    'Compra - Pedido #' || NEW.id,
                    CURRENT_TIMESTAMP,
                    CURRENT_DATE + (v_validade || ' days')::INTERVAL
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_fidelidade
AFTER UPDATE OF status, status_id ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_fidelidade();

-- =============================================
-- 4. TRIGGERS PARA CONTROLE DE MESAS
-- =============================================

-- Função para atualizar status da mesa baseado nos pedidos
CREATE OR REPLACE FUNCTION fn_atualizar_status_mesa()
RETURNS TRIGGER AS $$
DECLARE
    v_tem_pedidos_abertos BOOLEAN;
BEGIN
    -- Só processa quando há mudança de mesa ou status
    IF (TG_OP = 'INSERT' OR NEW.mesa_id != OLD.mesa_id OR NEW.status != OLD.status) AND 
       NEW.mesa_id IS NOT NULL THEN
        
        -- Verifica se há pedidos abertos para esta mesa
        SELECT EXISTS (
            SELECT 1 
            FROM pedidos 
            WHERE mesa_id = NEW.mesa_id 
              AND status NOT IN ('Fechado', 'Cancelado')
              AND id != NEW.id
        ) INTO v_tem_pedidos_abertos;
        
        -- Atualiza status da mesa de acordo com a situação
        IF NEW.status = 'Aberto' OR NEW.status = 'Em Preparo' OR NEW.status = 'Entregue' THEN
            -- Novo pedido ativo - mesa ocupada
            UPDATE mesas
            SET status = 'Ocupada'
            WHERE id = NEW.mesa_id AND status != 'Ocupada';
            
        ELSIF (NEW.status = 'Fechado' OR NEW.status = 'Cancelado') AND NOT v_tem_pedidos_abertos THEN
            -- Não há mais pedidos ativos - mesa livre
            UPDATE mesas
            SET status = 'Livre'
            WHERE id = NEW.mesa_id AND status = 'Ocupada';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_status_mesa
AFTER INSERT OR UPDATE OF mesa_id, status ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_status_mesa();

-- Função para atualizar status da mesa quando uma reserva é confirmada
CREATE OR REPLACE FUNCTION fn_atualizar_status_mesa_reserva()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando uma reserva é criada ou atualizada como Confirmada
    IF (TG_OP = 'INSERT' OR NEW.status != OLD.status) AND 
       NEW.status = 'Confirmada' AND 
       NEW.mesa_id IS NOT NULL AND 
       NEW.data_reserva = CURRENT_DATE AND
       NEW.hora_inicio <= CURRENT_TIME AND
       (NEW.hora_fim IS NULL OR NEW.hora_fim >= CURRENT_TIME) THEN
        
        -- Verificar se a mesa está ocupada com pedidos ativos
        IF NOT EXISTS (
            SELECT 1 
            FROM pedidos 
            WHERE mesa_id = NEW.mesa_id 
              AND status NOT IN ('Fechado', 'Cancelado')
        ) THEN
            -- Marcar mesa como reservada
            UPDATE mesas
            SET status = 'Reservada'
            WHERE id = NEW.mesa_id AND status = 'Livre';
        END IF;
    
    -- Quando uma reserva é cancelada ou concluída
    ELSIF (TG_OP = 'UPDATE' AND NEW.status != OLD.status) AND 
          (NEW.status = 'Cancelada' OR NEW.status = 'Concluída' OR NEW.status = 'No-show') AND 
          NEW.mesa_id IS NOT NULL THEN
        
        -- Verificar se a mesa pode ser liberada
        IF NOT EXISTS (
            SELECT 1 
            FROM pedidos 
            WHERE mesa_id = NEW.mesa_id 
              AND status NOT IN ('Fechado', 'Cancelado')
        ) THEN
            -- Liberar mesa
            UPDATE mesas
            SET status = 'Livre'
            WHERE id = NEW.mesa_id AND status = 'Reservada';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_status_mesa_reserva
AFTER INSERT OR UPDATE OF status ON reservas
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_status_mesa_reserva();

-- =============================================
-- 5. TRIGGERS PARA AUDITORIA E LOGS
-- =============================================

-- Função para registrar alterações em tabelas importantes
CREATE OR REPLACE FUNCTION fn_registrar_log_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id INTEGER;
    v_tenant_id INTEGER;
    v_dados_novos JSONB;
    v_dados_anteriores JSONB;
    v_registro_id INTEGER;
BEGIN
    -- Tentar obter ID do usuário da sessão
    BEGIN
        v_usuario_id := current_setting('app.usuario_id', true)::INTEGER;
    EXCEPTION
        WHEN OTHERS THEN
            v_usuario_id := NULL;
    END;
    
    -- Determinar o tenant_id, registro_id e dados
    IF TG_OP = 'DELETE' THEN
        -- Para exclusão, use os dados antigos
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = TG_TABLE_NAME AND column_name = 'tenant_id') THEN
            v_tenant_id := OLD.tenant_id;
        ELSE
            v_tenant_id := NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = TG_TABLE_NAME AND column_name = 'id') THEN
            v_registro_id := OLD.id;
        ELSE
            v_registro_id := NULL;
        END IF;
        
        v_dados_anteriores := row_to_json(OLD)::JSONB;
        v_dados_novos := NULL;
    ELSE
        -- Para inserção ou atualização, use os dados novos
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = TG_TABLE_NAME AND column_name = 'tenant_id') THEN
            v_tenant_id := NEW.tenant_id;
        ELSE
            v_tenant_id := NULL;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = TG_TABLE_NAME AND column_name = 'id') THEN
            v_registro_id := NEW.id;
        ELSE
            v_registro_id := NULL;
        END IF;
        
        v_dados_novos := row_to_json(NEW)::JSONB;
        
        -- Para atualização, também inclua os dados anteriores
        IF TG_OP = 'UPDATE' THEN
            v_dados_anteriores := row_to_json(OLD)::JSONB;
        ELSE
            v_dados_anteriores := NULL;
        END IF;
    END IF;
    
    -- Registrar log de auditoria
    INSERT INTO logs_atividade (
        tenant_id,
        usuario_id,
        acao,
        tabela_afetada,
        registro_afetado,
        dados_anteriores,
        dados_novos,
        data_hora
    )
    VALUES (
        v_tenant_id,
        v_usuario_id,
        TG_OP,
        TG_TABLE_NAME,
        v_registro_id,
        v_dados_anteriores,
        v_dados_novos,
        CURRENT_TIMESTAMP
    );
    
    -- Em caso de exclusão, retorna OLD para permitir a exclusão
    -- Em outros casos, retorna NEW para continuar a operação
    RETURN TG_OP = 'DELETE' ? OLD : NEW;
END;
$$ LANGUAGE plpgsql;

-- Exemplo de criação de trigger de auditoria para algumas tabelas importantes
CREATE TRIGGER tg_auditoria_pedidos
AFTER INSERT OR UPDATE OR DELETE ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_auditoria();

CREATE TRIGGER tg_auditoria_clientes
AFTER INSERT OR UPDATE OR DELETE ON clientes
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_auditoria();

CREATE TRIGGER tg_auditoria_produtos
AFTER INSERT OR UPDATE OR DELETE ON produtos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_auditoria();

CREATE TRIGGER tg_auditoria_pagamentos
AFTER INSERT OR UPDATE OR DELETE ON pagamentos
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_auditoria();

CREATE TRIGGER tg_auditoria_caixas
AFTER INSERT OR UPDATE OR DELETE ON caixas
FOR EACH ROW EXECUTE FUNCTION fn_registrar_log_auditoria();

-- Função para registrar data de atualização
CREATE OR REPLACE FUNCTION fn_atualizar_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em tabelas relevantes
CREATE TRIGGER tg_atualizar_data_produtos
BEFORE UPDATE ON produtos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_data_atualizacao();

CREATE TRIGGER tg_atualizar_data_tenants
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_data_atualizacao();

CREATE TRIGGER tg_atualizar_data_programas_fidelidade
BEFORE UPDATE ON programas_fidelidade
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_data_atualizacao();

-- =============================================
-- 6. TRIGGERS PARA COMISSÕES
-- =============================================

-- Função para calcular comissão automática quando um pedido é fechado
CREATE OR REPLACE FUNCTION fn_calcular_comissao()
RETURNS TRIGGER AS $$
DECLARE
    v_funcionario_id INTEGER;
    v_cargo_id INTEGER;
    v_percentual_comissao DECIMAL(5, 2);
BEGIN
    -- Pedido foi fechado com sucesso
    IF (NEW.status = 'Fechado' OR NEW.status_id IS NOT NULL) AND 
       OLD.status != 'Fechado' AND 
       NEW.funcionario_id IS NOT NULL THEN
        
        -- Obter cargo do funcionário
        SELECT cargo_id INTO v_cargo_id
        FROM funcionarios
        WHERE id = NEW.funcionario_id;
        
        IF v_cargo_id IS NOT NULL THEN
            -- Buscar percentual de comissão do cargo
            SELECT comissao_percentual INTO v_percentual_comissao
            FROM cargos
            WHERE id = v_cargo_id;
            
            -- Se o cargo tem comissão
            IF v_percentual_comissao > 0 THEN
                -- Registrar comissão
                INSERT INTO comissoes (
                    tenant_id,
                    funcionario_id,
                    pedido_id,
                    valor_venda,
                    percentual_comissao,
                    valor_comissao,
                    data_venda,
                    status,
                    usuario_id
                ) VALUES (
                    NEW.tenant_id,
                    NEW.funcionario_id,
                    NEW.id,
                    NEW.valor_total,
                    v_percentual_comissao,
                    ROUND((NEW.valor_total * v_percentual_comissao / 100), 2),
                    CURRENT_DATE,
                    'pendente',
                    NEW.usuario_fechamento
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_calcular_comissao
AFTER UPDATE OF status, status_id ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_calcular_comissao();

-- Função para verificar cupom de desconto
CREATE OR REPLACE FUNCTION fn_verificar_cupom()
RETURNS TRIGGER AS $$
DECLARE
    v_cupom RECORD;
    v_cliente_utilizou BOOLEAN;
    v_desconto DECIMAL(10, 2);
BEGIN
    -- Se um cupom foi adicionado ou alterado
    IF NEW.cupom_id IS NOT NULL AND 
       (OLD.cupom_id IS NULL OR NEW.cupom_id != OLD.cupom_id) THEN
        
        -- Obter dados do cupom
        SELECT * INTO v_cupom
        FROM cupons
        WHERE id = NEW.cupom_id;
        
        -- Verificar validade
        IF v_cupom.data_inicio > CURRENT_DATE OR 
           (v_cupom.data_fim IS NOT NULL AND v_cupom.data_fim < CURRENT_DATE) THEN
            RAISE EXCEPTION 'Cupom fora do período de validade';
        END IF;
        
        -- Verificar se cupom está ativo
        IF NOT v_cupom.ativo THEN
            RAISE EXCEPTION 'Cupom não está ativo';
        END IF;
        
        -- Verificar limite de usos
        IF v_cupom.usos_restantes IS NOT NULL AND v_cupom.usos_restantes <= 0 THEN
            RAISE EXCEPTION 'Cupom atingiu o limite de usos';
        END IF;
        
        -- Verificar valor mínimo do pedido
        IF v_cupom.valor_minimo_pedido > 0 AND NEW.subtotal < v_cupom.valor_minimo_pedido THEN
            RAISE EXCEPTION 'Valor mínimo para o cupom não atingido. Mínimo: %', v_cupom.valor_minimo_pedido;
        END IF;
        
        -- Verificar restrições de cliente
        IF NEW.cliente_id IS NOT NULL AND v_cupom.clientes_especificos IS NOT NULL THEN
            IF NOT (NEW.cliente_id::TEXT IN (SELECT jsonb_array_elements_text(v_cupom.clientes_especificos))) THEN
                RAISE EXCEPTION 'Cupom não é válido para este cliente';
            END IF;
        END IF;
        
        -- Verificar primeira compra
        IF v_cupom.primeira_compra_apenas AND NEW.cliente_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 
                FROM pedidos
                WHERE cliente_id = NEW.cliente_id
                  AND status = 'Fechado'
            ) INTO v_cliente_utilizou;
            
            IF v_cliente_utilizou THEN
                RAISE EXCEPTION 'Cupom válido apenas para primeira compra';
            END IF;
        END IF;
        
        -- Aplicar desconto do cupom
        IF v_cupom.tipo = 'percentual' THEN
            v_desconto := ROUND((NEW.subtotal * v_cupom.valor / 100), 2);
            
            -- Limitar valor máximo se configurado
            IF v_cupom.valor_maximo_desconto IS NOT NULL AND v_desconto > v_cupom.valor_maximo_desconto THEN
                v_desconto := v_cupom.valor_maximo_desconto;
            END IF;
            
            NEW.desconto_percentual := v_cupom.valor;
            NEW.desconto_valor := v_desconto;
        ELSE -- valor_fixo
            NEW.desconto_valor := v_cupom.valor;
            IF NEW.subtotal > 0 THEN
                NEW.desconto_percentual := ROUND((v_cupom.valor / NEW.subtotal * 100), 2);
            END IF;
        END IF;
        
        -- Atualizar contador de usos se necessário
        IF v_cupom.usos_restantes IS NOT NULL THEN
            UPDATE cupons
            SET usos_restantes = usos_restantes - 1
            WHERE id = NEW.cupom_id;
        END IF;
        
        -- Recalcular valor total
        NEW.valor_total := NEW.subtotal - NEW.desconto_valor + NEW.acrescimo_valor + NEW.taxa_servico + NEW.taxa_entrega;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_verificar_cupom
BEFORE UPDATE OF cupom_id ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_verificar_cupom();

-- =============================================
-- 7. TRIGGERS PARA ATUALIZAÇÃO DE STATUS
-- =============================================

-- Função para verificar e atualizar status do pedido baseado nos itens
CREATE OR REPLACE FUNCTION fn_verificar_status_itens_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_todos_prontos BOOLEAN;
    v_todos_entregues BOOLEAN;
    v_status_pedido VARCHAR(20);
    v_status_id_pedido INTEGER;
BEGIN
    -- Obter status atual do pedido
    SELECT status, status_id INTO v_status_pedido, v_status_id_pedido
    FROM pedidos
    WHERE id = NEW.pedido_id;
    
    -- Verificar se todos os itens (não cancelados) estão prontos
    SELECT 
        NOT EXISTS (
            SELECT 1 FROM itens_pedido 
            WHERE pedido_id = NEW.pedido_id 
            AND status NOT IN ('Pronto', 'Entregue') 
            AND cancelado = FALSE
        ),
        NOT EXISTS (
            SELECT 1 FROM itens_pedido 
            WHERE pedido_id = NEW.pedido_id 
            AND status != 'Entregue' 
            AND cancelado = FALSE
        )
    INTO v_todos_prontos, v_todos_entregues;
    
    -- Atualizar status do pedido se necessário
    IF v_todos_entregues AND v_status_pedido NOT IN ('Fechado', 'Cancelado') THEN
        -- Todos itens entregues
        UPDATE pedidos
        SET status = 'Entregue',
            data_entrega = CURRENT_TIMESTAMP
        WHERE id = NEW.pedido_id;
        
    ELSIF v_todos_prontos AND v_status_pedido = 'Em Preparo' THEN
        -- Todos itens prontos
        UPDATE pedidos
        SET status = 'Pronto',
            data_finalizado = CURRENT_TIMESTAMP
        WHERE id = NEW.pedido_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_verificar_status_itens_pedido
AFTER UPDATE OF status ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_verificar_status_itens_pedido();

-- Função para atualizar estoque de composição
CREATE OR REPLACE FUNCTION fn_atualizar_estoque_composicao()
RETURNS TRIGGER AS $$
DECLARE
    v_cursor CURSOR FOR 
        SELECT pc.produto_componente_id, pc.quantidade
        FROM produtos_composicao pc
        WHERE pc.produto_principal_id = NEW.produto_id;
    v_registro RECORD;
    v_controlar_estoque BOOLEAN;
    v_estoque_atual DECIMAL(10, 2);
    v_tenant_id INTEGER;
BEGIN
    -- Verificar se o produto principal é um produto composto
    IF EXISTS (SELECT 1 FROM produtos_composicao WHERE produto_principal_id = NEW.produto_id) THEN
        -- Obter tenant_id
        SELECT tenant_id INTO v_tenant_id
        FROM produtos
        WHERE id = NEW.produto_id;
        
        -- Percorrer todos componentes
        OPEN v_cursor;
        LOOP
            FETCH v_cursor INTO v_registro;
            EXIT WHEN NOT FOUND;
            
            -- Verificar se o componente controla estoque
            SELECT controlar_estoque, estoque_atual INTO v_controlar_estoque, v_estoque_atual
            FROM produtos
            WHERE id = v_registro.produto_componente_id;
            
            IF v_controlar_estoque THEN
                -- Verificar se há estoque suficiente
                IF v_estoque_atual < (v_registro.quantidade * NEW.quantidade) THEN
                    RAISE EXCEPTION 'Estoque insuficiente para o componente ID %. Atual: %, Requerido: %', 
                        v_registro.produto_componente_id, v_estoque_atual, (v_registro.quantidade * NEW.quantidade);
                END IF;
                
                -- Atualizar estoque do componente
                UPDATE produtos
                SET estoque_atual = estoque_atual - (v_registro.quantidade * NEW.quantidade),
                    data_atualizacao = CURRENT_TIMESTAMP
                WHERE id = v_registro.produto_componente_id;
                
                -- Registrar log
                INSERT INTO logs_atividade (
                    tenant_id,
                    acao,
                    tabela_afetada,
                    registro_afetado,
                    dados_novos
                )
                VALUES (
                    v_tenant_id,
                    'BAIXA_ESTOQUE_COMPOSICAO',
                    'produtos',
                    v_registro.produto_componente_id,
                    jsonb_build_object(
                        'quantidade', (v_registro.quantidade * NEW.quantidade),
                        'estoque_anterior', v_estoque_atual,
                        'estoque_atual', v_estoque_atual - (v_registro.quantidade * NEW.quantidade),
                        'produto_principal_id', NEW.produto_id,
                        'pedido_id', NEW.pedido_id
                    )
                );
            END IF;
        END LOOP;
        CLOSE v_cursor;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_estoque_composicao
AFTER INSERT ON itens_pedido
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_estoque_composicao();

-- Função para validar tenant_id em chaves estrangeiras
CREATE OR REPLACE FUNCTION fn_validar_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_id INTEGER;
BEGIN
    -- Verifica relação com tabelas que têm tenant_id
    IF TG_TABLE_NAME = 'usuarios_perfis' THEN
        -- Verifica se o usuário e o perfil pertencem ao mesmo tenant
        SELECT u.tenant_id INTO v_tenant_id
        FROM usuarios u
        WHERE u.id = NEW.usuario_id;
        
        IF NOT EXISTS (
            SELECT 1 FROM perfis p
            WHERE p.id = NEW.perfil_id AND p.tenant_id = v_tenant_id
        ) THEN
            RAISE EXCEPTION 'Violação de tenant: usuário e perfil pertencem a tenants diferentes';
        END IF;
        
    ELSIF TG_TABLE_NAME = 'funcionarios_escalas' THEN
        -- Verifica se o funcionário e escala pertencem ao mesmo tenant
        SELECT f.tenant_id INTO v_tenant_id
        FROM funcionarios f
        WHERE f.id = NEW.funcionario_id;
        
        -- Adicione mais validações conforme necessário para outras tabelas
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers de validação em tabelas específicas
CREATE TRIGGER tg_validar_tenant_usuarios_perfis
BEFORE INSERT OR UPDATE ON usuarios_perfis
FOR EACH ROW EXECUTE FUNCTION fn_validar_tenant_id();

CREATE TRIGGER tg_validar_tenant_funcionarios_escalas
BEFORE INSERT OR UPDATE ON funcionarios_escalas
FOR EACH ROW EXECUTE FUNCTION fn_validar_tenant_id();

-- Adicione mais triggers conforme necessário
