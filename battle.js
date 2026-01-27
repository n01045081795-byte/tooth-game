// Version: 1.8.3 - Battle Engine (Dude Combat)
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
    playerPos = { x: 50, y: 70 }; // 시작 위치 아래쪽
    
    document.getElementById('battle-screen').style.display = 'flex';
    document.getElementById('player').style.left = playerPos.x + '%';
    document.getElementById('player').style.top = playerPos.y + '%';
    
    renderWarWeapons();
    spawnWave();
}

function spawnWave() {
    if (!dungeonActive) return;
    document.getElementById('wave-info').innerText = isBossWave ? "BOSS WAVE" : `WAVE ${currentWave}/5`;
    const count = isBossWave ? 1 : 5 + (currentWave * 2);
    for (let i = 0; i < count; i++) {
        setTimeout(() => { if(dungeonActive) spawnEnemy(isBossWave); }, i * 600);
    }
}

function spawnEnemy(isBoss = false) {
    const area = document.getElementById('enemy-spawn-area');
    const enEl = document.createElement('div');
    enEl.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
    enEl.innerText = isBoss ? '🐉' : '👾';
    area.appendChild(enEl);
    
    // 화면 위쪽에서 랜덤하게 등장
    const x = 10 + Math.random() * 80;
    const y = -10;
    
    enemies.push({ 
        el: enEl, x, y, isBoss, 
        hp: (100 * Math.pow(1.8, currentDungeonIdx)) * (isBoss ? 15 : 1) 
    });
}

function updateBattle() {
    if (!dungeonActive) return;
    
    // 무기 자동 발사 (8개 무기 순차적)
    for (let i = 0; i < 8; i++) {
        if (inventory[i] > 0 && weaponCD[i] <= 0 && enemies.length > 0) {
            shoot(i);
            weaponCD[i] = Math.max(5, 20 - (inventory[i] * 0.5));
        }
        if (weaponCD[i] > 0) weaponCD[i]--;
    }

    // 미사일 처리
    missiles.forEach((m, mIdx) => {
        m.y -= 3; // 위로 발사
        m.el.style.left = m.x + '%';
        m.el.style.top = m.y + '%';
        
        enemies.forEach((en, eIdx) => {
            const d = Math.sqrt(Math.pow(m.x - en.x, 2) + Math.pow(m.y - en.y, 2));
            if (d < 7) {
                en.hp -= m.dmg;
                m.el.remove();
                missiles.splice(mIdx, 1);
                if (en.hp <= 0) {
                    gold += (currentDungeonIdx + 1) * 50;
                    en.el.remove();
                    enemies.splice(eIdx, 1);
                    checkWaveClear();
                }
            }
        });

        if (m.y < -10) { m.el.remove(); missiles.splice(mIdx, 1); }
    });

    // 적 이동 (주인공을 향해)
    enemies.forEach(en => {
        en.y += en.isBoss ? 0.2 : 0.4;
        en.el.style.top = en.y + '%';
        en.el.style.left = en.x + '%';
        
        // 주인공과 충돌 체크 (패배 조건 예시)
        const d = Math.sqrt(Math.pow(playerPos.x - en.x, 2) + Math.pow(playerPos.y - en.y, 2));
        if (d < 5) {
            console.log("충돌!"); // 여기에 체력 감소 로직 추가 가능
        }
    });
}

// 주인공 이동 (화면 터치 드래그)
window.addEventListener('touchmove', (e) => {
    if (!dungeonActive) return;
    const map = document.getElementById('battle-map');
    const rect = map.getBoundingClientRect();
    const touch = e.touches[0];
    
    let nextX = ((touch.clientX - rect.left) / rect.width) * 100;
    let nextY = ((touch.clientY - rect.top) / rect.height) * 100;
    
    // 화면 범위 제한
    playerPos.x = Math.max(5, Math.min(95, nextX));
    playerPos.y = Math.max(5, Math.min(95, nextY));
    
    const p = document.getElementById('player');
    p.style.left = playerPos.x + '%';
    p.style.top = playerPos.y + '%';
}, { passive: false });

function shoot(slotIdx) {
    const area = document.getElementById('enemy-spawn-area');
    const mEl = document.createElement('div');
    mEl.className = 'missile';
    mEl.style.position = 'absolute';
    mEl.innerText = '🦷';
    mEl.style.fontSize = '20px';
    area.appendChild(mEl);

    missiles.push({
        el: mEl, x: playerPos.x, y: playerPos.y,
        dmg: getAtk(inventory[slotIdx])
    });
}

function checkWaveClear() {
    if (enemies.length === 0) {
        if (isBossWave) {
            alert("던전 정복 완료!");
            if (unlockedDungeon <= currentDungeonIdx) unlockedDungeon++;
            exitDungeon();
        } else {
            currentWave++;
            if (currentWave > 5) isBossWave = true;
            spawnWave();
        }
    }
}

function exitDungeon() {
    dungeonActive = false;
    enemies.forEach(en => en.el.remove());
    missiles.forEach(m => m.el.remove());
    enemies = []; missiles = [];
    document.getElementById('battle-screen').style.display = 'none';
    saveGame();
}
