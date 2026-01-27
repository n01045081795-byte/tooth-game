// Version: 2.1.0 - Battle Engine Fixed
let enemies = [];
let missiles = [];
let weaponCD = new Array(8).fill(0);
let currentDungeonIdx = 0;
let currentWave = 1;
let isBossWave = false;
let dungeonActive = false;
let playerPos = { x: 50, y: 80 };
let currentMercenary = TOOTH_DATA.mercenaries[0];

function updateMercenary() {
    // 저장된 mercenaryIdx가 범위 내인지 확인
    if (!TOOTH_DATA.mercenaries[mercenaryIdx]) mercenaryIdx = 0;
    currentMercenary = TOOTH_DATA.mercenaries[mercenaryIdx];
    const p = document.getElementById('player');
    if(p) p.innerText = currentMercenary.icon;
}

function startDungeon(idx) {
    currentDungeonIdx = idx; currentWave = 1; isBossWave = false;
    enemies = []; missiles = []; dungeonActive = true;
    playerPos = { x: 50, y: 80 };
    
    document.getElementById('top-nav').style.display = 'none';
    document.getElementById('dungeon-list-container').style.display = 'none';
    document.getElementById('mercenary-camp').style.display = 'none';
    document.getElementById('battle-screen').style.display = 'flex';
    document.getElementById('current-dungeon-name').innerText = TOOTH_DATA.dungeons[idx];
    
    updateMercenary();
    const p = document.getElementById('player');
    p.style.left = playerPos.x + '%';
    p.style.top = playerPos.y + '%';
    
    renderWarWeapons();
    spawnWave();
}

function spawnWave() {
    if (!dungeonActive) return;
    document.getElementById('wave-info').innerText = isBossWave ? "BOSS RAID" : `WAVE ${currentWave}/5`;
    const count = isBossWave ? 1 : 5 + currentWave;
    for (let i = 0; i < count; i++) {
        setTimeout(() => { if(dungeonActive) spawnEnemy(isBossWave); }, i * 800);
    }
}

function spawnEnemy(isBoss = false) {
    const area = document.getElementById('enemy-spawn-area');
    if(!area) return;
    const enContainer = document.createElement('div');
    enContainer.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
    const baseHp = 100 * Math.pow(2.2, currentDungeonIdx); // 난이도 상향
    const maxHp = baseHp * (isBoss ? 20 : 1);
    
    enContainer.innerHTML = `
        <div class="hp-bar-bg"><div class="hp-bar-fill" style="width:100%"></div></div>
        <span>${isBoss ? '🐉' : '👾'}</span>
    `;
    area.appendChild(enContainer);
    
    enemies.push({ 
        el: enContainer, 
        hpFill: enContainer.querySelector('.hp-bar-fill'),
        x: 10 + Math.random() * 80, y: -20, isBoss, 
        hp: maxHp, maxHp: maxHp
    });
}

function updateBattle() {
    if (!dungeonActive) return;
    for (let i = 0; i < 8; i++) {
        if (inventory[i] > 0 && weaponCD[i] <= 0 && enemies.length > 0) {
            shoot(i);
            weaponCD[i] = Math.max(5, 25 - (inventory[i] * 0.5));
        }
        if (weaponCD[i] > 0) weaponCD[i]--;
    }

    missiles.forEach((m, mIdx) => {
        m.y -= 3.0; // 발사체 속도 증가
        m.el.style.left = m.x + '%'; m.el.style.top = m.y + '%';
        
        enemies.forEach((en, eIdx) => {
            const d = Math.sqrt(Math.pow(m.x - en.x, 2) + Math.pow(m.y - en.y, 2));
            if (d < 8) { // 피격 범위 확대
                en.hp -= m.dmg;
                en.hpFill.style.width = Math.max(0, (en.hp / en.maxHp * 100)) + '%';
                showDmgText(en.x, en.y, m.dmg);
                playSfx('hit');
                m.el.remove(); missiles.splice(mIdx, 1);
                
                if (en.hp <= 0) {
                    gold += (currentDungeonIdx + 1) * 100;
                    en.el.remove(); enemies.splice(eIdx, 1);
                    checkWaveClear();
                }
            }
        });
        if (m.y < -10) { m.el.remove(); missiles.splice(mIdx, 1); }
    });

    enemies.forEach(en => {
        en.y += en.isBoss ? 0.1 : 0.25;
        en.el.style.top = en.y + '%'; en.el.style.left = en.x + '%';
        if (en.y > 100) { en.y = -10; } // 화면 밖으로 나가면 다시 위로 (임시)
    });
}

function shoot(slotIdx) {
    playSfx('attack');
    const area = document.getElementById('enemy-spawn-area');
    const mEl = document.createElement('div');
    mEl.className = 'missile';
    mEl.innerText = '🦷'; // 치아 발사체
    area.appendChild(mEl);
    
    const finalDmg = getAtk(inventory[slotIdx]) * currentMercenary.atkMul;
    missiles.push({ el: mEl, x: playerPos.x, y: playerPos.y, dmg: finalDmg });
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
    document.getElementById('top-nav').style.display = 'grid';
    document.getElementById('dungeon-list-container').style.display = 'block';
    document.getElementById('mercenary-camp').style.display = 'block';
    
    // 던전 목록 갱신 (해금 반영)
    if(window.renderDungeonList) window.renderDungeonList();
}

function checkWaveClear() {
    if (enemies.length === 0) {
        if (isBossWave) {
            alert("던전 클리어! 다음 던전이 열립니다.");
            // 던전 해금 로직 수정
            if (unlockedDungeon <= currentDungeonIdx + 1) {
                unlockedDungeon = currentDungeonIdx + 2; 
            }
            saveGame(); // 즉시 저장
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

window.addEventListener('touchmove', (e) => {
    if (!dungeonActive) return;
    const map = document.getElementById('battle-map');
    const rect = map.getBoundingClientRect();
    const touch = e.touches[0];
    const targetX = ((touch.clientX - rect.left) / rect.width) * 100;
    const targetY = ((touch.clientY - rect.top) / rect.height) * 100;
    playerPos.x = Math.max(5, Math.min(95, targetX));
    playerPos.y = Math.max(10, Math.min(90, targetY));
    const p = document.getElementById('player');
    p.style.left = playerPos.x + '%'; p.style.top = playerPos.y + '%';
}, {passive: false});
