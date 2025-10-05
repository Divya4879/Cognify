// FIX: Import React to resolve "Cannot find namespace 'React'" error.
import React from 'react';

export interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export enum AITask {
  OVERVIEW = 'OVERVIEW',
  IN_DEPTH = 'IN_DEPTH',
  KEY_TAKEAWAYS = 'KEY_TAKEAWAYS',
  ANECDOTES = 'ANECDOTES',
  RESOURCES = 'RESOURCES',
  FLASHCARDS = 'FLASHCARDS',
  QUIZ_MCQ = 'QUIZ_MCQ',
  QUIZ_SHORT = 'QUIZ_SHORT',
  QUIZ_LONG = 'QUIZ_LONG',
  ULTIMATE_TEST = 'ULTIMATE_TEST',
  FLOWCHART = 'FLOWCHART',
  DIAGRAM = 'DIAGRAM',
  PDF_ANALYSIS = 'PDF_ANALYSIS',
  AUDIO_ANALYSIS = 'AUDIO_ANALYSIS',
  QUIZ_FEEDBACK = 'QUIZ_FEEDBACK',
}

export enum LearnerType {
  SCHOOL = 'School Student',
  COLLEGE = 'College/University Student',
  EXAM_PREP = 'Competitive Exam Prep',
  PROFESSIONAL = 'Professional',
  SELF_STUDY = 'Self-Studying',
}

export interface UserProfile {
  name: string;
  learnerType: LearnerType | null;
  // School
  schoolGrade?: string; // e.g., "10th Grade"
  // College
  collegeDegree?: string; // e.g., "Bachelor's"
  otherCollegeDegree?: string; // For when 'Other' is selected
  collegeStream?: string; // e.g., "Computer Science Engineering"
  // Exam Prep
  examName?: string;
  // Professional / Self-Studying
  fieldOfStudy?: string;
}

export interface Flashcard {
  front: string;
  back: string;
  status?: 'known' | 'needs_review';
}

export interface McqQuestion {
  question: string;
  options: string[];
  answer: string;
  userAnswer?: string;
  explanation?: string;
}

export interface ShortAnswerQuestion {
  question: string;
  answer: string;
  userAnswer?: string;
  feedback?: string;
  assessment?: 'correct' | 'incorrect' | 'partially_correct' | 'needs_more_work' | null;
}

export interface LongAnswerQuestion {
  question: string;
  points_to_cover: string[];
  modelAnswer: string;
  userAnswer?: string;
  feedback?: string;
  assessment?: 'correct' | 'incorrect' | 'partially_correct' | 'needs_more_work' | null;
}

export interface Quiz {
  mcqs?: McqQuestion[];
  short_answers?: ShortAnswerQuestion[];
  long_answers?: LongAnswerQuestion[];
}

export interface Resource {
  name: string;
  url?: string; // This will be a data URL or an object URL. Made optional to support IndexedDB storage.
}

export interface SyllabusTopic {
    title: string;
    sub_topics: string[];
}

export interface SavedAiContent {
  id: string;
  task: AITask;
  label: string;
  content: string;
}

export interface QuizFeedback {
    overallSummary: string;
    analysisByQuestionType: {
        mcq?: string;
        short?: string;
        long?: string;
    };
    keyStrengths: string[];
    areasForImprovement: { concept: string; suggestion: string }[];
}

export interface QuizResult {
  id: string;
  date: string;
  type: string;
  score: number;
  feedbackSummary?: string;
  quizState: Quiz;
}

export interface AudioAnalysis {
    resourceName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    analysis?: {
        summary: string;
        strongPoints: string;
        weakPoints: string;
        hyperlinks: string;
    };
    errorMessage?: string;
}

export interface Topic {
    id: string;
    title: string;
    description: string | null;
    pdfResources: Resource[];
    audioResources: Resource[];
    notes: string;
    links: string[];
    flashcards?: Flashcard[];
    quiz?: Quiz;
    savedAiContent?: SavedAiContent[];
    quizHistory?: QuizResult[];
    targetScore?: number;
    status?: 'in_progress' | 'done';
    pdfAnalysis?: string;
    audioAnalyses?: AudioAnalysis[];
}

export interface Subject {
    id: string;
    name: string;
    topics: Topic[];
}