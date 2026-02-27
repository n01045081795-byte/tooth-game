// Version: 7.1.0 - Upgrade Systems (Shop, Refine & Training Camp)

const MAX_AUTO_MINE_LV = 40;
const MAX_AUTO_MERGE_LV = 15;
const MAX_GREAT_LV = 25; 
const MAX_GLOBAL_CD = 45; 
const MAX_GLOBAL_RNG = 50; 

// --- [ 1. Upgrade Lab (골드 상점) ] ---
window.renderShopItems = function() {
    const content = document.getElementById('shop-content');
    if(!content) return;
    
    content.style.padding = "0"; 
    let expansionCount = (window.maxSlots - 24) / 8;
    
    let html = `
        <div class="sticky-header">
            <h2 style="color:var(--gold); margin:0; font-size:18px;">💰 Upgrade Lab</h2>
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:12px; color:#fff;">보유: <span style="color:var(--gold); font-weight:bold;">${safeFNum(window.gold)}G</span></span>
                <button onclick="closeShop()" style="background:none; border:none; color:#e74c3c; font-size:24px; font-weight:bold; cursor:pointer; padding:0;">✕</button>
            </div>
        </div>
        <div class="modal-content-area shop-grid">
    `;

    const pick = TOOTH_DATA.pickaxes[window.pickaxeIdx];
    const pickNext = TOOTH_DATA.pickaxes[window.pickaxeIdx + 1];
    if (pickNext) {
        html += `<div class="shop-item"><div class="shop-info"><span>⚒️ 곡괭이 업그레이드</span> <button onclick="buyItem('pick', ${pickNext.cost})" class="btn-gold">💰 ${safeFNum(pickNext.cost)}</button></div><div class="shop-desc">채굴 시 +1레벨 더 높은 치아를 발견할 확률을 높입니다.<br><span style="color:#2ecc71;">Lv+1 확률: ${Math.round(pick.luck*100)}% ➔ ${Math.round(pickNext.luck*100)}%</span></div></div>`;
    } else {
        html += `<div class="shop-item"><div class="shop-info"><span>⚒️ 곡괭이 업그레이드 (MAX)</span> <button class="btn-max">MAX</button></div><div class="shop-desc">최고 등급의 곡괭이입니다.<br><span style="color:#2ecc71;">Lv+1 확률: ${Math.round(pick.luck*100)}% (최대)</span></div></div>`;
    }

    const curGreat = window.greatChanceLevel * 2; 
    if (window.greatChanceLevel < MAX_GREAT_LV) {
        const amuletCost = Math.floor(5000 * Math.pow(1.5, window.greatChanceLevel));
        html += `<div class="shop-item"><div class="shop-info"><span>🍀 합성 대성공 확률업 (Lv.${window.greatChanceLevel})</span> <button onclick="buyItem('amulet', ${amuletCost})" class="btn-gold">💰 ${safeFNum(amuletCost)}</button></div><div class="shop-desc">치아 합성 시 2단계가 상승하는 대성공 확률을 증가시킵니다.<br><span style="color:#2ecc71;">대성공 확률: ${curGreat}% ➔ ${curGreat+2}%</span></div></div>`;
    } else {
        html += `<div class="shop-item"><div class="shop-info"><span>🍀 합성 대성공 확률업 (MAX)</span> <button class="btn-max">MAX</button></div><div class="shop-desc">대성공 확률을 한계까지 끌어올렸습니다.<br><span style="color:#2ecc71;">대성공 확률: ${curGreat}% (최대)</span></div></div>`;
    }
    
    const curSpd = Math.max(1, 10 - ((window.autoMineLevel-1) * 0.2)).toFixed(1);
    if (window.autoMineLevel < MAX_AUTO_MINE_LV) {
        const autoCost = Math.floor(500 * Math.pow(1.4, window.autoMineLevel - 1));
        const nextSpd = Math.max(1, 10 - (window.autoMineLevel * 0.2)).toFixed(1);
        html += `<div class="shop-item"><div class="shop-info"><span>🤖 자동채굴 속도업 (Lv.${window.autoMineLevel})</span> <button onclick="buyItem('auto', ${autoCost})" class="btn-gold">💰 ${safeFNum(autoCost)}</button></div><div class="shop-desc">방치형 오프라인 상태에서도 치아가 쌓이는 주기를 단축합니다.<br><span style="color:#2ecc71;">채굴 속도: ${curSpd}초 ➔ ${nextSpd}초</span></div></div>`;
    } else {
        html += `<div class="shop-item"><div class="shop-info"><span>🤖 자동채굴 속도업 (MAX)</span> <button class="btn-max">MAX</button></div><div class="shop-desc">채굴 속도가 극한에 달했습니다.<br><span style="color:#2ecc71;">채굴 속도: ${curSpd}초 (최대 효율)</span></div></div>`;
    }
    
    const curMerge = Math.max(2, 30 - ((window.autoMergeSpeedLevel-1) * 0.5)).toFixed(1);
    if (window.autoMergeSpeedLevel < MAX_AUTO_MERGE_LV) {
        const mergeCost = Math.floor(1000 * Math.pow(1.6, window.autoMergeSpeedLevel - 1));
        const nextMerge = Math.max(2, 30 - (window.autoMergeSpeedLevel * 0.5)).toFixed(1);
        html += `<div class="shop-item"><div class="shop-info"><span>⚡ 자동합성 속도업 (Lv.${window.autoMergeSpeedLevel})</span> <button onclick="buyItem('merge', ${mergeCost})" class="btn-gold">💰 ${safeFNum(mergeCost)}</button></div><div class="shop-desc">자동 병합 대기 시간을 줄입니다.<br><span style="color:#2ecc71;">합성 주기: ${curMerge}초 ➔ ${nextMerge}초</span></div></div>`;
    } else {
        html += `<div class="shop-item"><div class="shop-info"><span>⚡ 자동합성 속도업 (MAX)</span> <button class="btn-max">MAX</button></div><div class="shop-desc">자동 합성 시스템이 최대 속도로 가동 중입니다.</div></div>`;
    }
    
    if (expansionCount < 4) {
        const expCost = TOOTH_DATA.invExpansion[expansionCount];
        html += `<div class="shop-item"><div class="shop-info"><span>🎒 인벤토리 확장 (${expansionCount+1}/4)</span> <button onclick="buyItem('exp', ${expCost})" class="btn-gold">💰 ${safeFNum(expCost)}</button></div><div class="shop-desc">치아를 보관할 수 있는 슬롯을 8칸 추가로 개방합니다. (최대 56칸)</div></div>`;
    } else {
        html += `<div class="shop-item"><div class="shop-info"><span>🎒 인벤토리 확장 (MAX)</span> <button class="btn-max">MAX</button></div><div class="shop-desc">모든 인벤토리 슬롯이 개방되었습니다.</div></div>`;
    }
    
    html += `</div>`;
    content.innerHTML = html;
};

