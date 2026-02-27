// Version: 7.1.0 - UI Controllers (Enhanced Guide & Modal Management)

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
            document.querySelectorAll('.war-tab-btn.hell').forEach(b => b.style.display = 'inline-block');
        }
        if(window.renderMercenaryCamp) window.renderMercenaryCamp();
        window.switchDungeonTab(window.currentDungeonTab);
    }
    try { if(typeof playSfx === 'function') playSfx('hit'); } catch(e){}
};

// --- [ 2. 던전 탭 전환 ] ---
window.switchDungeonTab = function(tabName) {
    window.currentDungeonTab = tabName;
    document.querySelectorAll('.war-tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetTab = document.getElementById('d-tab-' + tabName);
    if(targetTab) targetTab.classList.add('active');
    
    const bossInfo = document.getElementById('boss-rush-info');
    if(bossInfo) bossInfo.style.display = (tabName === 'boss' || tabName === 'hellboss') ? 'block' : 'none';
    
    if(window.renderDungeonList) window.renderDungeonList();
};

// --- [ 3. 치아 도감 (24단계) ] ---
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
    if(!grid) return;
    grid.innerHTML = '';
    let unlockedCount = 0;
    for(let i = 1; i <= 24; i++) {
        const item = document.createElement('div');
        item.className = 'codex-item';
        const isUnlocked = i <= window.highestToothLevel;
        if(isUnlocked) unlockedCount++;
        else item.classList.add('locked');
        
        const badge = `<div class="codex-badge">${i}</div>`;
        const iconHtml = isUnlocked ? getToothIcon(i) : `<div class="codex-icon" style="color:#555;">?</div>`;
        const nameText = isUnlocked ? getToothName(i) : "미발견";
        
        let ability = "";
        if (isUnlocked) {
            const tier = Math.floor((i - 1) / 3) + 1;
            if (tier === 2) ability = "채굴력 1.2배";
            else if (tier === 3) ability = "💥 광역훈련 개방";
            else if (tier === 4) ability = "⚡ 크리티컬 개방";
            else if (tier === 5) ability = "♦️ 다이아 2배";
            else if (tier === 6) ability = "⚔️ 용병뎀 2배";
            else if (tier === 7) ability = "🔥 치아뎀 10배";
            else if (tier === 8) ability = "👑 보상 5배";
        }

        item.innerHTML = `${badge}${iconHtml}<div class="codex-name">${nameText}</div>${ability ? `<div class="codex-ability">${ability}</div>` : ""}`;
        grid.appendChild(item);
    }
    const progress = document.getElementById('codex-progress');
    if(progress) progress.innerText = `수집률: ${unlockedCount}/24`;
}

// --- [ 4. 게임 가이드 (개편된 내용) ] ---
window.openGuide = function() {
    const m = document.getElementById('guide-modal');
    if(m) {
        m.style.display = 'flex';
        document.getElementById('guide-scroll-content').innerHTML = `
            <div style="padding-top:10px;">
                <h3 style="color:var(--gold); border-bottom:1px solid #444; padding-bottom:5px;">🎮 게임 조작법 (필독)</h3>
                <p><strong>화면 중앙의 거대한 치아를 터치하세요!</strong> 터치할 때마다 채굴 게이지가 상승하며 치아를 획득합니다.</p>
                <div style="background:rgba(241,196,15,0.1); border:1px solid var(--gold); padding:10px; border-radius:8px; margin:10px 0;">
                    <strong style="color:var(--gold);">💡 초고속 채굴 팁:</strong><br>
                    여러 손가락을 사용해 동시에 화면을 다다닥! 터치(멀티 터치)해보세요. 손가락 수만큼 채굴 속도가 폭발적으로 빨라집니다!
                </div>
                
                <h3 style="color:var(--gold); border-bottom:1px solid #444; padding-bottom:5px; margin-top:20px;">🔄 합성 및 성장</h3>
                <p>같은 레벨의 치아를 드래그하여 합치면 다음 레벨로 진화합니다. 총 24단계의 치아가 존재하며, 특정 단계마다 특수 능력이 해제됩니다.</p>
                
                <h3 style="color:var(--gold); border-bottom:1px solid #444; padding-bottom:5px; margin-top:20px;">⚔️ 던전 및 용병</h3>
                <p>가장 윗줄 8칸에 배치된 치아들이 던전에서 공격을 수행합니다. 용병을 고용하고 훈련소에서 능력치를 강화하여 더 깊은 던전을 정복하세요.</p>
            </div>
        `;
    }
};
window.closeGuide = function() { document.getElementById('guide-modal').style.display = 'none'; };

// --- [ 5. 기타 모달 제어 ] ---
window.openRanking = function() {
    document.getElementById('ranking-modal').style.display = 'flex';
    if(window.generateRankings) window.generateRankings();
};
window.closeRanking = function() { document.getElementById('ranking-modal').style.display = 'none'; };

window.openSettings = function() { document.getElementById('settings-modal').style.display = 'flex'; };
window.closeSettings = function() { document.getElementById('settings-modal').style.display = 'none'; };

window.openMercenaryModal = function() {
    document.getElementById('mercenary-modal').style.display = 'flex';
    if(window.renderMercenaryModalList) window.renderMercenaryModalList();
};
window.closeMercenaryModal = function() { document.getElementById('mercenary-modal').style.display = 'none'; };

window.showTierUnlock = function(level) {
    const m = document.getElementById('tier-unlock-modal');
    if(!m) return;
    try { playSfx('unlock'); } catch(e){}
    m.style.display = 'flex';
    document.getElementById('tier-unlock-icon').innerHTML = getToothIcon(level);
    document.getElementById('tier-unlock-name').innerText = getToothName(level);
    
    const tier = Math.floor((level - 1) / 3) + 1;
    let desc = "새로운 힘이 해방되었습니다!";
    if (tier === 2) desc = "기본 채굴력이 1.2배 상승합니다!";
    else if (tier === 6) desc = "모든 용병의 공격력이 2배 증폭됩니다!";
    else if (tier === 7) desc = "치아 공격력이 10배 폭증합니다!";
    document.getElementById('tier-unlock-desc').innerText = desc;
};
window.closeTierUnlock = function() { document.getElementById('tier-unlock-modal').style.display = 'none'; };

window.toggleSound = function() {
    window.isMuted = !window.isMuted;
    const btn = document.getElementById('sound-toggle-btn');
    if(btn) btn.innerText = window.isMuted ? "🔇 BGM/SFX OFF" : "🔊 BGM/SFX ON";
    saveGame();
};

window.changeVolume = function() {
    window.masterVolume = parseInt(document.getElementById('volume-slider').value);
    saveGame();
    try { playSfx('hit'); } catch(e){}
};

window.checkReset = function() {
    if(confirm("모든 데이터를 초기화하시겠습니까?")) {
        window.isResetting = true;
        localStorage.clear();
        location.reload();
    }
};
