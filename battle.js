// Version: 1.9.0 - Battle Engine Fixed
let enemies = [];
let missiles = [];
let weaponCD = new Array(8).fill(0);
let currentDungeonIdx = 0;
let currentWave = 1;
let isBossWave = false;
let dungeonActive = false;
let playerPos = { x: 50, y: 70 };

function renderDungeonList() {
    const list = document.getElementById('dungeon-list');
    if (!list) return;
    list.innerHTML = ''; // 초기화
    TOOTH_DATA.dungeons.forEach((name, idx) => {
        const div = document.createElement('div');
        const isUnlocked = idx < unlockedDungeon;
        div.className = `dungeon-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        if (isUnlocked) {
            div.innerHTML = `<h4>⚔️ ${name}</h4><p>권장 공격력: Lv.${idx + 1} 이상</p>`;
            div.onclick = () => startDungeon(idx);
        } else {
            div.innerHTML = `<h4>🔒 잠긴 던전</h4><p>Lv.${idx} 던전 클리어 시 해금</p>`;
        }
        list.appendChild(div);
    });
}

function startDungeon(idx) {
    currentDungeonIdx = idx; currentWave = 1; isBossWave = false;
    enemies = []; missiles = []; dungeonActive = true;
    playerPos = { x: 50, y: 75 };
    
    // UI 전환
    document.getElementById('dungeon-list-container').style.display = 'none';
    document.getElementById('battle-screen').style.display = 'flex';
    document.getElementById('current-dungeon-name').innerText = TOOTH_DATA.dungeons[idx];
    
    // 플레이어 초기화
    const p = document.getElementById('player');
    p.style.left = playerPos.x + '%';
    p.style.top = playerPos.y + '%';
    
    renderWarWeapons();
    spawnWave();
}

function spawnWave() {
    if (!dungeonActive) return;
    document.getElementById('wave-info').innerText = isBossWave ? "BOSS WAVE" : `WAVE ${currentWave}/5`;
    const count = isBossWave ? 1 : 5 + currentWave;
    for (let i = 0; i < count; i++) {
        setTimeout(() => { if(dungeonActive) spawnEnemy(isBossWave); }, i * 800);
    }
}

function spawnEnemy(isBoss = false) {
    const area = document.getElementById('enemy-spawn-area');
    const enContainer = document.createElement('div');
    enContainer.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
    const hp = (100 * Math.pow(1.8, currentDungeonIdx)) * (isBoss ? 15 : 1);
    
    enContainer.innerHTML = `
        <div class="hp-bar-bg"><div class="hp-bar-fill" style="width:100%"></div></div>
        <span>${isBoss ? '🐉' : '👾'}</span>
    `;
    area.appendChild(enContainer);
    
    enemies.push({ 
        el: enContainer, 
        hpFill: enContainer.querySelector('.hp-bar-fill'),
        x: 10 + Math.random() * 80, y: -10, isBoss, 
        hp: hp, maxHp: hp
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

    // 미사일 이동 및 충돌
    missiles.forEach((m, mIdx) => {
        m.y -= 2.5;
        m.el.style.left = m.x + '%'; m.el.style.top = m.y + '%';
        
        enemies.forEach((en, eIdx) => {
            const d = Math.sqrt(Math.pow(m.x - en.x, 2) + Math.pow(m.y - en.y, 2));
            if (d < 8) {
                en.hp -= m.dmg;
                en.hpFill.style.width = Math.max(0, (en.hp / en.maxHp * 100)) + '%';
                showDmgText(en.x, en.y, m.dmg);
                playSfx('hit');
                
                m.el.remove(); missiles.splice(mIdx, 1);
                
                if (en.hp <= 0) {
                    gold += (currentDungeonIdx + 1) * 30;
                    en.el.remove(); enemies.splice(eIdx, 1);
                    checkWaveClear();
                }
            }
        });
        if (m.y < -10) { m.el.remove(); missiles.splice(mIdx, 1); }
    });

    // 적 이동
    enemies.forEach(en => {
        en.y += en.isBoss ? 0.15 : 0.3;
        en.el.style.top = en.y + '%'; en.el.style.left = en.x + '%';
    });
}

function shoot(slotIdx) {
    playSfx('attack');
    const area = document.getElementById('enemy-spawn-area');
    const mEl = document.createElement('div');
    mEl.className = 'missile';
    mEl.innerText = '🦷';
    area.appendChild(mEl);
    missiles.push({ el: mEl, x: playerPos.x, y: playerPos.y, dmg: getAtk(inventory[slotIdx]) });
}

function showDmgText(x, y, dmg) {
    const area = document.getElementById('enemy-spawn-area');
    const txt = document.createElement('div');
    txt.className = 'dmg-text';
    txt.innerText = fNum(dmg);
    txt.style.left = x + '%'; txt.style.top = (y - 5) + '%';
    area.appendChild(txt);
    setTimeout(() => txt.remove(), 500);
}

function exitDungeon() {
    dungeonActive = false;
    enemies.forEach(en => en.el.remove()); missiles.forEach(m => m.el.remove());
    enemies = []; missiles = [];
    document.getElementById('battle-screen').style.display = 'none';
    document.getElementById('dungeon-list-container').style.display = 'block';
    renderDungeonList();
}

function checkWaveClear() {
    if (enemies.length === 0) {
        if (isBossWave) {
            alert("던전 정복 성공!");
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

// 플레이어 이동 (터치)
window.addEventListener('touchmove', (e) => {
    if (!dungeonActive) return;
    const map = document.getElementById('battle-map');
    const rect = map.getBoundingClientRect();
    const touch = e.touches[0];
    playerPos.x = Math.max(5, Math.min(95, ((touch.clientX - rect.left) / rect.width) * 100));
    playerPos.y = Math.max(10, Math.min(90, ((touch.clientY - rect.top) / rect.height) * 100));
    const p = document.getElementById('player');
    p.style.left = playerPos.x + '%'; p.style.top = playerPos.y + '%';
}, {passive: false});
