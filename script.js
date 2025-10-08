// --- REGISTO DO SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(err => {
            console.error('Falha ao registar o Service Worker:', err);
        });
    });
}

// --- ELEMENTOS E ESTADO DO JOGO ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startMenu = document.getElementById('start-menu');
const startBtn = document.getElementById('start-btn');
const touchControls = document.getElementById('touch-controls');
const backgroundMusic = document.getElementById('background-music');
const levelObjectiveDisplay = document.getElementById('level-objective');
const levelTitle = document.getElementById('level-title');
const objectiveText = document.getElementById('objective-text');
let gameState = 'loading';

// --- CARREGAMENTO DE IMAGENS ---
const images = {};
const imagesToLoad = {
    player: 'assets/submarino2d.png',
    bullet: 'assets/bolha2d.png',
    background: 'assets/oceano.png',
    enemy_banana: 'assets/banana2d.png',
    enemy_garrafa: 'assets/garrafa2d.png',
    enemy_latinha: 'assets/latinha2d.png',
    enemy_pneu: 'assets/pneu2d.png'
};
let imagesLoaded = 0;
const totalImages = Object.keys(imagesToLoad).length;

function onImageLoad() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) gameState = 'menu';
}

Object.keys(imagesToLoad).forEach(key => {
    images[key] = new Image();
    images[key].src = imagesToLoad[key];
    images[key].onload = onImageLoad;
    images[key].onerror = () => console.error(`Falha ao carregar imagem: ${imagesToLoad[key]}`);
});

// --- CONFIGURAÇÃO DAS FASES ---
const levels = {
    1: { 
        title: "Nível 1", 
        objective: { type: 'collect', amount: 10, text: "Destrua 10 lixos" },
        enemies: ['enemy_garrafa', 'enemy_latinha'] 
    },
    2: { 
        title: "Nível 2", 
        objective: { type: 'collect', amount: 20, text: "Destrua 20 lixos" },
        enemies: ['enemy_garrafa', 'enemy_latinha', 'enemy_banana'] 
    },
    3: { 
        title: "Nível 3", 
        objective: { type: 'survive', amount: 30, text: "Sobreviva por 30 segundos!" }, 
        enemies: ['enemy_garrafa', 'enemy_latinha', 'enemy_banana', 'enemy_pneu'] 
    },
    4: {
        title: "Modo Infinito",
        objective: { type: 'endless', text: "Faça a maior pontuação!" },
        enemies: ['enemy_banana', 'enemy_garrafa', 'enemy_latinha', 'enemy_pneu']
    }
};

// --- CONFIGURAÇÃO E VARIÁVEIS DO JOGO ---
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let score, gameOver, keys, player, bullets, enemies, enemySpawnTimer, waveOffset, backgroundParticles;
let currentLevel, levelConfig, objectiveProgress, allowedEnemies, survivalTimer;

const baseEnemySpeed = 2;
const waveAmplitude = 10, waveFrequency = 0.02, surfaceLevelY = 60, surfaceColor = '#0077b6';

function initGameVariables() {
    score = 0; gameOver = false; keys = {}; waveOffset = 0;
    currentLevel = 1;
    player = { x: canvas.width / 2 - 40, y: canvas.height - 200, width: 80, height: 80, speed: 6, angle: 0 };
    bullets = []; enemies = []; enemySpawnTimer = 0; backgroundParticles = [];
    for (let i = 0; i < 50; i++) {
        backgroundParticles.push(new BackgroundParticle());
    }
}

// --- LÓGICA DAS FASES ---
function startLevel(level) {
    levelConfig = levels[level];
    allowedEnemies = levelConfig.enemies;
    objectiveProgress = 0;

    if (levelConfig.objective.type === 'survive') {
        survivalTimer = levelConfig.objective.amount * 60; // Convertendo segundos para frames (60 FPS)
    }

    levelTitle.innerText = levelConfig.title;
    objectiveText.innerText = levelConfig.objective.text;
    levelObjectiveDisplay.classList.remove('hidden');

    // Esconde a mensagem após alguns segundos e inicia o jogo
    setTimeout(() => {
        levelObjectiveDisplay.classList.add('hidden');
        gameState = 'playing';
    }, 3000); // Mostra por 3 segundos
}

