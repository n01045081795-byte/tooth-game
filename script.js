// Version: 3.4.0 - Smart Sound, Balanced Mining, Stop on Full
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

function saveGame() {
    const data = { 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        mercenaryIdx, ownedMercenaries, autoMergeSpeedLevel, isMuted,
        slotUpgrades, lastTime: Date.now(), isMiningPaused 
    };
    localStorage.setItem('toothSaveV340', JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV340');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 1000; maxSlots = d.maxSlots || 24; 
        inventory = d.inventory || new Array(56).fill(0);
        if(inventory.length > 56) inventory = inventory.slice(0, 56);
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
        mercenaryIdx = d.mercenaryIdx || 0; ownedMercenaries = d.ownedMercenaries || [0];
        autoMergeSpeedLevel = d.autoMergeSpeedLevel || 1;
        isMuted = d.isMuted || false;
        slotUpgrades = d.slotUpgrades || Array.from({length: 8}, () => ({ atk: 0, cd: 0, rng: 0 }));
        
        if (!isMiningPaused && d.lastTime) {
            const offTime = (Date.now() - d.lastTime) / 1000;
            // 오프라인 계산: 속도 대폭 너프 (레벨당 0.05초 단축 효과 정도)
            // 기본 1.5초, 레벨당 조금씩 빨라짐
            const miningSpeed = Math.max(0.1, 1.5 - (autoMineLevel * 0.02)); 
            const pps = 100 / (miningSpeed * 1000 / 50); // tick당 진행도
            
            const minedCount = Math.floor(offTime / miningSpeed); // 근사치
            const currentMaxTime = Math.max(1000, 25000 - (autoMergeSpeedLevel * 1000));
            const merges = Math.floor((offTime * 1000) / currentMaxTime);
            
            for(let k=0; k < merges; k++) autoMergeLowest();
            // 오프라인 채굴도 꽉 차면 멈추도록 시뮬레이션
            for(let i=0; i < minedCount; i++) {
                if(!addMinedItem()) break; 
            }
        }
    }
    updateSoundBtn();
    updatePickaxeVisual();
}

// ★ 스마트 사운드 제어 (핵심) ★
// data.js의 playSfx를 덮어씀
const originalPlaySfx = window.playSfx;
window.playSfx = function(name) {
    if (isMuted) return; // 전역 음소거
    if (document.hidden) return; // 브라우저 최소화/백그라운드 시 차단

    // 탭별 소리 분리
    if (name === 'mine' || name === 'merge' || name === 'upgrade' || name === 'great') {
        if (currentView !== 'mine' && currentView !== 'refine') return; // 채굴탭 아니면 채굴소리 X
    }
    if (name === 'attack' || name === 'hit' || name === 'damage') {
        if (currentView !== 'war') return; // 던전탭 아니면 전투소리 X
    }

    if (originalPlaySfx) originalPlaySfx(name);
};

// 채굴 메인 루프
function gameLoop() {
    if(!isMiningPaused) {
        // 속도 공식 수정: 곡괭이 파워 제외, 순수 자동채굴 레벨 의존
        // 기본 1.5초에서 레벨당 0.02초씩 단축 (최소 0.1초)
        const miningSpeedSec = Math.max(0.1, 1.5 - (autoMineLevel * 0.02)); 
        // 50ms마다 호출되므로, 100% 채우려면 (speed * 1000 / 50) 틱 필요
        const tickAmt = 100 / (miningSpeedSec * 20); 
        
        processMining(tickAmt);
        
        const currentMaxTime = Math.max(1000, 25000 - (autoMergeSpeedLevel * 1000));
        const increment = (50 / currentMaxTime) * 100;
        mergeProgress += increment;
        
        if (mergeProgress >= 100) {
            mergeProgress = 0;
            autoMergeLowest();
        }
    }
    if (dungeonActive) updateBattle();
    updateUI();
}

function processMining(amt) {
    mineProgress += amt;
    if (mineProgress >= 100) {
        mineProgress = 100; // 100에서 대기
        if (addMinedItem()) {
            mineProgress = 0; // 성공적으로 넣었을 때만 리셋
        }
    }
    updateUI();
}

