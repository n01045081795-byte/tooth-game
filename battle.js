// Version: 1.8.2 - Battle Engine with Player Movement
let enemies = [];
let missiles = [];
let weaponCD = new Array(8).fill(0);
let currentDungeonIdx = 0;
let currentWave = 1;
let isBossWave = false;
let dungeonActive = false;
let playerPos = { x: 50, y: 50 };

function startDungeon(idx) {
    currentDungeonIdx = idx; currentWave = 1; isBossWave = false;
    enemies = []; missiles = []; dungeonActive = true;
    playerPos = { x: 50, y: 50 };
    document.getElementById('dungeon-list').style.display = 'none';
    document.getElementById('battle-screen').style.display = 'block';
    document.getElementById('inventory-container').style.display = 'none';
    document.getElementById('action-bar').style.display = 'none';
    renderWarWeapons();
    spawnWave();
}

function spawnWave() {
    if (!dungeonActive) return;
    const count = isBossWave ? 1 : 5 + currentWave * 2;
    for (let i = 0; i < count; i++) {
        setTimeout(() => { if(dungeonActive) spawnEnemy(isBossWave); }, i * 500);
    }
}

function spawnEnemy(isBoss = false) {
    const area = document.getElementById('enemy-spawn-area');
    if (!area) return;
    const enEl = document.createElement('div');
    enEl.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
    enEl.innerText = isBoss ? '👹' : '👾';
    area.appendChild(enEl);
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if(side === 0) { x = Math.random()*100; y = -10; }
    else if(side === 1) { x = 110; y = Math.random()*100; }
    else if(side === 2) { x = Math.random()*100; y = 110; }
    else { x = -10; y = Math.random()*100; }
    enemies.push({ el: enEl, x, y, isBoss, hp: (50 * Math.pow(1.6, currentDungeonIdx)) * (isBoss ? 12 : 1) });
}

function updateBattle() {
    if (!dungeonActive) return;
    for (let i = 0; i < 8; i++) {
        if (inventory[i] > 0 && weaponCD[i] <= 0 && enemies.length > 0) {
            shoot(i); weaponCD[i] = Math.max(8, 25 - inventory[i]);
        }
        if (weaponCD[i] > 0) weaponCD[i]--;
    }
    
    // 미사일 이동
    missiles.forEach((m, mIdx) => {
        m.x += m.vx; m.y += m.vy;
        m.el.style.left = m.x + '%'; m.el.style.top = m.y + '%';
        enemies.forEach((en, eIdx) => {
            const d = Math.sqrt((m.x - en.x)**2 + (m.y - en.y)**2);
            if (d < 6) {
                en.hp -= m.dmg; m.el.remove(); missiles.splice(mIdx, 1);
                if (en.hp <= 0) { gold += (currentDungeonIdx + 1) * 20; en.el.remove(); enemies.splice(eIdx, 1); checkWaveClear(); }
            }
        });
        if (m.x < -20 || m.x > 120 || m.y < -20 || m.y > 120) { m.el.remove(); missiles.splice(mIdx, 1); }
    });
    
    // 적 이동 (플레이어 추적)
    enemies.forEach(en => {
        const dx = playerPos.x - en.x; const dy = playerPos.y - en.y; const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 2) { en.x += (dx/dist) * (en.isBoss ? 0.2 : 0.5); en.el.style.left = en.x + '%'; en.el.style.top = en.y + '%'; }
    });
}

function handleBattleTouch(e) {
    if(!dungeonActive) return;
    const rect = document.getElementById('battle-map').getBoundingClientRect();
    const touch = e.touches[0];
    playerPos.x = ((touch.clientX - rect.left) / rect.width) * 100;
    playerPos.y = ((touch.clientY - rect.top) / rect.height) * 100;
    const p = document.getElementById('player');
    p.style.left = playerPos.x + '%';
    p.style.top = playerPos.y + '%';
}

function shoot(slotIdx) {
    const target = enemies[0];
    const area = document.getElementById('enemy-spawn-area');
    const mEl = document.createElement('div');
    mEl.className = 'missile'; mEl.innerText = '✨';
    area.appendChild(mEl);
    const angle = Math.atan2(target.y - playerPos.y, target.x - playerPos.x);
    missiles.push({ el: mEl, x: playerPos.x, y: playerPos.y, vx: Math.cos(angle) * 3.5, vy: Math.sin(angle) * 3.5, dmg: getAtk(inventory[slotIdx]) });
}

function exitDungeon() {
    dungeonActive = false;
    enemies.forEach(en => en.el.remove()); missiles.forEach(m => m.el.remove());
    enemies = []; missiles = [];
    document.getElementById('battle-screen').style.display = 'none';
    document.getElementById('dungeon-list').style.display = 'block';
    document.getElementById('inventory-container').style.display = 'block';
    document.getElementById('action-bar').style.display = 'grid';
    renderDungeonList();
}

function checkWaveClear() {
    if (enemies.length === 0) {
        if (isBossWave) { alert("던전 클리어!"); if (unlockedDungeon <= currentDungeonIdx) unlockedDungeon++; exitDungeon(); }
        else { currentWave++; if (currentWave > 5) isBossWave = true; spawnWave(); }
    }
}

function renderWarWeapons() {
    const container = document.getElementById('war-weapon-slots');
    container.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.className = 'war-slot';
        slot.innerHTML = getToothIcon(inventory[i]);
        container.appendChild(slot);
    }
}
