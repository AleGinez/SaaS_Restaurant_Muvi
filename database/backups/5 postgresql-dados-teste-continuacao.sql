-- Continuação das movimentações financeiras
('Entrada', 'Recebimento de evento', 2500.00, CURRENT_DATE - INTERVAL '7 days', 'Eventos', 'Festa de aniversário Sr. Roberto', 4),
('Saída', 'Compra de material de limpeza', 120.00, CURRENT_DATE - INTERVAL '3 days', 'Despesas Variáveis', 'Compra de emergência', 4),
('Saída', 'Manutenção de equipamento', 450.00, CURRENT_DATE - INTERVAL '2 days', 'Manutenção', 'Reparo na geladeira industrial', 4);

-- 12. CONTAS A PAGAR
INSERT INTO contas_pagar (descricao, fornecedor_id, valor, data_vencimento, status, numero_documento, observacao, usuario_id) VALUES
('Fornecedor Pescados Frescos', 2, 865.00, CURRENT_DATE + INTERVAL '10 days', 'Pendente', 'NF54321', 'Compra de pescados', 6),
('Aluguel do imóvel', NULL, 3500.00, CURRENT_DATE + INTERVAL '15 days', 'Pendente', 'RECIBO2023-04', 'Aluguel mensal', 2),
('Internet e telefone', NULL, 250.00, CURRENT_DATE + INTERVAL '8 days', 'Pendente', 'FAT98765', 'Fatura mensal', 2),
('Fornecedor JK Alimentos', 5, 290.00, CURRENT_DATE + INTERVAL '20 days', 'Pendente', 'NF98765', 'Compra de insumos', 6);

-- 13. CONTAS A RECEBER
INSERT INTO contas_receber (descricao, cliente_nome, cliente_documento, valor, data_vencimento, status, numero_documento, observacao, usuario_id) VALUES
('Evento Corporativo', 'Empresa ABC Ltda', '12.345.678/0001-90', 4500.00, CURRENT_DATE + INTERVAL '15 days', 'Pendente', 'EVENTO2023-01', 'Festa de confraternização', 2),
('Reserva de salão', 'João Almeida', '123.456.789-00', 1200.00, CURRENT_DATE + INTERVAL '5 days', 'Pendente', 'RESERVA2023-02', 'Aniversário de 40 anos', 2);

-- 14. REGISTRO DE HORAS (PONTO)
INSERT INTO registro_horas (funcionario_id, data, hora_entrada, hora_saida, observacao) VALUES
-- Maria Gerente
(1, CURRENT_DATE - INTERVAL '1 day', '08:00', '17:10', ''),
(1, CURRENT_DATE, '08:05', NULL, ''),

-- João Garçom
(2, CURRENT_DATE - INTERVAL '1 day', '14:00', '22:15', ''),
(2, CURRENT_DATE, '14:05', NULL, ''),

-- Ana Caixa
(3, CURRENT_DATE - INTERVAL '1 day', '14:00', '22:10', ''),
(3, CURRENT_DATE, '13:55', NULL, ''),

-- Carlos Cozinha
(4, CURRENT_DATE - INTERVAL '1 day', '06:00', '14:05', ''),
(4, CURRENT_DATE, '05:55', NULL, ''),

-- Paulo Estoquista
(5, CURRENT_DATE - INTERVAL '1 day', '08:00', '17:00', ''),
(5, CURRENT_DATE, '08:10', NULL, 'Atraso devido a problema no transporte público');

-- 15. FOLHA DE PAGAMENTO (EXEMPLO DO MÊS ANTERIOR)
INSERT INTO folha_pagamento (funcionario_id, mes, ano, salario_base, horas_extras, valor_horas_extras, beneficios, descontos, valor_total, data_pagamento) VALUES
(1, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, 4500.00, 0, 0.00, 500.00, 450.00, 4550.00, CURRENT_DATE - INTERVAL '10 days'),
(2, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, 1800.00, 8, 180.00, 300.00, 200.00, 2080.00, CURRENT_DATE - INTERVAL '10 days'),
(3, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, 1900.00, 5, 95.00, 300.00, 210.00, 2085.00, CURRENT_DATE - INTERVAL '10 days'),
(4, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, 3200.00, 0, 0.00, 400.00, 350.00, 3250.00, CURRENT_DATE - INTERVAL '10 days'),
(5, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, 1700.00, 0, 0.00, 300.00, 180.00, 1820.00, CURRENT_DATE - INTERVAL '10 days'),
(6, EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::INTEGER, 3000.00, 0, 0.00, 400.00, 320.00, 3080.00, CURRENT_DATE - INTERVAL '10 days');

