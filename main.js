// Version: 7.1.0 - Main Engine (Real-time 500 Rankers, Backup System & Dual Auto)

window.gold = 0; 
window.dia = 0; 
window.unlockedDungeon = 1; 
window.unlockedHellDungeon = 1; 
window.pickaxeIdx = 0;
window.autoMineLevel = 1;
window.inventory = new Array(56).fill(0);
window.maxSlots = 24; 
window.mineProgress = 0;
window.isMiningPaused = false;
window.isAutoMergeOn = true; // 🌟 신규: 자동 합성 개별 온오프
window.dragStartIdx = null;
window.mercenaryIdx = 0;
window.ownedMercenaries = [0];
window.mergeProgress = 0;
window.autoMergeSpeedLevel = 1; 
window.isMuted = false;
window.masterVolume = 2; 
window.slotUpgrades = Array.from({length: 8}, () => ({ atk: 0, cd: 0, rng: 0 }));
window.globalUpgrades = { cd: 0, rng: 0 };
window.greatChanceLevel = 0; 
window.nickname = ""; 
window.highestToothLevel = 1; 
window.trainingLevels = { hp: 0, atk: 0, spd: 0, crit: 0, splashDmg: 0, splashRange: 0 }; 
window.isHellMode = false; 
window.isBossRush = false;
window.isResetting = false;

let gameLoopInterval = null; 
let lastTapTime = 0; 
let lastTapIdx = -1;
const dragProxy = document.getElementById('drag-proxy');

// --- [ 1. 초기화 및 세이브 시스템 ] ---

window.onload = () => { 
    loadGame(); 
    setupMiningTouch(); 
    if(typeof switchView === 'function') switchView('mine'); 

    if (localStorage.getItem('toothIntroSeen_v5') === 'true') {
        const layer = document.getElementById('intro-layer');
        if(layer) layer.style.display = 'none';
        checkNicknameAndStart();
    }
};

window.saveGame = function() {
    if (window.isResetting) return; 
    const data = { 
        gold: window.gold, dia: window.dia, maxSlots: window.maxSlots, inventory: window.inventory, 
        unlockedDungeon: window.unlockedDungeon, unlockedHellDungeon: window.unlockedHellDungeon,
        pickaxeIdx: window.pickaxeIdx, autoMineLevel: window.autoMineLevel,
        mercenaryIdx: window.mercenaryIdx, ownedMercenaries: window.ownedMercenaries, 
        autoMergeSpeedLevel: window.autoMergeSpeedLevel, isMuted: window.isMuted, 
        masterVolume: window.masterVolume, slotUpgrades: window.slotUpgrades, 
        globalUpgrades: window.globalUpgrades, greatChanceLevel: window.greatChanceLevel, 
        nickname: window.nickname, highestToothLevel: window.highestToothLevel, 
        trainingLevels: window.trainingLevels, isMiningPaused: window.isMiningPaused,
        isAutoMergeOn: window.isAutoMergeOn, // 🌟 저장 항목 추가
        lastTime: Date.now()
    };
    localStorage.setItem('toothSaveV710', JSON.stringify(data));
};

window.loadGame = function() {
    try {
        const saved = localStorage.getItem('toothSaveV710') || localStorage.getItem('toothSaveV680');
        let d = saved ? JSON.parse(saved) : null;
        if (d) {
            Object.assign(window, d); // 데이터 복구
            if (d.lastTime && !window.isMiningPaused) {
                // 오프라인 보상 계산 (기존 로직 유지)
                const offTime = (Date.now() - d.lastTime) / 1000;
                const mineSpd = Math.max(1, 10 - ((window.autoMineLevel - 1) * 0.2));
                const mined = Math.floor(offTime / mineSpd);
                for(let i=0; i<mined; i++) { if(!addMinedItem()) break; }
            }
        }
        cleanupInventory();
        updateUI();
        updatePickaxeVisual();
        updateAutoStates(); // 🌟 버튼 및 다이얼 상태 초기화
    } catch (e) { console.error("Load Error", e); }
};

// 🌟 [회의 반영] 백업 코드 발급 (Export)
window.exportSave = function() {
    window.saveGame();
    const data = localStorage.getItem('toothSaveV710');
    const code = btoa(unescape(encodeURIComponent(data)));
    prompt("아래 백업 코드를 복사하여 안전한 곳에 보관하세요!", code);
};

window.importSave = function() { 
    const str = prompt("백업 코드를 붙여넣으세요:"); 
    if (str) { 
        try { 
            const decoded = decodeURIComponent(escape(atob(str))); 
            localStorage.setItem('toothSaveV710', decoded); 
            location.reload(); 
        } catch (e) { alert("유효하지 않은 코드입니다."); } 
    } 
};

