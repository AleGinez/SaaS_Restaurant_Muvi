------------------------------------------
-- 7. INDICADORES CONSOLIDADOS (DASHBOARD)
------------------------------------------

-- View de indicadores para dashboard
CREATE OR REPLACE VIEW vw_dashboard AS
SELECT 
    -- Indicadores diários
    (SELECT COUNT(*) FROM pedidos WHERE DATE(data_pedido) = CURRENT_DATE) AS pedidos_hoje,
    (SELECT COALESCE(SUM(valor_total), 0) FROM pedidos WHERE DATE(data_pedido) = CURRENT_DATE AND status = 'Fechado') AS faturamento_hoje,
    (SELECT COUNT(*) FROM mesas WHERE status <> 'Livre' AND ativa = true) AS mesas_ocupadas_agora,
    (SELECT COUNT(*) FROM mesas WHERE ativa = true) AS total_mesas,
    (SELECT COUNT(*) FROM reservas WHERE data_reserva = CURRENT_DATE AND status = 'Confirmada') AS reservas_hoje,
    
    -- Indicadores de estoque
    (SELECT COUNT(*) FROM produtos WHERE controlado_estoque = true AND estoque_atual <= estoque_minimo) AS produtos_estoque_baixo,
    
    -- Indicadores financeiros
    (SELECT COALESCE(SUM(valor), 0) FROM contas_pagar WHERE status = 'Pendente' AND data_vencimento <= CURRENT_DATE + INTERVAL '7 days') AS contas_pagar_proximos_7dias,
    (SELECT COALESCE(SUM(valor), 0) FROM contas_receber WHERE status = 'Pendente' AND data_vencimento <= CURRENT_DATE + INTERVAL '7 days') AS contas_receber_proximos_7dias,
    
    -- Comparativo com dia anterior
    (SELECT COALESCE(SUM(valor_total), 0) FROM pedidos WHERE DATE(data_pedido) = CURRENT_DATE - INTERVAL '1 day' AND status = 'Fechado') AS faturamento_ontem,
    
    -- Comparativo com semana anterior
    (SELECT COALESCE(SUM(valor_total), 0) FROM pedidos 
     WHERE DATE(data_pedido) BETWEEN DATE_TRUNC('week', CURRENT_DATE) AND CURRENT_DATE 
     AND status = 'Fechado') AS faturamento_semana_atual,
    (SELECT COALESCE(SUM(valor_total), 0) FROM pedidos 
     WHERE DATE(data_pedido) BETWEEN DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 days') AND DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 day'
     AND status = 'Fechado') AS faturamento_semana_anterior,
     
    -- Comparativo com mês anterior
    (SELECT COALESCE(SUM(valor_total), 0) FROM pedidos 
     WHERE DATE(data_pedido) BETWEEN DATE_TRUNC('month', CURRENT_DATE) AND CURRENT_DATE 
     AND status = 'Fechado') AS faturamento_mes_atual,
    (SELECT COALESCE(SUM(valor_total), 0) FROM pedidos 
     WHERE DATE(data_pedido) BETWEEN DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day'
     AND status = 'Fechado') AS faturamento_mes_anterior,
     
    -- Ticket médio atual
    (SELECT COALESCE(ROUND(AVG(valor_total), 2), 0) FROM pedidos 
     WHERE DATE(data_pedido) BETWEEN DATE_TRUNC('month', CURRENT_DATE) AND CURRENT_DATE 
     AND status = 'Fechado') AS ticket_medio_atual,
     
    -- Tempo médio de atendimento
    (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (data_fechamento - data_pedido)) / 60), 2), 0) 
     FROM pedidos WHERE DATE(data_pedido) = CURRENT_DATE AND status = 'Fechado') AS tempo_medio_atendimento_hoje_min,
     
    -- Funcionários ativos
    (SELECT COUNT(*) FROM funcionarios WHERE ativo = true) AS funcionarios_ativos,
    
    -- Funcionários trabalhando hoje
    (SELECT COUNT(*) FROM registro_horas WHERE data = CURRENT_DATE AND hora_saida IS NULL) AS funcionarios_trabalhando_agora;

COMMENT ON VIEW vw_dashboard IS 'Indicadores consolidados para dashboard gerencial';

