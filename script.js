// Version: 3.9.0 - Mercenary UI & Fixes
let gold = 1000;
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

const dragProxy = document.getElementById('drag-proxy');
let lastTapTime = 0; let lastTapIdx = -1;

const MAX_AUTO_MINE_LV = 40;
const MAX_AUTO_MERGE_LV = 15;

function saveGame() {
    const data = { 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        mercenaryIdx, ownedMercenaries, autoMergeSpeedLevel, isMuted,
        slotUpgrades, lastTime: Date.now(), isMiningPaused 
    };
    localStorage.setItem('toothSaveV390', JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV390');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold !== undefined ? d.gold : 0; 
        maxSlots = d.maxSlots || 24; 
        inventory = d.inventory || new Array(56).fill(0);
        if(inventory.length > 56) inventory = inventory.slice(0, 56);
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
        mercenaryIdx = d.mercenaryIdx || 0; ownedMercenaries = d.ownedMercenaries || [0];
        autoMergeSpeedLevel = d.autoMergeSpeedLevel || 1;
        isMuted = d.isMuted || false;
        if (d.slotUpgrades && Array.isArray(d.slotUpgrades) && d.slotUpgrades.length === 8) {
            slotUpgrades = d.slotUpgrades;
        } else {
            slotUpgrades = Array.from({length: 8}, () => ({ atk: 0, cd: 0, rng: 0 }));
        }
        
        if (!isMiningPaused && d.lastTime) {
            const offTime = (Date.now() - d.lastTime) / 1000;
            const miningSpeed = Math.max(7, 15 - (autoMineLevel * 0.2)); 
            const minedCount = Math.floor(offTime / miningSpeed); 
            const currentMaxTime = Math.max(10000, 25000 - (autoMergeSpeedLevel * 1000));
            const merges = Math.floor((offTime * 1000) / currentMaxTime);
            for(let k=0; k < merges; k++) autoMergeLowest();
            for(let i=0; i < minedCount; i++) { if(!addMinedItem()) break; }
        }
    }
    updateSoundBtn();
    updatePickaxeVisual();
}

function renderMercenaryCamp() {
    const camp = document.getElementById('mercenary-list');
    camp.innerHTML = '';
    const maxOwned = Math.max(...ownedMercenaries);
    TOOTH_DATA.mercenaries.forEach(merc => {
        if (merc.id > maxOwned + 1) return;
        const div = document.createElement('div');
        div.className = 'merc-card';
        const isOwned = ownedMercenaries.includes(merc.id);
        const isEquipped = mercenaryIdx === merc.id;
        
        // HP 정보 추가
        div.innerHTML = `
            <div style="font-size:25px;">${merc.icon}</div>
            <div style="font-size:12px; font-weight:bold;">${merc.name}</div>
            <div style="font-size:10px; color:#aaa;">공격 x${merc.atkMul}</div>
            <div style="font-size:10px; color:#e74c3c;">HP: ${fNum(merc.baseHp)}</div>
        `;
        
        // 버튼 로직 변경
        if (isEquipped) {
            div.style.border = '2px solid #2ecc71'; 
            div.innerHTML += `<button class="btn-green" style="margin-top:5px; width:100%;">고용중</button>`;
        } else if (isOwned) {
            div.innerHTML += `<button onclick="equipMerc(${merc.id})" class="btn-gray" style="margin-top:5px; width:100%;">대기</button>`;
        } else {
            div.innerHTML += `<button onclick="buyMerc(${merc.id}, ${merc.cost})" class="btn-gold" style="padding:2px 5px; font-size:10px; margin-top:5px;">${fNum(merc.cost)}G</button>`;
        }
        camp.appendChild(div);
    });
}