// --- [ 2. 게임 루프 및 채굴/합성 ] ---

function gameLoop() { 
    // 개별 AUTO 채굴
    if(!window.isMiningPaused) { 
        const mineSpd = Math.max(1, 10 - ((window.autoMineLevel - 1) * 0.2)); 
        processMining(100 / (mineSpd * 20)); 
    } 
    
    // 개별 AUTO 합성
    if(window.isAutoMergeOn) {
        const mergeSpd = Math.max(2000, 30000 - ((window.autoMergeSpeedLevel - 1) * 500)); 
        window.mergeProgress += (50 / mergeSpd) * 100; 
        if (window.mergeProgress >= 100) { 
            window.mergeProgress = 0; 
            autoMergeLowest(); 
        } 
    }
    updateUI(); 
}

window.toggleMining = function() { 
    window.isMiningPaused = !window.isMiningPaused; 
    updateAutoStates();
    saveGame(); 
};

window.toggleAutoMerge = function() {
    window.isAutoMergeOn = !window.isAutoMergeOn;
    updateAutoStates();
    saveGame();
};

function updateAutoStates() {
    // 채굴 버튼 (너비 고정은 CSS/HTML)
    const mBtn = document.getElementById('mine-toggle-btn');
    if(mBtn) {
        mBtn.innerText = window.isMiningPaused ? "OFF" : "AUTO ON";
        mBtn.style.background = window.isMiningPaused ? "#e74c3c" : "#27ae60";
    }
    // 합성 다이얼
    const dial = document.getElementById('auto-merge-dial');
    const icon = document.getElementById('merge-dial-icon');
    if(dial && icon) {
        if(window.isAutoMergeOn) {
            dial.classList.remove('disabled-dial');
            icon.classList.add('gear-spin');
        } else {
            dial.classList.add('disabled-dial');
            icon.classList.remove('gear-spin');
        }
    }
}

// --- [ 3. 500인 리얼 랭킹 엔진 ] ---

window.generateRankings = function() {
    const list = document.getElementById('ranking-list');
    if(!list || typeof TOOTH_DATA === 'undefined') return;
    
    // 1. 가상 랭커 500명 생성 (순위별로 능력치 차등)
    let totalRanks = [];
    const botNames = TOOTH_DATA.botNames;
    
    for (let i = 1; i <= 500; i++) {
        // 순위가 높을수록(i가 작을수록) 강함
        let botPower = Math.floor(10000000 / Math.pow(i, 0.6));
        let botDungeon = Math.max(1, 21 - Math.floor(i / 25));
        let name = botNames[i % botNames.length] + (i > botNames.length ? Math.floor(i/botNames.length) : "");
        totalRanks.push({ name: name, d: botDungeon, p: botPower, isMe: false });
    }

    // 2. 나의 데이터 삽입
    let myPower = getAtk(window.highestToothLevel);
    if (TOOTH_DATA.mercenaries[window.mercenaryIdx]) myPower *= TOOTH_DATA.mercenaries[window.mercenaryIdx].atkMul;
    let myData = { name: window.nickname || "나", d: window.unlockedDungeon, p: myPower, isMe: true };
    totalRanks.push(myData);

    // 3. 전투력 기준 정렬
    totalRanks.sort((a, b) => b.p - a.p);
    
    // 4. 내 순위 찾기
    let myIdx = totalRanks.findIndex(r => r.isMe);
    let myRankNum = myIdx + 1;

    // 5. 스마트 렌더링 (Top 10 + ellipsis + 내 주변 5명)
    let html = '';
    totalRanks.forEach((r, idx) => {
        let rankNum = idx + 1;
        let isTop10 = rankNum <= 10;
        let isNearMe = Math.abs(idx - myIdx) <= 5;

        if (isTop10 || isNearMe) {
            html += `
                <div class="rank-item ${r.isMe ? 'rank-me' : ''} ${isTop10 ? 'rank-top' : ''}">
                    <span style="width:15%; font-weight:bold;">${rankNum}</span>
                    <span style="flex:1; text-align:center;">${r.name}</span>
                    <span style="width:20%; text-align:center;">Lv.${r.d}</span>
                    <span style="width:25%; text-align:right;">${fNum(r.p)}</span>
                </div>
            `;
        } else if (rankNum === 11 || (idx === myIdx + 6 && rankNum < 501)) {
            html += `<div class="rank-ellipsis">...</div>`;
        }
    });

    list.innerHTML = html;
    const rankDisp = document.getElementById('my-rank-display');
    if(rankDisp) rankDisp.innerText = `현재 나의 순위: ${myRankNum}위 (전투력: ${fNum(myPower)})`;
};

