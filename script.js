// --- REGISTO DO SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    // (Função anónima) Espera a página carregar completamente
    window.addEventListener('load', () => {
        // Tenta registar o ficheiro 'service-worker.js'
        navigator.serviceWorker.register('/service-worker.js').catch(err => {
            console.error('Falha ao registar o Service Worker:', err);
        });
    });
}

// --- ELEMENTOS E ESTADO DO JOGO ---
// Obter referências aos elementos HTML da página (index.html)
const canvas = document.getElementById('gameCanvas'); // A tela onde o jogo é desenhado
const ctx = canvas.getContext('2d'); // O "pincel" 2D para desenhar no canvas
const startMenu = document.getElementById('start-menu'); // O menu inicial
const startBtn = document.getElementById('start-btn'); // O botão de "Iniciar"
const touchControls = document.getElementById('touch-controls'); // Os controlos de toque (setas, tiro)
const backgroundMusic = document.getElementById('background-music'); // O elemento de áudio da música
const levelObjectiveDisplay = document.getElementById('level-objective'); // O pop-up do objetivo do nível
const levelTitle = document.getElementById('level-title'); // O texto do título do nível
const objectiveText = document.getElementById('objective-text'); // O texto do objetivo
const awarenessMessageDisplay = document.getElementById('awareness-message'); // O pop-up da mensagem de conscientização
const awarenessText = document.getElementById('awareness-text'); // O texto da mensagem
const continueBtn = document.getElementById('continue-btn'); // O botão "Continuar"
let gameState = 'loading'; // Variável que controla o estado atual do jogo (ex: 'loading', 'menu', 'playing')

// --- CARREGAMENTO DE IMAGENS ---
const images = {}; // Objeto que vai guardar as imagens carregadas
const imagesToLoad = { // Lista de imagens que precisam ser carregadas
    player: 'assets/submarino2d.png',
    bullet: 'assets/bolha2d.png',
    background: 'assets/oceano.png',
    enemy_banana: 'assets/banana2d.png',
    enemy_garrafa: 'assets/garrafa2d.png',
    enemy_latinha: 'assets/latinha2d.png',
    enemy_pneu: 'assets/pneu2d.png'
};
let imagesLoaded = 0; // Contador de quantas imagens já carregaram
const totalImages = Object.keys(imagesToLoad).length; // Número total de imagens a carregar

// Função: onImageLoad
// Descrição: É chamada automaticamente sempre que uma imagem termina de carregar.
function onImageLoad() {
    imagesLoaded++; // Incrementa o contador
    // Se todas as imagens carregaram, muda o estado do jogo para 'menu'
    if (imagesLoaded === totalImages) gameState = 'menu';
}

// Loop para carregar todas as imagens
Object.keys(imagesToLoad).forEach(key => {
    images[key] = new Image(); // Cria um novo objeto de Imagem
    images[key].src = imagesToLoad[key]; // Define o caminho da imagem (inicia o download)
    images[key].onload = onImageLoad; // Define a função a ser chamada quando carregar
    // (Função anónima) Regista um erro no console se uma imagem falhar ao carregar
    images[key].onerror = () => console.error(`Falha ao carregar imagem: ${imagesToLoad[key]}`);
});

// --- CONFIGURAÇÃO DAS FASES ---
// Objeto que define as propriedades de cada nível do jogo
const levels = {
    1: { 
        title: "Nível 1", 
        objective: { type: 'collect', amount: 10, text: "Destrua 10 Garrafas" },
        enemies: ['enemy_garrafa', 'enemy_banana'], // Inimigos permitidos neste nível
        awarenessMessage: "Garrafas plásticas podem levar mais de 400 anos para se decompor no oceano, prejudicando a vida marinha.",
        spawnRate: 40 // Taxa de aparecimento (quanto menor, mais rápido)
    },
    2: { 
        title: "Nível 2", 
        objective: { type: 'collect', amount: 15, text: "Destrua 15 Lixos" },
        enemies: ['enemy_garrafa', 'enemy_latinha'],
        awarenessMessage: "As latinhas de alumínio são 100% recicláveis! Reciclar uma única latinha economiza energia suficiente para manter uma TV ligada por 3 horas.",
        spawnRate: 35
    },
    3: { 
        title: "Desafio Final!",
        objective: { type: 'survive', amount: 30, text: "Sobreviva por 30 segundos!" },
        enemies: ['enemy_garrafa', 'enemy_latinha', 'enemy_banana', 'enemy_pneu', 'enemy_pneu', 'enemy_pneu'],
        awarenessMessage: "Incrível! Você sobreviveu à onda final e deixou o oceano mais limpo. Sua missão foi um sucesso!",
        spawnRate: 15
    }
};

