@echo off
echo Criando estrutura de pastas para o projeto Restaurante Pesqueiro...
echo.

REM Definir diretório raiz do projeto
set PROJECT_ROOT=C:\Projects\restaurante-app

REM Criar diretório raiz do projeto se não existir
if not exist "%PROJECT_ROOT%" mkdir "%PROJECT_ROOT%"

REM =================== BACKEND ===================
echo Criando estrutura de pastas do backend...

REM Criar diretórios do backend
mkdir "%PROJECT_ROOT%\backend"
mkdir "%PROJECT_ROOT%\backend\src"
mkdir "%PROJECT_ROOT%\backend\src\config"
mkdir "%PROJECT_ROOT%\backend\src\controllers"
mkdir "%PROJECT_ROOT%\backend\src\middleware"
mkdir "%PROJECT_ROOT%\backend\src\routes"

REM Criar arquivos básicos do backend
echo // Configuração do banco de dados PostgreSQL > "%PROJECT_ROOT%\backend\src\config\db.js"
echo // Controlador de autenticação > "%PROJECT_ROOT%\backend\src\controllers\authController.js"
echo // Middleware de autenticação JWT > "%PROJECT_ROOT%\backend\src\middleware\auth.js"
echo // Rotas de autenticação > "%PROJECT_ROOT%\backend\src\routes\authRoutes.js"
echo // Servidor Express principal > "%PROJECT_ROOT%\backend\src\server.js"

REM Criar .env
echo # Configurações do servidor e banco de dados > "%PROJECT_ROOT%\backend\.env"
echo PORT=3000 >> "%PROJECT_ROOT%\backend\.env"
echo DB_HOST=localhost >> "%PROJECT_ROOT%\backend\.env"
echo DB_PORT=5432 >> "%PROJECT_ROOT%\backend\.env"
echo DB_NAME=restaurante_01 >> "%PROJECT_ROOT%\backend\.env"
echo DB_USER=postgres >> "%PROJECT_ROOT%\backend\.env"
echo DB_PASSWORD=sua_senha >> "%PROJECT_ROOT%\backend\.env"
echo JWT_SECRET=seu_segredo_jwt >> "%PROJECT_ROOT%\backend\.env"

REM Criar package.json para o backend
echo {> "%PROJECT_ROOT%\backend\package.json"
echo   "name": "restaurante-backend",>> "%PROJECT_ROOT%\backend\package.json"
echo   "version": "1.0.0",>> "%PROJECT_ROOT%\backend\package.json"
echo   "description": "API backend para sistema de restaurante",>> "%PROJECT_ROOT%\backend\package.json"
echo   "main": "src/server.js",>> "%PROJECT_ROOT%\backend\package.json"
echo   "scripts": {>> "%PROJECT_ROOT%\backend\package.json"
echo     "start": "node src/server.js",>> "%PROJECT_ROOT%\backend\package.json"
echo     "dev": "nodemon src/server.js">> "%PROJECT_ROOT%\backend\package.json"
echo   },>> "%PROJECT_ROOT%\backend\package.json"
echo   "dependencies": {>> "%PROJECT_ROOT%\backend\package.json"
echo     "bcrypt": "^5.0.1",>> "%PROJECT_ROOT%\backend\package.json"
echo     "cors": "^2.8.5",>> "%PROJECT_ROOT%\backend\package.json"
echo     "dotenv": "^10.0.0",>> "%PROJECT_ROOT%\backend\package.json"
echo     "express": "^4.17.1",>> "%PROJECT_ROOT%\backend\package.json"
echo     "jsonwebtoken": "^8.5.1",>> "%PROJECT_ROOT%\backend\package.json"
echo     "pg": "^8.7.1">> "%PROJECT_ROOT%\backend\package.json"
echo   },>> "%PROJECT_ROOT%\backend\package.json"
echo   "devDependencies": {>> "%PROJECT_ROOT%\backend\package.json"
echo     "nodemon": "^2.0.15">> "%PROJECT_ROOT%\backend\package.json"
echo   }>> "%PROJECT_ROOT%\backend\package.json"
echo }>> "%PROJECT_ROOT%\backend\package.json"

REM =================== FRONTEND ===================
echo Criando estrutura de pastas do frontend...

