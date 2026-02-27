// Version: 7.1.0 - Combat Engine (Lv Display & Tier 6 Mercenary Boost)

window.dungeonActive = false;
window.bossDead = false;
window.currentWave = 1;
window.isBossWave = false;
window.enemies = [];
window.missiles = [];
window.enemyMissiles = [];
window.spawnTimeouts = [];
window.relayTimer = 0;
window.activeSlotIndex = 0;
window.isBossRush = false;

window.startDungeon = function(idx) {
    window.currentDungeonIdx = idx;
    const tab = window.currentDungeonTab || 'normal';
    window.isHellMode = (tab === 'hell' || tab === 'hellboss');
    window.isBossRush = (tab === 'boss' || tab === 'hellboss');

    if (window.isBossRush) {
        let goldFee = Math.floor(5000 * Math.pow(2.0, idx));
        let diaFee = 5 + (idx * 5);
        if (window.isHellMode) { goldFee *= 10; diaFee *= 5; }

        if (window.gold < goldFee || window.dia < diaFee) {
            alert(`입장료가 부족합니다!`);
            return;
        }
        window.gold -= goldFee; window.dia -= diaFee;
        if(window.updateUI) window.updateUI();
    }

    document.getElementById('game-container').style.display = 'none';
    const battleScreen = document.getElementById('battle-screen');
    const worldDiv = document.getElementById('battle-world');
    battleScreen.style.display = 'block';
    
    window.worldWidth = 2000;
    window.worldHeight = 2000;
    worldDiv.style.width = window.worldWidth + 'px';
    worldDiv.style.height = window.worldHeight + 'px';

    let theme = "bg-stone";
    if (window.isHellMode) {
        theme = (TOOTH_DATA.hellMobs[0] && TOOTH_DATA.hellMobs[0].theme) ? TOOTH_DATA.hellMobs[0].theme : "bg-hell";
    } else {
        let safeThemeIdx = Math.min(idx, TOOTH_DATA.dungeonMobs.length - 1);
        theme = (TOOTH_DATA.dungeonMobs[safeThemeIdx] && TOOTH_DATA.dungeonMobs[safeThemeIdx].theme) ? TOOTH_DATA.dungeonMobs[safeThemeIdx].theme : "bg-stone";
    }
    worldDiv.className = theme;

    // 🌟 [회의 반영] 던전 레벨 직관적 표시 (Lv.X 던전이름)
    let baseDName = window.isHellMode ? (typeof TOOTH_DATA !== 'undefined' ? TOOTH_DATA.hellDungeons[idx] : `HELL 던전`) 
                                      : (typeof TOOTH_DATA !== 'undefined' ? TOOTH_DATA.dungeons[idx] : `던전`);
    let finalDungeonName = `Lv.${idx + 1} ${baseDName}`;
    if (window.isBossRush) finalDungeonName = `🔥 [토벌전] ${finalDungeonName}`;
    document.getElementById('current-dungeon-name').innerText = finalDungeonName;
    
    window.dungeonGoldEarned = 0;
    window.dungeonDiaEarned = 0;
    window.dungeonActive = true;
    window.bossDead = false;
    window.currentWave = 1;
    window.isBossWave = window.isBossRush; 
    window.enemies = []; window.missiles = []; window.enemyMissiles = [];
    window.relayTimer = 0; window.activeSlotIndex = 0;
    window.playerX = window.worldWidth / 2; window.playerY = window.worldHeight / 2;

    let curMercIcon = "🦷";
    if (typeof TOOTH_DATA !== 'undefined' && TOOTH_DATA.mercenaries[window.mercenaryIdx]) {
        curMercIcon = TOOTH_DATA.mercenaries[window.mercenaryIdx].icon;
    }
    worldDiv.innerHTML = `<div id="player">${curMercIcon}<div id="player-hp-bar-bg"><div id="player-hp-bar-fill"></div></div></div>`;
    
    if(window.renderBattleSlots) window.renderBattleSlots();
    setTimeout(() => { window.spawnWave(); }, 1000);
};

window.spawnWave = function() {
    if (!window.dungeonActive || window.bossDead) return;
    const waveInfo = document.getElementById('wave-info');
    if (window.isBossRush) {
        if(waveInfo) waveInfo.innerText = `🔥 BOSS RUSH ${window.currentWave}/5 🔥`;
        setTimeout(() => { if(window.dungeonActive && !window.bossDead) window.spawnEnemy(true); }, 800);
    } else {
        if(waveInfo) waveInfo.innerText = window.isBossWave ? "☠️ BOSS ☠️" : `WAVE ${window.currentWave}/5`;
        const count = window.isBossWave ? 1 : 5 + (window.currentWave * 2);
        for (let i = 0; i < count; i++) {
            const tid = setTimeout(() => { 
                if(window.dungeonActive && !window.bossDead) window.spawnEnemy(window.isBossWave); 
            }, i * 800);
            window.spawnTimeouts.push(tid);
        }
    }
};

