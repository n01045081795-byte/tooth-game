// Version: 1.5.0 - Data & Utils
const TOOTH_DATA = {
    icons: ["🦷", "🦴", "💎", "✨", "🔥", "🧊", "⚡", "🌈", "🔱", "🌑", "☀️", "🔮", "🧿", "💠", "🏵️", "🍀", "🍃", "🎃", "🥊", "⚔️", "🏹", "🛡️", "🧬", "🧪", "🦾", "📡", "🛸", "🪐", "🌟", "🌌", "🌋", "🐲", "👾", "🤖", "🤡", "👹", "👑", "💎", "🦷", "💠"],
    pickaxes: [
        { name: "허름한 나무 곡괭이", cost: 0, power: 10, mineLv: 1, greatChance: 0.01 },
        { name: "무딘 구리 곡괭이", cost: 1000, power: 15, mineLv: 1, greatChance: 0.03 },
        { name: "튼튼한 철 곡괭이", cost: 5000, power: 22, mineLv: 2, greatChance: 0.05 },
        { name: "연마된 강철 곡괭이", cost: 25000, power: 30, mineLv: 2, greatChance: 0.08 },
        { name: "빛나는 황금 곡괭이", cost: 100000, power: 45, mineLv: 2, greatChance: 0.12 },
        { name: "고강도 티타늄 곡괭이", cost: 500000, power: 65, mineLv: 3, greatChance: 0.15 },
        { name: "영롱한 다이아 곡괭이", cost: 2000000, power: 100, mineLv: 3, greatChance: 0.20 },
        { name: "카본 초합금 곡괭이", cost: 10000000, power: 150, mineLv: 4, greatChance: 0.25 },
        { name: "신화의 오리할콘 곡괭이", cost: 50000000, power: 250, mineLv: 4, greatChance: 0.35 }
    ]
};

// 알파벳 단위 표기 함수 (1000 -> 1a)
function fNum(num) {
    if (num < 1000) return Math.floor(num);
    const units = ["", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
    const unitIdx = Math.floor(Math.log10(num) / 3);
    const shortNum = num / Math.pow(10, unitIdx * 3);
    return shortNum.toFixed(2).replace(/\.00$/, "") + units[unitIdx];
}

// 레벨별 대미지 계산 (1.5배~1.8배 성장형)
function getAtk(lv) {
    if (lv === 0) return 0;
    return Math.floor(10 * Math.pow(1.65, lv - 1));
}