-- View de tendências de vendas (comparativo de períodos)
CREATE OR REPLACE VIEW vw_tendencias_vendas AS
WITH dados_diarios AS (
    SELECT 
        DATE(data_pedido) AS data,
        COUNT(*) AS qtd_pedidos,
        COALESCE(SUM(valor_total), 0) AS faturamento
    FROM pedidos
    WHERE status = 'Fechado'
    AND data_pedido >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(data_pedido)
),
dados_semana_atual AS (
    SELECT 
        EXTRACT(DOW FROM data) AS dia_semana,
        AVG(qtd_pedidos) AS media_pedidos,
        AVG(faturamento) AS media_faturamento
    FROM dados_diarios
    WHERE data BETWEEN DATE_TRUNC('week', CURRENT_DATE) AND CURRENT_DATE
    GROUP BY EXTRACT(DOW FROM data)
),
dados_semana_anterior AS (
    SELECT 
        EXTRACT(DOW FROM data) AS dia_semana,
        AVG(qtd_pedidos) AS media_pedidos,
        AVG(faturamento) AS media_faturamento
    FROM dados_diarios
    WHERE data BETWEEN DATE_TRUNC('week', CURRENT_DATE - INTERVAL '7 days') AND DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 day'
    GROUP BY EXTRACT(DOW FROM data)
)
SELECT 
    sa.dia_semana,
    CASE sa.dia_semana
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Segunda-feira'
        WHEN 2 THEN 'Terça-feira'
        WHEN 3 THEN 'Quarta-feira'
        WHEN 4 THEN 'Quinta-feira'
        WHEN 5 THEN 'Sexta-feira'
        WHEN 6 THEN 'Sábado'
    END AS dia_semana_nome,
    COALESCE(sa.media_pedidos, 0) AS media_pedidos_semana_atual,
    COALESCE(sa.media_faturamento, 0) AS media_faturamento_semana_atual,
    COALESCE(ant.media_pedidos, 0) AS media_pedidos_semana_anterior,
    COALESCE(ant.media_faturamento, 0) AS media_faturamento_semana_anterior,
    CASE 
        WHEN COALESCE(ant.media_pedidos, 0) = 0 THEN NULL
        ELSE ROUND((COALESCE(sa.media_pedidos, 0) - COALESCE(ant.media_pedidos, 0)) / COALESCE(ant.media_pedidos, 1) * 100, 2)
    END AS variacao_pedidos_percentual,
    CASE 
        WHEN COALESCE(ant.media_faturamento, 0) = 0 THEN NULL
        ELSE ROUND((COALESCE(sa.media_faturamento, 0) - COALESCE(ant.media_faturamento, 0)) / COALESCE(ant.media_faturamento, 1) * 100, 2)
    END AS variacao_faturamento_percentual
FROM dados_semana_atual sa
FULL OUTER JOIN dados_semana_anterior ant ON sa.dia_semana = ant.dia_semana
ORDER BY sa.dia_semana;

COMMENT ON VIEW vw_tendencias_vendas IS 'Análise comparativa de tendências de vendas entre períodos';

------------------------------------------
-- 8. INDICADORES DE ANÁLISE DE CLIENTE
------------------------------------------

-- View de frequência de clientes (por reservas)
CREATE OR REPLACE VIEW vw_frequencia_clientes_reservas AS
WITH clientes_reservas AS (
    SELECT 
        cliente_nome,
        cliente_telefone,
        COUNT(*) AS total_reservas,
        MIN(data_reserva) AS primeira_reserva,
        MAX(data_reserva) AS ultima_reserva,
        AVG(num_pessoas) AS media_pessoas
    FROM reservas
    WHERE status <> 'Cancelada'
    GROUP BY cliente_nome, cliente_telefone
)
SELECT 
    cliente_nome,
    cliente_telefone,
    total_reservas,
    primeira_reserva,
    ultima_reserva,
    CURRENT_DATE - ultima_reserva AS dias_desde_ultima_reserva,
    ROUND(media_pessoas, 1) AS media_pessoas
FROM clientes_reservas
ORDER BY total_reservas DESC, ultima_reserva DESC;

COMMENT ON VIEW vw_frequencia_clientes_reservas IS 'Análise de frequência de clientes com base nas reservas realizadas';

-- View de análise de consumo (quando pedido registra cliente)
CREATE OR REPLACE VIEW vw_analise_consumo_clientes AS
SELECT 
    p.cliente_nome,
    COUNT(p.id) AS total_pedidos,
    SUM(p.valor_total) AS valor_total_gasto,
    ROUND(AVG(p.valor_total), 2) AS ticket_medio,
    MIN(p.data_pedido) AS primeiro_pedido,
    MAX(p.data_pedido) AS ultimo_pedido,
    CURRENT_DATE - MAX(p.data_pedido)::date AS dias_desde_ultimo_pedido,
    ROUND(SUM(p.valor_total) / NULLIF(COUNT(p.id), 0), 2) AS valor_medio_pedido
