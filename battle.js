// Version: 1.5.0 - Battle System
let enemies = [];
let lastSpawnTime = 0;
let battleActive = false;

function spawnEnemy() {
    if (Date.now() - lastSpawnTime < 2000 / (1 + stage * 0.1)) {
        const area = document.getElementById('enemy-spawn-area');
        const enemy = document.createElement('div');
        enemy.className = 'battle-enemy';
        // 사방 랜덤 위치 계산
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
            hp: 50 * Math.pow(1.2, stage)
        });
        lastSpawnTime = Date.now();
    }
}

function moveEnemies() {
    enemies.forEach((en, index) => {
        const dx = 50 - en.x;
        const dy = 50 - en.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 5) {
            en.x += (dx / dist) * 0.5;
            en.y += (dy / dist) * 0.5;
            en.el.style.left = en.x + '%';
            en.el.style.top = en.y + '%';
        }
    });
}
