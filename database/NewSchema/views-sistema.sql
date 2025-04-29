-- =============================================
-- VIEWS PARA O SISTEMA DE RESTAURANTE
-- Banco de dados: PostgreSQL
-- =============================================

SET search_path TO restaurante;

-- =============================================
-- 1. VIEWS PARA DASHBOARD E MÉTRICAS
-- =============================================

-- View de resumo diário de vendas (últimos 30 dias)
CREATE OR REPLACE VIEW vw_resumo_vendas_diario AS
SELECT 
    p.tenant_id,
    DATE(p.data_pedido) AS data,
    COUNT(p.id) AS total_pedidos,
    COUNT(DISTINCT p.cliente_id) AS total_clientes,
    SUM(p.valor_total) AS faturamento_total,
    ROUND(AVG(p.valor_total), 2) AS ticket_medio,
    SUM(p.valor_total) - SUM(p.subtotal) + SUM(p.desconto_valor) AS total_descontos,
    SUM(p.taxa_entrega) AS total_taxa_entrega,
    COUNT(CASE WHEN p.tipo = 'delivery' THEN 1 END) AS pedidos_delivery,
    COUNT(CASE WHEN p.tipo = 'local' THEN 1 END) AS pedidos_local,
    COUNT(CASE WHEN p.tipo NOT IN ('delivery', 'local') THEN 1 END) AS pedidos_outros
FROM 
    pedidos p
WHERE 
    p.status = 'Fechado' 
    AND p.data_pedido >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 
    p.tenant_id, DATE(p.data_pedido)
ORDER BY 
    p.tenant_id, DATE(p.data_pedido) DESC;

-- View de produtos mais vendidos (últimos 30 dias)
CREATE OR REPLACE VIEW vw_produtos_mais_vendidos AS
SELECT 
    p.tenant_id,
    pr.id AS produto_id,
    pr.nome AS produto_nome,
    c.nome AS categoria,
    COUNT(ip.id) AS quantidade_pedidos,
    SUM(ip.quantidade) AS quantidade_total,
    SUM(ip.valor_total) AS valor_total,
    ROUND(AVG(ip.preco_unitario), 2) AS preco_medio
FROM 
    produtos pr
JOIN 
    itens_pedido ip ON pr.id = ip.produto_id
JOIN 
    pedidos p ON ip.pedido_id = p.id
LEFT JOIN 
    categorias c ON pr.categoria_id = c.id
WHERE 
    p.status = 'Fechado' 
    AND p.data_pedido >= CURRENT_DATE - INTERVAL '30 days'
    AND ip.cancelado = FALSE
GROUP BY 
    p.tenant_id, pr.id, pr.nome, c.nome
ORDER BY 
    SUM(ip.quantidade) DESC;

-- View de resumo de mesas (estado atual)
CREATE OR REPLACE VIEW vw_resumo_mesas AS
SELECT 
    m.tenant_id,
    a.nome AS area,
    COUNT(m.id) AS total_mesas,
    COUNT(CASE WHEN m.status = 'Livre' THEN 1 END) AS mesas_livres,
    COUNT(CASE WHEN m.status = 'Ocupada' THEN 1 END) AS mesas_ocupadas,
    COUNT(CASE WHEN m.status = 'Reservada' THEN 1 END) AS mesas_reservadas,
    COUNT(CASE WHEN m.status = 'Manutenção' THEN 1 END) AS mesas_manutencao
FROM 
    mesas m
LEFT JOIN 
    areas a ON m.area_id = a.id
WHERE 
    m.ativa = TRUE
GROUP BY 
    m.tenant_id, a.nome
ORDER BY 
    m.tenant_id, a.nome;

-- View de pedidos ativos
CREATE OR REPLACE VIEW vw_pedidos_ativos AS
SELECT 
    p.tenant_id,
    p.id AS pedido_id,
    p.codigo,
    p.tipo,
    p.status,
    CASE 
        WHEN p.status_id IS NOT NULL THEN 
            (SELECT nome FROM status_pedido WHERE id = p.status_id)
        ELSE p.status
    END AS status_nome,
    p.mesa_id,
    m.numero AS mesa_numero,
    a.nome AS area,
    p.cliente_id,
    COALESCE(p.cliente_nome, c.nome) AS cliente_nome,
    p.data_pedido,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.data_pedido))/60 AS minutos_aberto,
    p.tempo_preparo_estimado,
    CASE 
        WHEN p.tempo_preparo_estimado IS NOT NULL AND 
             EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.data_pedido))/60 > p.tempo_preparo_estimado 
        THEN TRUE 
        ELSE FALSE 
    END AS atrasado,
    f.nome AS atendente,
    p.subtotal,
    p.valor_total,
    p.observacao
FROM 
    pedidos p
LEFT JOIN 
    mesas m ON p.mesa_id = m.id
LEFT JOIN 
    areas a ON m.area_id = a.id
LEFT JOIN 
    clientes c ON p.cliente_id = c.id
LEFT JOIN 
    funcionarios f ON p.funcionario_id = f.id
WHERE 
    p.status NOT IN ('Fechado', 'Cancelado')
ORDER BY 
    p.data_pedido ASC;

-- View para itens em preparo (cozinha)
CREATE OR REPLACE VIEW vw_itens_preparo AS
SELECT 
    p.tenant_id,
    ip.id AS item_id,
    p.id AS pedido_id,
    p.codigo AS pedido_codigo,
    CASE 
        WHEN p.mesa_id IS NOT NULL THEN 'Mesa ' || m.numero
        WHEN p.tipo = 'delivery' THEN 'Delivery'
        WHEN p.tipo = 'viagem' THEN 'Viagem'
        ELSE p.tipo
    END AS origem,
    pr.nome AS produto,
    ip.quantidade,
    ip.observacao,
    ip.status,
    ip.data_pedido,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ip.data_pedido))/60 AS minutos_espera,
    ip.ordem_preparo,
    c.nome AS categoria
FROM 
    itens_pedido ip
JOIN 
    pedidos p ON ip.pedido_id = p.id
