// Version: 3.1.0 - Visual Fixes & Effects
let enemies = [];
let missiles = [];
let weaponCD = new Array(8).fill(0);
let currentDungeonIdx = 0;
let currentWave = 1;
let isBossWave = false;
let dungeonActive = false;

// 월드 및 플레이어
let worldWidth = window.innerWidth * 2;
let worldHeight = window.innerHeight * 2;
let playerX = 0; let playerY = 0;
let currentMercenary = TOOTH_DATA.mercenaries[0];

// 조이스틱
let joystickActive = false;
let joyStartX = 0; let joyStartY = 0;
let moveX = 0; let moveY = 0;

// 순차 발사
let fireIndex = 0;
let fireTimer = 0;
const FIRE_RATE = 200;

function startDungeon(idx) {
    currentDungeonIdx = idx; currentWave = 1; isBossWave = false;
    enemies = []; missiles = []; dungeonActive = true;
    
    // 월드 크기 갱신
    worldWidth = window.innerWidth * 2;
    worldHeight = window.innerHeight * 2;
    playerX = worldWidth / 2;
    playerY = worldHeight / 2;
    
    // UI 전환
    document.getElementById('top-nav').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('battle-screen').style.display = 'block';
    document.getElementById('current-dungeon-name').innerText = TOOTH_DATA.dungeons[idx];
    
    // 플레이어 생성 (DOM에 없으면 추가)
    let playerEl = document.getElementById('player');
    if (!playerEl) {
        playerEl = document.createElement('div');
        playerEl.id = 'player';
        document.getElementById('battle-world').appendChild(playerEl);
    }
    updateMercenary();
    updatePlayerPos(); // 초기 위치 설정
    
    // 무기 슬롯 렌더링
    renderWarWeapons();
    weaponCD.fill(0);
    
    spawnWave();
    setupJoystick();
    requestAnimationFrame(battleLoop);
}

function updateMercenary() {
    if (!TOOTH_DATA.mercenaries[mercenaryIdx]) mercenaryIdx = 0;
    currentMercenary = TOOTH_DATA.mercenaries[mercenaryIdx];
    document.getElementById('player').innerText = currentMercenary.icon;
}

function updatePlayerPos() {
    const p = document.getElementById('player');
    p.style.left = playerX + 'px';
    p.style.top = playerY + 'px';
}

function spawnWave() {
    if (!dungeonActive) return;
    document.getElementById('wave-info').innerText = isBossWave ? "☠️ BOSS ☠️" : `WAVE ${currentWave}/5`;
    const count = isBossWave ? 1 : 5 + (currentWave * 2);
    for (let i = 0; i < count; i++) {
        setTimeout(() => { if(dungeonActive) spawnEnemy(isBossWave); }, i * 800);
    }
}

function spawnEnemy(isBoss = false) {
    const worldDiv = document.getElementById('battle-world');
    const en = document.createElement('div');
    en.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
    
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.min(worldWidth, worldHeight) / 2 - 50;
    let sx = (worldWidth / 2) + Math.cos(angle) * dist;
    let sy = (worldHeight / 2) + Math.sin(angle) * dist;
    
    const baseHp = 100 * Math.pow(2.5, currentDungeonIdx);
    const maxHp = baseHp * (isBoss ? 30 : 1);
    
    en.innerHTML = `<div class="hp-bar-bg"><div class="hp-bar-fill" style="width:100%"></div></div><span>${isBoss ? '🐉' : '👾'}</span>`;
    en.style.left = sx + 'px';
    en.style.top = sy + 'px';
    worldDiv.appendChild(en); // 월드에 추가
    
    enemies.push({ el: en, hpFill: en.querySelector('.hp-bar-fill'), x: sx, y: sy, isBoss, hp: maxHp, maxHp: maxHp });
}

function battleLoop() {
    if (!dungeonActive) return;
    updatePlayerMovement();
    updateCamera();
    updateCombat();
    requestAnimationFrame(battleLoop);
}

