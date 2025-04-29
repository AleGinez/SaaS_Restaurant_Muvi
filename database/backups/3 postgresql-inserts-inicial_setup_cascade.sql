-- Script de inserção de dados iniciais para o Sistema SaaS de Restaurante Pesqueiro
-- Banco de dados: PostgreSQL
-- Schema: restaurante_01

-- Definir o schema como padrão para as operações subsequentes
SET search_path TO restaurante_01;

------------------------------------------
-- LIMPEZA DE TABELAS EXISTENTES
------------------------------------------

-- Método 1: Usar DROP e CREATE para limpar completamente
-- Verificar se há outras conexões e encerrar caso existam
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE datname = current_database() AND pid <> pg_backend_pid();

-- Limpar todas as tabelas com um único comando (usando CASCADE)
TRUNCATE TABLE 
    funcionarios_escalas,
    escalas,
    funcionarios,
    mesas,
    cardapios,
    cardapios_produtos,
    configuracoes,
    categorias,
    formas_pagamento,
    unidades_medida,
    usuarios_perfis,
    perfis_permissoes,
    usuarios,
    permissoes,
    perfis
CASCADE;

-- Resetar as sequências para garantir que IDs comecem em 1
ALTER SEQUENCE perfis_id_seq RESTART WITH 1;
ALTER SEQUENCE permissoes_id_seq RESTART WITH 1;
ALTER SEQUENCE usuarios_id_seq RESTART WITH 1;
ALTER SEQUENCE escalas_id_seq RESTART WITH 1;
ALTER SEQUENCE funcionarios_id_seq RESTART WITH 1;
ALTER SEQUENCE unidades_medida_id_seq RESTART WITH 1;
ALTER SEQUENCE categorias_id_seq RESTART WITH 1;
ALTER SEQUENCE formas_pagamento_id_seq RESTART WITH 1;
ALTER SEQUENCE mesas_id_seq RESTART WITH 1;
ALTER SEQUENCE cardapios_id_seq RESTART WITH 1;
ALTER SEQUENCE configuracoes_id_seq RESTART WITH 1;

------------------------------------------
-- 1. INSERÇÃO DE PERFIS DE ACESSO
------------------------------------------
INSERT INTO perfis (id, nome, descricao) VALUES
(1, 'Administrador', 'Acesso total ao sistema, gerenciamento completo.'),
(2, 'Gerente', 'Gestão operacional e supervisão de funcionários'),
(3, 'Garçom', 'Responsável pela abertura, fechamento e controle mesas'),
(4, 'Caixa', 'Responsável por pagamentos e fechamento de contas'),
(5, 'Cozinha', 'Visualização de pedidos enviados à cozinha'),
(6, 'Estoquista', 'Gerencia estoque e movimentações'),
(7, 'RH', 'Gestão dos funcionários e folha de pagamento, Escala');

-- Atualizar a sequência após inserção direta com IDs específicos
SELECT setval('perfis_id_seq', (SELECT MAX(id) FROM perfis));

------------------------------------------
-- 2. INSERÇÃO DE PERMISSÕES DO SISTEMA
------------------------------------------

-- Permissões - Gestão de Mesas
INSERT INTO permissoes (nome, descricao) VALUES
('mesas.visualizar', 'Visualizar mapa de mesas'),
('mesas.gerenciar', 'Gerenciar mesas (criar, editar, excluir)'),
('reservas.visualizar', 'Visualizar reservas'),
('reservas.gerenciar', 'Gerenciar reservas (criar, editar, cancelar)');

-- Permissões - Pedidos
INSERT INTO permissoes (nome, descricao) VALUES
('pedidos.visualizar', 'Visualizar pedidos'),
('pedidos.criar', 'Criar novos pedidos'),
('pedidos.editar', 'Editar pedidos existentes'),
('pedidos.cancelar', 'Cancelar pedidos'),
('pedidos.enviar_cozinha', 'Enviar pedidos para a cozinha'),
('pedidos.preparar', 'Marcar pedidos como em preparo/pronto'),
('pedidos.entregar', 'Marcar pedidos como entregues'),
('pedidos.fechar', 'Fechar contas e finalizar pedidos');

