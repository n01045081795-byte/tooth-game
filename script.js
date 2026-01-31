let gold = 0;
let unlockedDungeon = 1; 
let pickaxeIdx = 0;
let autoMineLevel = 1;
let inventory = new Array(56).fill(0);
let maxSlots = 24; 
let mineProgress = 0;
let isMiningPaused = false;
let currentView = 'mine';
let dragStartIdx = null;
let mercenaryIdx = 0;
let ownedMercenaries = [0];
let mergeProgress = 0;
let autoMergeSpeedLevel = 1; 
let isMuted = false;
let slotUpgrades = Array.from({length: 8}, () => ({ atk: 0, cd: 0, rng: 0 }));

const MAX_AUTO_MINE_LV = 40;
const MAX_AUTO_MERGE_LV = 15;
const dragProxy = document.getElementById('drag-proxy');
let lastTapTime = 0; let lastTapIdx = -1;

function saveGame() {
    const data = { gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel, mercenaryIdx, ownedMercenaries, autoMergeSpeedLevel, isMuted, slotUpgrades, lastTime: Date.now(), isMiningPaused };
    localStorage.setItem('toothSaveV3.9.1', JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV3.9.1');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 0; maxSlots = d.maxSlots || 24; 
        inventory = d.inventory || new Array(56).fill(0);
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
        mercenaryIdx = d.mercenaryIdx || 0; ownedMercenaries = d.ownedMercenaries || [0];
        autoMergeSpeedLevel = d.autoMergeSpeedLevel || 1; isMuted = d.isMuted || false;
        slotUpgrades = d.slotUpgrades || Array.from({length: 8}, () => ({ atk: 0, cd: 0, rng: 0 }));
    }
    updateSoundBtn(); updatePickaxeVisual();
}

function switchView(view) {
    currentView = view;
    document.getElementById('mine-view').style.display = (view === 'mine') ? 'flex' : 'none';
    document.getElementById('inventory-section').style.display = (view === 'mine') ? 'flex' : 'none';
    document.getElementById('refine-view').style.display = (view === 'refine') ? 'flex' : 'none';
    document.getElementById('war-view').style.display = (view === 'war') ? 'flex' : 'none';
    
    document.querySelectorAll('#top-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + view).classList.add('active');

    if (view === 'war') renderDungeonList();
    else if (view === 'refine') renderRefineView();
    else renderInventory();
}

function gameLoop() {
    if(!isMiningPaused) {
        const mineSpeed = Math.max(7, 15 - (autoMineLevel * 0.2)); 
        mineProgress += 100 / (mineSpeed * 20); 
        if (mineProgress >= 100) { mineProgress = 100; if (addMinedItem()) mineProgress = 0; }
        const mergeSpeed = Math.max(10000, 25000 - (autoMergeSpeedLevel * 1000));
        mergeProgress += 100 / (mergeSpeed / 50);
        if (mergeProgress >= 100) { mergeProgress = 0; autoMergeLowest(); }
    }
    updateUI();
}

function addMinedItem() {
    let idx = inventory.indexOf(0);
    if (idx === -1 || idx >= maxSlots) return false;
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    let resLv = Math.max(pick.baseLv, unlockedDungeon);
    if (Math.random() < pick.luck) resLv += 1;
    inventory[idx] = resLv;
    if(currentView === 'mine') renderInventory();
    playSfx('mine');
    return true;
}

function sortInventory() {
    let items = inventory.filter(v => v > 0).sort((a, b) => b - a);
    inventory.fill(0);
    items.forEach((v, i) => { if(i < 56) inventory[i] = v; });
    renderInventory(); saveGame();
}

function autoMergeLowest() {
    let counts = {};
    for(let i=8; i<maxSlots; i++) { if(inventory[i] > 0) counts[inventory[i]] = (counts[inventory[i]] || 0) + 1; }
    let target = Object.keys(counts).find(lv => counts[lv] >= 2);
    if (target) massMerge(Number(target), true);
}

function massMerge(lv, once = false) {
    let indices = [];
    inventory.forEach((val, idx) => { if(idx >= 8 && val === lv && idx < maxSlots) indices.push(idx); });
    if(indices.length < 2) return;
    playSfx('merge');
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    const loops = once ? 1 : Math.floor(indices.length / 2);
    for(let i=0; i<loops; i++) {
        inventory[indices[2*i+1]] = (Math.random() < pick.luck * 0.5) ? lv + 2 : lv + 1;
        inventory[indices[2*i]] = 0;
    }
    if(currentView === 'mine') renderInventory();
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 56; i++) {
        const slot = document.createElement('div');
        slot.className = `slot ${i < 8 ? 'attack-slot' : ''} ${i >= maxSlots ? 'locked-slot' : ''}`;
        slot.dataset.index = i;
        if (i < maxSlots && inventory[i] > 0) {
            slot.innerHTML = `<span class="dmg-label">⚔️${fNum(getAtk(inventory[i]))}</span>${getToothIcon(inventory[i])}<span class="lv-text">Lv.${inventory[i]}</span>`;
            setupSlotEvents(slot, i);
        } else if (i >= maxSlots) slot.innerHTML = "🔒";
        grid.appendChild(slot);
    }
}

