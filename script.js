// Version: 1.5.0
let gold = 1000;
let maxSlots = 24;
let inventory = new Array(32).fill(0);
let stage = 1;
let mineProgress = 0;
let currentView = 'mine';

// --- 그래픽 리소스 (40단계) ---
const toothIcons = ["🦷", "🦷", "🦴", "💎", "✨", "🔥", "🧊", "⚡", "🌈", "🔱", "🌑", "☀️", "🔮", "🧿", "💠", "🏵️", "🍀", "🍃", "🎃", "🥊", "⚔️", "🏹", "🛡️", "🧬", "🧪", "🦾", "📡", "🛸", "🪐", "🌟", "🌌", "🌋", "🐲", "👾", "🤖", "🤡", "👹", "👑", "💎", "🦷"];

function getToothIcon(lv) {
    if (lv === 0) return "";
    let iconIdx = (lv - 1) % toothIcons.length;
    let color = `hsl(${(lv * 30) % 360}, 70%, 70%)`;
    return `<div class="tooth-icon" style="color:${color}">${toothIcons[iconIdx]}</div>`;
}

// --- 채굴 시스템 ---
function autoMine() {
    if (currentView !== 'mine') return;
    mineProgress += 0.5; // 방치 시 채굴 속도
    if (mineProgress >= 100) completeMine();
    updateMineUI();
}

function manualMine() {
    mineProgress += 5; // 터치 시 채굴 가속
    if (mineProgress >= 100) completeMine();
    updateMineUI();
}

function completeMine() {
    mineProgress = 0;
    let emptyIdx = inventory.indexOf(0);
    if (emptyIdx !== -1 && emptyIdx < maxSlots) {
        // 5% 확률로 2레벨 채굴 (대성공)
        let minedLv = Math.random() < 0.05 ? 2 : 1;
        inventory[emptyIdx] = minedLv;
        if (minedLv === 2) showMineMsg("✨ 채굴 대성공! 2레벨 획득!");
        renderInventory();
    }
}

function updateMineUI() {
    const fill = document.getElementById('mine-progress-fill');
    if (fill) fill.style.width = mineProgress + '%';
}

// --- 전쟁터 및 밸런스 시스템 ---
function switchView(view) {
    currentView = view;
    document.getElementById('mine-view').style.display = view === 'mine' ? 'block' : 'none';
    document.getElementById('war-view').style.display = view === 'war' ? 'block' : 'none';
    document.getElementById('tab-mine').className = view === 'mine' ? 'active' : '';
    document.getElementById('tab-war').className = view === 'war' ? 'active' : '';
    if (view === 'war') {
        renderWarWeapons();
        spawnEnemy();
    }
}

// 완화된 대미지 밸런스 (레벨당 약 1.5배)
function getDamage(lv) {
    return Math.floor(10 * Math.pow(1.5, lv - 1)) + (lv * 5);
}

function renderWarWeapons() {
    const container = document.getElementById('weapon-controller');
    container.innerHTML = '';
    // 인벤토리 맨 윗줄 8개만 전쟁터 하단에 표시
    for (let i = 0; i < 8; i++) {
        const slot = document.createElement('div');
        slot.className = 'war-slot';
        slot.innerHTML = getToothIcon(inventory[i]) + `<div class="war-cd" id="cd-${i}"></div>`;
        container.appendChild(slot);
    }
}

// --- 기본 엔진 ---
function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = `slot lv-${inventory[i]}`;
        slot.dataset.index = i;
        slot.innerHTML = getToothIcon(inventory[i]) + (inventory[i] > 0 ? `<span>Lv.${inventory[i]}</span>` : '');
        setupDragEvents(slot, i);
        grid.appendChild(slot);
    }
    if (currentView === 'war') renderWarWeapons();
}

function init() {
    loadGame();
    renderInventory();
    setInterval(autoMine, 100); // 0.1초마다 채굴 진행
    setInterval(() => { if(currentView === 'war') battleLoop(); }, 100);
}

// (이하 기존 save, load, drag/drop, battle 로직은 v1.4와 유사하게 유지하되 대미지 공식만 getDamage로 대체)
init();
