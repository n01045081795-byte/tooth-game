// Version: 1.2.0
let gold = 1000;
let maxSlots = 24;
let inventory = new Array(32).fill(0);
let stage = 1;
let dragStartIndex = null;
let sortMode = 'desc'; // desc, asc
let hasAutoCombine = false;

const enemies = ['👾', '👻', '💀', '🧛', '👹', '👺'];
const bosses = ['🐉', '🧟', '🌋', '👑'];
const bgColors = ['#243b55', '#2c3e50', '#4b1248', '#141e30', '#000428'];

function saveGame() {
    localStorage.setItem('toothSaveV120', JSON.stringify({ gold, maxSlots, inventory, stage, hasAutoCombine }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV120');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold; maxSlots = d.maxSlots; inventory = d.inventory;
        stage = d.stage || 1; hasAutoCombine = d.hasAutoCombine || false;
    }
}

// --- 전투 시스템 ---
function spawnEnemy() {
    const isBoss = stage % 10 === 0;
    const container = document.getElementById('enemy-container');
    const enemy = document.createElement('div');
    enemy.className = 'enemy' + (isBoss ? ' boss' : '');
    enemy.innerText = isBoss ? bosses[Math.floor(Math.random()*bosses.length)] : enemies[Math.floor(Math.random()*enemies.length)];
    container.appendChild(enemy);

    // 적 이동 및 충돌
    setTimeout(() => {
        enemy.style.right = '330px'; // 용사 앞까지 이동
        setTimeout(() => {
            attackEnemy(enemy, isBoss);
        }, 2000);
    }, 100);
}

function attackEnemy(enemyElement, isBoss) {
    const warrior = document.getElementById('warrior');
    warrior.style.transform = 'scale(1.2)';
    
    // 미사일 발사 시각화
    const missile = document.createElement('div');
    missile.className = 'missile';
    missile.innerText = '🦷';
    document.getElementById('battle-field').appendChild(missile);

    setTimeout(() => {
        missile.style.left = '330px';
        missile.style.opacity = '0';
        
        enemyElement.style.transform = 'rotate(90deg) scale(0)';
        enemyElement.style.opacity = '0';
        
        // 보상
        const reward = isBoss ? stage * 500 : stage * 50;
        gold += reward;
        
        if(isBoss) {
            stage++;
            changeBackground();
        } else {
            stage++;
        }
        
        setTimeout(() => { 
            enemyElement.remove(); 
            missile.remove();
            warrior.style.transform = 'scale(1)';
            updateStats();
            spawnEnemy(); // 다음 적 등장
        }, 500);
    }, 400);
}

function changeBackground() {
    const color = bgColors[Math.floor(stage / 10) % bgColors.length];
    document.getElementById('battle-field').style.backgroundColor = color;
}

// --- 인벤토리 기능 ---
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
                    // 단순 자리 이동
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

function sortInventory() {
    let items = inventory.filter(v => v > 0);
    if (sortMode === 'desc') {
        items.sort((a, b) => b - a);
        sortMode = 'asc';
    } else {
        items.sort((a, b) => a - b);
        sortMode = 'desc';
    }
    inventory.fill(0);
    items.forEach((v, i) => inventory[i] = v);
    renderInventory();
}

function buyAutoCombine() {
    if (hasAutoCombine) return;
    if (gold >= 10000) {
        gold -= 10000;
        hasAutoCombine = true;
        document.getElementById('auto-combine-btn').innerText = "🤖 자동합성 ON";
        updateStats();
    } else {
        alert("구매 비용(10000G)이 부족합니다.");
    }
}

function runAutoCombine() {
    if (!hasAutoCombine) return;
    for (let i = 0; i < maxSlots; i++) {
        if (inventory[i] === 0) continue;
        for (let j = i + 1; j < maxSlots; j++) {
            if (inventory[i] === inventory[j] && inventory[i] < 20) {
                inventory[j] = 0;
                inventory[i] += 1; // 자동합성은 대성공 없음
                renderInventory();
                return; // 한 번에 하나씩만
            }
        }
    }
}

// --- 기본 로직 ---
function tryCombine(from, to) {
    const lv = inventory[from];
    inventory[from] = 0;
    if (Math.random() < 0.05 && lv <= 18) {
        inventory[to] = lv + 2;
        document.getElementById('status-msg').innerText = "✨ 대성공!";
    } else {
        inventory[to] = lv + 1;
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
    setInterval(runAutoCombine, 2000); // 2초마다 체크
}
init();
