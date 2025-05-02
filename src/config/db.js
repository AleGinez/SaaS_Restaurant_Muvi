const { Pool } = require('pg');

// Criar pool de conexões com o PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Testar conexão
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados', err);
  } else {
    console.log('Banco de dados conectado com sucesso');
    console.log(`Conectado a: ${process.env.DB_NAME} como ${process.env.DB_USER} em ${process.env.DB_HOST}`);
  }
});

// Wrapper para queries SQL
const query = async (text, params) => {
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    console.log(`Executada query: ${text.substring(0, 50)}... [${duration}ms] - ${result.rowCount} linhas`);
    
    return result;
  } catch (error) {
    console.error('Erro ao executar query:', error);
    throw error;
  }
};

module.exports = {
  query,
  pool
};