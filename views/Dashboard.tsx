
import React from 'react';
import { BookOpen, Gamepad2, BarChart3, Star, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Student, Assignment, ExamResult } from '../types';

interface DashboardProps {
  student: Student;
  assignments?: Assignment[]; // รับการบ้านมาโชว์
  examResults?: ExamResult[]; // รับผลสอบมาเช็คว่าทำหรือยัง
  onNavigate: (page: string) => void;
  onStartAssignment?: (assignment: Assignment) => void; // กดทำ
}

const Dashboard: React.FC<DashboardProps> = ({ student, assignments = [], examResults = [], onNavigate, onStartAssignment }) => {
  
  // กรองการบ้านเฉพาะโรงเรียนของนักเรียน
  const myAssignments = assignments.filter(a => a.school === student.school);
  const pendingCount = myAssignments.filter(a => !examResults.some(r => r.assignmentId === a.id)).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10"><Star size={150} /></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="text-5xl bg-white/20 p-3 rounded-full backdrop-blur-sm shadow-inner">{student.avatar}</div>
          <div>
            <h2 className="text-2xl font-bold mb-1">สวัสดี, {student.name.split(' ')[0]}!</h2>
            <p className="text-blue-100">วันนี้เรามาฝึกฝนกันเถอะ</p>
            <div className="flex items-center gap-2 mt-2 bg-black/20 w-fit px-3 py-1 rounded-full"><Star className="text-yellow-300 fill-yellow-300" size={16} /><span className="font-bold">{student.stars} คะแนนสะสม</span></div>
          </div>
        </div>
      </div>

      {/* 📝 กล่องการบ้าน (Homework Alert) */}
      {myAssignments.length > 0 && (
        <div className="bg-white border-l-4 border-orange-500 rounded-2xl p-6 shadow-sm animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Calendar size={20} /></div>
                การบ้านของคุณ 
                {pendingCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">{pendingCount} งานค้าง</span>}
            </h3>
            <div className="space-y-3">
                {myAssignments.map(hw => {
                    // เช็คว่าทำไปหรือยัง
                    const isDone = examResults.some(r => r.assignmentId === hw.id);
                    // เช็คว่าหมดเวลาหรือยัง
                    const isExpired = new Date(hw.deadline) < new Date() && !isDone;
                    
                    return (
                        <div key={hw.id} className={`p-4 rounded-xl flex justify-between items-center border ${isDone ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                            <div>
                                <div className="font-bold text-gray-800 text-lg">{hw.subject}</div>
                                <div className="text-sm text-gray-600">{hw.questionCount} ข้อ • ส่งภายใน {hw.deadline}</div>
                            </div>
                            <div>
                                {isDone ? (
                                    <span className="flex items-center gap-1 text-green-700 font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm">
                                        <CheckCircle size={16} /> ส่งแล้ว
                                    </span>
                                ) : isExpired ? (
                                    <span className="flex items-center gap-1 text-red-500 font-bold text-sm bg-white px-3 py-1 rounded-full shadow-sm">
                                        <AlertCircle size={16} /> หมดเวลา
                                    </span>
                                ) : (
                                    <button 
                                        onClick={() => onStartAssignment && onStartAssignment(hw)}
                                        className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-600 hover:-translate-y-1 transition-all"
                                    >
                                        เริ่มทำ
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* Main Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => onNavigate('select-subject')} className="group relative bg-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all border-b-4 border-blue-100 hover:border-blue-500 hover:-translate-y-1 text-left">
          <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors"><BookOpen size={32} /></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">ฝึกทำข้อสอบ</h3>
          <p className="text-gray-500 text-sm">ฝึกฝนวิชาคณิตศาสตร์ ภาษาไทย วิทยาศาสตร์ และภาษาอังกฤษ</p>
          <span className="absolute top-6 right-6 bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-lg">โหมดฝึกฝน</span>
        </button>

        <button onClick={() => onNavigate('game')} className="group relative bg-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all border-b-4 border-purple-100 hover:border-purple-500 hover:-translate-y-1 text-left">
          <div className="bg-purple-100 w-14 h-14 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors"><Gamepad2 size={32} /></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">เกมแข่งขัน</h3>
          <p className="text-gray-500 text-sm">ประลองความเร็วกับเพื่อนๆ ในห้อง แบบเรียลไทม์</p>
          <div className="absolute top-6 right-6 flex gap-1"><span className="flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span><span className="text-green-600 text-xs font-bold">LIVE</span></div>
        </button>

        <button onClick={() => onNavigate('stats')} className="md:col-span-2 group bg-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all border-b-4 border-green-100 hover:border-green-500 hover:-translate-y-1 flex items-center gap-4">
          <div className="bg-green-100 w-12 h-12 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors"><BarChart3 size={24} /></div>
          <div><h3 className="text-lg font-bold text-gray-800">ดูสถิติผลการเรียน</h3><p className="text-gray-500 text-sm">เช็คพัฒนาการและจุดที่ต้องปรับปรุง</p></div>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