JOIN 
    produtos pr ON ip.produto_id = pr.id
LEFT JOIN 
    categorias c ON pr.categoria_id = c.id
LEFT JOIN 
    mesas m ON p.mesa_id = m.id
WHERE 
    ip.status IN ('Pendente', 'Em Preparo')
    AND ip.cancelado = FALSE
ORDER BY 
    ip.ordem_preparo NULLS LAST, ip.data_pedido ASC;

-- View de alertas de estoque
CREATE OR REPLACE VIEW vw_alertas_estoque AS
SELECT 
    p.tenant_id,
    p.id AS produto_id,
    p.codigo,
    p.nome,
    c.nome AS categoria,
    p.estoque_atual,
    p.estoque_minimo,
    p.estoque_atual - p.estoque_minimo AS diferenca,
    um.nome AS unidade_medida,
    p.preco_custo,
    (p.estoque_minimo - p.estoque_atual) * p.preco_custo AS valor_reposicao,
    CASE
        WHEN p.estoque_atual = 0 THEN 'Esgotado'
        WHEN p.estoque_atual <= p.estoque_minimo * 0.5 THEN 'Crítico'
        WHEN p.estoque_atual <= p.estoque_minimo THEN 'Baixo'
        ELSE 'Normal'
    END AS nivel_alerta
FROM 
    produtos p
LEFT JOIN 
    categorias c ON p.categoria_id = c.id
LEFT JOIN 
    unidades_medida um ON p.unidade_medida_id = um.id
WHERE 
    p.controlar_estoque = TRUE
    AND p.estoque_atual <= p.estoque_minimo
ORDER BY 
    (p.estoque_atual / NULLIF(p.estoque_minimo, 0)) ASC;

-- View de resumo do caixa atual
CREATE OR REPLACE VIEW vw_resumo_caixa_atual AS
SELECT 
    c.tenant_id,
    c.id AS caixa_id,
    c.nome AS caixa_nome,
    c.terminal,
    u.nome AS usuario,
    c.data_abertura,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.data_abertura))/3600 AS horas_aberto,
    c.valor_abertura,
    c.valor_abertura + 
    COALESCE(SUM(CASE WHEN mf.tipo = 'Entrada' THEN mf.valor ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN mf.tipo = 'Saída' THEN mf.valor ELSE 0 END), 0) AS saldo_atual,
    COALESCE(SUM(CASE WHEN mf.tipo = 'Entrada' THEN mf.valor ELSE 0 END), 0) AS total_entradas,
    COALESCE(SUM(CASE WHEN mf.tipo = 'Saída' THEN mf.valor ELSE 0 END), 0) AS total_saidas,
    COUNT(DISTINCT p.id) AS num_pagamentos,
    COUNT(DISTINCT CASE WHEN mf.tipo = 'Entrada' THEN mf.id END) AS num_entradas,
    COUNT(DISTINCT CASE WHEN mf.tipo = 'Saída' THEN mf.id END) AS num_saidas
FROM 
    caixas c
LEFT JOIN 
    usuarios u ON c.usuario_id = u.id
LEFT JOIN 
    movimentacoes_financeiras mf ON c.id = mf.caixa_id
LEFT JOIN 
    pagamentos p ON c.id = p.caixa_id
WHERE 
    c.status = 'Aberto'
GROUP BY 
    c.tenant_id, c.id, c.nome, c.terminal, u.nome, c.data_abertura, c.valor_abertura;

-- =============================================
-- 2. VIEWS PARA RELATÓRIOS FINANCEIROS
-- =============================================

-- View de faturamento por período
CREATE OR REPLACE VIEW vw_faturamento_periodo AS
WITH dados_mes AS (
    SELECT 
        tenant_id,
        DATE_TRUNC('month', data_pedido) AS mes,
        SUM(valor_total) AS faturamento,
        COUNT(id) AS num_pedidos,
        SUM(valor_total) / COUNT(id) AS ticket_medio,
        SUM(desconto_valor) AS total_descontos,
        SUM(taxa_entrega) AS total_taxas,
        COUNT(DISTINCT cliente_id) AS num_clientes
    FROM 
        pedidos
    WHERE 
        status = 'Fechado'
    GROUP BY 
        tenant_id, DATE_TRUNC('month', data_pedido)
)
SELECT 
    d.tenant_id,
    d.mes,
    d.faturamento,
    d.num_pedidos,
    d.ticket_medio,
    d.total_descontos,
    d.total_taxas,
    d.num_clientes,
    LAG(d.faturamento) OVER (PARTITION BY d.tenant_id ORDER BY d.mes) AS faturamento_mes_anterior,
    CASE 
        WHEN LAG(d.faturamento) OVER (PARTITION BY d.tenant_id ORDER BY d.mes) IS NOT NULL THEN
            ROUND(((d.faturamento - LAG(d.faturamento) OVER (PARTITION BY d.tenant_id ORDER BY d.mes)) / 
             NULLIF(LAG(d.faturamento) OVER (PARTITION BY d.tenant_id ORDER BY d.mes), 0)) * 100, 2)
        ELSE NULL
    END AS variacao_percentual
FROM 
    dados_mes d
ORDER BY 
    d.tenant_id, d.mes DESC;

-- View de faturamento por forma de pagamento
CREATE OR REPLACE VIEW vw_faturamento_forma_pagamento AS
SELECT 
    p.tenant_id,
    DATE_TRUNC('month', p.data_pagamento) AS mes,
    fp.nome AS forma_pagamento,
    fp.tipo AS tipo_pagamento,
    COUNT(p.id) AS quantidade,
    SUM(p.valor) AS valor_total,
    ROUND((SUM(p.valor) / SUM(SUM(p.valor)) OVER (PARTITION BY p.tenant_id, DATE_TRUNC('month', p.data_pagamento))) * 100, 2) AS percentual
FROM 
    pagamentos p
JOIN 
    formas_pagamento fp ON p.forma_pagamento_id = fp.id
WHERE 
    p.status = 'Confirmado'
GROUP BY 
    p.tenant_id, DATE_TRUNC('month', p.data_pagamento), fp.nome, fp.tipo
