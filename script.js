// Version: 2.2.3 - Mobile Double Tap & Full Clean
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
const dragProxy = document.getElementById('drag-proxy');

// 더블 탭 변수
let lastTapTime = 0;
let lastTapIdx = -1;

function saveGame() {
    const data = { 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        mercenaryIdx, ownedMercenaries, autoMergeSpeedLevel,
        lastTime: Date.now(), isMiningPaused 
    };
    localStorage.setItem('toothSaveV223', JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV223');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 1000; 
        maxSlots = d.maxSlots || 24; 
        inventory = d.inventory || new Array(56).fill(0);
        if(inventory.length > 56) inventory = inventory.slice(0, 56);
        
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
        mercenaryIdx = d.mercenaryIdx || 0; ownedMercenaries = d.ownedMercenaries || [0];
        autoMergeSpeedLevel = d.autoMergeSpeedLevel || 1;
        
        if (!isMiningPaused && d.lastTime) {
            const offTime = (Date.now() - d.lastTime) / 1000;
            const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
            const pps = (pick.power * 0.02 * autoMineLevel) / 100;
            const minedCount = Math.floor(offTime * pps);
            
            const currentMaxTime = Math.max(1000, 25000 - (autoMergeSpeedLevel * 1000));
            const merges = Math.floor((offTime * 1000) / currentMaxTime);
            
            for(let k=0; k < merges; k++) autoMergeLowest();
            for(let i=0; i < minedCount; i++) addMinedItem(pick);
        }
    }
}

// 렌더링 (더블탭 로직 추가)
function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 56; i++) {
        const slot = document.createElement('div');
        slot.className = `slot ${i < 8 ? 'attack-slot' : ''} ${i >= maxSlots ? 'locked-slot' : ''}`;
        slot.dataset.index = i;
        slot.id = `slot-${i}`;
        
        if (i < maxSlots && inventory[i] > 0) {
            const dmg = fNum(getAtk(inventory[i]));
            slot.innerHTML = `<span class="dmg-label">⚔️${dmg}</span>${getToothIcon(inventory[i])}<span class="lv-label">Lv.${inventory[i]}</span>`;
        } else if (i >= maxSlots) slot.innerHTML = "🔒";
        
        if (i < maxSlots) {
            slot.onpointerdown = (e) => {
                if (inventory[i] > 0) {
                    const currentTime = new Date().getTime();
                    const tapLength = currentTime - lastTapTime;
                    
                    // 더블 탭 감지 (300ms 이내)
                    if (tapLength < 300 && tapLength > 0 && lastTapIdx === i) {
                        e.preventDefault();
                        massMerge(inventory[i]); // 일괄 합성 실행
                        lastTapTime = 0;
                        return;
                    }
                    
                    lastTapTime = currentTime;
                    lastTapIdx = i;

                    // 드래그 시작
                    e.preventDefault(); 
                    dragStartIdx = i;
                    slot.classList.add('picked');
                    dragProxy.innerHTML = getToothIcon(inventory[i]);
                    dragProxy.style.display = 'block';
                    moveProxy(e);
                    slot.setPointerCapture(e.pointerId);
                }
            };
            
            slot.onpointermove = (e) => { if (dragStartIdx !== null) moveProxy(e); };
            
            slot.onpointerup = (e) => {
                if (dragStartIdx !== null) {
                    slot.releasePointerCapture(e.pointerId);
                    slot.classList.remove('picked');
                    dragProxy.style.display = 'none';
                    const elements = document.elementsFromPoint(e.clientX, e.clientY);
                    const targetSlot = elements.find(el => el.classList.contains('slot') && el !== slot);
                    if (targetSlot) {
                        const toIdx = parseInt(targetSlot.dataset.index);
                        if (toIdx < maxSlots) handleMoveOrMerge(dragStartIdx, toIdx);
                    }
                    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-target'));
                    dragStartIdx = null;
                }
            };
        }
        grid.appendChild(slot);
    }
}