// --- CONFIGURAÇÃO E VARIÁVEIS DO JOGO ---

// Função: resizeCanvas
// Descrição: Ajusta o tamanho do canvas para preencher a tela inteira do navegador.
function resizeCanvas() { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
}
// (Função anónima) Chama 'resizeCanvas' sempre que a janela do navegador mudar de tamanho
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Chama a função uma vez no início

// Variáveis globais do estado do jogo
let score, gameOver, keys, player, bullets, enemies, enemySpawnTimer, waveOffset, backgroundParticles;
let currentLevel, levelConfig, objectiveProgress, allowedEnemies, survivalTimer;

const baseEnemySpeed = 2.0; // Velocidade base dos inimigos
const waveAmplitude = 10, waveFrequency = 0.02, surfaceLevelY = 60, surfaceColor = '#0077b6';

// Função: initGameVariables    
// Descrição: Reinicia todas as variáveis do jogo para seus valores padrão.
//            É chamada ao iniciar um novo jogo ou reiniciar após 'Game Over'.
function initGameVariables() {
    score = 0; // Pontuação
    gameOver = false; // Se o jogo acabou
    keys = {}; // Objeto que armazena quais teclas estão pressionadas
    waveOffset = 0; // Controlo da animação das ondas
    currentLevel = 1; // Nível atual
    // Posição e tamanho inicial do jogador
    player = { x: canvas.width / 2 - 40, y: canvas.height - 200, width: 80, height: 80, speed: 8, angle: 0 };
    bullets = []; // Lista de todos os tiros na tela
    enemies = []; // Lista de todos os inimigos na tela
    enemySpawnTimer = 0; // Temporizador para criar novos inimigos
    backgroundParticles = []; // Lista das partículas de fundo
    // Cria 50 partículas de fundo para o efeito visual
    for (let i = 0; i < 50; i++) {
        backgroundParticles.push(new BackgroundParticle());
    }
}

// Função: showAwarenessMessage
// Descrição: Exibe o pop-up com a mensagem de conscientização correspondente ao nível concluído.
function showAwarenessMessage() {
    const completedLevelConfig = levels[currentLevel];
    awarenessText.innerText = completedLevelConfig.awarenessMessage; // Define o texto
    awarenessMessageDisplay.classList.remove('hidden'); // Mostra o pop-up
    backgroundMusic.pause(); // Pausa a música
}

// --- LÓGICA DAS FASES ---

// Função: startLevel
// Descrição: Prepara e inicia um nível específico do jogo.
function startLevel(level) {
    levelConfig = levels[level]; // Carrega a configuração do nível
    allowedEnemies = levelConfig.enemies; // Define quais inimigos podem aparecer
    objectiveProgress = 0; // Zera o progresso do objetivo

    // Se for um nível de sobrevivência, inicia o temporizador
    if (levelConfig.objective.type === 'survive') {
        survivalTimer = levelConfig.objective.amount * 60; // (segundos * 60 frames/seg)
    }

    // Define os textos no pop-up de objetivo
    levelTitle.innerText = levelConfig.title;
    objectiveText.innerText = levelConfig.objective.text;
    levelObjectiveDisplay.classList.remove('hidden'); // Mostra o pop-up

    // (Função anónima) Esconde o pop-up do nível e inicia o jogo após 3 segundos
    setTimeout(() => {
        levelObjectiveDisplay.classList.add('hidden');
        gameState = 'playing'; // Permite que o jogo comece a rodar
    }, 3000); // 3000ms k= 3 segundos
}