ORDER BY 
    p.tenant_id, mes DESC, valor_total DESC;

-- View para fluxo de caixa
CREATE OR REPLACE VIEW vw_fluxo_caixa AS
SELECT 
    tenant_id,
    DATE(data_movimento) AS data,
    tipo,
    COALESCE(cf.nome, 'Sem categoria') AS categoria,
    COALESCE(cc.nome, 'Sem centro de custo') AS centro_custo,
    SUM(valor) AS valor_total,
    COUNT(id) AS num_movimentacoes
FROM 
    movimentacoes_financeiras mf
LEFT JOIN 
    categorias_financeiras cf ON mf.categoria_id = cf.id
LEFT JOIN 
    centros_custo cc ON mf.centro_custo_id = cc.id
GROUP BY 
    tenant_id, DATE(data_movimento), tipo, cf.nome, cc.nome
ORDER BY 
    tenant_id, data DESC, tipo;

-- View para contas a pagar/receber por vencimento
CREATE OR REPLACE VIEW vw_contas_vencimento AS
SELECT 
    'pagar' AS tipo,
    cp.tenant_id,
    cp.id,
    cp.descricao,
    f.nome AS fornecedor,
    NULL::INTEGER AS cliente_id,
    NULL::VARCHAR AS cliente,
    cp.data_vencimento,
    cp.valor,
    cp.status,
    CASE 
        WHEN cp.data_vencimento < CURRENT_DATE AND cp.status = 'Pendente' THEN 
            CURRENT_DATE - cp.data_vencimento
        ELSE 0
    END AS dias_atraso,
    CASE 
        WHEN cp.data_vencimento < CURRENT_DATE AND cp.status = 'Pendente' THEN 'Atrasado'
        WHEN cp.data_vencimento = CURRENT_DATE AND cp.status = 'Pendente' THEN 'Hoje'
        WHEN cp.data_vencimento > CURRENT_DATE AND cp.status = 'Pendente' THEN 'A vencer'
        ELSE cp.status
    END AS situacao,
    cf.nome AS categoria
FROM 
    contas_pagar cp
LEFT JOIN 
    fornecedores f ON cp.fornecedor_id = f.id
LEFT JOIN
    categorias_financeiras cf ON cp.categoria_id = cf.id

UNION ALL

SELECT 
    'receber' AS tipo,
    cr.tenant_id,
    cr.id,
    cr.descricao,
    NULL::VARCHAR AS fornecedor,
    cr.cliente_id,
    COALESCE(cr.cliente_nome, c.nome) AS cliente,
    cr.data_vencimento,
    cr.valor,
    cr.status,
    CASE 
        WHEN cr.data_vencimento < CURRENT_DATE AND cr.status = 'Pendente' THEN 
            CURRENT_DATE - cr.data_vencimento
        ELSE 0
    END AS dias_atraso,
    CASE 
        WHEN cr.data_vencimento < CURRENT_DATE AND cr.status = 'Pendente' THEN 'Atrasado'
        WHEN cr.data_vencimento = CURRENT_DATE AND cr.status = 'Pendente' THEN 'Hoje'
        WHEN cr.data_vencimento > CURRENT_DATE AND cr.status = 'Pendente' THEN 'A vencer'
        ELSE cr.status
    END AS situacao,
    cf.nome AS categoria
FROM 
    contas_receber cr
LEFT JOIN 
    clientes c ON cr.cliente_id = c.id
LEFT JOIN
    categorias_financeiras cf ON cr.categoria_id = cf.id

ORDER BY 
    tenant_id, data_vencimento, tipo;

-- View para relatório de fluxo de caixa projetado
CREATE OR REPLACE VIEW vw_fluxo_caixa_projetado AS
WITH datas_futuras AS (
    SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '90 days',
        INTERVAL '1 day'
    )::date AS data
),
contas_pagar_futuras AS (
    SELECT 
        tenant_id,
        data_vencimento AS data,
        SUM(CASE WHEN status = 'Pendente' THEN valor ELSE 0 END) AS valor_pagar
    FROM 
        contas_pagar
    WHERE 
        data_vencimento >= CURRENT_DATE
        AND status = 'Pendente'
    GROUP BY 
        tenant_id, data_vencimento
),
contas_receber_futuras AS (
    SELECT 
        tenant_id,
        data_vencimento AS data,
        SUM(CASE WHEN status = 'Pendente' THEN valor ELSE 0 END) AS valor_receber
    FROM 
        contas_receber
    WHERE 
        data_vencimento >= CURRENT_DATE
        AND status = 'Pendente'
    GROUP BY 
        tenant_id, data_vencimento
),
saldo_acumulado_inicial AS (
    SELECT 
        tenant_id, 
        COALESCE(SUM(CASE WHEN tipo = 'Entrada' THEN valor ELSE -valor END), 0) AS saldo
    FROM 
        movimentacoes_financeiras
    WHERE 
        data_movimento < CURRENT_DATE
    GROUP BY 
        tenant_id
)
SELECT 
    t.id AS tenant_id,
    d.data,
    COALESCE(cp.valor_pagar, 0) AS saidas_previstas,
    COALESCE(cr.valor_receber, 0) AS entradas_previstas,
    COALESCE(cr.valor_receber, 0) - COALESCE(cp.valor_pagar, 0) AS saldo_dia,
    COALESCE(sai.saldo, 0) + SUM(COALESCE(cr.valor_receber, 0) - COALESCE(cp.valor_pagar, 0)) 
        OVER (PARTITION BY t.id ORDER BY d.data) AS saldo_projetado
FROM 
    datas_futuras d
CROSS JOIN
    tenants t
LEFT JOIN 
    contas_pagar_futuras cp ON d.data = cp.data AND cp.tenant_id = t.id
LEFT JOIN 
    contas_receber_futuras cr ON d.data = cr.data AND cr.tenant_id = t.id
LEFT JOIN 
    saldo_acumulado_inicial sai ON sai.tenant_id = t.id
WHERE 
    t.ativo = TRUE
