// Version: 1.8.4 - Drag Effects & Offline Mining
let gold = 1000;
let unlockedDungeon = 1; 
let pickaxeIdx = 0;
let autoMineLevel = 1;
let inventory = new Array(64).fill(0);
let maxSlots = 32;
let mineProgress = 0;
let isMiningPaused = false;
let currentView = 'mine';

// 드래그 관련 변수
let dragIdx = null;
let dragProxy = null;

function saveGame() {
    localStorage.setItem('toothSaveV184', JSON.stringify({ 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        lastTime: Date.now(), isMiningPaused 
    }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV184');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 1000; maxSlots = d.maxSlots || 32; inventory = d.inventory || new Array(64).fill(0);
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
        
        // 오프라인 채굴 연산
        if (!isMiningPaused && d.lastTime) {
            const now = Date.now();
            const elapsedSec = (now - d.lastTime) / 1000;
            const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
            const pps = (pick.power * 0.05 * autoMineLevel) / 100; // 초당 채굴 진행률
            const minedCount = Math.floor(elapsedSec * pps);
            
            for(let i=0; i < minedCount; i++) {
                let idx = inventory.indexOf(0);
                if(idx !== -1 && idx < maxSlots) inventory[idx] = pick.mineLv;
                else break;
            }
        }
    }
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const slot = document.createElement('div');
        slot.className = `slot ${i < 8 ? 'attack-slot' : ''} ${i >= maxSlots ? 'locked-slot' : ''}`;
        slot.dataset.index = i;
        if (i < maxSlots && inventory[i] > 0) {
            slot.innerHTML = getToothIcon(inventory[i]) + `<span class="lv-text">Lv.${inventory[i]}</span>`;
        } else if (i >= maxSlots) {
            slot.innerHTML = "🔒";
        }
        
        if (i < maxSlots) {
            // 터치 드래그 이벤트 (시각 효과 포함)
            slot.ontouchstart = (e) => {
                if (inventory[i] <= 0) return;
                dragIdx = i;
                const touch = e.touches[0];
                startDrag(touch.clientX, touch.clientY, inventory[i]);
                slot.classList.add('dragging');
            };
        }
        grid.appendChild(slot);
    }
}

function startDrag(x, y, lv) {
    const proxy = document.getElementById('drag-proxy');
    proxy.innerHTML = getToothIcon(lv);
    proxy.style.display = 'block';
    proxy.style.left = (x - 20) + 'px';
    proxy.style.top = (y - 40) + 'px';
}

// 윈도우 전역 터치 이동/끝 처리
window.ontouchmove = (e) => {
    if (dragIdx === null) return;
    const touch = e.touches[0];
    const proxy = document.getElementById('drag-proxy');
    proxy.style.left = (touch.clientX - 20) + 'px';
    proxy.style.top = (touch.clientY - 40) + 'px';

    // 현재 손가락 아래의 슬롯 강조
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
    if (target && target.closest('.slot')) {
        const slot = target.closest('.slot');
        if (parseInt(slot.dataset.index) < maxSlots) slot.classList.add('drag-over');
    }
};

window.ontouchend = (e) => {
    if (dragIdx === null) return;
    document.getElementById('drag-proxy').style.display = 'none';
    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (target && target.closest('.slot')) {
        const toIdx = parseInt(target.closest('.slot').dataset.index);
        if (toIdx < maxSlots) handleMoveOrMerge(dragIdx, toIdx);
    }
    
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('dragging', 'drag-over'));
    dragIdx = null;
    renderInventory();
};

function handleMoveOrMerge(from, to) {
    if (from === to) return;
    if (inventory[from] === inventory[to] && inventory[from] > 0) {
        const nextLv = Math.random() < 0.05 ? inventory[from] + 2 : inventory[from] + 1;
        inventory[to] = nextLv;
        inventory[from] = 0;
    } else {
        [inventory[from], inventory[to]] = [inventory[to], inventory[from]];
    }
    saveGame();
}

// 기존 유틸리티들
function manualMine() {
    const miner = document.getElementById('miner-char');
    miner.classList.remove('swing');
    void miner.offsetWidth;
    miner.classList.add('swing');
    processMining(10);
}

