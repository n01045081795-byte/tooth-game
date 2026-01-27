// Version: 1.4.0
let gold = 1000;
let maxSlots = 24;
let inventory = new Array(32).fill(0);
let stage = 1;
let dragStartIndex = null;
let hasAutoCombine = false;
let currentEnemyHp = 100;
let maxEnemyHp = 100;

// 각 슬롯의 쿨타임 상태 (상단 8칸용)
let cooldowns = new Array(8).fill(0); 

function saveGame() {
    localStorage.setItem('toothSaveV140', JSON.stringify({ gold, maxSlots, inventory, stage, hasAutoCombine }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV140');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold; maxSlots = d.maxSlots; inventory = d.inventory;
        stage = d.stage || 1; hasAutoCombine = d.hasAutoCombine || false;
    }
}

// --- 공격 및 밸런스 ---
function getDamage(lv) {
    if (lv === 0) return 0;
    // 레벨업 효율 체감: 1단계 20 -> 2단계 50 -> 3단계 120... (2.2배수 이상)
    return Math.floor(20 * Math.pow(2.5, lv - 1));
}

function getCooldown(lv) {
    // 레벨이 높을수록 조금 더 빨리 쏨 (2초 ~ 0.5초 사이)
    return Math.max(500, 2000 - (lv * 100));
}

// 상단 8칸 개별 공격 루프
function battleLoop() {
    for (let i = 0; i < 8; i++) {
        if (inventory[i] > 0 && cooldowns[i] <= 0) {
            shootMissile(i, inventory[i]);
            cooldowns[i] = getCooldown(inventory[i]);
            updateCooldownUI(i);
        }
        if (cooldowns[i] > 0) {
            cooldowns[i] -= 100;
            updateCooldownUI(i);
        }
    }
}

function updateCooldownUI(idx) {
    const slot = document.querySelector(`.slot[data-index="${idx}"]`);
    if (!slot) return;
    const overlay = slot.querySelector('.cooldown-overlay');
    if (!overlay) return;
    const ratio = (cooldowns[idx] / getCooldown(inventory[idx])) * 100;
    overlay.style.height = Math.max(0, ratio) + '%';
}

function shootMissile(slotIdx, lv) {
    const missile = document.createElement('div');
    missile.className = 'missile';
    missile.innerText = '🦷';
    document.getElementById('battle-field').appendChild(missile);

    setTimeout(() => {
        missile.style.left = '310px';
        setTimeout(() => {
            applyDamage(getDamage(lv));
            missile.remove();
        }, 300);
    }, 20);
}

function applyDamage(dmg) {
    currentEnemyHp -= dmg;
    if (currentEnemyHp < 0) currentEnemyHp = 0;
    updateHpBar();

    const dmgText = document.createElement('div');
    dmgText.className = 'dmg-text';
    dmgText.innerText = dmg.toLocaleString();
    dmgText.style.left = (310 + Math.random()*20) + 'px';
    dmgText.style.top = '60px';
    document.getElementById('battle-field').appendChild(dmgText);
    setTimeout(() => dmgText.remove(), 600);

    if (currentEnemyHp <= 0) {
        gold += maxEnemyHp * 0.4;
        stage++;
        updateStats();
        spawnEnemy();
    }
}

// --- 인벤토리 자유 이동 (스와프) ---
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
                // 핵심: 레벨이 다르면 위치 교체(Swap), 같으면 합성
                if (inventory[to] === inventory[dragStartIndex] && inventory[to] > 0) {
                    tryCombine(dragStartIndex, to);
                } else {
                    const temp = inventory[to];
                    inventory[to] = inventory[dragStartIndex];
                    inventory[dragStartIndex] = temp;
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
    } else {
        inventory[to] = lv + 1;
    }
}

// --- 초기화 및 렌더링 ---
function spawnEnemy() {
    const isBoss = stage % 10 === 0;
    maxEnemyHp = isBoss ? stage * 300 : stage * 80;
    currentEnemyHp = maxEnemyHp;
    document.getElementById('enemy-sprite').innerText = isBoss ? '🐉' : '👾';
    document.getElementById('hp-bar-container').style.display = 'block';
    updateHpBar();
}

function updateHpBar() {
    const percent = (currentEnemyHp / maxEnemyHp) * 100;
    document.getElementById('hp-bar-fill').style.width = percent + '%';
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = `slot item-lv-${inventory[i]}`;
        if (i < 8) slot.classList.add('attack-slot'); // 상단 8칸 표시
        slot.dataset.index = i;
        slot.innerText = inventory[i] > 0 ? `Lv.${inventory[i]}` : '';
        
        const overlay = document.createElement('div');
        overlay.className = 'cooldown-overlay';
        slot.appendChild(overlay);
        
        setupDragEvents(slot, i);
        grid.appendChild(slot);
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

function updateStats() {
    document.getElementById('gold-display').innerText = Math.floor(gold).toLocaleString();
    document.getElementById('stage-display').innerText = stage;
    saveGame();
}

function init() {
    loadGame();
    renderInventory();
    updateStats();
    spawnEnemy();
    setInterval(battleLoop, 100); // 0.1초마다 쿨타임 및 공격 체크
}
init();