ORDER BY 
    t.id, d.data;

-- =============================================
-- 3. VIEWS PARA ANÁLISE DE VENDAS
-- =============================================

-- View para análise de vendas por hora
CREATE OR REPLACE VIEW vw_vendas_por_hora AS
SELECT 
    tenant_id,
    EXTRACT(DOW FROM data_pedido) AS dia_semana,
    EXTRACT(HOUR FROM data_pedido) AS hora,
    COUNT(id) AS total_pedidos,
    ROUND(AVG(valor_total), 2) AS ticket_medio,
    SUM(valor_total) AS valor_total
FROM 
    pedidos
WHERE 
    status = 'Fechado'
    AND data_pedido >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 
    tenant_id, EXTRACT(DOW FROM data_pedido), EXTRACT(HOUR FROM data_pedido)
ORDER BY 
    tenant_id, dia_semana, hora;

-- View para análise de vendas por categoria
CREATE OR REPLACE VIEW vw_vendas_por_categoria AS
SELECT 
    p.tenant_id,
    c.nome AS categoria,
    COUNT(ip.id) AS total_itens,
    SUM(ip.quantidade) AS quantidade_total,
    SUM(ip.valor_total) AS valor_total,
    ROUND(SUM(ip.valor_total) / SUM(SUM(ip.valor_total)) OVER (PARTITION BY p.tenant_id) * 100, 2) AS percentual_vendas
FROM 
    itens_pedido ip
JOIN 
    pedidos p ON ip.pedido_id = p.id
JOIN 
    produtos pr ON ip.produto_id = pr.id
LEFT JOIN 
    categorias c ON pr.categoria_id = c.id
WHERE 
    p.status = 'Fechado'
    AND ip.cancelado = FALSE
    AND p.data_pedido >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 
    p.tenant_id, c.nome
ORDER BY 
    p.tenant_id, valor_total DESC;

-- View para análise de vendas por cliente
CREATE OR REPLACE VIEW vw_vendas_por_cliente AS
SELECT 
    p.tenant_id,
    p.cliente_id,
    COALESCE(c.nome, p.cliente_nome, 'Cliente não identificado') AS cliente_nome,
    MIN(p.data_pedido) AS primeira_compra,
    MAX(p.data_pedido) AS ultima_compra,
    COUNT(p.id) AS total_pedidos,
    ROUND(AVG(p.valor_total), 2) AS ticket_medio,
    SUM(p.valor_total) AS valor_total,
    CASE 
        WHEN MAX(p.data_pedido) >= CURRENT_DATE - INTERVAL '30 days' THEN 'Ativo'
        WHEN MAX(p.data_pedido) >= CURRENT_DATE - INTERVAL '90 days' THEN 'Regular'
        WHEN MAX(p.data_pedido) >= CURRENT_DATE - INTERVAL '180 days' THEN 'Inativo'
        ELSE 'Perdido'
    END AS status_cliente
FROM 
    pedidos p
LEFT JOIN 
    clientes c ON p.cliente_id = c.id
WHERE 
    p.status = 'Fechado'
GROUP BY 
    p.tenant_id, p.cliente_id, COALESCE(c.nome, p.cliente_nome, 'Cliente não identificado')
ORDER BY 
    valor_total DESC;

-- View para análise de cancelamentos
CREATE OR REPLACE VIEW vw_analise_cancelamentos AS
SELECT 
    p.tenant_id,
    DATE_TRUNC('day', p.data_pedido) AS data,
    COUNT(CASE WHEN p.status = 'Cancelado' THEN 1 END) AS pedidos_cancelados,
    COUNT(p.id) AS total_pedidos,
    ROUND(COUNT(CASE WHEN p.status = 'Cancelado' THEN 1 END)::NUMERIC / NULLIF(COUNT(p.id), 0) * 100, 2) AS taxa_cancelamento,
    SUM(CASE WHEN p.status = 'Cancelado' THEN p.valor_total ELSE 0 END) AS valor_cancelado,
    COUNT(DISTINCT ip.id) AS itens_cancelados,
    STRING_AGG(DISTINCT ip.motivo_cancelamento, ', ') AS motivos_principais
FROM 
    pedidos p
LEFT JOIN 
    itens_pedido ip ON p.id = ip.pedido_id AND ip.cancelado = TRUE
WHERE 
    p.data_pedido >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY 
    p.tenant_id, DATE_TRUNC('day', p.data_pedido)
ORDER BY 
    p.tenant_id, data DESC;

-- View para análise de cupons
CREATE OR REPLACE VIEW vw_analise_cupons AS
SELECT 
    p.tenant_id,
    c.codigo AS cupom,
    c.tipo,
    c.valor,
    COUNT(p.id) AS total_utilizacoes,
    SUM(p.subtotal) AS valor_subtotal,
    SUM(p.desconto_valor) AS valor_desconto,
    ROUND(AVG(p.desconto_valor), 2) AS desconto_medio,
    ROUND(SUM(p.desconto_valor) / NULLIF(SUM(p.subtotal), 0) * 100, 2) AS percentual_desconto,
    MIN(p.data_pedido) AS primeira_utilizacao,
    MAX(p.data_pedido) AS ultima_utilizacao,
    COUNT(DISTINCT p.cliente_id) AS clientes_unicos
FROM 
    pedidos p
JOIN 
    cupons c ON p.cupom_id = c.id
WHERE 
    p.status = 'Fechado'
GROUP BY 
    p.tenant_id, c.codigo, c.tipo, c.valor
ORDER BY 
    total_utilizacoes DESC;

-- =============================================
-- 4. VIEWS PARA CONTROLE DE ESTOQUE
-- =============================================

