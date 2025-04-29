-- =============================================
-- VIEWS PARA SISTEMA SAAS MULTI-TENANT DE RESTAURANTE
-- Database: PostgreSQL
-- =============================================

SET search_path TO restaurante;

-- =============================================
-- 1. VIEWS PARA RELATÓRIOS FINANCEIROS
-- =============================================

-- View de vendas diárias
CREATE OR REPLACE VIEW vw_vendas_diarias AS
SELECT 
    p.tenant_id,
    DATE(p.data_pedido) AS data_venda,
    COUNT(*) AS quantidade_pedidos,
    SUM(CASE WHEN p.status = 'Cancelado' THEN 1 ELSE 0 END) AS pedidos_cancelados,
    SUM(CASE WHEN p.status != 'Cancelado' THEN p.valor_total ELSE 0 END) AS valor_total,
    AVG(CASE WHEN p.status != 'Cancelado' THEN p.valor_total ELSE NULL END) AS ticket_medio,
    SUM(CASE WHEN p.status != 'Cancelado' THEN p.valor_desconto ELSE 0 END) AS valor_descontos
FROM 
    pedidos p
GROUP BY 
    p.tenant_id, DATE(p.data_pedido)
ORDER BY 
    p.tenant_id, DATE(p.data_pedido) DESC;

COMMENT ON VIEW vw_vendas_diarias IS 'Resumo diário de vendas por tenant';

-- View de faturamento mensal
CREATE OR REPLACE VIEW vw_faturamento_mensal AS
SELECT 
    p.tenant_id,
    DATE_TRUNC('month', p.data_pedido)::DATE AS mes,
    COUNT(*) AS quantidade_pedidos,
    COUNT(DISTINCT CASE WHEN m.id IS NOT NULL THEN m.id END) AS mesas_atendidas,
    SUM(CASE WHEN p.status != 'Cancelado' THEN p.valor_total ELSE 0 END) AS valor_total,
    SUM(CASE WHEN p.status != 'Cancelado' THEN p.valor_subtotal ELSE 0 END) AS valor_subtotal,
    SUM(CASE WHEN p.status != 'Cancelado' THEN p.valor_desconto ELSE 0 END) AS valor_descontos,
    AVG(CASE WHEN p.status != 'Cancelado' THEN p.valor_total ELSE NULL END) AS ticket_medio
FROM 
    pedidos p
LEFT JOIN 
    mesas m ON p.mesa_id = m.id
GROUP BY 
    p.tenant_id, DATE_TRUNC('month', p.data_pedido)::DATE
ORDER BY 
    p.tenant_id, DATE_TRUNC('month', p.data_pedido)::DATE DESC;

COMMENT ON VIEW vw_faturamento_mensal IS 'Faturamento mensal por tenant';

-- View de pagamentos por forma de pagamento
CREATE OR REPLACE VIEW vw_pagamentos_forma AS
SELECT 
    pg.tenant_id,
    fp.nome AS forma_pagamento,
    DATE_TRUNC('month', pg.data_pagamento)::DATE AS mes,
    COUNT(*) AS quantidade_pagamentos,
    SUM(pg.valor) AS valor_total
FROM 
    pagamentos pg
JOIN 
    formas_pagamento fp ON pg.forma_pagamento_id = fp.id
GROUP BY 
    pg.tenant_id, fp.nome, DATE_TRUNC('month', pg.data_pagamento)::DATE
ORDER BY 
    pg.tenant_id, DATE_TRUNC('month', pg.data_pagamento)::DATE DESC, valor_total DESC;

COMMENT ON VIEW vw_pagamentos_forma IS 'Pagamentos por forma de pagamento e período';

-- View de fluxo de caixa diário
CREATE OR REPLACE VIEW vw_fluxo_caixa_diario AS
SELECT 
    mf.tenant_id,
    DATE(mf.data_movimento) AS data,
    SUM(CASE WHEN mf.tipo = 'Entrada' THEN mf.valor ELSE 0 END) AS entradas,
    SUM(CASE WHEN mf.tipo = 'Saída' THEN mf.valor ELSE 0 END) AS saidas,
    SUM(CASE WHEN mf.tipo = 'Entrada' THEN mf.valor ELSE -mf.valor END) AS saldo_dia