REM Criar diretórios do frontend
mkdir "%PROJECT_ROOT%\frontend"
mkdir "%PROJECT_ROOT%\frontend\assets"
mkdir "%PROJECT_ROOT%\frontend\assets\css"
mkdir "%PROJECT_ROOT%\frontend\assets\js"
mkdir "%PROJECT_ROOT%\frontend\assets\js\api"
mkdir "%PROJECT_ROOT%\frontend\assets\js\components"
mkdir "%PROJECT_ROOT%\frontend\assets\js\pages"
mkdir "%PROJECT_ROOT%\frontend\assets\js\utils"
mkdir "%PROJECT_ROOT%\frontend\assets\images"
mkdir "%PROJECT_ROOT%\frontend\assets\fonts"
mkdir "%PROJECT_ROOT%\frontend\pages"
mkdir "%PROJECT_ROOT%\frontend\pages\admin"
mkdir "%PROJECT_ROOT%\frontend\pages\mesas"
mkdir "%PROJECT_ROOT%\frontend\pages\pedidos"
mkdir "%PROJECT_ROOT%\frontend\pages\estoque"
mkdir "%PROJECT_ROOT%\frontend\pages\financas"
mkdir "%PROJECT_ROOT%\frontend\pages\pessoal"
mkdir "%PROJECT_ROOT%\frontend\pages\configuracoes"

REM Criar arquivos CSS básicos
echo /* Variáveis CSS principais */ > "%PROJECT_ROOT%\frontend\assets\css\variables.css"
echo /* Estilos globais */ > "%PROJECT_ROOT%\frontend\assets\css\styles.css"

REM Criar arquivos JavaScript de API
echo // Configurações da API > "%PROJECT_ROOT%\frontend\assets\js\api\config.js"
echo // Serviço de autenticação > "%PROJECT_ROOT%\frontend\assets\js\api\auth.js"

REM Criar componentes JS
echo // Componente de menu > "%PROJECT_ROOT%\frontend\assets\js\components\menu.js"
echo // Componente de notificações > "%PROJECT_ROOT%\frontend\assets\js\components\notification.js"

REM Criar scripts de página
echo // Script da página de login > "%PROJECT_ROOT%\frontend\assets\js\pages\login.js"
echo // Script do dashboard > "%PROJECT_ROOT%\frontend\assets\js\pages\dashboard.js"

REM Criar utilitários JS
echo // Verificação de autenticação > "%PROJECT_ROOT%\frontend\assets\js\utils\auth-check.js"
echo // Funções de validação > "%PROJECT_ROOT%\frontend\assets\js\utils\validator.js"

REM Criar páginas HTML básicas
echo ^<!DOCTYPE html^> > "%PROJECT_ROOT%\frontend\index.html"
echo ^<html lang="pt-BR"^> >> "%PROJECT_ROOT%\frontend\index.html"
echo ^<head^> >> "%PROJECT_ROOT%\frontend\index.html"
echo   ^<meta charset="UTF-8"^> >> "%PROJECT_ROOT%\frontend\index.html"
echo   ^<meta http-equiv="refresh" content="0;url=login.html"^> >> "%PROJECT_ROOT%\frontend\index.html"
echo   ^<title^>Redirecionando...^</title^> >> "%PROJECT_ROOT%\frontend\index.html"
echo ^</head^> >> "%PROJECT_ROOT%\frontend\index.html"
echo ^<body^> >> "%PROJECT_ROOT%\frontend\index.html"
echo   ^<p^>Redirecionando para a página de login...^</p^> >> "%PROJECT_ROOT%\frontend\index.html"
echo ^</body^> >> "%PROJECT_ROOT%\frontend\index.html"
echo ^</html^> >> "%PROJECT_ROOT%\frontend\index.html"

