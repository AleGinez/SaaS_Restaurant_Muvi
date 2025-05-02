// test-db.js
require('dotenv').config();
const db = require('./src/config/db');
const bcrypt = require('bcrypt');

async function testDatabaseConnection() {
  try {
    // Teste básico de conexão
    const timeResult = await db.query('SELECT NOW() as now');
    console.log('Conexão com o banco de dados OK!');
    console.log('Data/hora do servidor:', timeResult.rows[0].now);
    console.log('------------------------------------------');
    
    // Listar todos os tenants
    console.log('\n1. LISTANDO TODOS OS TENANTS:');
    const tenantsList = await db.query('SELECT id, codigo, nome_restaurante, ativo FROM restaurante.tenants');
    
    if (tenantsList.rows.length > 0) {
      tenantsList.rows.forEach(tenant => {
        console.log(`ID: ${tenant.id}, Código: ${tenant.codigo}, Nome: ${tenant.nome_restaurante}, Ativo: ${tenant.ativo}`);
      });
    } else {
      console.log('Nenhum tenant encontrado!');
    }
    console.log('------------------------------------------');
    
    // Consultar detalhes do tenant com ID 2
    console.log('\n2. DETALHES DO TENANT ID 2:');
    const tenantDetails = await db.query('SELECT * FROM restaurante.tenants WHERE id = $1', [2]);
    
    if (tenantDetails.rows.length > 0) {
      console.log('Tenant encontrado:');
      console.log(tenantDetails.rows[0]);
    } else {
      console.log('Tenant com ID 2 não encontrado!');
    }
    console.log('------------------------------------------');
    
    // Listar usuários do tenant
    console.log('\n3. USUÁRIOS DO TENANT ID 2:');
    const usersList = await db.query(
      'SELECT id, nome, email, telefone, data_criacao, ativo, perfil FROM restaurante.usuarios WHERE tenant_id = $1',
      [2]
    );
    
    if (usersList.rows.length > 0) {
      usersList.rows.forEach(user => {
        console.log(`ID: ${user.id}, Nome: ${user.nome}, Email: ${user.email}, Perfil: ${user.perfil || 'N/A'}, Ativo: ${user.ativo}`);
      });
    } else {
      console.log('Nenhum usuário encontrado para o tenant ID 2!');
    }
    console.log('------------------------------------------');
    
    // Verificar login do usuário administrador
    console.log('\n4. VERIFICANDO LOGIN COM admin@ranchopeixe.com.br:');
    const adminUser = await db.query(
      'SELECT id, nome, email, senha FROM restaurante.usuarios WHERE email = $1 AND tenant_id = $2',
      ['admin@ranchopeixe.com.br', 2]
    );
    
    if (adminUser.rows.length > 0) {
      const user = adminUser.rows[0];
      console.log(`Usuário: ${user.nome} (ID: ${user.id})`);
      
      // Verificar senha (admin123)
      const isValidPassword = await bcrypt.compare('admin123', user.senha);
      console.log(`Senha 'admin123' é válida: ${isValidPassword}`);
      
      if (isValidPassword) {
        console.log('Login seria bem-sucedido!');
      } else {
        console.log('A senha não corresponde ao hash armazenado.');
      }
    } else {
      console.log('Usuário admin@ranchopeixe.com.br não encontrado!');
    }
    console.log('------------------------------------------');

  } catch (error) {
    console.error('Erro ao testar banco de dados:', error);
  } finally {
    db.pool.end();
  }
}

console.log('Iniciando testes do banco de dados...');
testDatabaseConnection();