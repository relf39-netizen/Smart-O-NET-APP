import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './views/Login';
import TeacherLogin from './views/TeacherLogin';
import TeacherDashboard from './views/TeacherDashboard';
import Dashboard from './views/Dashboard';
import PracticeMode from './views/PracticeMode';
import SubjectSelection from './views/SubjectSelection'; 
import GameMode from './views/GameMode';
import GameSetup from './views/GameSetup';
import Results from './views/Results';
import Stats from './views/Stats';
import { Student, Question, Teacher, Subject, ExamResult, Assignment } from './types';
import { fetchAppData, saveScore } from './services/api';
import { Loader2 } from 'lucide-react';
import { MOCK_STUDENTS, MOCK_QUESTIONS } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [currentPage, setCurrentPage] = useState('login'); 
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [lastScore, setLastScore] = useState<{score: number, total: number} | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      console.log("System Starting...");
      
      // ✅ ระบบกันค้าง: ถ้าโหลดนานเกิน 2.5 วินาที ให้ตัดจบและเข้าหน้า Login ทันที
      const safetyTimer = setTimeout(() => {
        if (isMounted && isLoading) {
          console.warn("Loading taking too long, switching to fallback data...");
          setStudents(MOCK_STUDENTS);
          setQuestions(MOCK_QUESTIONS);
          setIsLoading(false);
        }
      }, 2500);

      try {
        const data = await fetchAppData();
        if (isMounted) {
          clearTimeout(safetyTimer); // ถ้าโหลดเสร็จก่อน ก็ยกเลิกตัวจับเวลา
          
          if (data.students.length > 0) {
             setStudents(data.students);
             setQuestions(data.questions);
             setExamResults(data.results);
             setAssignments(data.assignments);
          } else {
             setStudents(MOCK_STUDENTS);
             setQuestions(MOCK_QUESTIONS);
          }
          
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load data", error);
        if (isMounted) {
           setStudents(MOCK_STUDENTS);
           setQuestions(MOCK_QUESTIONS);
           setIsLoading(false);
        }
      }
    };
    initData();
    return () => { isMounted = false; };
  }, []);

  const handleLogin = (student: Student) => { setCurrentUser(student); setCurrentPage('dashboard'); };
  const handleTeacherLoginSuccess = (teacher: Teacher) => { setCurrentTeacher(teacher); setCurrentPage('teacher-dashboard'); };
  const handleLogout = () => { setCurrentUser(null); setCurrentTeacher(null); setCurrentPage('login'); setSelectedSubject(null); setCurrentAssignment(null); };

  const handleFinishExam = async (score: number, total: number) => {
    setLastScore({ score, total });
    setCurrentPage('results');
    if (currentUser) {
       const subjectToSave = currentAssignment ? currentAssignment.subject : (selectedSubject || 'รวมวิชา');
       await saveScore(currentUser.id, currentUser.name, currentUser.school || '-', score, total, subjectToSave, currentAssignment ? currentAssignment.id : undefined);
       setCurrentUser(prev => prev ? { ...prev, stars: prev.stars + score } : null);
       const newResult: ExamResult = { id: Math.random().toString(), studentId: currentUser.id, subject: subjectToSave as Subject, score: score, totalQuestions: total, timestamp: Date.now(), assignmentId: currentAssignment?.id };
       setExamResults(prev => [...prev, newResult]);
       setCurrentAssignment(null);
    }
  };

  const handleSelectSubject = (subject: Subject) => { setSelectedSubject(subject); setCurrentAssignment(null); setCurrentPage('practice'); };
  const handleStartAssignment = (assignment: Assignment) => { setCurrentAssignment(assignment); setSelectedSubject(assignment.subject); setCurrentPage('practice'); };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 text-blue-600">
      <Loader2 className="animate-spin mb-4" size={48} />
      <p className="text-lg font-bold">กำลังเตรียมข้อมูล...</p>
    </div>
  );

  if (currentPage === 'teacher-login') return <TeacherLogin onLoginSuccess={handleTeacherLoginSuccess} onBack={() => setCurrentPage('login')} />;
  if (currentPage === 'teacher-dashboard' && currentTeacher) return <TeacherDashboard teacher={currentTeacher} onLogout={handleLogout} onStartGame={() => setCurrentPage('game-setup')} />;
  if (currentPage === 'game-setup') return <GameSetup onBack={() => setCurrentPage('teacher-dashboard')} onGameCreated={() => setCurrentPage('teacher-game')} />;
  if (currentPage === 'teacher-game' && currentTeacher) {
      const teacherAsStudent: Student = { id: '99999', name: currentTeacher.name, school: currentTeacher.school, avatar: '👨‍🏫', stars: 0 };
      return <GameMode student={teacherAsStudent} onExit={() => setCurrentPage('teacher-dashboard')} />;
  }
  
  if (currentPage === 'login' && !currentUser) return <Login onLogin={handleLogin} onTeacherLoginClick={() => setCurrentPage('teacher-login')} students={students} />;

  return (
    <Layout studentName={currentUser?.name} onLogout={handleLogout} isMusicOn={isMusicOn} toggleMusic={() => setIsMusicOn(!isMusicOn)} currentPage={currentPage} onNavigate={setCurrentPage}>
      {(() => {
        switch (currentPage) {
          case 'dashboard': return <Dashboard student={currentUser!} assignments={assignments} examResults={examResults} onNavigate={setCurrentPage} onStartAssignment={handleStartAssignment} />;
          case 'select-subject': return <SubjectSelection onSelectSubject={handleSelectSubject} onBack={() => setCurrentPage('dashboard')} />;
          case 'practice':
            let qList = questions;
            const activeSubject = currentAssignment ? currentAssignment.subject : selectedSubject;
            if (activeSubject) qList = questions.filter(q => q.subject === activeSubject);
            if (currentAssignment && currentAssignment.questionCount < qList.length) qList = qList.slice(0, currentAssignment.questionCount);
            return <PracticeMode questions={qList} onFinish={handleFinishExam} onBack={() => setCurrentPage('dashboard')} />;
          case 'game': return <GameMode student={currentUser!} onExit={() => setCurrentPage('dashboard')} />;
          case 'results': return <Results score={lastScore?.score || 0} total={lastScore?.total || 0} onRetry={() => setCurrentPage('select-subject')} onHome={() => setCurrentPage('dashboard')} />;
          case 'stats': return <Stats examResults={examResults} studentId={currentUser!.id} onBack={() => setCurrentPage('dashboard')} />;
          default: return <Dashboard student={currentUser!} onNavigate={setCurrentPage} />;
        }
      })()}
    </Layout>
  );
};
export default App;