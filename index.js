// Carregar variáveis de ambiente
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const winston = require('winston');

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-restaurante' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Em desenvolvimento, também log para console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Importar rotas
const authRoutes = require('./src/routes/auth.routes');
const apiRoutes = require('./src/routes/api.routes');

// Inicializar app Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Configurações de segurança com Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

// Middleware de logging de requisições
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Servir arquivos estáticos
app.use(express.static('public'));

// Configurar rate limiting para proteção contra força bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // limite de 5 requisições por janela
  message: { message: 'Muitas tentativas de login. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res, next, options) => {
    logger.warn(`Limite de tentativas de login excedido - IP: ${req.ip}`);
    res.status(429).json(options.message);
  }
});

// Aplicar rate limiting apenas às rotas de login
app.use('/api/auth/login', loginLimiter);

// Rotas de autenticação (não protegidas)
app.use('/api/auth', authRoutes);

// Rotas protegidas por autenticação
app.use('/api', apiRoutes);

// Rota básica para teste de saúde da API
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'API do Restaurante Recanto Rancho do Peixe',
    timestamp: new Date(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota para servir página de login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Redirecionar raiz para página inicial ou login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Middleware para rotas não encontradas
app.use((req, res, next) => {
  res.status(404).json({ message: 'Recurso não encontrado' });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  logger.error(`${err.name}: ${err.message}\n${err.stack}`);
  
  // Não expor detalhes de erros em produção
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Erro interno do servidor'
    : err.message;
  
  res.status(statusCode).json({ message });
});

// Iniciar o servidor
app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT} em modo ${process.env.NODE_ENV || 'development'}`);
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Tratamento de exceções não capturadas
process.on('uncaughtException', (error) => {
  logger.error(`Exceção não capturada: ${error.message}\n${error.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Rejeição não tratada: ${reason}`);
  process.exit(1);
});