// Função: checkObjectiveCompletion
// Descrição: Verifica se o jogador completou o objetivo do nível atual.
function checkObjectiveCompletion() {
    const objective = levelConfig.objective;
    let completed = false;

    // Verifica se o tipo de objetivo foi alcançado
    if (objective.type === 'collect' && objectiveProgress >= objective.amount) {
        completed = true;
    } else if (objective.type === 'survive' && survivalTimer <= 0) {
        completed = true;
    }

    // Se completou, muda o estado do jogo e mostra a mensagem de conscientização
    if (completed) {
        gameState = 'levelComplete';
        showAwarenessMessage();
    }
}


// --- CLASSES (Moldes para os objetos do jogo) ---

// Classe: Bullet (Tiro / Bolha)
class Bullet {
    // Função: constructor (Chamada ao criar um 'new Bullet()')
    constructor(x, y) { 
        this.x = x; 
        this.y = y; 
        this.width = 30; 
        this.height = 30; 
        this.speed = 8; 
    }
    // Função: update (Move a bolha)
    update() { this.y -= this.speed; } // Move para cima
    // Função: draw (Desenha a bolha)
    draw() { if(images.bullet) ctx.drawImage(images.bullet, this.x - this.width / 2, this.y, this.width, this.height); }
}

// Classe: Enemy (Inimigo / Lixo)
class Enemy {
    // Função: construtor (Chamada ao criar um 'new Enemy()')
    constructor() {
        this.width = 70; this.height = 70;
        // Velocidade aumenta com o nível
        this.speed = baseEnemySpeed + (currentLevel *  4.0) + Math.random() * 3 ;
        // Escolhe uma imagem de inimigo aleatória *permitida* no nível atual
        const randomImageKey = allowedEnemies[Math.floor(Math.random() * allowedEnemies.length)];
        this.image = images[randomImageKey];
        // Posição inicial (aleatória no eixo X, no topo da tela)
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
    }
    // Função: update (Move o inimigo)
    update() { this.y += this.speed; } // Move para baixo
    // Função: draw (Desenha o inimigo)
    draw() { if (this.image && this.image.complete) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); }
}

