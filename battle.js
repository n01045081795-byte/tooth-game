// Version: 7.5.1 - Battle Physics & Joystick (60FPS Fixed for VRR Devices)

window.playerX = 1000;
window.playerY = 1000;
window.moveX = 0;
window.moveY = 0;
window.baseSpeed = 2.5; // 원장님이 맞추신 황금 밸런스 속도 보존
window.isInvincible = false;
window.playerHp = 100;
window.playerMaxHp = 100;

let joystickActive = false;
let originX = 0;
let originY = 0;
let battleLoopId = null;

// --- [ 🌟 프레임 고정 변수 추가 ] ---
let lastBattleTime = performance.now();
const fpsInterval = 1000 / 60; // 60 FPS 고정 (초당 60회 연산)

window.renderBattleSlots = function() {
    const slots = document.getElementById('war-weapon-slots');
    if(!slots) return;
    slots.innerHTML = '';
    
    for(let i=0; i<8; i++) {
        const lv = window.inventory[i];
        const div = document.createElement('div');
        div.className = 'war-slot';
        div.id = `war-slot-${i}`;
        if(lv > 0) {
            div.innerHTML = `<span style="font-size:20px;">${typeof getToothIcon === 'function' ? getToothIcon(lv) : "🦷"}</span><div class="cd-overlay"></div>`;
        } else {
            div.innerHTML = `<div class="cd-overlay"></div>`;
        }
        slots.appendChild(div);
    }
    
    // 🌟 용병 스탯 + 훈련장 보너스를 반영한 최대 체력 및 속도 세팅
    let hpBonus = (window.trainingLevels && window.trainingLevels.hp) ? window.trainingLevels.hp * 0.05 : 0;
    let base = (typeof TOOTH_DATA !== 'undefined' && TOOTH_DATA.mercenaries[window.mercenaryIdx]) ? TOOTH_DATA.mercenaries[window.mercenaryIdx].baseHp : 100;
    window.playerMaxHp = base * (1 + hpBonus);
    window.playerHp = window.playerMaxHp;
    
    let pSpd = (typeof TOOTH_DATA !== 'undefined' && TOOTH_DATA.mercenaries[window.mercenaryIdx]) ? TOOTH_DATA.mercenaries[window.mercenaryIdx].spd : 1.0;
    let spdBonus = (window.trainingLevels && window.trainingLevels.spd) ? window.trainingLevels.spd * 0.1 : 0;
    window.currentPlayerSpeed = window.baseSpeed * pSpd * (1 + spdBonus);

    if (!battleLoopId) {
        lastBattleTime = performance.now(); // 루프 시작 시 시간 초기화
        battleLoop();
    }
};

// --- [ 🌟 60FPS 고정 전투 루프 (VRR 가속 방지) ] ---
function battleLoop(timestamp) {
    battleLoopId = requestAnimationFrame(battleLoop);

    if (!timestamp) timestamp = performance.now();
    let elapsed = timestamp - lastBattleTime;

    if (elapsed >= fpsInterval) {
        lastBattleTime = timestamp - (elapsed % fpsInterval);

        if (window.dungeonActive && !window.bossDead) {
            updatePlayerPosition();
            if(typeof window.updateCombat === 'function') window.updateCombat();
        }
    }
}

function updatePlayerPosition() {
    if (!window.dungeonActive || window.bossDead) return;
    
    window.playerX += window.moveX * window.currentPlayerSpeed;
    window.playerY += window.moveY * window.currentPlayerSpeed;

    // 맵 밖으로 나가지 못하게 제한
    window.playerX = Math.max(20, Math.min(window.worldWidth - 20, window.playerX));
    window.playerY = Math.max(20, Math.min(window.worldHeight - 20, window.playerY));

    const p = document.getElementById('player');
    if(p) {
        p.style.left = window.playerX + 'px';
        p.style.top = window.playerY + 'px';
        
        // 🌟 카메라가 플레이어를 자연스럽게 따라가도록 처리
        const cam = document.getElementById('battle-camera');
        const world = document.getElementById('battle-world');
        if (cam && world) {
            const cw = cam.clientWidth;
            const ch = cam.clientHeight;
            let cx = window.playerX - cw/2;
            let cy = window.playerY - ch/2;
            
            // 카메라가 맵 경계를 넘어가지 않게 제한
            cx = Math.max(0, Math.min(window.worldWidth - cw, cx));
            cy = Math.max(0, Math.min(window.worldHeight - ch, cy));
            world.style.transform = `translate(${-cx}px, ${-cy}px)`;
        }
    }
}

