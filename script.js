// Version: 1.8.0 - Main Engine
let gold = 1000;
let unlockedDungeon = 1; 
let pickaxeIdx = 0;
let autoMineLevel = 1;
let inventory = new Array(64).fill(0); // 8x8 고정
let maxSlots = 32; // 4줄 시작
let mineProgress = 0;
let isMiningPaused = false;
let currentView = 'mine';
let dragStart = null;

function saveGame() {
    localStorage.setItem('toothSaveV180', JSON.stringify({ 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        lastTime: Date.now(), isMiningPaused 
    }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV180');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold; maxSlots = d.maxSlots; inventory = d.inventory;
        unlockedDungeon = d.unlockedDungeon; pickaxeIdx = d.pickaxeIdx;
        autoMineLevel = d.autoMineLevel;
        isMiningPaused = d.isMiningPaused || false;
        
        // 오프라인 채굴 계산
        if (!isMiningPaused && d.lastTime) {
            const offTime = (Date.now() - d.lastTime) / 1000;
            const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
            const rate = (pick.power * 0.05 * autoMineLevel);
            let totalMined = Math.floor(offTime * rate / 100);
            for(let i=0; i<totalMined; i++) {
                let idx = inventory.indexOf(0);
                if(idx !== -1 && idx < maxSlots) inventory[idx] = pick.mineLv;
                else break;
            }
        }
    }
    updateMiningButton();
}

function toggleMining() {
    isMiningPaused = !isMiningPaused;
    updateMiningButton();
    saveGame();
}

function updateMiningButton() {
    const btn = document.getElementById('mine-toggle-btn');
    btn.innerText = isMiningPaused ? "▶️ 채굴 재개" : "⏸️ 일시 정지";
    btn.style.background = isMiningPaused ? "#2ecc71" : "#e74c3c";
}

function sortInventory() {
    let items = inventory.filter(v => v > 0);
    items.sort((a, b) => b - a); // 높은 레벨 순서 고정
    inventory.fill(0);
    items.forEach((v, i) => { if(i < 64) inventory[i] = v; });
    renderInventory();
    saveGame();
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
            slot.ontouchstart = () => { if(inventory[i]>0) dragStart = i; };
            slot.ontouchend = (e) => {
                const target = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                if (target && target.dataset.index !== undefined) {
                    const to = parseInt(target.dataset.index);
                    if (to < maxSlots) handleMergeOrSwap(dragStart, to);
                }
                dragStart = null;
            };
            slot.ondblclick = () => { if(inventory[i] > 0) massMerge(inventory[i]); };
        }
        grid.appendChild(slot);
    }
}

function openShop() {
    const shop = document.getElementById('shop-modal');
    const content = document.getElementById('shop-content');
    shop.style.display = 'flex';
    
    let expansionCount = (maxSlots - 32) / 8;
    content.innerHTML = `<h3>💎 강화 상점</h3>`;
    
    if (expansionCount < 4) {
        const cost = TOOTH_DATA.invExpansion[expansionCount];
        content.innerHTML += `
            <div class="shop-item">
                <p>🎒 인벤토리 1줄 확장 (${expansionCount+5}행)</p>
                <button onclick="buyExpansion(${cost})" class="gold-btn">💰 ${fNum(cost)}G 구매</button>
            </div>`;
    } else {
        content.innerHTML += `<p>✅ 인벤토리 최대 확장 완료</p>`;
    }
    content.innerHTML += `<button onclick="closeShop()" class="btn-sm" style="margin-top:20px;">닫기</button>`;
}

function buyExpansion(cost) {
    if (gold >= cost) {
        gold -= cost; maxSlots += 8; openShop(); renderInventory(); updateUI();
    } else { alert("골드가 부족합니다."); }
}

function handleMergeOrSwap(from, to) {
    if (from === null || from === to) return;
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

window.onload = () => {
    loadGame(); switchView('mine');
    setInterval(() => {
        if(!isMiningPaused) {
            const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
            mineProgress += (pick.power * 0.05 * autoMineLevel);
            if(mineProgress >= 100) {
                mineProgress = 0;
                let idx = inventory.indexOf(0);
                if(idx !== -1 && idx < maxSlots) inventory[idx] = pick.mineLv;
            }
            updateUI();
        }
        if (dungeonActive) updateBattle();
    }, 50);
};

function updateUI() {
    document.getElementById('gold-display').innerText = fNum(gold);
    document.getElementById('mine-bar').style.width = mineProgress + '%';
    saveGame();
}