FROM 
    movimentacoes_financeiras mf
GROUP BY 
    mf.tenant_id, DATE(mf.data_movimento)
ORDER BY 
    mf.tenant_id, DATE(mf.data_movimento) DESC;

COMMENT ON VIEW vw_fluxo_caixa_diario IS 'Fluxo de caixa diário por tenant';

-- View de contas a pagar e receber vencidas
CREATE OR REPLACE VIEW vw_contas_vencidas AS
SELECT
    'A Pagar' AS tipo,
    cp.tenant_id,
    cp.id,
    cp.descricao,
    f.nome AS fornecedor,
    NULL AS cliente,
    cp.valor,
    cp.data_vencimento,
    CURRENT_DATE - cp.data_vencimento AS dias_atraso
FROM
    contas_pagar cp
LEFT JOIN
    fornecedores f ON cp.fornecedor_id = f.id
WHERE
    cp.status = 'Pendente'
    AND cp.data_vencimento < CURRENT_DATE

UNION ALL

SELECT
    'A Receber' AS tipo,
    cr.tenant_id,
    cr.id,
    cr.descricao,
    NULL AS fornecedor,
    cr.cliente_nome AS cliente,
    cr.valor,
    cr.data_vencimento,
    CURRENT_DATE - cr.data_vencimento AS dias_atraso
FROM
    contas_receber cr
WHERE
    cr.status = 'Pendente'
    AND cr.data_vencimento < CURRENT_DATE
ORDER BY
    tenant_id, dias_atraso DESC;

COMMENT ON VIEW vw_contas_vencidas IS 'Contas a pagar e receber vencidas por tenant';

-- View de histórico de fechamento de caixas
CREATE OR REPLACE VIEW vw_historico_caixas AS
SELECT
    c.tenant_id,
    c.id AS caixa_id,
    u.nome AS usuario,
    c.data_abertura,
    c.data_fechamento,
    c.valor_abertura,
    c.valor_fechamento,
    c.valor_sistema,
    c.diferenca,
    CASE 
        WHEN c.diferenca > 0 THEN 'Sobra'
        WHEN c.diferenca < 0 THEN 'Falta'
        ELSE 'Exato'
    END AS situacao,
    c.status
FROM
    caixas c
LEFT JOIN
    usuarios u ON c.usuario_id = u.id
ORDER BY
    c.tenant_id, c.data_abertura DESC;

COMMENT ON VIEW vw_historico_caixas IS 'Histórico de abertura e fechamento de caixas por tenant';

-- =============================================
-- 2. VIEWS PARA ANÁLISE DE VENDAS E PRODUTOS
-- =============================================

-- View de produtos mais vendidos
CREATE OR REPLACE VIEW vw_produtos_mais_vendidos AS
SELECT
    p.tenant_id,
    p.id AS produto_id,
    p.codigo,
    p.nome AS produto,
    c.nome AS categoria,
    SUM(ip.quantidade) AS quantidade_vendida,
    SUM(ip.valor_total) AS valor_total_vendido,
    COUNT(DISTINCT ip.pedido_id) AS qtd_pedidos,
    AVG(ip.preco_unitario) AS preco_medio_venda
FROM
    produtos p
JOIN
    itens_pedido ip ON p.id = ip.produto_id
JOIN
    pedidos pd ON ip.pedido_id = pd.id
LEFT JOIN
    categorias c ON p.categoria_id = c.id
WHERE
    pd.status != 'Cancelado'
GROUP BY
    p.tenant_id, p.id, p.codigo, p.nome, c.nome
ORDER BY
    p.tenant_id, quantidade_vendida DESC;

COMMENT ON VIEW vw_produtos_mais_vendidos IS 'Ranking de produtos mais vendidos por tenant';

-- View de vendas por categoria
CREATE OR REPLACE VIEW vw_vendas_por_categoria AS
SELECT
    p.tenant_id,
    c.nome AS categoria,
    COUNT(DISTINCT ip.pedido_id) AS quantidade_pedidos,
    SUM(ip.quantidade) AS quantidade_itens,
    SUM(ip.valor_total) AS valor_total,
    ROUND((SUM(ip.valor_total) / SUM(SUM(ip.valor_total)) OVER (PARTITION BY p.tenant_id)) * 100, 2) AS porcentagem_vendas