FROM pedidos p
WHERE p.cliente_nome IS NOT NULL AND p.status = 'Fechado'
GROUP BY p.cliente_nome
ORDER BY valor_total_gasto DESC;

COMMENT ON VIEW vw_analise_consumo_clientes IS 'Análise de consumo de clientes com base nos pedidos registrados';

-- View de produtos mais consumidos por cliente
CREATE OR REPLACE VIEW vw_produtos_preferidos_clientes AS
SELECT 
    p.cliente_nome,
    pr.nome AS produto,
    c.nome AS categoria,
    COUNT(*) AS vezes_pedido,
    SUM(ip.quantidade) AS quantidade_total,
    ROUND(AVG(ip.preco_unitario), 2) AS preco_medio,
    SUM(ip.valor_total) AS valor_total_gasto
FROM pedidos p
JOIN itens_pedido ip ON p.id = ip.pedido_id
JOIN produtos pr ON ip.produto_id = pr.id
JOIN categorias c ON pr.categoria_id = c.id
WHERE p.cliente_nome IS NOT NULL AND p.status = 'Fechado'
GROUP BY p.cliente_nome, pr.nome, c.nome
ORDER BY p.cliente_nome, vezes_pedido DESC;

COMMENT ON VIEW vw_produtos_preferidos_clientes IS 'Análise dos produtos mais consumidos por cada cliente';

------------------------------------------
-- 9. INDICADORES DE SAZONALIDADE
------------------------------------------

-- View de vendas por período do dia
CREATE OR REPLACE VIEW vw_vendas_periodo_dia AS
SELECT 
    CASE 
        WHEN EXTRACT(HOUR FROM data_pedido) BETWEEN 6 AND 11 THEN 'Manhã'
        WHEN EXTRACT(HOUR FROM data_pedido) BETWEEN 12 AND 15 THEN 'Almoço'
        WHEN EXTRACT(HOUR FROM data_pedido) BETWEEN 16 AND 18 THEN 'Tarde'
        WHEN EXTRACT(HOUR FROM data_pedido) BETWEEN 19 AND 22 THEN 'Jantar'
        ELSE 'Noite/Madrugada'
    END AS periodo,
    COUNT(*) AS qtd_pedidos,
    SUM(valor_total) AS faturamento_total,
    ROUND(AVG(valor_total), 2) AS ticket_medio
FROM pedidos
WHERE status = 'Fechado'
GROUP BY periodo
ORDER BY CASE 
    WHEN periodo = 'Manhã' THEN 1
    WHEN periodo = 'Almoço' THEN 2
    WHEN periodo = 'Tarde' THEN 3
    WHEN periodo = 'Jantar' THEN 4
    ELSE 5
END;

COMMENT ON VIEW vw_vendas_periodo_dia IS 'Análise de vendas por período do dia (manhã, almoço, tarde, jantar, noite)';

-- View de vendas por época do ano
CREATE OR REPLACE VIEW vw_vendas_epoca_ano AS
SELECT 
    EXTRACT(YEAR FROM data_pedido) AS ano,
    EXTRACT(MONTH FROM data_pedido) AS mes,
    TO_CHAR(data_pedido, 'Month') AS nome_mes,
    COUNT(*) AS qtd_pedidos,
    SUM(valor_total) AS faturamento_total,
    ROUND(AVG(valor_total), 2) AS ticket_medio,
    CASE 
        WHEN EXTRACT(MONTH FROM data_pedido) IN (12, 1, 2) THEN 'Verão'
        WHEN EXTRACT(MONTH FROM data_pedido) IN (3, 4, 5) THEN 'Outono'
        WHEN EXTRACT(MONTH FROM data_pedido) IN (6, 7, 8) THEN 'Inverno'
        WHEN EXTRACT(MONTH FROM data_pedido) IN (9, 10, 11) THEN 'Primavera'
    END AS estacao
FROM pedidos
WHERE status = 'Fechado'
GROUP BY EXTRACT(YEAR FROM data_pedido), EXTRACT(MONTH FROM data_pedido), TO_CHAR(data_pedido, 'Month')
ORDER BY EXTRACT(YEAR FROM data_pedido) DESC, EXTRACT(MONTH FROM data_pedido);

