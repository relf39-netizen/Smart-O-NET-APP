
import React, { useEffect } from 'react';
import { Star, RefreshCw, Home } from 'lucide-react';
import { speak } from '../utils/soundUtils';

interface ResultsProps {
  score: number;
  total: number;
  onRetry: () => void;
  onHome: () => void;
}

const Results: React.FC<ResultsProps> = ({ score, total, onRetry, onHome }) => {
  const percentage = (score / total) * 100;
  
  useEffect(() => {
    if (percentage >= 80) {
      speak(`สุดยอดไปเลย ทำได้ ${score} เต็ม ${total} คะแนน`);
    } else if (percentage >= 50) {
      speak(`เก่งมากครับ พยายามอีกนิดนะ ได้ ${score} คะแนน`);
    } else {
      speak(`ไม่เป็นไรครับ ลองใหม่อีกครั้งนะ สู้ๆ`);
    }
  }, [score, total, percentage]);

  return (
    <div className="flex flex-col items-center text-center py-10">
      <div className="relative mb-8">
         <div className="absolute inset-0 bg-yellow-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
         <div className="bg-white rounded-full p-8 shadow-xl relative z-10 border-4 border-yellow-100">
           <Star size={80} className="text-yellow-400 fill-yellow-400" />
         </div>
         {percentage === 100 && (
           <>
             <Star size={40} className="text-yellow-400 fill-yellow-400 absolute -top-2 -left-4 animate-bounce" style={{animationDelay: '0.1s'}} />
             <Star size={40} className="text-yellow-400 fill-yellow-400 absolute -top-2 -right-4 animate-bounce" style={{animationDelay: '0.2s'}} />
           </>
         )}
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-2">
        {percentage >= 80 ? 'ยอดเยี่ยมมาก!' : percentage >= 50 ? 'ทำได้ดีมาก!' : 'พยายามได้ดี!'}
      </h1>
      <p className="text-gray-500 mb-8">
        คุณทำคะแนนได้
      </p>

      <div className="bg-white rounded-3xl p-8 shadow-lg border-b-4 border-blue-100 w-full max-w-sm mb-8">
        <div className="text-6xl font-black text-blue-600 mb-2">
          {score}<span className="text-2xl text-gray-400 font-medium">/{total}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 mb-2">
          <div 
            className={`h-4 rounded-full transition-all duration-1000 ${percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-400">ความแม่นยำ {Math.round(percentage)}%</p>
      </div>

      <div className="flex gap-4 w-full max-w-sm">
        <button 
          onClick={onHome}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <Home size={20} /> หน้าหลัก
        </button>
        <button 
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
        >
          <RefreshCw size={20} /> ทำอีกครั้ง
        </button>
      </div>
    </div>
  );
};

export default Results;