FROM
    produtos p
JOIN
    itens_pedido ip ON p.id = ip.produto_id
JOIN
    pedidos pd ON ip.pedido_id = pd.id AND pd.status != 'Cancelado'
LEFT JOIN
    categorias c ON p.categoria_id = c.id
GROUP BY
    p.tenant_id, c.nome
ORDER BY
    p.tenant_id, valor_total DESC;

COMMENT ON VIEW vw_vendas_por_categoria IS 'Vendas agrupadas por categoria de produto';

-- View de desempenho por horário
CREATE OR REPLACE VIEW vw_vendas_por_horario AS
SELECT
    tenant_id,
    EXTRACT(HOUR FROM data_pedido) AS hora_do_dia,
    COUNT(*) AS quantidade_pedidos,
    SUM(CASE WHEN status != 'Cancelado' THEN valor_total ELSE 0 END) AS valor_total,
    AVG(CASE WHEN status != 'Cancelado' THEN valor_total ELSE NULL END) AS ticket_medio
FROM
    pedidos
GROUP BY
    tenant_id, EXTRACT(HOUR FROM data_pedido)
ORDER BY
    tenant_id, hora_do_dia;

COMMENT ON VIEW vw_vendas_por_horario IS 'Análise de vendas por hora do dia';

-- View de vendas por dia da semana
CREATE OR REPLACE VIEW vw_vendas_por_dia_semana AS
SELECT
    tenant_id,
    EXTRACT(DOW FROM data_pedido) AS dia_semana,
    CASE EXTRACT(DOW FROM data_pedido)
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Segunda'
        WHEN 2 THEN 'Terça'
        WHEN 3 THEN 'Quarta'
        WHEN 4 THEN 'Quinta'
        WHEN 5 THEN 'Sexta'
        WHEN 6 THEN 'Sábado'
    END AS nome_dia,
    COUNT(*) AS quantidade_pedidos,
    SUM(CASE WHEN status != 'Cancelado' THEN valor_total ELSE 0 END) AS valor_total,
    AVG(CASE WHEN status != 'Cancelado' THEN valor_total ELSE NULL END) AS ticket_medio
FROM
    pedidos
GROUP BY
    tenant_id, dia_semana, nome_dia
ORDER BY
    tenant_id, dia_semana;

COMMENT ON VIEW vw_vendas_por_dia_semana IS 'Análise de vendas por dia da semana';

-- View de itens mais frequentemente pedidos juntos
CREATE OR REPLACE VIEW vw_itens_frequentes_juntos AS
WITH item_pairs AS (
    SELECT
        p1.tenant_id,
        ip1.pedido_id,
        ip1.produto_id AS produto1_id,
        ip2.produto_id AS produto2_id,
        pr1.nome AS produto1_nome,
        pr2.nome AS produto2_nome
    FROM
        itens_pedido ip1
    JOIN
        itens_pedido ip2 ON ip1.pedido_id = ip2.pedido_id AND ip1.produto_id < ip2.produto_id
    JOIN
        pedidos p1 ON ip1.pedido_id = p1.id AND p1.status != 'Cancelado'
    JOIN
        produtos pr1 ON ip1.produto_id = pr1.id
    JOIN
        produtos pr2 ON ip2.produto_id = pr2.id
)
SELECT
    tenant_id,
    produto1_id,
    produto2_id,
    produto1_nome,
    produto2_nome,
    COUNT(*) AS frequencia_juntos
FROM
    item_pairs
GROUP BY
    tenant_id, produto1_id, produto2_id, produto1_nome, produto2_nome
HAVING
    COUNT(*) > 5
ORDER BY
    tenant_id, frequencia_juntos DESC;

COMMENT ON VIEW vw_itens_frequentes_juntos IS 'Análise de itens frequentemente pedidos juntos';

-- =============================================
-- 3. VIEWS PARA GESTÃO DE ESTOQUE
-- =============================================