COMMENT ON VIEW vw_vendas_epoca_ano IS 'Análise de vendas por época do ano (mês e estação)';

-- View de consumo por clima (baseado na estação)
CREATE OR REPLACE VIEW vw_consumo_por_clima AS
WITH estacoes AS (
    SELECT 
        p.id AS pedido_id,
        CASE 
            WHEN EXTRACT(MONTH FROM p.data_pedido) IN (12, 1, 2) THEN 'Verão'
            WHEN EXTRACT(MONTH FROM p.data_pedido) IN (3, 4, 5) THEN 'Outono'
            WHEN EXTRACT(MONTH FROM p.data_pedido) IN (6, 7, 8) THEN 'Inverno'
            WHEN EXTRACT(MONTH FROM p.data_pedido) IN (9, 10, 11) THEN 'Primavera'
        END AS estacao
    FROM pedidos p
    WHERE p.status = 'Fechado'
)
SELECT 
    e.estacao,
    c.nome AS categoria,
    COUNT(DISTINCT ip.pedido_id) AS qtd_pedidos,
    SUM(ip.quantidade) AS quantidade_vendida,
    ROUND(AVG(ip.valor_total), 2) AS valor_medio,
    SUM(ip.valor_total) AS valor_total
FROM estacoes e
JOIN itens_pedido ip ON e.pedido_id = ip.pedido_id
JOIN produtos p ON ip.produto_id = p.id
JOIN categorias c ON p.categoria_id = c.id
GROUP BY e.estacao, c.nome
ORDER BY e.estacao, valor_total DESC;

COMMENT ON VIEW vw_consumo_por_clima IS 'Análise do consumo por categoria de produto relacionado às estações do ano';

------------------------------------------
-- 10. INDICADORES DE EFICIÊNCIA
------------------------------------------

-- View de eficiência operacional da cozinha
CREATE OR REPLACE VIEW vw_eficiencia_cozinha AS
WITH dados_preparo AS (
    SELECT 
        p.id AS produto_id,
        p.nome AS produto,
        c.nome AS categoria,
        ip.data_pedido,
        ip.data_preparo,
        ip.data_entrega,
        EXTRACT(EPOCH FROM (ip.data_preparo - ip.data_pedido)) / 60 AS tempo_preparo_min,
        EXTRACT(EPOCH FROM (ip.data_entrega - ip.data_preparo)) / 60 AS tempo_entrega_min,
        EXTRACT(EPOCH FROM (ip.data_entrega - ip.data_pedido)) / 60 AS tempo_total_min
    FROM itens_pedido ip
    JOIN produtos p ON ip.produto_id = p.id
    JOIN categorias c ON p.categoria_id = c.id
    WHERE ip.data_preparo IS NOT NULL AND ip.data_entrega IS NOT NULL
)
SELECT 
    categoria,
    COUNT(*) AS total_pedidos,
    ROUND(AVG(tempo_preparo_min), 2) AS tempo_medio_preparo_min,
    ROUND(MIN(tempo_preparo_min), 2) AS tempo_minimo_preparo_min,
    ROUND(MAX(tempo_preparo_min), 2) AS tempo_maximo_preparo_min,
    ROUND(AVG(tempo_entrega_min), 2) AS tempo_medio_entrega_min,
    ROUND(AVG(tempo_total_min), 2) AS tempo_medio_total_min,
    ROUND(STDDEV(tempo_preparo_min), 2) AS desvio_padrao_preparo
FROM dados_preparo
GROUP BY categoria
ORDER BY tempo_medio_preparo_min DESC;

COMMENT ON VIEW vw_eficiencia_cozinha IS 'Análise da eficiência operacional da cozinha, com tempos de preparo e entrega';

-- View de eficiência por hora do dia
CREATE OR REPLACE VIEW vw_eficiencia_hora_dia AS
SELECT 
    EXTRACT(HOUR FROM ip.data_pedido) AS hora,
    COUNT(*) AS qtd_itens,
    ROUND(AVG(EXTRACT(EPOCH FROM (ip.data_preparo - ip.data_pedido)) / 60), 2) AS tempo_medio_preparo_min,
    ROUND(AVG(EXTRACT(EPOCH FROM (ip.data_entrega - ip.data_preparo)) / 60), 2) AS tempo_medio_entrega_min,
    ROUND(AVG(EXTRACT(EPOCH FROM (ip.data_entrega - ip.data_pedido)) / 60), 2) AS tempo_medio_total_min
