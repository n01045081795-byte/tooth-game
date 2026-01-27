// Version: 2.1.2 - Drag Fix & Cheat UI
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

// 드래그 프록시 요소
const dragProxy = document.getElementById('drag-proxy');

function saveGame() {
    const data = { 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        mercenaryIdx, ownedMercenaries,
        lastTime: Date.now(), isMiningPaused 
    };
    localStorage.setItem('toothSaveV212', JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV212');
    if (saved) {
        const d = JSON.parse(saved);
        gold = d.gold || 1000; maxSlots = d.maxSlots || 32; inventory = d.inventory || new Array(64).fill(0);
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
        mercenaryIdx = d.mercenaryIdx || 0;
        ownedMercenaries = d.ownedMercenaries || [0];
        
        if (!isMiningPaused && d.lastTime) {
            const offTime = (Date.now() - d.lastTime) / 1000;
            const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
            const pps = (pick.power * 0.05 * autoMineLevel) / 100;
            const minedCount = Math.floor(offTime * pps);
            for(let i=0; i < minedCount; i++) {
                let idx = inventory.indexOf(0);
                if(idx !== -1 && idx < maxSlots) inventory[idx] = pick.mineLv;
                else break;
            }
        }
    }
}

// 렌더링
function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 64; i++) {
        const slot = document.createElement('div');
        slot.className = `slot ${i < 8 ? 'attack-slot' : ''} ${i >= maxSlots ? 'locked-slot' : ''}`;
        slot.dataset.index = i;
        slot.id = `slot-${i}`;
        
        if (i < maxSlots && inventory[i] > 0) {
            slot.innerHTML = getToothIcon(inventory[i]) + `<span class="lv-text">Lv.${inventory[i]}</span>`;
        } else if (i >= maxSlots) slot.innerHTML = "🔒";
        
        if (i < maxSlots) {
            // 포인터 이벤트 (PC/모바일 통합 드래그)
            slot.onpointerdown = (e) => {
                if (inventory[i] > 0) {
                    dragStartIdx = i;
                    slot.classList.add('picked');
                    
                    // 프록시 설정
                    dragProxy.innerHTML = getToothIcon(inventory[i]);
                    dragProxy.style.display = 'block';
                    moveProxy(e);
                    
                    slot.setPointerCapture(e.pointerId); // 포인터 캡처
                }
            };
            
            slot.onpointermove = (e) => {
                if (dragStartIdx !== null) moveProxy(e);
            };
            
            slot.onpointerup = (e) => {
                if (dragStartIdx !== null) {
                    slot.releasePointerCapture(e.pointerId);
                    slot.classList.remove('picked');
                    dragProxy.style.display = 'none';
                    
                    // 실제 놓인 위치 찾기 (프록시 무시하고 아래 요소 찾기)
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
            
            // 더블클릭 일괄 합성
            slot.ondblclick = (e) => {
                e.stopPropagation();
                if(inventory[i] > 0) massMerge(inventory[i]);
            };
        }
        grid.appendChild(slot);
    }
}

function moveProxy(e) {
    dragProxy.style.left = (e.clientX) + 'px';
    dragProxy.style.top = (e.clientY) + 'px';
    
    // 시각적 피드백
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-target'));
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const targetSlot = elements.find(el => el.classList.contains('slot'));
    if(targetSlot && parseInt(targetSlot.dataset.index) < maxSlots) {
        targetSlot.classList.add('drag-target');
    }
}

function handleMoveOrMerge(from, to) {
    if (from === to) return;
    if (inventory[from] === inventory[to] && inventory[from] > 0) {
        const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
        const isGreat = Math.random() < pick.greatChance;
        const nextLv = isGreat ? inventory[from] + 2 : inventory[from] + 1;
        inventory[to] = nextLv;
        inventory[from] = 0;
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
        
        inventory[indices[i+1]] = nextLv;
        inventory[indices[i]] = 0;
        
        if(isGreat) triggerGreatSuccess(indices[i+1]);
    }
    renderInventory();
}

function triggerGreatSuccess(idx) {
    playSfx('great');
    const slot = document.getElementById(`slot-${idx}`);
    if (slot) {
        slot.classList.add('shiny-effect');
        setTimeout(() => slot.classList.remove('shiny-effect'), 1000);
    }
}

// 화면 전환
function switchView(view) {
    currentView = view;
    document.getElementById('mine-view').style.display = view === 'mine' ? 'flex' : 'none';
    document.getElementById('war-view').style.display = view === 'war' ? 'flex' : 'none';
    document.getElementById('tab-mine').classList.toggle('active', view === 'mine');
    document.getElementById('tab-war').classList.toggle('active', view === 'war');
    
    document.getElementById('inventory-section').style.display = view === 'mine' ? 'flex' : 'none';

    if (view === 'war') {
        renderDungeonList();
        renderMercenaryCamp();
    } else {
        renderInventory();
    }
}

// 쿠폰 및 유틸
function checkCoupon() {
    const code = document.getElementById('coupon-input').value.trim();
    if (code === "100b" || code === "RICH100B") {
        gold += 100000000000;
        alert("치트키 적용: 100b 골드 획득!");
        updateUI();
    } else {
        alert("유효하지 않은 쿠폰입니다.");
    }
}

function exportSave() {
    saveGame();
    const data = localStorage.getItem('toothSaveV212');
    const encoded = btoa(unescape(encodeURIComponent(data)));
    prompt("아래 코드를 복사해서 저장하세요:", encoded);
}

function importSave() {
    const str = prompt("저장 코드를 붙여넣으세요:");
    if (str) {
        try {
            const decoded = decodeURIComponent(escape(atob(str)));
            localStorage.setItem('toothSaveV212', decoded);
            location.reload();
        } catch (e) {
            alert("잘못된 저장 코드입니다.");
        }
    }
}

// 상점, 정렬, 채굴 등 기타 함수들은 기존 v2.1.0과 동일하게 유지
function openShop() { document.getElementById('shop-modal').style.display = 'flex'; renderShopItems(); }
function closeShop() { document.getElementById('shop-modal').style.display = 'none'; }
function renderShopItems() {
    const content = document.getElementById('shop-content');
    let expansionCount = (maxSlots - 32) / 8;
    content.innerHTML = `<h3 style="color:var(--gold);">Upgrade Lab 🧪</h3>
                         <p style="color:#fff; margin-bottom:15px;">보유 골드: <span style="color:var(--gold);">${fNum(gold)}</span></p>
                         <div id="shop-items-container"></div>`;
    const container = document.getElementById('shop-items-container');
    const pickNext = TOOTH_DATA.pickaxes[pickaxeIdx + 1];
    if (pickNext) container.innerHTML += `<div class="shop-item"><p>⚒️ ${pickNext.name}</p><button onclick="buyItem('pick', ${pickNext.cost})" class="btn-gold">💰 ${fNum(pickNext.cost)}</button></div>`;
    const autoCost = autoMineLevel * 2000;
    container.innerHTML += `<div class="shop-item"><p>🤖 자동채굴 Lv.${autoMineLevel}</p><button onclick="buyItem('auto', ${autoCost})" class="btn-gold">💰 ${fNum(autoCost)}</button></div>`;
    if (expansionCount < 4) {
        const expCost = TOOTH_DATA.invExpansion[expansionCount];
        container.innerHTML += `<div class="shop-item"><p>🎒 인벤토리 확장</p><button onclick="buyItem('exp', ${expCost})" class="btn-gold">💰 ${fNum(expCost)}</button></div>`;
    }
    content.innerHTML += `<button onclick="closeShop()" class="btn-red" style="width:100%; margin-top:20px;">닫기</button>`;
}
function buyItem(type, cost) {
    if (gold >= cost) {
        gold -= cost;
        if (type === 'pick') pickaxeIdx++; else if (type === 'auto') autoMineLevel++; else if (type === 'exp') maxSlots += 8;
        renderShopItems(); renderInventory(); updateUI();
    } else { alert("골드가 부족합니다!"); }
}
function renderDungeonList() {
    const list = document.getElementById('dungeon-list');
    list.innerHTML = '';
    TOOTH_DATA.dungeons.forEach((name, idx) => {
        const div = document.createElement('div');
        const isUnlocked = idx < unlockedDungeon;
        div.className = `dungeon-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        if (isUnlocked) {
            div.innerHTML = `<h4>⚔️ ${name}</h4><p>권장 Lv.${idx + 1} 이상</p>`;
            div.onclick = () => startDungeon(idx);
        } else {
            div.innerHTML = `<h4>🔒 잠김</h4><p>Lv.${idx} 클리어 시 열림</p>`;
        }
        list.appendChild(div);
    });
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
        div.innerHTML = `<div style="font-size:25px;">${merc.icon}</div><div style="font-size:12px; font-weight:bold;">${merc.name}</div><div style="font-size:10px; color:#aaa;">공격 x${merc.atkMul}</div>`;
        if (isEquipped) {
            div.style.border = '2px solid #2ecc71'; div.innerHTML += `<div style="color:#2ecc71; font-size:10px;">장착중</div>`;
        } else if (isOwned) {
            div.innerHTML += `<button onclick="equipMerc(${merc.id})" class="btn-sm">장착</button>`;
        } else {
            div.innerHTML += `<button onclick="buyMerc(${merc.id}, ${merc.cost})" class="btn-gold" style="padding:2px 5px; font-size:10px;">${fNum(merc.cost)}G</button>`;
        }
        camp.appendChild(div);
    });
}
function buyMerc(id, cost) { if(gold >= cost) { gold -= cost; ownedMercenaries.push(id); renderMercenaryCamp(); updateUI(); } else { alert("골드가 부족합니다."); } }
function equipMerc(id) { mercenaryIdx = id; renderMercenaryCamp(); saveGame(); }
function manualMine() { const miner = document.getElementById('miner-char'); miner.classList.remove('swing'); void miner.offsetWidth; miner.classList.add('swing'); playSfx('mine'); processMining(10); }
function processMining(amt) {
    if (isMiningPaused) return;
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    mineProgress += amt;
    if (mineProgress >= 100) {
        mineProgress = 0;
        let emptyIdx = inventory.indexOf(0);
        if (emptyIdx !== -1 && emptyIdx < maxSlots) {
            const isGreat = Math.random() < pick.greatChance;
            inventory[emptyIdx] = isGreat ? pick.mineLv + 1 : pick.mineLv;
            renderInventory();
            if(isGreat) triggerGreatSuccess(emptyIdx);
        }
    }
    updateUI();
}
function toggleMining() { isMiningPaused = !isMiningPaused; document.getElementById('mine-toggle-btn').innerText = isMiningPaused ? "▶️ 재개" : "⏸️ 정지"; saveGame(); }
function sortInventory() {
    let items = inventory.filter(v => v > 0);
    items.sort((a, b) => b - a);
    inventory.fill(0);
    items.forEach((v, i) => { if(i < 64) inventory[i] = v; });
    renderInventory(); saveGame();
}
function updateUI() { document.getElementById('gold-display').innerText = fNum(gold); document.getElementById('mine-bar').style.width = mineProgress + '%'; document.getElementById('pickaxe-name').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].name; saveGame(); }
window.onload = () => { loadGame(); switchView('mine'); setInterval(() => { if(!isMiningPaused) processMining(TOOTH_DATA.pickaxes[pickaxeIdx].power * 0.05 * autoMineLevel); if (dungeonActive) updateBattle(); }, 50); };