function checkObjectiveCompletion() {
    const objective = levelConfig.objective;
    let completed = false;

    if (objective.type === 'collect' && objectiveProgress >= objective.amount) {
        completed = true;
    } else if (objective.type === 'survive' && survivalTimer <= 0) {
        completed = true;
    }

    if (completed) {
        currentLevel++;
        if (levels[currentLevel]) {
            gameState = 'levelStart';
            startLevel(currentLevel);
        } else {
            currentLevel = Object.keys(levels).length;
            gameState = 'levelStart';
            startLevel(currentLevel);
        }
    }
}


// --- CLASSES ---
class Bullet {
    constructor(x, y) { this.x = x; this.y = y; this.width = 30; this.height = 30; this.speed = 8; }
    update() { this.y -= this.speed; }
    draw() { if(images.bullet) ctx.drawImage(images.bullet, this.x - this.width / 2, this.y, this.width, this.height); }
}

class Enemy {
    constructor() {
        this.width = 70; this.height = 70;
        this.speed = baseEnemySpeed + (currentLevel * 0.5) + Math.random() * 2;
        const randomImageKey = allowedEnemies[Math.floor(Math.random() * allowedEnemies.length)];
        this.image = images[randomImageKey];
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
    }
    update() { this.y += this.speed; }
    draw() { if (this.image && this.image.complete) ctx.drawImage(this.image, this.x, this.y, this.width, this.height); }
}

