
// services/api.ts

import { Student, Question, Teacher, Subject, ExamResult, Assignment } from '../types'; 
import { MOCK_STUDENTS, MOCK_QUESTIONS } from '../constants';

// ---------------------------------------------------------------------------
// 🟢 จุดที่ 1: วาง Web App URL ของท่าน ตรงนี้ครับ
// ---------------------------------------------------------------------------
const GOOGLE_SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbx3EwKuxf1L7_iYqoCLCpfHQlu8FyPL9ty8n4oJlSuInj9sMcsSFjQyw39--V2-gQ8U/exec'; 

export interface AppData {
  students: Student[];
  questions: Question[];
  results: ExamResult[];
  assignments: Assignment[]; // ✅ เพิ่มรายการการบ้าน
}

// Login ครู
export const teacherLogin = async (username: string, password: string): Promise<{success: boolean, teacher?: Teacher}> => {
  if (!GOOGLE_SCRIPT_URL) return { success: false };
  
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?type=teacher_login&username=${username}&password=${password}`);
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Login error", e);
    return { success: false };
  }
};

// ดึงข้อมูล Dashboard ครู
export const getTeacherDashboard = async (school: string) => {
  if (!GOOGLE_SCRIPT_URL) return { students: [], results: [] };
  const response = await fetch(`${GOOGLE_SCRIPT_URL}?type=teacher_data&school=${school}`);
  return await response.json();
}

// เพิ่มนักเรียนใหม่
export const addStudent = async (name: string, school: string, avatar: string): Promise<Student | null> => {
  if (!GOOGLE_SCRIPT_URL) return null;
  try {
    const url = `${GOOGLE_SCRIPT_URL}?type=add_student&name=${encodeURIComponent(name)}&school=${encodeURIComponent(school)}&avatar=${encodeURIComponent(avatar)}`;
    const response = await fetch(url);
    const newStudent = await response.json();
    return newStudent;
  } catch (e) {
    console.error("Add student error", e);
    return null;
  }
};

// ✅ สั่งการบ้านใหม่
export const addAssignment = async (school: string, subject: string, questionCount: number, deadline: string, createdBy: string): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) return false;
  try {
    const url = `${GOOGLE_SCRIPT_URL}?type=add_assignment&school=${encodeURIComponent(school)}&subject=${encodeURIComponent(subject)}&questionCount=${questionCount}&deadline=${deadline}&createdBy=${encodeURIComponent(createdBy)}`;
    await fetch(url);
    return true;
  } catch (e) {
    console.error("Add assignment error", e);
    return false;
  }
};

// ✅ บันทึกคะแนนสอบ (เพิ่ม Subject และ AssignmentId)
export const saveScore = async (studentId: string, studentName: string, school: string, score: number, total: number, subject: string, assignmentId?: string) => {
  if (!GOOGLE_SCRIPT_URL) return false;
  try {
    const aidParam = assignmentId ? `&assignmentId=${encodeURIComponent(assignmentId)}` : '';
    const url = `${GOOGLE_SCRIPT_URL}?type=save_score&studentId=${studentId}&studentName=${encodeURIComponent(studentName)}&school=${encodeURIComponent(school)}&score=${score}&total=${total}&subject=${encodeURIComponent(subject)}${aidParam}`;
    await fetch(url);
    return true;
  } catch (e) {
    console.error("Save score error", e);
    return false;
  }
}

// 🔄 ฟังก์ชันช่วยแปลงรหัสวิชา
const normalizeSubject = (rawSubject: string): Subject => {
  const s = String(rawSubject).trim().toUpperCase();
  if (s === 'MATH' || s === 'คณิตศาสตร์' || s === 'คณิต') return Subject.MATH;
  if (s === 'THAI' || s === 'ภาษาไทย' || s === 'ไทย') return Subject.THAI;
  if (s === 'SCIENCE' || s === 'วิทยาศาสตร์' || s === 'วิทย์') return Subject.SCIENCE;
  if (s === 'ENGLISH' || s === 'ภาษาอังกฤษ' || s === 'อังกฤษ') return Subject.ENGLISH;
  return Subject.MATH; 
};

export const fetchAppData = async (): Promise<AppData> => {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === '') {
    console.log("⚠️ Demo Mode");
    return { students: MOCK_STUDENTS, questions: MOCK_QUESTIONS, results: [], assignments: [] };
  }

  try {
    const targetUrl = `${GOOGLE_SCRIPT_URL}?type=json`;
    const response = await fetch(targetUrl);
    const textData = await response.text();

    if (textData.trim().startsWith('<')) throw new Error('Invalid JSON response');

    const data = JSON.parse(textData);
    
    const cleanStudents = (data.students || []).map((s: any) => ({
      ...s, id: String(s.id).trim(), stars: Number(s.stars) || 0
    }));

    const cleanQuestions = (data.questions || []).map((q: any) => ({
      ...q, id: String(q.id).trim(), subject: normalizeSubject(q.subject),
      choices: q.choices.map((c: any) => ({ ...c, id: String(c.id) })),
      correctChoiceId: String(q.correctChoiceId)
    }));

    const cleanResults = (data.results || []).map((r: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      studentId: String(r.studentId),
      subject: normalizeSubject(r.subject),
      score: Number(r.score),
      totalQuestions: Number(r.total),
      timestamp: new Date(r.timestamp).getTime(),
      assignmentId: r.assignmentId !== '-' ? r.assignmentId : undefined
    }));

    // ✅ ดึงข้อมูลการบ้าน
    const cleanAssignments = (data.assignments || []).map((a: any) => ({
      id: String(a.id),
      school: String(a.school),
      subject: normalizeSubject(a.subject),
      questionCount: Number(a.questionCount),
      deadline: String(a.deadline).split('T')[0], // เอาแค่วันที่
      createdBy: String(a.createdBy)
    }));

    return {
      students: cleanStudents,
      questions: cleanQuestions,
      results: cleanResults,
      assignments: cleanAssignments
    };

  } catch (error) {
    console.error("Fetch error:", error);
    return { students: MOCK_STUDENTS, questions: MOCK_QUESTIONS, results: [], assignments: [] };
  }
};