function setupSlotEvents(slot, i) {
    slot.onpointerdown = (e) => {
        const now = Date.now();
        if (now - lastTapTime < 300 && lastTapIdx === i) {
            if (i >= 8) massMerge(inventory[i]); return;
        }
        lastTapTime = now; lastTapIdx = i; dragStartIdx = i;
        slot.classList.add('picked'); dragProxy.innerHTML = getToothIcon(inventory[i]);
        dragProxy.style.display = 'block'; slot.setPointerCapture(e.pointerId);
    };
    slot.onpointermove = (e) => { if (dragStartIdx !== null) { dragProxy.style.left = e.clientX + 'px'; dragProxy.style.top = e.clientY + 'px'; } };
    slot.onpointerup = (e) => {
        if (dragStartIdx === null) return;
        slot.releasePointerCapture(e.pointerId); slot.classList.remove('picked'); dragProxy.style.display = 'none';
        const target = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList.contains('slot'));
        if (target) {
            const to = parseInt(target.dataset.index);
            if (to < maxSlots) {
                if (inventory[dragStartIdx] === inventory[to] && dragStartIdx !== to) {
                    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
                    inventory[to] = (Math.random() < pick.luck * 0.5) ? inventory[to] + 2 : inventory[to] + 1;
                    inventory[dragStartIdx] = 0;
                } else { [inventory[dragStartIdx], inventory[to]] = [inventory[to], inventory[dragStartIdx]]; }
                renderInventory();
            }
        }
        dragStartIdx = null;
    };
}

function updateUI() {
    document.getElementById('gold-display').innerText = fNum(gold);
    document.getElementById('mine-bar').style.width = mineProgress + '%';
    document.getElementById('merge-bar').style.width = mergeProgress + '%';
    document.getElementById('pickaxe-name').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].name;
}

function renderRefineView() {
    const grid = document.getElementById('refine-grid');
    grid.innerHTML = '';
    slotUpgrades.forEach((s, i) => {
        const card = document.createElement('div'); card.className = 'refine-card';
        const cost = (t) => Math.floor(1000 * Math.pow(1.3, s[t]));
        card.innerHTML = `<div class="refine-header">🔥 슬롯 #${i+1}</div>
            <button class="refine-btn" onclick="upgradeSlot(${i}, 'atk', ${cost('atk')})"><span>⚔️ 공격력 Lv.${s.atk}</span><span class="refine-val">x${(1+s.atk*0.1).toFixed(1)} ➔ x${(1.1+s.atk*0.1).toFixed(1)}</span><span>💰${fNum(cost('atk'))}</span></button>
            <button class="refine-btn" onclick="upgradeSlot(${i}, 'cd', ${cost('cd')})"><span>⏳ 쿨타임 Lv.${s.cd}</span><span class="refine-val">-${s.cd*5}% ➔ -${(s.cd+1)*5}%</span><span>💰${fNum(cost('cd'))}</span></button>
            <button class="refine-btn" onclick="upgradeSlot(${i}, 'rng', ${cost('rng')})"><span>🏹 사거리 Lv.${s.rng}</span><span class="refine-val">+${s.rng*20} ➔ +${(s.rng+1)*20}</span><span>💰${fNum(cost('rng'))}</span></button>`;
        grid.appendChild(card);
    });
}

