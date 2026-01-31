// Version: 5.1.0 - Boss Z-Index Fix & Smart Relay Logic
let enemies = [];
let missiles = [];
let weaponCD = new Array(8).fill(0); // 호환성 유지용
let currentDungeonIdx = 0;
let currentWave = 1;
let isBossWave = false;
let dungeonActive = false;
let dungeonGoldEarned = 0;
let spawnTimeouts = []; 

// 릴레이 시스템 변수
let activeSlotIndex = 0; 
let relayTimer = 0;      
let bossDead = false; 

let worldWidth = window.innerWidth * 2;
let worldHeight = window.innerHeight * 2;
let playerX = 0; let playerY = 0;
let currentMercenary = TOOTH_DATA.mercenaries[0];
let playerHp = 100;
let playerMaxHp = 100;
let isInvincible = false;
let joystickActive = false;
let moveX = 0; let moveY = 0;

function startDungeon(idx) {
    currentDungeonIdx = idx; currentWave = 1; isBossWave = false;
    enemies = []; missiles = []; dungeonActive = true;
    dungeonGoldEarned = 0;
    
    // 초기화
    activeSlotIndex = 0;
    relayTimer = 0;
    bossDead = false;
    
    spawnTimeouts.forEach(id => clearTimeout(id));
    spawnTimeouts = [];

    currentMercenary = TOOTH_DATA.mercenaries[mercenaryIdx];
    
    worldWidth = window.innerWidth * 2; worldHeight = window.innerHeight * 2;
    playerX = worldWidth / 2; playerY = worldHeight / 2;
    
    document.getElementById('top-nav').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('battle-screen').style.display = 'block';
    document.getElementById('current-dungeon-name').innerText = TOOTH_DATA.dungeons[idx];
    
    let playerEl = document.getElementById('player');
    if (playerEl) playerEl.remove();
    playerEl = document.createElement('div');
    playerEl.id = 'player';
    playerEl.innerHTML = `<div id="player-hp-bar-bg"><div id="player-hp-bar-fill"></div></div><div id="player-char">${currentMercenary.icon}</div>`;
    document.getElementById('battle-world').appendChild(playerEl);
    
    playerMaxHp = currentMercenary.baseHp; playerHp = playerMaxHp; updatePlayerHpBar();
    updatePlayerPos(); renderWarWeapons(); 
    spawnWave();
    if (!window.joystickInitialized) { setupJoystick(); window.joystickInitialized = true; }
    requestAnimationFrame(battleLoop);
}

function updatePlayerHpBar() { const fill = document.getElementById('player-hp-bar-fill'); if (fill) fill.style.width = (playerHp / playerMaxHp * 100) + '%'; }
function updatePlayerPos() { const p = document.getElementById('player'); if(p) { p.style.left = playerX + 'px'; p.style.top = playerY + 'px'; } }

function spawnWave() {
    if (!dungeonActive || bossDead) return;
    if (isBossWave && enemies.some(e => e.isBoss)) return;

    document.getElementById('wave-info').innerText = isBossWave ? "☠️ BOSS ☠️" : `WAVE ${currentWave}/5`;
    
    const count = isBossWave ? 1 : 5 + (currentWave * 2);
    
    for (let i = 0; i < count; i++) {
        const tid = setTimeout(() => { 
            if(dungeonActive && !bossDead) {
                if (isBossWave && enemies.some(e => e.isBoss)) return;
                spawnEnemy(isBossWave); 
            }
        }, i * 800);
        spawnTimeouts.push(tid);
    }
}

function spawnEnemy(isBoss = false) {
    const worldDiv = document.getElementById('battle-world');
    const en = document.createElement('div');
    en.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.min(worldWidth, worldHeight) / 2 - 50;
    let sx = (worldWidth / 2) + Math.cos(angle) * dist; let sy = (worldHeight / 2) + Math.sin(angle) * dist;
    const baseHp = 100 * Math.pow(2.5, currentDungeonIdx);
    const maxHp = baseHp * (isBoss ? 30 : 1);
    en.innerHTML = `<div class="hp-bar-bg"><div class="hp-bar-fill" style="width:100%"></div></div><span>${isBoss ? '🐉' : '👾'}</span>`;
    en.style.left = sx + 'px'; en.style.top = sy + 'px'; worldDiv.appendChild(en); 
    enemies.push({ el: en, hpFill: en.querySelector('.hp-bar-fill'), x: sx, y: sy, isBoss, hp: maxHp, maxHp: maxHp });
}