window.buyItem = function(type, cost) {
    if (window.gold >= cost) {
        window.gold -= cost;
        try { playSfx('upgrade'); } catch(e){}
        if (type === 'pick') { window.pickaxeIdx++; cleanupInventory(); updatePickaxeVisual(); } 
        else if (type === 'amulet') window.greatChanceLevel++;
        else if (type === 'auto') window.autoMineLevel++;
        else if (type === 'merge') window.autoMergeSpeedLevel++;
        else if (type === 'exp') window.maxSlots += 8;
        
        renderShopItems(); 
        renderInventory(); 
        updateUI();
        saveGame();
    } else { alert("골드가 부족합니다!"); }
};

window.openShop = function() { 
    const m = document.getElementById('shop-modal');
    if(m) { m.style.display = 'flex'; renderShopItems(); }
};
window.closeShop = function() { document.getElementById('shop-modal').style.display = 'none'; };

// --- [ 2. Top 8 제련소 ] ---
window.renderRefineView = function() {
    const grid = document.getElementById('refine-grid');
    if (!grid) return;
    
    const costGlobalCdGold = Math.floor(5000 * Math.pow(1.8, window.globalUpgrades.cd));
    const costGlobalCdDia = Math.floor(5 * Math.pow(1.2, window.globalUpgrades.cd));
    const costGlobalRngGold = Math.floor(3000 * Math.pow(1.8, window.globalUpgrades.rng));
    const costGlobalRngDia = Math.floor(3 * Math.pow(1.2, window.globalUpgrades.rng));
    
    const curCdReduc = Math.min(90, window.globalUpgrades.cd * 2);
    const nextCdReduc = Math.min(90, (window.globalUpgrades.cd + 1) * 2);
    
    const isCdMax = window.globalUpgrades.cd >= MAX_GLOBAL_CD;
    const isRngMax = window.globalUpgrades.rng >= MAX_GLOBAL_RNG;

    let html = `
    <div style="grid-column: 1 / -1; background: #222; padding: 15px; border-radius: 8px; border: 2px solid var(--gold); margin-bottom: 5px;">
        <h4 style="margin:0 0 10px 0; color:var(--gold); text-align:center;">🌍 전체 슬롯 동시 강화 (♦️ 필요)</h4>
        <div style="display:flex; gap:10px;">
            ${isCdMax ? 
                `<button class="btn-max" style="flex:1; height:70px;">⏳ 쿨타임 (MAX)<br>-90%</button>` : 
                `<button onclick="upgradeGlobal('cd', ${costGlobalCdGold}, ${costGlobalCdDia})" class="btn-sm" style="flex:1; height:70px; background:#34495e;">⏳ 쿨타임 Lv.${window.globalUpgrades.cd}<br><span style="color:#2ecc71;">-${curCdReduc}% ➔ -${nextCdReduc}%</span><br>💰${safeFNum(costGlobalCdGold)} ♦️${costGlobalCdDia}</button>`
            }
            ${isRngMax ?
                `<button class="btn-max" style="flex:1; height:70px;">🏹 사거리 (MAX)<br>Lv.50</button>` :
                `<button onclick="upgradeGlobal('rng', ${costGlobalRngGold}, ${costGlobalRngDia})" class="btn-sm" style="flex:1; height:70px; background:#34495e;">🏹 사거리 Lv.${window.globalUpgrades.rng}<br><span style="color:#2ecc71;">Lv.${window.globalUpgrades.rng} ➔ Lv.${window.globalUpgrades.rng+1}</span><br>💰${safeFNum(costGlobalRngGold)} ♦️${costGlobalRngDia}</button>`
            }
        </div>
    </div>
    `;
    
    window.slotUpgrades.forEach((slot, idx) => {
        const isLocked = idx >= window.unlockedDungeon;
        if (isLocked) {
            html += `<div class="refine-card locked-refine" style="opacity:0.5; filter:grayscale(1);"><div class="refine-header">🔒 슬롯 #${idx+1}</div><button class="refine-btn" style="height:100%; cursor:default;"><span>🔒 잠김</span></button></div>`;
        } else {
            const costAtk = Math.floor(1000 * Math.pow(1.3, slot.atk));
            const curAtk = (1 + slot.atk * 0.1).toFixed(1);
            const nextAtk = (1 + (slot.atk+1) * 0.1).toFixed(1);
            html += `<div class="refine-card"><div class="refine-header">🔥 슬롯 #${idx+1}</div><button class="refine-btn" onclick="upgradeSlot(${idx}, 'atk', ${costAtk})" style="height:100%; background:#333; border:none; color:white; padding:10px; border-radius:4px;"><span>⚔️ 공격력 증폭 Lv.${slot.atk}</span><br><span style="color:#2ecc71;">x${curAtk} ➔ x${nextAtk}</span><br><span style="color:var(--gold);">💰 ${safeFNum(costAtk)}</span></button></div>`;
        }
    });
    grid.innerHTML = html;
};