-- View de estoque crítico
CREATE OR REPLACE VIEW vw_estoque_critico AS
SELECT
    p.tenant_id,
    p.id,
    p.codigo,
    p.nome,
    c.nome AS categoria,
    p.estoque_atual,
    p.estoque_minimo,
    um.nome AS unidade_medida,
    CASE
        WHEN p.estoque_atual = 0 THEN 'Esgotado'
        WHEN p.estoque_atual <= (p.estoque_minimo * 0.5) THEN 'Crítico'
        ELSE 'Baixo'
    END AS situacao,
    (p.estoque_atual / NULLIF(p.estoque_minimo, 0)) * 100 AS percentual_estoque
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
    p.tenant_id, percentual_estoque ASC;

COMMENT ON VIEW vw_estoque_critico IS 'Produtos com estoque abaixo do mínimo';

-- View de movimentação de estoque
CREATE OR REPLACE VIEW vw_movimentacao_estoque AS
-- Entradas
SELECT
    e.tenant_id,
    p.id AS produto_id,
    p.nome AS produto,
    'Entrada' AS tipo_movimento,
    e.quantidade,
    um.nome AS unidade_medida,
    e.preco_unitario,
    e.valor_total,
    f.nome AS fornecedor,
    e.data_entrada AS data_movimento,
    e.numero_nota_fiscal AS referencia,
    u.nome AS usuario,
    e.observacao
FROM
    entradas_estoque e
JOIN
    produtos p ON e.produto_id = p.id
LEFT JOIN
    unidades_medida um ON p.unidade_medida_id = um.id
LEFT JOIN
    fornecedores f ON e.fornecedor_id = f.id
LEFT JOIN
    usuarios u ON e.usuario_id = u.id

UNION ALL

-- Saídas por consumo interno
SELECT
    s.tenant_id,
    p.id AS produto_id,
    p.nome AS produto,
    'Saída' AS tipo_movimento,
    s.quantidade,
    um.nome AS unidade_medida,
    p.preco_custo AS preco_unitario,
    p.preco_custo * s.quantidade AS valor_total,
    NULL AS fornecedor,
    s.data_saida AS data_movimento,
    s.motivo AS referencia,
    u.nome AS usuario,
    s.observacao
FROM
    saidas_estoque s
JOIN
    produtos p ON s.produto_id = p.id
LEFT JOIN
    unidades_medida um ON p.unidade_medida_id = um.id
LEFT JOIN
    usuarios u ON s.usuario_id = u.id

UNION ALL

-- Saídas por venda
SELECT
    pd.tenant_id,
    p.id AS produto_id,
    p.nome AS produto,
    'Venda' AS tipo_movimento,
    ip.quantidade,
    um.nome AS unidade_medida,
    ip.preco_unitario,
    ip.valor_total,
    NULL AS fornecedor,
    pd.data_pedido AS data_movimento,
    'Pedido #' || pd.id AS referencia,
    u.nome AS usuario,
    ip.observacao
FROM
    itens_pedido ip
JOIN
    pedidos pd ON ip.pedido_id = pd.id AND pd.status != 'Cancelado'
JOIN
    produtos p ON ip.produto_id = p.id AND p.controlar_estoque = TRUE
LEFT JOIN
    unidades_medida um ON p.unidade_medida_id = um.id
LEFT JOIN
    usuarios u ON pd.usuario_abertura = u.id
ORDER BY
    tenant_id, data_movimento DESC;

COMMENT ON VIEW vw_movimentacao_estoque IS 'Todas as movimentações de estoque (entradas, saídas e vendas)';

