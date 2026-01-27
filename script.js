// Version: 1.7.0 - Main Engine
let gold = 1000;
let unlockedDungeon = 1; 
let pickaxeIdx = 0;
let autoMineLevel = 1; // 자동 채굴 속도 업그레이드 단계
let inventory = new Array(80).fill(0); // 최대 10줄 (8*10)
let maxSlots = 32; // 기본 4줄 시작
let mineProgress = 0;
let currentView = 'mine';
let dragStart = null;

function saveGame() {
    localStorage.setItem('toothSaveV170', JSON.stringify({ gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV170');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 1000;
        maxSlots = d.maxSlots || 32;
        inventory = d.inventory || new Array(80).fill(0);
        unlockedDungeon = d.unlockedDungeon || 1;
        pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1;
    }
}

function switchView(view) {
    currentView = view;
    document.getElementById('mine-view').style.display = view === 'mine' ? 'flex' : 'none';
    document.getElementById('war-view').style.display = view === 'war' ? 'block' : 'none';
    document.getElementById('tab-mine').classList.toggle('active', view === 'mine');
    document.getElementById('tab-war').classList.toggle('active', view === 'war');
    if (view === 'war') renderDungeonList();
    renderInventory();
}

function renderDungeonList() {
    const list = document.getElementById('dungeon-list');
    list.innerHTML = '<h3>원정 던전 선택</h3>';
    TOOTH_DATA.dungeons.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.className = 'dungeon-btn';
        if (idx < unlockedDungeon) {
            btn.innerHTML = `<span>Lv.${idx+1}</span> ${name}`;
            btn.onclick = () => startDungeon(idx);
        } else {
            btn.innerHTML = `🔒 잠김`;
            btn.disabled = true;
        }
        list.appendChild(btn);
    });
}

// 채굴 애니메이션 및 로직
function manualMine() {
    const miner = document.getElementById('miner-char');
    miner.classList.remove('swing');
    void miner.offsetWidth; // 리플로우 강제
    miner.classList.add('swing');
    
    processMining(10); // 수동은 보너스
}

function processMining(amt) {
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    mineProgress += amt;
    if (mineProgress >= 100) {
        mineProgress = 0;
        let emptyIdx = inventory.indexOf(0);
        if (emptyIdx !== -1 && emptyIdx < maxSlots) {
            // 합성 확률 시스템 적용: 대성공 시 +2단계
            let lv = Math.random() < pick.greatChance ? pick.mineLv + 1 : pick.mineLv;
            inventory[emptyIdx] = lv;
            renderInventory();
        }
    }
    updateUI();
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = `slot ${i < 8 ? 'attack-slot' : ''}`;
        slot.dataset.index = i;
        if (inventory[i] > 0) {
            slot.innerHTML = getToothIcon(inventory[i]) + `<span class="lv-text">Lv.${inventory[i]}</span>`;
        }
        
        // 스와프 및 합성 이벤트
        slot.ontouchstart = () => { if(inventory[i]>0) dragStart = i; };
        slot.ontouchend = (e) => {
            if (dragStart === null) return;
            const touch = e.changedTouches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target && target.dataset.index !== undefined) {
                const to = parseInt(target.dataset.index);
                handleMergeOrSwap(dragStart, to);
            }
            dragStart = null;
        };
        
        // 더블클릭 합성 (해당 레벨 일괄 합성)
        slot.ondblclick = () => {
            if(inventory[i] > 0) massMerge(inventory[i]);
        };
        
        grid.appendChild(slot);
    }
}

function handleMergeOrSwap(from, to) {
    if (from === to) return;
    if (inventory[from] === inventory[to] && inventory[from] > 0) {
        // 합성 시 낮은 확률로 2단계 점프
        let nextLv = Math.random() < 0.05 ? inventory[from] + 2 : inventory[from] + 1;
        inventory[to] = nextLv;
        inventory[from] = 0;
    } else {
        [inventory[from], inventory[to]] = [inventory[to], inventory[from]];
    }
    renderInventory();
}

function massMerge(lv) {
    let indices = [];
    inventory.forEach((val, idx) => { if(val === lv && idx < maxSlots) indices.push(idx); });
    if(indices.length < 2) return;
    
    // 짝수개씩 합성
    for(let i=0; i < indices.length - 1; i += 2) {
        let from = indices[i];
        let to = indices[i+1];
        let nextLv = Math.random() < 0.05 ? lv + 2 : lv + 1;
        inventory[to] = nextLv;
        inventory[from] = 0;
    }
    renderInventory();
}

function upgradePickaxe() {
    const next = TOOTH_DATA.pickaxes[pickaxeIdx + 1];
    if (next && gold >= next.cost) {
        gold -= next.cost; pickaxeIdx++; updateUI();
    }
}

function upgradeAutoMine() {
    const cost = autoMineLevel * 2000;
    if (gold >= cost) {
        gold -= cost;
        autoMineLevel++;
        updateUI();
    }
}

function updateUI() {
    document.getElementById('gold-display').innerText = fNum(gold);
    document.getElementById('mine-bar').style.width = mineProgress + '%';
    document.getElementById('pickaxe-name').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].name;
    document.getElementById('auto-mine-btn').innerText = `🤖 자동 채굴 속도 UP (${fNum(autoMineLevel * 2000)})`;
    saveGame();
}

window.onload = () => {
    loadGame();
    renderInventory();
    updateUI();
    setInterval(() => {
        if(currentView === 'mine') {
            processMining(TOOTH_DATA.pickaxes[pickaxeIdx].power * 0.05 * autoMineLevel);
            updateUI();
        } else if (dungeonActive) {
            updateBattle();
        }
    }, 50);
};