window.upgradeGlobal = function(type, costGold, costDia) {
    if (window.gold >= costGold && window.dia >= costDia) {
        window.gold -= costGold; window.dia -= costDia;
        window.globalUpgrades[type]++;
        try { playSfx('upgrade'); } catch(e){}
        renderRefineView();
        updateUI(); saveGame();
    } else { alert("골드 또는 다이아가 부족합니다!"); }
};

window.upgradeSlot = function(idx, type, cost) {
    if (window.gold >= cost) {
        window.gold -= cost; window.slotUpgrades[idx][type]++;
        try { playSfx('upgrade'); } catch(e){}
        renderRefineView();
        updateUI(); saveGame();
    } else { alert("골드가 부족합니다!"); }
};

// --- [ 3. 용병 훈련장 ] ---
window.openTrainingCamp = function() {
    const m = document.getElementById('training-modal');
    if(m) { m.style.display = 'flex'; renderTrainingList(); }
};
window.closeTrainingCamp = function() { document.getElementById('training-modal').style.display = 'none'; };

window.renderTrainingList = function() {
    const list = document.getElementById('training-list');
    if(!list) return;
    
    const curHp = window.trainingLevels.hp || 0;
    const curAtk = window.trainingLevels.atk || 0;
    const curSpd = window.trainingLevels.spd || 0;
    const curCrit = window.trainingLevels.crit || 0;
    const curSplashDmg = window.trainingLevels.splashDmg || 0;
    const curSplashRange = window.trainingLevels.splashRange || 0;
    
    const costHp = 10 + Math.floor(curHp * 5);
    const costAtk = 20 + Math.floor(curAtk * 8);
    const costSpd = 50 + Math.floor(curSpd * 15);
    const costCrit = 100 + Math.floor(curCrit * 25);
    const costSplashDmg = 80 + Math.floor(curSplashDmg * 20);
    const costSplashRange = 80 + Math.floor(curSplashRange * 20);
    
    const diaDisp = document.getElementById('training-dia-display');
    if(diaDisp) diaDisp.innerText = safeFNum(window.dia);

    let html = `<div class="shop-grid">
        <div class="shop-item"><div class="shop-info"><span>❤️ 생존 훈련 (체력 +5%)</span> <button onclick="upgradeTraining('hp', ${costHp})" class="btn-sm" style="background:#ff4757;">♦️ ${costHp}</button></div><div class="shop-desc">현재 보너스: +${curHp * 5}%</div></div>
        <div class="shop-item"><div class="shop-info"><span>⚔️ 파괴 훈련 (공격 +10%)</span> <button onclick="upgradeTraining('atk', ${costAtk})" class="btn-sm" style="background:#ff4757;">♦️ ${costAtk}</button></div><div class="shop-desc">현재 보너스: +${curAtk * 10}%</div></div>
        <div class="shop-item"><div class="shop-info"><span>💨 신속 훈련 (속도 +0.1)</span> ${curSpd >= 15 ? '<button class="btn-max">MAX</button>' : `<button onclick="upgradeTraining('spd', ${costSpd})" class="btn-sm" style="background:#ff4757;">♦️ ${costSpd}</button>`}</div><div class="shop-desc">현재 보너스: +${(curSpd * 0.1).toFixed(1)}</div></div>
    `;

    if (window.highestToothLevel >= 7) {
        const splashRatio = Math.min(80, 20 + (curSplashDmg * 5)); 
        html += `<div class="shop-item" style="border-color:#3498db;"><div class="shop-info"><span style="color:#3498db;">💥 파편 훈련 (광역 피해)</span> ${splashRatio >= 80 ? '<button class="btn-max">MAX</button>' : `<button onclick="upgradeTraining('splashDmg', ${costSplashDmg})" class="btn-sm" style="background:#ff4757;">♦️ ${costSplashDmg}</button>`}</div><div class="shop-desc">광역 피해량: 본무기의 ${splashRatio}%</div></div>
        <div class="shop-item" style="border-color:#3498db;"><div class="shop-info"><span style="color:#3498db;">💣 화약 훈련 (범위 증가)</span> <button onclick="upgradeTraining('splashRange', ${costSplashRange})" class="btn-sm" style="background:#ff4757;">♦️ ${costSplashRange}</button></div><div class="shop-desc">폭발 반경: ${50 + (curSplashRange * 10)}px</div></div>`;
    }

    if (window.highestToothLevel >= 10) {
        html += `<div class="shop-item" style="border-color:var(--gold);"><div class="shop-info"><span style="color:var(--gold);">⚡ 약점 훈련 (치명타)</span> <button onclick="upgradeTraining('crit', ${costCrit})" class="btn-sm" style="background:#ff4757;">♦️ ${costCrit}</button></div><div class="shop-desc">확률: ${5 + (curCrit * 2)}% / 데미지: x${(2.0 + (curCrit * 0.2)).toFixed(1)}</div></div>`;
    }

    html += `</div>`;
    list.innerHTML = html;
};

window.upgradeTraining = function(stat, costDia) {
    if (window.dia >= costDia) {
        window.dia -= costDia; 
        window.trainingLevels[stat] = (window.trainingLevels[stat] || 0) + 1;
        try { playSfx('upgrade'); } catch(e){}
        renderTrainingList();
        updateUI(); saveGame();
    } else { alert("다이아가 부족합니다!"); }
};
