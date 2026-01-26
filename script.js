let gold = 1000;
let maxSlots = 24;
let inventory = new Array(32).fill(0);
let dragStartIndex = null;

// --- 1. 데이터 관리 및 자동 저장 ---
function loadGame() {
    const saved = localStorage.getItem('toothIdleSaveV2');
    if (saved) {
        const data = JSON.parse(saved);
        gold = data.gold;
        maxSlots = data.maxSlots;
        inventory = data.inventory;
    }
}

function saveGame() {
    localStorage.setItem('toothIdleSaveV2', JSON.stringify({ gold, maxSlots, inventory }));
}

// --- 2. 방치형 요소: 자동 골드 생산 ---
function calculateProduction() {
    let pps = 0; // Production Per Second
    inventory.forEach(lv => {
        if (lv > 0) pps += Math.pow(2, lv - 1); // 레벨이 높을수록 생산량 기하급수적 증가
    });
    return pps;
}

function autoProduce() {
    const pps = calculateProduction();
    gold += pps;
    document.getElementById('pps-display').innerText = pps.toLocaleString();
    updateStats();
}

// --- 3. 드래그 앤 드롭 로직 (모바일/PC 공용) ---
function setupDragEvents(slot, index) {
    // 터치 시작
    slot.addEventListener('touchstart', (e) => {
        if (inventory[index] === 0) return;
        dragStartIndex = index;
        slot.classList.add('dragging');
        const touch = e.touches[0];
        showProxy(touch.clientX, touch.clientY, inventory[index]);
    }, {passive: false});

    // 터치 이동
    slot.addEventListener('touchmove', (e) => {
        if (dragStartIndex === null) return;
        e.preventDefault();
        const touch = e.touches[0];
        moveProxy(touch.clientX, touch.clientY);

        // 현재 손가락 아래에 있는 슬롯 찾기
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
        if (target && target.classList.contains('slot')) target.classList.add('drag-over');
    }, {passive: false});

    // 터치 끝
    slot.addEventListener('touchend', (e) => {
        if (dragStartIndex === null) return;
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        
        if (target && target.dataset.index !== undefined) {
            const targetIndex = parseInt(target.dataset.index);
            if (targetIndex !== dragStartIndex) tryCombine(dragStartIndex, targetIndex);
        }

        hideProxy();
        document.querySelectorAll('.slot').forEach(s => {
            s.classList.remove('dragging');
            s.classList.remove('drag-over');
        });
        dragStartIndex = null;
    });
}

function tryCombine(from, to) {
    if (inventory[from] === inventory[to] && inventory[from] > 0 && inventory[from] < 20) {
        const currentLv = inventory[from];
        inventory[from] = 0;
        
        const random = Math.random() * 100;
        const statusMsg = document.getElementById('status-msg');
        
        if (random < 5 && currentLv <= 18) { // 5% 확률 대성공
            inventory[to] = currentLv + 2;
            statusMsg.innerText = `✨ 대성공!! Lv.${currentLv+2}를 얻었습니다!`;
            statusMsg.style.color = "#ffd700";
        } else {
            inventory[to] = currentLv + 1;
            statusMsg.innerText = `합성 성공: Lv.${currentLv+1}`;
            statusMsg.style.color = "white";
        }
        renderInventory();
    }
}

// 드래그 시 따라다니는 아이콘 표시
const proxy = document.getElementById('drag-proxy');
function showProxy(x, y, lv) {
    proxy.style.display = 'block';
    proxy.innerText = 'Lv.' + lv;
    moveProxy(x, y);
}
function moveProxy(x, y) {
    proxy.style.left = (x - 20) + 'px';
    proxy.style.top = (y - 20) + 'px';
}
function hideProxy() { proxy.style.display = 'none'; }

// --- 4. 초기화 및 렌더링 ---
function updateStats() {
    document.getElementById('gold-display').innerText = Math.floor(gold).toLocaleString();
    document.getElementById('total-slots').innerText = maxSlots;
    document.getElementById('slot-usage').innerText = inventory.filter(x => x > 0).length;
    saveGame();
}

function renderInventory() {
    const invGrid = document.getElementById('inventory-grid');
    invGrid.innerHTML = '';
    invGrid.className = maxSlots === 24 ? 'grid-24' : 'grid-32';

    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = `slot item-lv-${inventory[i]}`;
        slot.dataset.index = i; // 인덱스 저장
        slot.innerText = inventory[i] > 0 ? `Lv.${inventory[i]}` : '';
        setupDragEvents(slot, i);
        invGrid.appendChild(slot);
    }
}

function buyTooth() {
    if (gold < 100) return;
    let emptyIndex = inventory.indexOf(0);
    if (emptyIndex !== -1 && emptyIndex < maxSlots) {
        gold -= 100;
        inventory[emptyIndex] = 1;
        updateStats();
        renderInventory();
    }
}

function expandInventory() {
    if (gold >= 5000) {
        gold -= 5000;
        maxSlots = 32;
        document.getElementById('expand-btn').style.display = 'none';
        updateStats();
        renderInventory();
    }
}

function init() {
    loadGame();
    renderInventory();
    updateStats();
    setInterval(autoProduce, 1000); // 1초마다 골드 생산
}

init();