-- View para análise de movimentação de estoque
CREATE OR REPLACE VIEW vw_movimentacao_estoque AS
SELECT 
    p.tenant_id,
    p.id AS produto_id,
    p.codigo,
    p.nome AS produto,
    c.nome AS categoria,
    um.nome AS unidade_medida,
    p.estoque_atual,
    p.estoque_minimo,
    COALESCE(e.total_entradas, 0) AS total_entradas,
    COALESCE(e.valor_entradas, 0) AS valor_entradas,
    COALESCE(s.total_saidas, 0) AS total_saidas,
    COALESCE(s.total_saidas_manual, 0) AS total_saidas_manual,
    COALESCE(s.total_saidas_vendas, 0) AS total_saidas_vendas,
    p.preco_custo,
    p.preco_venda,
    CASE WHEN p.estoque_atual = 0 THEN NULL
         ELSE ROUND(COALESCE(s.total_saidas, 0) / p.estoque_atual, 2)
    END AS giro_estoque
FROM 
    produtos p
LEFT JOIN 
    categorias c ON p.categoria_id = c.id
LEFT JOIN 
    unidades_medida um ON p.unidade_medida_id = um.id
LEFT JOIN (
    SELECT 
        produto_id,
        SUM(quantidade) AS total_entradas,
        SUM(valor_total) AS valor_entradas
    FROM 
        entradas_estoque
    WHERE 
        data_entrada >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY 
        produto_id
) e ON p.id = e.produto_id
LEFT JOIN (
    SELECT 
        produto_id,
        SUM(quantidade) AS total_saidas,
        SUM(CASE WHEN origem = 'manual' THEN quantidade ELSE 0 END) AS total_saidas_manual,
        SUM(CASE WHEN origem = 'venda' THEN quantidade ELSE 0 END) AS total_saidas_vendas
    FROM (
        SELECT 
            produto_id,
            quantidade,
            'manual' AS origem
        FROM 
            saidas_estoque
        WHERE 
            data_saida >= CURRENT_DATE - INTERVAL '30 days'
        
        UNION ALL
        
        SELECT 
            produto_id,
            quantidade,
            'venda' AS origem
        FROM 
            itens_pedido ip
        JOIN 
            pedidos p ON ip.pedido_id = p.id
        WHERE 
            p.status = 'Fechado'
            AND ip.cancelado = FALSE
            AND p.data_pedido >= CURRENT_DATE - INTERVAL '30 days'
    ) todas_saidas
    GROUP BY 
        produto_id
) s ON p.id = s.produto_id
WHERE 
    p.controlar_estoque = TRUE
ORDER BY 
    COALESCE(s.total_saidas, 0) DESC;

-- View para análise de giro de estoque
CREATE OR REPLACE VIEW vw_giro_estoque AS
SELECT 
    p.tenant_id,
    p.id AS produto_id,
    p.codigo,
    p.nome AS produto,
    c.nome AS categoria,
    p.estoque_atual,
    p.preco_custo * p.estoque_atual AS valor_estoque,
    COALESCE(v.quantidade_vendida, 0) AS quantidade_vendida_30dias,
    COALESCE(v.quantidade_vendida, 0) * p.preco_venda AS valor_vendido_30dias,
    CASE 
        WHEN p.estoque_atual > 0 AND v.quantidade_vendida > 0 
        THEN ROUND(p.estoque_atual / (v.quantidade_vendida / 30), 1)
        ELSE NULL
    END AS dias_estoque,
    CASE 
        WHEN p.estoque_atual > 0 AND v.quantidade_vendida > 0 
        THEN ROUND((v.quantidade_vendida / 30) * 30, 1)
        ELSE 0
    END AS consumo_mensal_estimado,
    CASE 
        WHEN p.estoque_atual <= p.estoque_minimo THEN 'Abaixo do Mínimo'
        WHEN p.estoque_atual > 0 AND v.quantidade_vendida > 0 AND ROUND(p.estoque_atual / (v.quantidade_vendida / 30), 1) < 15 THEN 'Crítico'
        WHEN p.estoque_atual > 0 AND v.quantidade_vendida > 0 AND ROUND(p.estoque_atual / (v.quantidade_vendida / 30), 1) < 30 THEN 'Atenção'
        WHEN p.estoque_atual > 0 AND v.quantidade_vendida = 0 THEN 'Sem Giro'
        ELSE 'Normal'
    END AS status_estoque
FROM 
    produtos p
LEFT JOIN 
    categorias c ON p.categoria_id = c.id
LEFT JOIN (
    SELECT 
        ip.produto_id,
        SUM(ip.quantidade) AS quantidade_vendida
    FROM 
        itens_pedido ip
    JOIN 
        pedidos p ON ip.pedido_id = p.id
    WHERE 
        p.status = 'Fechado'
        AND ip.cancelado = FALSE
        AND p.data_pedido >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY 
        ip.produto_id
) v ON p.id = v.produto_id
WHERE 
    p.controlar_estoque = TRUE
ORDER BY 
    CASE 
        WHEN p.estoque_atual <= p.estoque_minimo THEN 1
        WHEN p.estoque_atual > 0 AND v.quantidade_vendida > 0 AND ROUND(p.estoque_atual / (v.quantidade_vendida / 30), 1) < 15 THEN 2
        WHEN p.estoque_atual > 0 AND v.quantidade_vendida > 0 AND ROUND(p.estoque_atual / (v.quantidade_vendida / 30), 1) < 30 THEN 3
        WHEN p.estoque_atual > 0 AND v.quantidade_vendida = 0 THEN 4
        ELSE 5
    END,
    COALESCE(v.quantidade_vendida, 0) DESC;

-- View para vencimento de produtos
CREATE OR REPLACE VIEW vw_produtos_vencimento AS
SELECT 
    p.tenant_id,
    p.id AS produto_id,
    p.codigo,
    p.nome AS produto,
    e.data_validade,
    e.lote,
    e.quantidade AS quantidade_entrada,
    e.data_entrada,
    CASE 
        WHEN e.data_validade < CURRENT_DATE THEN 'Vencido'
        WHEN e.data_validade < CURRENT_DATE + INTERVAL '30 days' THEN 'A vencer em 30 dias'
        WHEN e.data_validade < CURRENT_DATE + INTERVAL '60 days' THEN 'A vencer em 60 dias'
        WHEN e.data_validade < CURRENT_DATE + INTERVAL '90 days' THEN 'A vencer em 90 dias'
        ELSE 'Normal'
    END AS status_validade,
    CURRENT_DATE - e.data_validade AS dias_vencido,
    e.data_validade - CURRENT_DATE AS dias_para_vencer
