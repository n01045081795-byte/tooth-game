// Version: 6.6.0 - Massive Virtual Ranking
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
let globalUpgrades = { cd: 0, rng: 0 };
let greatChanceLevel = 0; 
let nickname = ""; 

let isResetting = false;

const dragProxy = document.getElementById('drag-proxy');
let lastTapTime = 0; let lastTapIdx = -1;

const MAX_AUTO_MINE_LV = 40;
const MAX_AUTO_MERGE_LV = 15;
const MAX_GREAT_LV = 25; 
const MAX_GLOBAL_CD = 45; 
const MAX_GLOBAL_RNG = 50; 

function saveGame() {
    if (isResetting) return; 

    const data = { 
        gold, maxSlots, inventory, unlockedDungeon, pickaxeIdx, autoMineLevel,
        mercenaryIdx, ownedMercenaries, autoMergeSpeedLevel, isMuted,
        slotUpgrades, globalUpgrades, greatChanceLevel, nickname, 
        lastTime: Date.now(), isMiningPaused 
    };
    localStorage.setItem('toothSaveV660', JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem('toothSaveV660');
    const legacy = localStorage.getItem('toothSaveV650') || localStorage.getItem('toothSaveV600') || localStorage.getItem('toothSaveV550') || localStorage.getItem('toothSaveV500') || localStorage.getItem('toothSaveV420');
    
    let d = null;
    if (saved) d = JSON.parse(saved);
    else if (legacy) d = JSON.parse(legacy);

    if (d) {
        gold = d.gold !== undefined ? d.gold : 0; 
        maxSlots = d.maxSlots || 24; 
        inventory = d.inventory || new Array(56).fill(0);
        if(inventory.length > 56) inventory = inventory.slice(0, 56);
        unlockedDungeon = d.unlockedDungeon || 1; pickaxeIdx = d.pickaxeIdx || 0;
        autoMineLevel = d.autoMineLevel || 1; isMiningPaused = d.isMiningPaused || false;
        mercenaryIdx = d.mercenaryIdx || 0; ownedMercenaries = d.ownedMercenaries || [0];
        autoMergeSpeedLevel = d.autoMergeSpeedLevel || 1;
        isMuted = d.isMuted || false;
        
        if (d.slotUpgrades && Array.isArray(d.slotUpgrades)) slotUpgrades = d.slotUpgrades;
        if (d.globalUpgrades) globalUpgrades = d.globalUpgrades;
        if (d.greatChanceLevel) greatChanceLevel = d.greatChanceLevel;
        if (d.nickname) nickname = d.nickname;
        
        if (!isMiningPaused && d.lastTime) {
            const offTime = (Date.now() - d.lastTime) / 1000;
            const miningSpeed = Math.max(7, 15 - (autoMineLevel * 0.2)); 
            const minedCount = Math.floor(offTime / miningSpeed); 
            const currentMaxTime = Math.max(10000, 25000 - (autoMergeSpeedLevel * 1000));
            const merges = Math.floor((offTime * 1000) / currentMaxTime);
            
            for(let k=0; k < merges; k++) autoMergeLowest();
            for(let i=0; i < minedCount; i++) {
                if(!addMinedItem()) break; 
            }
        }
    }
    
    if (!nickname) {
        document.getElementById('nickname-input').value = generateRandomId();
        document.getElementById('nickname-modal').style.display = 'flex';
    }

    cleanupInventory();
    updateSoundBtn();
    updatePickaxeVisual();
}

function generateRandomId() {
    return "User-" + Math.random().toString(36).substr(2, 4);
}

function confirmNickname() {
    const input = document.getElementById('nickname-input').value.trim();
    if(input.length > 0) {
        nickname = input;
        document.getElementById('nickname-modal').style.display = 'none';
        saveGame();
    } else {
        alert("닉네임을 입력해주세요.");
    }
}

// ★ 가상 랭킹 시스템 (10,000명 규모 시뮬레이션) ★
function openRanking() {
    const modal = document.getElementById('ranking-modal');
    modal.style.display = 'flex';
    generateRankings();
}

function closeRanking() {
    document.getElementById('ranking-modal').style.display = 'none';
}

function calculateTotalPower() {
    let power = 0;
    // 공격력 합계
    for(let i=0; i<maxSlots; i++) {
        if(inventory[i] > 0) power += getAtk(inventory[i]);
    }
    return power;
}

// 점수 = (던전진행도 * 10억) + 총공격력
// 이렇게 하면 던전 진행도가 깡패가 됨.
function getScore(dungeonLv, power) {
    return (dungeonLv * 1000000000) + power;
}

function generateRankings() {
    const list = document.getElementById('ranking-list');
    const myPower = calculateTotalPower();
    const myScore = getScore(unlockedDungeon, myPower);
    let ranks = [];

    // 1. 내 예상 등수 계산 (1만명 기준)
    // 던전 1 (시작) -> 9000~9900등
    // 던전 10 (중간) -> 1000~2000등
    // 던전 20 (끝) -> 1~100등
    // 던전 21 (클리어) -> 1위
    let myRank = 9999;
    if (unlockedDungeon > 20) {
        myRank = 1;
    } else {
        // 지수 함수적으로 등수가 오름 (초반엔 천천히, 후반엔 급격히)
        const progress = (unlockedDungeon - 1) / 20; // 0.0 ~ 0.95
        // 역으로 계산: 진행도가 높을수록 rank는 1에 가까워짐
        // 10000 * (1 - progress)^3 정도?
        // 던전1(0): 10000
        // 던전10(0.45): 10000 * 0.16 = 1600
        // 던전20(0.95): 10000 * 0.0001 = 1
        let calcRank = Math.floor(10000 * Math.pow(1 - progress, 2.5));
        calcRank = Math.max(50, calcRank); // 최소 50등 (Top3 제외한 최상위)
        // 약간의 랜덤성
        myRank = Math.floor(calcRank * (0.9 + Math.random() * 0.2));
    }
    
    // 2. Top 3 생성 (고정 괴물들)
    // 이들은 무조건 던전 21(클리어 상태)에 공격력도 높음
    ranks.push({ rank: 1, name: "치아의신", dungeon: 21, power: 9999999999, isMe: false });
    ranks.push({ rank: 2, name: "Driller", dungeon: 21, power: 8500000000, isMe: false });
    ranks.push({ rank: 3, name: "User-k9z1", dungeon: 21, power: 7200000000, isMe: false });

    // 만약 내가 1등이라면? (던전 21 도달)
    if (unlockedDungeon > 20) {
        // 공동 1위 처리: 나를 1위로 넣고, 기존 1위들과 섞임
        // 여기선 단순하게 Top 3 리스트 다음에 나를 1위로 표시 (UI상 공동 1위 느낌)
        ranks.push({ rank: 1, name: nickname, dungeon: unlockedDungeon, power: myPower, isMe: true });
        
        // 내 아래 2명
        ranks.push({ rank: 4, name: generateRandomId(), dungeon: 20, power: myPower * 0.8, isMe: false });
        ranks.push({ rank: 5, name: generateRandomId(), dungeon: 20, power: myPower * 0.7, isMe: false });
    } else {
        // 성장 중일 때: 내 위 2명, 나, 내 아래 2명 생성
        
        // 내 위 2명 (점수가 나보다 조금 높음)
        ranks.push({ rank: myRank - 2, name: generateRandomId(), dungeon: unlockedDungeon, power: Math.floor(myPower * 1.1), isMe: false });
        ranks.push({ rank: myRank - 1, name: generateRandomId(), dungeon: unlockedDungeon, power: Math.floor(myPower * 1.05), isMe: false });
        
        // 나
        ranks.push({ rank: myRank, name: nickname, dungeon: unlockedDungeon, power: myPower, isMe: true });
        
        // 내 아래 2명 (점수가 나보다 조금 낮음, 혹은 이전 던전)
        ranks.push({ rank: myRank + 1, name: generateRandomId(), dungeon: unlockedDungeon, power: Math.floor(myPower * 0.95), isMe: false });
        ranks.push({ rank: myRank + 2, name: generateRandomId(), dungeon: unlockedDungeon, power: Math.floor(myPower * 0.9), isMe: false });
    }

    // 렌더링
    let html = "";
    
    // Top 3 먼저 출력
    for(let i=0; i<3; i++) {
        const r = ranks[i];
        html += `
        <div class="rank-row top${r.rank}">
            <span>${r.rank}위</span>
            <span>${r.name}</span>
            <span>Lv.${r.dungeon > 20 ? 'Max' : r.dungeon}</span>
            <span>${fNum(r.power)}</span>
        </div>`;
    }
    
    // 구분선
    html += `<div style="text-align:center; padding:5px; color:#555;">...</div>`;

    // 내 주변 출력 (Top 3와 겹치지 않게 필터링)
    for(let i=3; i<ranks.length; i++) {
        const r = ranks[i];
        let rowClass = "rank-row";
        if (r.isMe) rowClass += " my-rank";
        
        // 내 던전 레벨 표시 (21이면 Max)
        let dLv = r.dungeon > 20 ? 'Max' : r.dungeon;

        html += `
        <div class="${rowClass}">
            <span>${r.rank}위</span>
            <span>${r.name}</span>
            <span>Lv.${dLv}</span>
            <span>${fNum(r.power)}</span>
        </div>`;
    }

    list.innerHTML = html;
    
    // 하단 내 정보
    document.getElementById('my-rank-display').innerText = `내 순위: ${myRank}위 (Lv.${unlockedDungeon > 20 ? 'Max' : unlockedDungeon})`;
}

function cleanupInventory() {
    const minMiningLv = unlockedDungeon;
    let cleared = false;
    for(let i=0; i < maxSlots; i++) {
        if(inventory[i] > 0 && inventory[i] < minMiningLv) {
            inventory[i] = 0; 
            cleared = true;
        }
    }
    if(cleared && currentView === 'mine') renderInventory();
}

function openGuide() { document.getElementById('guide-modal').style.display = 'flex'; }
function closeGuide() { document.getElementById('guide-modal').style.display = 'none'; }

function renderShopItems() {
    const content = document.getElementById('shop-content');
    if(!content) return;
    let expansionCount = (maxSlots - 24) / 8;
    content.innerHTML = `<h3 style="color:var(--gold);">Upgrade Lab 🧪</h3><p style="color:#fff; margin-bottom:15px;">보유 골드: <span style="color:var(--gold);">${fNum(gold)}</span></p><div id="shop-items-container"></div>`;
    const container = document.getElementById('shop-items-container');
    
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx];
    const pickNext = TOOTH_DATA.pickaxes[pickaxeIdx + 1];
    if (pickNext) {
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>⚒️ ${pickNext.name}</span> <button onclick="buyItem('pick', ${pickNext.cost})" class="btn-gold">💰 ${fNum(pickNext.cost)}</button></div>
            <div class="shop-desc">
                <span style="color:#2ecc71">🍀 상위(Lv+1) 채굴 확률: ${Math.round(pick.luck*100)}% ➔ ${Math.round(pickNext.luck*100)}%</span>
            </div>
        </div>`;
    } else {
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>⚒️ ${pick.name} (MAX)</span> <button class="btn-max">MAX</button></div>
            <div class="shop-desc">🍀 상위 채굴 확률: ${Math.round(pick.luck*100)}% (최대)</div>
        </div>`;
    }

    const curGreat = greatChanceLevel * 2; 
    if (greatChanceLevel < MAX_GREAT_LV) {
        const amuletCost = Math.floor(5000 * Math.pow(1.5, greatChanceLevel));
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>🍀 합성의 부적 (Lv.${greatChanceLevel})</span> <button onclick="buyItem('amulet', ${amuletCost})" class="btn-gold">💰 ${fNum(amuletCost)}</button></div>
            <div class="shop-desc">
                <span style="color:#9b59b6">✨ 합성 대성공(Lv+2) 확률: ${curGreat}% ➔ ${curGreat+2}%</span>
            </div>
        </div>`;
    } else {
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>🍀 합성의 부적 (MAX)</span> <button class="btn-max">MAX</button></div>
            <div class="shop-desc">✨ 합성 대성공 확률: ${curGreat}% (최대)</div>
        </div>`;
    }
    
    const curSpd = Math.max(7, 15 - (autoMineLevel * 0.2)).toFixed(1);
    if (autoMineLevel < MAX_AUTO_MINE_LV) {
        const autoCost = Math.floor(500 * Math.pow(1.4, autoMineLevel - 1));
        const nextSpd = Math.max(7, 15 - ((autoMineLevel+1) * 0.2)).toFixed(1);
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>🤖 자동 채굴 강화 (Lv.${autoMineLevel})</span> <button onclick="buyItem('auto', ${autoCost})" class="btn-gold">💰 ${fNum(autoCost)}</button></div>
            <div class="shop-desc">속도: ${curSpd}초 ➔ ${nextSpd}초</div>
        </div>`;
    } else {
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>🤖 자동 채굴 강화 (MAX)</span> <button class="btn-max">MAX</button></div>
            <div class="shop-desc">현재 속도: ${curSpd}초 (최대 효율)</div>
        </div>`;
    }
    
    const curMerge = Math.max(10, 25 - autoMergeSpeedLevel).toFixed(1);
    if (autoMergeSpeedLevel < MAX_AUTO_MERGE_LV) {
        const mergeCost = Math.floor(1000 * Math.pow(1.6, autoMergeSpeedLevel - 1));
        const nextMerge = Math.max(10, 25 - (autoMergeSpeedLevel + 1)).toFixed(1);
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>⚡ 자동 합성 강화 (Lv.${autoMergeSpeedLevel})</span> <button onclick="buyItem('merge', ${mergeCost})" class="btn-gold">💰 ${fNum(mergeCost)}</button></div>
            <div class="shop-desc">주기: ${curMerge}초 ➔ ${nextMerge}초</div>
        </div>`;
    } else {
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>⚡ 자동 합성 강화 (MAX)</span> <button class="btn-max">MAX</button></div>
            <div class="shop-desc">현재 주기: ${curMerge}초 (최대 효율)</div>
        </div>`;
    }
    
    if (expansionCount < 4) {
        const expCost = TOOTH_DATA.invExpansion[expansionCount];
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>🎒 인벤토리 확장 (${expansionCount+1}/4)</span> <button onclick="buyItem('exp', ${expCost})" class="btn-gold">💰 ${fNum(expCost)}</button></div>
            <div class="shop-desc">8칸 추가 개방</div>
        </div>`;
    } else {
        container.innerHTML += `
        <div class="shop-item">
            <div class="shop-info"><span>🎒 인벤토리 확장 (MAX)</span> <button class="btn-max">MAX</button></div>
            <div class="shop-desc">모든 슬롯이 개방되었습니다.</div>
        </div>`;
    }
    content.innerHTML += `<button onclick="closeShop()" class="btn-red" style="width:100%; margin-top:20px;">닫기</button>`;
}

function buyItem(type, cost) {
    if (gold >= cost) {
        gold -= cost;
        playSfx('upgrade'); 
        if (type === 'pick') {
            pickaxeIdx++;
            cleanupInventory();
            updatePickaxeVisual();
        } 
        else if (type === 'amulet') greatChanceLevel++;
        else if (type === 'auto') autoMineLevel++;
        else if (type === 'merge') autoMergeSpeedLevel++;
        else if (type === 'exp') maxSlots += 8;
        
        renderShopItems(); renderInventory(); updateUI();
    } else { alert("골드가 부족합니다!"); }
}

function renderRefineView() {
    const grid = document.getElementById('refine-grid');
    if (!grid) return;
    
    const costGlobalCd = Math.floor(5000 * Math.pow(1.8, globalUpgrades.cd));
    const costGlobalRng = Math.floor(3000 * Math.pow(1.8, globalUpgrades.rng));
    
    const curCdReduc = Math.min(90, globalUpgrades.cd * 2);
    const nextCdReduc = Math.min(90, (globalUpgrades.cd + 1) * 2);
    const curRngVal = globalUpgrades.rng;
    
    const isCdMax = globalUpgrades.cd >= MAX_GLOBAL_CD;
    const isRngMax = globalUpgrades.rng >= MAX_GLOBAL_RNG;

    let html = `
    <div style="grid-column: 1 / -1; background: #222; padding: 10px; border-radius: 8px; border: 2px solid var(--gold); margin-bottom: 15px;">
        <h4 style="margin:0 0 10px 0; color:var(--gold); text-align:center;">🌍 전체 슬롯 동시 강화</h4>
        <div style="display:flex; gap:10px;">
            ${isCdMax ? 
                `<button class="btn-sm" style="flex:1; height:60px; background:#444; color:#888; cursor:default;">⏳ 전체 쿨타임 (MAX)<br>-90% (최대)</button>` : 
                `<button onclick="upgradeGlobal('cd', ${costGlobalCd})" class="btn-sm" style="flex:1; height:60px; background:#34495e;">⏳ 전체 쿨타임 Lv.${globalUpgrades.cd}<br><span style="color:#2ecc71;">-${curCdReduc}% ➔ -${nextCdReduc}%</span><br>💰 ${fNum(costGlobalCd)}</button>`
            }
            ${isRngMax ?
                `<button class="btn-sm" style="flex:1; height:60px; background:#444; color:#888; cursor:default;">🏹 전체 사거리 (MAX)<br>Lv.50 (최대)</button>` :
                `<button onclick="upgradeGlobal('rng', ${costGlobalRng})" class="btn-sm" style="flex:1; height:60px; background:#34495e;">🏹 전체 사거리 Lv.${globalUpgrades.rng}<br><span style="color:#2ecc71;">Lv.${curRngVal} ➔ Lv.${curRngVal+1}</span><br>💰 ${fNum(costGlobalRng)}</button>`
            }
        </div>
    </div>
    `;
    
    slotUpgrades.forEach((slot, idx) => {
        const isLocked = idx >= unlockedDungeon;
        
        if (isLocked) {
            html += `
            <div class="refine-card locked-refine">
                <div class="refine-header">🔒 슬롯 #${idx+1}</div>
                <div class="refine-btn" style="height:100%; cursor:default;">
                    <span>🔒 잠김</span>
                    <span style="font-size:9px; color:#aaa;">던전 ${idx} 클리어 필요</span>
                </div>
            </div>`;
        } else {
            const costAtk = Math.floor(1000 * Math.pow(1.3, slot.atk));
            const curAtk = (1 + slot.atk * 0.1).toFixed(1);
            const nextAtk = (1 + (slot.atk+1) * 0.1).toFixed(1);

            html += `
            <div class="refine-card">
                <div class="refine-header">🔥 슬롯 #${idx+1}</div>
                <div class="refine-btn" onclick="upgradeSlot(${idx}, 'atk', ${costAtk})" style="height:100%;">
                    <span>⚔️ 공격력 Lv.${slot.atk}</span>
                    <span class="refine-val" style="font-size:12px;">(x${curAtk} ➔ x${nextAtk})</span>
                    <span style="margin-top:5px;">💰${fNum(costAtk)}</span>
                </div>
            </div>`;
        }
    });
    
    grid.innerHTML = html;
}

function upgradeGlobal(type, cost) {
    if (type === 'cd' && globalUpgrades.cd >= MAX_GLOBAL_CD) return;
    if (type === 'rng' && globalUpgrades.rng >= MAX_GLOBAL_RNG) return;

    if (gold >= cost) {
        gold -= cost;
        globalUpgrades[type]++;
        playSfx('upgrade');
        renderRefineView();
        updateUI();
    } else { alert("골드가 부족합니다!"); }
}

function upgradeSlot(idx, type, cost) {
    if (gold >= cost) {
        gold -= cost;
        slotUpgrades[idx][type]++;
        playSfx('upgrade');
        renderRefineView();
        updateUI();
    } else { alert("골드가 부족합니다!"); }
}

function sortInventory() { let items = inventory.filter(v => v > 0); items.sort((a, b) => b - a); inventory.fill(0); items.forEach((v, i) => { if(i < 56) inventory[i] = v; }); renderInventory(); saveGame(); }
function autoMergeLowest() { let levelCounts = {}; for(let i=8; i<maxSlots; i++) { const lv = inventory[i]; if (lv > 0) levelCounts[lv] = (levelCounts[lv] || 0) + 1; } let targetLv = -1; const levels = Object.keys(levelCounts).map(Number).sort((a,b) => a - b); for (let lv of levels) { if (levelCounts[lv] >= 2) { targetLv = lv; break; } } if (targetLv !== -1) massMerge(targetLv, true); }

function massMerge(lv, once = false) { 
    let indices = []; 
    inventory.forEach((val, idx) => { if(idx >= 8 && val === lv && idx < maxSlots) indices.push(idx); }); 
    if(indices.length < 2) return; 
    playSfx('merge'); 
    
    const loopCount = once ? 1 : Math.floor(indices.length / 2); 
    const currentGreatChance = greatChanceLevel * 0.02; // 레벨당 2%

    for(let i=0; i < loopCount; i++) { 
        let idx1 = indices[2*i]; 
        let idx2 = indices[2*i+1]; 
        
        const isGreat = Math.random() < currentGreatChance; 
        const nextLv = isGreat ? lv + 2 : lv + 1; 
        
        inventory[idx2] = nextLv; 
        inventory[idx1] = 0; 
        
        if(isGreat && currentView === 'mine') triggerGreatSuccess(idx2); 
    } 
    if(currentView === 'mine') renderInventory(); 
}

function addMinedItem() { 
    cleanupInventory();
    let emptyIdx = -1; 
    for(let i=0; i<maxSlots; i++) { if(inventory[i] === 0) { emptyIdx = i; break; } } 
    if (emptyIdx === -1) return false; 
    
    const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; 
    const baseLv = unlockedDungeon; 
    
    let resultLv = baseLv;
    if (Math.random() < pick.luck) resultLv += 1; 
    
    inventory[emptyIdx] = resultLv;

    if(currentView === 'mine') renderInventory(); 
    playSfx('mine'); 
    return true; 
}

function processMining(amt) { mineProgress += amt; if (mineProgress >= 100) { mineProgress = 100; if (addMinedItem()) { mineProgress = 0; } } updateUI(); }
function gameLoop() { if(!isMiningPaused) { const miningSpeedSec = Math.max(7, 15 - (autoMineLevel * 0.2)); const tickAmt = 100 / (miningSpeedSec * 20); processMining(tickAmt); const currentMaxTime = Math.max(10000, 25000 - (autoMergeSpeedLevel * 1000)); const increment = (50 / currentMaxTime) * 100; mergeProgress += increment; if (mergeProgress >= 100) { mergeProgress = 0; autoMergeLowest(); } } if (dungeonActive && window.updateBattle) updateBattle(); updateUI(); }
function updateUI() { document.getElementById('gold-display').innerText = fNum(gold); const m = document.getElementById('mine-bar'); if(m) m.style.width=mineProgress+'%'; const g = document.getElementById('merge-bar'); if(g) g.style.width=mergeProgress+'%'; document.getElementById('pickaxe-name').innerText = TOOTH_DATA.pickaxes[pickaxeIdx].name; saveGame(); }
function renderInventory() { const grid = document.getElementById('inventory-grid'); grid.innerHTML = ''; for (let i = 0; i < 56; i++) { const slot = document.createElement('div'); slot.className = `slot ${i < 8 ? 'attack-slot' : ''} ${i >= maxSlots ? 'locked-slot' : ''}`; slot.dataset.index = i; slot.id = `slot-${i}`; if (i < maxSlots && inventory[i] > 0) { const dmg = fNum(getAtk(inventory[i])); slot.innerHTML = `<span class="dmg-label">⚔️${dmg}</span>${getToothIcon(inventory[i])}<span class="lv-text">Lv.${inventory[i]}</span>`; } else if (i >= maxSlots) slot.innerHTML = "🔒"; if (i < maxSlots) { slot.onpointerdown = (e) => { if (inventory[i] > 0) { const currentTime = new Date().getTime(); const tapLength = currentTime - lastTapTime; if (tapLength < 300 && tapLength > 0 && lastTapIdx === i) { e.preventDefault(); massMerge(inventory[i]); lastTapTime = 0; return; } lastTapTime = currentTime; lastTapIdx = i; e.preventDefault(); dragStartIdx = i; slot.classList.add('picked'); dragProxy.innerHTML = getToothIcon(inventory[i]); dragProxy.style.display = 'block'; moveProxy(e); slot.setPointerCapture(e.pointerId); } }; slot.onpointermove = (e) => { if (dragStartIdx !== null) moveProxy(e); }; slot.onpointerup = (e) => { if (dragStartIdx !== null) { slot.releasePointerCapture(e.pointerId); slot.classList.remove('picked'); dragProxy.style.display = 'none'; const elements = document.elementsFromPoint(e.clientX, e.clientY); const targetSlot = elements.find(el => el.classList.contains('slot') && el !== slot); if (targetSlot) { const toIdx = parseInt(targetSlot.dataset.index); if (toIdx < maxSlots) handleMoveOrMerge(dragStartIdx, toIdx); } document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-target')); dragStartIdx = null; } }; } grid.appendChild(slot); } }
function handleMoveOrMerge(from, to) { if (from === to) return; if (inventory[from] === inventory[to] && inventory[from] > 0) { const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; const currentGreatChance = greatChanceLevel * 0.02; const isGreat = Math.random() < currentGreatChance; const nextLv = isGreat ? inventory[from] + 2 : inventory[from] + 1; inventory[to] = nextLv; inventory[from] = 0; if(isGreat) triggerGreatSuccess(to); else playSfx('merge'); } else { [inventory[from], inventory[to]] = [inventory[to], inventory[from]]; } renderInventory(); saveGame(); }
function moveProxy(e) { dragProxy.style.left = e.clientX + 'px'; dragProxy.style.top = e.clientY + 'px'; document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-target')); const elements = document.elementsFromPoint(e.clientX, e.clientY); const targetSlot = elements.find(el => el.classList.contains('slot')); if(targetSlot && parseInt(targetSlot.dataset.index) < maxSlots) targetSlot.classList.add('drag-target'); }
function triggerGreatSuccess(idx) { playSfx('great'); const slot = document.getElementById(`slot-${idx}`); if (slot) { slot.classList.add('shiny-effect'); setTimeout(() => slot.classList.remove('shiny-effect'), 1000); } }
function updatePickaxeVisual() { const pick = TOOTH_DATA.pickaxes[pickaxeIdx]; document.getElementById('miner-char').innerText = pick.icon || "⛏️"; }
function createHitEffect(x, y) { const effect = document.createElement('div'); effect.className = 'hit-effect'; effect.innerText = "💥"; effect.style.left = x + 'px'; effect.style.top = y + 'px'; document.body.appendChild(effect); setTimeout(() => effect.remove(), 400); }
function setupMiningTouch() { const mineArea = document.getElementById('mine-rock-area'); mineArea.addEventListener('pointerdown', (e) => { e.preventDefault(); const miner = document.getElementById('miner-char'); miner.style.animation = 'none'; miner.offsetHeight; miner.style.animation = 'hammer 0.08s ease-in-out'; playSfx('mine'); processMining(15); createHitEffect(e.clientX, e.clientY); }); }

function checkCoupon() { 
    const code = document.getElementById('coupon-input').value.trim(); 
    if (code === "100b" || code === "RICH100B") { 
        gold += 100000000000; 
        alert("치트키 적용!"); updateUI(); 
    } 
    else if (code === "100f" || code === "RICH100F") {
        gold += 100000000000000000000; 
        alert("슈퍼 리치 모드!"); updateUI();
    }
    else if (code === "RESET") {
        if(confirm("정말 초기화 하시겠습니까?")) {
            isResetting = true; 
            localStorage.clear();
            location.reload();
        }
    }
    else { alert("유효하지 않은 쿠폰입니다."); } 
}

function exportSave() { saveGame(); const data = localStorage.getItem('toothSaveV660'); const encoded = btoa(unescape(encodeURIComponent(data))); prompt("코드 복사:", encoded); }
function importSave() { const str = prompt("코드 붙여넣기:"); if (str) { try { const decoded = decodeURIComponent(escape(atob(str))); localStorage.setItem('toothSaveV660', decoded); location.reload(); } catch (e) { alert("오류"); } } }

function renderDungeonList() { 
    const list = document.getElementById('dungeon-list'); 
    list.innerHTML = ''; 
    TOOTH_DATA.dungeons.forEach((name, idx) => { 
        const div = document.createElement('div'); 
        const isUnlocked = idx < unlockedDungeon; 
        div.className = `dungeon-card ${isUnlocked ? 'unlocked' : 'locked'}`; 
        
        const baseHp = Math.floor(100 * Math.pow(2.2, idx));
        const bossHp = baseHp * 30;
        const recAtk = bossHp / 40;

        if (isUnlocked) { 
            div.innerHTML = `<h4>⚔️ Lv.${idx+1} ${name}</h4><p>권장 공격력: ${fNum(recAtk)}+</p><p style="color:#f1c40f; font-size:10px;">클리어 시: Lv.${idx+2} 치아 확정 채굴</p>`; 
            div.onclick = () => startDungeon(idx); 
        } else { 
            div.innerHTML = `<h4>🔒 잠김</h4><p>이전 던전 클리어 시 열림</p>`; 
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
        
        div.innerHTML = `
            <div style="font-size:25px;">${merc.icon}</div>
            <div style="font-size:12px; font-weight:bold;">${merc.name}</div>
            <div style="font-size:10px; color:#aaa;">공격 x${merc.atkMul}</div>
            <div style="font-size:10px; color:#f55;">HP ${fNum(merc.baseHp)}</div> 
        `; 
        
        if (isEquipped) {
            div.style.border = '2px solid #2ecc71'; 
            div.innerHTML += `<button class="btn-sm" style="background:#2ecc71; color:white; cursor:default;">고용중</button>`;
        } else if (isOwned) {
            div.innerHTML += `<button onclick="equipMerc(${merc.id})" class="btn-sm" style="background:#777;">대기중</button>`; 
        } else {
            div.innerHTML += `<button onclick="buyMerc(${merc.id}, ${merc.cost})" class="btn-gold" style="padding:2px 5px; font-size:10px;">${fNum(merc.cost)}G</button>`; 
        }
        
        camp.appendChild(div); 
    }); 
}

function buyMerc(id, cost) { if(gold >= cost) { gold -= cost; playSfx('upgrade'); ownedMercenaries.push(id); renderMercenaryCamp(); updateUI(); } else { alert("골드 부족"); } }
function equipMerc(id) { mercenaryIdx = id; renderMercenaryCamp(); saveGame(); }
function toggleSound() { isMuted = !isMuted; updateSoundBtn(); saveGame(); }
function updateSoundBtn() { const btn = document.getElementById('sound-btn'); if (isMuted) { btn.innerText = "🔇 OFF"; btn.style.background = "#555"; btn.style.color = "#ccc"; } else { btn.innerText = "🔊 ON"; btn.style.background = "#f1c40f"; btn.style.color = "black"; } }
function toggleMining() { isMiningPaused = !isMiningPaused; document.getElementById('mine-toggle-btn').innerText = isMiningPaused ? "▶️ 재개" : "⏸️ 정지"; saveGame(); }
function switchView(view) { currentView = view; const battleScreen = document.getElementById('battle-screen'); if(battleScreen) battleScreen.style.display = 'none'; const gameContainer = document.getElementById('game-container'); if(gameContainer) gameContainer.style.display = 'flex'; const topNav = document.getElementById('top-nav'); if(topNav) topNav.style.display = 'grid'; document.getElementById('mine-view').style.display = (view === 'mine' || view === 'refine') ? 'flex' : 'none'; if(view === 'refine') document.getElementById('mine-view').style.display = 'none'; document.getElementById('inventory-section').style.display = view === 'mine' ? 'flex' : 'none'; document.getElementById('refine-view').style.display = view === 'refine' ? 'flex' : 'none'; document.getElementById('war-view').style.display = view === 'war' ? 'flex' : 'none'; document.getElementById('tab-mine').classList.toggle('active', view === 'mine'); document.getElementById('tab-refine').classList.toggle('active', view === 'refine'); document.getElementById('tab-war').classList.toggle('active', view === 'war'); if (view === 'war') { renderDungeonList(); renderMercenaryCamp(); } else if (view === 'refine') { renderRefineView(); } else { renderInventory(); } }
function openShop() { document.getElementById('shop-modal').style.display = 'flex'; renderShopItems(); }
function closeShop() { document.getElementById('shop-modal').style.display = 'none'; }
function manualMine() {} 
const originalPlaySfx = window.playSfx; window.playSfx = function(name) { if (isMuted) return; if (document.hidden) return; if (name === 'mine' || name === 'merge' || name === 'great') { if (currentView !== 'mine' && currentView !== 'refine') return; } if (name === 'upgrade') { if (currentView !== 'refine') return; } if (name === 'attack' || name === 'hit' || name === 'damage') { if (currentView !== 'war') return; } if (originalPlaySfx) originalPlaySfx(name); };
document.addEventListener("visibilitychange", () => { if (document.hidden) { if(audioCtx && audioCtx.state === 'running') audioCtx.suspend(); } else { if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } });
window.onload = () => { loadGame(); setupMiningTouch(); switchView('mine'); setInterval(gameLoop, 50); };
