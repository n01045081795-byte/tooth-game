// Version: 2.1.4 - Multi-touch & Auto-Merge Gauge
let gold = 1000;
let unlockedDungeon = 1; 
let pickaxeIdx = 0;
let autoMineLevel = 1;
let inventory = new Array(64).fill(0);
let maxSlots = 32;
let mineProgress = 0;
let isMiningPaused = false;
let currentView = 'mine';
let dragStartIdx = null;
let mercenaryIdx = 0;
let ownedMercenaries = [0];

// 자동 합성 관련 변수
let mergeProgress = 0;
let autoMergeSpeedLevel = 1; // 업그레이드 가능
let mergeMaxTime = 25000; // 초기 25초

const dragProxy = document.getElementById('drag-proxy');

function saveGame() {
    const data = { 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        mercenaryIdx, ownedMercenaries, autoMergeSpeedLevel,
        lastTime: Date.now(), isMiningPaused 
    };
    localStorage.setItem('toothSaveV214', JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV214');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 1000; maxSlots = d.maxSlots || 32; inventory = d.inventory || new Array(64).fill(0);
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
        mercenaryIdx = d.mercenaryIdx || 0; ownedMercenaries = d.ownedMercenaries || [0];
        autoMergeSpeedLevel = d.autoMergeSpeedLevel || 1;
        
        // 오프라인 연산 (채굴 + 자동합성)
        if (!isMiningPaused && d.lastTime) {
            const offTime = (Date.now() - d.lastTime) / 1000;
            
            // 1. 채굴 계산
            const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
            const pps = (pick.power * 0.05 * autoMineLevel) / 100;
            const minedCount = Math.floor(offTime * pps);
            
            // 2. 자동합성 계산 (오프라인 동안 몇 번 돌았나)
            const currentMaxTime = Math.max(1000, 25000 - (autoMergeSpeedLevel * 1000));
            const merges = Math.floor((offTime * 1000) / currentMaxTime);
            
            // 오프라인 정산 시뮬레이션
            for(let k=0; k < merges; k++) autoMergeLowest();
            for(let i=0; i < minedCount; i++) addMinedItem(pick);
        }
    }
}

// 자동 채굴 및 합성 루프
function gameLoop() {
    if(!isMiningPaused) {
        // 채굴
        processMining(TOOTH_DATA.pickaxes[pickaxeIdx].power * 0.05 * autoMineLevel);
        
        // 자동 합성 게이지 증가
        const currentMaxTime = Math.max(1000, 25000 - (autoMergeSpeedLevel * 1000));
        const increment = (50 / currentMaxTime) * 100; // 50ms 마다 증가분
        mergeProgress += increment;
        
        if (mergeProgress >= 100) {
            mergeProgress = 0;
            autoMergeLowest();
            playSfx('merge'); // 소리 추가
        }
    }
    if (dungeonActive) updateBattle();
    updateUI();
}

function processMining(amt) {
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    mineProgress += amt;
    if (mineProgress >= 100) {
        mineProgress = 0;
        addMinedItem(pick);
    }
}

function addMinedItem(pick) {
    let emptyIdx = inventory.indexOf(0);
    // 빈칸 없고 꽉 찼으면 -> 자동 합성 1회 시도 후 재확인
    if (emptyIdx === -1 || emptyIdx >= maxSlots) {
        autoMergeLowest();
        emptyIdx = inventory.indexOf(0);
    }
    
    if (emptyIdx !== -1 && emptyIdx < maxSlots) {
        const isGreat = Math.random() < pick.greatChance;
        inventory[emptyIdx] = isGreat ? pick.mineLv + 1 : pick.mineLv;
        if(currentView === 'mine') renderInventory();
        if(isGreat && currentView === 'mine') triggerGreatSuccess(emptyIdx);
    }
}