-- 16. NOTAS FISCAIS
INSERT INTO notas_fiscais (pedido_id, numero, serie, data_emissao, valor_total, status, chave_acesso, usuario_id) VALUES
(1, '000001', '1', CURRENT_DATE - INTERVAL '30 minutes', 135.00, 'Emitida', '12345678901234567890123456789012345678901234', 4);

-- 17. REGISTRO DE LOGS DO SISTEMA
INSERT INTO logs_sistema (nivel, origem, mensagem, ip_origem, usuario_id, data_hora) VALUES
('INFO', 'Autenticação', 'Login realizado com sucesso', '192.168.1.100', 1, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('INFO', 'Autenticação', 'Login realizado com sucesso', '192.168.1.101', 2, CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes'),
('INFO', 'Autenticação', 'Login realizado com sucesso', '192.168.1.102', 3, CURRENT_TIMESTAMP - INTERVAL '1 hour 15 minutes'),
('INFO', 'Autenticação', 'Login realizado com sucesso', '192.168.1.103', 4, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('INFO', 'Pedidos', 'Novo pedido criado: #1', '192.168.1.101', 3, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('INFO', 'Pedidos', 'Pedido #1 enviado para cozinha', '192.168.1.101', 3, CURRENT_TIMESTAMP - INTERVAL '1 hour 55 minutes'),
('INFO', 'Pedidos', 'Pedido #1 fechado', '192.168.1.102', 4, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
('WARNING', 'Estoque', 'Produto Água Mineral 500ml atingiu nível mínimo', '192.168.1.103', 6, CURRENT_TIMESTAMP - INTERVAL '45 minutes'),
('ERROR', 'Sistema', 'Falha temporária na impressão de comanda', '192.168.1.101', 3, CURRENT_TIMESTAMP - INTERVAL '1 hour 10 minutes');

-- 18. REGISTRO DE LOGS DE ACESSO
INSERT INTO logs_acesso (usuario_id, email, ip_origem, user_agent, acao, sucesso, detalhes, data_hora) VALUES
(1, 'admin@restaurante.com', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'LOGIN', true, 'Login por senha', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(2, 'gerente@restaurante.com', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'LOGIN', true, 'Login por senha', CURRENT_TIMESTAMP - INTERVAL '1 hour 30 minutes'),
(3, 'garcom@restaurante.com', '192.168.1.102', 'Mozilla/5.0 (Android 11; Mobile)', 'LOGIN', true, 'Login por senha', CURRENT_TIMESTAMP - INTERVAL '1 hour 15 minutes'),
(4, 'caixa@restaurante.com', '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'LOGIN', true, 'Login por senha', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
(NULL, 'usuario@invalido.com', '192.168.1.250', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'LOGIN', false, 'Usuário não encontrado', CURRENT_TIMESTAMP - INTERVAL '50 minutes'),
(2, 'gerente@restaurante.com', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'LOGOUT', true, 'Logout manual', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
(1, 'admin@restaurante.com', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'LOGOUT', true, 'Logout manual', CURRENT_TIMESTAMP - INTERVAL '20 minutes');

-- 19. ALGUNS EXEMPLOS DE LOGS GERADOS PELO SISTEMA
INSERT INTO logs (usuario_id, acao, tabela_afetada, registro_afetado, dados_anteriores, dados_novos, ip, data_hora) VALUES
(1, 'INSERT', 'produtos', 1, NULL, '{"id": 1, "nome": "Água Mineral 500ml", "preco_venda": 4.00}', '192.168.1.100', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(2, 'UPDATE', 'produtos', 3, '{"preco_venda": 5.50}', '{"preco_venda": 6.00}', '192.168.1.101', CURRENT_TIMESTAMP - INTERVAL '1 day'),
(3, 'INSERT', 'pedidos', 1, NULL, '{"id": 1, "mesa_id": 1, "status": "Aberto"}', '192.168.1.102', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(3, 'UPDATE', 'pedidos', 1, '{"status": "Aberto"}', '{"status": "Em Preparo"}', '192.168.1.102', CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes'),
(4, 'UPDATE', 'pedidos', 1, '{"status": "Entregue"}', '{"status": "Fechado"}', '192.168.1.103', CURRENT_TIMESTAMP - INTERVAL '30 minutes');
