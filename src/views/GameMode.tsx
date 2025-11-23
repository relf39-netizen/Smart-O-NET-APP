
import React, { useState, useEffect, useRef } from 'react';
import { Student, Question } from '../types';
import { Users, Trophy, Play, CheckCircle, Volume2, VolumeX, Crown, Music, Zap } from 'lucide-react';
import { speak, playBGM, stopBGM, playSFX, toggleMuteSystem } from '../utils/soundUtils';
import { db, firebase } from '../services/firebaseConfig';

interface GameModeProps {
  student: Student;
  onExit: () => void;
}

type GameStatus = 'LOBBY' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';

const GameMode: React.FC<GameModeProps> = ({ student, onExit }) => {
  const [status, setStatus] = useState<GameStatus>('LOBBY');
  const [players, setPlayers] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [scores, setScores] = useState<any>({});
  const [hasAnswered, setHasAnswered] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  
  const [isMuted, setIsMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false); // เช็คว่าผู้ใช้กดเปิดเสียงหรือยัง
  const [timer, setTimer] = useState(0);
  const [maxTime, setMaxTime] = useState(20);
  
  const isAdmin = student.id === '99999'; 
  const timerRef = useRef<any>(null);

  const toggleSound = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    toggleMuteSystem(newState);
    
    // ถ้ากดเปิดเสียง แล้วสถานะกำลังเล่น ให้เล่นเพลงทันที
    if (!newState && status === 'PLAYING') {
        playBGM('GAME');
    }
  };

  const enableAudio = () => {
    setAudioEnabled(true);
    setIsMuted(false);
    toggleMuteSystem(false);
    playBGM('LOBBY'); 
    speak("ยินดีต้อนรับสู่สนามสอบครับ");
  };

  // จัดการเสียงตามสถานะเกม
  useEffect(() => {
    if (!audioEnabled) return;
    
    if (status === 'LOBBY') {
        playBGM('LOBBY');
    } else if (status === 'COUNTDOWN') { 
        stopBGM(); 
        playSFX('COUNTDOWN'); 
    } else if (status === 'PLAYING') {
        playBGM('GAME'); 
    } else if (status === 'FINISHED') {
        playBGM('VICTORY');
    }
    
    return () => {};
  }, [status, audioEnabled]);

  useEffect(() => {
      return () => stopBGM();
  }, []);

  useEffect(() => {
    const connectedRef = db.ref(".info/connected");
    connectedRef.on('value', (snap: any) => setConnectionError(snap.val() === false));

    const playerRef = db.ref(`game/players/${student.id}`);
    playerRef.update({
      name: student.name,
      avatar: student.avatar,
      online: true,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
    playerRef.onDisconnect().update({ online: false });

    const gameStateRef = db.ref('gameState');
    gameStateRef.on('value', (snapshot: any) => {
      const data = snapshot.val();
      if (data) {
        setStatus(data.status || 'LOBBY');
        setCurrentQuestionIndex(data.currentQuestionIndex || 0);
        setTimer(data.timer || 0);
        if (data.timePerQuestion) setMaxTime(data.timePerQuestion);
      }
    });

    const playersRef = db.ref('game/players');
    playersRef.on('value', (snap: any) => { if(snap.val()) setPlayers(Object.values(snap.val())); });
    
    const scoresRef = db.ref('game/scores');
    scoresRef.on('value', (snap: any) => { if(snap.val()) setScores(snap.val()); });

    const questionsRef = db.ref('questions');
    questionsRef.on('value', (snap: any) => {
      const data = snap.val();
      if (data) {
        const qArray = Array.isArray(data) ? data : Object.values(data);
        setQuestions(qArray.filter((q: any) => q && q.id) as Question[]);
      }
    });

    return () => {
      connectedRef.off();
      gameStateRef.off();
      playersRef.off();
      scoresRef.off();
      questionsRef.off();
      playerRef.update({ online: false });
    };
  }, [student.id]);

  useEffect(() => {
    setHasAnswered(false);
  }, [currentQuestionIndex]);

  // Admin Game Loop
  useEffect(() => {
    if (!isAdmin) return;
    if (timerRef.current) clearInterval(timerRef.current);

    if (status === 'COUNTDOWN') {
        let localCount = 5;
        setCountdown(localCount);
        db.ref('gameState').update({ timer: maxTime });

        timerRef.current = setInterval(() => {
            localCount--;
            setCountdown(localCount);
            if (localCount <= 0) {
                clearInterval(timerRef.current);
                db.ref('gameState').update({ status: 'PLAYING', timer: maxTime });
            }
        }, 1000);
    } else if (status === 'PLAYING') {
        let currentTimer = maxTime; 
        timerRef.current = setInterval(() => {
            currentTimer--;
            if (currentTimer >= 0) {
                 db.ref('gameState/timer').set(currentTimer);
            }
            if (currentTimer < 0) {
                clearInterval(timerRef.current);
                if (currentQuestionIndex < questions.length - 1) {
                    db.ref('gameState').update({
                        currentQuestionIndex: currentQuestionIndex + 1,
                        timer: maxTime
                    });
                } else {
                    db.ref('gameState').update({ status: 'FINISHED', timer: 0 });
                }
            }
        }, 1000);
    }

    return () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, isAdmin, maxTime, currentQuestionIndex, questions.length]);

  // Actions
  const handleStartGame = () => {
    if (questions.length === 0) return alert("ไม่พบข้อสอบ");
    db.ref('gameState').update({ status: 'COUNTDOWN' });
    db.ref('game/scores').set({});
  };

  const handleReset = () => {
    db.ref('gameState').update({ status: 'LOBBY', currentQuestionIndex: 0, timer: 0 });
    db.ref('game/scores').set({});
  };

  const handleAnswer = (choiceId: string) => {
    if (hasAnswered || timer <= 0) return;
    setHasAnswered(true);

    const currentQ = questions[currentQuestionIndex];
    const isCorrect = choiceId === currentQ.correctChoiceId;
    
    const timeBonus = Math.round(50 * (timer / maxTime));
    const points = isCorrect ? (50 + timeBonus) : 0;
    const currentScore = scores[student.id] || 0;
    
    if (points > 0) {
       db.ref(`game/scores/${student.id}`).set(currentScore + points);
       playSFX('CORRECT'); speak("เยี่ยมมาก");
    } else {
       playSFX('WRONG'); speak("ยังไม่ถูก");
    }
  };

  // Renders
  const sortedPlayers = players.filter(p => p.online).sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
  const myRank = sortedPlayers.findIndex(p => p.id === student.id) + 1;
  const currentQuestion = questions[currentQuestionIndex];

  if (connectionError) return <div className="p-10 text-center">Connection Error...</div>;

  // 🔊 หน้าจอขออนุญาตใช้เสียง (บังคับ)
  if (!audioEnabled) {
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-purple-700 z-[999] flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="bg-white/10 p-6 rounded-full mb-6 animate-bounce">
                <Volume2 size={64} />
            </div>
            <h2 className="text-3xl font-bold mb-4">พร้อมแข่งขันหรือยัง?</h2>
            <p className="mb-8 text-blue-100 max-w-md">
                กรุณากดปุ่มด้านล่างเพื่อเข้าสู่ห้องเกม<br/>และเปิดระบบเสียงดนตรี
            </p>
            <button 
                onClick={enableAudio}
                className="bg-yellow-400 text-yellow-900 px-8 py-4 rounded-full text-xl font-bold shadow-xl hover:scale-105 transition-transform flex items-center gap-3 animate-pulse cursor-pointer"
            >
                <Zap fill="currentColor" /> คลิกเพื่อเริ่มเกม (เปิดเสียง)
            </button>
            <button onClick={onExit} className="mt-8 text-white/50 underline text-sm">
                กลับหน้าหลัก
            </button>
        </div>
    );
  }

  if (status === 'LOBBY') {
    return (
      <div className="text-center py-10 min-h-[70vh] flex flex-col justify-center relative">
        
        <button onClick={toggleSound} className={`absolute top-0 right-0 p-3 rounded-full shadow ${isMuted?'bg-gray-200':'bg-white'}`}>{isMuted?<VolumeX/>:<Volume2/>}</button>
        
        <h2 className="text-3xl font-bold text-blue-900 mb-6 animate-bounce">🎮 ห้องรอแข่งขัน</h2>
        
        <div className="bg-white/80 backdrop-blur p-6 rounded-3xl shadow-lg max-w-2xl mx-auto w-full mb-8">
          <div className="text-2xl font-bold text-blue-600 mb-4 flex justify-center gap-2"><Users/> ผู้เล่น {players.filter((p:any)=>p.online).length} คน</div>
          <div className="flex flex-wrap justify-center gap-4">
            {players.filter((p:any) => p.online).map((p: any, i) => (
              <div key={i} className="flex flex-col items-center"><div className="text-3xl bg-blue-50 w-14 h-14 rounded-full flex items-center justify-center border-2 border-blue-100">{p.avatar}</div><span className="text-xs mt-1 bg-white px-2 py-0.5 rounded shadow text-gray-800">{p.name}</span></div>
            ))}
          </div>
        </div>
        {isAdmin ? <button onClick={handleStartGame} className="bg-green-500 text-white px-10 py-4 rounded-full text-2xl font-bold shadow-xl hover:scale-105 transition mx-auto flex gap-2"><Play fill="currentColor"/> เริ่มเกม ({maxTime}วิ)</button> : <div className="animate-pulse text-gray-500">รอครูเริ่มเกม...</div>}
        <button onClick={onExit} className="text-gray-400 underline text-sm mt-8">ออก</button>
      </div>
    );
  }

  if (status === 'COUNTDOWN') {
    return <div className="h-[60vh] flex flex-col items-center justify-center"><div className="text-xl font-bold text-gray-500 mb-4">เริ่มใน</div><div className="text-[10rem] font-black text-blue-600 animate-ping">{countdown}</div></div>;
  }

  if (status === 'PLAYING' && currentQuestion) {
    const timePercent = (timer / maxTime) * 100;
    const timerColor = timePercent > 50 ? 'bg-green-500' : timePercent > 20 ? 'bg-yellow-500' : 'bg-red-600';
    return (
      <div className="max-w-3xl mx-auto pt-4 pb-20 relative">
        {/* ปุ่มเปิด/ปิดเสียง ขณะเล่นเกม */}
        <button 
            onClick={toggleSound} 
            className={`fixed top-20 right-4 z-50 p-2 rounded-full shadow-lg ${isMuted ? 'bg-gray-200 text-gray-500' : 'bg-green-500 text-white animate-pulse'}`}
        >
            {isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}
        </button>
        
        <div className="flex items-center gap-4 mb-4 bg-white p-3 rounded-2xl shadow-sm">
            <span className="font-bold text-blue-800 text-sm">ข้อ {currentQuestionIndex+1}/{questions.length}</span>
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden relative"><div className={`h-full transition-all duration-1000 ease-linear ${timerColor}`} style={{width:`${timePercent}%`}}></div></div>
            <span className={`font-mono font-black text-xl w-8 text-center ${timer<=5?'text-red-600 animate-pulse':''}`}>{timer}</span>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-xl border-b-4 border-blue-200 text-center mb-6 relative overflow-hidden">
            {timer <= 0 && <div className="absolute inset-0 bg-gray-900/20 z-20 flex items-center justify-center"><span className="bg-red-600 text-white px-6 py-2 rounded-full text-xl font-bold animate-bounce">หมดเวลา!</span></div>}
            <h2 className="text-xl font-bold mb-4 text-gray-800">{currentQuestion.text}</h2>
            {currentQuestion.image && <img src={currentQuestion.image} className="h-40 mx-auto object-contain mb-4 rounded bg-gray-50"/>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentQuestion.choices.map((c, i) => (
                    <button key={c.id} onClick={()=>handleAnswer(c.id)} disabled={hasAnswered || timer<=0} className={`p-4 rounded-xl font-bold text-lg border-b-4 relative overflow-hidden transition active:scale-95 ${['bg-red-50 border-red-200 text-red-800','bg-blue-50 border-blue-200 text-blue-800','bg-yellow-50 border-yellow-200 text-yellow-800','bg-green-50 border-green-200 text-green-800'][i%4]} ${(hasAnswered||timer<=0)?'opacity-80':''}`}>
                        {(hasAnswered || timer<=0) && c.id === currentQuestion.correctChoiceId && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center z-10 border-4 border-green-500 rounded-xl"><CheckCircle className="text-green-600 w-8 h-8 bg-white rounded-full"/></div>}
                        {c.text}
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow border border-gray-100">
            <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2"><Trophy size={16} className="text-yellow-500"/> ผู้นำคะแนน</h3>
            <div className="space-y-2">
                {sortedPlayers.slice(0, 5).map((p, i) => (
                    <div key={p.id} className={`flex items-center justify-between p-2 rounded-xl border ${i===0?'bg-yellow-50 border-yellow-200':i===1?'bg-gray-50 border-gray-200':i===2?'bg-orange-50 border-orange-200':'border-gray-100'} ${p.id===student.id?'ring-2 ring-blue-400':''}`}>
                        <div className="flex items-center gap-3">
                            <span className="font-bold w-6 text-center text-gray-600">{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
                            <span className="text-xl">{p.avatar}</span>
                            <span className={`font-bold text-sm ${p.id===student.id?'text-blue-700':'text-gray-800'}`}>{p.name}</span>
                        </div>
                        <span className="font-bold text-blue-600">{scores[p.id]||0}</span>
                    </div>
                ))}
            </div>
            {myRank > 5 && <div className="mt-2 pt-2 border-t border-dashed"><div className="flex items-center justify-between p-2 rounded-xl bg-blue-50 border border-blue-200"><div className="flex items-center gap-3"><span className="font-bold w-6 text-center text-gray-600">{myRank}</span><span>{student.avatar}</span><span className="font-bold text-sm text-blue-700">{student.name} (ฉัน)</span></div><span className="font-bold text-blue-600">{scores[student.id]||0}</span></div></div>}
        </div>
      </div>
    );
  }

  if (status === 'FINISHED') {
    const winner = sortedPlayers[0];
    return (
        <div className="text-center py-10">
            <Trophy size={100} className="text-yellow-400 animate-bounce mx-auto mb-6"/>
            <h1 className="text-4xl font-bold text-blue-900 mb-8">จบเกมแล้ว!</h1>
            <div className="relative max-w-md mx-auto bg-white rounded-3xl p-8 shadow-xl border-b-8 border-yellow-300">
                <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-pulse"/>
                <div className="text-7xl mb-4">{winner?.avatar}</div>
                <div className="text-2xl font-bold text-gray-800 mb-2">{winner?.name}</div>
                <div className="text-4xl font-black text-blue-600">{scores[winner?.id]||0} คะแนน</div>
            </div>
            <div className="mt-10 space-x-4">
                <button onClick={onExit} className="bg-gray-200 text-gray-700 px-8 py-3 rounded-full font-bold hover:bg-gray-300">ออก</button>
                {isAdmin && <button onClick={handleReset} className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-700">เริ่มใหม่</button>}
            </div>
        </div>
    );
  }

  return <div className="text-center p-10">Loading...</div>;
};

export default GameMode;
