// Version: 3.0.0 - Open World & Smart Combat
let enemies = [];
let missiles = [];
let weaponCD = new Array(8).fill(0);
let currentDungeonIdx = 0;
let currentWave = 1;
let isBossWave = false;
let dungeonActive = false;

// 월드 설정 (화면의 2배 크기)
let worldWidth = window.innerWidth * 2;
let worldHeight = window.innerHeight * 2;
let playerX = worldWidth / 2;
let playerY = worldHeight / 2;
let currentMercenary = TOOTH_DATA.mercenaries[0];

// 조이스틱 변수
let joystickActive = false;
let joyStartX = 0; let joyStartY = 0;
let moveX = 0; let moveY = 0; // -1 ~ 1

function startDungeon(idx) {
    currentDungeonIdx = idx; currentWave = 1; isBossWave = false;
    enemies = []; missiles = []; dungeonActive = true;
    
    // 월드 크기 재계산 (반응형)
    worldWidth = window.innerWidth * 2;
    worldHeight = window.innerHeight * 2;
    playerX = worldWidth / 2;
    playerY = worldHeight / 2;
    
    // UI 전환
    document.getElementById('top-nav').style.display = 'none';
    document.getElementById('game-container').style.display = 'none'; // 메인 컨테이너 숨김
    document.getElementById('battle-screen').style.display = 'block';
    
    document.getElementById('current-dungeon-name').innerText = TOOTH_DATA.dungeons[idx];
    updateMercenary();
    renderWarWeapons();
    
    // 쿨타임 초기화
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
    
    // 사방에서 스폰 (월드 가장자리 근처)
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(worldWidth, worldHeight) / 2 - 50;
    let sx = (worldWidth / 2) + Math.cos(angle) * dist;
    let sy = (worldHeight / 2) + Math.sin(angle) * dist;
    
    // 범위 제한
    sx = Math.max(20, Math.min(worldWidth - 20, sx));
    sy = Math.max(20, Math.min(worldHeight - 20, sy));
    
    const baseHp = 100 * Math.pow(2.5, currentDungeonIdx);
    const maxHp = baseHp * (isBoss ? 30 : 1);
    
    en.innerHTML = `<div class="hp-bar-bg"><div class="hp-bar-fill" style="width:100%"></div></div><span>${isBoss ? '🐉' : '👾'}</span>`;
    en.style.left = sx + 'px';
    en.style.top = sy + 'px';
    worldDiv.appendChild(en);
    
    enemies.push({ el: en, hpFill: en.querySelector('.hp-bar-fill'), x: sx, y: sy, isBoss, hp: maxHp, maxHp: maxHp });
}

// 전투 메인 루프
function battleLoop() {
    if (!dungeonActive) return;
    
    updatePlayerMovement();
    updateCamera();
    updateCombat(); // 무기 발사 및 적 이동
    
    requestAnimationFrame(battleLoop);
}

function updatePlayerMovement() {
    if (moveX === 0 && moveY === 0) {
        document.getElementById('player').classList.remove('walking');
        return;
    }
    
    const speed = 3 * currentMercenary.spd; // 용병 속도 적용
    playerX += moveX * speed;
    playerY += moveY * speed;
    
    // 맵 밖으로 못 나가게
    playerX = Math.max(20, Math.min(worldWidth - 20, playerX));
    playerY = Math.max(20, Math.min(worldHeight - 20, playerY));
    
    const p = document.getElementById('player');
    p.style.left = playerX + 'px';
    p.style.top = playerY + 'px';
    p.classList.add('walking');
    
    // 좌우 반전
    if (moveX < 0) p.style.transform = 'translate(-50%, -50%) scaleX(-1)';
    else p.style.transform = 'translate(-50%, -50%) scaleX(1)';
}

function updateCamera() {
    // 플레이어가 화면 중앙에 오도록 월드 이동
    const camX = playerX - window.innerWidth / 2;
    const camY = playerY - window.innerHeight / 2;
    
    // 카메라가 월드 밖을 비추지 않도록 클램핑 (선택사항, 지금은 자유롭게 둠)
    // const clampedX = Math.max(0, Math.min(worldWidth - window.innerWidth, camX));
    // const clampedY = Math.max(0, Math.min(worldHeight - window.innerHeight, camY));
    
    document.getElementById('battle-world').style.transform = `translate(${-camX}px, ${-camY}px)`;
}

