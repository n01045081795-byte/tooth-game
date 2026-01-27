// Version: 1.5.1 - Main Engine
let gold = 1000;
let stage = 1;
let pickaxeIdx = 0;
let inventory = new Array(32).fill(0);
let maxSlots = 24;
let mineProgress = 0;
let currentView = 'mine';
let dragStart = null;
let hasAutoCombine = false;

function saveGame() {
    localStorage.setItem('toothSaveV151', JSON.stringify({ gold, maxSlots, inventory, stage, pickaxeIdx, hasAutoCombine }));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV151');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold; maxSlots = d.maxSlots; inventory = d.inventory;
        stage = d.stage; pickaxeIdx = d.pickaxeIdx; hasAutoCombine = d.hasAutoCombine;
    }
}

function switchView(view) {
    currentView = view;
    document.getElementById('mine-view').style.display = view === 'mine' ? 'block' : 'none';
    document.getElementById('war-view').style.display = view === 'war' ? 'block' : 'none';
    document.getElementById('tab-mine').classList.toggle('active', view === 'mine');
    document.getElementById('tab-war').classList.toggle('active', view === 'war');
    renderInventory();
}

function manualMine() {
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    mineProgress += 10;
    if (mineProgress >= 100) {
        mineProgress = 0;
        let emptyIdx = inventory.indexOf(0);
        if (emptyIdx !== -1 && emptyIdx < maxSlots) {
            const isGreat = Math.random() < pick.greatChance;
            inventory[emptyIdx] = isGreat ? pick.mineLv + 1 : pick.mineLv;
            renderInventory();
        }
    }
    updateUI();
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
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
    if (currentView === 'war') renderWarWeapons();
}

function setupSwap(slot, i) {
    slot.ontouchstart = (e) => { if(inventory[i]>0) dragStart = i; };
    slot.ontouchend = (e) => {
        if (dragStart === null) return;
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        if (target && target.dataset.index !== undefined) {
            const to = parseInt(target.dataset.index);
            if (to !== dragStart) {
                if (inventory[to] === inventory[dragStart] && inventory[to] > 0) {
                    inventory[to]++; inventory[dragStart] = 0;
                } else {
                    const temp = inventory[to]; inventory[to] = inventory[dragStart]; inventory[dragStart] = temp;
                }
                renderInventory();
            }
        }
        dragStart = null;
    };
}

function upgradePickaxe() {
    if (pickaxeIdx < TOOTH_DATA.pickaxes.length - 1) {
        const next = TOOTH_DATA.pickaxes[pickaxeIdx + 1];
        if (gold >= next.cost) {
            gold -= next.cost;
            pickaxeIdx++;
            renderInventory();
            updateUI();
        }
    }
}

function updateUI() {
    document.getElementById('gold-display').innerText = fNum(gold);
    document.getElementById('stage-display').innerText = stage;
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
            if(mineProgress >= 100) {
                mineProgress = 0;
                let idx = inventory.indexOf(0);
                if(idx !== -1 && idx < maxSlots) {
                    inventory[idx] = TOOTH_DATA.pickaxes[pickaxeIdx].mineLv;
                    renderInventory();
                }
            }
            updateUI();
        } else {
            spawnEnemy();
            updateBattle();
        }
    }, 100);
};
