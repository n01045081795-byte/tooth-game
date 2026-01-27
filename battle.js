// Version: 1.6.0 - Battle Engine with Auto-Attack & Waves
let enemies = [];
let missiles = [];
let weaponCD = new Array(8).fill(0);
let currentDungeonIdx = 0;
let currentWave = 1;
let isBossWave = false;
let dungeonActive = false;

function startDungeon(idx) {
    currentDungeonIdx = idx;
    currentWave = 1;
    isBossWave = false;
    enemies = [];
    missiles = [];
    dungeonActive = true;
    document.getElementById('dungeon-list').style.display = 'none';
    document.getElementById('battle-screen').style.display = 'block';
    document.getElementById('dungeon-title-display').innerText = TOOTH_DATA.dungeons[idx];
    spawnWave();
}

function spawnWave() {
    if (!dungeonActive) return;
    const count = isBossWave ? 1 : 5 + currentWave * 2;
    for (let i = 0; i < count; i++) {
        setTimeout(() => spawnEnemy(isBossWave), i * 500);
    }
}

function spawnEnemy(isBoss = false) {
    const area = document.getElementById('enemy-spawn-area');
    if (!area) return;

    const enEl = document.createElement('div');
    enEl.className = isBoss ? 'battle-enemy boss' : 'battle-enemy';
    enEl.innerText = isBoss ? '👹' : '👾';
    area.appendChild(enEl);

    const side = Math.floor(Math.random() * 4);
    let x, y;
    if(side === 0) { x = Math.random()*100; y = -10; }
    else if(side === 1) { x = 110; y = Math.random()*100; }
    else if(side === 2) { x = Math.random()*100; y = 110; }
    else { x = -10; y = Math.random()*100; }

    enemies.push({
        el: enEl, x, y, isBoss,
        hp: (50 * Math.pow(1.5, currentDungeonIdx)) * (isBoss ? 10 : 1),
        maxHp: (50 * Math.pow(1.5, currentDungeonIdx)) * (isBoss ? 10 : 1)
    });
}

function updateBattle() {
    if (!dungeonActive) return;

    // 1. 무기 자동 발사 (가장 가까운 적 조준)
    for (let i = 0; i < 8; i++) {
        if (inventory[i] > 0 && weaponCD[i] <= 0 && enemies.length > 0) {
            shoot(i);
            weaponCD[i] = Math.max(10, 30 - inventory[i]); // 레벨 높을수록 연사속도 증가
        }
        if (weaponCD[i] > 0) weaponCD[i]--;
    }

    // 2. 미사일 이동 및 충돌
    missiles.forEach((m, mIdx) => {
        m.x += m.vx; m.y += m.vy;
        m.el.style.left = m.x + '%'; m.el.style.top = m.y + '%';

        enemies.forEach((en, eIdx) => {
            const d = Math.sqrt((m.x - en.x)**2 + (m.y - en.y)**2);
            if (d < 5) {
                en.hp -= m.dmg;
                m.el.remove();
                missiles.splice(mIdx, 1);
                showDmg(en.x, en.y, m.dmg);
                if (en.hp <= 0) {
                    gold += (currentDungeonIdx + 1) * 10;
                    en.el.remove();
                    enemies.splice(eIdx, 1);
                    checkWaveClear();
                }
            }
        });
        if (m.x < -20 || m.x > 120 || m.y < -20 || m.y > 120) {
            m.el.remove(); missiles.splice(mIdx, 1);
        }
    });

    // 3. 적 이동
    enemies.forEach(en => {
        const dx = 50 - en.x; const dy = 50 - en.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 5) {
            en.x += (dx/dist) * (en.isBoss ? 0.2 : 0.5);
            en.el.style.left = en.x + '%'; en.el.style.top = en.y + '%';
        }
    });
}

function shoot(slotIdx) {
    const target = enemies[0]; // 가장 먼저 생성된 적 조준
    const area = document.getElementById('enemy-spawn-area');
    const mEl = document.createElement('div');
    mEl.className = 'missile';
    mEl.innerText = '✨';
    area.appendChild(mEl);

    const angle = Math.atan2(target.y - 50, target.x - 50);
    missiles.push({
        el: mEl, x: 50, y: 50,
        vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
        dmg: getAtk(inventory[slotIdx])
    });
}

function checkWaveClear() {
    if (enemies.length === 0) {
        if (isBossWave) {
            alert("던전 클리어! 다음 던전이 개방되었습니다.");
            if (unlockedDungeon <= currentDungeonIdx) unlockedDungeon++;
            exitDungeon();
        } else {
            currentWave++;
            if (currentWave > 5) {
                isBossWave = true;
                alert("보스 등장!");
            }
            spawnWave();
        }
    }
}

function showDmg(x, y, dmg) {
    const d = document.createElement('div');
    d.className = 'dmg-popup';
    d.innerText = fNum(dmg);
    d.style.left = x + '%'; d.style.top = y + '%';
    document.getElementById('enemy-spawn-area').appendChild(d);
    setTimeout(() => d.remove(), 500);
}

function exitDungeon() {
    dungeonActive = false;
    enemies.forEach(en => en.el.remove());
    missiles.forEach(m => m.el.remove());
    enemies = []; missiles = [];
    document.getElementById('battle-screen').style.display = 'none';
    document.getElementById('dungeon-list').style.display = 'block';
    renderDungeonList();
}