// 아이템 추가 로직 (실패 시 false 반환)
function addMinedItem() {
    let emptyIdx = -1;
    // 8번부터 빈칸 탐색
    for(let i=8; i<maxSlots; i++) { if(inventory[i] === 0) { emptyIdx = i; break; } }
    
    // 꽉 찼으면 자동 합성 1회 시도 후 재탐색
    if (emptyIdx === -1) {
        autoMergeLowest();
        for(let i=8; i<maxSlots; i++) { if(inventory[i] === 0) { emptyIdx = i; break; } }
    }
    
    // 그래도 없으면 실패 (채굴 중단 효과)
    if (emptyIdx === -1) return false;
    
    // 성공 시: 곡괭이 확률 적용
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    let resultLv = pick.baseLv;
    const rng = Math.random();
    
    // Luck에 따라 +1, +2 티어 확률
    // 예: luck 0.15 -> 15% 확률로 +1 티어
    if (rng < pick.luck * 0.2) resultLv += 2; // 대박
    else if (rng < pick.luck) resultLv += 1; // 중박
    
    // 던전 해금 보정 (최소 던전 보상 레벨 보장)
    resultLv = Math.max(resultLv, unlockedDungeon);
    
    inventory[emptyIdx] = resultLv;
    
    if(currentView === 'mine') renderInventory();
    playSfx('mine');
    
    return true;
}

