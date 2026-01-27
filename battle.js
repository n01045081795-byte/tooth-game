// Version: 1.8.4 - Combat Logic & Visuals
let enemies = [];
let missiles = [];
let weaponCD = new Array(8).fill(0);
let currentDungeonIdx = 0;
let currentWave = 1;
let isBossWave = false;
let dungeonActive = false;
let playerPos = { x: 50, y: 70 };

function startDungeon(idx) {
    currentDungeonIdx = idx; currentWave = 1; isBossWave = false;
    enemies = []; missiles = []; dungeonActive = true;
    playerPos = { x: 50, y: 75 };
    
    document.getElementById('battle-screen').style.display = 'flex';
    document.getElementById('current-dungeon-name').innerText = TOOTH_DATA.dungeons[idx];
    document.getElementById('player').style.left = playerPos.x + '%';
    document.getElementById('player').style.top = playerPos.y + '%';
    
    renderWarWeapons();
    spawnWave();
}

function spawnWave() {
    if (!dungeonActive) return;
    document.getElementById('wave-info').innerText = isBossWave ? "BOSS 등장!" : `WAVE ${currentWave}/5`;
    const count = isBossWave ? 1 : 4 + currentWave;
    for (let i = 0; i < count; i++) {
        setTimeout(() => { if(dungeonActive) spawnEnemy(isBossWave); }, i * 800);
    }
}

function spawnEnemy(isBoss = false) {
    const area = document.getElementById('enemy-spawn-area');
    const enContainer = document.createElement('div');
    enContainer.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
    
    const maxHp = (100 * Math.pow(1.8, currentDungeonIdx)) * (isBoss ? 15 : 1);
    
    enContainer.innerHTML = `
        <div class="hp-bar-bg"><div class="hp-bar-fill" style="width:100%"></div></div>
        <span>${isBoss ? '🐉' : '👾'}</span>
    `;
    area.appendChild(enContainer);
    
    const x = 10 + Math.random() * 80;
    const y = -10;
    
    enemies.push({ 
        el: enContainer, 
        hpFill: enContainer.querySelector('.hp-bar-fill'),
        x, y, isBoss, 
        hp: maxHp, maxHp: maxHp
    });
}

function updateBattle() {
    if (!dungeonActive) return;
    
    // 공격
    for (let i = 0; i < 8; i++) {
        if (inventory[i] > 0 && weaponCD[i] <= 0 && enemies.length > 0) {
            shoot(i);
            weaponCD[i] = Math.max(10, 30 - (inventory[i] * 0.5));
        }
        if (weaponCD[i] > 0) weaponCD[i]--;
    }

    // 미사일
    missiles.forEach((m, mIdx) => {
        m.y -= 2.5;
        m.el.style.left = m.x + '%';
        m.el.style.top = m.y + '%';
        
        enemies.forEach((en, eIdx) => {
            const d = Math.sqrt(Math.pow(m.x - en.x, 2) + Math.pow(m.y - en.y, 2));
            if (d < 8) {
                en.hp -= m.dmg;
                en.hpFill.style.width = (en.hp / en.maxHp * 100) + '%';
                showDmgText(en.x, en.y, m.dmg);
                
                m.el.remove();
                missiles.splice(mIdx, 1);
                
                if (en.hp <= 0) {
                    gold += (currentDungeonIdx + 1) * 30;
                    en.el.remove();
                    enemies.splice(eIdx, 1);
                    checkWaveClear();
                }
            }
        });
        if (m.y < -15) { m.el.remove(); missiles.splice(mIdx, 1); }
    });

    // 적 이동
    enemies.forEach(en => {
        en.y += en.isBoss ? 0.15 : 0.3;
        en.el.style.top = en.y + '%';
        en.el.style.left = en.x + '%';
    });
}

function showDmgText(x, y, dmg) {
    const area = document.getElementById('enemy-spawn-area');
    const txt = document.createElement('div');
    txt.className = 'dmg-text';
    txt.innerText = fNum(dmg);
    txt.style.left = x + '%';
    txt.style.top = (y - 5) + '%';
    area.appendChild(txt);
    setTimeout(() => txt.remove(), 500);
}

// 주인공 이동 (터치 드래그)
window.addEventListener('touchstart', (e) => {
    if (!dungeonActive) return;
    updatePlayerPos(e);
}, {passive: false});

window.addEventListener('touchmove', (e) => {
    if (!dungeonActive) return;
    e.preventDefault();
    updatePlayerPos(e);
}, {passive: false});

function updatePlayerPos(e) {
    const map = document.getElementById('battle-map');
    const rect = map.getBoundingClientRect();
    const touch = e.touches[0];
    playerPos.x = Math.max(5, Math.min(95, ((touch.clientX - rect.left) / rect.width) * 100));
    playerPos.y = Math.max(10, Math.min(90, ((touch.clientY - rect.top) / rect.height) * 100));
    const p = document.getElementById('player');
    p.style.left = playerPos.x + '%';
    p.style.top = playerPos.y + '%';
}

function shoot(slotIdx) {
    const area = document.getElementById('enemy-spawn-area');
    const mEl = document.createElement('div');
    mEl.className = 'missile';
    mEl.innerText = '🦷';
    area.appendChild(mEl);
    missiles.push({ el: mEl, x: playerPos.x, y: playerPos.y, dmg: getAtk(inventory[slotIdx]) });
}

function exitDungeon() {
    dungeonActive = false;
    enemies.forEach(en => en.el.remove());
    missiles.forEach(m => m.el.remove());
    enemies = []; missiles = [];
    document.getElementById('battle-screen').style.display = 'none';
}

function checkWaveClear() {
    if (enemies.length === 0) {
        if (isBossWave) {
            alert("던전 정복!");
            if (unlockedDungeon <= currentDungeonIdx) unlockedDungeon++;
            exitDungeon();
        } else {
            currentWave++;
            if (currentWave > 5) isBossWave = true;
            spawnWave();
        }
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