// 인벤토리 내 최하 레벨 치아들 합성
function autoMergeLowest() {
    let minLv = 999;
    let candidates = [];
    
    // 최소 레벨 찾기
    for(let i=0; i<maxSlots; i++) {
        if(inventory[i] > 0) {
            if(inventory[i] < minLv) {
                minLv = inventory[i];
                candidates = [i];
            } else if (inventory[i] === minLv) {
                candidates.push(i);
            }
        }
    }
    
    // 2개 이상이면 합성
    if (candidates.length >= 2) {
        // 앞에서부터 2개씩 짝지어 합성
        for(let k=0; k < candidates.length - 1; k += 2) {
            let idx1 = candidates[k];
            let idx2 = candidates[k+1];
            
            // 대성공 확률 적용
            const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
            const isGreat = Math.random() < pick.greatChance;
            const nextLv = isGreat ? minLv + 2 : minLv + 1;
            
            inventory[idx2] = nextLv;
            inventory[idx1] = 0;
            
            if(currentView === 'mine') {
                renderInventory(); // 즉시 갱신
                if(isGreat) triggerGreatSuccess(idx2);
            }
        }
    }
}

// 멀티터치 채굴 설정
function setupMiningTouch() {
    const mineArea = document.getElementById('mine-rock-area');
    mineArea.addEventListener('pointerdown', (e) => {
        e.preventDefault(); // 줌/스크롤 방지
        const miner = document.getElementById('miner-char');
        
        // 애니메이션 리셋
        miner.style.animation = 'none';
        miner.offsetHeight; /* trigger reflow */
        miner.style.animation = 'hammer 0.1s ease-in-out';
        
        playSfx('mine');
        processMining(15); // 터치 시 채굴량 (자동보다 높게)
    });
}

// 렌더링 (DMG, Lv 표시 추가)
function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const slot = document.createElement('div');
        slot.className = `slot ${i < 8 ? 'attack-slot' : ''} ${i >= maxSlots ? 'locked-slot' : ''}`;
        slot.dataset.index = i;
        slot.id = `slot-${i}`;
        
        if (i < maxSlots && inventory[i] > 0) {
            const dmg = fNum(getAtk(inventory[i]));
            slot.innerHTML = `
                <span class="dmg-label">⚔️${dmg}</span>
                ${getToothIcon(inventory[i])}
                <span class="lv-label">Lv.${inventory[i]}</span>
            `;
        } else if (i >= maxSlots) slot.innerHTML = "🔒";
        
        if (i < maxSlots) {
            slot.onpointerdown = (e) => {
                if (inventory[i] > 0) {
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
                    } else {
                        // 슬롯 밖에서 놓으면 클릭으로 간주 -> 더블클릭 로직과 연계 필요하지만,
                        // 여기서는 드래그 실패 시 아무 일도 안 함.
                    }
                    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-target'));
                    dragStartIdx = null;
                }
            };
            // 더블클릭 이벤트 (드래그와 별도)
            slot.ondblclick = (e) => {
                e.stopPropagation();
                if(inventory[i] > 0) massMerge(inventory[i]);
            };
        }
        grid.appendChild(slot);
    }
}

function handleMoveOrMerge(from, to) {
    if (from === to) return;
    if (inventory[from] === inventory[to] && inventory[from] > 0) {
        const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
        const isGreat = Math.random() < pick.greatChance;
        const nextLv = isGreat ? inventory[from] + 2 : inventory[from] + 1;
        inventory[to] = nextLv; inventory[from] = 0;
        if(isGreat) triggerGreatSuccess(to); else playSfx('merge');
    } else {
        [inventory[from], inventory[to]] = [inventory[to], inventory[from]];
    }
    renderInventory(); saveGame();
}

function massMerge(lv) {
    let indices = [];
    inventory.forEach((val, idx) => { if(val === lv && idx < maxSlots) indices.push(idx); });
    if(indices.length < 2) return;
    playSfx('merge');
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    for(let i=0; i < indices.length - 1; i += 2) {
        const isGreat = Math.random() < pick.greatChance;
        const nextLv = isGreat ? lv + 2 : lv + 1;
        inventory[indices[i+1]] = nextLv; inventory[indices[i]] = 0;
        if(isGreat) triggerGreatSuccess(indices[i+1]);
    }
    renderInventory();
}

