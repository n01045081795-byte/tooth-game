// Version: 2.4.0 - Battle with Refine Stats
let enemies = [];
let missiles = [];
let weaponCD = new Array(8).fill(0);
let currentDungeonIdx = 0;
let currentWave = 1;
let isBossWave = false;
let dungeonActive = false;
let playerPos = { x: 50, y: 80 };
let currentMercenary = TOOTH_DATA.mercenaries[0];

// 순차 발사
let fireIndex = 0;
let fireTimer = 0;
const FIRE_RATE = 200;

function startDungeon(idx) {
    currentDungeonIdx = idx; currentWave = 1; isBossWave = false;
    enemies = []; missiles = []; dungeonActive = true;
    playerPos = { x: 50, y: 80 };
    fireIndex = 0; fireTimer = 0;
    
    document.getElementById('top-nav').style.display = 'none';
    document.getElementById('dungeon-list-container').style.display = 'none';
    document.getElementById('mercenary-camp').style.display = 'none';
    document.getElementById('battle-screen').style.display = 'flex';
    document.getElementById('current-dungeon-name').innerText = TOOTH_DATA.dungeons[idx];
    
    updateMercenary();
    const p = document.getElementById('player');
    p.style.left = playerPos.x + '%'; p.style.top = playerPos.y + '%';
    
    renderWarWeapons();
    spawnWave();
}

function updateMercenary() {
    if (!TOOTH_DATA.mercenaries[mercenaryIdx]) mercenaryIdx = 0;
    currentMercenary = TOOTH_DATA.mercenaries[mercenaryIdx];
    const p = document.getElementById('player');
    if(p) p.innerText = currentMercenary.icon;
}

function spawnWave() {
    if (!dungeonActive) return;
    document.getElementById('wave-info').innerText = isBossWave ? "BOSS RAID" : `WAVE ${currentWave}/5`;
    const count = isBossWave ? 1 : 5 + currentWave;
    for (let i = 0; i < count; i++) {
        setTimeout(() => { if(dungeonActive) spawnEnemy(isBossWave); }, i * 1000);
    }
}

function spawnEnemy(isBoss = false) {
    const area = document.getElementById('enemy-spawn-area');
    if(!area) return;
    const enContainer = document.createElement('div');
    enContainer.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
    const baseHp = 100 * Math.pow(2.2, currentDungeonIdx);
    const maxHp = baseHp * (isBoss ? 20 : 1);
    
    enContainer.innerHTML = `<div class="hp-bar-bg"><div class="hp-bar-fill" style="width:100%"></div></div><span>${isBoss ? '🐉' : '👾'}</span>`;
    area.appendChild(enContainer);
    enemies.push({ el: enContainer, hpFill: enContainer.querySelector('.hp-bar-fill'), x: 10 + Math.random() * 80, y: -20, isBoss, hp: maxHp, maxHp: maxHp });
}

function updateBattle() {
    if (!dungeonActive) return;
    
    fireTimer += 50; 
    if (fireTimer >= FIRE_RATE) {
        fireTimer = 0;
        
        // 제련 쿨타임 감소 적용
        // slotUpgrades[fireIndex].cd 만큼 쿨타임 감소 효과 (확률적 더블 샷 등으로 구현 가능하지만 여기선 단순 발사)
        if (inventory[fireIndex] > 0) {
            shoot(fireIndex);
            
            // 쿨타임 레벨이 높으면 확률적으로 한 번 더 발사 (간단한 구현)
            if (Math.random() < slotUpgrades[fireIndex].cd * 0.05) {
                setTimeout(() => shoot(fireIndex), 100);
            }
        }
        fireIndex = (fireIndex + 1) % 8;
        highlightFireSlot(fireIndex);
    }

    missiles.forEach((m, mIdx) => {
        m.y -= 3.0; // 기본 속도
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
                    gold += (currentDungeonIdx + 1) * 100;
                    en.el.remove(); enemies.splice(eIdx, 1);
                    checkWaveClear();
                }
            }
        });
        // 제련 사거리 증가 적용 (화면 위로 더 멀리 날아감 - 판정은 유지하되 삭제 시점 연장)
        const rangeLimit = -10 - (slotUpgrades[m.slotIdx].rng * 2);
        if (m.y < rangeLimit) { m.el.remove(); missiles.splice(mIdx, 1); }
    });

    enemies.forEach(en => {
        en.y += en.isBoss ? 0.1 : 0.25;
        en.el.style.top = en.y + '%'; en.el.style.left = en.x + '%';
    });
}

function shoot(slotIdx) {
    playSfx('attack');
    const area = document.getElementById('enemy-spawn-area');
    const mEl = document.createElement('div');
    mEl.className = 'missile';
    mEl.innerHTML = getToothIcon(inventory[slotIdx]);
    mEl.style.fontSize = "20px";
    area.appendChild(mEl);
    
    // ★ 제련 공격력 적용 ★
    // 기본 데미지 * 용병 배율 * (1 + 제련레벨 * 0.1)
    let refineMul = 1 + (slotUpgrades[slotIdx].atk * 0.1);
    const finalDmg = getAtk(inventory[slotIdx]) * currentMercenary.atkMul * refineMul;
    
    missiles.push({ el: mEl, x: playerPos.x, y: playerPos.y, dmg: finalDmg, slotIdx: slotIdx });
}

function highlightFireSlot(idx) {
    document.querySelectorAll('.war-slot').forEach(s => s.style.borderColor = '#e94560');
    const slots = document.querySelectorAll('.war-slot');
    if(slots[idx]) slots[idx].style.borderColor = '#fff';
}

function showDmgText(x, y, dmg) {
    const area = document.getElementById('enemy-spawn-area');
    const txt = document.createElement('div');
    txt.className = 'dmg-text'; txt.innerText = fNum(dmg);
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
    if(window.renderDungeonList) window.renderDungeonList();
}

function checkWaveClear() {
    if (enemies.length === 0) {
        if (isBossWave) {
            alert("던전 클리어!");
            if (unlockedDungeon <= currentDungeonIdx + 1) { unlockedDungeon = currentDungeonIdx + 2; }
            saveGame(); exitDungeon();
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