-- View de giro de estoque
CREATE OR REPLACE VIEW vw_giro_estoque AS
WITH vendas_mensais AS (
    SELECT
        p.tenant_id,
        p.id AS produto_id,
        DATE_TRUNC('month', pd.data_pedido)::DATE AS mes,
        SUM(ip.quantidade) AS quantidade_vendida
    FROM
        produtos p
    JOIN
        itens_pedido ip ON p.id = ip.produto_id
    JOIN
        pedidos pd ON ip.pedido_id = pd.id AND pd.status != 'Cancelado'
    WHERE
        p.controlar_estoque = TRUE
    GROUP BY
        p.tenant_id, p.id, DATE_TRUNC('month', pd.data_pedido)::DATE
)
SELECT
    p.tenant_id,
    p.id AS produto_id,
    p.nome AS produto,
    c.nome AS categoria,
    p.estoque_atual,
    um.nome AS unidade_medida,
    COALESCE(AVG(vm.quantidade_vendida), 0) AS media_vendas_mensal,
    CASE 
        WHEN COALESCE(AVG(vm.quantidade_vendida), 0) > 0 
        THEN p.estoque_atual / COALESCE(AVG(vm.quantidade_vendida), 0)
        ELSE NULL
    END AS meses_estoque_atual,
    CASE 
        WHEN COALESCE(AVG(vm.quantidade_vendida), 0) > 0 
        THEN p.estoque_minimo / COALESCE(AVG(vm.quantidade_vendida), 0)
        ELSE NULL
    END AS meses_estoque_minimo
FROM
    produtos p
LEFT JOIN
    categorias c ON p.categoria_id = c.id
LEFT JOIN
    unidades_medida um ON p.unidade_medida_id = um.id
LEFT JOIN
    vendas_mensais vm ON p.id = vm.produto_id
WHERE
    p.controlar_estoque = TRUE
GROUP BY
    p.tenant_id, p.id, p.nome, c.nome, p.estoque_atual, p.estoque_minimo, um.nome
ORDER BY
    p.tenant_id, media_vendas_mensal DESC;

COMMENT ON VIEW vw_giro_estoque IS 'Análise de giro de estoque baseado nas vendas mensais';

-- =============================================
-- 4. VIEWS PARA OPERAÇÕES DIÁRIAS
-- =============================================

-- View de mesas com status atual
CREATE OR REPLACE VIEW vw_status_mesas AS
SELECT
    m.tenant_id,
    m.id,
    m.numero,
    m.capacidade,
    m.status,
    CASE
        WHEN m.status = 'Ocupada' THEN COALESCE(p.cliente_nome, 'Cliente não identificado')
        WHEN m.status = 'Reservada' THEN COALESCE(r.cliente_nome, 'Reserva sem nome')
        ELSE NULL
    END AS cliente,
    CASE
        WHEN m.status = 'Ocupada' THEN p.id
        ELSE NULL
    END AS pedido_id,
    CASE
        WHEN m.status = 'Ocupada' THEN p.data_pedido
        WHEN m.status = 'Reservada' THEN r.data_reserva
        ELSE NULL
    END AS data_inicio,
    CASE
        WHEN m.status = 'Ocupada' THEN COALESCE(p.valor_total, 0)
        ELSE NULL
    END AS valor_consumo,
    CASE
        WHEN m.status = 'Ocupada' THEN 
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.data_pedido))/60
        ELSE NULL
    END AS tempo_ocupacao_minutos
FROM
    mesas m
LEFT JOIN (
    SELECT DISTINCT ON (mesa_id) *
    FROM pedidos
    WHERE status NOT IN ('Fechado', 'Cancelado')
    ORDER BY mesa_id, data_pedido DESC
) p ON m.id = p.mesa_id
LEFT JOIN (
    SELECT DISTINCT ON (mesa_id) *
    FROM reservas
    WHERE status = 'Confirmada' AND data_reserva = CURRENT_DATE
    ORDER BY mesa_id, hora_inicio
) r ON m.id = r.mesa_id AND m.status = 'Reservada'
WHERE
    m.ativa = TRUE
ORDER BY
    m.tenant_id, m.numero;

COMMENT ON VIEW vw_status_mesas IS 'Status atual de todas as mesas ativas';

-- View de pedidos em andamento
CREATE OR REPLACE VIEW vw_pedidos_andamento AS
SELECT
    p.tenant_id,
    p.id,
    p.status,
    m.numero AS mesa,
    p.cliente_nome,
    p.data_pedido,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - p.data_pedido))/60 AS tempo_aberto_minutos,
    p.valor_subtotal,
    p.valor_desconto,
    p.valor_total,
    u.nome AS atendente,
    COUNT(ip.id) AS qtd_itens,
    COUNT(CASE WHEN ip.status = 'Pendente' THEN 1 END) AS itens_pendentes,
    COUNT(CASE WHEN ip.status = 'Em Preparo' THEN 1 END) AS itens_preparo,
    COUNT(CASE WHEN ip.status = 'Pronto' THEN 1 END) AS itens_prontos,
    COUNT(CASE WHEN ip.status = 'Entregue' THEN 1 END) AS itens_entregues