function upgradeSlot(i, t, c) { if(gold>=c){gold-=c; slotUpgrades[i][t]++; playSfx('upgrade'); renderRefineView(); updateUI();} else alert("골드 부족"); }
function updatePickaxeVisual() { document.getElementById('miner-char').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].icon; }
function toggleSound() { window.isMuted = !window.isMuted; document.getElementById('sound-btn').innerText = window.isMuted ? "🔇 OFF" : "🔊 ON"; }
function toggleMining() { isMiningPaused = !isMiningPaused; document.getElementById('mine-toggle-btn').innerText = isMiningPaused ? "▶️ 재개" : "⏸️ 정지"; }
function openShop() { document.getElementById('shop-modal').style.display='flex'; renderShopItems(); }
function closeShop() { document.getElementById('shop-modal').style.display='none'; }
function renderShopItems() {
    const con = document.getElementById('shop-content');
    let expCnt = (maxSlots - 24) / 8;
    con.innerHTML = `<h3>Upgrade Lab 🧪</h3><p>골드: ${fNum(gold)}</p><div id="shop-items-container"></div>`;
    const items = document.getElementById('shop-items-container');
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    const pickNext = TOOTH_DATA.pickaxes[pickaxeIdx+1];
    if(pickNext) items.innerHTML += `<div class="shop-item">⚒️ ${pickNext.name} (Lv.${pickaxeIdx+2}) <button onclick="buyItem('pick', ${pickNext.cost})" class="btn-gold">💰${fNum(pickNext.cost)}</button></div>`;
    items.innerHTML += `<div class="shop-item">🤖 채굴 강화 (Lv.${autoMineLevel}) <button onclick="buyItem('auto', ${autoMineLevel*2000})" class="btn-gold">💰${fNum(autoMineLevel*2000)}</button></div>`;
    if(expCnt<4) items.innerHTML += `<div class="shop-item">🎒 인벤토리 확장 <button onclick="buyItem('exp', TOOTH_DATA.invExpansion[${expCnt}])" class="btn-gold">💰${fNum(TOOTH_DATA.invExpansion[expCnt])}</button></div>`;
    con.innerHTML += `<button onclick="closeShop()" class="btn-red" style="width:100%">닫기</button>`;
}
function buyItem(t, c) { if(gold>=c){gold-=c; if(t==='pick')pickaxeIdx++; else if(t==='auto')autoMineLevel++; else if(t==='exp')maxSlots+=8; renderShopItems(); renderInventory(); updateUI();} else alert("골드 부족"); }
function checkCoupon() { if(document.getElementById('coupon-input').value==='100b'){gold+=1e11; updateUI();} }
function exportSave() { prompt("코드:", btoa(JSON.stringify(localStorage.getItem('toothSaveV3.9.1')))); }
function importSave() { /* 로직 */ }

window.onload = () => { loadGame(); switchView('mine'); setInterval(gameLoop, 50); setupMiningTouch(); };
function setupMiningTouch() { document.getElementById('mine-rock-area').onpointerdown = (e) => { playSfx('mine'); mineProgress += 10; const d = document.createElement('div'); d.className='hit-effect'; d.innerText="💥"; d.style.left=e.clientX+'px'; d.style.top=e.clientY+'px'; document.body.appendChild(d); setTimeout(()=>d.remove(), 400); }; }