window.spawnEnemy = function(isBoss = false) {
    const worldDiv = document.getElementById('battle-world');
    if(!worldDiv || typeof TOOTH_DATA === 'undefined') return;
    const en = document.createElement('div');
    en.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
    let mobList = window.isHellMode ? TOOTH_DATA.hellMobs : TOOTH_DATA.dungeonMobs;
    let safeIdx = window.isBossRush ? Math.min(window.currentDungeonIdx + (window.currentWave - 1), mobList.length - 1) : Math.min(window.currentDungeonIdx, mobList.length - 1);
    const mobData = mobList[safeIdx];
    let icon = isBoss ? mobData.boss : mobData.mobs[Math.floor(Math.random() * mobData.mobs.length)];
    const angle = Math.random() * Math.PI * 2;
    let sx = window.playerX + Math.cos(angle) * 600; 
    let sy = window.playerY + Math.sin(angle) * 600;
    let baseHp = Math.floor(100 * Math.pow(window.isHellMode ? 2.5 : 2.2, safeIdx));
    if (window.isHellMode) baseHp *= 50;
    const maxHp = baseHp * (isBoss ? (window.isBossRush ? 20 * Math.pow(1.5, window.currentWave) : 30) : 1);
    en.innerHTML = `<div class="hp-bar-bg"><div class="hp-bar-fill" style="width:100%"></div></div><span>${icon}</span>`;
    en.style.left = sx + 'px'; en.style.top = sy + 'px'; 
    worldDiv.appendChild(en); 
    window.enemies.push({ el: en, hpFill: en.querySelector('.hp-bar-fill'), x: sx, y: sy, isBoss, hp: maxHp, maxHp: maxHp, speed: isBoss ? 1.5 : 2.5 + (safeIdx * 0.1), shootTimer: 0 });
};

window.updateCombat = function() {
    if (window.bossDead || !window.dungeonActive) return;
    window.enemies.forEach(en => {
        const dx = window.playerX - en.x; const dy = window.playerY - en.y;
        const dist = Math.hypot(dx, dy); const angle = Math.atan2(dy, dx);
        let moveSpd = en.speed * (window.isHellMode ? 1.5 : 1);
        if (en.isBoss && dist < 300) moveSpd = 0;
        en.x += Math.cos(angle) * moveSpd; en.y += Math.sin(angle) * moveSpd;
        en.el.style.left = en.x + 'px'; en.el.style.top = en.y + 'px';
        if (!window.isInvincible && dist < 35) window.takeDamage(10 + (window.currentDungeonIdx * 5));
        en.shootTimer++;
        if (en.shootTimer >= (en.isBoss ? 120 : 300)) {
            en.shootTimer = 0;
            window.enemyShoot(en.x, en.y, angle, en.isBoss ? "🔥" : "🔮");
        }
    });

    let nearest = null; let minDst = Infinity;
    window.enemies.forEach(en => { 
        const d = Math.hypot(window.playerX - en.x, window.playerY - en.y); 
        if (d < minDst) { minDst = d; nearest = en; } 
    });
    
    const cdReduc = Math.min(90, window.globalUpgrades.cd * 2);
    const maxCD = Math.max(6, 60 * (1 - cdReduc/100));
    if (window.relayTimer < maxCD) window.relayTimer++;
    if (window.relayTimer >= maxCD && nearest && !window.bossDead) {
        if (window.inventory[window.activeSlotIndex] > 0) {
            window.playerShoot(window.activeSlotIndex, nearest);
            window.relayTimer = 0; window.activeSlotIndex = (window.activeSlotIndex + 1) % 8;
        } else { window.relayTimer = 0; window.activeSlotIndex = (window.activeSlotIndex + 1) % 8; }
    }

    // 미사일 처리 및 데미지 로직
    for (let i = window.missiles.length - 1; i >= 0; i--) {
        const m = window.missiles[i]; m.x += m.vx; m.y += m.vy;
        m.el.style.left = m.x + 'px'; m.el.style.top = m.y + 'px';
        if (Math.hypot(m.x - m.startX, m.y - m.startY) > 1000) { m.el.remove(); window.missiles.splice(i, 1); continue; }
        for (let j = window.enemies.length - 1; j >= 0; j--) {
            const en = window.enemies[j];
            if (Math.hypot(m.x - en.x, m.y - en.y) < 40) {
                en.hp -= m.dmg; en.hpFill.style.width = (en.hp/en.maxHp*100)+'%';
                if(m.isCrit) window.showCritText(en.x, en.y, m.dmg); else window.showDmgText(en.x, en.y, m.dmg);
                m.el.remove(); window.missiles.splice(i, 1);
                if (en.hp <= 0) { en.el.remove(); window.enemies.splice(j, 1); window.processEnemyDeath(en); }
                break;
            }
        }
    }
};