FROM 
    produtos p
JOIN 
    entradas_estoque e ON p.id = e.produto_id
WHERE 
    e.data_validade IS NOT NULL
ORDER BY 
    CASE 
        WHEN e.data_validade < CURRENT_DATE THEN 1
        WHEN e.data_validade < CURRENT_DATE + INTERVAL '30 days' THEN 2
        WHEN e.data_validade < CURRENT_DATE + INTERVAL '60 days' THEN 3
        WHEN e.data_validade < CURRENT_DATE + INTERVAL '90 days' THEN 4
        ELSE 5
    END,
    e.data_validade;

-- =============================================
-- 5. VIEWS PARA GESTÃO DE CLIENTES
-- =============================================

-- View para análise de clientes
CREATE OR REPLACE VIEW vw_analise_clientes AS
SELECT 
    c.tenant_id,
    c.id AS cliente_id,
    c.codigo,
    c.nome,
    c.email,
    c.telefone,
    c.data_cadastro,
    c.ultima_visita,
    CURRENT_DATE - c.ultima_visita AS dias_sem_visita,
    c.pontos_fidelidade,
    COALESCE(p.total_pedidos, 0) AS total_pedidos,
    COALESCE(p.valor_total, 0) AS valor_total_gasto,
    COALESCE(p.ticket_medio, 0) AS ticket_medio,
    COALESCE(p.ultima_compra, c.ultima_visita) AS ultima_compra,
    CASE 
        WHEN c.ultima_visita >= CURRENT_DATE - INTERVAL '30 days' THEN 'Ativo'
        WHEN c.ultima_visita >= CURRENT_DATE - INTERVAL '90 days' THEN 'Regular'
        WHEN c.ultima_visita >= CURRENT_DATE - INTERVAL '180 days' THEN 'Inativo'
        ELSE 'Perdido'
    END AS status,
    COALESCE(p.principais_produtos, '') AS principais_produtos
FROM 
    clientes c
LEFT JOIN (
    SELECT 
        cliente_id,
        COUNT(p.id) AS total_pedidos,
        SUM(p.valor_total) AS valor_total,
        ROUND(AVG(p.valor_total), 2) AS ticket_medio,
        MAX(p.data_pedido) AS ultima_compra,
        STRING_AGG(DISTINCT pr.nome, ', ' ORDER BY COUNT(ip.id) DESC) FILTER (WHERE pr.nome IS NOT NULL) AS principais_produtos
    FROM 
        pedidos p
    LEFT JOIN 
        itens_pedido ip ON p.id = ip.pedido_id
    LEFT JOIN 
        produtos pr ON ip.produto_id = pr.id
    WHERE 
        p.status = 'Fechado'
        AND p.cliente_id IS NOT NULL
    GROUP BY 
        cliente_id
) p ON c.id = p.cliente_id
ORDER BY 
    COALESCE(p.valor_total, 0) DESC;

-- View para histórico de fidelidade dos clientes
CREATE OR REPLACE VIEW vw_historico_fidelidade_cliente AS
SELECT 
    hf.tenant_id,
    hf.cliente_id,
    c.nome AS cliente,
    pf.nome AS programa,
    SUM(CASE WHEN hf.tipo = 'credito' THEN hf.pontos ELSE 0 END) AS pontos_creditados,
    SUM(CASE WHEN hf.tipo = 'debito' THEN hf.pontos ELSE 0 END) AS pontos_utilizados,
    SUM(CASE WHEN hf.tipo = 'expiracao' THEN hf.pontos ELSE 0 END) AS pontos_expirados,
    c.pontos_fidelidade AS pontos_atuais,
    COUNT(DISTINCT CASE WHEN hf.tipo = 'credito' THEN hf.pedido_id END) AS pedidos_com_pontos,
    MAX(CASE WHEN hf.tipo = 'credito' THEN hf.data_registro END) AS ultimo_credito,
    MAX(CASE WHEN hf.tipo = 'debito' THEN hf.data_registro END) AS ultimo_resgate
FROM 
    historico_fidelidade hf
JOIN 
    clientes c ON hf.cliente_id = c.id
JOIN 
    programas_fidelidade pf ON hf.programa_id = pf.id
GROUP BY 
    hf.tenant_id, hf.cliente_id, c.nome, pf.nome, c.pontos_fidelidade
ORDER BY 
    pontos_atuais DESC;

-- View para aniversariantes do mês
CREATE OR REPLACE VIEW vw_aniversariantes_mes AS
SELECT 
    tenant_id,
    id AS cliente_id,
    codigo,
    nome,
    email,
    telefone,
    data_nascimento,
    EXTRACT(DAY FROM data_nascimento) AS dia_aniversario,
    EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM data_nascimento) AS aniversario_este_mes,
    CASE 
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM data_nascimento) AND
             EXTRACT(DAY FROM CURRENT_DATE) <= EXTRACT(DAY FROM data_nascimento)
        THEN EXTRACT(DAY FROM data_nascimento) - EXTRACT(DAY FROM CURRENT_DATE)
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM data_nascimento) AND
             EXTRACT(DAY FROM CURRENT_DATE) > EXTRACT(DAY FROM data_nascimento)
        THEN NULL
        ELSE NULL
    END AS dias_para_aniversario,
    ultima_visita,
    pontos_fidelidade
FROM 
    clientes
WHERE 
    data_nascimento IS NOT NULL
    AND EXTRACT(MONTH FROM CURRENT_DATE) = EXTRACT(MONTH FROM data_nascimento)
ORDER BY 
    EXTRACT(DAY FROM data_nascimento);

-- =============================================
-- 6. VIEWS PARA RECURSOS HUMANOS
-- =============================================