function updatePlayerMovement() {
    if (moveX === 0 && moveY === 0) {
        document.getElementById('player').classList.remove('walking');
        return;
    }
    const speed = 4 * currentMercenary.spd;
    playerX += moveX * speed;
    playerY += moveY * speed;
    playerX = Math.max(20, Math.min(worldWidth - 20, playerX));
    playerY = Math.max(20, Math.min(worldHeight - 20, playerY));
    updatePlayerPos();
    const p = document.getElementById('player');
    p.classList.add('walking');
    p.style.transform = moveX < 0 ? 'translate(-50%, -50%) scaleX(-1)' : 'translate(-50%, -50%) scaleX(1)';
}

function updateCamera() {
    const camX = playerX - window.innerWidth / 2;
    const camY = playerY - window.innerHeight / 2;
    document.getElementById('battle-world').style.transform = `translate(${-camX}px, ${-camY}px)`;
}

function updateCombat() {
    // 적 이동
    enemies.forEach(en => {
        const dx = playerX - en.x;
        const dy = playerY - en.y;
        const angle = Math.atan2(dy, dx);
        const speed = en.isBoss ? 1.5 : 2.0;
        en.x += Math.cos(angle) * speed;
        en.y += Math.sin(angle) * speed;
        en.el.style.left = en.x + 'px';
        en.el.style.top = en.y + 'px';
    });

    // 쿨타임 및 발사
    let nearest = null; let minDst = Infinity;
    enemies.forEach(en => {
        const d = Math.hypot(playerX - en.x, playerY - en.y);
        if (d < minDst) { minDst = d; nearest = en; }
    });

    for (let i = 0; i < 8; i++) {
        const maxCD = Math.max(20, 100 - (inventory[i] * 2) - (slotUpgrades[i].cd * 5));
        
        // 쿨타임 증가
        if (weaponCD[i] < maxCD) weaponCD[i]++;
        
        // 쿨타임 UI 업데이트 (검은 막 높이 조절)
        const slotEl = document.getElementById(`war-slot-${i}`);
        if (slotEl) {
            const mask = slotEl.querySelector('.cd-overlay');
            const percent = 100 - (weaponCD[i] / maxCD * 100);
            mask.style.height = `${percent}%`;
            
            if (weaponCD[i] >= maxCD) slotEl.classList.add('ready');
            else slotEl.classList.remove('ready');
        }

        if (weaponCD[i] >= maxCD && inventory[i] > 0 && nearest) {
            const range = 300 + (slotUpgrades[i].rng * 20);
            if (minDst <= range) {
                shoot(i, nearest);
                weaponCD[i] = 0; // 발사 후 리셋
            }
        }
    }

    // 미사일
    for (let i = missiles.length - 1; i >= 0; i--) {
        const m = missiles[i];
        m.x += m.vx; m.y += m.vy;
        m.el.style.left = m.x + 'px'; m.el.style.top = m.y + 'px';
        if (Math.hypot(m.x - m.startX, m.y - m.startY) > 1000) { m.el.remove(); missiles.splice(i, 1); continue; }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const en = enemies[j];
            if (Math.hypot(m.x - en.x, m.y - en.y) < 30) {
                en.hp -= m.dmg;
                en.hpFill.style.width = Math.max(0, (en.hp / en.maxHp * 100)) + '%';
                showDmgText(en.x, en.y, m.dmg);
                playSfx('hit');
                m.el.remove(); missiles.splice(i, 1);
                
                if (en.hp <= 0) {
                    const gain = (currentDungeonIdx + 1) * 100;
                    gold += gain;
                    showGoldText(en.x, en.y, gain); // 골드 팝업
                    en.el.remove(); enemies.splice(j, 1);
                    checkWaveClear();
                }
                break;
            }
        }
    }
}

function shoot(slotIdx, target) {
    playSfx('attack');
    const worldDiv = document.getElementById('battle-world');
    const mEl = document.createElement('div');
    mEl.className = 'missile';
    mEl.innerHTML = getToothIcon(inventory[slotIdx]);
    worldDiv.appendChild(mEl);
    
    const angle = Math.atan2(target.y - playerY, target.x - playerX);
    const speed = 15;
    let refineMul = 1 + (slotUpgrades[slotIdx].atk * 0.1);
    const dmg = getAtk(inventory[slotIdx]) * currentMercenary.atkMul * refineMul;
    
    missiles.push({ el: mEl, x: playerX, y: playerY, startX: playerX, startY: playerY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg: dmg });
}

