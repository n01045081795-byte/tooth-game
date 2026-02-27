// Version: 6.9.6 - UI Controllers (Rankings 500, Export Save, Nickname Change, Merc SPD)

window.currentView = 'mine';
window.currentDungeonTab = 'normal';

// --- [ 1. 메인 뷰 전환 ] ---
window.switchView = function(viewName) {
    window.currentView = viewName;
    document.getElementById('mine-view').style.display = 'none';
    document.getElementById('inventory-section').style.display = 'none';
    document.getElementById('refine-view').style.display = 'none';
    document.getElementById('war-view').style.display = 'none';
    
    document.getElementById('tab-mine').classList.remove('active');
    document.getElementById('tab-refine').classList.remove('active');
    document.getElementById('tab-war').classList.remove('active');
    
    if (viewName === 'mine') {
        document.getElementById('mine-view').style.display = 'flex';
        document.getElementById('inventory-section').style.display = 'flex';
        document.getElementById('tab-mine').classList.add('active');
        if(window.renderInventory) window.renderInventory();
    } else if (viewName === 'refine') {
        document.getElementById('refine-view').style.display = 'flex';
        document.getElementById('tab-refine').classList.add('active');
        if(window.renderRefineView) window.renderRefineView();
    } else if (viewName === 'war') {
        document.getElementById('war-view').style.display = 'flex';
        document.getElementById('tab-war').classList.add('active');
        
        if (window.unlockedDungeon > 20) {
            document.getElementById('d-tab-hell').style.display = 'inline-block';
            document.getElementById('d-tab-hellboss').style.display = 'inline-block';
        }
        
        if(window.renderMercenaryCamp) window.renderMercenaryCamp();
        window.switchDungeonTab(window.currentDungeonTab); 
    }
    
    try { if(typeof playSfx === 'function') playSfx('hit'); } catch(e){}
};