FROM itens_pedido ip
WHERE ip.data_preparo IS NOT NULL AND ip.data_entrega IS NOT NULL
GROUP BY EXTRACT(HOUR FROM ip.data_pedido)
ORDER BY EXTRACT(HOUR FROM ip.data_pedido);

COMMENT ON VIEW vw_eficiencia_hora_dia IS 'Análise da eficiência operacional por hora do dia';

-- View de rotatividade de mesas
CREATE OR REPLACE VIEW vw_rotatividade_mesas AS
SELECT 
    m.numero AS mesa,
    COUNT(p.id) AS qtd_pedidos,
    ROUND(AVG(EXTRACT(EPOCH FROM (p.data_fechamento - p.data_pedido)) / 3600), 2) AS tempo_medio_ocupacao_horas,
    ROUND(AVG(p.valor_total), 2) AS valor_medio_pedido,
    SUM(p.valor_total) AS faturamento_total,
    ROUND(SUM(p.valor_total) / NULLIF(SUM(EXTRACT(EPOCH FROM (p.data_fechamento - p.data_pedido)) / 3600), 0), 2) AS faturamento_por_hora,
    CASE 
        WHEN AVG(EXTRACT(EPOCH FROM (p.data_fechamento - p.data_pedido)) / 3600) > 0 THEN
            ROUND(8 / NULLIF(AVG(EXTRACT(EPOCH FROM (p.data_fechamento - p.data_pedido)) / 3600), 0), 1)
        ELSE 0
    END AS rotatividade_potencial_dia
FROM pedidos p
JOIN mesas m ON p.mesa_id = m.id
WHERE p.status = 'Fechado' AND p.data_fechamento IS NOT NULL
GROUP BY m.numero
ORDER BY faturamento_por_hora DESC;

COMMENT ON VIEW vw_rotatividade_mesas IS 'Análise da rotatividade das mesas, com tempo médio de ocupação e faturamento por hora';

------------------------------------------
-- 11. INDICADORES PERSONALIZADOS PARA RESTAURANTE PESQUEIRO
------------------------------------------

-- View de vendas por tipo de peixe
CREATE OR REPLACE VIEW vw_vendas_por_tipo_peixe AS
SELECT 
    p.id AS produto_id,
    p.nome AS peixe,
    SUM(ip.quantidade) AS quantidade_vendida,
    ROUND(AVG(ip.preco_unitario), 2) AS preco_medio,
    SUM(ip.valor_total) AS valor_total,
    COUNT(DISTINCT ip.pedido_id) AS qtd_pedidos,
    ROUND(SUM(ip.valor_total) / NULLIF(COUNT(DISTINCT ip.pedido_id), 0), 2) AS valor_medio_por_pedido
FROM itens_pedido ip
JOIN produtos p ON ip.produto_id = p.id
JOIN categorias c ON p.categoria_id = c.id
JOIN pedidos pd ON ip.pedido_id = pd.id
WHERE c.nome = 'Peixes' AND pd.status = 'Fechado'
GROUP BY p.id, p.nome
ORDER BY quantidade_vendida DESC;

COMMENT ON VIEW vw_vendas_por_tipo_peixe IS 'Análise de vendas por tipo de peixe para restaurante pesqueiro';

-- View de vendas combinadas (peixe + bebida)
CREATE OR REPLACE VIEW vw_vendas_combinadas AS
WITH pedidos_peixes AS (
    SELECT 
        ip.pedido_id,
        STRING_AGG(p.nome, ', ') AS peixes_pedidos
    FROM itens_pedido ip
    JOIN produtos p ON ip.produto_id = p.id
    JOIN categorias c ON p.categoria_id = c.id
    WHERE c.nome = 'Peixes'
    GROUP BY ip.pedido_id
),
pedidos_bebidas AS (
    SELECT 
        ip.pedido_id,
        STRING_AGG(p.nome, ', ') AS bebidas_pedidas
    FROM itens_pedido ip
    JOIN produtos p ON ip.produto_id = p.id
    JOIN categorias c ON p.categoria_id = c.id
    WHERE c.nome = 'Bebidas'
    GROUP BY ip.pedido_id
)
SELECT 
    pp.peixes_pedidos,
    pb.bebidas_pedidas,
    COUNT(*) AS frequencia_combinacao,
    ROUND(AVG(pd.valor_total), 2) AS valor_medio_pedido