window.playerShoot = function(slotIdx, target) {
    try { playSfx('attack'); } catch(e){}
    const worldDiv = document.getElementById('battle-world');
    const mEl = document.createElement('div'); mEl.className = 'missile';
    mEl.innerHTML = getToothIcon(window.inventory[slotIdx]);
    worldDiv.appendChild(mEl);
    const angle = Math.atan2(target.y - window.playerY, target.x - window.playerX);
    
    // 🌟 [핵심 수정] 16레벨(티어6) 이상 시 용병 배수 2배 증폭 적용
    let baseAtk = getAtk(window.inventory[slotIdx]);
    let mercMul = TOOTH_DATA.mercenaries[window.mercenaryIdx].atkMul;
    if (window.highestToothLevel >= 16) mercMul *= 2.0;
    
    let refineMul = 1 + (window.slotUpgrades[slotIdx].atk * 0.1);
    let trainingMul = 1 + (window.trainingLevels.atk * 0.1);
    let dmg = baseAtk * mercMul * refineMul * trainingMul;

    window.missiles.push({ el: mEl, x: window.playerX, y: window.playerY, startX: window.playerX, startY: window.playerY, vx: Math.cos(angle)*18, vy: Math.sin(angle)*18, dmg });
};

window.enemyShoot = function(ex, ey, angle, icon) {
    const worldDiv = document.getElementById('battle-world');
    const mEl = document.createElement('div'); mEl.className = 'enemy-missile'; mEl.innerText = icon;
    worldDiv.appendChild(mEl);
    window.enemyMissiles.push({ el: mEl, x: ex, y: ey, startX: ex, startY: ey, vx: Math.cos(angle)*7, vy: Math.sin(angle)*7, dmg: 15 + (window.currentDungeonIdx * 5) });
};

window.processEnemyDeath = function(en) {
    let goldGain = Math.floor(2000 * Math.pow(2.5, window.currentDungeonIdx)) * (en.isBoss ? 5 : 1);
    window.gold += goldGain; window.dungeonGoldEarned += goldGain;
    window.showGoldText(en.x, en.y, goldGain);
    if (en.isBoss) {
        window.bossDead = true; 
        setTimeout(() => { window.showResultModal(); window.dungeonActive = false; }, 1500);
    } else if (window.enemies.length === 0 && !window.isBossWave) {
        window.currentWave++; if (window.currentWave > 5) window.isBossWave = true;
        window.spawnWave();
    }
};

window.exitDungeon = function() {
    window.dungeonActive = false; window.bossDead = true;
    document.getElementById('battle-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';
    if (window.spawnTimeouts) window.spawnTimeouts.forEach(t => clearTimeout(t));
    window.enemies = []; window.missiles = []; window.enemyMissiles = [];
    if(window.updateUI) window.updateUI();
    if(window.renderDungeonList) window.renderDungeonList();
    if(window.renderMercenaryCamp) window.renderMercenaryCamp();
};

window.showDmgText = function(x, y, dmg) { 
    const txt = document.createElement('div'); txt.className = 'dmg-text'; txt.innerText = fNum(dmg);
    txt.style.left = x + 'px'; txt.style.top = (y - 40) + 'px';
    document.getElementById('battle-world').appendChild(txt); setTimeout(() => txt.remove(), 500);
};
window.showCritText = function(x, y, dmg) { 
    const txt = document.createElement('div'); txt.className = 'crit-text'; txt.innerText = `CRIT! ${fNum(dmg)}`;
    txt.style.left = x + 'px'; txt.style.top = (y - 50) + 'px';
    document.getElementById('battle-world').appendChild(txt); setTimeout(() => txt.remove(), 600);
};
window.showGoldText = function(x, y, val) { 
    const txt = document.createElement('div'); txt.className = 'gold-text'; txt.innerText = `💰+${fNum(val)}`;
    txt.style.left = x + 'px'; txt.style.top = (y - 50) + 'px';
    document.getElementById('battle-world').appendChild(txt); setTimeout(() => txt.remove(), 800);
};