// 상점 (업그레이드 시 전체 스캔 삭제)
function buyItem(type, cost) {
    if (gold >= cost) {
        gold -= cost;
        if (type === 'pick') {
            pickaxeIdx++;
            const newMinLv = TOOTH_DATA.pickaxes[pickaxeIdx].mineLv;
            // 0번부터 끝까지 모든 슬롯 검사 후 삭제
            for(let i=0; i<maxSlots; i++) {
                if(inventory[i] > 0 && inventory[i] < newMinLv) {
                    inventory[i] = 0;
                }
            }
            sortInventory(); // 정렬해서 빈칸 메꾸기
        } 
        else if (type === 'auto') autoMineLevel++;
        else if (type === 'merge') autoMergeSpeedLevel++;
        else if (type === 'exp') maxSlots += 8;
        
        renderShopItems(); renderInventory(); updateUI();
    } else { alert("골드가 부족합니다!"); }
}

// 나머지 로직 (스마트 합성, 채굴 등) - 기존 유지
function autoMergeLowest() {
    let levelCounts = {};
    for(let i=8; i<maxSlots; i++) {
        const lv = inventory[i];
        if (lv > 0) levelCounts[lv] = (levelCounts[lv] || 0) + 1;
    }
    let targetLv = -1;
    const levels = Object.keys(levelCounts).map(Number).sort((a,b) => a - b);
    for (let lv of levels) { if (levelCounts[lv] >= 2) { targetLv = lv; break; } }
    if (targetLv !== -1) massMerge(targetLv, true); 
}

function massMerge(lv, once = false) {
    let indices = [];
    inventory.forEach((val, idx) => { if(idx >= 8 && val === lv && idx < maxSlots) indices.push(idx); });
    
    // 더블클릭한 아이템이 8번 미만(보호구역)에 있고, 그게 시작점이면 예외적으로 허용할지?
    // 사용자 요청: "해당 치아 레벨 전체 합성". 보호구역은 보통 제외이나, 
    // 직접 더블클릭한 경우는 보호구역도 포함시키는게 UX상 맞을 수 있음.
    // 하지만 현재는 안전을 위해 보호구역(0~7)은 자동 합성에선 제외.
    
    if(indices.length < 2) return;
    
    playSfx('merge');
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    const loopCount = once ? 1 : Math.floor(indices.length / 2);

    for(let i=0; i < loopCount; i++) {
        let idx1 = indices[2*i];
        let idx2 = indices[2*i+1];
        
        const isGreat = Math.random() < pick.greatChance;
        const nextLv = isGreat ? lv + 2 : lv + 1;
        
        inventory[idx2] = nextLv;
        inventory[idx1] = 0;
        
        if(isGreat && currentView === 'mine') triggerGreatSuccess(idx2);
    }
    if(currentView === 'mine') renderInventory();
}

function addMinedItem(pick) {
    let emptyIdx = -1;
    for(let i=0; i<maxSlots; i++) { if(inventory[i] === 0) { emptyIdx = i; break; } }
    if (emptyIdx === -1) {
        autoMergeLowest();
        for(let i=0; i<maxSlots; i++) { if(inventory[i] === 0) { emptyIdx = i; break; } }
    }
    if (emptyIdx !== -1) {
        const isGreat = Math.random() < pick.greatChance;
        inventory[emptyIdx] = isGreat ? pick.mineLv + 1 : pick.mineLv;
        if(currentView === 'mine') renderInventory();
        if(isGreat && currentView === 'mine') triggerGreatSuccess(emptyIdx);
    }
}

