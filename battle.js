let enemies = [];
let missiles = [];
let weaponCD = new Array(8).fill(0);
let currentDungeonIdx = 0;
let currentWave = 1;
let dungeonActive = false;
let dungeonGold = 0;
let worldW = window.innerWidth * 2;
let worldH = window.innerHeight * 2;
let pX = worldW / 2; let pY = worldH / 2;
let pHp = 100; let pMax = 100;
let isInv = false;
let moveX = 0; let moveY = 0;
let joyActive = false;

function startDungeon(idx) {
    currentDungeonIdx = idx; currentWave = 1; enemies = []; missiles = []; dungeonActive = true; dungeonGold = 0;
    worldW = window.innerWidth * 2; worldH = window.innerHeight * 2;
    pX = worldW / 2; pY = worldH / 2;
    
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('battle-screen').style.display = 'block';
    
    const merc = TOOTH_DATA.mercenaries[mercenaryIdx];
    pMax = merc.baseHp; pHp = pMax;
    
    const world = document.getElementById('battle-world');
    world.innerHTML = `<div id="player"><div id="player-hp-bar-bg"><div id="player-hp-bar-fill"></div></div><div id="p-img">${merc.icon}</div></div>`;
    
    renderWarWeapons();
    spawnWave();
    setupJoystick();
    requestAnimationFrame(battleLoop);
}

function battleLoop() {
    if (!dungeonActive) return;
    if (moveX !== 0 || moveY !== 0) {
        pX += moveX * 6; pY += moveY * 6;
        pX = Math.max(50, Math.min(worldW - 50, pX));
        pY = Math.max(50, Math.min(worldH - 50, pY));
        const p = document.getElementById('player');
        if(p) { p.style.left = pX + 'px'; p.style.top = pY + 'px'; }
        const fill = document.getElementById('player-hp-bar-fill');
        if(fill) fill.style.width = (pHp / pMax * 100) + '%';
    }
    const cX = pX - window.innerWidth / 2;
    const cY = pY - window.innerHeight / 2;
    document.getElementById('battle-world').style.transform = `translate(${-cX}px, ${-cY}px)`;
    
    updateCombat();
    requestAnimationFrame(battleLoop);
}

function updateCombat() {
    enemies.forEach(en => {
        const angle = Math.atan2(pY - en.y, pX - en.x);
        en.x += Math.cos(angle) * 2.5; en.y += Math.sin(angle) * 2.5;
        en.el.style.left = en.x + 'px'; en.el.style.top = en.y + 'px';
        if (!isInv && Math.hypot(pX - en.x, pY - en.y) < 40) {
            pHp -= 10; isInv = true;
            document.getElementById('player').classList.add('invincible');
            setTimeout(() => { isInv = false; document.getElementById('player').classList.remove('invincible'); }, 1000);
            if (pHp <= 0) exitDungeon();
        }
    });

    for(let i=0; i<8; i++) {
        const maxCD = Math.max(10, 100 - (inventory[i]*2) - (slotUpgrades[i].cd*5));
        if (weaponCD[i] < maxCD) weaponCD[i]++;
        const mask = document.querySelector(`#war-slot-${i} .cd-overlay`);
        if (mask) mask.style.height = (100 - (weaponCD[i]/maxCD*100)) + '%';
        if (weaponCD[i] >= maxCD && inventory[i] > 0) {
            let target = enemies.find(en => Math.hypot(pX-en.x, pY-en.y) < (300 + slotUpgrades[i].rng*20));
            if (target) { shoot(i, target); weaponCD[i] = 0; }
        }
    }

    missiles.forEach((m, idx) => {
        m.x += m.vx; m.y += m.vy; m.el.style.left = m.x + 'px'; m.el.style.top = m.y + 'px';
        enemies.forEach((en, eIdx) => {
            if (Math.hypot(m.x - en.x, m.y - en.y) < 50) {
                en.hp -= m.dmg; en.hpFill.style.width = (en.hp / en.maxHp * 100) + '%';
                m.el.remove(); missiles.splice(idx, 1);
                if (en.hp <= 0) {
                    gold += 100; dungeonGold += 100; en.el.remove(); enemies.splice(eIdx, 1);
                    if (en.isBoss) { dungeonActive = false; showResult(); }
                    else if (enemies.length === 0) { currentWave++; spawnWave(); }
                }
            }
        });
    });
}

function spawnWave() {
    const isBoss = currentWave > 4;
    const count = isBoss ? 1 : 5 + currentWave;
    for(let i=0; i<count; i++){
        const en = document.createElement('div'); en.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
        const angle = Math.random() * Math.PI * 2;
        const sx = pX + Math.cos(angle) * 400; sy = pY + Math.sin(angle) * 400;
        en.innerHTML = `<div class="hp-bar-bg"><div class="hp-bar-fill" style="width:100%"></div></div><span>${isBoss ? '🐉' : '👾'}</span>`;
        en.style.left = sx + 'px'; en.style.top = sy + 'px';
        document.getElementById('battle-world').appendChild(en);
        enemies.push({ el: en, hpFill: en.querySelector('.hp-bar-fill'), x: sx, y: sy, hp: isBoss?2000:100, maxHp: isBoss?2000:100, isBoss });
    }
    document.getElementById('wave-info').innerText = isBoss ? "BOSS" : "WAVE " + currentWave;
}

function shoot(slot, target) {
    const mEl = document.createElement('div'); mEl.className = 'missile'; mEl.innerHTML = getToothIcon(inventory[slot]);
    document.getElementById('battle-world').appendChild(mEl);
    const angle = Math.atan2(target.y - pY, target.x - pX);
    const dmg = getAtk(inventory[slot]) * (1 + slotUpgrades[slot].atk * 0.1);
    missiles.push({ el: mEl, x: pX, y: pY, vx: Math.cos(angle)*15, vy: Math.sin(angle)*15, dmg });
}

function showResult() {
    const modal = document.getElementById('dungeon-result-modal');
    modal.style.display = 'flex';
    document.getElementById('result-desc').innerText = "획득 골드: " + dungeonGold;
    if (unlockedDungeon < currentDungeonIdx + 2) unlockedDungeon = currentDungeonIdx + 2;
}

function setupJoystick() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    zone.onpointerdown = (e) => { joyActive = true; knob.setPointerCapture(e.pointerId); };
    zone.onpointermove = (e) => {
        if (!joyActive) return;
        const rect = zone.getBoundingClientRect();
        const dx = e.clientX - (rect.left + 60); dy = e.clientY - (rect.top + 60);
        const dist = Math.min(Math.hypot(dx, dy), 50);
        const angle = Math.atan2(dy, dx);
        moveX = Math.cos(angle) * (dist/50); moveY = Math.sin(angle) * (dist/50);
        knob.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist}px)`;
    };
    zone.onpointerup = () => { joyActive = false; moveX = 0; moveY = 0; knob.style.transform = 'translate(-50%, -50%)'; };
}

function exitDungeon() { dungeonActive = false; document.getElementById('battle-screen').style.display = 'none'; document.getElementById('game-container').style.display = 'flex'; switchView('war'); }
function renderWarWeapons() { const con = document.getElementById('war-weapon-slots'); con.innerHTML = ''; for(let i=0; i<8; i++){ const s = document.createElement('div'); s.className='war-slot'; s.id='war-slot-'+i; s.innerHTML=`<div class="cd-overlay"></div>`+getToothIcon(inventory[i]); con.appendChild(s); } }
function closeResultModal() { document.getElementById('dungeon-result-modal').style.display='none'; exitDungeon(); }
