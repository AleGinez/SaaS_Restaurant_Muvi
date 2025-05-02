// src/controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');

// Função para registrar tentativas de login
async function logLoginAttempt(tenantId, userId, ip, userAgent, status, details = null) {
  try {
    await db.query(
      'INSERT INTO restaurante.login_logs(tenant_id, usuario_id, ip_address, user_agent, status, details) VALUES($1, $2, $3, $4, $5, $6)',
      [tenantId, userId, ip, userAgent, status, details ? JSON.stringify({ message: details }) : null]
    );
  } catch (error) {
    console.error('Erro ao registrar tentativa de login:', error);
  }
}

// Gerar token de acesso
function generateAccessToken(user, tenantId) {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      perfil: user.perfil,
      tenantId 
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Gerar token de atualização
function generateRefreshToken(user, tenantId) {
  return jwt.sign(
    { 
      userId: user.id,
      tenantId 
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// Controlador de login
exports.login = async (req, res) => {
  try {
    const { username, password, tenant_code } = req.body;
    
    // Validar tenant
    const tenantResult = await db.query(
      'SELECT id FROM restaurante.tenants WHERE codigo = $1 AND ativo = true',
      [tenant_code]
    );
    
    if (tenantResult.rows.length === 0) {
      return res.status(401).json({ message: 'Restaurante não encontrado ou inativo' });
    }
    
    const tenantId = tenantResult.rows[0].id;
    
    // Obter usuário
    const userResult = await db.query(
      'SELECT id, nome, email, senha, perfil, ativo, failed_login_attempts, account_locked, account_locked_until ' +
      'FROM restaurante.usuarios WHERE email = $1 AND tenant_id = $2',
      [username, tenantId]
    );
    
    if (userResult.rows.length === 0) {
      await logLoginAttempt(tenantId, null, req.ip, req.headers['user-agent'], 'failed', 'Usuário não encontrado');
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    const user = userResult.rows[0];
    
    // Verificar se a conta está bloqueada
    if (user.account_locked) {
      if (user.account_locked_until && new Date() < new Date(user.account_locked_until)) {
        await logLoginAttempt(tenantId, user.id, req.ip, req.headers['user-agent'], 'locked', 'Conta bloqueada');
        return res.status(401).json({ 
          message: 'Conta bloqueada. Tente novamente mais tarde ou redefina sua senha.' 
        });
      } else {
        // Desbloquear se o período de bloqueio expirou
        await db.query(
          'UPDATE restaurante.usuarios SET account_locked = false, failed_login_attempts = 0 WHERE id = $1',
          [user.id]
        );
      }
    }
    
    // Verificar se o usuário está ativo
    if (!user.ativo) {
      await logLoginAttempt(tenantId, user.id, req.ip, req.headers['user-agent'], 'failed', 'Conta inativa');
      return res.status(401).json({ message: 'Conta inativa. Contate o administrador.' });
    }
    
    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.senha);
    
    if (!passwordMatch) {
      // Incrementar tentativas de login falhas
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      
      // Bloquear conta após 5 tentativas falhas
      if (newFailedAttempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30); // Bloquear por 30 minutos
        
        await db.query(
          'UPDATE restaurante.usuarios SET failed_login_attempts = $1, account_locked = true, account_locked_until = $2, last_failed_attempt = CURRENT_TIMESTAMP WHERE id = $3',
          [newFailedAttempts, lockUntil, user.id]
        );
        
        await logLoginAttempt(tenantId, user.id, req.ip, req.headers['user-agent'], 'locked', 'Conta bloqueada após 5 tentativas falhas');
        
        return res.status(401).json({ 
          message: 'Conta bloqueada após múltiplas tentativas. Tente novamente em 30 minutos ou redefina sua senha.' 
        });
      }
      
      // Atualizar tentativas falhas
      await db.query(
        'UPDATE restaurante.usuarios SET failed_login_attempts = $1, last_failed_attempt = CURRENT_TIMESTAMP WHERE id = $2',
        [newFailedAttempts, user.id]
      );
      
      await logLoginAttempt(tenantId, user.id, req.ip, req.headers['user-agent'], 'failed', 'Senha inválida');
      
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
    
    // Resetar tentativas de login falhas
    await db.query(
      'UPDATE restaurante.usuarios SET failed_login_attempts = 0, ultimo_acesso = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    // Gerar tokens JWT
    const accessToken = generateAccessToken(user, tenantId);
    const refreshToken = generateRefreshToken(user, tenantId);
    
    // Registrar login bem-sucedido
    await logLoginAttempt(tenantId, user.id, req.ip, req.headers['user-agent'], 'success');
    
    return res.status(200).json({
      message: 'Login bem-sucedido',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
      },
      tenant_id: tenantId,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Erro de login:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Atualização de token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Token de atualização não fornecido' });
    }
    
    // Verificar token de atualização
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Token inválido ou expirado' });
      }
      
      // Verificar se o usuário existe
      const userResult = await db.query(
        'SELECT id, nome, email, perfil FROM restaurante.usuarios WHERE id = $1 AND tenant_id = $2 AND ativo = true',
        [decoded.userId, decoded.tenantId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      
      const user = userResult.rows[0];
      
      // Gerar novo token de acesso
      const accessToken = generateAccessToken(user, decoded.tenantId);
      
      return res.status(200).json({ accessToken });
    });
  } catch (error) {
    console.error('Erro ao atualizar token:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Logout
exports.logout = async (req, res) => {
  // Em uma implementação completa, você pode invalidar tokens em um blacklist
  return res.status(200).json({ message: 'Logout realizado com sucesso' });
};

// Solicitar redefinição de senha
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Verificar se o email existe
    const userResult = await db.query(
      'SELECT id, nome, email, tenant_id FROM restaurante.usuarios WHERE email = $1 AND ativo = true',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      // Por segurança, não informamos que o usuário não existe
      return res.status(200).json({ 
        message: 'Se o email estiver cadastrado, enviaremos instruções para redefinição de senha.' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Gerar token de redefinição de senha
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Expira em 1 hora
    
    // Salvar token no banco de dados
    await db.query(
      'UPDATE restaurante.usuarios SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, tokenExpiry, user.id]
    );
    
    // Em uma implementação real, aqui você enviaria um email com o link de redefinição
    // Por exemplo: /reset-password?token=${resetToken}
    
    // Para fins de demonstração
    console.log(`Token de redefinição para ${user.email}: ${resetToken}`);
    
    return res.status(200).json({ 
      message: 'Se o email estiver cadastrado, enviaremos instruções para redefinição de senha.' 
    });
  } catch (error) {
    console.error('Erro ao solicitar redefinição de senha:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Redefinir senha
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token e nova senha são obrigatórios' });
    }
    
    // Verificar se o token é válido e não expirou
    const userResult = await db.query(
      'SELECT id FROM restaurante.usuarios WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Token inválido ou expirado' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Atualizar senha e limpar token
    await db.query(
      'UPDATE restaurante.usuarios SET senha = $1, password_reset_token = NULL, password_reset_expires = NULL, last_password_change = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );
    
    return res.status(200).json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};