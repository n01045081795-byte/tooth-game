// Version: 1.5.1 - Battle System
let enemies = [];
let lastSpawnTime = 0;
let currentEnemyHp = 100;

function spawnEnemy() {
    const area = document.getElementById('enemy-spawn-area');
    if (!area || Date.now() - lastSpawnTime < 1500) return;

    const enemy = document.createElement('div');
    enemy.className = 'battle-enemy';
    
    // 사방 랜덤 위치
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if(side === 0) { x = Math.random() * 100; y = -10; }
    else if(side === 1) { x = 110; y = Math.random() * 100; }
    else if(side === 2) { x = Math.random() * 100; y = 110; }
    else { x = -10; y = Math.random() * 100; }
    
    enemy.style.left = x + '%';
    enemy.style.top = y + '%';
    enemy.innerText = '👾';
    area.appendChild(enemy);
    
    enemies.push({
        el: enemy,
        x: x, y: y,
        hp: 50 * Math.pow(1.3, stage)
    });
    lastSpawnTime = Date.now();
}

function updateBattle() {
    const warrior = document.getElementById('player');
    enemies.forEach((en, index) => {
        const dx = 50 - en.x;
        const dy = 50 - en.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 5) {
            en.x += (dx / dist) * 0.4;
            en.y += (dy / dist) * 0.4;
            en.el.style.left = en.x + '%';
            en.el.style.top = en.y + '%';
        }
    });
}

function renderWarWeapons() {
    const container = document.getElementById('war-weapon-slots');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.className = 'war-slot';
        slot.innerHTML = getToothIcon(inventory[i]);
        container.appendChild(slot);
    }
}
