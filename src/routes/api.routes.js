// src/routes/api.routes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');

// Middleware de autenticação para todas as rotas da API
router.use(authMiddleware.verifyToken);

// Rota básica protegida
router.get('/user', (req, res) => {
  res.json({ user: req.user });
});

// Rota protegida com middleware de verificação de função
router.get('/admin', authMiddleware.hasRole(['admin']), (req, res) => {
  res.json({ message: 'Área restrita a administradores' });
});

module.exports = router;