FROM
    pedidos p
LEFT JOIN
    mesas m ON p.mesa_id = m.id
LEFT JOIN
    usuarios u ON p.usuario_abertura = u.id
LEFT JOIN
    itens_pedido ip ON p.id = ip.pedido_id
WHERE
    p.status IN ('Aberto', 'Em Preparo', 'Entregue')
GROUP BY
    p.tenant_id, p.id, p.status, m.numero, p.cliente_nome, p.data_pedido, p.valor_subtotal, 
    p.valor_desconto, p.valor_total, u.nome
ORDER BY
    p.tenant_id, p.data_pedido;

COMMENT ON VIEW vw_pedidos_andamento IS 'Pedidos em andamento com detalhes de status dos itens';

-- View de itens em preparo
CREATE OR REPLACE VIEW vw_itens_preparo AS
SELECT
    pd.tenant_id,
    ip.id,
    pd.id AS pedido_id,
    m.numero AS mesa,
    pd.cliente_nome,
    pr.nome AS produto,
    c.nome AS categoria,
    ip.quantidade,
    ip.status,
    ip.observacao,
    ip.data_pedido,
    ip.data_preparo,
    CASE
        WHEN ip.status = 'Pendente' THEN 
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ip.data_pedido))/60
        WHEN ip.status = 'Em Preparo' THEN 
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ip.data_preparo))/60
        ELSE NULL
    END AS tempo_espera_minutos
FROM
    itens_pedido ip
JOIN
    pedidos pd ON ip.pedido_id = pd.id
JOIN
    produtos pr ON ip.produto_id = pr.id
LEFT JOIN
    categorias c ON pr.categoria_id = c.id
LEFT JOIN
    mesas m ON pd.mesa_id = m.id
WHERE
    pd.status IN ('Aberto', 'Em Preparo')
    AND ip.status IN ('Pendente', 'Em Preparo', 'Pronto')
ORDER BY
    pd.tenant_id, 
    CASE ip.status
        WHEN 'Pronto' THEN 1
        WHEN 'Em Preparo' THEN 2
        WHEN 'Pendente' THEN 3
        ELSE 4
    END,
    ip.data_pedido;

COMMENT ON VIEW vw_itens_preparo IS 'Itens pendentes, em preparo ou prontos para entrega';

-- View de reservas do dia
CREATE OR REPLACE VIEW vw_reservas_dia AS
SELECT
    r.tenant_id,
    r.id,
    r.cliente_nome,
    r.cliente_telefone,
    r.cliente_email,
    m.numero AS mesa,
    m.capacidade,
    r.num_pessoas,
    r.data_reserva,
    r.hora_inicio,
    r.hora_fim,
    r.status,
    r.observacao,
    u.nome AS responsavel
FROM
    reservas r
LEFT JOIN
    mesas m ON r.mesa_id = m.id
LEFT JOIN
    usuarios u ON r.usuario_id = u.id
WHERE
    r.data_reserva = CURRENT_DATE
    AND r.status = 'Confirmada'
ORDER BY
    r.tenant_id, r.hora_inicio;

COMMENT ON VIEW vw_reservas_dia IS 'Reservas confirmadas para o dia atual';

-- View de cardápio vigente
CREATE OR REPLACE VIEW vw_cardapio_vigente AS
WITH cardapios_vigentes AS (
    SELECT 
        c.id,
        c.tenant_id
    FROM 
        cardapios c
    WHERE 
        c.ativo = TRUE
        AND (c.data_inicio IS NULL OR c.data_inicio <= CURRENT_DATE)
        AND (c.data_fim IS NULL OR c.data_fim >= CURRENT_DATE)
        AND (
            c.dias_semana IS NULL 
            OR c.dias_semana LIKE '%' || EXTRACT(DOW FROM CURRENT_DATE)::TEXT || '%'
        )
)
SELECT
    p.tenant_id,
    p.id AS produto_id,
    p.codigo,
    p.nome AS produto,
    cat.nome AS categoria,
    COALESCE(cp.preco_especial, p.preco_venda) AS preco_venda,
    um.nome AS unidade_medida,
    p.descricao,
    cp.destaque,
    cp.disponivel AND p.disponivel_venda AS disponivel,
    p.imagem