REM Copiar login.html (pressupondo que já existe) - aqui vamos criar um básico
echo ^<!DOCTYPE html^> > "%PROJECT_ROOT%\frontend\login.html"
echo ^<html lang="pt-BR"^> >> "%PROJECT_ROOT%\frontend\login.html"
echo ^<head^> >> "%PROJECT_ROOT%\frontend\login.html"
echo   ^<meta charset="UTF-8"^> >> "%PROJECT_ROOT%\frontend\login.html"
echo   ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^> >> "%PROJECT_ROOT%\frontend\login.html"
echo   ^<title^>Login - Recanto Rancho do Peixe^</title^> >> "%PROJECT_ROOT%\frontend\login.html"
echo   ^<link rel="stylesheet" href="/assets/css/styles.css"^> >> "%PROJECT_ROOT%\frontend\login.html"
echo ^</head^> >> "%PROJECT_ROOT%\frontend\login.html"
echo ^<body^> >> "%PROJECT_ROOT%\frontend\login.html"
echo   ^<div class="login-container"^> >> "%PROJECT_ROOT%\frontend\login.html"
echo     ^<h1^>Login^</h1^> >> "%PROJECT_ROOT%\frontend\login.html"
echo     ^<!-- Conteúdo do login aqui --^> >> "%PROJECT_ROOT%\frontend\login.html"
echo   ^</div^> >> "%PROJECT_ROOT%\frontend\login.html"
echo   ^<script type="module" src="/assets/js/pages/login.js"^>^</script^> >> "%PROJECT_ROOT%\frontend\login.html"
echo ^</body^> >> "%PROJECT_ROOT%\frontend\login.html"
echo ^</html^> >> "%PROJECT_ROOT%\frontend\login.html"

REM Criar dashboard.html
echo ^<!DOCTYPE html^> > "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo ^<html lang="pt-BR"^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo ^<head^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo   ^<meta charset="UTF-8"^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo   ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo   ^<title^>Dashboard - Recanto Rancho do Peixe^</title^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo   ^<link rel="stylesheet" href="/assets/css/styles.css"^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo ^</head^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo ^<body^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo   ^<header id="main-header"^>^</header^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo   ^<div class="app-container"^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo     ^<aside id="sidebar"^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo       ^<div class="user-info"^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo         ^<p id="user-name"^>Carregando...^</p^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo         ^<p id="user-role"^>Carregando...^</p^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo       ^</div^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo       ^<nav id="sidebar-menu"^>^</nav^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo     ^</aside^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo     ^<main id="main-content"^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo       ^<h1^>Dashboard^</h1^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo       ^<!-- Conteúdo do dashboard aqui --^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo     ^</main^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo   ^</div^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo   ^<script type="module" src="/assets/js/components/menu.js"^>^</script^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo   ^<script type="module" src="/assets/js/utils/auth-check.js"^>^</script^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo   ^<script type="module" src="/assets/js/pages/dashboard.js"^>^</script^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo ^</body^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"
echo ^</html^> >> "%PROJECT_ROOT%\frontend\pages\dashboard.html"

REM Criar README do projeto
echo # Sistema de Restaurante Pesqueiro > "%PROJECT_ROOT%\README.md"
echo. >> "%PROJECT_ROOT%\README.md"
echo ## Estrutura do Projeto >> "%PROJECT_ROOT%\README.md"
echo. >> "%PROJECT_ROOT%\README.md"
echo - `backend/`: API Node.js com Express e PostgreSQL >> "%PROJECT_ROOT%\README.md"
echo - `frontend/`: Interface web em HTML, CSS e JavaScript >> "%PROJECT_ROOT%\README.md"
echo. >> "%PROJECT_ROOT%\README.md"
echo ## Iniciar o Projeto >> "%PROJECT_ROOT%\README.md"
echo. >> "%PROJECT_ROOT%\README.md"
echo ### Backend >> "%PROJECT_ROOT%\README.md"
echo. >> "%PROJECT_ROOT%\README.md"
echo ```bash >> "%PROJECT_ROOT%\README.md"
echo cd backend >> "%PROJECT_ROOT%\README.md"
echo npm install >> "%PROJECT_ROOT%\README.md"
echo npm run dev >> "%PROJECT_ROOT%\README.md"
echo ``` >> "%PROJECT_ROOT%\README.md"
echo. >> "%PROJECT_ROOT%\README.md"
echo ### Frontend >> "%PROJECT_ROOT%\README.md"
echo. >> "%PROJECT_ROOT%\README.md"
echo Abra o arquivo `frontend/index.html` em seu navegador ou utilize uma extensão como Live Server no VSCode. >> "%PROJECT_ROOT%\README.md"

echo.
echo Estrutura de pastas criada com sucesso em %PROJECT_ROOT%
echo.
echo Próximos passos:
echo 1. Navegue até a pasta do backend: cd %PROJECT_ROOT%\backend
echo 2. Instale as dependências: npm install
echo 3. Inicie o servidor: npm run dev
echo 4. Abra o frontend em seu navegador ou utilizando Live Server no VSCode
echo.
echo Pressione qualquer tecla para sair...
pause > nul
