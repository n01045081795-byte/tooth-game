const TOOTH_DATA = {
    icons: ["🦷", "🦴", "💎", "✨", "🔥", "🧊", "⚡", "🌈", "🔱", "🌑", "☀️", "🔮", "🧿", "💠", "🏵️", "🍀", "🍃", "🎃", "🥊", "⚔️", "🏹", "🛡️", "🧬", "🧪", "🦾", "📡", "🛸", "🪐", "🌟", "🌌", "🌋", "🐲", "👾", "🤖", "🤡", "👹", "👑", "💎", "🦷", "💠"],
    pickaxes: [
        { name: "허름한 나무 곡괭이", cost: 0, baseLv: 1, luck: 0.05, icon: "🪵" },
        { name: "무딘 구리 곡괭이", cost: 500, baseLv: 1, luck: 0.15, icon: "🪨" },
        { name: "튼튼한 철 곡괭이", cost: 2500, baseLv: 2, luck: 0.20, icon: "⛏️" },
        { name: "연마된 강철 곡괭이", cost: 15000, baseLv: 2, luck: 0.35, icon: "⚔️" },
        { name: "빛나는 황금 곡괭이", cost: 100000, baseLv: 3, luck: 0.40, icon: "⚜️" },
        { name: "고강도 티타늄 곡괭이", cost: 800000, baseLv: 3, luck: 0.55, icon: "💠" },
        { name: "영롱한 다이아 곡괭이", cost: 5000000, baseLv: 4, luck: 0.60, icon: "💎" },
        { name: "카본 초합금 곡괭이", cost: 50000000, baseLv: 4, luck: 0.75, icon: "🔮" },
        { name: "신화의 오리할콘 곡괭이", cost: 1000000000, baseLv: 5, luck: 0.80, icon: "👑" }
    ],
    mercenaries: [
        { id: 0, name: "농부 듀드", cost: 0, atkMul: 1.0, baseHp: 100, spd: 1.0, icon: "👨‍🌾" },
        { id: 1, name: "마을 경비병", cost: 800, atkMul: 1.2, baseHp: 150, spd: 1.1, icon: "👮‍♂️" },
        { id: 2, name: "견습 검사", cost: 3000, atkMul: 1.5, baseHp: 200, spd: 1.2, icon: "🤺" },
        { id: 3, name: "숙련된 사냥꾼", cost: 12000, atkMul: 1.8, baseHp: 180, spd: 1.3, icon: "🏹" },
        { id: 4, name: "왕국 기사", cost: 50000, atkMul: 2.2, baseHp: 300, spd: 1.1, icon: "💂‍♂️" },
        { id: 5, name: "전투 사제", cost: 200000, atkMul: 2.6, baseHp: 250, spd: 1.2, icon: "🧙‍♂️" },
        { id: 19, name: "치아의 신", cost: 100000000000000, atkMul: 300.0, baseHp: 5000, spd: 2.0, icon: "🦷" }
    ],
    dungeons: ["시작의 이끼 동굴", "낡은 해골 병영", "침묵의 지하 수로", "버려진 광산 심부", "혹한의 얼음 감옥"],
    invExpansion: [2000, 20000, 200000, 2000000]
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, type, duration, vol = 0.1) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch(e){}
}
function playSfx(name) {
    if (window.isMuted || document.hidden) return;
    switch (name) {
        case 'mine': playTone(150, 'square', 0.1, 0.05); break;
        case 'merge': playTone(400, 'sine', 0.1, 0.1); break;
        case 'upgrade': playTone(600, 'square', 0.1, 0.1); break;
        case 'damage': playTone(80, 'sawtooth', 0.2, 0.2); break;
        case 'hit': playTone(100, 'noise', 0.05, 0.1); break;
    }
}
function fNum(num) {
    if (num < 1000) return Math.floor(num);
    const units = ["", "a", "b", "c", "d", "e", "f", "g", "h", "i"];
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
