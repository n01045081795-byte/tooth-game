// Version: 1.9.0 - Main Logic
let gold = 1000;
let unlockedDungeon = 1; 
let pickaxeIdx = 0;
let autoMineLevel = 1;
let inventory = new Array(64).fill(0);
let maxSlots = 32;
let mineProgress = 0;
let isMiningPaused = false;
let currentView = 'mine';
let dragStartIdx = null;

function saveGame() {
    localStorage.setItem('toothSaveV190', JSON.stringify({ 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        lastTime: Date.now(), isMiningPaused 
    }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV190');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 1000; maxSlots = d.maxSlots || 32; inventory = d.inventory || new Array(64).fill(0);
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
        
        if (!isMiningPaused && d.lastTime) {
            const offTime = (Date.now() - d.lastTime) / 1000;
            const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
            const pps = (pick.power * 0.05 * autoMineLevel) / 100;
            const minedCount = Math.floor(offTime * pps);
            for(let i=0; i < minedCount; i++) {
                let idx = inventory.indexOf(0);
                if(idx !== -1 && idx < maxSlots) inventory[idx] = pick.mineLv;
                else break;
            }
        }
    }
}

function switchView(view) {
    currentView = view;
    document.getElementById('mine-view').style.display = view === 'mine' ? 'flex' : 'none';
    document.getElementById('war-view').style.display = view === 'war' ? 'block' : 'none';
    document.getElementById('tab-mine').classList.toggle('active', view === 'mine');
    document.getElementById('tab-war').classList.toggle('active', view === 'war');
    
    const invSection = document.getElementById('inventory-section');
    invSection.style.display = view === 'mine' ? 'flex' : 'none';

    if (view === 'war') renderDungeonList();
    else renderInventory();
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const slot = document.createElement('div');
        slot.className = `slot ${i < 8 ? 'attack-slot' : ''} ${i >= maxSlots ? 'locked-slot' : ''}`;
        slot.dataset.index = i;
        slot.id = `slot-${i}`; // ID 부여 (애니메이션용)
        
        if (i < maxSlots && inventory[i] > 0) {
            slot.innerHTML = getToothIcon(inventory[i]) + `<span class="lv-text">Lv.${inventory[i]}</span>`;
        } else if (i >= maxSlots) {
            slot.innerHTML = "🔒";
        }
        
        if (i < maxSlots) {
            slot.ontouchstart = (e) => {
                if (inventory[i] > 0) {
                    dragStartIdx = i;
                    slot.classList.add('picked');
                }
            };
            slot.ontouchend = (e) => {
                if (dragStartIdx === null) return;
                slot.classList.remove('picked');
                const touch = e.changedTouches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (target && target.closest('.slot')) {
                    const toIdx = parseInt(target.closest('.slot').dataset.index);
                    if (toIdx < maxSlots) handleMoveOrMerge(dragStartIdx, toIdx);
                }
                dragStartIdx = null;
            };
            // 더블클릭 일괄 합성 (PC/모바일 공용)
            slot.ondblclick = () => { if(inventory[i] > 0) massMerge(inventory[i]); };
        }
        grid.appendChild(slot);
    }
}

function handleMoveOrMerge(from, to) {
    if (from === to) return;
    if (inventory[from] === inventory[to] && inventory[from] > 0) {
        const isGreat = Math.random() < 0.05;
        const nextLv = isGreat ? inventory[from] + 2 : inventory[from] + 1;
        inventory[to] = nextLv;
        inventory[from] = 0;
        
        if (isGreat) triggerGreatSuccess(to);
        else playSfx('merge');
    } else {
        [inventory[from], inventory[to]] = [inventory[to], inventory[from]];
    }
    renderInventory();
    saveGame();
}

// 대성공 효과
function triggerGreatSuccess(idx) {
    playSfx('great');
    const slot = document.getElementById(`slot-${idx}`);
    if (slot) {
        slot.classList.add('shiny-effect');
        setTimeout(() => slot.classList.remove('shiny-effect'), 1000);
    }
}

function massMerge(lv) {
    let indices = [];
    inventory.forEach((val, idx) => { if(val === lv && idx < maxSlots) indices.push(idx); });
    if(indices.length < 2) return;
    playSfx('merge');
    for(let i=0; i < indices.length - 1; i += 2) {
        inventory[indices[i+1]] = Math.random() < 0.05 ? lv + 2 : lv + 1;
        inventory[indices[i]] = 0;
    }
    renderInventory();
}

function manualMine() {
    const miner = document.getElementById('miner-char');
    miner.classList.remove('swing');
    void miner.offsetWidth;
    miner.classList.add('swing');
    playSfx('mine');
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
            const isGreat = Math.random() < pick.greatChance;
            inventory[emptyIdx] = isGreat ? pick.mineLv + 1 : pick.mineLv;
            renderInventory();
            if(isGreat) triggerGreatSuccess(emptyIdx);
        }
    }
    updateUI();
}

function openShop() {
    document.getElementById('shop-modal').style.display = 'flex';
    renderShopItems();
}
function closeShop() { document.getElementById('shop-modal').style.display = 'none'; }

function renderShopItems() {
    const content = document.getElementById('shop-content');
    let expansionCount = (maxSlots - 32) / 8;
    content.innerHTML = `<h3 style="color:var(--gold); margin-bottom:15px;">💎 강화 상점</h3><div id="shop-items-container"></div>`;
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
    content.innerHTML += `<button onclick="closeShop()" class="btn-exit" style="width:100%; position:static; margin-top:20px;">닫기</button>`;
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

function toggleMining() {
    isMiningPaused = !isMiningPaused;
    document.getElementById('mine-toggle-btn').innerText = isMiningPaused ? "▶️ 채굴 재개" : "⏸️ 일시 정지";
    saveGame();
}

function sortInventory() {
    let items = inventory.filter(v => v > 0);
    items.sort((a, b) => b - a);
    inventory.fill(0);
    items.forEach((v, i) => { if(i < 64) inventory[i] = v; });
    renderInventory();
    saveGame();
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
            processMining(TOOTH_DATA.pickaxes[pickaxeIdx].power * 0.05 * autoMineLevel);
        }
        if (dungeonActive) updateBattle();
    }, 50);
};