-- View para escala de funcionários da semana
CREATE OR REPLACE VIEW vw_escala_semanal AS
WITH dias_semana AS (
    SELECT 
        generate_series(0, 6) as dia_semana
),
horas AS (
    SELECT 
        generate_series(0, 23) as hora
)
SELECT 
    f.tenant_id,
    f.id AS funcionario_id,
    f.nome AS funcionario,
    c.nome AS cargo,
    d.dia_semana,
    CASE d.dia_semana
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Segunda'
        WHEN 2 THEN 'Terça'
        WHEN 3 THEN 'Quarta'
        WHEN 4 THEN 'Quinta'
        WHEN 5 THEN 'Sexta'
        WHEN 6 THEN 'Sábado'
    END AS dia_nome,
    h.hora,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM funcionarios_escalas fe
            WHERE fe.funcionario_id = f.id
              AND fe.dia_semana = d.dia_semana
              AND h.hora >= EXTRACT(HOUR FROM fe.hora_inicio)
              AND h.hora < EXTRACT(HOUR FROM fe.hora_fim)
              AND CURRENT_DATE BETWEEN fe.data_inicial AND COALESCE(fe.data_final, CURRENT_DATE + INTERVAL '1 year')
        ) THEN TRUE
        ELSE FALSE
    END AS trabalha,
    e.hora_inicio,
    e.hora_fim
FROM 
    funcionarios f
CROSS JOIN 
    dias_semana d
CROSS JOIN 
    horas h
LEFT JOIN 
    cargos c ON f.cargo_id = c.id
LEFT JOIN LATERAL (
    SELECT 
        fe.hora_inicio,
        fe.hora_fim
    FROM 
        funcionarios_escalas fe
    WHERE 
        fe.funcionario_id = f.id
        AND fe.dia_semana = d.dia_semana
        AND CURRENT_DATE BETWEEN fe.data_inicial AND COALESCE(fe.data_final, CURRENT_DATE + INTERVAL '1 year')
    LIMIT 1
) e ON TRUE
WHERE 
    f.ativo = TRUE
ORDER BY 
    f.tenant_id, f.nome, d.dia_semana, h.hora;

-- View para horas trabalhadas por funcionário
CREATE OR REPLACE VIEW vw_horas_trabalhadas AS
SELECT 
    f.tenant_id,
    f.id AS funcionario_id,
    f.nome AS funcionario,
    c.nome AS cargo,
    DATE_TRUNC('month', rp.data) AS mes,
    COUNT(rp.id) AS dias_trabalhados,
    SUM(rp.horas_trabalhadas) AS total_horas,
    SUM(rp.horas_extras) AS total_horas_extras,
    AVG(rp.horas_trabalhadas) AS media_horas_dia,
    MIN(rp.data) AS primeiro_dia,
    MAX(rp.data) AS ultimo_dia
FROM 
    funcionarios f
JOIN 
    registro_ponto rp ON f.id = rp.funcionario_id
LEFT JOIN 
    cargos c ON f.cargo_id = c.id
WHERE 
    rp.hora_saida IS NOT NULL
GROUP BY 
    f.tenant_id, f.id, f.nome, c.nome, DATE_TRUNC('month', rp.data)
ORDER BY 
    mes DESC, total_horas DESC;

-- View para comissões por funcionário
CREATE OR REPLACE VIEW vw_comissoes_funcionario AS
SELECT 
    c.tenant_id,
    c.funcionario_id,
    f.nome AS funcionario,
    cg.nome AS cargo,
    DATE_TRUNC('month', c.data_venda) AS mes,
    COUNT(c.id) AS total_vendas,
    SUM(c.valor_venda) AS valor_total_vendas,
    ROUND(AVG(c.percentual_comissao), 2) AS percentual_medio,
    SUM(c.valor_comissao) AS valor_total_comissao,
    ROUND(SUM(c.valor_comissao) / SUM(c.valor_venda) * 100, 2) AS percentual_efetivo,
    COUNT(CASE WHEN c.status = 'pendente' THEN 1 END) AS comissoes_pendentes,
    COUNT(CASE WHEN c.status = 'pago' THEN 1 END) AS comissoes_pagas,
    SUM(CASE WHEN c.status = 'pendente' THEN c.valor_comissao ELSE 0 END) AS valor_pendente,
    SUM(CASE WHEN c.status = 'pago' THEN c.valor_comissao ELSE 0 END) AS valor_pago
FROM 
    comissoes c
JOIN 
    funcionarios f ON c.funcionario_id = f.id
LEFT JOIN 
    cargos cg ON f.cargo_id = cg.id
GROUP BY 
    c.tenant_id, c.funcionario_id, f.nome, cg.nome, DATE_TRUNC('month', c.data_venda)
ORDER BY 
    mes DESC, valor_total_comissao DESC;

-- View para análise de férias e licenças
CREATE OR REPLACE VIEW vw_ferias_licencas AS
SELECT 
    fl.tenant_id,
    fl.funcionario_id,
    f.nome AS funcionario,
    c.nome AS cargo,
    fl.tipo,
    fl.data_inicio,
    fl.data_fim,
    fl.data_fim - fl.data_inicio + 1 AS dias_totais,
    CASE 
        WHEN CURRENT_DATE BETWEEN fl.data_inicio AND fl.data_fim THEN 'Em andamento'
        WHEN CURRENT_DATE < fl.data_inicio THEN 'Agendado'
        WHEN CURRENT_DATE > fl.data_fim THEN 'Concluído'
    END AS status_atual,
    fl.status AS status_aprovacao,
    u.nome AS aprovado_por,
    fl.data_aprovacao,
    fl.observacoes
FROM 
    ferias_licencas fl
JOIN 
    funcionarios f ON fl.funcionario_id = f.id
LEFT JOIN 
    cargos c ON f.cargo_id = c.id
LEFT JOIN 
    usuarios u ON fl.aprovado_por = u.id
ORDER BY 
    CASE 
        WHEN CURRENT_DATE BETWEEN fl.data_inicio AND fl.data_fim THEN 1
        WHEN CURRENT_DATE < fl.data_inicio THEN 2
        ELSE 3
    END,
    fl.data_inicio;

-- =============================================
-- 7. VIEWS PARA INDICADORES DE DESEMPENHO (KPIs)
-- =============================================