// 상점 (텍스트 개선)
function renderShopItems() {
    const content = document.getElementById('shop-content');
    let expansionCount = (maxSlots - 24) / 8;
    content.innerHTML = `<h3 style="color:var(--gold);">Upgrade Lab 🧪</h3><p style="color:#fff; margin-bottom:15px;">보유 골드: <span style="color:var(--gold);">${fNum(gold)}</span></p><div id="shop-items-container"></div>`;
    const container = document.getElementById('shop-items-container');
    
    // 곡괭이
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    const pickNext = TOOTH_DATA.pickaxes[pickaxeIdx + 1];
    if (pickNext) {
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>⚒️ ${pickNext.name}</span> <button onclick="buyItem('pick', ${pickNext.cost})" class="btn-gold">💰 ${fNum(pickNext.cost)}</button></div>
            <div class="shop-desc">기본 Lv.${pick.baseLv} ➔ Lv.${pickNext.baseLv} (상위 확률 ${Math.round(pick.luck*100)}% ➔ ${Math.round(pickNext.luck*100)}%)</div>
        </div>`;
    }
    
    // 자동 채굴
    const autoCost = autoMineLevel * 2000;
    const curSpd = Math.max(0.1, 1.5 - (autoMineLevel * 0.02)).toFixed(2);
    const nextSpd = Math.max(0.1, 1.5 - ((autoMineLevel+1) * 0.02)).toFixed(2);
    container.innerHTML += `
    <div class="shop-item">
        <div class="shop-info"><span>🤖 자동 채굴 강화</span> <button onclick="buyItem('auto', ${autoCost})" class="btn-gold">💰 ${fNum(autoCost)}</button></div>
        <div class="shop-desc">속도: ${curSpd}초 ➔ ${nextSpd}초 (Lv.${autoMineLevel} ➔ ${autoMineLevel+1})</div>
    </div>`;
    
    // 자동 합성
    const mergeCost = autoMergeSpeedLevel * 50000;
    const curMerge = Math.max(1, 25 - autoMergeSpeedLevel).toFixed(1);
    const nextMerge = Math.max(1, 25 - (autoMergeSpeedLevel + 1)).toFixed(1);
    if(autoMergeSpeedLevel < 24) {
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>⚡ 자동 합성 강화</span> <button onclick="buyItem('merge', ${mergeCost})" class="btn-gold">💰 ${fNum(mergeCost)}</button></div>
            <div class="shop-desc">주기: ${curMerge}초 ➔ ${nextMerge}초</div>
        </div>`;
    }
    
    // 확장
    if (expansionCount < 4) {
        const expCost = TOOTH_DATA.invExpansion[expansionCount];
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>🎒 인벤토리 확장 (${expansionCount+1}/4)</span> <button onclick="buyItem('exp', ${expCost})" class="btn-gold">💰 ${fNum(expCost)}</button></div>
            <div class="shop-desc">8칸 추가 개방</div>
        </div>`;
    }
    
    content.innerHTML += `<button onclick="closeShop()" class="btn-red" style="width:100%; margin-top:20px;">닫기</button>`;
}

// ... (기존 유지 로직) ...
function autoMergeLowest() { let levelCounts = {}; for(let i=8; i<maxSlots; i++) { const lv = inventory[i]; if (lv > 0) levelCounts[lv] = (levelCounts[lv] || 0) + 1; } let targetLv = -1; const levels = Object.keys(levelCounts).map(Number).sort((a,b) => a - b); for (let lv of levels) { if (levelCounts[lv] >= 2) { targetLv = lv; break; } } if (targetLv !== -1) massMerge(targetLv, true); }
function massMerge(lv, once = false) { let indices = []; inventory.forEach((val, idx) => { if(idx >= 8 && val === lv && idx < maxSlots) indices.push(idx); }); if(indices.length < 2) return; playSfx('merge'); const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; const loopCount = once ? 1 : Math.floor(indices.length / 2); for(let i=0; i < loopCount; i++) { let idx1 = indices[2*i]; let idx2 = indices[2*i+1]; const isGreat = Math.random() < pick.luck * 0.5; const nextLv = isGreat ? lv + 2 : lv + 1; inventory[idx2] = nextLv; inventory[idx1] = 0; if(isGreat && currentView === 'mine') triggerGreatSuccess(idx2); } if(currentView === 'mine') renderInventory(); }
function triggerGreatSuccess(idx) { playSfx('great'); const slot = document.getElementById(`slot-${idx}`); if (slot) { slot.classList.add('shiny-effect'); setTimeout(() => slot.classList.remove('shiny-effect'), 1000); } }
function sortInventory() { let items = inventory.slice(8).filter(v => v > 0); items.sort((a, b) => b - a); for(let i=8; i<56; i++) inventory[i] = 0; items.forEach((v, i) => { if(i+8 < 56) inventory[i+8] = v; }); renderInventory(); saveGame(); }
function buyItem(type, cost) { if (gold >= cost) { gold -= cost; if (type === 'pick') { pickaxeIdx++; const newMinLv = TOOTH_DATA.pickaxes[pickaxeIdx].baseLv; for(let i=0; i<maxSlots; i++) { if(inventory[i] > 0 && inventory[i] < newMinLv) inventory[i] = 0; } sortInventory(); updatePickaxeVisual(); } else if (type === 'auto') autoMineLevel++; else if (type === 'merge') autoMergeSpeedLevel++; else if (type === 'exp') maxSlots += 8; renderShopItems(); renderInventory(); updateUI(); } else { alert("골드 부족"); } }
function updateUI() { document.getElementById('gold-display').innerText = fNum(gold); document.getElementById('mine-bar').style.width = mineProgress + '%'; document.getElementById('merge-bar').style.width = mergeProgress + '%'; document.getElementById('pickaxe-name').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].name; saveGame(); }
function renderInventory() { const grid = document.getElementById('inventory-grid'); grid.innerHTML = ''; for (let i = 0; i < 56; i++) { const slot = document.createElement('div'); slot.className = `slot ${i < 8 ? 'attack-slot' : ''} ${i >= maxSlots ? 'locked-slot' : ''}`; slot.dataset.index = i; slot.id = `slot-${i}`; if (i < maxSlots && inventory[i] > 0) { const dmg = fNum(getAtk(inventory[i])); slot.innerHTML = `<span class="dmg-label">⚔️${dmg}</span>${getToothIcon(inventory[i])}<span class="lv-text">Lv.${inventory[i]}</span>`; } else if (i >= maxSlots) slot.innerHTML = "🔒"; if (i < maxSlots) { slot.onpointerdown = (e) => { if (inventory[i] > 0) { const currentTime = new Date().getTime(); const tapLength = currentTime - lastTapTime; if (tapLength < 300 && tapLength > 0 && lastTapIdx === i) { e.preventDefault(); massMerge(inventory[i]); lastTapTime = 0; return; } lastTapTime = currentTime; lastTapIdx = i; e.preventDefault(); dragStartIdx = i; slot.classList.add('picked'); dragProxy.innerHTML = getToothIcon(inventory[i]); dragProxy.style.display = 'block'; moveProxy(e); slot.setPointerCapture(e.pointerId); } }; slot.onpointermove = (e) => { if (dragStartIdx !== null) moveProxy(e); }; slot.onpointerup = (e) => { if (dragStartIdx !== null) { slot.releasePointerCapture(e.pointerId); slot.classList.remove('picked'); dragProxy.style.display = 'none'; const elements = document.elementsFromPoint(e.clientX, e.clientY); const targetSlot = elements.find(el => el.classList.contains('slot') && el !== slot); if (targetSlot) { const toIdx = parseInt(targetSlot.dataset.index); if (toIdx < maxSlots) handleMoveOrMerge(dragStartIdx, toIdx); } document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-target')); dragStartIdx = null; } }; } grid.appendChild(slot); } }
function handleMoveOrMerge(from, to) { if (from === to) return; if (inventory[from] === inventory[to] && inventory[from] > 0) { const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; const isGreat = Math.random() < pick.luck * 0.5; const nextLv = isGreat ? inventory[from] + 2 : inventory[from] + 1; inventory[to] = nextLv; inventory[from] = 0; if(isGreat) triggerGreatSuccess(to); else playSfx('merge'); } else { [inventory[from], inventory[to]] = [inventory[to], inventory[from]]; } renderInventory(); saveGame(); }
function moveProxy(e) { dragProxy.style.left = e.clientX + 'px'; dragProxy.style.top = e.clientY + 'px'; document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-target')); const elements = document.elementsFromPoint(e.clientX, e.clientY); const targetSlot = elements.find(el => el.classList.contains('slot')); if(targetSlot && parseInt(targetSlot.dataset.index) < maxSlots) targetSlot.classList.add('drag-target'); }
function updatePickaxeVisual() { const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; document.getElementById('miner-char').innerText = pick.icon || "⛏️"; }
function createHitEffect(x, y) { const effect = document.createElement('div'); effect.className = 'hit-effect'; effect.innerText = "💥"; effect.style.left = x + 'px'; effect.style.top = y + 'px'; document.body.appendChild(effect); setTimeout(() => effect.remove(), 400); }
function setupMiningTouch() { const mineArea = document.getElementById('mine-rock-area'); mineArea.addEventListener('pointerdown', (e) => { e.preventDefault(); const miner = document.getElementById('miner-char'); miner.style.animation = 'none'; miner.offsetHeight; miner.style.animation = 'hammer 0.08s ease-in-out'; playSfx('mine'); processMining(15); createHitEffect(e.clientX, e.clientY); }); }
function manualMine() {} 
function toggleMining() { isMiningPaused = !isMiningPaused; document.getElementById('mine-toggle-btn').innerText = isMiningPaused ? "▶️ 재개" : "⏸️ 정지"; saveGame(); }
function switchView(view) { currentView = view; document.getElementById('mine-view').style.display = (view === 'mine' || view === 'refine') ? 'flex' : 'none'; if(view === 'refine') document.getElementById('mine-view').style.display = 'none'; document.getElementById('inventory-section').style.display = view === 'mine' ? 'flex' : 'none'; document.getElementById('refine-view').style.display = view === 'refine' ? 'flex' : 'none'; document.getElementById('war-view').style.display = view === 'war' ? 'flex' : 'none'; document.getElementById('tab-mine').classList.toggle('active', view === 'mine'); document.getElementById('tab-refine').classList.toggle('active', view === 'refine'); document.getElementById('tab-war').classList.toggle('active', view === 'war'); if (view === 'war') { renderDungeonList(); renderMercenaryCamp(); } else if (view === 'refine') { renderRefineView(); } else { renderInventory(); } }
function checkCoupon() { const code = document.getElementById('coupon-input').value.trim(); if (code === "100b" || code === "RICH100B") { gold += 100000000000; alert("치트키 적용!"); updateUI(); } else { alert("유효하지 않음"); } }
function exportSave() { saveGame(); const data = localStorage.getItem('toothSaveV340'); const encoded = btoa(unescape(encodeURIComponent(data))); prompt("코드 복사:", encoded); }
function importSave() { const str = prompt("코드 붙여넣기:"); if (str) { try { const decoded = decodeURIComponent(escape(atob(str))); localStorage.setItem('toothSaveV340', decoded); location.reload(); } catch (e) { alert("오류"); } } }
function renderDungeonList() { const list = document.getElementById('dungeon-list'); list.innerHTML = ''; TOOTH_DATA.dungeons.forEach((name, idx) => { const div = document.createElement('div'); const isUnlocked = idx < unlockedDungeon; div.className = `dungeon-card ${isUnlocked ? 'unlocked' : 'locked'}`; if (isUnlocked) { div.innerHTML = `<h4>⚔️ Lv.${idx+1} ${name}</h4><p>권장 공격력: Lv.${idx+1}0+</p><p style="color:#f1c40f; font-size:10px;">클리어 시: Lv.${idx+2} 치아 확정 채굴</p>`; div.onclick = () => startDungeon(idx); } else { div.innerHTML = `<h4>🔒 잠김</h4><p>이전 던전 클리어 시 열림</p>`; } list.appendChild(div); }); }
function renderMercenaryCamp() { const camp = document.getElementById('mercenary-list'); camp.innerHTML = ''; const maxOwned = Math.max(...ownedMercenaries); TOOTH_DATA.mercenaries.forEach(merc => { if (merc.id > maxOwned + 1) return; const div = document.createElement('div'); div.className = 'merc-card'; const isOwned = ownedMercenaries.includes(merc.id); const isEquipped = mercenaryIdx === merc.id; div.innerHTML = `<div style="font-size:25px;">${merc.icon}</div><div style="font-size:12px; font-weight:bold;">${merc.name}</div><div style="font-size:10px; color:#aaa;">공격 x${merc.atkMul}</div>`; if (isEquipped) div.style.border = '2px solid #2ecc71'; else if (isOwned) div.innerHTML += `<button onclick="equipMerc(${merc.id})" class="btn-sm">장착</button>`; else div.innerHTML += `<button onclick="buyMerc(${merc.id}, ${merc.cost})" class="btn-gold" style="padding:2px 5px; font-size:10px;">${fNum(merc.cost)}G</button>`; camp.appendChild(div); }); }
function buyMerc(id, cost) { if(gold >= cost) { gold -= cost; ownedMercenaries.push(id); renderMercenaryCamp(); updateUI(); } else { alert("골드 부족"); } }
function equipMerc(id) { mercenaryIdx = id; renderMercenaryCamp(); saveGame(); }
function toggleSound() { isMuted = !isMuted; updateSoundBtn(); saveGame(); }
function updateSoundBtn() { const btn = document.getElementById('sound-btn'); if (isMuted) { btn.innerText = "🔇 OFF"; btn.style.background = "#555"; btn.style.color = "#ccc"; } else { btn.innerText = "🔊 ON"; btn.style.background = "#f1c40f"; btn.style.color = "black"; } }
function openShop() { document.getElementById('shop-modal').style.display = 'flex'; renderShopItems(); }
function closeShop() { document.getElementById('shop-modal').style.display = 'none'; }
function renderRefineView() { const grid = document.getElementById('refine-grid'); grid.innerHTML = ''; slotUpgrades.forEach((slot, idx) => { const card = document.createElement('div'); card.className = 'refine-card'; const costAtk = (slot.atk + 1) * 5000; const costCd = (slot.cd + 1) * 10000; const costRng = (slot.rng + 1) * 8000; card.innerHTML = `<div class="refine-header">🔥 슬롯 #${idx+1}</div><div class="refine-btn" onclick="upgradeSlot(${idx}, 'atk', ${costAtk})"><span>⚔️공격 ${slot.atk}</span> <span>${fNum(costAtk)}</span></div><div class="refine-btn" onclick="upgradeSlot(${idx}, 'cd', ${costCd})"><span>⏳쿨탐 ${slot.cd}</span> <span>${fNum(costCd)}</span></div><div class="refine-btn" onclick="upgradeSlot(${idx}, 'rng', ${costRng})"><span>🏹사거리 ${slot.rng}</span> <span>${fNum(costRng)}</span></div>`; grid.appendChild(card); }); }
function upgradeSlot(idx, type, cost) { if (gold >= cost) { gold -= cost; slotUpgrades[idx][type]++; playSfx('upgrade'); renderRefineView(); updateUI(); } else { alert("골드 부족"); } }

// 가시성 이벤트 (탭 전환 시 소리 끔)
document.addEventListener("visibilitychange", () => { if (document.hidden) { if(audioCtx && audioCtx.state === 'running') audioCtx.suspend(); } else { if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } });

window.onload = () => { loadGame(); setupMiningTouch(); switchView('mine'); setInterval(gameLoop, 50); };
