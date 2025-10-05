import React, { useState, useMemo, useEffect } from 'react';
import { Quiz, McqQuestion, ShortAnswerQuestion, LongAnswerQuestion, QuizResult, QuizFeedback } from '../../types';
import { evaluateMultipleAnswersWithGemini, generateQuizFeedbackSummary, evaluateUltimateTestAnswersWithGemini } from '../../services/geminiService';
import { SparklesIcon } from '../icons/SparklesIcon';
import { formatAiResponse } from './TopicWorkspace';

interface QuizViewerProps {
  quiz: Quiz;
  onClear: () => void;
  isUltimateTest?: boolean;
  onQuizSubmit: (result: QuizResult) => void;
  learningContext: string;
  quizType: string;
  onSaveFeedback: (feedbackSummary: string, quizType: string) => void;
}

const McqItem: React.FC<{ item: McqQuestion; onAnswer: (answer: string) => void; isSubmitted: boolean; }> = ({ item, onAnswer, isSubmitted }) => {
    const isAnswered = !!item.userAnswer;
    const isCorrect = isAnswered && item.userAnswer === item.answer;

    return (
        <div className={`bg-slate-700/50 p-4 rounded-lg border-l-4 ${isSubmitted ? (isCorrect ? 'border-green-500' : 'border-red-500') : 'border-slate-600'}`}>
            <p className="font-semibold text-slate-200 text-lg">{item.question}</p>
            <div className="mt-3 space-y-2">
                {item.options.map((option, i) => {
                    const isSelected = item.userAnswer === option;
                    const isTheCorrectAnswer = item.answer === option;
                    
                    let buttonClass = "w-full text-left p-2 rounded-md transition-colors text-slate-300 bg-slate-600/50 hover:bg-slate-600";
                    if(isSubmitted) {
                        if (isTheCorrectAnswer) {
                           buttonClass = "w-full text-left p-2 rounded-md text-white bg-green-500/50";
                        } else if (isSelected) {
                            buttonClass = "w-full text-left p-2 rounded-md text-white bg-red-500/50";
                        } else {
                            buttonClass = "w-full text-left p-2 rounded-md text-slate-300 bg-slate-600/50 opacity-70";
                        }
                    } else if (isSelected) {
                        buttonClass = "w-full text-left p-2 rounded-md text-white bg-cyan-600";
                    }

                    return (
                        <button key={i} onClick={() => onAnswer(option)} disabled={isSubmitted} className={`${buttonClass} disabled:cursor-not-allowed`}>
                            {option}
                        </button>
                    )
                })}
            </div>
            {isSubmitted && item.explanation && (
                <div className="mt-4 bg-slate-800 p-3 rounded-md border border-slate-600">
                    <h5 className="font-bold text-cyan-400 text-xs uppercase tracking-wider">Explanation</h5>
                    <p className="mt-1 text-sm text-slate-300">{item.explanation}</p>
                </div>
            )}
        </div>
    );
};

const assessmentStyles = {
    correct: 'border-green-500',
    partially_correct: 'border-yellow-500',
    needs_more_work: 'border-yellow-500',
    incorrect: 'border-red-500',
    default: 'border-slate-600',
};

const AnswerItem: React.FC<{ 
    item: ShortAnswerQuestion | LongAnswerQuestion;
    onAnswer: (answer: string) => void;
    isSubmitted: boolean;
    isUltimateTest: boolean;
}> = ({ item, onAnswer, isSubmitted, isUltimateTest }) => {
    const borderColorClass = isSubmitted && item.assessment 
        ? assessmentStyles[item.assessment] || assessmentStyles.default
        : assessmentStyles.default;
    const modelAnswer = 'answer' in item ? item.answer : item.modelAnswer;

    return (
        <div className={`bg-slate-700/50 p-4 rounded-lg border-l-4 ${borderColorClass}`}>
           <p className="font-semibold text-slate-200 text-lg">{item.question}</p>
           <textarea
                value={item.userAnswer || ''}
                onChange={(e) => onAnswer(e.target.value)}
                placeholder="Your answer..."
                className="mt-3 w-full p-2 bg-slate-800 border border-slate-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 transition text-slate-300"
                rows={'points_to_cover' in item ? 6 : 4}
                disabled={isSubmitted}
            />
            {isSubmitted && (
                 <div className="mt-3 space-y-3">
                    {item.feedback && (
                        <div className="bg-slate-800 p-3 rounded-md border border-slate-600">
                            <h5 className="font-bold text-cyan-400 text-xs">AI FEEDBACK</h5>
                            <div className="mt-1 text-sm text-slate-300 prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatAiResponse(item.feedback) }} />
                        </div>
                    )}
                    {'points_to_cover' in item && item.points_to_cover && item.points_to_cover.length > 0 && (
                        <div className="bg-slate-800 p-3 rounded-md border border-slate-600">
                            <h5 className="font-bold text-violet-400 text-xs">KEY CONCEPTS TO INCLUDE</h5>
                            <ul className="mt-1 text-sm text-slate-300 list-disc list-inside space-y-1">
                                {item.points_to_cover.map((point, index) => <li key={index}>{point}</li>)}
                            </ul>
                        </div>
                    )}
                    {modelAnswer && !isUltimateTest && (
                        <div className="bg-slate-800 p-3 rounded-md border border-slate-600">
                            <h5 className="font-bold text-green-400 text-xs">MODEL ANSWER</h5>
                            <p className="mt-1 text-sm text-slate-300">{modelAnswer}</p>
                        </div>
                    )}
                 </div>
            )}
        </div>
    );
};