-- Permissões - Estoque
INSERT INTO permissoes (nome, descricao) VALUES
('produtos.visualizar', 'Visualizar produtos'),
('produtos.gerenciar', 'Gerenciar produtos (criar, editar, excluir)'),
('categorias.gerenciar', 'Gerenciar categorias de produtos'),
('estoque.entrada', 'Registrar entrada de produtos'),
('estoque.saida', 'Registrar saída de produtos'),
('estoque.ajustar', 'Realizar ajustes de estoque'),
('estoque.relatorios', 'Gerar relatórios de estoque');

-- Permissões - Finanças
INSERT INTO permissoes (nome, descricao) VALUES
('caixa.abrir', 'Abrir caixa'),
('caixa.fechar', 'Fechar caixa'),
('pagamentos.receber', 'Receber pagamentos'),
('pagamentos.estornar', 'Estornar pagamentos'),
('financeiro.contas_pagar', 'Gerenciar contas a pagar'),
('financeiro.contas_receber', 'Gerenciar contas a receber'),
('financeiro.movimentacoes', 'Registrar movimentações financeiras'),
('financeiro.relatorios', 'Gerar relatórios financeiros');

-- Permissões - Pessoal (RH)
INSERT INTO permissoes (nome, descricao) VALUES
('funcionarios.visualizar', 'Visualizar funcionários'),
('funcionarios.gerenciar', 'Gerenciar funcionários (criar, editar, excluir)'),
('escalas.gerenciar', 'Gerenciar escalas de trabalho'),
('ponto.registrar', 'Registrar ponto de funcionários'),
('ponto.ajustar', 'Realizar ajustes de ponto'),
('folha.gerar', 'Gerar folha de pagamento'),
('folha.visualizar', 'Visualizar folha de pagamento');

-- Permissões - Configurações
INSERT INTO permissoes (nome, descricao) VALUES
('config.geral', 'Alterar configurações gerais'),
('config.cardapio', 'Gerenciar cardápio'),
('config.mesas', 'Configurar mesas'),
('config.impostos', 'Configurar taxas e impostos');

-- Permissões - Administração
INSERT INTO permissoes (nome, descricao) VALUES
('usuarios.visualizar', 'Visualizar usuários'),
('usuarios.gerenciar', 'Gerenciar usuários (criar, editar, excluir)'),
('perfis.gerenciar', 'Gerenciar perfis'),
('permissoes.gerenciar', 'Gerenciar permissões'),
('logs.visualizar', 'Visualizar logs do sistema');

------------------------------------------
-- 3. RELAÇÃO ENTRE PERFIS E PERMISSÕES
------------------------------------------

-- Administrador (todas as permissões)
INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT 1, id FROM permissoes;

-- Gerente
INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT 2, id FROM permissoes 
WHERE nome NOT IN ('permissoes.gerenciar', 'perfis.gerenciar', 'config.geral', 'usuarios.gerenciar');

-- Garçom
INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT 3, id FROM permissoes 
WHERE nome IN (
    'mesas.visualizar', 'reservas.visualizar', 'reservas.gerenciar',
    'pedidos.visualizar', 'pedidos.criar', 'pedidos.editar', 'pedidos.enviar_cozinha',
    'pedidos.entregar', 'produtos.visualizar'
);

-- Caixa
INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT 4, id FROM permissoes 
WHERE nome IN (
    'mesas.visualizar', 'pedidos.visualizar', 'pedidos.fechar',
    'caixa.abrir', 'caixa.fechar', 'pagamentos.receber', 'pagamentos.estornar'
);