window.takeDamage = function(amount) {
    if(window.isInvincible || window.bossDead || !window.dungeonActive) return;
    
    window.playerHp -= amount;
    try { if(typeof playSfx === 'function') playSfx('damage'); } catch(e){}
    
    const fill = document.getElementById('player-hp-bar-fill');
    if(fill) fill.style.width = Math.max(0, (window.playerHp / window.playerMaxHp * 100)) + '%';
    
    if(typeof showDmgText === 'function') window.showDmgText(window.playerX, window.playerY, amount);
    
    const p = document.getElementById('player');
    if(p) {
        p.classList.add('invincible');
        window.isInvincible = true;
        // 무적 시간 1초 부여
        setTimeout(() => {
            if(p) p.classList.remove('invincible');
            window.isInvincible = false;
        }, 1000);
    }
    
    // 피격 시 화면 전체가 붉게 깜빡이는 효과 (레트로 느낌)
    const scr = document.getElementById('battle-screen');
    if(scr) {
        let oldBg = scr.style.background;
        scr.style.background = 'rgba(255,0,0,0.3)';
        setTimeout(() => scr.style.background = oldBg, 150);
    }

    // 사망 처리
    if(window.playerHp <= 0) {
        window.dungeonActive = false;
        window.bossDead = true;
        setTimeout(() => {
            alert("☠️ 전멸했습니다... 던전에서 후퇴합니다.");
            if(typeof window.exitDungeon === 'function') window.exitDungeon();
        }, 500);
    }
};

// --- [ 모바일 터치 조이스틱 로직 ] ---
const zone = document.getElementById('joystick-zone');
const knob = document.getElementById('joystick-knob');

if(zone && knob) {
    zone.addEventListener('pointerdown', (e) => {
        joystickActive = true;
        const rect = zone.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
        updateJoystick(e.clientX, e.clientY);
        zone.setPointerCapture(e.pointerId);
    });

    zone.addEventListener('pointermove', (e) => {
        if(!joystickActive) return;
        updateJoystick(e.clientX, e.clientY);
    });

    zone.addEventListener('pointerup', (e) => {
        joystickActive = false;
        knob.style.transform = `translate(-50%, -50%)`;
        window.moveX = 0;
        window.moveY = 0;
        zone.releasePointerCapture(e.pointerId);
    });
    
    zone.addEventListener('pointercancel', (e) => {
        joystickActive = false;
        knob.style.transform = `translate(-50%, -50%)`;
        window.moveX = 0;
        window.moveY = 0;
    });

    function updateJoystick(cx, cy) {
        let dx = cx - originX;
        let dy = cy - originY;
        const dist = Math.hypot(dx, dy);
        const maxDist = 40; // 조이스틱 노브가 나갈 수 있는 최대 거리
        
        if(dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }
        
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        
        if(dist > 0) {
            window.moveX = dx / maxDist;
            window.moveY = dy / maxDist;
        } else {
            window.moveX = 0;
            window.moveY = 0;
        }
    }
}

// --- [ PC 테스트용 키보드(WASD/방향키) 로직 복구! ] ---
window.addEventListener('keydown', (e) => {
    if (!window.dungeonActive) return;
    if(e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') window.moveY = -1;
    if(e.key === 'ArrowDown' || e.key.toLowerCase() === 's') window.moveY = 1;
    if(e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') window.moveX = -1;
    if(e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') window.moveX = 1;
});

window.addEventListener('keyup', (e) => {
    if (!window.dungeonActive) return;
    if(['ArrowUp', 'w', 'W', 'ArrowDown', 's', 'S'].includes(e.key)) window.moveY = 0;
    if(['ArrowLeft', 'a', 'A', 'ArrowRight', 'd', 'D'].includes(e.key)) window.moveX = 0;
});