const formatFeedbackObjectToString = (feedback: QuizFeedback): string => {
    let markdown = `### Overall Performance Summary\n${feedback.overallSummary}\n\n`;

    const analysis = feedback.analysisByQuestionType;
    if (analysis.mcq || analysis.short || analysis.long) {
        markdown += `### Analysis by Question Type\n`;
        if (analysis.mcq) markdown += `**Multiple Choice:** ${analysis.mcq}\n`;
        if (analysis.short) markdown += `**Short Answer:** ${analysis.short}\n`;
        if (analysis.long) markdown += `**Long Answer:** ${analysis.long}\n`;
        markdown += `\n`;
    }

    if (feedback.keyStrengths?.length > 0) {
        markdown += `### Key Strengths\n`;
        feedback.keyStrengths.forEach(strength => {
            markdown += `* ${strength}\n`;
        });
        markdown += `\n`;
    }
    
    if (feedback.areasForImprovement?.length > 0) {
        markdown += `### Areas for Improvement\n`;
        feedback.areasForImprovement.forEach(area => {
            markdown += `* **${area.concept}:** ${area.suggestion}\n`;
        });
    }

    return markdown;
};

const formatUltimateTestResultsToString = (quiz: Quiz, score: number): string => {
    let markdown = `### Ultimate Test Results\n**Final Score: ${score.toFixed(0)}%**\n\n---\n\n`;

    if (quiz.mcqs && quiz.mcqs.length > 0) {
        markdown += `#### Multiple Choice Questions\n`;
        quiz.mcqs.forEach((q, i) => {
            const status = q.userAnswer === q.answer ? '✅ Correct' : '❌ Incorrect';
            markdown += `**Q${i+1}:** ${q.question}\n- **Your Answer:** ${q.userAnswer || 'Not answered'}\n- **Correct Answer:** ${q.answer}\n- **Status:** ${status}\n\n`;
        });
        markdown += `---\n\n`;
    }

    if (quiz.short_answers && quiz.short_answers.length > 0) {
        markdown += `#### Short Answer Questions\n`;
        const shortMcqCount = quiz.mcqs?.length || 0;
        quiz.short_answers.forEach((q, i) => {
            let assessmentText = q.assessment?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not Graded';
            markdown += `**Q${shortMcqCount + i + 1}:** ${q.question}\n- **Your Answer:**\n> ${q.userAnswer?.replace(/\n/g, '\n> ') || '*Not answered*'}\n- **Assessment:** ${assessmentText}\n- **Feedback:** ${q.feedback}\n\n`;
        });
        markdown += `---\n\n`;
    }
    
    if (quiz.long_answers && quiz.long_answers.length > 0) {
        markdown += `#### Long Answer Questions\n`;
        const longMcqShortCount = (quiz.mcqs?.length || 0) + (quiz.short_answers?.length || 0);
        quiz.long_answers.forEach((q, i) => {
            let assessmentText = q.assessment?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not Graded';
            markdown += `**Q${longMcqShortCount + i + 1}:** ${q.question}\n- **Your Answer:**\n> ${q.userAnswer?.replace(/\n/g, '\n> ') || '*Not answered*'}\n- **Assessment:** ${assessmentText}\n- **Feedback:** ${q.feedback}\n\n`;
        });
    }

    return markdown;
};