-- Cozinha
INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT 5, id FROM permissoes 
WHERE nome IN (
    'pedidos.visualizar', 'pedidos.preparar'
);

-- Estoquista
INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT 6, id FROM permissoes 
WHERE nome IN (
    'produtos.visualizar', 'produtos.gerenciar', 'categorias.gerenciar',
    'estoque.entrada', 'estoque.saida', 'estoque.ajustar', 'estoque.relatorios'
);

-- RH
INSERT INTO perfis_permissoes (perfil_id, permissao_id)
SELECT 7, id FROM permissoes 
WHERE nome IN (
    'funcionarios.visualizar', 'funcionarios.gerenciar', 'escalas.gerenciar',
    'ponto.registrar', 'ponto.ajustar', 'folha.gerar', 'folha.visualizar'
);

------------------------------------------
-- 4. USUÁRIOS INICIAIS DE TESTE
------------------------------------------
-- Senha padrão para todos os usuários: senha123 (hash bcrypt: $2a$10$GS2kWQrLVAM1A1JK4.UBT.P4QdQWOtZKj6y9AeOHBGG9YiCy4f6R6)

-- Usuário Administrador
INSERT INTO usuarios (id, nome, email, senha, telefone, ativo)
VALUES (1, 'Administrador', 'admin@restaurante.com', '$2a$10$GS2kWQrLVAM1A1JK4.UBT.P4QdQWOtZKj6y9AeOHBGG9YiCy4f6R6', '(00) 0000-0000', true);

-- Outros usuários
INSERT INTO usuarios (id, nome, email, senha, telefone, ativo) VALUES
(2, 'Maria Gerente', 'gerente@restaurante.com', '$2a$10$GS2kWQrLVAM1A1JK4.UBT.P4QdQWOtZKj6y9AeOHBGG9YiCy4f6R6', '(11) 98765-4321', true),
(3, 'João Garçom', 'garcom@restaurante.com', '$2a$10$GS2kWQrLVAM1A1JK4.UBT.P4QdQWOtZKj6y9AeOHBGG9YiCy4f6R6', '(11) 97654-3210', true),
(4, 'Ana Caixa', 'caixa@restaurante.com', '$2a$10$GS2kWQrLVAM1A1JK4.UBT.P4QdQWOtZKj6y9AeOHBGG9YiCy4f6R6', '(11) 96543-2109', true),
(5, 'Carlos Cozinha', 'cozinha@restaurante.com', '$2a$10$GS2kWQrLVAM1A1JK4.UBT.P4QdQWOtZKj6y9AeOHBGG9YiCy4f6R6', '(11) 95432-1098', true),
(6, 'Paulo Estoquista', 'estoque@restaurante.com', '$2a$10$GS2kWQrLVAM1A1JK4.UBT.P4QdQWOtZKj6y9AeOHBGG9YiCy4f6R6', '(11) 94321-0987', true),
(7, 'Lúcia RH', 'rh@restaurante.com', '$2a$10$GS2kWQrLVAM1A1JK4.UBT.P4QdQWOtZKj6y9AeOHBGG9YiCy4f6R6', '(11) 93210-9876', true);

-- Atualizar sequência após inserção direta
SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));

-- Associar usuários aos perfis correspondentes
INSERT INTO usuarios_perfis (usuario_id, perfil_id) VALUES
(1, 1), -- Administrador -> Perfil Administrador
(2, 2), -- Maria Gerente -> Perfil Gerente
(3, 3), -- João Garçom -> Perfil Garçom
(4, 4), -- Ana Caixa -> Perfil Caixa
(5, 5), -- Carlos Cozinha -> Perfil Cozinha
(6, 6), -- Paulo Estoquista -> Perfil Estoquista
(7, 7); -- Lúcia RH -> Perfil RH

