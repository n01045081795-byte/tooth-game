// Version: 1.1.0
let gold = 1000;
let maxSlots = 24;
let inventory = new Array(32).fill(0);
let dragStartIndex = null;

// --- 데이터 관리 ---
function loadGame() {
    const saved = localStorage.getItem('toothIdleSaveV110');
    if (saved) {
        const data = JSON.parse(saved);
        gold = data.gold;
        maxSlots = data.maxSlots;
        inventory = data.inventory;
    }
}
function saveGame() {
    localStorage.setItem('toothIdleSaveV110', JSON.stringify({ gold, maxSlots, inventory }));
}

// --- 전투 및 미사일 시스템 ---
function shootMissile() {
    const activeTeeth = inventory.filter(lv => lv > 0);
    if (activeTeeth.length === 0) return;

    // 인벤토리의 랜덤한 치아 하나를 미사일로 선택
    const randomLv = activeTeeth[Math.floor(Math.random() * activeTeeth.length)];
    
    const missile = document.createElement('div');
    missile.className = 'missile';
    missile.innerText = '🦷';
    missile.style.filter = `hue-rotate(${randomLv * 40}deg)`; // 레벨별 색상 차이
    document.getElementById('battle-field').appendChild(missile);

    // 미사일 이동 애니메이션
    setTimeout(() => {
        missile.style.left = '350px';
        missile.style.opacity = '0';
    }, 50);

    // 적 피격 효과
    setTimeout(() => {
        document.getElementById('enemy').style.transform = 'translateX(5px)';
        setTimeout(() => { document.getElementById('enemy').style.transform = 'translateX(0)'; }, 50);
        missile.remove();
        
        // 피격 시 골드 획득 (방치형 보너스)
        gold += Math.pow(1.5, randomLv);
        updateStats();
    }, 550);
}

// --- 드래그 합성 및 터치 제어 ---
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
            const targetIndex = parseInt(target.dataset.index);
            if (targetIndex !== dragStartIndex) tryCombine(dragStartIndex, targetIndex);
        }
        document.querySelectorAll('.slot').forEach(s => s.classList.remove('dragging', 'drag-over'));
        dragStartIndex = null;
    });
}

function tryCombine(from, to) {
    if (inventory[from] === inventory[to] && inventory[from] > 0 && inventory[from] < 20) {
        const currentLv = inventory[from];
        inventory[from] = 0;
        
        const random = Math.random() * 100;
        if (random < 5 && currentLv <= 18) { // 대성공
            inventory[to] = currentLv + 2;
            document.getElementById('status-msg').innerText = `✨ 대성공!! Lv.${currentLv+2}`;
        } else {
            inventory[to] = currentLv + 1;
            document.getElementById('status-msg').innerText = `합성 성공: Lv.${currentLv+1}`;
        }
        renderInventory();
        updateStats();
    }
}

// --- 핵심 기능 ---
function buyTooth() {
    if (gold < 100) return;
    let emptyIndex = inventory.indexOf(0);
    // 중요: maxSlots 범위 안의 빈 공간만 찾아야 함
    if (emptyIndex !== -1 && emptyIndex < maxSlots) {
        gold -= 100;
        inventory[emptyIndex] = 1; // 1단계 치아 생성
        renderInventory();
        updateStats();
    } else {
        document.getElementById('status-msg').innerText = "가방이 가득 찼습니다!";
    }
}

function renderInventory() {
    const invGrid = document.getElementById('inventory-grid');
    invGrid.innerHTML = '';
    invGrid.className = maxSlots === 24 ? 'grid-24' : 'grid-32';

    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = `slot item-lv-${inventory[i]}`;
        slot.dataset.index = i;
        slot.innerText = inventory[i] > 0 ? `Lv.${inventory[i]}` : '';
        setupDragEvents(slot, i);
        invGrid.appendChild(slot);
    }
}

function updateStats() {
    document.getElementById('gold-display').innerText = Math.floor(gold).toLocaleString();
    document.getElementById('slot-usage').innerText = inventory.slice(0, maxSlots).filter(x => x > 0).length;
    saveGame();
}

function init() {
    loadGame();
    renderInventory();
    updateStats();
    setInterval(shootMissile, 1000); // 1초마다 전투 미사일 발사
}

init();
