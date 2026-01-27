// Version: 1.5.0 - Main Engine
let gold = 1000;
let stage = 1;
let pickaxeIdx = 0;
let inventory = new Array(32).fill(0);
let maxSlots = 24;
let mineProgress = 0;
let dragStart = null;

function manualMine() {
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    mineProgress += pick.power / 2; // 클릭 시 게이지 상승
    if (mineProgress >= 100) {
        mineProgress = 0;
        addMinedTooth(pick);
    }
    updateUI();
}

function addMinedTooth(pick) {
    let emptyIdx = inventory.indexOf(0);
    if (emptyIdx !== -1 && emptyIdx < maxSlots) {
        const isGreat = Math.random() < pick.greatChance;
        inventory[emptyIdx] = isGreat ? pick.mineLv + 1 : pick.mineLv;
        renderInventory();
    }
}

function switchView(view) {
    document.getElementById('mine-view').style.display = view === 'mine' ? 'block' : 'none';
    document.getElementById('war-view').style.display = view === 'war' ? 'block' : 'none';
    document.getElementById('tab-mine').classList.toggle('active', view === 'mine');
    document.getElementById('tab-war').classList.toggle('active', view === 'war');
}

// 인벤토리 자유 스와프 로직
function setupSwap(slot, i) {
    slot.ontouchstart = () => { if(inventory[i]>0) dragStart = i; };
    slot.ontouchend = (e) => {
        const target = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        if (target && target.dataset.index !== undefined) {
            const to = parseInt(target.dataset.index);
            if (inventory[to] === inventory[dragStart] && inventory[to] > 0) {
                inventory[to]++; inventory[dragStart] = 0; // 합성
            } else {
                const temp = inventory[to]; inventory[to] = inventory[dragStart]; inventory[dragStart] = temp; // 스와프
            }
            renderInventory();
        }
        dragStart = null;
    };
}

function updateUI() {
    document.getElementById('gold-display').innerText = fNum(gold);
    document.getElementById('stage-display').innerText = stage;
    document.getElementById('mine-bar').style.width = mineProgress + '%';
}

function init() {
    renderInventory();
    setInterval(() => {
        mineProgress += (TOOTH_DATA.pickaxes[pickaxeIdx].power / 50); // 자동 채굴
        if(mineProgress >= 100) { mineProgress = 0; addMinedTooth(TOOTH_DATA.pickaxes[pickaxeIdx]); }
        updateUI();
    }, 100);
}
init();
