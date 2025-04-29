-- =============================================
-- SCRIPT DE DADOS DE TESTE
-- Sistema SaaS Multi-Tenant de Restaurante
-- Database: PostgreSQL
-- =============================================

SET search_path TO restaurante;

-- Procedimento para inserir dados de teste em um tenant específico
CREATE OR REPLACE PROCEDURE inserir_dados_teste(
    p_tenant_id INTEGER,
    p_usuario_admin_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_categoria_id_pratos INTEGER;
    v_categoria_id_bebidas INTEGER;
    v_categoria_id_peixes INTEGER;
    v_categoria_id_sobremesas INTEGER;
    
    v_fornecedor_id_1 INTEGER;
    v_fornecedor_id_2 INTEGER;
    
    v_un_id_un INTEGER;
    v_un_id_kg INTEGER;
    v_un_id_l INTEGER;
    v_un_id_porc INTEGER;
    
    v_produto_id_1 INTEGER;
    v_produto_id_2 INTEGER;
    v_produto_id_3 INTEGER;
    v_produto_id_4 INTEGER;
    v_produto_id_5 INTEGER;
    v_produto_id_6 INTEGER;
    v_produto_id_7 INTEGER;
    v_produto_id_8 INTEGER;
    
    v_funcionario_id_1 INTEGER;
    v_funcionario_id_2 INTEGER;
    
    v_cardapio_id INTEGER;
    
    v_caixa_id INTEGER;
    
    v_mesa_id_1 INTEGER;
    v_mesa_id_2 INTEGER;
    
    v_pedido_id_1 INTEGER;
    v_pedido_id_2 INTEGER;
BEGIN
    -- Verificar se o tenant existe
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Tenant ID % não encontrado', p_tenant_id;
    END IF;
    
    -- Verificar se o usuário existe
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_usuario_admin_id AND tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'Usuário ID % não encontrado para o tenant %', p_usuario_admin_id, p_tenant_id;
    END IF;
    
    -- Obter IDs de categorias existentes
    SELECT id INTO v_categoria_id_pratos 
    FROM categorias 
    WHERE tenant_id = p_tenant_id AND nome = 'Pratos Principais' 
    LIMIT 1;
    
    SELECT id INTO v_categoria_id_bebidas 
    FROM categorias 
    WHERE tenant_id = p_tenant_id AND nome = 'Bebidas' 
    LIMIT 1;
    
    SELECT id INTO v_categoria_id_peixes 
    FROM categorias 
    WHERE tenant_id = p_tenant_id AND nome = 'Peixes' 
    LIMIT 1;
    
    SELECT id INTO v_categoria_id_sobremesas 
    FROM categorias 
    WHERE tenant_id = p_tenant_id AND nome = 'Sobremesas' 
    LIMIT 1;
    
    -- Obter IDs de unidades de medida
    SELECT id INTO v_un_id_un FROM unidades_medida WHERE simbolo = 'un' LIMIT 1;
    SELECT id INTO v_un_id_kg FROM unidades_medida WHERE simbolo = 'kg' LIMIT 1;
    SELECT id INTO v_un_id_l FROM unidades_medida WHERE simbolo = 'l' LIMIT 1;
    SELECT id INTO v_un_id_porc FROM unidades_medida WHERE simbolo = 'porç' LIMIT 1;
    
    -- Obter ID do cardápio
    SELECT id INTO v_cardapio_id 
    FROM cardapios 
    WHERE tenant_id = p_tenant_id 
    LIMIT 1;
    
    -- Iniciar transação
    BEGIN
        -- 1. CRIAR FORNECEDORES
        INSERT INTO fornecedores (
            tenant_id, nome, razao_social, cnpj, telefone, email, cidade, estado, ativo
        ) VALUES (
            p_tenant_id, 'Frigorífico Peixe Fresco', 'Frigorífico Peixe Fresco LTDA', '18.234.567/0001-12', 
            '(11) 3344-5566', 'contato@peixefresco.com.br', 'Santos', 'SP', TRUE
        )
        RETURNING id INTO v_fornecedor_id_1;
        
        INSERT INTO fornecedores (
            tenant_id, nome, razao_social, cnpj, telefone, email, cidade, estado, ativo
        ) VALUES (
            p_tenant_id, 'Distribuidora de Bebidas', 'Distribuidora Silva & Cia LTDA', '87.654.321/0001-90', 
            '(11) 7788-9900', 'vendas@distribuidorasilva.com.br', 'São Paulo', 'SP', TRUE
        )
        RETURNING id INTO v_fornecedor_id_2;
        
        -- 2. CRIAR PRODUTOS
        -- Peixes
        INSERT INTO produtos (
            tenant_id, codigo, nome, descricao, categoria_id, preco_custo, preco_venda, 
            estoque_atual, estoque_minimo, unidade_medida_id, controlar_estoque, disponivel_venda
        ) VALUES (
            p_tenant_id, 'PEI001', 'Peixe Grelhado Especial', 'Peixe fresco grelhado ao molho de ervas', 
            v_categoria_id_peixes, 25.00, 59.90, 50, 10, v_un_id_un, TRUE, TRUE
        )
        RETURNING id INTO v_produto_id_1;
        
        INSERT INTO produtos (
            tenant_id, codigo, nome, descricao, categoria_id, preco_custo, preco_venda, 
            estoque_atual, estoque_minimo, unidade_medida_id, controlar_estoque, disponivel_venda
        ) VALUES (
            p_tenant_id, 'PEI002', 'Tilápia Frita', 'Tilápia fresca frita com batatas', 
            v_categoria_id_peixes, 20.00, 45.90, 30, 5, v_un_id_un, TRUE, TRUE
        )
        RETURNING id INTO v_produto_id_2;
        
        -- Pratos Principais
        INSERT INTO produtos (
            tenant_id, codigo, nome, descricao, categoria_id, preco_custo, preco_venda, 
            estoque_atual, estoque_minimo, unidade_medida_id, controlar_estoque, disponivel_venda
        ) VALUES (
            p_tenant_id, 'PRA001', 'Camarão à Baiana', 'Camarão refogado com temperos baianos e arroz', 
            v_categoria_id_pratos, 32.00, 78.90, 20, 5, v_un_id_porc, TRUE, TRUE
        )
        RETURNING id INTO v_produto_id_3;
        
        INSERT INTO produtos (
            tenant_id, codigo, nome, descricao, categoria_id, preco_custo, preco_venda, 
            estoque_atual, estoque_minimo, unidade_medida_id, controlar_estoque, disponivel_venda
        ) VALUES (
            p_tenant_id, 'PRA002', 'Moqueca Mista', 'Moqueca tradicional com peixe e camarão', 
            v_categoria_id_pratos, 40.00, 89.90, 15, 3, v_un_id_porc, TRUE, TRUE
        )
        RETURNING id INTO v_produto_id_4;
        
        -- Bebidas
        INSERT INTO produtos (
            tenant_id, codigo, nome, descricao, categoria_id, preco_custo, preco_venda, 
            estoque_atual, estoque_minimo, unidade_medida_id, controlar_estoque, disponivel_venda
        ) VALUES (
            p_tenant_id, 'BEB001', 'Refrigerante Lata', 'Refrigerante em lata (diversos sabores)', 
            v_categoria_id_bebidas, 2.50, 6.00, 100, 24, v_un_id_un, TRUE, TRUE
        )
        RETURNING id INTO v_produto_id_5;
        
        INSERT INTO produtos (
            tenant_id, codigo, nome, descricao, categoria_id, preco_custo, preco_venda, 
            estoque_atual, estoque_minimo, unidade_medida_id, controlar_estoque, disponivel_venda
        ) VALUES (
            p_tenant_id, 'BEB002', 'Suco Natural', 'Suco de frutas frescas', 
            v_categoria_id_bebidas, 3.00, 9.90, 50, 10, v_un_id_un, TRUE, TRUE
        )
        RETURNING id INTO v_produto_id_6;
        
        -- Sobremesas
        INSERT INTO produtos (
            tenant_id, codigo, nome, descricao, categoria_id, preco_custo, preco_venda, 
            estoque_atual, estoque_minimo, unidade_medida_id, controlar_estoque, disponivel_venda
        ) VALUES (
            p_tenant_id, 'SOB001', 'Pudim de Leite', 'Pudim caseiro tradicional', 
            v_categoria_id_sobremesas, 5.00, 14.90, 20, 5, v_un_id_un, TRUE, TRUE
        )
        RETURNING id INTO v_produto_id_7;
        
        INSERT INTO produtos (
            tenant_id, codigo, nome, descricao, categoria_id, preco_custo, preco_venda, 
            estoque_atual, estoque_minimo, unidade_medida_id, controlar_estoque, disponivel_venda
        ) VALUES (
            p_tenant_id, 'SOB002', 'Mousse de Maracujá', 'Mousse gelado de maracujá com calda', 
            v_categoria_id_sobremesas, 4.50, 12.90, 15, 3, v_un_id_un, TRUE, TRUE
        )
        RETURNING id INTO v_produto_id_8;
        
        -- 3. ASSOCIAR PRODUTOS AO CARDÁPIO
        INSERT INTO cardapios_produtos (cardapio_id, produto_id, destaque, disponivel)
        VALUES 
            (v_cardapio_id, v_produto_id_1, TRUE, TRUE),
            (v_cardapio_id, v_produto_id_2, FALSE, TRUE),
            (v_cardapio_id, v_produto_id_3, TRUE, TRUE),
            (v_cardapio_id, v_produto_id_4, TRUE, TRUE),
            (v_cardapio_id, v_produto_id_5, FALSE, TRUE),
            (v_cardapio_id, v_produto_id_6, FALSE, TRUE),
            (v_cardapio_id, v_produto_id_7, FALSE, TRUE),
            (v_cardapio_id, v_produto_id_8, FALSE, TRUE);
        
        -- 4. CRIAR FUNCIONÁRIOS
        INSERT INTO funcionarios (
            tenant_id, nome, cpf, data_nascimento, telefone, email, cargo, salario, data_contratacao, ativo
        ) VALUES (
            p_tenant_id, 'Ana Silva', '123.456.789-00', '1985-05-15', '(11) 98765-4321', 
            'ana.silva@email.com', 'Gerente', 3500.00, '2023-01-10', TRUE
        )
        RETURNING id INTO v_funcionario_id_1;
        
        INSERT INTO funcionarios (
            tenant_id, nome, cpf, data_nascimento, telefone, email, cargo, salario, data_contratacao, ativo
        ) VALUES (
            p_tenant_id, 'João Santos', '987.654.321-00', '1990-08-20', '(11) 91234-5678', 
            'joao.santos@email.com', 'Garçom', 1800.00, '2023-02-15', TRUE
        )
        RETURNING id INTO v_funcionario_id_2;
        
        -- 5. REGISTRAR ENTRADA DE ESTOQUE
        INSERT INTO entradas_estoque (
            tenant_id, produto_id, fornecedor_id, quantidade, preco_unitario, valor_total, 
            data_entrada, numero_nota_fiscal, usuario_id
        ) VALUES (
            p_tenant_id, v_produto_id_1, v_fornecedor_id_1, 50, 25.00, 1250.00, 
            CURRENT_DATE - INTERVAL '7 days', 'NF123456', p_usuario_admin_id
        );
        
        INSERT INTO entradas_estoque (
            tenant_id, produto_id, fornecedor_id, quantidade, preco_unitario, valor_total, 
            data_entrada, numero_nota_fiscal, usuario_id
        ) VALUES (
            p_tenant_id, v_produto_id_5, v_fornecedor_id_2, 100, 2.50, 250.00, 
            CURRENT_DATE - INTERVAL '5 days', 'NF789012', p_usuario_admin_id
        );
        
        -- 6. ABRIR CAIXA
        INSERT INTO caixas (
            tenant_id, usuario_id, data_abertura, valor_abertura, status
        ) VALUES (
            p_tenant_id, p_usuario_admin_id, CURRENT_TIMESTAMP, 200.00, 'Aberto'
        )
        RETURNING id INTO v_caixa_id;
        
        -- 7. OBTER MESAS PARA PEDIDOS
        SELECT id INTO v_mesa_id_1 
        FROM mesas 
        WHERE tenant_id = p_tenant_id AND numero = 1;
        
        SELECT id INTO v_mesa_id_2 
        FROM mesas 
        WHERE tenant_id = p_tenant_id AND numero = 2;
        
        -- 8. CRIAR PEDIDOS
        INSERT INTO pedidos (
            tenant_id, mesa_id, cliente_nome, status, data_pedido, valor_subtotal, valor_desconto, 
            valor_total, usuario_abertura
        ) VALUES (
            p_tenant_id, v_mesa_id_1, 'Cliente Mesa 1', 'Aberto', CURRENT_TIMESTAMP - INTERVAL '30 minutes', 
            0, 0, 0, p_usuario_admin_id
        )
        RETURNING id INTO v_pedido_id_1;
        
        INSERT INTO pedidos (
            tenant_id, mesa_id, cliente_nome, status, data_pedido, valor_subtotal, valor_desconto, 
            valor_total, usuario_abertura
        ) VALUES (
            p_tenant_id, v_mesa_id_2, 'Cliente Mesa 2', 'Em Preparo', CURRENT_TIMESTAMP - INTERVAL '45 minutes', 
            0, 0, 0, p_usuario_admin_id
        )
        RETURNING id INTO v_pedido_id_2;
        
        -- 9. ADICIONAR ITENS AOS PEDIDOS
        -- Itens para pedido 1
        INSERT INTO itens_pedido (
            pedido_id, produto_id, quantidade, preco_unitario, valor_total, status, data_pedido
        ) VALUES (
            v_pedido_id_1, v_produto_id_1, 2, 59.90, 119.80, 'Em Preparo', CURRENT_TIMESTAMP - INTERVAL '25 minutes'
        );
        
        INSERT INTO itens_pedido (
            pedido_id, produto_id, quantidade, preco_unitario, valor_total, status, data_pedido
        ) VALUES (
            v_pedido_id_1, v_produto_id_5, 2, 6.00, 12.00, 'Entregue', CURRENT_TIMESTAMP - INTERVAL '20 minutes'
        );
        
        -- Itens para pedido 2
        INSERT INTO itens_pedido (
            pedido_id, produto_id, quantidade, preco_unitario, valor_total, status, data_pedido
        ) VALUES (
            v_pedido_id_2, v_produto_id_3, 1, 78.90, 78.90, 'Pronto', CURRENT_TIMESTAMP - INTERVAL '30 minutes'
        );
        
        INSERT INTO itens_pedido (
            pedido_id, produto_id, quantidade, preco_unitario, valor_total, status, data_pedido
        ) VALUES (
            v_pedido_id_2, v_produto_id_4, 1, 89.90, 89.90, 'Em Preparo', CURRENT_TIMESTAMP - INTERVAL '30 minutes'
        );
        
        INSERT INTO itens_pedido (
            pedido_id, produto_id, quantidade, preco_unitario, valor_total, status, data_pedido
        ) VALUES (
            v_pedido_id_2, v_produto_id_6, 2, 9.90, 19.80, 'Entregue', CURRENT_TIMESTAMP - INTERVAL '25 minutes'
        );
        
        -- 10. REGISTRAR MOVIMENTAÇÕES FINANCEIRAS
        INSERT INTO movimentacoes_financeiras (
            tenant_id, caixa_id, tipo, descricao, valor, data_movimento, categoria, usuario_id
        ) VALUES (
            p_tenant_id, v_caixa_id, 'Entrada', 'Abertura de caixa', 200.00, CURRENT_TIMESTAMP - INTERVAL '2 hours', 
            'Abertura', p_usuario_admin_id
        );
        
        INSERT INTO movimentacoes_financeiras (
            tenant_id, caixa_id, tipo, descricao, valor, data_movimento, categoria, usuario_id
        ) VALUES (
            p_tenant_id, v_caixa_id, 'Saída', 'Compra de material de limpeza', 45.30, CURRENT_TIMESTAMP - INTERVAL '1 hour', 
            'Despesas', p_usuario_admin_id
        );
        
        -- 11. AJUSTAR STATUS DAS MESAS
        UPDATE mesas SET status = 'Ocupada' WHERE id = v_mesa_id_1;
        UPDATE mesas SET status = 'Ocupada' WHERE id = v_mesa_id_2;
        
        -- Commit da transação
        COMMIT;
        
        RAISE NOTICE 'Dados de teste inseridos com sucesso para o tenant %!', p_tenant_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback em caso de erro
            ROLLBACK;
            RAISE EXCEPTION 'Erro ao inserir dados de teste: %', SQLERRM;
    END;
END;
$$;

-- =============================================
-- EXEMPLO DE USO
-- =============================================

/*
-- Substitua os valores pelos IDs reais do seu ambiente
CALL inserir_dados_teste(
    1,  -- ID do tenant
    1   -- ID do usuário administrador
);
*/

-- =============================================
-- PROCEDIMENTO PARA LIMPAR DADOS DE TESTE
-- =============================================

CREATE OR REPLACE PROCEDURE limpar_dados_teste(
    p_tenant_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar se o tenant existe
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
        RAISE EXCEPTION 'Tenant ID % não encontrado', p_tenant_id;
    END IF;
    
    -- Iniciar transação
    BEGIN
        -- Excluir movimentações financeiras (exceto de abertura)
        DELETE FROM movimentacoes_financeiras 
        WHERE tenant_id = p_tenant_id AND categoria <> 'Abertura';
        
        -- Excluir itens_pedido associados aos pedidos do tenant
        DELETE FROM itens_pedido 
        WHERE pedido_id IN (SELECT id FROM pedidos WHERE tenant_id = p_tenant_id);
        
        -- Excluir pedidos
        DELETE FROM pedidos 
        WHERE tenant_id = p_tenant_id;
        
        -- Atualizar status das mesas para 'Livre'
        UPDATE mesas 
        SET status = 'Livre' 
        WHERE tenant_id = p_tenant_id;
        
        -- Excluir entradas_estoque
        DELETE FROM entradas_estoque 
        WHERE tenant_id = p_tenant_id;
        
        -- Excluir associações cardápio-produtos
        DELETE FROM cardapios_produtos 
        WHERE cardapio_id IN (SELECT id FROM cardapios WHERE tenant_id = p_tenant_id);
        
        -- Resetar estoque dos produtos para valor mínimo
        UPDATE produtos 
        SET estoque_atual = estoque_minimo 
        WHERE tenant_id = p_tenant_id;
        
        -- Fechar caixas abertos
        UPDATE caixas 
        SET status = 'Fechado', 
            data_fechamento = CURRENT_TIMESTAMP, 
            valor_fechamento = valor_abertura, 
            valor_sistema = valor_abertura, 
            diferenca = 0 
        WHERE tenant_id = p_tenant_id AND status = 'Aberto';
        
        -- Commit da transação
        COMMIT;
        
        RAISE NOTICE 'Dados de teste limpos com sucesso para o tenant %!', p_tenant_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback em caso de erro
            ROLLBACK;
            RAISE EXCEPTION 'Erro ao limpar dados de teste: %', SQLERRM;
    END;
END;
$$;