function showDmgText(x, y, dmg) {
    const worldDiv = document.getElementById('battle-world');
    const txt = document.createElement('div');
    txt.className = 'dmg-text'; txt.innerText = fNum(dmg);
    txt.style.left = x + 'px'; txt.style.top = (y - 40) + 'px';
    worldDiv.appendChild(txt);
    setTimeout(() => txt.remove(), 500);
}

function showGoldText(x, y, val) {
    playSfx('merge'); // 따릉 소리 대용
    const worldDiv = document.getElementById('battle-world');
    const txt = document.createElement('div');
    txt.className = 'gold-text'; txt.innerText = `💰+${fNum(val)}`;
    txt.style.left = x + 'px'; txt.style.top = (y - 50) + 'px';
    worldDiv.appendChild(txt);
    setTimeout(() => txt.remove(), 800);
}

function checkWaveClear() {
    if (enemies.length === 0) {
        if (isBossWave) {
            // 결과창 표시
            showResultModal();
        } else {
            currentWave++;
            if (currentWave > 5) isBossWave = true;
            spawnWave();
        }
    }
}

function showResultModal() {
    dungeonActive = false; // 전투 중지
    document.getElementById('dungeon-result-modal').style.display = 'flex';
    document.getElementById('result-title').innerText = `${TOOTH_DATA.dungeons[currentDungeonIdx]} CLEAR!`;
    const next = TOOTH_DATA.dungeons[currentDungeonIdx + 1];
    document.getElementById('result-desc').innerText = next ? `다음 던전: ${next} 오픈!` : "모든 던전을 정복했습니다!";
    
    // 던전 해금 및 저장
    if (unlockedDungeon <= currentDungeonIdx + 1) unlockedDungeon = currentDungeonIdx + 2;
    saveGame();
}

function closeResultModal() {
    document.getElementById('dungeon-result-modal').style.display = 'none';
    exitDungeon();
}

function exitDungeon() {
    dungeonActive = false;
    enemies.forEach(en => en.el.remove()); missiles.forEach(m => m.el.remove());
    enemies = []; missiles = [];
    document.getElementById('battle-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    document.getElementById('top-nav').style.display = 'grid';
    if(window.renderDungeonList) window.renderDungeonList();
}

function renderWarWeapons() {
    const container = document.getElementById('war-weapon-slots');
    container.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.className = 'war-slot';
        slot.id = `war-slot-${i}`;
        // 쿨타임 오버레이 추가
        slot.innerHTML = `<div class="cd-overlay"></div>` + getToothIcon(inventory[i]);
        container.appendChild(slot);
    }
}

function setupJoystick() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    let touchId = null;
    
    const handleStart = (e) => {
        e.preventDefault();
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        touchId = touch.identifier;
        joystickActive = true;
        updateKnob(touch.clientX, touch.clientY);
    };
    const handleMove = (e) => {
        if (!joystickActive) return;
        e.preventDefault();
        const touch = e.changedTouches ? Array.from(e.changedTouches).find(t => t.identifier === touchId) : e;
        if (touch) updateKnob(touch.clientX, touch.clientY);
    };
    const handleEnd = (e) => { e.preventDefault(); joystickActive = false; moveX = 0; moveY = 0; knob.style.transform = `translate(-50%, -50%)`; knob.style.left = '50%'; knob.style.top = '50%'; };
    
    const updateKnob = (cx, cy) => {
        const rect = zone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = cx - centerX; let dy = cy - centerY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxDist = rect.width / 2 - 25;
        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, maxDist);
        moveX = Math.cos(angle) * (clampedDist / maxDist);
        moveY = Math.sin(angle) * (clampedDist / maxDist);
        const kx = Math.cos(angle) * clampedDist; const ky = Math.sin(angle) * clampedDist;
        knob.style.transform = `translate(-50%, -50%) translate(${kx}px, ${ky}px)`;
    };
    zone.addEventListener('touchstart', handleStart); zone.addEventListener('touchmove', handleMove); zone.addEventListener('touchend', handleEnd);
    zone.addEventListener('mousedown', handleStart); window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleEnd);
}
