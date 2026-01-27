// Version: 1.8.2 - UI Refinements & Click Merge
let gold = 1000;
let unlockedDungeon = 1; 
let pickaxeIdx = 0;
let autoMineLevel = 1;
let inventory = new Array(64).fill(0);
let maxSlots = 32;
let mineProgress = 0;
let isMiningPaused = false;
let currentView = 'mine';
let dragStart = null;

function saveGame() {
    localStorage.setItem('toothSaveV182', JSON.stringify({ 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        lastTime: Date.now(), isMiningPaused 
    }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV182');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 1000; maxSlots = d.maxSlots || 32; inventory = d.inventory || new Array(64).fill(0);
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
    }
}

function switchView(view) {
    currentView = view;
    document.getElementById('mine-view').style.display = view === 'mine' ? 'flex' : 'none';
    document.getElementById('war-view').style.display = view === 'war' ? 'block' : 'none';
    document.getElementById('tab-mine').classList.toggle('active', view === 'mine');
    document.getElementById('tab-war').classList.toggle('active', view === 'war');
    
    // 던전 원정 탭 진입 시 인벤토리 숨김 처리
    const inv = document.getElementById('inventory-container');
    const act = document.getElementById('action-bar');
    if (view === 'war') {
        inv.style.display = 'none';
        act.style.display = 'none';
        renderDungeonList();
    } else {
        inv.style.display = 'block';
        act.style.display = 'grid';
        renderInventory();
    }
}

function renderDungeonList() {
    const list = document.getElementById('dungeon-list');
    list.innerHTML = '<h3 style="color:#fff;">원정 던전 선택</h3>';
    TOOTH_DATA.dungeons.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.className = 'dungeon-btn';
        if (idx < unlockedDungeon) {
            btn.innerHTML = `<span style="color:#e94560;">Lv.${idx+1}</span> ${name}`;
            btn.onclick = () => startDungeon(idx);
        } else {
            btn.innerHTML = `🔒 잠김`;
            btn.disabled = true;
        }
        list.appendChild(btn);
    });
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
            // 클릭 기반 드래그 (첫 클릭 선택, 두 번째 클릭 이동/합성)
            slot.onclick = () => {
                if (dragStart === null) {
                    if (inventory[i] > 0) {
                        dragStart = i;
                        slot.style.border = "2px solid #fff";
                    }
                } else {
                    handleMergeOrSwap(dragStart, i);
                    dragStart = null;
                }
            };
            // 더블클릭 일괄 합성 복구
            slot.ondblclick = (e) => {
                e.stopPropagation();
                if(inventory[i] > 0) massMerge(inventory[i]);
            };
        }
        grid.appendChild(slot);
    }
}

function handleMergeOrSwap(from, to) {
    if (from === to) return;
    if (inventory[from] === inventory[to] && inventory[from] > 0) {
        inventory[to] = Math.random() < 0.05 ? inventory[from] + 2 : inventory[from] + 1;
        inventory[from] = 0;
    } else { [inventory[from], inventory[to]] = [inventory[to], inventory[from]]; }
    renderInventory(); saveGame();
}

function massMerge(lv) {
    let indices = [];
    inventory.forEach((val, idx) => { if(val === lv && idx < maxSlots) indices.push(idx); });
    for(let i=0; i < indices.length - 1; i += 2) {
        inventory[indices[i+1]] = Math.random() < 0.05 ? lv + 2 : lv + 1;
        inventory[indices[i]] = 0;
    }
    renderInventory();
}

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

function closeShop() {
    document.getElementById('shop-modal').style.display = 'none';
}

function renderShopItems() {
    const content = document.getElementById('shop-content');
    let expansionCount = (maxSlots - 32) / 8;
    let autoMineCost = autoMineLevel * 2000;
    let pickNext = TOOTH_DATA.pickaxes[pickaxeIdx + 1];

    content.innerHTML = `<h3 style="color:#f1c40f; margin-bottom:20px;">💎 강화 상점</h3><div id="shop-items-container"></div>`;
    const container = document.getElementById('shop-items-container');

    if (pickNext) {
        container.innerHTML += `<div class="shop-item"><p style="color:#fff;">⚒️ ${pickNext.name}</p><button onclick="buyPickaxe(${pickNext.cost})" class="gold-btn">💰 ${fNum(pickNext.cost)}G</button></div>`;
    }
    container.innerHTML += `<div class="shop-item"><p style="color:#fff;">🤖 자동 채굴 속도 UP (Lv.${autoMineLevel})</p><button onclick="buyAutoMine(${autoMineCost})" class="gold-btn">💰 ${fNum(autoMineCost)}G</button></div>`;
    if (expansionCount < 4) {
        const cost = TOOTH_DATA.invExpansion[expansionCount];
        container.innerHTML += `<div class="shop-item"><p style="color:#fff;">🎒 인벤토리 1줄 확장</p><button onclick="buyExpansion(${cost})" class="gold-btn">💰 ${fNum(cost)}G</button></div>`;
    }
    content.innerHTML += `<button onclick="closeShop()" class="gold-btn" style="margin-top:20px; background:#e74c3c; width:100%;">❌ 닫기</button>`;
}

function buyPickaxe(cost) { if (gold >= cost) { gold -= cost; pickaxeIdx++; renderShopItems(); updateUI(); } }
function buyAutoMine(cost) { if (gold >= cost) { gold -= cost; autoMineLevel++; renderShopItems(); updateUI(); } }
function buyExpansion(cost) { if (gold >= cost) { gold -= cost; maxSlots += 8; renderShopItems(); renderInventory(); updateUI(); } }

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

function updateUI() {
    document.getElementById('gold-display').innerText = fNum(gold);
    document.getElementById('mine-bar').style.width = mineProgress + '%';
    document.getElementById('pickaxe-name').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].name;
    saveGame();
}

window.onload = () => {
    loadGame();
    renderInventory();
    updateUI();
    setInterval(() => {
        if(!isMiningPaused) {
            const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
            processMining(pick.power * 0.05 * autoMineLevel);
        }
        if (dungeonActive) updateBattle();
    }, 50);
};