// ★ 스마트 사격 로직 ★
function updateCombat() {
    // 1. 적 이동 (주인공 향해)
    enemies.forEach(en => {
        const dx = playerX - en.x;
        const dy = playerY - en.y;
        const angle = Math.atan2(dy, dx);
        const speed = en.isBoss ? 1.0 : 1.5;
        
        en.x += Math.cos(angle) * speed;
        en.y += Math.sin(angle) * speed;
        en.el.style.left = en.x + 'px';
        en.el.style.top = en.y + 'px';
    });

    // 2. 무기 쿨타임 및 발사
    // 가장 가까운 적 찾기
    let nearestEnemy = null;
    let minDst = Infinity;
    
    enemies.forEach(en => {
        const d = Math.hypot(playerX - en.x, playerY - en.y);
        if (d < minDst) { minDst = d; nearestEnemy = en; }
    });

    // 8개 무기 순회
    for (let i = 0; i < 8; i++) {
        // 쿨타임 회복
        const maxCD = Math.max(20, 100 - (inventory[i] * 2) - (slotUpgrades[i].cd * 5)); // 레벨/제련 높을수록 빠름
        if (weaponCD[i] < maxCD) {
            weaponCD[i]++;
        } else if (inventory[i] > 0 && nearestEnemy) {
            // 발사 준비 완료: 적이 사거리 안에 있는지 확인
            // 기본 사거리 250 + 제련 사거리
            const range = 250 + (slotUpgrades[i].rng * 20);
            
            if (minDst <= range) {
                // 발사!
                shoot(i, nearestEnemy);
                weaponCD[i] = 0; // 쿨타임 리셋
            }
        }
    }

    // 3. 미사일 이동 및 충돌
    for (let i = missiles.length - 1; i >= 0; i--) {
        const m = missiles[i];
        m.x += m.vx;
        m.y += m.vy;
        m.el.style.left = m.x + 'px';
        m.el.style.top = m.y + 'px';
        
        // 거리 제한 (너무 멀리가면 삭제)
        if (Math.hypot(m.x - m.startX, m.y - m.startY) > 1000) {
            m.el.remove(); missiles.splice(i, 1); continue;
        }

        // 충돌 체크
        for (let j = enemies.length - 1; j >= 0; j--) {
            const en = enemies[j];
            const dist = Math.hypot(m.x - en.x, m.y - en.y);
            if (dist < 30) { // 히트박스
                en.hp -= m.dmg;
                en.hpFill.style.width = Math.max(0, (en.hp / en.maxHp * 100)) + '%';
                showDmgText(en.x, en.y, m.dmg);
                playSfx('hit');
                
                m.el.remove(); missiles.splice(i, 1); // 미사일 삭제
                
                if (en.hp <= 0) {
                    gold += (currentDungeonIdx + 1) * 100;
                    en.el.remove(); enemies.splice(j, 1);
                    checkWaveClear();
                }
                break; // 한 미사일은 한 적만 타격 (관통 없음)
            }
        }
    }
}

function shoot(slotIdx, target) {
    playSfx('attack');
    const worldDiv = document.getElementById('battle-world');
    const mEl = document.createElement('div');
    mEl.className = 'missile';
    mEl.innerHTML = getToothIcon(inventory[slotIdx]); // 실제 치아 아이콘
    worldDiv.appendChild(mEl);
    
    // 타겟 방향 계산
    const angle = Math.atan2(target.y - playerY, target.x - playerX);
    const speed = 12; // 고속 탄환
    
    // 데미지 계산
    let refineMul = 1 + (slotUpgrades[slotIdx].atk * 0.1);
    const dmg = getAtk(inventory[slotIdx]) * currentMercenary.atkMul * refineMul;
    
    missiles.push({
        el: mEl, x: playerX, y: playerY, startX: playerX, startY: playerY,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        dmg: dmg
    });
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
    
    const handleEnd = (e) => {
        e.preventDefault();
        joystickActive = false;
        moveX = 0; moveY = 0;
        knob.style.transform = `translate(-50%, -50%)`;
        knob.style.left = '50%'; knob.style.top = '50%';
    };
    
    const updateKnob = (cx, cy) => {
        const rect = zone.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = cx - centerX;
        let dy = cy - centerY;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const maxDist = rect.width / 2 - 25; // knob radius
        
        // 정규화된 이동 벡터 (-1 ~ 1)
        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(distance, maxDist);
        
        moveX = Math.cos(angle) * (clampedDist / maxDist);
        moveY = Math.sin(angle) * (clampedDist / maxDist);
        
        // 놉 이동
        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;
        
        knob.style.transform = `translate(-50%, -50%) translate(${knobX}px, ${knobY}px)`;
    };
    
    zone.addEventListener('touchstart', handleStart);
    zone.addEventListener('touchmove', handleMove);
    zone.addEventListener('touchend', handleEnd);
    // 마우스 지원 (디버깅용)
    zone.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
}

function showDmgText(x, y, dmg) {
    const worldDiv = document.getElementById('battle-world');
    const txt = document.createElement('div');
    txt.className = 'dmg-text'; txt.innerText = fNum(dmg);
    txt.style.left = x + 'px'; txt.style.top = (y - 30) + 'px';
    worldDiv.appendChild(txt);
    setTimeout(() => txt.remove(), 500);
}

function exitDungeon() {
    dungeonActive = false;
    enemies.forEach(en => en.el.remove()); missiles.forEach(m => m.el.remove());
    enemies = []; missiles = [];
    
    document.getElementById('battle-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex'; // 메인 복구
    document.getElementById('top-nav').style.display = 'grid';
    
    if(window.renderDungeonList) window.renderDungeonList();
}

function checkWaveClear() {
    if (enemies.length === 0) {
        if (isBossWave) {
            alert("던전 정복 완료!");
            if (unlockedDungeon <= currentDungeonIdx + 1) unlockedDungeon = currentDungeonIdx + 2;
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
        // 업그레이드 레벨 표시
        const upgradeInfo = slotUpgrades[i] ? `<span style="font-size:8px; position:absolute; bottom:0; right:0; color:#aaa;">+${slotUpgrades[i].atk}</span>` : '';
        slot.innerHTML = getToothIcon(inventory[i]) + upgradeInfo;
        container.appendChild(slot);
    }
}