// ... (기타 함수들 유지) ...
function updateUI() { document.getElementById('gold-display').innerText = fNum(gold); const m = document.getElementById('mine-bar'); if(m) m.style.width=mineProgress+'%'; const g = document.getElementById('merge-bar'); if(g) g.style.width=mergeProgress+'%'; document.getElementById('pickaxe-name').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].name; saveGame(); }
function switchView(view) { currentView = view; const battleScreen = document.getElementById('battle-screen'); if(battleScreen) battleScreen.style.display = 'none'; const gameContainer = document.getElementById('game-container'); if(gameContainer) gameContainer.style.display = 'flex'; const topNav = document.getElementById('top-nav'); if(topNav) topNav.style.display = 'grid'; document.getElementById('mine-view').style.display = (view === 'mine' || view === 'refine') ? 'flex' : 'none'; if(view === 'refine') document.getElementById('mine-view').style.display = 'none'; document.getElementById('inventory-section').style.display = view === 'mine' ? 'flex' : 'none'; document.getElementById('refine-view').style.display = view === 'refine' ? 'flex' : 'none'; document.getElementById('war-view').style.display = view === 'war' ? 'flex' : 'none'; document.getElementById('tab-mine').classList.toggle('active', view === 'mine'); document.getElementById('tab-refine').classList.toggle('active', view === 'refine'); document.getElementById('tab-war').classList.toggle('active', view === 'war'); if (view === 'war') { renderDungeonList(); renderMercenaryCamp(); } else if (view === 'refine') { renderRefineView(); } else { renderInventory(); } }
function buyMerc(id, cost) { if(gold >= cost) { gold -= cost; ownedMercenaries.push(id); renderMercenaryCamp(); updateUI(); } else { alert("골드 부족"); } }
function equipMerc(id) { mercenaryIdx = id; renderMercenaryCamp(); saveGame(); }
const originalPlaySfx = window.playSfx; window.playSfx = function(name) { if (isMuted) return; if (document.hidden) return; if (name === 'mine' || name === 'merge' || name === 'great') { if (currentView !== 'mine' && currentView !== 'refine') return; } if (name === 'upgrade') { if (currentView !== 'refine') return; } if (name === 'attack' || name === 'hit' || name === 'damage') { if (currentView !== 'war') return; } if (originalPlaySfx) originalPlaySfx(name); };
function gameLoop() { if(!isMiningPaused) { const miningSpeedSec = Math.max(7, 15 - (autoMineLevel * 0.2)); const tickAmt = 100 / (miningSpeedSec * 20); processMining(tickAmt); const currentMaxTime = Math.max(10000, 25000 - (autoMergeSpeedLevel * 1000)); const increment = (50 / currentMaxTime) * 100; mergeProgress += increment; if (mergeProgress >= 100) { mergeProgress = 0; autoMergeLowest(); } } if (dungeonActive && window.updateBattle) updateBattle(); updateUI(); }
function processMining(amt) { mineProgress += amt; if (mineProgress >= 100) { mineProgress = 100; if (addMinedItem()) { mineProgress = 0; } } }
function addMinedItem() { let emptyIdx = -1; for(let i=0; i<maxSlots; i++) { if(inventory[i] === 0) { emptyIdx = i; break; } } if (emptyIdx === -1) return false; const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; let resultLv = pick.baseLv; const rng = Math.random(); if (rng < pick.luck * 0.2) resultLv += 2; else if (rng < pick.luck) resultLv += 1; resultLv = Math.max(resultLv, unlockedDungeon); inventory[emptyIdx] = resultLv; if(currentView === 'mine') renderInventory(); playSfx('mine'); return true; }
function renderShopItems() { const content = document.getElementById('shop-content'); if(!content) return; let expansionCount = (maxSlots - 24) / 8; content.innerHTML = `<h3 style="color:var(--gold);">Upgrade Lab 🧪</h3><p style="color:#fff; margin-bottom:15px;">보유 골드: <span style="color:var(--gold);">${fNum(gold)}</span></p><div id="shop-items-container"></div>`; const container = document.getElementById('shop-items-container'); const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; const pickNext = TOOTH_DATA.pickaxes[pickaxeIdx + 1]; if (pickNext) { container.innerHTML += `<div class="shop-item"><div class="shop-info"><span>⚒️ ${pickNext.name} (Lv.${pickaxeIdx + 2})</span> <button onclick="buyItem('pick', ${pickNext.cost})" class="btn-gold">💰 ${fNum(pickNext.cost)}</button></div><div class="shop-desc">기본 Lv.${pick.baseLv} ➔ Lv.${pickNext.baseLv} (상위 확률 ${Math.round(pick.luck*100)}% ➔ ${Math.round(pickNext.luck*100)}%)</div></div>`; } else { container.innerHTML += `<div class="shop-item"><div class="shop-info"><span>⚒️ ${pick.name} (Lv.${pickaxeIdx + 1})</span> <button class="btn-max">MAX</button></div><div class="shop-desc">최고 레벨 도달 (기본 Lv.${pick.baseLv}, 상위 확률 ${Math.round(pick.luck*100)}%)</div></div>`; } const curSpd = Math.max(7, 15 - (autoMineLevel * 0.2)).toFixed(1); if (autoMineLevel < MAX_AUTO_MINE_LV) { const autoCost = Math.floor(500 * Math.pow(1.4, autoMineLevel - 1)); const nextSpd = Math.max(7, 15 - ((autoMineLevel+1) * 0.2)).toFixed(1); container.innerHTML += `<div class="shop-item"><div class="shop-info"><span>🤖 자동 채굴 강화 (Lv.${autoMineLevel})</span> <button onclick="buyItem('auto', ${autoCost})" class="btn-gold">💰 ${fNum(autoCost)}</button></div><div class="shop-desc">속도: ${curSpd}초 ➔ ${nextSpd}초</div></div>`; } else { container.innerHTML += `<div class="shop-item"><div class="shop-info"><span>🤖 자동 채굴 강화 (MAX)</span> <button class="btn-max">MAX</button></div><div class="shop-desc">현재 속도: ${curSpd}초 (최대 효율)</div></div>`; } const curMerge = Math.max(10, 25 - autoMergeSpeedLevel).toFixed(1); if (autoMergeSpeedLevel < MAX_AUTO_MERGE_LV) { const mergeCost = Math.floor(1000 * Math.pow(1.6, autoMergeSpeedLevel - 1)); const nextMerge = Math.max(10, 25 - (autoMergeSpeedLevel + 1)).toFixed(1); container.innerHTML += `<div class="shop-item"><div class="shop-info"><span>⚡ 자동 합성 강화 (Lv.${autoMergeSpeedLevel})</span> <button onclick="buyItem('merge', ${mergeCost})" class="btn-gold">💰 ${fNum(mergeCost)}</button></div><div class="shop-desc">주기: ${curMerge}초 ➔ ${nextMerge}초</div></div>`; } else { container.innerHTML += `<div class="shop-item"><div class="shop-info"><span>⚡ 자동 합성 강화 (MAX)</span> <button class="btn-max">MAX</button></div><div class="shop-desc">현재 주기: ${curMerge}초 (최대 효율)</div></div>`; } if (expansionCount < 4) { const expCost = TOOTH_DATA.invExpansion[expansionCount]; container.innerHTML += `<div class="shop-item"><div class="shop-info"><span>🎒 인벤토리 확장 (${expansionCount+1}/4)</span> <button onclick="buyItem('exp', ${expCost})" class="btn-gold">💰 ${fNum(expCost)}</button></div><div class="shop-desc">8칸 추가 개방</div></div>`; } else { container.innerHTML += `<div class="shop-item"><div class="shop-info"><span>🎒 인벤토리 확장 (MAX)</span> <button class="btn-max">MAX</button></div><div class="shop-desc">모든 슬롯이 개방되었습니다.</div></div>`; } content.innerHTML += `<button onclick="closeShop()" class="btn-red" style="width:100%; margin-top:20px;">닫기</button>`; }
function buyItem(type, cost) { if (gold >= cost) { if (type === 'pick') { if (!TOOTH_DATA.pickaxes[pickaxeIdx + 1]) return; gold -= cost; pickaxeIdx++; const newMinLv = TOOTH_DATA.pickaxes[pickaxeIdx].baseLv; for(let i=0; i<maxSlots; i++) { if(inventory[i] > 0 && inventory[i] < newMinLv) inventory[i] = 0; } sortInventory(); updatePickaxeVisual(); } else if (type === 'auto') { if (autoMineLevel >= MAX_AUTO_MINE_LV) return; gold -= cost; autoMineLevel++; } else if (type === 'merge') { if (autoMergeSpeedLevel >= MAX_AUTO_MERGE_LV) return; gold -= cost; autoMergeSpeedLevel++; } else if (type === 'exp') { if ((maxSlots - 24) / 8 >= 4) return; gold -= cost; maxSlots += 8; } renderShopItems(); renderInventory(); updateUI(); } else { alert("골드가 부족합니다!"); } }
function renderRefineView() { const grid = document.getElementById('refine-grid'); if (!grid) return; grid.innerHTML = ''; slotUpgrades.forEach((slot, idx) => { const card = document.createElement('div'); card.className = 'refine-card'; const costAtk = Math.floor(1000 * Math.pow(1.3, slot.atk)); const costCd = Math.floor(1500 * Math.pow(1.3, slot.cd)); const costRng = Math.floor(800 * Math.pow(1.3, slot.rng)); const curAtk = (1 + slot.atk * 0.1).toFixed(1); const nextAtk = (1 + (slot.atk+1) * 0.1).toFixed(1); const curCd = (slot.cd * 5); const nextCd = ((slot.cd+1) * 5); const curRng = (slot.rng * 20); const nextRng = ((slot.rng+1) * 20); card.innerHTML = `<div class="refine-header">🔥 슬롯 #${idx+1}</div><div class="refine-btn" onclick="upgradeSlot(${idx}, 'atk', ${costAtk})"><span>⚔️ 공격력 Lv.${slot.atk} <span class="refine-val">(x${curAtk} ➔ x${nextAtk})</span></span><span>💰${fNum(costAtk)}</span></div><div class="refine-btn" onclick="upgradeSlot(${idx}, 'cd', ${costCd})"><span>⏳ 쿨타임 Lv.${slot.cd} <span class="refine-val">(-${curCd}% ➔ -${nextCd}%)</span></span><span>💰${fNum(costCd)}</span></div><div class="refine-btn" onclick="upgradeSlot(${idx}, 'rng', ${costRng})"><span>🏹 사거리 Lv.${slot.rng} <span class="refine-val">(+${curRng} ➔ +${nextRng})</span></span><span>💰${fNum(costRng)}</span></div>`; grid.appendChild(card); }); }
function upgradeSlot(idx, type, cost) { if (gold >= cost) { gold -= cost; slotUpgrades[idx][type]++; playSfx('upgrade'); renderRefineView(); updateUI(); } else { alert("골드가 부족합니다!"); } }
function sortInventory() { let items = inventory.filter(v => v > 0); items.sort((a, b) => b - a); inventory.fill(0); items.forEach((v, i) => { if(i < 56) inventory[i] = v; }); renderInventory(); saveGame(); }
function autoMergeLowest() { let levelCounts = {}; for(let i=8; i<maxSlots; i++) { const lv = inventory[i]; if (lv > 0) levelCounts[lv] = (levelCounts[lv] || 0) + 1; } let targetLv = -1; const levels = Object.keys(levelCounts).map(Number).sort((a,b) => a - b); for (let lv of levels) { if (levelCounts[lv] >= 2) { targetLv = lv; break; } } if (targetLv !== -1) massMerge(targetLv, true); }
function massMerge(lv, once = false) { let indices = []; inventory.forEach((val, idx) => { if(idx >= 8 && val === lv && idx < maxSlots) indices.push(idx); }); if(indices.length < 2) return; playSfx('merge'); const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; const loopCount = once ? 1 : Math.floor(indices.length / 2); for(let i=0; i < loopCount; i++) { let idx1 = indices[2*i]; let idx2 = indices[2*i+1]; const isGreat = Math.random() < pick.luck * 0.5; const nextLv = isGreat ? lv + 2 : lv + 1; inventory[idx2] = nextLv; inventory[idx1] = 0; if(isGreat && currentView === 'mine') triggerGreatSuccess(idx2); } if(currentView === 'mine') renderInventory(); }
function triggerGreatSuccess(idx) { playSfx('great'); const slot = document.getElementById(`slot-${idx}`); if (slot) { slot.classList.add('shiny-effect'); setTimeout(() => slot.classList.remove('shiny-effect'), 1000); } }
function moveProxy(e) { dragProxy.style.left = e.clientX + 'px'; dragProxy.style.top = e.clientY + 'px'; document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-target')); const elements = document.elementsFromPoint(e.clientX, e.clientY); const targetSlot = elements.find(el => el.classList.contains('slot')); if(targetSlot && parseInt(targetSlot.dataset.index) < maxSlots) targetSlot.classList.add('drag-target'); }
function updatePickaxeVisual() { const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; document.getElementById('miner-char').innerText = pick.icon || "⛏️"; }
function createHitEffect(x, y) { const effect = document.createElement('div'); effect.className = 'hit-effect'; effect.innerText = "💥"; effect.style.left = x + 'px'; effect.style.top = y + 'px'; document.body.appendChild(effect); setTimeout(() => effect.remove(), 400); }
function setupMiningTouch() { const mineArea = document.getElementById('mine-rock-area'); mineArea.addEventListener('pointerdown', (e) => { e.preventDefault(); const miner = document.getElementById('miner-char'); miner.style.animation = 'none'; miner.offsetHeight; miner.style.animation = 'hammer 0.08s ease-in-out'; playSfx('mine'); processMining(15); createHitEffect(e.clientX, e.clientY); }); }
function checkCoupon() { const code = document.getElementById('coupon-input').value.trim(); if (code === "100b" || code === "RICH100B") { gold += 100000000000; alert("치트키 적용!"); updateUI(); } else { alert("유효하지 않음"); } }
function exportSave() { saveGame(); const data = localStorage.getItem('toothSaveV390'); const encoded = btoa(unescape(encodeURIComponent(data))); prompt("코드 복사:", encoded); }
function importSave() { const str = prompt("코드 붙여넣기:"); if (str) { try { const decoded = decodeURIComponent(escape(atob(str))); localStorage.setItem('toothSaveV390', decoded); location.reload(); } catch (e) { alert("오류"); } } }
function renderDungeonList() { const list = document.getElementById('dungeon-list'); list.innerHTML = ''; TOOTH_DATA.dungeons.forEach((name, idx) => { const div = document.createElement('div'); const isUnlocked = idx < unlockedDungeon; div.className = `dungeon-card ${isUnlocked ? 'unlocked' : 'locked'}`; if (isUnlocked) { div.innerHTML = `<h4>⚔️ Lv.${idx+1} ${name}</h4><p>권장 공격력: Lv.${idx+1}0+</p><p style="color:#f1c40f; font-size:10px;">클리어 시: Lv.${idx+2} 치아 확정 채굴</p>`; div.onclick = () => startDungeon(idx); } else { div.innerHTML = `<h4>🔒 잠김</h4><p>이전 던전 클리어 시 열림</p>`; } list.appendChild(div); }); }
function toggleSound() { isMuted = !isMuted; updateSoundBtn(); saveGame(); }
function updateSoundBtn() { const btn = document.getElementById('sound-btn'); if (isMuted) { btn.innerText = "🔇 OFF"; btn.style.background = "#555"; btn.style.color = "#ccc"; } else { btn.innerText = "🔊 ON"; btn.style.background = "#f1c40f"; btn.style.color = "black"; } }
function toggleMining() { isMiningPaused = !isMiningPaused; document.getElementById('mine-toggle-btn').innerText = isMiningPaused ? "▶️ 재개" : "⏸️ 정지"; saveGame(); }
function openShop() { document.getElementById('shop-modal').style.display = 'flex'; renderShopItems(); }
function closeShop() { document.getElementById('shop-modal').style.display = 'none'; }
function manualMine() {} 
document.addEventListener("visibilitychange", () => { if (document.hidden) { if(audioCtx && audioCtx.state === 'running') audioCtx.suspend(); } else { if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } });
window.onload = () => { loadGame(); setupMiningTouch(); switchView('mine'); setInterval(gameLoop, 50); };
