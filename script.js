// Version: 2.0.0 - Main Logic
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
let mercenaryIdx = 0; // 현재 보유/장착 중인 용병 ID
let ownedMercenaries = [0]; // 보유한 용병 목록

function saveGame() {
    localStorage.setItem('toothSaveV200', JSON.stringify({ 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        mercenaryIdx, ownedMercenaries,
        lastTime: Date.now(), isMiningPaused 
    }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV200');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 1000; maxSlots = d.maxSlots || 32; inventory = d.inventory || new Array(64).fill(0);
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
        mercenaryIdx = d.mercenaryIdx || 0;
        ownedMercenaries = d.ownedMercenaries || [0];
        
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
    
    document.getElementById('inventory-section').style.display = view === 'mine' ? 'flex' : 'none';

    if (view === 'war') {
        renderDungeonList();
        renderMercenaryCamp();
    } else {
        renderInventory();
    }
}

// 용병 모집소 UI
function renderMercenaryCamp() {
    const camp = document.getElementById('mercenary-list');
    camp.innerHTML = '';
    TOOTH_DATA.mercenaries.forEach(merc => {
        const div = document.createElement('div');
        div.className = 'merc-card';
        const isOwned = ownedMercenaries.includes(merc.id);
        const isEquipped = mercenaryIdx === merc.id;
        
        div.innerHTML = `
            <div style="font-size:25px;">${merc.icon}</div>
            <div style="font-size:12px; font-weight:bold;">${merc.name}</div>
            <div style="font-size:10px; color:#aaa;">공격 x${merc.atkMul}</div>
        `;
        
        if (isEquipped) {
            div.style.border = '2px solid #2ecc71';
            div.innerHTML += `<div style="color:#2ecc71; font-size:10px;">장착중</div>`;
        } else if (isOwned) {
            div.innerHTML += `<button onclick="equipMerc(${merc.id})" class="btn-sm">장착</button>`;
        } else {
            div.innerHTML += `<button onclick="buyMerc(${merc.id}, ${merc.cost})" class="btn-gold" style="padding:2px 5px; font-size:10px;">${fNum(merc.cost)}G</button>`;
        }
        camp.appendChild(div);
    });
}

function buyMerc(id, cost) {
    if(gold >= cost) {
        gold -= cost;
        ownedMercenaries.push(id);
        renderMercenaryCamp();
        updateUI();
    } else { alert("골드가 부족합니다."); }
}

function equipMerc(id) {
    mercenaryIdx = id;
    renderMercenaryCamp();
    saveGame();
}

function renderDungeonList() {
    const list = document.getElementById('dungeon-list');
    list.innerHTML = '';
    TOOTH_DATA.dungeons.forEach((name, idx) => {
        const div = document.createElement('div');
        const isUnlocked = idx < unlockedDungeon;
        div.className = `dungeon-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        if (isUnlocked) {
            div.innerHTML = `<h4>⚔️ ${name}</h4><p>권장 Lv.${idx + 1} 이상</p>`;
            div.onclick = () => startDungeon(idx);
        } else {
            div.innerHTML = `<h4>🔒 잠김</h4><p>Lv.${idx} 클리어 시 열림</p>`;
        }
        list.appendChild(div);
    });
}

// 나머지 인벤토리 및 합성 로직은 그대로 유지 (더블클릭 복구)
function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const slot = document.createElement('div');
        slot.className = `slot ${i < 8 ? 'attack-slot' : ''} ${i >= maxSlots ? 'locked-slot' : ''}`;
        slot.dataset.index = i;
        slot.id = `slot-${i}`;
        
        if (i < maxSlots && inventory[i] > 0) {
            slot.innerHTML = getToothIcon(inventory[i]) + `<span class="lv-text">Lv.${inventory[i]}</span>`;
        } else if (i >= maxSlots) slot.innerHTML = "🔒";
        
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
            // PC용 더블클릭 이벤트
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
        if(isGreat) triggerGreatSuccess(to); else playSfx('merge');
    } else {
        [inventory[from], inventory[to]] = [inventory[to], inventory[from]];
    }
    renderInventory(); saveGame();
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

function triggerGreatSuccess(idx) {
    playSfx('great');
    const slot = document.getElementById(`slot-${idx}`);
    if (slot) {
        slot.classList.add('shiny-effect');
        setTimeout(() => slot.classList.remove('shiny-effect'), 1000);
    }
}

// 상점 (보유 골드 표시)
function openShop() {
    document.getElementById('shop-modal').style.display = 'flex';
    renderShopItems();
}
function closeShop() { document.getElementById('shop-modal').style.display = 'none'; }

function renderShopItems() {
    const content = document.getElementById('shop-content');
    content.innerHTML = `<h3 style="color:var(--gold);">Upgrade Lab 🧪</h3>
                         <p style="color:#fff; margin-bottom:15px;">보유 골드: <span style="color:var(--gold);">${fNum(gold)}</span></p>
                         <div id="shop-items-container"></div>`;
    const container = document.getElementById('shop-items-container');
    
    // 아이템 렌더링 (곡괭이, 자동채굴, 인벤토리)
    const pickNext = TOOTH_DATA.pickaxes[pickaxeIdx + 1];
    if (pickNext) container.innerHTML += `<div class="shop-item"><p>⚒️ ${pickNext.name}</p><button onclick="buyItem('pick', ${pickNext.cost})" class="btn-gold">💰 ${fNum(pickNext.cost)}</button></div>`;
    
    const autoCost = autoMineLevel * 2000;
    container.innerHTML += `<div class="shop-item"><p>🤖 자동채굴 Lv.${autoMineLevel}</p><button onclick="buyItem('auto', ${autoCost})" class="btn-gold">💰 ${fNum(autoCost)}</button></div>`;
    
    let expCount = (maxSlots - 32) / 8;
    if (expCount < 4) {
        const expCost = TOOTH_DATA.invExpansion[expCount];
        container.innerHTML += `<div class="shop-item"><p>🎒 인벤토리 확장</p><button onclick="buyItem('exp', ${expCost})" class="btn-gold">💰 ${fNum(expCost)}</button></div>`;
    }
    
    content.innerHTML += `<button onclick="closeShop()" class="btn-red" style="width:100%; margin-top:20px;">닫기</button>`;
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

// 채굴 로직
function manualMine() {
    const miner = document.getElementById('miner-char');
    miner.classList.remove('swing');
    void miner.offsetWidth; miner.classList.add('swing');
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

function toggleMining() {
    isMiningPaused = !isMiningPaused;
    document.getElementById('mine-toggle-btn').innerText = isMiningPaused ? "▶️ 재개" : "⏸️ 정지";
    saveGame();
}

function sortInventory() {
    let items = inventory.filter(v => v > 0);
    items.sort((a, b) => b - a);
    inventory.fill(0);
    items.forEach((v, i) => { if(i < 64) inventory[i] = v; });
    renderInventory(); saveGame();
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
        if(!isMiningPaused) processMining(TOOTH_DATA.pickaxes[pickaxeIdx].power * 0.05 * autoMineLevel);
        if (dungeonActive) updateBattle();
    }, 50);
};