// --- [ 4. 용병 대시보드 렌더링 ] ---

window.renderMercenaryCamp = function() { 
    const dash = document.getElementById('mercenary-dashboard'); 
    if(!dash || typeof TOOTH_DATA === 'undefined') return;
    
    let curMerc = TOOTH_DATA.mercenaries[window.mercenaryIdx] || TOOTH_DATA.mercenaries[0];
    
    // 🌟 [회의 반영] 티어 6 효과 시각화
    let tier6Text = (window.highestToothLevel >= 16) 
        ? `<span style="color:#ff4757; text-shadow:0 0 5px red; font-weight:bold; margin-left:5px;">[🔥티어6 효과: x2 증폭 적용중!]</span>` 
        : "";
    
    let hpB = (window.trainingLevels.hp || 0) * 5;
    let atkB = (window.trainingLevels.atk || 0) * 10;
    
    dash.innerHTML = `
        <div style="font-size:35px; background:#222; border-radius:8px; padding:5px; border:1px solid #555;">${curMerc.icon}</div>
        <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">
            <div style="font-size:14px; font-weight:bold; color:white; margin-bottom:3px;">${curMerc.name}</div>
            <div style="font-size:11px; color:#aaa; margin-bottom:2px;">공격 배율 x${curMerc.atkMul} ${tier6Text}</div>
            <div style="font-size:10px; color:#2ecc71;">HP +${hpB}% | 공격력 +${atkB}% 훈련됨</div>
        </div>
    `;
};

// --- [ 5. 나머지 핵심 로직 (유지) ] ---

function processMining(amt) { 
    window.mineProgress += amt; 
    if (window.mineProgress >= 100) { 
        window.mineProgress = 100; 
        if (addMinedItem()) { window.mineProgress = 0; } 
    } 
}

function addMinedItem() { 
    let emptyIdx = -1; 
    for(let i=0; i<window.maxSlots; i++) { if(window.inventory[i] === 0) { emptyIdx = i; break; } } 
    if (emptyIdx === -1) return false; 
    
    let resLv = getBaseMiningLevel(); 
    if(TOOTH_DATA.pickaxes[window.pickaxeIdx] && Math.random() < TOOTH_DATA.pickaxes[window.pickaxeIdx].luck) resLv += 1;
    
    window.inventory[emptyIdx] = Math.min(24, resLv);
    checkHighestTier(resLv);
    if(getView() === 'mine') renderInventory(); 
    try { playSfx('mine'); } catch(e){}
    return true; 
}

function autoMergeLowest() { 
    let levelCounts = {}; 
    for(let i=8; i<window.maxSlots; i++) { 
        const lv = window.inventory[i]; 
        if (lv > 0 && lv < 24) levelCounts[lv] = (levelCounts[lv] || 0) + 1; 
    } 
    let targetLv = -1; 
    const levels = Object.keys(levelCounts).map(Number).sort((a,b) => a - b); 
    for (let lv of levels) { if (levelCounts[lv] >= 2) { targetLv = lv; break; } } 
    if (targetLv !== -1) massMerge(targetLv, true); 
}

function massMerge(lv, once = false) { 
    let indices = []; 
    window.inventory.forEach((val, idx) => { if(idx >= 8 && val === lv && idx < window.maxSlots) indices.push(idx); }); 
    if(indices.length < 2) return; 
    
    const loopCount = once ? 1 : Math.floor(indices.length / 2); 
    for(let i=0; i < loopCount; i++) { 
        let idx1 = indices[2*i], idx2 = indices[2*i+1]; 
        let nextLv = Math.min(24, lv + 1); 
        // 대성공 확률 (Upgrade Lab)
        if (Math.random() < (window.greatChanceLevel * 0.02)) {
            nextLv = Math.min(24, nextLv + 1);
            try { playSfx('great'); } catch(e){}
        }
        window.inventory[idx2] = nextLv; window.inventory[idx1] = 0; 
        checkHighestTier(nextLv); 
    } 
    try { playSfx('merge'); } catch(e){}
    if(getView() === 'mine') renderInventory(); 
}

function checkHighestTier(level) {
    if (level > window.highestToothLevel && level <= 24) {
        window.highestToothLevel = level;
        saveGame();
        if ((level - 1) % 3 === 0 && level > 1) {
            if(window.showTierUnlock) showTierUnlock(level);
        }
    }
}