FROM
    produtos p
JOIN
    cardapios_vigentes cv ON p.tenant_id = cv.tenant_id
JOIN
    cardapios_produtos cp ON cv.id = cp.cardapio_id AND p.id = cp.produto_id
LEFT JOIN
    categorias cat ON p.categoria_id = cat.id
LEFT JOIN
    unidades_medida um ON p.unidade_medida_id = um.id
WHERE
    p.disponivel_venda = TRUE
    AND cp.disponivel = TRUE
ORDER BY
    p.tenant_id, cp.destaque DESC, cat.nome, p.nome;

COMMENT ON VIEW vw_cardapio_vigente IS 'Produtos disponíveis no cardápio atual para cada tenant';

-- =============================================
-- 5. VIEWS PARA ADMINISTRAÇÃO DO SISTEMA
-- =============================================

-- View de usuários ativos por tenant
CREATE OR REPLACE VIEW vw_usuarios_sistema AS
SELECT
    u.tenant_id,
    u.id,
    u.nome,
    u.email,
    u.telefone,
    u.ultimo_acesso,
    u.ativo,
    STRING_AGG(p.nome, ', ') AS perfis,
    COUNT(DISTINCT la.id) FILTER (WHERE la.data_hora >= CURRENT_DATE - INTERVAL '30 days') AS logins_30_dias,
    MAX(la.data_hora) AS ultimo_login,
    t.nome_restaurante
FROM
    usuarios u
LEFT JOIN
    usuarios_perfis up ON u.id = up.usuario_id
LEFT JOIN
    perfis p ON up.perfil_id = p.id
LEFT JOIN
    logs_acesso la ON u.id = la.usuario_id AND la.acao = 'LOGIN' AND la.sucesso = TRUE
JOIN
    tenants t ON u.tenant_id = t.id
GROUP BY
    u.tenant_id, u.id, u.nome, u.email, u.telefone, u.ultimo_acesso, u.ativo, t.nome_restaurante
ORDER BY
    t.nome_restaurante, u.nome;

COMMENT ON VIEW vw_usuarios_sistema IS 'Usuários do sistema com seus perfis e estatísticas de acesso';

-- View de saúde do sistema por tenant
CREATE OR REPLACE VIEW vw_saude_sistema AS
SELECT
    t.id AS tenant_id,
    t.nome_restaurante,
    t.ativo,
    (SELECT COUNT(*) FROM usuarios u WHERE u.tenant_id = t.id AND u.ativo = TRUE) AS usuarios_ativos,
    (SELECT COUNT(*) FROM produtos p WHERE p.tenant_id = t.id) AS produtos_cadastrados,
    (SELECT COUNT(*) FROM mesas m WHERE m.tenant_id = t.id AND m.ativa = TRUE) AS mesas_ativas,
    (SELECT COUNT(*) FROM pedidos p WHERE p.tenant_id = t.id AND p.data_pedido >= CURRENT_DATE - INTERVAL '30 days') AS pedidos_30_dias,
    (SELECT COUNT(*) FROM logs_sistema ls WHERE ls.tenant_id = t.id AND ls.nivel IN ('ERROR', 'CRITICAL') AND ls.data_hora >= CURRENT_DATE - INTERVAL '7 days') AS erros_7_dias,
    (SELECT MAX(data_hora) FROM logs_acesso la JOIN usuarios u ON la.usuario_id = u.id WHERE u.tenant_id = t.id) AS ultimo_acesso
FROM
    tenants t
ORDER BY
    t.ativo DESC, t.nome_restaurante;

COMMENT ON VIEW vw_saude_sistema IS 'Visão geral da saúde do sistema por tenant';