function battleLoop() { if (!dungeonActive) return; updatePlayerMovement(); updateCamera(); updateCombat(); requestAnimationFrame(battleLoop); }
function updatePlayerMovement() { if (Math.abs(moveX) < 0.1 && Math.abs(moveY) < 0.1) return; const speed = 5 * (currentMercenary.spd || 1.0); playerX += moveX * speed; playerY += moveY * speed; playerX = Math.max(20, Math.min(worldWidth - 20, playerX)); playerY = Math.max(20, Math.min(worldHeight - 20, playerY)); updatePlayerPos(); const char = document.getElementById('player-char'); if(char) char.style.transform = moveX < 0 ? 'scaleX(-1)' : 'scaleX(1)'; }
function updateCamera() { const camX = playerX - window.innerWidth / 2; const camY = playerY - window.innerHeight / 2; document.getElementById('battle-world').style.transform = `translate(${-camX}px, ${-camY}px)`; }
function takeDamage(amount) { playerHp -= amount; updatePlayerHpBar(); playSfx('damage'); isInvincible = true; const p = document.getElementById('player'); p.classList.add('invincible'); setTimeout(() => { isInvincible = false; p.classList.remove('invincible'); }, 1000); if (playerHp <= 0) { alert("용병이 쓰러졌습니다!"); exitDungeon(); } }

function updateCombat() {
    // 1. 적 이동
    if (!bossDead) {
        enemies.forEach(en => {
            const dx = playerX - en.x; const dy = playerY - en.y;
            const angle = Math.atan2(dy, dx);
            const speed = en.isBoss ? 1.5 : 2.5;
            en.x += Math.cos(angle) * speed; en.y += Math.sin(angle) * speed;
            en.el.style.left = en.x + 'px'; en.el.style.top = en.y + 'px';
            if (!isInvincible && Math.hypot(playerX - en.x, playerY - en.y) < 30) { takeDamage(10 + (currentDungeonIdx * 5)); }
        });
    }

    let nearest = null; let minDst = Infinity;
    enemies.forEach(en => { const d = Math.hypot(playerX - en.x, playerY - en.y); if (d < minDst) { minDst = d; nearest = en; } });
    
    // ★ 릴레이 발사 로직 개선 ★
    
    // 기본 60프레임(1초) ~ 만렙(90%감소) 시 6프레임(0.1초)
    const cdReductionPercent = Math.min(90, globalUpgrades.cd * 2); 
    const maxCD = Math.max(6, 60 * (1 - cdReductionPercent/100));

    // 쿨타임 증가 (최대치까지만)
    if (relayTimer < maxCD) {
        relayTimer++;
    }
    
    // UI 업데이트
    for(let i=0; i<8; i++) {
        const slotEl = document.getElementById(`war-slot-${i}`);
        if(slotEl) {
            const mask = slotEl.querySelector('.cd-overlay');
            if (i === activeSlotIndex) {
                const percent = 100 - (relayTimer / maxCD * 100);
                mask.style.height = `${Math.max(0, percent)}%`;
                slotEl.style.border = '2px solid #00fbff';
                if(relayTimer >= maxCD) {
                    slotEl.style.background = 'rgba(0, 255, 0, 0.2)'; // 준비 완료 시각효과
                } else {
                    slotEl.style.background = '#1a1a2e';
                }
            } else {
                mask.style.height = '100%';
                slotEl.style.border = '1px solid #555';
                slotEl.style.background = '#1a1a2e';
            }
        }
    }

    // 발사 조건 체크
    if (relayTimer >= maxCD) {
        // 1. 빈 슬롯인가? -> 페널티 받고 턴 넘기기
        if (inventory[activeSlotIndex] === 0) {
            relayTimer = 0;
            activeSlotIndex = (activeSlotIndex + 1) % 8;
        } 
        // 2. 치아가 있는가?
        else {
            // 적이 있고, 사거리 내인가?
            if (nearest && !bossDead) {
                const maxRngLimit = worldWidth / 2;
                const calcRng = 300 + (globalUpgrades.rng * 20);
                const range = Math.min(maxRngLimit, calcRng);
                
                if (minDst <= range) {
                    // 발사 성공! -> 턴 넘기기
                    shoot(activeSlotIndex, nearest);
                    relayTimer = 0;
                    activeSlotIndex = (activeSlotIndex + 1) % 8;
                }
                // 사거리 밖이면? -> 아무것도 안함 (relayTimer 유지, activeSlotIndex 유지) == 대기
            }
            // 적이 아예 없으면? -> 대기
        }
    }

    // 3. 미사일 처리
    for (let i = missiles.length - 1; i >= 0; i--) {
        const m = missiles[i];
        m.x += m.vx; m.y += m.vy;
        m.el.style.left = m.x + 'px'; m.el.style.top = m.y + 'px';
        if (Math.hypot(m.x - m.startX, m.y - m.startY) > 2000) { m.el.remove(); missiles.splice(i, 1); continue; }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const en = enemies[j];
            if (Math.hypot(m.x - en.x, m.y - en.y) < 40) { 
                en.hp -= m.dmg;
                en.hpFill.style.width = Math.max(0, (en.hp / en.maxHp * 100)) + '%';
                showDmgText(en.x, en.y, m.dmg);
                playSfx('hit');
                m.el.remove(); missiles.splice(i, 1);
                
                if (en.hp <= 0) {
                    const gain = Math.floor(2000 * Math.pow(2.5, currentDungeonIdx));
                    gold += gain;
                    dungeonGoldEarned += gain;
                    showGoldText(en.x, en.y, gain);
                    
                    if (en.isBoss) {
                        bossDead = true;
                        createExplosion(en.x, en.y);
                        en.el.remove();
                        enemies.splice(j, 1);
                        setTimeout(() => { 
                            showResultModal(); 
                            dungeonActive = false;
                        }, 1000);
                        return;
                    } else {
                        en.el.remove();
                        enemies.splice(j, 1);
                        checkWaveClear();
                    }
                }
                break;
            }
        }
    }
}