// --- [ 2. 신규 던전 탭 전환 ] ---
window.switchDungeonTab = function(tabName) {
    window.currentDungeonTab = tabName;
    
    document.querySelectorAll('.war-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('d-tab-' + tabName).classList.add('active');
    
    const bossInfo = document.getElementById('boss-rush-info');
    if(tabName === 'boss' || tabName === 'hellboss') {
        bossInfo.style.display = 'block';
    } else {
        bossInfo.style.display = 'none';
    }
    
    if(window.renderDungeonList) window.renderDungeonList();
};

// --- [ 3. 용병 캠프 및 모달 관리 (이동 속도 추가) ] ---
window.renderMercenaryCamp = function() { 
    const display = document.getElementById('current-mercenary-display');
    if(!display || typeof TOOTH_DATA === 'undefined') return;

    const curId = window.mercenaryIdx;
    const merc = TOOTH_DATA.mercenaries[curId];
    if(!merc) return;

    let bonusText = "";
    if (window.highestToothLevel >= 16) {
        bonusText = `<div style="color:#2ecc71; font-size:10px; font-weight:bold; margin-top:3px;">✨ 16치아 달성 보너스: 공격력 x2 적용 중!</div>`;
    }

    display.innerHTML = `
        <div style="font-size:40px; background:#1a1a2e; width:60px; height:60px; display:flex; align-items:center; justify-content:center; border-radius:10px; border:2px solid var(--gold);">${merc.icon}</div>
        <div style="flex:1;">
            <div style="font-size:16px; font-weight:bold; color:white;">${merc.name} <span style="font-size:12px; color:#aaa; font-weight:normal;">(Lv.${curId})</span></div>
            <div style="font-size:11px; color:#ccc; margin-top:2px;">공격 x<span style="color:var(--gold);">${merc.atkMul}</span> | 체력 <span style="color:#ff4757;">${safeFNum(merc.baseHp)}</span> | 이동속도 <span style="color:#3498db;">${merc.spd.toFixed(1)}</span></div>
            ${bonusText}
        </div>
    `;
};

window.openMercenaryModal = function() {
    const m = document.getElementById('mercenary-modal');
    if(m) { m.style.display = 'flex'; window.renderMercenaryModalList(); }
};

window.closeMercenaryModal = function() {
    const m = document.getElementById('mercenary-modal');
    if(m) m.style.display = 'none';
};

window.renderMercenaryModalList = function() {
    const list = document.getElementById('mercenary-list-modal');
    if(!list || typeof TOOTH_DATA === 'undefined') return;
    list.innerHTML = '';
    const maxOwned = Math.max(...window.ownedMercenaries);
    let tier6Text = (window.highestToothLevel >= 16) ? `<span style="color:yellow;">(x2)</span>` : "";

    TOOTH_DATA.mercenaries.forEach(merc => {
        if (merc.id > maxOwned + 1) return;
        const div = document.createElement('div');
        div.className = 'merc-card';
        const isOwned = window.ownedMercenaries.includes(merc.id);
        const isEquipped = window.mercenaryIdx === merc.id;

        div.innerHTML = `
            <div style="font-size:25px;">${merc.icon}</div>
            <div style="font-size:12px; font-weight:bold; margin:5px 0;">${merc.name}</div>
            <div style="font-size:10px; color:#aaa;">공격 x${merc.atkMul} ${tier6Text}</div>
            <div style="font-size:10px; color:#f55;">HP ${safeFNum(merc.baseHp)} <span style="color:#3498db;">| 속도 ${merc.spd.toFixed(1)}</span></div> 
        `;
        if (isEquipped) {
            div.style.border = '2px solid #2ecc71';
            div.innerHTML += `<button class="btn-sm" style="background:#2ecc71; color:white; width:100%; margin-top:5px; cursor:default;">장착중</button>`;
        } else if (isOwned) {
            div.innerHTML += `<button onclick="window.equipMerc(${merc.id})" class="btn-sm" style="background:#777; width:100%; margin-top:5px;">장착하기</button>`;
        } else {
            div.innerHTML += `<button onclick="window.buyMerc(${merc.id}, ${merc.cost})" class="btn-gold" style="padding:4px 5px; font-size:11px; width:100%; margin-top:5px;">${safeFNum(merc.cost)}G</button>`;
        }
        list.appendChild(div);
    });
};

window.buyMerc = function(id, cost) { 
    if(window.gold >= cost) { 
        window.gold -= cost; 
        try { if(typeof playSfx === 'function') playSfx('upgrade'); } catch(e){} 
        window.ownedMercenaries.push(id); 
        window.renderMercenaryModalList(); 
        if(window.renderMercenaryCamp) window.renderMercenaryCamp();
        if(window.updateUI) window.updateUI(); 
        if(window.saveGame) window.saveGame();
    } else { alert("골드가 부족합니다!"); } 
};

window.equipMerc = function(id) { 
    window.mercenaryIdx = id; 
    window.renderMercenaryModalList(); 
    if(window.renderMercenaryCamp) window.renderMercenaryCamp();
    if(window.saveGame) window.saveGame(); 
};

// --- [ 4. 던전 리스트 렌더링 ] ---
window.renderDungeonList = function() { 
    const list = document.getElementById('dungeon-list'); 
    if(!list || typeof TOOTH_DATA === 'undefined') return;
    list.innerHTML = ''; 
    
    const tab = window.currentDungeonTab || 'normal';
    const isHell = (tab === 'hell' || tab === 'hellboss');
    const isBoss = (tab === 'boss' || tab === 'hellboss');
    const currentUnlocked = isHell ? window.unlockedHellDungeon : window.unlockedDungeon;
    
    if (isBoss) {
        const rushNames = isHell ? 
            ["HELL 1~5구간", "HELL 6~10구간", "HELL 11~15구간", "HELL 16~20구간"] :
            ["일반 1~5구간", "일반 6~10구간", "일반 11~15구간", "일반 16~20구간"];
        
        rushNames.forEach((name, i) => {
            const reqLevel = (i * 5) + 6; 
            const isUnlocked = currentUnlocked >= reqLevel;
            const div = document.createElement('div'); 
            div.className = `dungeon-card ${isUnlocked ? 'unlocked' : 'locked'}`; 
            
            let goldFee = Math.floor(5000 * Math.pow(2.0, i * 5));
            let diaFee = 5 + ((i * 5) * 5);
            if (isHell) { goldFee *= 10; diaFee *= 5; }

            if (isUnlocked) {
                div.innerHTML = `<h4>🔥 ${name} 보스 토벌전</h4>
                <p style="margin:5px 0 0 0; font-size:12px; color:#ff8888;">입장료: <span style="color:var(--gold);">${safeFNum(goldFee)}G</span>, ♦️${diaFee}</p>
                <p style="color:#f1c40f; font-size:11px; margin:5px 0 0 0;">보스 5연속 처치 시 엄청난 보상!</p>`;
                div.onclick = () => { if(typeof startDungeon === 'function') startDungeon(i * 5); };
            } else {
                div.innerHTML = `<h4>🔒 잠김</h4><p style="margin:5px 0 0 0; font-size:12px; color:#888;">${isHell ? 'HELL ' : '일반 '}던전 ${reqLevel-1}단계 클리어 시 열림</p>`;
            }
            list.appendChild(div);
        });
    } else {
        const dungeonData = isHell ? TOOTH_DATA.hellDungeons : TOOTH_DATA.dungeons;
        dungeonData.forEach((name, idx) => { 
            const div = document.createElement('div'); 
            const isUnlocked = idx < currentUnlocked; 
            div.className = `dungeon-card ${isUnlocked ? 'unlocked' : 'locked'}`; 
            
            let baseHp = Math.floor(100 * Math.pow(isHell ? 2.5 : 2.2, idx));
            if (isHell) baseHp *= 50;
            const recAtk = (baseHp * 30) / 40;

            let expectedMineLv = 1;
            if (isHell) {
                let normalBase = Math.min(10, Math.floor((window.unlockedDungeon - 1) / 2) + 1);
                let expectedHellBonus = Math.floor((idx + 1) / 2);
                expectedMineLv = Math.min(24, normalBase + expectedHellBonus);
            } else {
                let hellBonus = window.unlockedHellDungeon > 1 ? Math.floor((window.unlockedHellDungeon - 1) / 2) : 0;
                let expectedNormalBase = Math.min(10, Math.floor((idx + 1) / 2) + 1);
                expectedMineLv = Math.min(24, expectedNormalBase + hellBonus);
            }
            let expectedMineName = typeof getToothName === 'function' ? getToothName(expectedMineLv) : `치아`;

            let levelUpText = ((idx + 1) % 2 === 0) ? `<p style="color:#f1c40f; font-size:11px; margin:5px 0 0 0;">✨ 클리어 시 Lv.${expectedMineLv} ${expectedMineName} 확정 채굴!</p>` : `<p style="color:#888; font-size:11px; margin:5px 0 0 0;">(다음 단계 클리어 시 채굴 레벨 상승)</p>`;

            if (isUnlocked) { 
                div.innerHTML = `<h4>⚔️ Lv.${idx+1} ${name}</h4>
                <p style="margin:5px 0 0 0; font-size:12px; color:#aaa;">권장 공격력: ${safeFNum(recAtk)}+</p>
                ${levelUpText}`;
                div.onclick = () => { if(typeof startDungeon === 'function') startDungeon(idx); };
            } else { 
                div.innerHTML = `<h4>🔒 잠김</h4><p style="margin:5px 0 0 0; font-size:12px; color:#888;">이전 던전 클리어 시 열림</p>`; 
            } 
            list.appendChild(div); 
        }); 
    }
};

window.showResultModal = function() {
    const modal = document.getElementById('dungeon-result-modal');
    if(!modal || typeof TOOTH_DATA === 'undefined') return;
    modal.style.display = 'flex';
    
    let dName = window.isHellMode ? TOOTH_DATA.hellDungeons[window.currentDungeonIdx] : TOOTH_DATA.dungeons[window.currentDungeonIdx];
    if (window.isBossRush) dName = `[토벌전] ` + dName;
    document.getElementById('result-title').innerText = `${dName} CLEAR!`;
    
    let nextStr = "모든 던전을 정복했습니다!";
    
    if (!window.isBossRush) {
        if (window.isHellMode) {
            if (window.unlockedHellDungeon <= window.currentDungeonIdx + 1 && window.currentDungeonIdx < 19) {
                window.unlockedHellDungeon = window.currentDungeonIdx + 2;
                nextStr = ((window.unlockedHellDungeon - 1) % 2 === 0) ? `다음 HELL 오픈! (채굴 레벨 상승!)` : `다음 HELL 오픈!`;
            }
        } else {
            if (window.currentDungeonIdx === 19 && window.unlockedDungeon === 20) {
                window.unlockedDungeon = 21;
                nextStr = `🔥 경고: 지옥문이 열렸습니다... 🔥`;
                
                setTimeout(() => {
                    const layer = document.getElementById('hell-video-layer');
                    const vid = document.getElementById('hell-video');
                    const skipBtn = document.getElementById('skip-hell-btn');
                    if(layer && vid) {
                        layer.style.display = 'flex';
                        vid.style.display = 'block';
                        if(skipBtn) skipBtn.style.display = 'block';
                        vid.volume = window.masterVolume ? window.masterVolume * 0.3 : 0.6;
                        vid.muted = window.isMuted;
                        vid.play().catch(e => { window.skipHellIntro(); });
                        vid.onended = () => { setTimeout(window.skipHellIntro, 500); };
                    }
                }, 1500);
            } 
            else if (window.unlockedDungeon <= window.currentDungeonIdx + 1 && window.currentDungeonIdx < 19) {
                window.unlockedDungeon = window.currentDungeonIdx + 2;
                nextStr = ((window.unlockedDungeon - 1) % 2 === 0) ? `다음 던전 오픈! (채굴 레벨 상승!)` : `다음 던전 오픈!`;
            }
        }
    }

    document.getElementById('result-desc').innerHTML = `
        <div style="margin: 15px 0; font-size:18px;">
            획득 골드: <span style="color:var(--gold); font-weight:bold;">${safeFNum(window.dungeonGoldEarned)}G</span><br>
            획득 다이아: <span style="color:#ff4757; font-weight:bold;">${window.dungeonDiaEarned}♦️</span>
        </div>
        <div style="color:#2ecc71; font-weight:bold;">${nextStr}</div>
    `;
    saveGame();
};

// 🌟 [핵심 변경] 랭킹 시스템 개편 (가상 유저 500명 생성 및 내 주변 순위 노출)
window.generateRankings = function() {
    const list = document.getElementById('ranking-list');
    if(!list || typeof TOOTH_DATA === 'undefined') return;
    
    // 500명의 기본 User-xxxx 닉네임 자동 생성 (최초 1회만)
    if (!window.fakeUsers || window.fakeUsers.length === 0) {
        window.fakeUsers = [];
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for(let i=0; i<500; i++) {
            let hash = '';
            for(let j=0; j<4; j++) hash += chars.charAt(Math.floor(Math.random()*chars.length));
            // 기하급수적으로 전투력 분배 (대부분은 낮고, 소수만 높음)
            let fakePower = Math.floor(Math.pow(Math.random(), 3) * 8000000) + 1000;
            let fakeD = Math.floor(Math.random() * 20) + 1;
            window.fakeUsers.push({ name: `User-${hash}`, d: fakeD, p: fakePower, isMe: false });
        }
    }

    let myPower = safeGetAtk(window.highestToothLevel);
    if (TOOTH_DATA.mercenaries[window.mercenaryIdx]) myPower *= TOOTH_DATA.mercenaries[window.mercenaryIdx].atkMul;
    
    let ranks = [...window.fakeUsers]; // 가상 유저 복사
    let myData = { name: window.nickname || "나", d: window.unlockedDungeon, p: myPower, isMe: true };
    ranks.push(myData);
    
    // 전투력 순으로 정렬
    ranks.sort((a, b) => b.p - a.p);
    
    let html = ''; 
    let myRankIdx = ranks.findIndex(r => r.isMe);
    let myRank = myRankIdx + 1;

    // 상위 10명 + 내 주변 5명만 필터링하여 출력
    ranks.forEach((r, idx) => {
        let isTop10 = idx < 10;
        let isNearMe = Math.abs(idx - myRankIdx) <= 5;

        // 중간 생략 점선 표시 로직
        if (idx === 10 && myRankIdx > 15) {
            html += `<div style="text-align:center; color:#555; font-size:14px; padding:5px 0;">. . . . . .</div>`;
        }

        if (isTop10 || isNearMe) {
            let rankColor = r.isMe ? 'color:var(--gold); font-weight:bold; background:rgba(241, 196, 15, 0.1);' : 'color:#ccc;';
            if (idx === 0) rankColor += 'color:#ff4757; text-shadow:0 0 5px red; font-size:14px;'; // 1위 특수효과
            
            html += `<div style="display:flex; justify-content:space-between; padding:8px 5px; border-bottom:1px solid #333; ${rankColor} border-radius:4px;">
                <span style="width:15%; text-align:center;">${idx+1}</span><span style="flex:1; text-align:center;">${r.name}</span>
                <span style="width:20%; text-align:center;">Lv.${r.d}</span><span style="width:25%; text-align:right;">${safeFNum(r.p)}</span>
            </div>`;
        }
    });
    
    list.innerHTML = html;
    const rankDisp = document.getElementById('my-rank-display');
    if(rankDisp) rankDisp.innerText = `내 순위: ${myRank}위 / ${ranks.length}명 (전투력: ${safeFNum(myPower)})`;
};

// --- [ 5. 치아 도감 ] ---
window.openCodex = function() {
    const m = document.getElementById('codex-modal');
    if(m) { m.style.display = 'flex'; renderCodex(); }
};
window.closeCodex = function() {
    const m = document.getElementById('codex-modal');
    if(m) m.style.display = 'none';
};

function renderCodex() {
    const grid = document.getElementById('codex-grid');
    if(!grid || typeof TOOTH_DATA === 'undefined') return;
    grid.innerHTML = '';
    
    let unlockedCount = 0;
    for(let i = 1; i <= 24; i++) {
        const item = document.createElement('div');
        item.className = 'codex-item';
        
        const isUnlocked = i <= window.highestToothLevel;
        if(isUnlocked) unlockedCount++;
        else item.classList.add('locked');
        
        const badge = `<div class="codex-badge">${i}</div>`;
        const iconHtml = isUnlocked ? (typeof getToothIcon === 'function' ? getToothIcon(i) : "🦷") : `<div class="codex-icon" style="color:#555;">?</div>`;
        const nameText = isUnlocked ? (typeof getToothName === 'function' ? getToothName(i) : `Lv.${i}`) : "미발견";
        
        let abilityText = "";
        if (isUnlocked) {
            const tier = Math.floor((i - 1) / 3) + 1;
            if (tier === 2) abilityText = "채굴력 1.2배 상승";
            else if (tier === 3) abilityText = "💥 광역 훈련 개방";
            else if (tier === 4) abilityText = "⚡ 치명타 훈련 개방";
            else if (tier === 5) abilityText = "♦️ 다이아 획득 2배";
            else if (tier === 6) abilityText = "⚔️ 용병 공격력 2배";
            else if (tier === 7) abilityText = "🔥 치아 공격력 10배";
            else if (tier === 8) abilityText = "👑 보상 5배 증폭";
        }

        item.innerHTML = `
            ${badge}
            ${iconHtml}
            <div class="codex-name">${nameText}</div>
            ${abilityText ? `<div class="codex-ability">${abilityText}</div>` : ""}
        `;
        grid.appendChild(item);
    }
    
    const progress = document.getElementById('codex-progress');
    if(progress) progress.innerText = `수집률: ${unlockedCount}/24`;
}
window.renderCodex = renderCodex;

// --- [ 6. 시스템 설정 및 데이터 관리 (저장 코드, 닉네임) ] ---
window.openSettings = function() {
    const m = document.getElementById('settings-modal');
    if(m) { 
        m.style.display = 'flex'; 
        // 설정 창 열릴 때 닉네임 갱신
        const nickDisp = document.getElementById('current-nickname-display');
        if(nickDisp) nickDisp.innerText = window.nickname || "설정안됨";
    }
};
window.closeSettings = function() {
    const m = document.getElementById('settings-modal');
    if(m) m.style.display = 'none';
};

window.openNicknameChange = function() {
    const m = document.getElementById('nickname-modal');
    if(m) {
        m.style.display = 'flex';
        const input = document.getElementById('nickname-input');
        if(input) input.value = window.nickname || "";
    }
};

window.exportSaveCode = function() {
    const saveData = localStorage.getItem('toothSaveV695') || localStorage.getItem('toothSaveV680');
    if (saveData) {
        try {
            // 한글 깨짐 방지를 위해 encodeURIComponent 후 base64 변환
            const encoded = btoa(encodeURIComponent(saveData));
            const textArea = document.getElementById('save-export-area');
            if (textArea) {
                textArea.style.display = 'block';
                textArea.value = encoded;
                textArea.select();
                alert("저장 코드가 발급되었습니다. 텍스트를 전체 복사하여 안전한 곳에 보관하세요.");
            }
        } catch (e) { alert("코드 생성 중 오류가 발생했습니다."); }
    } else {
        alert("저장된 데이터가 없습니다. 먼저 수동 저장을 해주세요.");
    }
};

window.promptCoupon = function() {
    // 모달 클릭 방해를 막기 위해 setTimeout으로 호출
    setTimeout(() => {
        const code = prompt("쿠폰 코드를 입력하세요:");
        if (code && typeof window.checkCoupon === 'function') {
            window.checkCoupon(code);
        }
    }, 10);
};

// --- [ 기타 기능 ] ---
window.showTierUnlock = function(level) {
    const m = document.getElementById('tier-unlock-modal');
    if(!m) return;
    try { if(typeof playSfx === 'function') playSfx('unlock'); } catch(e){}
    m.style.display = 'flex';
    document.getElementById('tier-unlock-icon').innerHTML = typeof getToothIcon === 'function' ? getToothIcon(level) : "🦷";
    document.getElementById('tier-unlock-name').innerText = typeof getToothName === 'function' ? getToothName(level) : `Lv.${level}`;
    
    let desc = "새로운 힘이 눈을 떴습니다!";
    const tier = Math.floor((level - 1) / 3) + 1;
    if (tier === 2) desc = "기본 채굴력이 1.2배 상승합니다!";
    else if (tier === 3) desc = "[광역 훈련] 슬롯이 개방되었습니다! 적들을 한 번에 쓸어버리세요!";
    else if (tier === 4) desc = "[치명타 훈련] 슬롯이 개방되었습니다! 폭발적인 데미지를 경험하세요!";
    else if (tier === 5) desc = "모든 다이아 획득량이 2배로 증가합니다!";
    else if (tier === 6) desc = "모든 용병의 기본 공격력이 2배 증폭됩니다!";
    else if (tier === 7) desc = "모든 치아의 공격력이 10배로 폭증합니다! 헬 모드를 정복하세요!";
    else if (tier === 8) desc = "던전 클리어 보상(골드/다이아)이 5배 증가합니다!";

    document.getElementById('tier-unlock-desc').innerText = desc;
};
window.closeTierUnlock = function() {
    const m = document.getElementById('tier-unlock-modal');
    if(m) m.style.display = 'none';
};

window.toggleSound = function() {
    window.isMuted = !window.isMuted;
    if(window.saveGame) window.saveGame();
    updateSoundBtn();
};
function updateSoundBtn() {
    const btn = document.getElementById('sound-toggle-btn');
    if(btn) btn.innerText = window.isMuted ? "🔇 BGM/SFX OFF" : "🔊 BGM/SFX ON";
}
window.updateSoundBtn = updateSoundBtn;

window.changeVolume = function() {
    const val = document.getElementById('volume-slider').value;
    window.masterVolume = parseInt(val);
    if(window.saveGame) window.saveGame();
    try { if(typeof playSfx === 'function') playSfx('hit'); } catch(e){}
};

window.checkReset = function() {
    if(confirm("정말로 모든 데이터를 삭제하시겠습니까? 복구할 수 없습니다!")) {
        window.isResetting = true;
        localStorage.clear(); 
        location.reload();
    }
};

window.openGuide = function() {
    const m = document.getElementById('guide-modal');
    if(m) {
        m.style.display = 'flex';
        document.getElementById('guide-scroll-content').innerHTML = `
            <div style="padding-top:10px;">
                <h3 style="color:var(--gold);">🦷 치아 연대기 가이드</h3>
                <p><strong>1. 채굴과 합성 (24단계)</strong><br>화면을 터치하거나 방치하여 치아를 얻고, 같은 레벨을 합쳐 더 강한 치아를 만드세요.<br>특정 레벨(티어)에 도달하면 강력한 특수 능력이 해방됩니다!</p>
                <p><strong>2. 보스 토벌전 & 헬 모드</strong><br>일반 던전 5단계를 넘으면 '보스 토벌전'이 열리며, 일반 던전을 20단계까지 모두 깨면 극악의 난이도를 자랑하는 'HELL 모드'가 개방됩니다.</p>
                <p><strong>3. 훈련장 (광역/치명타)</strong><br>다이아를 모아 용병 훈련장에서 특수 능력을 강화하세요. 광역(스플래시) 훈련은 적들이 뭉쳐있을 때 엄청난 위력을 발휘합니다.</p>
            </div>
        `;
    }
};
window.closeGuide = function() {
    const m = document.getElementById('guide-modal');
    if(m) m.style.display = 'none';
};

window.skipHellIntro = function() {
    const vid = document.getElementById('hell-video');
    if(vid) vid.pause();
    document.getElementById('hell-video-layer').style.display = 'none';
    
    if(window.currentView === 'war') window.switchView('war');
};