const QuizViewer: React.FC<QuizViewerProps> = ({ quiz, onClear, isUltimateTest = false, onQuizSubmit, learningContext, quizType, onSaveFeedback }) => {
    const [currentQuiz, setCurrentQuiz] = useState(quiz);
    const [view, setView] = useState<'questioning' | 'submitting' | 'results'>('questioning');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [feedbackSummary, setFeedbackSummary] = useState<QuizFeedback | null>(null);

    const allQuestions = useMemo(() => {
        const mcqs = (quiz.mcqs || []).map((q, i) => ({ ...q, type: 'mcq' as const, originalIndex: i }));
        const shorts = (quiz.short_answers || []).map((q, i) => ({ ...q, type: 'short' as const, originalIndex: i }));
        const longs = (quiz.long_answers || []).map((q, i) => ({ ...q, type: 'long' as const, originalIndex: i }));
        return [...mcqs, ...shorts, ...longs];
    }, [quiz]);

    const handleClearAndReset = () => {
        onClear();
        setView('questioning');
        setCurrentQuestionIndex(0);
        setFeedbackSummary(null);
    };

    const handleUpdateAnswer = (answer: string) => {
        const question = allQuestions[currentQuestionIndex];
        if (!question) return;

        const newQuiz = JSON.parse(JSON.stringify(currentQuiz));
        if (question.type === 'mcq' && newQuiz.mcqs) {
            newQuiz.mcqs[question.originalIndex].userAnswer = answer;
        } else if (question.type === 'short' && newQuiz.short_answers) {
            newQuiz.short_answers[question.originalIndex].userAnswer = answer;
        } else if (question.type === 'long' && newQuiz.long_answers) {
            newQuiz.long_answers[question.originalIndex].userAnswer = answer;
        }
        setCurrentQuiz(newQuiz);
    };

    const handleNext = () => currentQuestionIndex < allQuestions.length - 1 && setCurrentQuestionIndex(prev => prev + 1);
    const handlePrev = () => currentQuestionIndex > 0 && setCurrentQuestionIndex(prev => prev - 1);

    const handleSubmit = async () => {
        setView('submitting');
        try {
            const finalQuizState = { ...currentQuiz };
            const questionsToGrade = [
                ...(finalQuizState.short_answers || []),
                ...(finalQuizState.long_answers || [])
            ];

            if (questionsToGrade.length > 0) {
                const gradedResults = isUltimateTest
                    ? await evaluateUltimateTestAnswersWithGemini(questionsToGrade, learningContext)
                    : await evaluateMultipleAnswersWithGemini(questionsToGrade, learningContext);
                
                const gradedResultsMap = new Map(gradedResults.map(r => [r.question_id, r]));
                const shortCount = finalQuizState.short_answers?.length || 0;

                finalQuizState.short_answers = (finalQuizState.short_answers || []).map((q, index) => {
                    const result = gradedResultsMap.get(index);
                    return result ? { ...q, feedback: result.feedback, assessment: result.assessment } : { ...q, feedback: "AI evaluation was not available for this question.", assessment: 'incorrect' as const };
                });
                finalQuizState.long_answers = (finalQuizState.long_answers || []).map((q, index) => {
                    const result = gradedResultsMap.get(index + shortCount);
                    return result ? { ...q, feedback: result.feedback, assessment: result.assessment } : { ...q, feedback: "AI evaluation was not available for this question.", assessment: 'incorrect' as const };
                });
            }
            
            let summaryForSubmission: QuizFeedback | null = null;
            if (!isUltimateTest) {
                const summaryResult = await generateQuizFeedbackSummary(finalQuizState, learningContext);
                setFeedbackSummary(summaryResult);
                summaryForSubmission = summaryResult;
            }

            setCurrentQuiz(finalQuizState);

            const mcqCorrect = finalQuizState.mcqs?.filter(q => q.userAnswer === q.answer).length || 0;
            const shortCorrect = finalQuizState.short_answers?.filter(q => q.assessment === 'correct').length || 0;
            const longCorrect = finalQuizState.long_answers?.filter(q => q.assessment === 'correct').length || 0;
            const totalCorrect = mcqCorrect + shortCorrect + longCorrect;
            const totalQuestions = allQuestions.length;
            const finalScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
            
            onQuizSubmit({
                id: Date.now().toString(),
                date: new Date().toISOString(),
                type: quizType,
                score: finalScore,
                feedbackSummary: summaryForSubmission ? formatFeedbackObjectToString(summaryForSubmission) : undefined,
                quizState: finalQuizState
            });
            setView('results');
        } catch (error) {
            console.error("Failed to grade quiz:", error);
            alert("An error occurred while grading the quiz. Please try again.");
            setView('questioning');
        }
    };

    const currentQuestionData = allQuestions[currentQuestionIndex];
    
    if (view === 'submitting') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <SparklesIcon className="h-12 w-12 text-cyan-400 animate-pulse" />
                <p className="mt-4 text-lg text-cyan-400 font-semibold">Grading Your Answers...</p>
                <p className="text-slate-400">The AI is analyzing your responses. This may take a moment.</p>
            </div>
        );
    }

    if (view === 'results') {
        const mcqCorrect = currentQuiz.mcqs?.filter(q => q.userAnswer === q.answer).length || 0;
        const shortCorrect = currentQuiz.short_answers?.filter(q => q.assessment === 'correct').length || 0;
        const longCorrect = currentQuiz.long_answers?.filter(q => q.assessment === 'correct').length || 0;
        const totalCorrect = mcqCorrect + shortCorrect + longCorrect;
        const score = allQuestions.length > 0 ? (totalCorrect / allQuestions.length) * 100 : 0;

        return (
            <div className="p-4 sm:p-6 h-full flex flex-col">
                <div className="flex-shrink-0 mb-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-white">Quiz Results</h3>
                        <p className="text-lg text-slate-300">Final Score: <span className="font-bold text-cyan-400">{score.toFixed(0)}%</span> ({totalCorrect} / {allQuestions.length})</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isUltimateTest && (
                            <button 
                                onClick={() => onSaveFeedback(formatUltimateTestResultsToString(currentQuiz, score), 'Ultimate Test')} 
                                className="px-3 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md shadow-sm transition-colors"
                            >
                                Save Results
                            </button>
                        )}
                        <button onClick={handleClearAndReset} className="text-sm bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded transition-colors">Finish Review</button>
                    </div>
                </div>
                <div className="overflow-y-auto flex-grow pr-2 space-y-6">
                    {feedbackSummary && (
                         <div className="bg-slate-700/50 p-4 rounded-lg border border-cyan-500/50">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-cyan-300 text-base">AI Performance Summary</h4>
                                <button onClick={() => onSaveFeedback(formatFeedbackObjectToString(feedbackSummary), quizType)} className="px-3 py-1 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md shadow-sm transition-colors">
                                    Save Feedback
                                </button>
                            </div>
                            <div className="space-y-4 text-sm prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatAiResponse(formatFeedbackObjectToString(feedbackSummary))}}/>
                        </div>
                    )}
                    <h4 className="font-bold text-white text-base pt-4">Detailed Question Review</h4>
                    {allQuestions.map((q, i) => {
                        if (q.type === 'mcq') return <McqItem key={i} item={currentQuiz.mcqs![q.originalIndex]} onAnswer={()=>{}} isSubmitted={true} />;
                        if (q.type === 'short') return <AnswerItem key={i} item={currentQuiz.short_answers![q.originalIndex]} onAnswer={()=>{}} isSubmitted={true} isUltimateTest={isUltimateTest} />;
                        if (q.type === 'long') return <AnswerItem key={i} item={currentQuiz.long_answers![q.originalIndex]} onAnswer={()=>{}} isSubmitted={true} isUltimateTest={isUltimateTest} />;
                        return null;
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
             <div className="flex-shrink-0 mb-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">{quizType}</h3>
                    <button onClick={handleClearAndReset} className="text-xs text-slate-400 hover:text-red-400 font-semibold transition-colors">Cancel Quiz</button>
                </div>
                <div className="mt-2 w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / allQuestions.length) * 100}%` }}></div>
                </div>
                 <p className="text-right text-sm text-slate-400 mt-1">Question {currentQuestionIndex + 1} of {allQuestions.length}</p>
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
                {currentQuestionData.type === 'mcq' && <McqItem item={currentQuiz.mcqs![currentQuestionData.originalIndex]} onAnswer={handleUpdateAnswer} isSubmitted={false} />}
                {currentQuestionData.type === 'short' && <AnswerItem item={currentQuiz.short_answers![currentQuestionData.originalIndex]} onAnswer={handleUpdateAnswer} isSubmitted={false} isUltimateTest={isUltimateTest} />}
                {currentQuestionData.type === 'long' && <AnswerItem item={currentQuiz.long_answers![currentQuestionData.originalIndex]} onAnswer={handleUpdateAnswer} isSubmitted={false} isUltimateTest={isUltimateTest} />}
            </div>
            <div className="mt-6 flex-shrink-0 flex justify-between items-center">
                <button onClick={handlePrev} disabled={currentQuestionIndex === 0} className="px-6 py-2 bg-slate-700 rounded-md hover:bg-slate-600 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                {currentQuestionIndex < allQuestions.length - 1 ? (
                    <button onClick={handleNext} className="px-6 py-2 bg-cyan-600 rounded-md hover:bg-cyan-500 font-semibold text-white">Next</button>
                ) : (
                    <button onClick={handleSubmit} className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-md hover:opacity-90 font-bold text-white">Submit & Grade</button>
                )}
            </div>
        </div>
    );
};

export default QuizViewer;