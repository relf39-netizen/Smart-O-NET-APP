// utils/soundUtils.ts

// --- Sound Assets (ลิงก์เพลงฟรีไม่มีลิขสิทธิ์) ---
// ท่านสามารถเปลี่ยน URL เหล่านี้เป็นไฟล์ MP3 ของท่านเองได้ครับ
const SOUNDS = {
    BGM_LOBBY: 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8c8a73467.mp3', // เพลงแนว Funky
    BGM_GAME: 'https://cdn.pixabay.com/audio/2021/08/09/audio_04d93c2526.mp3', // เพลงแนว Action เร็วๆ
    BGM_VICTORY: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0cd4862.mp3', // เพลง Win
    
    SFX_CORRECT: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.m4a',
    SFX_WRONG: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.m4a',
    SFX_COUNTDOWN: 'https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.m4a', // เสียงติ๊กๆ
    SFX_TIMEUP: 'https://assets.mixkit.co/active_storage/sfx/139/139-preview.m4a'
};

let bgmAudio: HTMLAudioElement | null = null;
let isMuted = false;

// ฟังก์ชันพูด (TTS)
export const speak = (text: string) => {
  if (isMuted) return;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // หยุดพูดอันเก่าก่อน
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
};

// ฟังก์ชันเล่นเพลงพื้นหลัง (Loop)
export const playBGM = (type: 'LOBBY' | 'GAME' | 'VICTORY') => {
    if (isMuted) return;

    // ถ้ามีเพลงเดิมเล่นอยู่ ให้หยุดก่อน
    stopBGM();

    let src = '';
    switch (type) {
        case 'LOBBY': src = SOUNDS.BGM_LOBBY; break;
        case 'GAME': src = SOUNDS.BGM_GAME; break;
        case 'VICTORY': src = SOUNDS.BGM_VICTORY; break;
    }

    if (src) {
        bgmAudio = new Audio(src);
        bgmAudio.loop = true; // เล่นวนซ้ำ
        bgmAudio.volume = 0.4; // ลดเสียงเพลงลงหน่อย ไม่ให้กลบเสียงพูด
        bgmAudio.play().catch(e => console.log("Auto-play prevented:", e));
    }
};

// ฟังก์ชันหยุดเพลง
export const stopBGM = () => {
    if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
        bgmAudio = null;
    }
};

// ฟังก์ชันเล่นเสียงเอฟเฟกต์ (ครั้งเดียว)
export const playSFX = (type: 'CORRECT' | 'WRONG' | 'COUNTDOWN' | 'TIMEUP') => {
    if (isMuted) return;

    let src = '';
    switch (type) {
        case 'CORRECT': src = SOUNDS.SFX_CORRECT; break;
        case 'WRONG': src = SOUNDS.SFX_WRONG; break;
        case 'COUNTDOWN': src = SOUNDS.SFX_COUNTDOWN; break;
        case 'TIMEUP': src = SOUNDS.SFX_TIMEUP; break;
    }

    if (src) {
        const audio = new Audio(src);
        audio.volume = 0.8;
        audio.play().catch(e => console.log("SFX play error:", e));
    }
};

// ฟังก์ชันเปิด/ปิดเสียงทั้งหมด
export const toggleMuteSystem = (muteState: boolean) => {
    isMuted = muteState;
    if (isMuted) {
        if (bgmAudio) bgmAudio.pause();
    } else {
        if (bgmAudio) bgmAudio.play().catch(() => {});
    }
};