FROM pedidos_peixes pp
JOIN pedidos_bebidas pb ON pp.pedido_id = pb.pedido_id
JOIN pedidos pd ON pp.pedido_id = pd.id
WHERE pd.status = 'Fechado'
GROUP BY pp.peixes_pedidos, pb.bebidas_pedidas
ORDER BY frequencia_combinacao DESC;

COMMENT ON VIEW vw_vendas_combinadas IS 'Análise de combinações frequentes de peixes e bebidas nos pedidos';

-- View de sugestão de promoções baseada em sazonalidade
CREATE OR REPLACE VIEW vw_sugestao_promocoes AS
WITH produtos_sazonais AS (
    SELECT 
        p.id AS produto_id,
        p.nome AS produto,
        c.nome AS categoria,
        CASE 
            WHEN EXTRACT(MONTH FROM pd.data_pedido) IN (12, 1, 2) THEN 'Verão'
            WHEN EXTRACT(MONTH FROM pd.data_pedido) IN (3, 4, 5) THEN 'Outono'
            WHEN EXTRACT(MONTH FROM pd.data_pedido) IN (6, 7, 8) THEN 'Inverno'
            WHEN EXTRACT(MONTH FROM pd.data_pedido) IN (9, 10, 11) THEN 'Primavera'
        END AS estacao,
        SUM(ip.quantidade) AS quantidade_vendida,
        ROUND(AVG(ip.preco_unitario), 2) AS preco_medio
    FROM itens_pedido ip
    JOIN produtos p ON ip.produto_id = p.id
    JOIN categorias c ON p.categoria_id = c.id
    JOIN pedidos pd ON ip.pedido_id = pd.id
    WHERE pd.status = 'Fechado'
    GROUP BY p.id, p.nome, c.nome, CASE 
        WHEN EXTRACT(MONTH FROM pd.data_pedido) IN (12, 1, 2) THEN 'Verão'
        WHEN EXTRACT(MONTH FROM pd.data_pedido) IN (3, 4, 5) THEN 'Outono'
        WHEN EXTRACT(MONTH FROM pd.data_pedido) IN (6, 7, 8) THEN 'Inverno'
        WHEN EXTRACT(MONTH FROM pd.data_pedido) IN (9, 10, 11) THEN 'Primavera'
    END
),
produtos_mais_vendidos AS (
    SELECT 
        produto_id,
        produto,
        categoria,
        estacao,
        quantidade_vendida,
        preco_medio,
        ROW_NUMBER() OVER (PARTITION BY estacao, categoria ORDER BY quantidade_vendida DESC) AS ranking_categoria
    FROM produtos_sazonais
)
SELECT 
    estacao,
    categoria,
    produto,
    quantidade_vendida,
    preco_medio,
    ranking_categoria,
    CASE 
        WHEN ranking_categoria <= 3 THEN 'Alta demanda - Manter preço'
        WHEN ranking_categoria BETWEEN 4 AND 6 THEN 'Demanda média - Promoção leve (5-10%)'
        ELSE 'Baixa demanda - Promoção agressiva (15-20%)'
    END AS sugestao_promocional,
    CASE 
        WHEN ranking_categoria <= 3 THEN preco_medio
        WHEN ranking_categoria BETWEEN 4 AND 6 THEN ROUND(preco_medio * 0.9, 2)
        ELSE ROUND(preco_medio * 0.8, 2)
    END AS preco_sugerido
FROM produtos_mais_vendidos
WHERE ranking_categoria <= 10
ORDER BY estacao, categoria, ranking_categoria;

COMMENT ON VIEW vw_sugestao_promocoes IS 'Sugestões de promoções baseadas na sazonalidade e demanda dos produtos';

-- View de indicadores para pesca esportiva (caso seja um pesqueiro que ofereça essa modalidade)
CREATE OR REPLACE VIEW vw_indicadores_pesca_esportiva AS
SELECT 
    'Pesqueiro' AS modalidade,
    -- Estas colunas são exemplos - adaptar conforme os dados reais disponíveis
    0 AS quantidade_reservas_hoje,
    0 AS peixes_pescados_hoje,
    0 AS valor_arrecadado_hoje
WHERE FALSE;  -- View vazia por enquanto, implementar quando tiver dados específicos de pesca

COMMENT ON VIEW vw_indicadores_pesca_esportiva IS 'Indicadores específicos para área de pesca esportiva do restaurante pesqueiro';
