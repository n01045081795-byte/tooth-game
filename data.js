// Version: 1.9.0 - Data & Sound Manager
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
    dungeons: [
        "시작의 이끼 동굴", "낡은 해골 병영", "침묵의 지하 수로", "버려진 광산 심부", 
        "혹한의 얼음 감옥", "작열하는 용암 터널", "맹독의 늪지대", "고대 거인의 무덤", 
        "환영의 안개 숲", "천공의 무너진 성채", "심연의 수직 낙하", "차원의 균열 지대", 
        "초월자의 시험장", "파멸의 잿더미", "영겁의 감시자 탑", "신의 영역: 입구", 
        "황혼의 그림자 성소", "우주 너머의 공허", "혼돈의 끝자락", "카오스 울트라 최종장"
    ],
    invExpansion: [5000, 50000, 500000, 5000000]
};

// 사운드 매니저
const SOUNDS = {
    mine: new Audio('sfx/mine.mp3'),
    merge: new Audio('sfx/merge.mp3'),
    great: new Audio('sfx/great.mp3'),
    attack: new Audio('sfx/attack.mp3'),
    hit: new Audio('sfx/hit.mp3')
};

function playSfx(name) {
    if (SOUNDS[name]) {
        SOUNDS[name].currentTime = 0;
        SOUNDS[name].play().catch(() => {}); // 자동재생 차단 방지
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
