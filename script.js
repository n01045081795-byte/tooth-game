// Version: 1.6.0 - Main Engine with Dungeon Logic
let gold = 1000;
let unlockedDungeon = 1; 
let pickaxeIdx = 0;
let inventory = new Array(32).fill(0);
let maxSlots = 24;
let mineProgress = 0;
let currentView = 'mine';
let dragStart = null;

function saveGame() {
    localStorage.setItem('toothSaveV160', JSON.stringify({ gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV160');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 1000;
        maxSlots = d.maxSlots || 24;
        inventory = d.inventory || new Array(32).fill(0);
        unlockedDungeon = d.unlockedDungeon || 1;
        pickaxeIdx = d.pickaxeIdx || 0;
    }
}

function switchView(view) {
    currentView = view;
    document.getElementById('mine-view').style.display = view === 'mine' ? 'block' : 'none';
    document.getElementById('war-view').style.display = view === 'war' ? 'block' : 'none';
    document.getElementById('tab-mine').classList.toggle('active', view === 'mine');
    document.getElementById('tab-war').classList.toggle('active', view === 'war');
    if (view === 'war') renderDungeonList();
    renderInventory();
}

function renderDungeonList() {
    const list = document.getElementById('dungeon-list');
    list.innerHTML = '<h3>원정할 던전을 선택하세요</h3>';
    TOOTH_DATA.dungeons.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.className = 'dungeon-btn';
        if (idx < unlockedDungeon) {
            btn.innerHTML = `<span>Lv.${idx+1}</span> ${name}`;
            btn.onclick = () => startDungeon(idx);
        } else {
            btn.innerHTML = `🔒 잠김 (이전 던전 클리어 필요)`;
            btn.disabled = true;
        }
        list.appendChild(btn);
    });
}

function manualMine() {
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    mineProgress += 10;
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
        setupSwap(slot, i);
        grid.appendChild(slot);
    }
}

function setupSwap(slot, i) {
    slot.ontouchstart = () => { if(inventory[i]>0) dragStart = i; };
    slot.ontouchend = (e) => {
        if (dragStart === null) return;
        const target = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        if (target && target.dataset.index !== undefined) {
            const to = parseInt(target.dataset.index);
            if (inventory[to] === inventory[dragStart] && inventory[to] > 0) {
                inventory[to]++; inventory[dragStart] = 0;
            } else {
                [inventory[to], inventory[dragStart]] = [inventory[dragStart], inventory[to]];
            }
            renderInventory();
        }
        dragStart = null;
    };
}

function upgradePickaxe() {
    const next = TOOTH_DATA.pickaxes[pickaxeIdx + 1];
    if (next && gold >= next.cost) {
        gold -= next.cost; pickaxeIdx++; updateUI();
    }
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
        if(currentView === 'mine') {
            mineProgress += (TOOTH_DATA.pickaxes[pickaxeIdx].power / 100);
            if(mineProgress >= 100) { mineProgress = 0; manualMine(); }
            updateUI();
        } else if (dungeonActive) {
            updateBattle();
        }
    }, 50);
};