-- View para KPIs gerais do negócio
CREATE OR REPLACE VIEW vw_kpis_negocio AS
WITH vendas_mes_atual AS (
    SELECT 
        tenant_id,
        COUNT(id) AS num_pedidos,
        SUM(valor_total) AS valor_total,
        COUNT(DISTINCT cliente_id) AS num_clientes,
        ROUND(AVG(valor_total), 2) AS ticket_medio,
        COUNT(DISTINCT DATE(data_pedido)) AS dias_com_vendas
    FROM 
        pedidos
    WHERE 
        status = 'Fechado'
        AND DATE_TRUNC('month', data_pedido) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY 
        tenant_id
),
vendas_mes_anterior AS (
    SELECT 
        tenant_id,
        COUNT(id) AS num_pedidos,
        SUM(valor_total) AS valor_total,
        COUNT(DISTINCT cliente_id) AS num_clientes,
        ROUND(AVG(valor_total), 2) AS ticket_medio
    FROM 
        pedidos
    WHERE 
        status = 'Fechado'
        AND DATE_TRUNC('month', data_pedido) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    GROUP BY 
        tenant_id
),
financeiro_mes_atual AS (
    SELECT 
        tenant_id,
        SUM(CASE WHEN tipo = 'Entrada' THEN valor ELSE 0 END) AS total_entradas,
        SUM(CASE WHEN tipo = 'Saída' THEN valor ELSE 0 END) AS total_saidas,
        SUM(CASE WHEN tipo = 'Entrada' THEN valor ELSE -valor END) AS resultado
    FROM 
        movimentacoes_financeiras
    WHERE 
        DATE_TRUNC('month', data_movimento) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY 
        tenant_id
),
financeiro_mes_anterior AS (
    SELECT 
        tenant_id,
        SUM(CASE WHEN tipo = 'Entrada' THEN valor ELSE 0 END) AS total_entradas,
        SUM(CASE WHEN tipo = 'Saída' THEN valor ELSE 0 END) AS total_saidas,
        SUM(CASE WHEN tipo = 'Entrada' THEN valor ELSE -valor END) AS resultado
    FROM 
        movimentacoes_financeiras
    WHERE 
        DATE_TRUNC('month', data_movimento) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    GROUP BY 
        tenant_id
),
clientes_novos AS (
    SELECT 
        tenant_id,
        COUNT(id) AS num_clientes_novos
    FROM 
        clientes
    WHERE 
        DATE_TRUNC('month', data_cadastro) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY 
        tenant_id
),
produtos_sem_giro AS (
    SELECT 
        p.tenant_id,
        COUNT(p.id) AS num_produtos_sem_giro,
        SUM(p.estoque_atual * p.preco_custo) AS valor_estoque_sem_giro
    FROM 
        produtos p
    LEFT JOIN (
        SELECT 
            produto_id,
            COUNT(id) AS vendas
        FROM 
            itens_pedido ip
        JOIN 
            pedidos pe ON ip.pedido_id = pe.id
        WHERE 
            pe.status = 'Fechado'
            AND pe.data_pedido >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY 
            produto_id
    ) v ON p.id = v.produto_id
    WHERE 
        p.controlar_estoque = TRUE
        AND p.estoque_atual > 0
        AND (v.vendas IS NULL OR v.vendas = 0)
    GROUP BY 
        p.tenant_id
)
SELECT 
    t.id AS tenant_id,
    t.nome_restaurante,
    
    -- Vendas
    COALESCE(va.num_pedidos, 0) AS pedidos_mes_atual,
    COALESCE(va.valor_total, 0) AS vendas_mes_atual,
    COALESCE(va.ticket_medio, 0) AS ticket_medio_atual,
    COALESCE(va.num_clientes, 0) AS clientes_atendidos_mes,
    
    -- Comparação com mês anterior
    CASE 
        WHEN vant.valor_total > 0 THEN 
            ROUND(((va.valor_total - vant.valor_total) / vant.valor_total) * 100, 2)
        ELSE NULL
    END AS variacao_vendas_percentual,
    COALESCE(va.valor_total, 0) - COALESCE(vant.valor_total, 0) AS variacao_vendas_valor,
    
    -- Financeiro
    COALESCE(fa.total_entradas, 0) AS entradas_mes_atual,
    COALESCE(fa.total_saidas, 0) AS saidas_mes_atual,
    COALESCE(fa.resultado, 0) AS resultado_mes_atual,
    
    -- Métricas diárias
    CASE 
        WHEN EXTRACT(DAY FROM CURRENT_DATE) > 0 THEN 
            ROUND(COALESCE(va.valor_total, 0) / EXTRACT(DAY FROM CURRENT_DATE), 2)
        ELSE 0
    END AS media_vendas_dia,
    
    CASE
        WHEN va.dias_com_vendas > 0 THEN
            ROUND(COALESCE(va.valor_total, 0) / va.dias_com_vendas, 2)
        ELSE 0
    END AS media_vendas_dia_efetivo,
    
    -- Clientes
    COALESCE(cn.num_clientes_novos, 0) AS novos_clientes_mes,
    
    -- Estoque
    COALESCE(ps.num_produtos_sem_giro, 0) AS produtos_sem_giro,
    COALESCE(ps.valor_estoque_sem_giro, 0) AS valor_estoque_sem_giro,
    
    -- Data atualização
    CURRENT_TIMESTAMP AS data_atualizacao
FROM 
    tenants t
LEFT JOIN 
    vendas_mes_atual va ON t.id = va.tenant_id
LEFT JOIN 
    vendas_mes_anterior vant ON t.id = vant.tenant_id
LEFT JOIN 
    financeiro_mes_atual fa ON t.id = fa.tenant_id
LEFT JOIN 
    financeiro_mes_anterior fant ON t.id = fant.tenant_id
LEFT JOIN 
    clientes_novos cn ON t.id = cn.tenant_id
LEFT JOIN 
    produtos_sem_giro ps ON t.id = ps.tenant_id
WHERE 
    t.ativo = TRUE
ORDER BY 
    t.id;