function cleanupInventory() {
    const minLv = getBaseMiningLevel();
    let cleared = false;
    for(let i=0; i < window.maxSlots; i++) {
        if(window.inventory[i] > 0 && window.inventory[i] < minLv) {
            window.inventory[i] = 0; cleared = true;
        }
    }
    if(cleared && getView() === 'mine') renderInventory();
}

window.sortInventory = function() { 
    let items = window.inventory.filter(v => v > 0); 
    items.sort((a, b) => b - a); 
    window.inventory.fill(0); 
    items.forEach((v, i) => { if(i < 56) window.inventory[i] = v; }); 
    renderInventory(); saveGame(); 
};

function setupMiningTouch() { 
    const mineArea = document.getElementById('mine-rock-area'); 
    if(!mineArea) return;
    mineArea.addEventListener('pointerdown', (e) => { 
        e.preventDefault(); 
        const miner = document.getElementById('miner-char'); 
        miner.style.animation = 'none'; miner.offsetHeight; 
        miner.style.animation = 'hammer 0.08s ease-in-out'; 
        try { playSfx('mine'); } catch(e){}
        processMining(15 * (window.highestToothLevel >= 4 ? 1.2 : 1)); 
        updateUI(); saveGame();
    }); 
}

window.renderInventory = function() { 
    const grid = document.getElementById('inventory-grid'); 
    if(!grid) return;
    grid.innerHTML = ''; 
    for (let i = 0; i < 56; i++) { 
        const slot = document.createElement('div'); 
        slot.className = `slot ${i < 8 ? 'attack-slot' : ''} ${i >= window.maxSlots ? 'locked-slot' : ''}`; 
        slot.dataset.index = i; 
        if (i < window.maxSlots && window.inventory[i] > 0) { 
            slot.innerHTML = `<span class="dmg-label">⚔️${fNum(getAtk(window.inventory[i]))}</span>${getToothIcon(window.inventory[i])}<span class="lv-text">Lv.${window.inventory[i]}</span>`; 
        } else if (i >= window.maxSlots) { slot.innerHTML = "🔒"; }
        
        if (i < window.maxSlots) { 
            slot.onpointerdown = (e) => { 
                if (window.inventory[i] > 0) { 
                    const now = Date.now(); 
                    if (now - lastTapTime < 300 && lastTapIdx === i) { massMerge(window.inventory[i]); lastTapTime = 0; return; } 
                    lastTapTime = now; lastTapIdx = i; 
                    window.dragStartIdx = i; 
                    slot.classList.add('picked'); 
                    dragProxy.innerHTML = getToothIcon(window.inventory[i]); 
                    dragProxy.style.display = 'block'; 
                    slot.setPointerCapture(e.pointerId); 
                } 
            }; 
            slot.onpointermove = (e) => { 
                if (window.dragStartIdx !== null) {
                    dragProxy.style.left = e.clientX + 'px'; dragProxy.style.top = e.clientY + 'px'; 
                }
            }; 
            slot.onpointerup = (e) => { 
                if (window.dragStartIdx !== null) { 
                    slot.classList.remove('picked'); dragProxy.style.display = 'none'; 
                    const target = document.elementsFromPoint(e.clientX, e.clientY).find(el => el.classList.contains('slot') && el !== slot); 
                    if (target) { 
                        const to = parseInt(target.dataset.index); 
                        if (to < window.maxSlots) {
                            if (window.inventory[window.dragStartIdx] === window.inventory[to] && window.inventory[to] < 24) {
                                let nextLv = window.inventory[to] + 1;
                                window.inventory[to] = nextLv; window.inventory[window.dragStartIdx] = 0;
                                checkHighestTier(nextLv); try { playSfx('merge'); } catch(e){}
                            } else {
                                [window.inventory[window.dragStartIdx], window.inventory[to]] = [window.inventory[to], window.inventory[window.dragStartIdx]];
                            }
                            renderInventory(); saveGame();
                        }
                    } 
                    window.dragStartIdx = null; 
                } 
            }; 
        } 
        grid.appendChild(slot); 
    } 
};

function checkNicknameAndStart() {
    if (!window.nickname) document.getElementById('nickname-modal').style.display = 'flex';
    else startGameLoop();
}

window.confirmNickname = function() {
    const input = document.getElementById('nickname-input').value.trim();
    if(input) { window.nickname = input; document.getElementById('nickname-modal').style.display = 'none'; saveGame(); startGameLoop(); }
};

window.startGameLoop = startGameLoop;