function createExplosion(x, y) {
    const worldDiv = document.getElementById('battle-world');
    const exp = document.createElement('div');
    exp.innerText = "💥";
    exp.style.position = 'absolute';
    exp.style.left = x + 'px'; exp.style.top = y + 'px';
    exp.style.transform = 'translate(-50%, -50%)';
    exp.style.fontSize = '150px';
    exp.style.zIndex = '20000'; // 폭발도 최상위
    exp.style.textShadow = '0 0 20px red';
    exp.style.animation = 'popUp 1s ease-out';
    worldDiv.appendChild(exp);
    setTimeout(() => exp.remove(), 1000);
}

// ★ 보스 클리어 모달: Z-Index 강제 상향 ★
function showResultModal() {
    const modal = document.getElementById('dungeon-result-modal');
    modal.style.display = 'flex';
    modal.style.zIndex = '99999'; // 전투 화면(9999)보다 훨씬 높게 설정
    
    document.getElementById('result-title').innerText = `${TOOTH_DATA.dungeons[currentDungeonIdx]} CLEAR!`;
    const next = TOOTH_DATA.dungeons[currentDungeonIdx + 1];
    document.getElementById('result-desc').innerHTML = `
        획득 골드: <span style="color:yellow;">${fNum(dungeonGoldEarned)}G</span><br>
        ${next ? `다음 던전: ${next} 오픈!` : "모든 던전을 정복했습니다!"}
    `;
    if (unlockedDungeon <= currentDungeonIdx + 1) unlockedDungeon = currentDungeonIdx + 2;
    saveGame();
}