class BackgroundParticle {
    constructor() {
        this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height;
        this.radius = Math.random() * 2 + 1; this.speed = Math.random() * 0.5 + 0.2;
        this.opacity = Math.random() * 0.5 + 0.2;
    }
    update() { this.y -= this.speed; if (this.y < 0) { this.y = canvas.height; this.x = Math.random() * canvas.width; } }
    draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`; ctx.fill(); }
}

// --- LÓGICA DE JOGO ---
function shoot() { if (!gameOver) bullets.push(new Bullet(player.x + player.width / 2, player.y)); }

function handleInput() {
    const targetAngle = 0.2; const easing = 0.1;
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
        player.angle -= targetAngle * easing;
    } else if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
        player.angle += targetAngle * easing;
    } else {
        player.angle *= (1 - easing);
    }
    player.angle = Math.max(-targetAngle, Math.min(targetAngle, player.angle));
}

function updateGame() {
    if (gameOver) return;
    handleInput();
    backgroundParticles.forEach(p => p.update());
    bullets.forEach(b => b.update());
    enemies.forEach(e => e.update());

    const enemiesToRemove = new Set();
    const bulletsToRemove = new Set();
    enemies.forEach(enemy => {
        if (player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y) {
            gameOver = true; gameState = 'gameOver'; backgroundMusic.pause(); backgroundMusic.currentTime = 0;
        }
        bullets.forEach(bullet => {
            if (!bulletsToRemove.has(bullet) && bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x && bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
                enemiesToRemove.add(enemy);
                bulletsToRemove.add(bullet);
            }
        });
    });

    if (enemiesToRemove.size > 0) {
        score += enemiesToRemove.size * 10;
        if (levelConfig.objective.type === 'collect') {
            objectiveProgress += enemiesToRemove.size;
        }
        enemies = enemies.filter(enemy => !enemiesToRemove.has(enemy));
    }
    if (bulletsToRemove.size > 0) {
        bullets = bullets.filter(bullet => !bulletsToRemove.has(bullet));
    }
    bullets = bullets.filter(bullet => bullet.y > 0);
    enemies = enemies.filter(enemy => enemy.y <= canvas.height);

    enemySpawnTimer++;
    if (enemySpawnTimer > Math.max(20, 60 - currentLevel * 5)) {
        enemies.push(new Enemy());
        enemySpawnTimer = 0;
    }

    if (levelConfig.objective.type === 'survive') {
        survivalTimer--;
    }

    checkObjectiveCompletion();
    waveOffset += 0.05;
}

// --- FUNÇÕES DE DESENHO ---
function drawSurfaceWaves() {
    ctx.fillStyle = surfaceColor; ctx.beginPath(); ctx.moveTo(0, surfaceLevelY);
    for (let x = 0; x <= canvas.width; x++) { let y = surfaceLevelY + Math.sin(x * waveFrequency + waveOffset) * waveAmplitude; ctx.lineTo(x, y); }
    ctx.lineTo(canvas.width, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
}

function drawPlayer() {
    if (images.player) {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        ctx.rotate(player.angle);
        ctx.drawImage(images.player, -player.width / 2, -player.height / 2, player.width, player.height);
        ctx.restore();
    }
}

function drawGame() {
    if(images.background) ctx.drawImage(images.background, 0, 0, canvas.width, canvas.height);
    backgroundParticles.forEach(p => p.draw());
    drawSurfaceWaves();
    drawPlayer();
    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());

    ctx.fillStyle = 'white'; ctx.font = '28px Arial'; ctx.textAlign = 'left';
    ctx.fillText(`Pontuação: ${score}`, 20, 40);

    const obj = levelConfig.objective;
    if (obj.type === 'collect') {
        ctx.fillText(`${obj.text}: ${objectiveProgress}/${obj.amount}`, 20, 80);
    } else if (obj.type === 'survive') {
        ctx.fillText(`${obj.text}: ${Math.max(0, Math.ceil(survivalTimer / 60))}s`, 20, 80);
    } else {
        ctx.fillText(obj.text, 20, 80);
    }
}

function drawMenu() {
    // As linhas que desenhavam o fundo antigo foram removidas.
    // O canvas ficará escuro, e o menu em HTML (com o novo fundo) aparecerá por cima.
    startMenu.classList.remove('hidden');
}

function drawLoading() {
    ctx.fillStyle = '#001f3f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; ctx.font = '30px Arial'; ctx.textAlign = 'center';
    ctx.fillText('A carregar...', canvas.width / 2, canvas.height / 2);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white'; ctx.font = '50px Arial'; ctx.textAlign = 'center';
    ctx.fillText('FIM DE JOGO', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '24px Arial'; ctx.fillText('Toque para reiniciar', canvas.width / 2, canvas.height / 2 + 20);
}

// --- LOOP PRINCIPAL DO JOGO ---
function gameLoop() {
    if (gameState === 'loading') { drawLoading(); }
    else if (gameState === 'menu') { drawMenu(); }
    else if (gameState === 'levelStart') { drawGame(); }
    else if (gameState === 'playing') { updateGame(); drawGame(); }
    else if (gameState === 'gameOver') { drawGame(); drawGameOver(); }
    requestAnimationFrame(gameLoop);
}

// --- CONTROLOS E INÍCIO DO JOGO ---
function startGame() {
    initGameVariables();
    gameState = 'levelStart';
    startMenu.classList.add('hidden');
    touchControls.classList.remove('hidden');
    backgroundMusic.play().catch(error => console.log("Interação do utilizador necessária para a música tocar."));
    startLevel(currentLevel);
}
startBtn.addEventListener('click', startGame);
window.addEventListener('keydown', e => { keys[e.key] = true; if (e.key === ' ' && gameState === 'playing') shoot(); });
window.addEventListener('keyup', e => { keys[e.key] = false; });
const leftBtn = document.getElementById('left-btn'), rightBtn = document.getElementById('right-btn'), shootBtn = document.getElementById('shoot-btn');
leftBtn.addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowLeft'] = true; });
leftBtn.addEventListener('touchend', e => { keys['ArrowLeft'] = false; });
rightBtn.addEventListener('touchstart', e => { e.preventDefault(); keys['ArrowRight'] = true; });
rightBtn.addEventListener('touchend', e => { keys['ArrowRight'] = false; });
shootBtn.addEventListener('touchstart', e => { e.preventDefault(); if (gameState === 'playing') shoot(); });
function resetGame() { startGame(); }
canvas.addEventListener('click', () => { if (gameState === 'gameOver') resetGame(); });
canvas.addEventListener('touchstart', () => { if (gameState === 'gameOver') resetGame(); });

initGameVariables();
gameLoop();