// ... 기타 필수 함수들 (v2.2.1과 동일) ...
function processMining(amt) { if (isMiningPaused) return; const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; mineProgress += amt; if (mineProgress >= 100) { mineProgress = 0; addMinedItem(pick); } updateUI(); }
function gameLoop() { if(!isMiningPaused) { processMining(TOOTH_DATA.pickaxes[pickaxeIdx].power * 0.02 * autoMineLevel); const currentMaxTime = Math.max(1000, 25000 - (autoMergeSpeedLevel * 1000)); const increment = (50 / currentMaxTime) * 100; mergeProgress += increment; if (mergeProgress >= 100) { mergeProgress = 0; autoMergeLowest(); } } if (dungeonActive) updateBattle(); updateUI(); }
function handleMoveOrMerge(from, to) { if (from === to) return; if (inventory[from] === inventory[to] && inventory[from] > 0) { const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; const isGreat = Math.random() < pick.greatChance; const nextLv = isGreat ? inventory[from] + 2 : inventory[from] + 1; inventory[to] = nextLv; inventory[from] = 0; if(isGreat) triggerGreatSuccess(to); else playSfx('merge'); } else { [inventory[from], inventory[to]] = [inventory[to], inventory[from]]; } renderInventory(); saveGame(); }
function moveProxy(e) { dragProxy.style.left = e.clientX + 'px'; dragProxy.style.top = e.clientY + 'px'; document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-target')); const elements = document.elementsFromPoint(e.clientX, e.clientY); const targetSlot = elements.find(el => el.classList.contains('slot')); if(targetSlot && parseInt(targetSlot.dataset.index) < maxSlots) targetSlot.classList.add('drag-target'); }
function triggerGreatSuccess(idx) { playSfx('great'); const slot = document.getElementById(`slot-${idx}`); if (slot) { slot.classList.add('shiny-effect'); setTimeout(() => slot.classList.remove('shiny-effect'), 1000); } }
function openShop() { document.getElementById('shop-modal').style.display = 'flex'; renderShopItems(); }
function closeShop() { document.getElementById('shop-modal').style.display = 'none'; }
function renderShopItems() { const content = document.getElementById('shop-content'); let expansionCount = (maxSlots - 24) / 8; content.innerHTML = `<h3 style="color:var(--gold);">Upgrade Lab 🧪</h3><p style="color:#fff; margin-bottom:15px;">보유 골드: <span style="color:var(--gold);">${fNum(gold)}</span></p><div id="shop-items-container"></div>`; const container = document.getElementById('shop-items-container'); const pickNext = TOOTH_DATA.pickaxes[pickaxeIdx + 1]; if (pickNext) container.innerHTML += `<div class="shop-item"><p>⚒️ ${pickNext.name}</p><button onclick="buyItem('pick', ${pickNext.cost})" class="btn-gold">💰 ${fNum(pickNext.cost)}</button></div>`; const autoCost = autoMineLevel * 2000; container.innerHTML += `<div class="shop-item"><p>🤖 채굴 속도 Lv.${autoMineLevel}</p><button onclick="buyItem('auto', ${autoCost})" class="btn-gold">💰 ${fNum(autoCost)}</button></div>`; const mergeCost = autoMergeSpeedLevel * 50000; const mergeSec = Math.max(1, 25 - autoMergeSpeedLevel).toFixed(1); if(autoMergeSpeedLevel < 24) { container.innerHTML += `<div class="shop-item"><p>⚡ 자동합성 (${mergeSec}초)</p><button onclick="buyItem('merge', ${mergeCost})" class="btn-gold">💰 ${fNum(mergeCost)}</button></div>`; } if (expansionCount < 4) { const expCost = TOOTH_DATA.invExpansion[expansionCount]; container.innerHTML += `<div class="shop-item"><p>🎒 인벤토리 확장 (${expansionCount+1}/4)</p><button onclick="buyItem('exp', ${expCost})" class="btn-gold">💰 ${fNum(expCost)}</button></div>`; } content.innerHTML += `<button onclick="closeShop()" class="btn-red" style="width:100%; margin-top:20px;">닫기</button>`; }
function setupMiningTouch() { const mineArea = document.getElementById('mine-rock-area'); mineArea.addEventListener('pointerdown', (e) => { e.preventDefault(); const miner = document.getElementById('miner-char'); miner.style.animation = 'none'; miner.offsetHeight; miner.style.animation = 'hammer 0.1s ease-in-out'; playSfx('mine'); processMining(15); }); }
function manualMine() {} 
function toggleMining() { isMiningPaused = !isMiningPaused; document.getElementById('mine-toggle-btn').innerText = isMiningPaused ? "▶️ 재개" : "⏸️ 정지"; saveGame(); }
function sortInventory() { let items = inventory.slice(8).filter(v => v > 0); items.sort((a, b) => b - a); for(let i=8; i<56; i++) inventory[i] = 0; items.forEach((v, i) => { if(i+8 < 56) inventory[i+8] = v; }); renderInventory(); saveGame(); }
function updateUI() { document.getElementById('gold-display').innerText = fNum(gold); document.getElementById('mine-bar').style.width = mineProgress + '%'; document.getElementById('merge-bar').style.width = mergeProgress + '%'; document.getElementById('pickaxe-name').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].name; saveGame(); }
function switchView(view) { currentView = view; const isMine = view === 'mine'; const isWar = view === 'war'; document.getElementById('mine-view').style.display = isMine ? 'flex' : 'none'; document.getElementById('inventory-section').style.display = isMine ? 'flex' : 'none'; document.getElementById('war-view').style.display = isWar ? 'flex' : 'none'; document.getElementById('tab-mine').classList.toggle('active', isMine); document.getElementById('tab-war').classList.toggle('active', isWar); if (isWar) { renderDungeonList(); renderMercenaryCamp(); } else { renderInventory(); } }
function checkCoupon() { const code = document.getElementById('coupon-input').value.trim(); if (code === "100b" || code === "RICH100B") { gold += 100000000000; alert("치트키 적용!"); updateUI(); } else { alert("유효하지 않음"); } }
function exportSave() { saveGame(); const data = localStorage.getItem('toothSaveV223'); const encoded = btoa(unescape(encodeURIComponent(data))); prompt("코드 복사:", encoded); }
function importSave() { const str = prompt("코드 붙여넣기:"); if (str) { try { const decoded = decodeURIComponent(escape(atob(str))); localStorage.setItem('toothSaveV223', decoded); location.reload(); } catch (e) { alert("오류"); } } }
function renderDungeonList() { const list = document.getElementById('dungeon-list'); list.innerHTML = ''; TOOTH_DATA.dungeons.forEach((name, idx) => { const div = document.createElement('div'); const isUnlocked = idx < unlockedDungeon; div.className = `dungeon-card ${isUnlocked ? 'unlocked' : 'locked'}`; if (isUnlocked) { div.innerHTML = `<h4>⚔️ ${name}</h4><p>권장 Lv.${idx + 1} 이상</p>`; div.onclick = () => startDungeon(idx); } else { div.innerHTML = `<h4>🔒 잠김</h4><p>Lv.${idx} 클리어 시 열림</p>`; } list.appendChild(div); }); }
function renderMercenaryCamp() { const camp = document.getElementById('mercenary-list'); camp.innerHTML = ''; const maxOwned = Math.max(...ownedMercenaries); TOOTH_DATA.mercenaries.forEach(merc => { if (merc.id > maxOwned + 1) return; const div = document.createElement('div'); div.className = 'merc-card'; const isOwned = ownedMercenaries.includes(merc.id); const isEquipped = mercenaryIdx === merc.id; div.innerHTML = `<div style="font-size:25px;">${merc.icon}</div><div style="font-size:12px; font-weight:bold;">${merc.name}</div><div style="font-size:10px; color:#aaa;">공격 x${merc.atkMul}</div>`; if (isEquipped) div.style.border = '2px solid #2ecc71'; else if (isOwned) div.innerHTML += `<button onclick="equipMerc(${merc.id})" class="btn-sm">장착</button>`; else div.innerHTML += `<button onclick="buyMerc(${merc.id}, ${merc.cost})" class="btn-gold" style="padding:2px 5px; font-size:10px;">${fNum(merc.cost)}G</button>`; camp.appendChild(div); }); }
function buyMerc(id, cost) { if(gold >= cost) { gold -= cost; ownedMercenaries.push(id); renderMercenaryCamp(); updateUI(); } else { alert("골드 부족"); } }
function equipMerc(id) { mercenaryIdx = id; renderMercenaryCamp(); saveGame(); }

window.onload = () => { loadGame(); setupMiningTouch(); switchView('mine'); setInterval(gameLoop, 50); };