------------------------------------------
-- 5. UNIDADES DE MEDIDA
------------------------------------------
INSERT INTO unidades_medida (id, nome, simbolo) VALUES
(1, 'Unidade', 'un'),
(2, 'Quilograma', 'kg'),
(3, 'Grama', 'g'),
(4, 'Litro', 'l'),
(5, 'Mililitro', 'ml'),
(6, 'Caixa', 'cx'),
(7, 'Pacote', 'pct'),
(8, 'Fardo', 'fd'),
(9, 'Conjunto', 'cj'),
(10, 'Dúzia', 'dz'),
(11, 'Metro', 'm'),
(12, 'Centímetro', 'cm'),
(13, 'Porção', 'prc');

-- Atualizar sequência após inserção direta
SELECT setval('unidades_medida_id_seq', (SELECT MAX(id) FROM unidades_medida));

------------------------------------------
-- 6. FORMAS DE PAGAMENTO
------------------------------------------
INSERT INTO formas_pagamento (id, nome, ativo) VALUES
(1, 'Dinheiro', true),
(2, 'Cartão de Crédito', true),
(3, 'Cartão de Débito', true),
(4, 'PIX', true),
(5, 'Transferência Bancária', true),
(6, 'Vale Refeição', true),
(7, 'Fiado', true);

-- Atualizar sequência após inserção direta
SELECT setval('formas_pagamento_id_seq', (SELECT MAX(id) FROM formas_pagamento));

------------------------------------------
-- 7. CATEGORIAS BÁSICAS DE PRODUTOS
------------------------------------------
INSERT INTO categorias (id, nome, descricao, ativa) VALUES
(1, 'Bebidas', 'Bebidas em geral', true),
(2, 'Alimentos', 'Alimentos em geral', true),
(3, 'Peixes', 'Pescados em geral', true),
(4, 'Porções', 'Porções para compartilhar', true),
(5, 'Sobremesas', 'Doces e sobremesas', true),
(6, 'Pratos Executivos', 'Pratos individuais', true),
(7, 'Insumos', 'Materiais e insumos para funcionamento', true),
(8, 'Limpeza', 'Produtos de limpeza', true);

-- Atualizar sequência após inserção direta
SELECT setval('categorias_id_seq', (SELECT MAX(id) FROM categorias));

------------------------------------------
-- 8. CONFIGURAÇÕES INICIAIS
------------------------------------------
INSERT INTO configuracoes (
    id,
    nome_restaurante, 
    razao_social, 
    cnpj, 
    endereco, 
    cidade, 
    estado, 
    cep, 
    telefone, 
    email,
    configuracoes_adicionais
) VALUES (
    1,
    'Restaurante Pesqueiro',
    'Restaurante Pesqueiro LTDA',
    '00.000.000/0000-00',
    'Endereço do Restaurante, 123',
    'Cidade',
    'UF',
    '00000-000',
    '(00) 0000-0000',
    'contato@restaurante.com',
    '{
        "impostos": {
            "taxa_servico": 10.0,
            "imposto_municipal": 3.0
        },
        "operacao": {
            "horario_abertura": "10:00",
            "horario_fechamento": "22:00",
            "dias_funcionamento": [1, 2, 3, 4, 5, 6, 0]
        },
        "impressao": {
            "imprimir_cupom_fiscal": true,
            "imprimir_comanda": true,
            "imprimir_pedido_cozinha": true
        }
    }'
);

------------------------------------------
-- 9. CARDÁPIO INICIAL
------------------------------------------
INSERT INTO cardapios (id, nome, descricao, ativo) VALUES
(1, 'Cardápio Principal', 'Cardápio principal do restaurante', true);