function moveProxy(e) {
    dragProxy.style.left = e.clientX + 'px';
    dragProxy.style.top = e.clientY + 'px';
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-target'));
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const targetSlot = elements.find(el => el.classList.contains('slot'));
    if(targetSlot && parseInt(targetSlot.dataset.index) < maxSlots) targetSlot.classList.add('drag-target');
}

function triggerGreatSuccess(idx) {
    playSfx('great');
    const slot = document.getElementById(`slot-${idx}`);
    if (slot) {
        slot.classList.add('shiny-effect');
        setTimeout(() => slot.classList.remove('shiny-effect'), 1000);
    }
}

// 상점 렌더링 업데이트 (자동합성 업그레이드 추가)
function renderShopItems() {
    const content = document.getElementById('shop-content');
    let expansionCount = (maxSlots - 32) / 8;
    content.innerHTML = `<h3 style="color:var(--gold);">Upgrade Lab 🧪</h3>
                         <p style="color:#fff; margin-bottom:15px;">보유 골드: <span style="color:var(--gold);">${fNum(gold)}</span></p>
                         <div id="shop-items-container"></div>`;
    const container = document.getElementById('shop-items-container');
    
    // 곡괭이
    const pickNext = TOOTH_DATA.pickaxes[pickaxeIdx + 1];
    if (pickNext) container.innerHTML += `<div class="shop-item"><p>⚒️ ${pickNext.name}</p><button onclick="buyItem('pick', ${pickNext.cost})" class="btn-gold">💰 ${fNum(pickNext.cost)}</button></div>`;
    
    // 자동 채굴 속도
    const autoCost = autoMineLevel * 2000;
    container.innerHTML += `<div class="shop-item"><p>🤖 채굴 속도 Lv.${autoMineLevel}</p><button onclick="buyItem('auto', ${autoCost})" class="btn-gold">💰 ${fNum(autoCost)}</button></div>`;
    
    // 자동 합성 속도 (신규)
    const mergeCost = autoMergeSpeedLevel * 50000;
    const mergeSec = Math.max(1, 25 - autoMergeSpeedLevel).toFixed(1);
    if(autoMergeSpeedLevel < 24) {
        container.innerHTML += `<div class="shop-item"><p>⚡ 자동합성 (${mergeSec}초)</p><button onclick="buyItem('merge', ${mergeCost})" class="btn-gold">💰 ${fNum(mergeCost)}</button></div>`;
    }

    // 인벤토리 확장
    if (expansionCount < 4) {
        const expCost = TOOTH_DATA.invExpansion[expansionCount];
        container.innerHTML += `<div class="shop-item"><p>🎒 인벤토리 확장</p><button onclick="buyItem('exp', ${expCost})" class="btn-gold">💰 ${fNum(expCost)}</button></div>`;
    }
    
    content.innerHTML += `<button onclick="closeShop()" class="btn-red" style="width:100%; margin-top:20px;">닫기</button>`;
}

function buyItem(type, cost) {
    if (gold >= cost) {
        gold -= cost;
        if (type === 'pick') pickaxeIdx++;
        else if (type === 'auto') autoMineLevel++;
        else if (type === 'merge') autoMergeSpeedLevel++; // 신규
        else if (type === 'exp') maxSlots += 8;
        renderShopItems(); renderInventory(); updateUI();
    } else { alert("골드가 부족합니다!"); }
}

// 기타 필수 함수들 (UI 업데이트 등)
function updateUI() {
    document.getElementById('gold-display').innerText = fNum(gold);
    document.getElementById('mine-bar').style.width = mineProgress + '%';
    document.getElementById('merge-bar').style.width = mergeProgress + '%'; // 게이지 업데이트
    document.getElementById('pickaxe-name').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].name;
    saveGame();
}

function switchView(view) {
    currentView = view;
    const isMine = view === 'mine';
    const isWar = view === 'war';
    
    document.getElementById('mine-view').style.display = isMine ? 'flex' : 'none';
    document.getElementById('inventory-section').style.display = isMine ? 'flex' : 'none'; // 섹션 전체 토글
    document.getElementById('war-view').style.display = isWar ? 'flex' : 'none';
    
    document.getElementById('tab-mine').classList.toggle('active', isMine);
    document.getElementById('tab-war').classList.toggle('active', isWar);

    if (isWar) { renderDungeonList(); renderMercenaryCamp(); } 
    else { renderInventory(); }
}

