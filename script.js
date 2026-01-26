// --- 게임 초기 설정 ---
let gold = 1000;
let ruby = 0;
let maxSlots = 24;
let inventory = new Array(32).fill(0); // 최대 32칸 공간 확보

const statusMsg = document.getElementById('status-msg');
const invGrid = document.getElementById('inventory-grid');

// --- 초기 실행 ---
function init() {
    renderInventory();
    updateStats();
}

// --- 화면 업데이트 함수 ---
function updateStats() {
    document.getElementById('gold-display').innerText = gold.toLocaleString();
    document.getElementById('ruby-display').innerText = ruby.toLocaleString();
    document.getElementById('total-slots').innerText = maxSlots;
    document.getElementById('slot-usage').innerText = inventory.filter(x => x > 0).length;
}

function renderInventory() {
    invGrid.innerHTML = '';
    // 확장 여부에 따라 클래스 변경
    invGrid.className = maxSlots === 24 ? 'grid-24' : 'grid-32';

    for (let i = 0; i < maxSlots; i++) {
        const slot = document.createElement('div');
        slot.className = `slot item-lv-${inventory[i]}`;
        slot.innerText = inventory[i] > 0 ? `Lv.${inventory[i]}` : '';
        slot.onclick = () => tryCombine(i);
        invGrid.appendChild(slot);
    }
}

// --- 기능 함수 ---

// 치아 구매
function buyTooth() {
    if (gold < 100) return alert("골드가 부족합니다!");
    
    let emptyIndex = inventory.indexOf(0);
    if (emptyIndex !== -1 && emptyIndex < maxSlots) {
        gold -= 100;
        inventory[emptyIndex] = 1;
        updateStats();
        renderInventory();
    } else {
        statusMsg.innerText = "가방이 꽉 찼습니다!";
    }
}

// 인벤토리 확장
function expandInventory() {
    if (gold >= 5000) {
        gold -= 5000;
        maxSlots = 32;
        document.getElementById('expand-btn').style.display = 'none';
        updateStats();
        renderInventory();
        statusMsg.innerText = "가방이 32칸으로 늘어났습니다!";
    } else {
        alert("확장 비용(5000G)이 부족합니다.");
    }
}

// 합성 시스템 (도박 요소 포함)
function tryCombine(index) {
    const currentLv = inventory[index];
    if (currentLv === 0 || currentLv >= 20) return;

    // 같은 레벨의 다른 치아 찾기
    const partnerIndex = inventory.findIndex((lv, idx) => idx !== index && idx < maxSlots && lv === currentLv);

    if (partnerIndex !== -1) {
        // 합성 진행
        inventory[partnerIndex] = 0; // 재료 소모
        
        // --- 확률 로직 ---
        const random = Math.random() * 100;
        let greatSuccessChance = 5; // 기본 대성공 확률 5%
        
        if (random < greatSuccessChance && currentLv <= 18) {
            // 대성공 (2단계 업)
            inventory[index] = currentLv + 2;
            statusMsg.innerText = `✨ 대성공!! Lv.${currentLv+2} 획득!`;
            statusMsg.style.color = "#ffd700";
        } else {
            // 일반 성공
            inventory[index] = currentLv + 1;
            statusMsg.innerText = `합성 성공: Lv.${currentLv+1}`;
            statusMsg.style.color = "#white";
        }

        gold += currentLv * 20; // 합성 보너스 골드
        updateStats();
        renderInventory();
    } else {
        statusMsg.innerText = `Lv.${currentLv} 치아가 하나 더 필요합니다.`;
    }
}

init();