------------------------------------------
-- 10. CRIAÇÃO DE MESAS INICIAIS
------------------------------------------
-- Cria as primeiras 10 mesas como configuração inicial
INSERT INTO mesas (id, numero, capacidade, status, posicao_x, posicao_y, ativa)
VALUES
(1, 1, 4, 'Livre', 100, 100, true),
(2, 2, 4, 'Livre', 200, 100, true),
(3, 3, 4, 'Livre', 300, 100, true),
(4, 4, 6, 'Livre', 400, 100, true),
(5, 5, 6, 'Livre', 100, 200, true),
(6, 6, 2, 'Livre', 200, 200, true),
(7, 7, 2, 'Livre', 300, 200, true),
(8, 8, 8, 'Livre', 400, 200, true),
(9, 9, 8, 'Livre', 100, 300, true),
(10, 10, 4, 'Livre', 200, 300, true);

-- Atualizar sequência após inserção direta
SELECT setval('mesas_id_seq', (SELECT MAX(id) FROM mesas));

------------------------------------------
-- 11. FUNCIONÁRIOS INICIAIS
------------------------------------------
INSERT INTO funcionarios (id, usuario_id, nome, cpf, data_nascimento, endereco, cidade, estado, cep, telefone, email, cargo, salario, data_contratacao, ativo) VALUES
(1, 1, 'Administrador', '000.000.000-00', '1980-01-01', 'Rua Principal, 100', 'Cidade', 'UF', '00000-000', '(00) 0000-0000', 'admin@restaurante.com', 'Administrador', 5000.00, '2022-01-01', true),
(2, 2, 'Maria Gerente', '123.456.789-00', '1985-05-15', 'Rua das Flores, 123', 'Cidade', 'UF', '00000-001', '(11) 98765-4321', 'gerente@restaurante.com', 'Gerente', 4500.00, '2022-01-10', true),
(3, 3, 'João Garçom', '234.567.890-11', '1990-08-20', 'Av. Principal, 456', 'Cidade', 'UF', '00000-002', '(11) 97654-3210', 'garcom@restaurante.com', 'Garçom', 1800.00, '2022-02-15', true),
(4, 4, 'Ana Caixa', '345.678.901-22', '1988-03-25', 'Rua do Comércio, 789', 'Cidade', 'UF', '00000-003', '(11) 96543-2109', 'caixa@restaurante.com', 'Operador de Caixa', 1900.00, '2022-01-20', true),
(5, 5, 'Carlos Cozinha', '456.789.012-33', '1975-06-12', 'Travessa da Lagoa, 101', 'Cidade', 'UF', '00000-004', '(11) 95432-1098', 'cozinha@restaurante.com', 'Cozinheiro Chefe', 3200.00, '2022-01-05', true),
(6, 6, 'Paulo Estoquista', '567.890.123-44', '1992-11-08', 'Alameda dos Anjos, 202', 'Cidade', 'UF', '00000-005', '(11) 94321-0987', 'estoque@restaurante.com', 'Auxiliar de Estoque', 1700.00, '2022-03-01', true),
(7, 7, 'Lúcia RH', '678.901.234-55', '1983-07-30', 'Rua das Margaridas, 303', 'Cidade', 'UF', '00000-006', '(11) 93210-9876', 'rh@restaurante.com', 'Analista de RH', 3000.00, '2022-01-15', true);

-- Atualizar sequência após inserção direta
SELECT setval('funcionarios_id_seq', (SELECT MAX(id) FROM funcionarios));

------------------------------------------
-- 12. ESCALA DE TRABALHO
------------------------------------------
INSERT INTO escalas (id, nome, descricao) VALUES
(1, 'Manhã', 'Escala de turno da manhã - 6h às 14h'),
(2, 'Tarde', 'Escala de turno da tarde - 14h às 22h'),
(3, 'Noite', 'Escala de turno da noite - 22h às 6h'),
(4, 'Comercial', 'Escala de horário comercial - 8h às 17h'),
(5, 'Fim de Semana', 'Escala de fim de semana - 10h às 18h');

-- Atualizar sequência após inserção direta
SELECT setval('escalas_id_seq', (SELECT MAX(id) FROM escalas));