function processMining(amt) {
    if (isMiningPaused) return;
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    mineProgress += amt;
    if (mineProgress >= 100) {
        mineProgress = 0;
        let emptyIdx = inventory.indexOf(0);
        if (emptyIdx !== -1 && emptyIdx < maxSlots) {
            inventory[emptyIdx] = Math.random() < pick.greatChance ? pick.mineLv + 1 : pick.mineLv;
            renderInventory();
        }
    }
    updateUI();
}

function toggleMining() {
    isMiningPaused = !isMiningPaused;
    document.getElementById('mine-toggle-btn').innerText = isMiningPaused ? "▶️ 채굴 재개" : "⏸️ 일시 정지";
    saveGame();
}

function switchView(view) {
    currentView = view;
    document.getElementById('mine-view').style.display = view === 'mine' ? 'flex' : 'none';
    document.getElementById('war-view').style.display = view === 'war' ? 'block' : 'none';
    document.getElementById('tab-mine').classList.toggle('active', view === 'mine');
    document.getElementById('tab-war').classList.toggle('active', view === 'war');
    document.getElementById('inventory-section').style.display = view === 'mine' ? 'flex' : 'none';
    if (view === 'war') renderDungeonList();
}

function updateUI() {
    document.getElementById('gold-display').innerText = fNum(gold);
    document.getElementById('mine-bar').style.width = mineProgress + '%';
    document.getElementById('pickaxe-name').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].name;
    saveGame();
}

window.onload = () => {
    loadGame();
    switchView('mine');
    setInterval(() => {
        if(!isMiningPaused) {
            const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
            processMining(pick.power * 0.05 * autoMineLevel);
        }
        if (dungeonActive) updateBattle();
    }, 50);
};

// 나머지 상점 및 정렬 함수들은 v1.8.3과 동일
function sortInventory() {
    let items = inventory.filter(v => v > 0);
    items.sort((a, b) => b - a);
    inventory.fill(0);
    items.forEach((v, i) => { if(i < 64) inventory[i] = v; });
    renderInventory();
    saveGame();
}

function openShop() {
    document.getElementById('shop-modal').style.display = 'flex';
    renderShopItems();
}

function closeShop() { document.getElementById('shop-modal').style.display = 'none'; }

function renderShopItems() {
    const content = document.getElementById('shop-content');
    let expansionCount = (maxSlots - 32) / 8;
    content.innerHTML = `<h3 style="color:var(--gold); text-align:center;">💎 강화 상점</h3><div id="shop-items-container"></div>`;
    const container = document.getElementById('shop-items-container');
    const pickNext = TOOTH_DATA.pickaxes[pickaxeIdx + 1];
    if (pickNext) {
        container.innerHTML += `<div class="shop-item"><p>⚒️ ${pickNext.name}</p><button onclick="buyItem('pick', ${pickNext.cost})" class="btn-gold">💰 ${fNum(pickNext.cost)}</button></div>`;
    }
    const autoCost = autoMineLevel * 2000;
    container.innerHTML += `<div class="shop-item"><p>🤖 자동채굴 Lv.${autoMineLevel}</p><button onclick="buyItem('auto', ${autoCost})" class="btn-gold">💰 ${fNum(autoCost)}</button></div>`;
    if (expansionCount < 4) {
        const expCost = TOOTH_DATA.invExpansion[expansionCount];
        container.innerHTML += `<div class="shop-item"><p>🎒 인벤토리 확장</p><button onclick="buyItem('exp', ${expCost})" class="btn-gold">💰 ${fNum(expCost)}</button></div>`;
    }
    content.innerHTML += `<button onclick="closeShop()" class="btn-red" style="width:100%; margin-top:15px; border:none; padding:10px; border-radius:5px;">❌ 상점 나가기</button>`;
}

function buyItem(type, cost) {
    if (gold >= cost) {
        gold -= cost;
        if (type === 'pick') pickaxeIdx++;
        else if (type === 'auto') autoMineLevel++;
        else if (type === 'exp') maxSlots += 8;
        renderShopItems(); renderInventory(); updateUI();
    } else { alert("골드가 부족합니다!"); }
}