// ... (쿠폰, 저장 등 나머지 함수는 v2.1.2와 동일하게 유지) ...
function checkCoupon() { const code = document.getElementById('coupon-input').value.trim(); if (code === "100b" || code === "RICH100B") { gold += 100000000000; alert("치트키 적용: 100b 골드 획득!"); updateUI(); } else { alert("유효하지 않은 쿠폰입니다."); } }
function exportSave() { saveGame(); const data = localStorage.getItem('toothSaveV214'); const encoded = btoa(unescape(encodeURIComponent(data))); prompt("아래 코드를 복사해서 저장하세요:", encoded); }
function importSave() { const str = prompt("저장 코드를 붙여넣으세요:"); if (str) { try { const decoded = decodeURIComponent(escape(atob(str))); localStorage.setItem('toothSaveV214', decoded); location.reload(); } catch (e) { alert("잘못된 저장 코드입니다."); } } }
function toggleMining() { isMiningPaused = !isMiningPaused; document.getElementById('mine-toggle-btn').innerText = isMiningPaused ? "▶️ 재개" : "⏸️ 정지"; saveGame(); }
function sortInventory() { let items = inventory.filter(v => v > 0); items.sort((a, b) => b - a); inventory.fill(0); items.forEach((v, i) => { if(i < 64) inventory[i] = v; }); renderInventory(); saveGame(); }
function openShop() { document.getElementById('shop-modal').style.display = 'flex'; renderShopItems(); }
function closeShop() { document.getElementById('shop-modal').style.display = 'none'; }
function renderDungeonList() { const list = document.getElementById('dungeon-list'); list.innerHTML = ''; TOOTH_DATA.dungeons.forEach((name, idx) => { const div = document.createElement('div'); const isUnlocked = idx < unlockedDungeon; div.className = `dungeon-card ${isUnlocked ? 'unlocked' : 'locked'}`; if (isUnlocked) { div.innerHTML = `<h4>⚔️ ${name}</h4><p>권장 Lv.${idx + 1} 이상</p>`; div.onclick = () => startDungeon(idx); } else { div.innerHTML = `<h4>🔒 잠김</h4><p>Lv.${idx} 클리어 시 열림</p>`; } list.appendChild(div); }); }
function renderMercenaryCamp() { const camp = document.getElementById('mercenary-list'); camp.innerHTML = ''; const maxOwned = Math.max(...ownedMercenaries); TOOTH_DATA.mercenaries.forEach(merc => { if (merc.id > maxOwned + 1) return; const div = document.createElement('div'); div.className = 'merc-card'; const isOwned = ownedMercenaries.includes(merc.id); const isEquipped = mercenaryIdx === merc.id; div.innerHTML = `<div style="font-size:25px;">${merc.icon}</div><div style="font-size:12px; font-weight:bold;">${merc.name}</div><div style="font-size:10px; color:#aaa;">공격 x${merc.atkMul}</div>`; if (isEquipped) div.style.border = '2px solid #2ecc71'; else if (isOwned) div.innerHTML += `<button onclick="equipMerc(${merc.id})" class="btn-sm">장착</button>`; else div.innerHTML += `<button onclick="buyMerc(${merc.id}, ${merc.cost})" class="btn-gold" style="padding:2px 5px; font-size:10px;">${fNum(merc.cost)}G</button>`; camp.appendChild(div); }); }
function buyMerc(id, cost) { if(gold >= cost) { gold -= cost; ownedMercenaries.push(id); renderMercenaryCamp(); updateUI(); } else { alert("골드가 부족합니다."); } }
function equipMerc(id) { mercenaryIdx = id; renderMercenaryCamp(); saveGame(); }
function manualMine() { } // setupMiningTouch로 대체됨

window.onload = () => {
    loadGame();
    setupMiningTouch();
    switchView('mine');
    setInterval(gameLoop, 50); // 게임 루프 실행
};