function shoot(slotIdx, target) { playSfx('attack'); const worldDiv = document.getElementById('battle-world'); const mEl = document.createElement('div'); mEl.className = 'missile'; mEl.innerHTML = getToothIcon(inventory[slotIdx]); worldDiv.appendChild(mEl); const angle = Math.atan2(target.y - playerY, target.x - playerX); const speed = 18; let refineMul = 1 + (slotUpgrades[slotIdx].atk * 0.1); const dmg = getAtk(inventory[slotIdx]) * currentMercenary.atkMul * refineMul; missiles.push({ el: mEl, x: playerX, y: playerY, startX: playerX, startY: playerY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg: dmg }); }
function showDmgText(x, y, dmg) { const worldDiv = document.getElementById('battle-world'); const txt = document.createElement('div'); txt.className = 'dmg-text'; txt.innerText = fNum(dmg); txt.style.left = x + 'px'; txt.style.top = (y - 40) + 'px'; worldDiv.appendChild(txt); setTimeout(() => txt.remove(), 500); }
function showGoldText(x, y, val) { const worldDiv = document.getElementById('battle-world'); const txt = document.createElement('div'); txt.className = 'gold-text'; txt.innerText = `💰+${fNum(val)}`; txt.style.left = x + 'px'; txt.style.top = (y - 50) + 'px'; worldDiv.appendChild(txt); setTimeout(() => txt.remove(), 800); }
function checkWaveClear() { if (enemies.length === 0) { if (isBossWave) { } else { currentWave++; if (currentWave > 5) isBossWave = true; spawnWave(); } } }
function closeResultModal() { document.getElementById('dungeon-result-modal').style.display = 'none'; exitDungeon(); }
function exitDungeon() { 
    dungeonActive = false; 
    enemies.forEach(en => en.el.remove()); 
    missiles.forEach(m => m.el.remove()); 
    enemies = []; missiles = []; 
    spawnTimeouts.forEach(id => clearTimeout(id));
    spawnTimeouts = [];
    
    document.getElementById('battle-screen').style.display = 'none'; 
    document.getElementById('game-container').style.display = 'flex'; 
    document.getElementById('top-nav').style.display = 'grid'; 
    if(window.renderDungeonList) window.renderDungeonList(); 
}
function renderWarWeapons() { const container = document.getElementById('war-weapon-slots'); container.innerHTML = ''; for (let i = 0; i < 8; i++) { const slot = document.createElement('div'); slot.className = 'war-slot'; slot.id = `war-slot-${i}`; slot.innerHTML = `<div class="cd-overlay"></div>` + getToothIcon(inventory[i]); container.appendChild(slot); } }
function setupJoystick() { const zone = document.getElementById('joystick-zone'); const knob = document.getElementById('joystick-knob'); let touchId = null; const handleStart = (e) => { e.preventDefault(); const touch = e.changedTouches ? e.changedTouches[0] : e; touchId = touch.identifier; joystickActive = true; updateKnob(touch.clientX, touch.clientY); }; const handleMove = (e) => { if (!joystickActive) return; e.preventDefault(); const touch = e.changedTouches ? Array.from(e.changedTouches).find(t => t.identifier === touchId) : e; if (touch) updateKnob(touch.clientX, touch.clientY); }; const handleEnd = (e) => { e.preventDefault(); joystickActive = false; moveX = 0; moveY = 0; knob.style.transform = `translate(-50%, -50%)`; knob.style.left = '50%'; knob.style.top = '50%'; }; const updateKnob = (cx, cy) => { const rect = zone.getBoundingClientRect(); const centerX = rect.left + rect.width / 2; const centerY = rect.top + rect.height / 2; let dx = cx - centerX; let dy = cy - centerY; const dist = Math.sqrt(dx*dx + dy*dy); const maxDist = rect.width / 2 - 25; const angle = Math.atan2(dy, dx); const clampedDist = Math.min(dist, maxDist); moveX = Math.cos(angle) * (clampedDist / maxDist); moveY = Math.sin(angle) * (clampedDist / maxDist); const kx = Math.cos(angle) * clampedDist; const ky = Math.sin(angle) * clampedDist; knob.style.transform = `translate(-50%, -50%) translate(${kx}px, ${ky}px)`; }; zone.addEventListener('touchstart', handleStart); zone.addEventListener('touchmove', handleMove); zone.addEventListener('touchend', handleEnd); zone.addEventListener('mousedown', handleStart); window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleEnd); }
