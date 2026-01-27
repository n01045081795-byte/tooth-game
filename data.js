// Version: 2.0.0 - Data & Sound & Mercenary
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
    mercenaries: [
        { id: 0, name: "농부 듀드", cost: 0, hpMul: 1, spd: 1, atkMul: 1, icon: "👨‍🌾" },
        { id: 1, name: "견습 기사", cost: 10000, hpMul: 1.5, spd: 1.1, atkMul: 1.2, icon: "💂‍♂️" },
        { id: 2, name: "왕국 근위병", cost: 50000, hpMul: 2.5, spd: 1.2, atkMul: 1.5, icon: "👮‍♂️" },
        { id: 3, name: "엘프 궁수", cost: 200000, hpMul: 1.8, spd: 1.5, atkMul: 2.0, icon: "🧝‍♀️" },
        { id: 4, name: "전설의 용사", cost: 1000000, hpMul: 5.0, spd: 1.3, atkMul: 3.0, icon: "🦸‍♂️" }
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

// --- Web Audio API 사운드 생성기 ---
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
        case 'mine': // 묵직한 타격음
            playTone(150, 'square', 0.1, 0.1);
            setTimeout(() => playTone(100, 'sawtooth', 0.1, 0.1), 50);
            break;
        case 'merge': // 띠링 (합성)
            playTone(400, 'sine', 0.1, 0.1);
            setTimeout(() => playTone(600, 'sine', 0.2, 0.1), 100);
            break;
        case 'great': // 뾰로롱 (대성공)
            playTone(500, 'triangle', 0.1, 0.1);
            setTimeout(() => playTone(700, 'triangle', 0.1, 0.1), 100);
            setTimeout(() => playTone(1000, 'triangle', 0.3, 0.1), 200);
            break;
        case 'attack': // 슉 (발사)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
            break;
        case 'hit': // 퍽 (타격)
            playTone(100, 'sawtooth', 0.05, 0.05);
            break;
    }
}

function fNum(num) {
    if (num < 1000) return Math.floor(num);
    const units = ["", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
    const unitIdx = Math.floor(Math.log10(num) / 3);
    const shortNum = num / Math.pow(10, unitIdx * 3);
    return shortNum.toFixed(2).replace(/\.00$/, "") + units[unitIdx];
}

function getAtk(lv) { return lv === 0 ? 0 : Math.floor(20 * Math.pow(1.55, lv - 1)); }

function getToothIcon(lv) {
    if (lv === 0) return "";
    let iconIdx = (lv - 1) % TOOTH_DATA.icons.length;
    let color = `hsl(${(lv * 35) % 360}, 75%, 75%)`;
    return `<div class="tooth-icon" style="color:${color}">${TOOTH_DATA.icons[iconIdx]}</div>`;
}
