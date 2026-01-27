// Version: 2.1.0 - Data & Mercenaries & Cheats
const TOOTH_DATA = {
    icons: ["🦷", "🦴", "💎", "✨", "🔥", "🧊", "⚡", "🌈", "🔱", "🌑", "☀️", "🔮", "🧿", "💠", "🏵️", "🍀", "🍃", "🎃", "🥊", "⚔️", "🏹", "🛡️", "🧬", "🧪", "🦾", "📡", "🛸", "🪐", "🌟", "🌌", "🌋", "🐲", "👾", "🤖", "🤡", "👹", "👑", "💎", "🦷", "💠"],
    pickaxes: [
        { name: "허름한 나무 곡괭이", cost: 0, power: 10, mineLv: 1, greatChance: 0.01 },
        { name: "무딘 구리 곡괭이", cost: 1000, power: 18, mineLv: 1, greatChance: 0.03 },
        { name: "튼튼한 철 곡괭이", cost: 5000, power: 28, mineLv: 2, greatChance: 0.05 },
        { name: "연마된 강철 곡괭이", cost: 25000, power: 45, mineLv: 2, greatChance: 0.08 },
        { name: "빛나는 황금 곡괭이", cost: 100000, power: 70, mineLv: 2, greatChance: 0.12 },
        { name: "고강도 티타늄 곡괭이", cost: 500000, power: 110, mineLv: 3, greatChance: 0.15 },
        { name: "영롱한 다이아 곡괭이", cost: 2000000, power: 180, mineLv: 3, greatChance: 0.20 },
        { name: "카본 초합금 곡괭이", cost: 10000000, power: 300, mineLv: 4, greatChance: 0.25 },
        { name: "신화의 오리할콘 곡괭이", cost: 50000000, power: 500, mineLv: 4, greatChance: 0.35 }
    ],
    // 20종 용병 데이터
    mercenaries: [
        { id: 0, name: "농부 듀드", cost: 0, atkMul: 1.0, icon: "👨‍🌾" },
        { id: 1, name: "마을 경비병", cost: 5000, atkMul: 1.2, icon: "👮‍♂️" },
        { id: 2, name: "견습 검사", cost: 20000, atkMul: 1.5, icon: "🤺" },
        { id: 3, name: "숙련된 사냥꾼", cost: 50000, atkMul: 1.8, icon: "🏹" },
        { id: 4, name: "왕국 기사", cost: 150000, atkMul: 2.2, icon: "💂‍♂️" },
        { id: 5, name: "전투 사제", cost: 400000, atkMul: 2.6, icon: "🧙‍♂️" },
        { id: 6, name: "그림자 암살자", cost: 1000000, atkMul: 3.2, icon: "🥷" },
        { id: 7, name: "엘프 명사수", cost: 3000000, atkMul: 4.0, icon: "🧝‍♀️" },
        { id: 8, name: "오크 전사", cost: 8000000, atkMul: 5.0, icon: "👹" },
        { id: 9, name: "드워프 공학자", cost: 20000000, atkMul: 6.5, icon: "👷" },
        { id: 10, name: "화염 마법사", cost: 50000000, atkMul: 8.5, icon: "🔥" },
        { id: 11, name: "냉기 마녀", cost: 150000000, atkMul: 11.0, icon: "❄️" },
        { id: 12, name: "강철의 골렘", cost: 400000000, atkMul: 15.0, icon: "🤖" },
        { id: 13, name: "뱀파이어 로드", cost: 1000000000, atkMul: 20.0, icon: "🧛" },
        { id: 14, name: "드래곤 슬레이어", cost: 3000000000, atkMul: 30.0, icon: "🐲" },
        { id: 15, name: "성기사 단장", cost: 10000000000, atkMul: 45.0, icon: "⚜️" },
        { id: 16, name: "차원 방랑자", cost: 50000000000, atkMul: 70.0, icon: "🌌" },
        { id: 17, name: "데몬 헌터", cost: 200000000000, atkMul: 100.0, icon: "😈" },
        { id: 18, name: "천상의 수호자", cost: 1000000000000, atkMul: 150.0, icon: "👼" },
        { id: 19, name: "치아의 신", cost: 10000000000000, atkMul: 300.0, icon: "🦷" }
    ],
    dungeons: [
        "시작의 이끼 동굴", "낡은 해골 병영", "침묵의 지하 수로", "버려진 광산 심부", 
        "혹한의 얼음 감옥", "작열하는 용암 터널", "맹독의 늪지대", "고대 거인의 무덤", 
        "환영의 안개 숲", "천공의 무너진 성채", "심연의 수직 낙하", "차원의 균열 지대", 
        "초월자의 시험장", "파멸의 잿더미", "영겁의 감시자 탑", "신의 영역: 입구", 
        "황혼의 그림자 성소", "우주 너머의 공허", "혼돈의 끝자락", "카오스 울트라 최종장"
    ],
    invExpansion: [5000, 50000, 500000, 5000000]
};

// Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration, vol = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playSfx(name) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    switch (name) {
        case 'mine': playTone(150, 'square', 0.1, 0.1); break;
        case 'merge': playTone(400, 'sine', 0.1, 0.1); setTimeout(() => playTone(600, 'sine', 0.1, 0.1), 100); break;
        case 'great': playTone(500, 'triangle', 0.1, 0.1); setTimeout(() => playTone(1000, 'triangle', 0.3, 0.1), 150); break;
        case 'attack': playTone(800, 'sawtooth', 0.05, 0.05); break; // 발사음 더 날카롭게
        case 'hit': playTone(100, 'noise', 0.05, 0.1); break;
    }
}

function fNum(num) {
    if (num < 1000) return Math.floor(num);
    const units = ["", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
    const unitIdx = Math.floor(Math.log10(num) / 3);
    const shortNum = num / Math.pow(10, unitIdx * 3);
    return shortNum.toFixed(2).replace(/\.00$/, "") + units[unitIdx];
}

function getAtk(lv) { return lv === 0 ? 0 : Math.floor(20 * Math.pow(1.6, lv - 1)); }

function getToothIcon(lv) {
    if (lv === 0) return "";
    let iconIdx = (lv - 1) % TOOTH_DATA.icons.length;
    let color = `hsl(${(lv * 35) % 360}, 75%, 75%)`;
    return `<div class="tooth-icon" style="color:${color}">${TOOTH_DATA.icons[iconIdx]}</div>`;
}