// Classe: BackgroundParticle (Partícula de fundo)
class BackgroundParticle {
    // Função: constructor (Chamada ao criar uma 'new BackgroundParticle()')
    constructor() {
        this.x = Math.random() * canvas.width; 
        this.y = Math.random() * canvas.height;
        this.radius = Math.random() * 2 + 1; // Tamanho aleatório
        this.speed = Math.random() * 0.5 + 0.2; // Velocidade aleatória
        this.opacity = Math.random() * 0.5 + 0.2; // Opacidade aleatória
    }
    // Função: update (Move a partícula)
    update() { 
        this.y -= this.speed; // Move para cima
        // Se sair da tela, reposiciona em baixo
        if (this.y < 0) { 
            this.y = canvas.height; 
            this.x = Math.random() * canvas.width; 
        } 
    }
    // Função: draw (Desenha a partícula como um círculo)
    draw() { 
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); 
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`; 
        ctx.fill(); 
    }
}

// --- LÓGICA DE JOGO ---

// Função: shoot
// Descrição: Cria um novo tiro (bolha) na posição do jogador.
function shoot() { 
    if (!gameOver) bullets.push(new Bullet(player.x + player.width / 2, player.y)); 
}

// Função: handleInput
// Descrição: Verifica as teclas pressionadas (no objeto 'keys') e move o jogador.
function handleInput() {
    const targetAngle = 0.2; // Ângulo máximo de inclinação
    const easing = 0.1; // Suavidade do movimento de inclinação
    if (keys['ArrowLeft'] && player.x > 0) { // Se 'Seta Esquerda' e não estiver na borda
        player.x -= player.speed;
        player.angle -= targetAngle * easing; // Inclina para a esquerda
    } else if (keys['ArrowRight'] && player.x < canvas.width - player.width) { // Se 'Seta Direita'
        player.x += player.speed;
        player.angle += targetAngle * easing; // Inclina para a direita
    } else {
        player.angle *= (1 - easing); // Retorna lentamente à posição 0
    }
    // Limita a inclinação máxima
    player.angle = Math.max(-targetAngle, Math.min(targetAngle, player.angle));
}

// Função: updateGame
// Descrição: A função de lógica principal. Move tudo, verifica colisões, etc.
function updateGame() {
    if (gameOver) return; // Se o jogo acabou, não faz nada
    handleInput(); // Processa os controles do jogador
    backgroundParticles.forEach(p => p.update()); // Move as partículas
    bullets.forEach(b => b.update()); // Move os tiros
    enemies.forEach(e => e.update()); // Move os inimigos

    // --- Verificação de Colisões ---
    const enemiesToRemove = new Set(); // Lista de inimigos a remover
    const bulletsToRemove = new Set(); // Lista de tiros a remover

    enemies.forEach(enemy => {
        // 1. Colisão Inimigo-Jogador
        if (player.x < enemy.x + enemy.width && 
            player.x + player.width > enemy.x && 
            player.y < enemy.y + enemy.height && 
            player.y + player.height > enemy.y) {
            
            gameOver = true; 
            gameState = 'gameOver'; 
            backgroundMusic.pause(); 
            backgroundMusic.currentTime = 0;
        }

        // 2. Colisão Tiro-Inimigo
        bullets.forEach(bullet => {
            if (!bulletsToRemove.has(bullet) && 
                bullet.x < enemy.x + enemy.width && 
                bullet.x + bullet.width > enemy.x && 
                bullet.y < enemy.y + enemy.height && 
                bullet.y + bullet.height > enemy.y) {
                
                enemiesToRemove.add(enemy); // Marca inimigo para remoção
                bulletsToRemove.add(bullet); // Marca tiro para remoção
            }
        });
    });

    // --- Processamento de Remoções ---
    if (enemiesToRemove.size > 0) {
        score += enemiesToRemove.size * 10; // Aumenta a pontuação
        // Se o objetivo for 'coletar', incrementa o progresso
        if (levelConfig.objective.type === 'collect') {
            objectiveProgress += enemiesToRemove.size;
        }
        // Remove os inimigos que colidiram
        enemies = enemies.filter(enemy => !enemiesToRemove.has(enemy));
    }
    if (bulletsToRemove.size > 0) {
        // Remove os tiros que colidiram
        bullets = bullets.filter(bullet => !bulletsToRemove.has(bullet));
    }

    // Remove tiros que saíram do topo da tela
    bullets = bullets.filter(bullet => bullet.y > 0);
    // Remove inimigos que saíram de baixo da tela
    enemies = enemies.filter(enemy => enemy.y <= canvas.height);

    // --- Criação de Inimigos ---
    enemySpawnTimer++; // Incrementa o temporizador
    if (enemySpawnTimer > levelConfig.spawnRate) {
        enemies.push(new Enemy()); // Cria um novo inimigo
        enemySpawnTimer = 0; // Zera o temporizador
    }

    // --- Temporizador de Sobrevivência ---
    if (levelConfig.objective.type === 'survive') {
        survivalTimer--; // Decrementa o tempo
    }

    checkObjectiveCompletion(); // Verifica se o nível terminou
}

// --- FUNÇÕES DE DESENHO ---

// Função: drawSurfaceWaves
// Descrição: Desenha as ondas da superfície na parte superior do canvas.
function drawSurfaceWaves() {
    ctx.fillStyle = surfaceColor; 
    ctx.beginPath(); 
    ctx.moveTo(0, surfaceLevelY);
    // Usa 'Math.sin' para criar um efeito de onda
    for (let x = 0; x <= canvas.width; x++) { 
        let y = surfaceLevelY + Math.sin(x * waveFrequency + waveOffset) * waveAmplitude; 
        ctx.lineTo(x, y); 
    }
    ctx.lineTo(canvas.width, 0); 
    ctx.lineTo(0, 0); 
    ctx.closePath(); 
    ctx.fill();
}

// Função: drawPlayer
// Descrição: Desenha o submarino do jogador no canvas.
function drawPlayer() {
    if (images.player) {
        ctx.save(); // Salva o estado atual do canvas (posição, rotação)
        // Move o ponto de origem do canvas para o centro do jogador
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        ctx.rotate(player.angle); // Aplica a rotação (inclinação)
        // Desenha o jogador centrado na nova origem
        ctx.drawImage(images.player, -player.width / 2, -player.height / 2, player.width, player.height);
        ctx.restore(); // Restaura o estado anterior do canvas
    }
}

// Função: drawGame
// Descrição: A função de desenho principal. Desenha todos os elementos do jogo.
function drawGame() {
    // 1. Desenha o fundo
    if(images.background) ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    // 2. Desenha as partículas
    backgroundParticles.forEach(p => p.draw());
    // 3. Desenha as ondas
    drawSurfaceWaves();
    // 4. Desenha o jogador
    drawPlayer();
    // 5. Desenha os tiros
    bullets.forEach(b => b.draw());
    // 6. Desenha os inimigos
    enemies.forEach(e => e.draw());

    // 7. Desenha o texto da UI (Pontuação e Objetivo)
    ctx.fillStyle = 'white'; 
    ctx.font = '22px Arial'; 
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);

    const obj = levelConfig.objective;
    if (obj.type === 'collect') {
        ctx.fillText(`${obj.text}: ${objectiveProgress}/${obj.amount}`, 20, 80);
    } else if (obj.type === 'survive') {
        // Mostra o tempo restante em segundos
        ctx.fillText(`${obj.text} ${Math.max(0, Math.ceil(survivalTimer / 60))}s`, 20, 80);
    } else {
        ctx.fillText(obj.text, 20, 80);
    }
}

// Função: drawMenu
// Descrição: Mostra o menu inicial (que é um elemento HTML).
function drawMenu() {
    startMenu.classList.remove('hidden');
}

// Função: drawLoading
// Descrição: Desenha a tela de "A carregar..." no canvas.
function drawLoading() {
    ctx.fillStyle = '#001f3f'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; 
    ctx.font = '30px Arial';    
    ctx.textAlign = 'center';
    ctx.fillText('A carregar...', canvas.width / 2, canvas.height / 2);
}

// Função: drawGameOver
// Descrição: Desenha a tela de "Fim de Jogo" sobre o jogo.
function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; // Fundo escuro semitransparente
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; 
    ctx.font = '50px Arial'; 
    ctx.textAlign = 'center';
    ctx.fillText('FIM DE JOGO', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '24px Arial'; 
    ctx.fillText('Toque para reiniciar', canvas.width / 2, canvas.height / 2 + 20);
}

// Função: drawGameWon
// Descrição: Desenha a tela de "Você Venceu" quando todos os níveis são concluídos.
function drawGameWon() {
    ctx.fillStyle = 'rgba(0, 119, 182, 0.8)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; 
    ctx.font = '50px Arial'; 
    ctx.textAlign = 'center';
    ctx.fillText('VOCÊ VENCEU!', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '24px Arial'; 
    ctx.fillText('O oceano agradece! Toque para jogar de novo.', canvas.width / 2, canvas.height / 2 + 20);
}

// --- LOOP PRINCIPAL DO JOGO ---

// Função: gameLoop
// Descrição: O coração do jogo. É chamada repetidamente (idealmente 60x por segundo).
//            Verifica o 'gameState' e decide qual função de desenho/lógica chamar.
function gameLoop() {
    if (gameState === 'loading') { 
        drawLoading(); 
    }
    else if (gameState === 'menu') { 
        drawMenu(); 
    }
    else if (gameState === 'levelStart') { 
        // Mostra o jogo parado enquanto o pop-up do nível está visível
        drawGame(); 
    }
    else if (gameState === 'playing') { 
        updateGame(); // Atualiza a lógica
        drawGame(); // Desenha o jogo
    }
    else if (gameState === 'levelComplete') { 
        // Mostra o jogo parado enquanto a mensagem de conscientização está visível
        drawGame(); 
    }
    else if (gameState === 'gameOver') { 
        drawGame(); // Desenha o jogo (último frame)
        drawGameOver(); // Desenha a tela de Fim de Jogo por cima
    }
    else if (gameState === 'gameWon') { 
        drawGame(); // Desenha o jogo
        drawGameWon(); // Desenha a tela de Vitória por cima
    }
    // Pede ao navegador para chamar 'gameLoop' novamente no próximo quadro de animação
    requestAnimationFrame(gameLoop);
}

// --- CONTROLOS E INÍCIO DO JOGO ---

// Função: startGame
// Descrição: Chamada quando o botão "Iniciar" é clicado. Prepara e começa o jogo.
function startGame() {
    initGameVariables(); // Reinicia as variáveis
    gameState = 'levelStart'; // Define o estado para iniciar o nível
    startMenu.classList.add('hidden'); // Esconde o menu inicial
    touchControls.classList.remove('hidden'); // Mostra os controlos de toque
    // Tenta tocar a música (pode falhar se o utilizador não interagiu com a página)
    backgroundMusic.play().catch(error => console.log("Interação do utilizador necessária para a música tocar."));
    startLevel(currentLevel); // Inicia o Nível 1
}
// (Função anónima) Associa a função 'startGame' ao evento de clique do botão 'startBtn'
startBtn.addEventListener('click', startGame);

// (Função anónima) Associada ao botão "Continuar" (no pop-up de conscientização)
continueBtn.addEventListener('click', () => {
    awarenessMessageDisplay.classList.add('hidden'); // Esconde o pop-up
    currentLevel++; // Avança para o próximo nível
    if (levels[currentLevel]) { // Se o próximo nível existir
        gameState = 'levelStart';
        startLevel(currentLevel); // Inicia o próximo nível
        backgroundMusic.play();
    } else {
        // Se não houver mais níveis, o jogo foi ganho
        gameState = 'gameWon';
    }
});

// --- Controlos de Teclado ---
// (Função anónima) Chamada quando uma tecla é pressionada
window.addEventListener('keydown', e => { 
    keys[e.key] = true; // Regista que a tecla está pressionada
    if (e.key === ' ' && gameState === 'playing') shoot(); // Atira com a tecla 'Espaço'
});
// (Função anónima) Chamada quando uma tecla é solta
window.addEventListener('keyup', e => { 
    keys[e.key] = false; // Regista que a tecla foi solta
});

// --- Controles de Toque ---
const leftBtn = document.getElementById('left-btn'), 
      rightBtn = document.getElementById('right-btn'), 
      shootBtn = document.getElementById('shoot-btn');

// (Funções anónimas) Simulam as teclas 'ArrowLeft', 'ArrowRight' e 'shoot'
leftBtn.addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowLeft'] = true; });
leftBtn.addEventListener('touchend', e => { keys['ArrowLeft'] = false; });
rightBtn.addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowRight'] = true; });
rightBtn.addEventListener('touchend', e => { keys['ArrowRight'] = false; });
shootBtn.addEventListener('touchstart', e => { e.preventDefault(); if (gameState === 'playing') shoot(); });

// Função: resetGame
// Descrição: Reinicia o jogo. (Atualmente, apenas chama 'startGame').
function resetGame() { 
    startGame(); 
}

// (Funções anónimas) Permitem reiniciar o jogo clicando/tocando na tela após 'Game Over' ou 'Game Won'
canvas.addEventListener('click', () => { if (gameState === 'gameOver' || gameState === 'gameWon') resetGame(); });
canvas.addEventListener('touchstart', () => { if (gameState === 'gameOver' || gameState === 'gameWon') resetGame(); });

// --- Início do Jogo ---
initGameVariables(); // Prepara as variáveis pela primeira vez
gameLoop(); // Inicia o loop principal do jogo