-- View de logs de erro do sistema
CREATE OR REPLACE VIEW vw_logs_erro AS
SELECT
    ls.tenant_id,
    t.nome_restaurante,
    ls.id,
    ls.nivel,
    ls.origem,
    ls.mensagem,
    ls.stack_trace,
    ls.ip_origem,
    u.nome AS usuario,
    ls.data_hora
FROM
    logs_sistema ls
LEFT JOIN
    tenants t ON ls.tenant_id = t.id
LEFT JOIN
    usuarios u ON ls.usuario_id = u.id
WHERE
    ls.nivel IN ('ERROR', 'CRITICAL')
ORDER BY
    ls.data_hora DESC;

COMMENT ON VIEW vw_logs_erro IS 'Logs de erro do sistema para todos os tenants';

-- View de atividade de usuários
CREATE OR REPLACE VIEW vw_atividade_usuarios AS
SELECT
    la.tenant_id,
    t.nome_restaurante,
    u.nome AS usuario,
    u.email,
    la.acao,
    la.sucesso,
    la.ip_origem,
    la.user_agent,
    la.data_hora,
    la.detalhes
FROM
    logs_acesso la
JOIN
    tenants t ON la.tenant_id = t.id
LEFT JOIN
    usuarios u ON la.usuario_id = u.id
ORDER BY
    la.data_hora DESC;

COMMENT ON VIEW vw_atividade_usuarios IS 'Registro de atividades de login e acesso dos usuários';

-- View de estatísticas de desempenho por tenant
CREATE OR REPLACE VIEW vw_estatisticas_tenant AS
SELECT
    t.id AS tenant_id,
    t.nome_restaurante,
    t.plano,
    t.data_criacao,
    
    -- Usuários
    (SELECT COUNT(*) FROM usuarios u WHERE u.tenant_id = t.id AND u.ativo = TRUE) AS usuarios_ativos,
    
    -- Produtos e estoque
    (SELECT COUNT(*) FROM produtos p WHERE p.tenant_id = t.id) AS produtos_cadastrados,
    (SELECT COUNT(*) FROM produtos p WHERE p.tenant_id = t.id AND p.controlar_estoque = TRUE AND p.estoque_atual <= p.estoque_minimo) AS produtos_estoque_baixo,
    
    -- Mesas
    (SELECT COUNT(*) FROM mesas m WHERE m.tenant_id = t.id AND m.ativa = TRUE) AS mesas_cadastradas,
    (SELECT COUNT(*) FROM mesas m WHERE m.tenant_id = t.id AND m.status = 'Ocupada') AS mesas_ocupadas,
    
    -- Pedidos
    (SELECT COUNT(*) FROM pedidos p WHERE p.tenant_id = t.id AND p.status IN ('Aberto', 'Em Preparo')) AS pedidos_abertos,
    (SELECT COUNT(*) FROM pedidos p WHERE p.tenant_id = t.id AND p.data_pedido >= DATE_TRUNC('month', CURRENT_DATE)) AS pedidos_mes_atual,
    
    -- Financeiro
    (SELECT COALESCE(SUM(p.valor_total), 0) FROM pedidos p WHERE p.tenant_id = t.id AND p.status != 'Cancelado' AND p.data_pedido >= DATE_TRUNC('month', CURRENT_DATE)) AS faturamento_mes_atual,
    (SELECT COALESCE(SUM(p.valor_total), 0) FROM pedidos p WHERE p.tenant_id = t.id AND p.status != 'Cancelado' AND p.data_pedido >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND p.data_pedido < DATE_TRUNC('month', CURRENT_DATE)) AS faturamento_mes_anterior,
    
    -- Acesso
    (SELECT COUNT(*) FROM logs_acesso la WHERE la.tenant_id = t.id AND la.data_hora >= CURRENT_DATE - INTERVAL '30 days') AS logins_30_dias,
    (SELECT MAX(la.data_hora) FROM logs_acesso la WHERE la.tenant_id = t.id) AS ultimo_acesso
FROM
    tenants t
ORDER BY
    t.plano, t.nome_restaurante;

COMMENT ON VIEW vw_estatisticas_tenant IS 'Estatísticas de desempenho e uso para cada tenant';
