// Version: 1.3.0
let gold = 1000;
let maxSlots = 24;
let inventory = new Array(32).fill(0);
let stage = 1;
let dragStartIndex = null;
let sortMode = 'desc';
let hasAutoCombine = false;
let currentEnemyHp = 100;
let maxEnemyHp = 100;
let missileIndex = 0; // 인벤토리 순차 발사를 위한 인덱스

const enemies = ['👾', '👻', '💀', '🧛', '👹', '👺'];
const bosses = ['🐉', '🧟', '🌋', '👑'];

function saveGame() {
    localStorage.setItem('toothSaveV130', JSON.stringify({ gold, maxSlots, inventory, stage, hasAutoCombine }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV130');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold; maxSlots = d.maxSlots; inventory = d.inventory;
        stage = d.stage || 1; hasAutoCombine = d.hasAutoCombine || false;
    }
}

// --- 전투 시스템 ---
function spawnEnemy() {
    const isBoss = stage % 10 === 0;
    maxEnemyHp = isBoss ? stage * 200 : stage * 50;
    currentEnemyHp = maxEnemyHp;
    
    const sprite = document.getElementById('enemy-sprite');
    sprite.innerText = isBoss ? bosses[Math.floor(Math.random()*bosses.length)] : enemies[Math.floor(Math.random()*enemies.length)];
    if(isBoss) sprite.style.fontSize = "70px"; else sprite.style.fontSize = "45px";

    document.getElementById('hp-bar-container').style.display = 'block';
    updateHpBar();
}

function updateHpBar() {
    const percent = (currentEnemyHp / maxEnemyHp) * 100;
    document.getElementById('hp-bar-fill').style.width = percent + '%';
}

// 인벤토리 순서대로 미사일 발사
function shootNextMissile() {
    // 인벤토리에서 치아가 있는 칸들만 필터링
    const slotsWithTeeth = [];
    for(let i=0; i<maxSlots; i++) {
        if(inventory[i] > 0) slotsWithTeeth.push({lv: inventory[i], idx: i});
    }

    if(slotsWithTeeth.length === 0) return;

    // 순차적 인덱스 관리
    if(missileIndex >= slotsWithTeeth.length) missileIndex = 0;
    const currentTooth = slotsWithTeeth[missileIndex];
    missileIndex++;

    createMissile(currentTooth.lv);
}

function createMissile(lv) {
    const missile = document.createElement('div');
    missile.className = 'missile';
    missile.innerText = '🦷';
    document.getElementById('battle-field').appendChild(missile);

    // 데미지 계산 및 발사
    const dmg = Math.pow(2, lv - 1) + (stage * 2);

    setTimeout(() => {
        missile.style.left = '310px'; // 적 위치 근처
        setTimeout(() => {
            applyDamage(dmg);
            missile.remove();
        }, 400);
    }, 50);
}

function applyDamage(dmg) {
    currentEnemyHp -= dmg;
    if(currentEnemyHp < 0) currentEnemyHp = 0;
    updateHpBar();

    // 데미지 텍스트 띄우기
    const dmgText = document.createElement('div');
    dmgText.className = 'dmg-text';
    dmgText.innerText = Math.floor(dmg);
    dmgText.style.left = (310 + Math.random()*20) + 'px';
    dmgText.style.top = '60px';
    document.getElementById('battle-field').appendChild(dmgText);
    setTimeout(() => dmgText.remove(), 600);

    // 적 피격 흔들림
    const sprite = document.getElementById('enemy-sprite');
    sprite.style.transform = 'translateX(5px)';
    setTimeout(() => sprite.style.transform = 'translateX(0)', 50);

    if(currentEnemyHp <= 0) {
        gold += maxEnemyHp * 0.5;
        stage++;
        updateStats();
        spawnEnemy();
    }
}

// --- 인벤토리 로직 ---
function setupDragEvents(slot, index) {
    slot.addEventListener('touchstart', (e) => {
        if (inventory[index] === 0) return;
        dragStartIndex = index;
        slot.classList.add('dragging');
    });

    slot.addEventListener('touchmove', (e) => {
        if (dragStartIndex === null) return;
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
        if (target && target.classList.contains('slot')) target.classList.add('drag-over');
    });

    slot.addEventListener('touchend', (e) => {
        if (dragStartIndex === null) return;
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (target && target.dataset.index !== undefined) {
            const to = parseInt(target.dataset.index);
            if (to !== dragStartIndex) {
                if (inventory[to] === inventory[dragStartIndex]) {
                    tryCombine(dragStartIndex, to);
                } else if (inventory[to] === 0) {
                    inventory[to] = inventory[dragStartIndex];
                    inventory[dragStartIndex] = 0;
                }
            }
        }
        document.querySelectorAll('.slot').forEach(s => s.classList.remove('dragging', 'drag-over'));
        dragStartIndex = null;
        renderInventory();
        updateStats();
    });
}

function tryCombine(from, to) {
    const lv = inventory[from];
    inventory[from] = 0;
    if (Math.random() < 0.05 && lv <= 18) {
        inventory[to] = lv + 2;
        document.getElementById('status-msg').innerText = "✨ 대성공!";
    } else {
        inventory[to] = lv + 1;
        document.getElementById('status-msg').innerText = `Lv.${lv+1} 합성!`;
    }
}

function sortInventory() {
    let items = inventory.filter(v => v > 0);
    if (sortMode === 'desc') { items.sort((a, b) => b - a); sortMode = 'asc'; }
    else { items.sort((a, b) => a - b); sortMode = 'desc'; }
    inventory.fill(0);
    items.forEach((v, i) => inventory[i] = v);
    renderInventory();
}

function buyAutoCombine() {
    if (hasAutoCombine) return;
    if (gold >= 10000) { gold -= 10000; hasAutoCombine = true; document.getElementById('auto-combine-btn').innerText = "🤖 자동합성 ON"; updateStats(); }
}

function runAutoCombine() {
    if (!hasAutoCombine) return;
    for (let i = 0; i < maxSlots; i++) {
        if (inventory[i] === 0) continue;
        for (let j = i + 1; j < maxSlots; j++) {
            if (inventory[i] === inventory[j] && inventory[i] < 20) {
                inventory[j] = 0; inventory[i] += 1;
                renderInventory(); return;
            }
        }
    }
}

function buyTooth() {
    if (gold < 100) return;
    let idx = inventory.indexOf(0);
    if (idx !== -1 && idx < maxSlots) {
        gold -= 100; inventory[idx] = 1;
        renderInventory(); updateStats();
    }
}

function expandInventory() {
    if (gold >= 5000 && maxSlots < 32) {
        gold -= 5000; maxSlots = 32;
        document.getElementById('expand-btn').style.display = 'none';
        renderInventory(); updateStats();
    }
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = `slot item-lv-${inventory[i]}`;
        slot.dataset.index = i;
        slot.innerText = inventory[i] > 0 ? `Lv.${inventory[i]}` : '';
        setupDragEvents(slot, i);
        grid.appendChild(slot);
    }
}

function updateStats() {
    document.getElementById('gold-display').innerText = Math.floor(gold).toLocaleString();
    document.getElementById('stage-display').innerText = stage;
    saveGame();
}

function init() {
    loadGame();
    if(hasAutoCombine) document.getElementById('auto-combine-btn').innerText = "🤖 자동합성 ON";
    renderInventory();
    updateStats();
    spawnEnemy();
    setInterval(shootNextMissile, 800); // 0.8초마다 순차 발사
    setInterval(runAutoCombine, 2000);
}
init();
