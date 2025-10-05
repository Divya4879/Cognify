import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Topic, Subject, UserProfile, LearnerType, AITask, Flashcard, Quiz, Resource, SavedAiContent, McqQuestion, ShortAnswerQuestion, LongAnswerQuestion, QuizResult, AudioAnalysis } from '../../types';
import { processTextWithGemini, refineAiResponse, analyzePdfsForTopic, analyzeTranscript } from '../../services/geminiService';
import { assemblyaiService } from '../../services/assemblyaiService';
import { dbService } from '../../services/db';

import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { LinkIcon } from '../icons/LinkIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { FileTextIcon } from '../icons/FileTextIcon';
import { UploadCloudIcon } from '../icons/UploadCloudIcon';
import { AudioWaveformIcon } from '../icons/AudioWaveformIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';

import { NewspaperIcon } from '../icons/NewspaperIcon';
import { BrainCircuitIcon } from '../icons/BrainCircuitIcon';
import { LightbulbIcon } from '../icons/LightbulbIcon';
import { GraduationCapIcon } from '../icons/GraduationCapIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { StickyNoteIcon } from '../icons/StickyNoteIcon';
import { ListChecksIcon } from '../icons/ListChecksIcon';
import { SitemapIcon } from '../icons/SitemapIcon';
import { ComponentIcon } from '../icons/ComponentIcon';
import { TargetIcon } from '../icons/TargetIcon';

import FlashcardViewer from './FlashcardViewer';
import QuizViewer from './QuizViewer';
import SourceSelectionModal from './SourceSelectionModal';

interface TopicWorkspaceProps {
  subject: Subject;
  topic: Topic;
  onUpdateTopic: (topic: Topic) => void;
  onBack: () => void;
}

const MAX_PDFS = 10;
const MAX_AUDIO_FILES = 5;

// FIX: Export this function to make it available for import in other modules.
export const formatAiResponse = (text: string): string => {
    if (!text) return '';
    let html = text;
    
    // Process blocks of lists first to avoid conflicts
    // Unordered Lists
    html = html.replace(/(?:(?:^|\n)\s*[*+-] (.*))+/g, (match) => {
        const items = match.trim().split('\n').map(item => `<li>${item.replace(/^\s*[*+-] /, '')}</li>`).join('');
        return `<ul>${items}</ul>`;
    });

    // Ordered Lists
    html = html.replace(/(?:(?:^|\n)\s*\d+\. (.*))+/g, (match) => {
        const items = match.trim().split('\n').map(item => `<li>${item.replace(/^\s*\d+\. /, '')}</li>`).join('');
        return `<ol>${items}</ol>`;
    });

    html = html.split('\n\n').map(paragraph => {
        if (!paragraph.trim()) return '';

        let processedParagraph = paragraph
            // Headings
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold and Italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Links
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // If it's already a list or heading block, don't wrap it in <p>
        if (processedParagraph.trim().match(/^<(ul|ol|h[1-3])/)) {
            return processedParagraph;
        }

        // Otherwise, wrap in <p> and handle single newlines as <br>
        return `<p>${processedParagraph.replace(/\n/g, '<br />')}</p>`;
    }).join('');

    return html;
};

const AIToolButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, disabled: boolean }> = ({ icon, label, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} className="flex items-center w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
        <div className="grid place-items-center h-8 w-8 rounded-md bg-slate-600 mr-3 text-cyan-300">{icon}</div>
        <span className="font-semibold text-slate-200">{label}</span>
    </button>
);

const QuizGenerationMenu: React.FC<{ onGenerate: (task: AITask) => void, disabled: boolean }> = ({ onGenerate, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const options = [
        { task: AITask.QUIZ_MCQ, label: "MCQ" },
        { task: AITask.QUIZ_SHORT, label: "Short Answer" },
        { task: AITask.QUIZ_LONG, label: "Long Answer" },
    ];
    const menuRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    return (
        <div className="relative" ref={menuRef}>
            <AIToolButton 
                icon={<ListChecksIcon className="w-5 h-5"/>}
                label="Generate Quiz"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
            />
            {isOpen && (
                <div className="absolute bottom-full mb-2 w-full bg-slate-600 border border-slate-500 rounded-lg shadow-xl z-10 p-1">
                    {options.map(opt => (
                        <button
                            key={opt.task}
                            onClick={() => { onGenerate(opt.task); setIsOpen(false); }}
                            className="block w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-500/50 rounded-md transition-colors"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const AiRefinementPanel: React.FC<{ onRefine: (feedback: string) => void, isLoading: boolean }> = ({ onRefine, isLoading }) => {
    const [feedback, setFeedback] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (feedback.trim()) {
            onRefine(feedback.trim());
            setFeedback('');
        }
    };

    return (
        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <h4 className="text-sm font-semibold text-cyan-300">Refine Response</h4>
            <p className="text-xs text-slate-400 mb-2">Not quite right? Tell the AI how to improve it (e.g., "make it simpler", "add an example").</p>
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Your feedback..."
                    className="flex-grow shadow-sm text-white bg-slate-800 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 block w-full text-sm rounded-md"
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !feedback.trim()} className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    Refine
                </button>
            </form>
        </div>
    );
};

const QuizHistoryViewer: React.FC<{ history: QuizResult[] }> = ({ history }) => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Quiz History</h3>
        {(history && history.length > 0) ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {history.slice().reverse().map(item => (
                    <div key={item.id} className="group flex items-center justify-between bg-slate-700/80 p-2 rounded-md">
                        <div>
                            <p className="font-medium text-slate-200">{item.type}</p>
                            <p className="text-xs text-slate-400">{new Date(item.date).toLocaleString()}</p>
                        </div>
                        <p className={`font-bold text-lg ${item.score >= 80 ? 'text-green-400' : item.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {item.score.toFixed(0)}%
                        </p>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-sm text-slate-400">No quiz attempts recorded yet. Generate and complete a quiz to see your history.</p>
        )}
    </div>
);


const TopicWorkspace: React.FC<TopicWorkspaceProps> = ({ subject, topic, onUpdateTopic, onBack }) => {
    const [editedTopic, setEditedTopic] = useState<Topic>(topic);
    const [newLink, setNewLink] = useState('');
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const [aiOutput, setAiOutput] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [currentAiTask, setCurrentAiTask] = useState<{task: AITask | string, label: string} | null>(null);
    const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
    const [selectedAiTask, setSelectedAiTask] = useState<{task: AITask, label: string} | null>(null);
    const [lastGeneratedTask, setLastGeneratedTask] = useState<{task: AITask, label: string} | null>(null);
    const [isUltimateTestActive, setIsUltimateTestActive] = useState(false);
    const [loadedResourceUrls, setLoadedResourceUrls] = useState<Record<string, string>>({});

    const [activeTab, setActiveTab] = useState<'toolkit' | 'pdf' | 'audio'>('toolkit');
    const [processingAudio, setProcessingAudio] = useState<string | null>(null);
    const [selectedAudioAnalysis, setSelectedAudioAnalysis] = useState<AudioAnalysis | null>(null);

    useEffect(() => {
        const loadResources = async () => {
            const urls: Record<string, string> = {};
            // FIX: Add a type guard to filter out any malformed resource objects that might come from localStorage.
            // This ensures that we only process valid resources with a 'name' property, preventing runtime errors.
            const allResources = [...editedTopic.pdfResources, ...editedTopic.audioResources]
                .filter((r): r is Resource => r && typeof r.name === 'string');
            
            for (const resource of allResources) {
                const resourceData = await dbService.getResource(resource.name, editedTopic.id);
                if (resourceData?.url) {
                    try {
                        const blob: Blob = await (await fetch(resourceData.url)).blob();
                        urls[resource.name] = URL.createObjectURL(blob);
                    } catch (e) {
                        console.error(`Failed to load resource ${resource.name}:`, e);
                    }
                }
            }
            setLoadedResourceUrls(urls);
        };
        loadResources();

        return () => {
            Object.values(loadedResourceUrls).forEach(URL.revokeObjectURL);
        }
    }, [editedTopic.pdfResources, editedTopic.audioResources, editedTopic.id]);

    useEffect(() => {
        // Sync audio analysis state with resources
        const analyses = editedTopic.audioAnalyses || [];
        const resourceNames = new Set(editedTopic.audioResources.map(r => r.name));
        let needsUpdate = false;
        
        let newAnalyses = analyses.filter(a => resourceNames.has(a.resourceName));
        if (newAnalyses.length !== analyses.length) needsUpdate = true;

        const analysisNames = new Set(newAnalyses.map(a => a.resourceName));
        editedTopic.audioResources.forEach(res => {
            if (!analysisNames.has(res.name)) {
                newAnalyses.push({ resourceName: res.name, status: 'pending' });
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            const updatedTopic = { ...editedTopic, audioAnalyses: newAnalyses };
            setEditedTopic(updatedTopic);
            onUpdateTopic(updatedTopic);
        }
    }, [editedTopic.audioResources]);
    
    const handleSave = useCallback(() => {
        onUpdateTopic(editedTopic);
    }, [editedTopic, onUpdateTopic]);

    const handleBlur = (field: keyof Topic) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if( (e.target as any).value !== topic[field]) {
            handleSave();
        }
    }

    const handleInputChange = (field: keyof Topic, value: string | number) => {
        setEditedTopic(prev => ({ ...prev, [field]: value }));
    };

    const handleAddLink = () => {
        if (newLink && !editedTopic.links.includes(newLink)) {
            const updatedTopic = { ...editedTopic, links: [...editedTopic.links, newLink] };
            setEditedTopic(updatedTopic);
            onUpdateTopic(updatedTopic);
            setNewLink('');
        }
    };
    
    const handleRemoveResource = async (type: 'links' | 'pdfResources' | 'audioResources', value: string) => {
        let updatedTopic;
        if (type === 'links') {
            const updatedResources = editedTopic.links.filter(item => item !== value);
            updatedTopic = {...editedTopic, links: updatedResources };
        } else {
            if (type === 'pdfResources' || type === 'audioResources') {
                await dbService.deleteResource(value, editedTopic.id);
                 if (loadedResourceUrls[value]) {
                    URL.revokeObjectURL(loadedResourceUrls[value]);
                    const newUrls = { ...loadedResourceUrls };
                    delete newUrls[value];
                    setLoadedResourceUrls(newUrls);
                }
            }
            const currentResources = editedTopic[type] as Resource[];
            const updatedResources = currentResources.filter((item: Resource) => item.name !== value);
            updatedTopic = {...editedTopic, [type]: updatedResources };
        }
        setEditedTopic(updatedTopic);
        onUpdateTopic(updatedTopic);
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'pdfResources' | 'audioResources') => {
        if (!event.target.files) return;

        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        const limit = type === 'pdfResources' ? MAX_PDFS : MAX_AUDIO_FILES;
        if (editedTopic[type].length + files.length > limit) {
            alert(`You can only upload a maximum of ${limit} ${type === 'pdfResources' ? 'PDF' : 'audio'} files.`);
            return;
        }

        const currentResourceNames = new Set(editedTopic[type].map((r: Resource) => r.name));
        const newFiles = files.filter((file: File) => !currentResourceNames.has(file.name));

        const newResourcesMetadata: Resource[] = [];
        const newAudioAnalyses: AudioAnalysis[] = type === 'audioResources' ? (editedTopic.audioAnalyses || []) : [];

        for (const file of newFiles) {
             const reader = new FileReader();
             reader.readAsDataURL(file);
             await new Promise<void>((resolve, reject) => {
                reader.onload = async (e) => {
                    try {
                        if (e.target?.result) {
                            const resource: Resource = { name: file.name, url: e.target.result as string };
                            await dbService.addResource(subject.id, editedTopic.id, resource);
                            newResourcesMetadata.push({ name: file.name });
                            if (type === 'audioResources') {
                                newAudioAnalyses.push({ resourceName: file.name, status: 'pending' });
                            }
                            resolve();
                        } else {
                            reject(new Error("Failed to read file"));
                        }
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = reject;
             });
        }
        
        if (newResourcesMetadata.length > 0) {
            let updatedTopic = { ...editedTopic, [type]: [...editedTopic[type], ...newResourcesMetadata] };
            if (type === 'audioResources') {
                updatedTopic = { ...updatedTopic, audioAnalyses: newAudioAnalyses };
            }
            setEditedTopic(updatedTopic);
            onUpdateTopic(updatedTopic);
        }

        event.target.value = '';
    };

    const getLearningContext = (): string => {
        const storedProfile = localStorage.getItem('cognifyProfile');
        if (!storedProfile) return 'University Student'; // Default

        try {
            const profile: UserProfile = JSON.parse(storedProfile);
            switch (profile.learnerType) {
                case LearnerType.SCHOOL:
                    return `School Student in ${profile.schoolGrade || 'their grade'}`;
                case LearnerType.COLLEGE:
                    const degree = profile.collegeDegree === 'Other' ? profile.otherCollegeDegree : profile.collegeDegree;
                    return `${degree || 'University'} student studying ${profile.collegeStream || 'their field'}`;
                case LearnerType.EXAM_PREP:
                    return `student preparing for the ${profile.examName || 'a competitive exam'}`;
                case LearnerType.PROFESSIONAL:
                    return `Professional in the field of ${profile.fieldOfStudy || 'their industry'}`;
                case LearnerType.SELF_STUDY:
                    return `self-studying learner focusing on ${profile.fieldOfStudy || 'their chosen topic'}`;
                default:
                    return 'learner';
            }
        } catch (error) {
            console.error("Failed to parse user profile", error);
            return 'University Student';
        }
    };

    const executeAiGeneration = useCallback(async (task: AITask, source: 'notes' | 'pdfs' | 'ai', label: string, revisionContext?: string) => {
        let sourceContent: string | Resource[];
        setCurrentAiTask({task, label});
        setIsAiLoading(true);

        if (source === 'notes') {
            sourceContent = editedTopic.notes;
        } else if (source === 'pdfs') {
            sourceContent = await dbService.getResourcesForTopic(editedTopic.id);
        } else { // 'ai'
            sourceContent = ''; // Empty string signals to the service to use AI's own knowledge
        }
        
        if (source !== 'ai' && ((typeof sourceContent === 'string' && !sourceContent.trim()) || (Array.isArray(sourceContent) && sourceContent.length === 0))) {
            alert(`Please add some ${source} before using this AI feature.`);
            setIsAiLoading(false);
            setCurrentAiTask(null);
            return;
        }

        setAiOutput(null);
        setLastGeneratedTask(null);
        setIsUltimateTestActive(task === AITask.ULTIMATE_TEST);

        const learningContext = getLearningContext();

        try {
            const result = await processTextWithGemini(
                task,
                sourceContent,
                learningContext,
                subject.name,
                editedTopic.title,
                revisionContext
            );
            
            let updatedTopic = { ...editedTopic };
            if (task === AITask.FLASHCARDS && Array.isArray(result)) {
                updatedTopic = { ...updatedTopic, flashcards: result };
                 setAiOutput(null);
            } else if (task.startsWith('QUIZ_') && typeof result === 'object' && result !== null) {
                updatedTopic = { ...updatedTopic, quiz: result as Quiz };
                 setAiOutput(null);
            } else if (task === AITask.ULTIMATE_TEST && typeof result === 'object' && result !== null) {
                 updatedTopic = { ...updatedTopic, quiz: result as Quiz };
                 setAiOutput(null);
            } else if (typeof result === 'string') {
                setAiOutput(result);
                setLastGeneratedTask({ task, label });
            }
            
            setEditedTopic(updatedTopic);
            onUpdateTopic(updatedTopic);

        } catch (e) {
            console.error(e);
            let errorMessage = "Sorry, an unexpected error occurred.";
            if (e instanceof Error) {
                if (e.message.includes('API key not valid')) {
                    errorMessage = "AI Error: Your API key is not valid. Please check your configuration."
                } else if (e.message.includes('fetch')) {
                    errorMessage = "Network Error: Could not connect to the AI service. Please check your internet connection."
                } else {
                    errorMessage = `AI Error: ${e.message}`;
                }
            }
            setAiOutput(errorMessage);
        } finally {
            setIsAiLoading(false);
            setCurrentAiTask(null);
        }
    }, [editedTopic, onUpdateTopic, subject.name]);

    const handleAiToolClick = (task: AITask, label: string) => {
        const hasNotes = editedTopic.notes.trim().length > 0;
        const hasPdfs = editedTopic.pdfResources.length > 0;

        if (hasNotes && !hasPdfs) {
            executeAiGeneration(task, 'notes', label);
        } else if (!hasPdfs && hasPdfs) {
            executeAiGeneration(task, 'pdfs', label);
        } else if (hasNotes && hasPdfs) {
            setSelectedAiTask({ task, label });
            setIsSourceModalOpen(true);
        } else { // has neither
            executeAiGeneration(task, 'ai', label);
        }
    };

    const handleSourceSelected = (source: 'notes' | 'pdfs') => {
        if (selectedAiTask) {
            executeAiGeneration(selectedAiTask.task, source, selectedAiTask.label);
        }
        setIsSourceModalOpen(false);
        setSelectedAiTask(null);
    };

    const handleUpdateFlashcards = (updatedFlashcards: Flashcard[]) => {
        const updatedTopic = { ...editedTopic, flashcards: updatedFlashcards };
        setEditedTopic(updatedTopic);
        onUpdateTopic(updatedTopic);
    };

    const handleQuizSubmitted = (result: QuizResult) => {
        const history = editedTopic.quizHistory || [];
        const isMastered = result.score >= (editedTopic.targetScore || 80);
        
        const updatedTopic = { 
            ...editedTopic, 
            quiz: result.quizState, 
            quizHistory: [...history, result],
            status: isUltimateTestActive && isMastered ? 'done' : editedTopic.status,
        };
        setEditedTopic(updatedTopic);
        onUpdateTopic(updatedTopic);
        setIsUltimateTestActive(false); // Test is now complete
    };
    
    const handleSaveAiContent = () => {
        if (!aiOutput || !lastGeneratedTask) return;
        const newSavedItem: SavedAiContent = {
            id: Date.now().toString(),
            task: lastGeneratedTask.task as AITask,
            label: lastGeneratedTask.label,
            content: aiOutput,
        };
        const currentSaved = editedTopic.savedAiContent || [];
        const updatedTopic = { ...editedTopic, savedAiContent: [...currentSaved, newSavedItem] };
        setEditedTopic(updatedTopic);
        onUpdateTopic(updatedTopic);
        setAiOutput(null);
        setLastGeneratedTask(null);
    };

    const handleViewSavedContent = (item: SavedAiContent) => {
        setAiOutput(item.content);
        setLastGeneratedTask({ task: item.task, label: item.label });
        setEditedTopic(prev => ({ ...prev, quiz: undefined, flashcards: undefined }));
        setActiveTab('toolkit');
    };

    const handleDeleteSavedContent = (id: string) => {
        const updatedSavedContent = (editedTopic.savedAiContent || []).filter(item => item.id !== id);
        const updatedTopic = { ...editedTopic, savedAiContent: updatedSavedContent };
        setEditedTopic(updatedTopic);
        onUpdateTopic(updatedTopic);
        if (aiOutput && !updatedSavedContent.some(item => item.content === aiOutput)) {
            setAiOutput(null);
        }
    };
    
    const getLoadingMessage = () => {
        if (!currentAiTask) return { title: "Generating Content...", message: "The AI is working its magic. Please wait." };
        switch (currentAiTask.task) {
            case 'PDF_ANALYSIS':
                return { title: "Analyzing PDFs...", message: "Extracting relevant information from your documents."};
            case AITask.QUIZ_MCQ:
            case AITask.QUIZ_SHORT:
            case AITask.QUIZ_LONG:
            case AITask.ULTIMATE_TEST:
                return { title: "Building Your Test...", message: "Crafting questions to challenge your knowledge." };
            case AITask.FLASHCARDS:
                return { title: "Creating Flashcards...", message: "Designing bite-sized learning cards for you." };
            case AITask.IN_DEPTH:
                return { title: "Diving Deeper...", message: "Preparing a comprehensive explanation." };
            case AITask.FLOWCHART:
                return { title: "Designing a Flowchart...", message: "Mapping out the concepts visually." };
            case AITask.DIAGRAM:
                return { title: "Illustrating a Diagram...", message: "Creating a visual aid for you." };
            default:
                return { title: `Generating ${currentAiTask.label}...`, message: "The AI is working its magic. Please wait." };
        }
    };
    
    const handleRefineResponse = async (feedback: string) => {
        if (!aiOutput) return;
        setIsAiLoading(true);
        setCurrentAiTask({ task: AITask.IN_DEPTH, label: "Refined Content" });
        try {
            const refinedContent = await refineAiResponse(aiOutput, feedback, getLearningContext());
            setAiOutput(refinedContent);
        } catch (error) {
            console.error("Failed to refine response", error);
            alert("Sorry, there was an error refining the content. Please try again.");
        } finally {
            setIsAiLoading(false);
            setCurrentAiTask(null);
        }
    };

    const handleAnalyzePdfs = async () => {
        if (editedTopic.pdfResources.length === 0) {
            alert("Please upload at least one PDF to analyze.");
            return;
        }
        setIsAiLoading(true);
        setCurrentAiTask({ task: 'PDF_ANALYSIS', label: "PDF Analysis" });
        try {
            const pdfs = await dbService.getResourcesForTopic(editedTopic.id);
            const result = await analyzePdfsForTopic(pdfs, getLearningContext(), subject.name, editedTopic.title);
            const updatedTopic = { ...editedTopic, pdfAnalysis: result };
            setEditedTopic(updatedTopic);
            onUpdateTopic(updatedTopic);
        } catch (error) {
            console.error("PDF Analysis failed:", error);
            const updatedTopic = { ...editedTopic, pdfAnalysis: `**Error:** Analysis failed. ${error instanceof Error ? error.message : ''}` };
            setEditedTopic(updatedTopic);
            onUpdateTopic(updatedTopic);
        } finally {
            setIsAiLoading(false);
            setCurrentAiTask(null);
        }
    };

    const handleAnalyzeAudio = async (resourceName: string) => {
        setProcessingAudio(resourceName);
        
        const updateAnalysisStatus = (status: AudioAnalysis['status'], data: Partial<AudioAnalysis> = {}) => {
            setEditedTopic(prev => {
                const updatedAnalyses = (prev.audioAnalyses || []).map(a => 
                    a.resourceName === resourceName ? { ...a, status, ...data } : a
                );
                const updatedTopic = { ...prev, audioAnalyses: updatedAnalyses };
                onUpdateTopic(updatedTopic); // Persist immediately
                return updatedTopic;
            });
        };
        
        updateAnalysisStatus('processing');

        try {
            const resourceData = await dbService.getResource(resourceName, editedTopic.id);
            if (!resourceData?.url) throw new Error("Audio file data not found.");

            const transcript = await assemblyaiService.transcribeAudio(resourceData.url);
            if (!transcript) throw new Error("Transcription returned empty.");

            const analysis = await analyzeTranscript(transcript, getLearningContext(), editedTopic.title);
            updateAnalysisStatus('completed', { analysis });

        } catch (error) {
            console.error("Audio analysis failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            updateAnalysisStatus('failed', { errorMessage });
        } finally {
            setProcessingAudio(null);
        }
    };

    const handleSavePdfAnalysis = () => {
        if (!editedTopic.pdfAnalysis || editedTopic.pdfAnalysis.startsWith('**Error:**')) return;
        
        const newSavedItem: SavedAiContent = {
            id: Date.now().toString(),
            task: AITask.PDF_ANALYSIS,
            label: "PDF Analysis Summary",
            content: editedTopic.pdfAnalysis,
        };
        const currentSaved = editedTopic.savedAiContent || [];
        const updatedTopic = { ...editedTopic, savedAiContent: [...currentSaved, newSavedItem] };
        setEditedTopic(updatedTopic);
        onUpdateTopic(updatedTopic);
        alert('PDF analysis has been saved to your "Saved AI Content" list.');
    };

    const formatAnalysisForSaving = (analysis: AudioAnalysis): string => {
        const parts = [];
        parts.push(`**Analysis for: ${analysis.resourceName}**\n`);
        if (analysis.analysis?.summary) {
            parts.push(`**Summary:**\n${analysis.analysis.summary}\n`);
        }
        if (analysis.analysis?.strongPoints) {
            parts.push(`**Strong Points:**\n${analysis.analysis.strongPoints}\n`);
        }
        if (analysis.analysis?.weakPoints) {
            parts.push(`**Areas for Improvement:**\n${analysis.analysis.weakPoints}\n`);
        }
        if (analysis.analysis?.hyperlinks) {
            parts.push(`**Helpful Links:**\n${analysis.analysis.hyperlinks}`);
        }
        return parts.join('\n');
    }

    const handleSaveAudioAnalysis = () => {
        if (!selectedAudioAnalysis || !selectedAudioAnalysis.analysis) return;
        
        const contentToSave = formatAnalysisForSaving(selectedAudioAnalysis);

        const newSavedItem: SavedAiContent = {
            id: Date.now().toString(),
            task: AITask.AUDIO_ANALYSIS,
            label: `Analysis: ${selectedAudioAnalysis.resourceName}`,
            content: contentToSave,
        };
        const currentSaved = editedTopic.savedAiContent || [];
        const updatedTopic = { ...editedTopic, savedAiContent: [...currentSaved, newSavedItem] };
        setEditedTopic(updatedTopic);
        onUpdateTopic(updatedTopic);
        alert(`Analysis for ${selectedAudioAnalysis.resourceName} has been saved.`);
    };

    const handleSaveQuizFeedback = (feedbackSummary: string, quizType: string) => {
        if (!feedbackSummary) return;

        const newSavedItem: SavedAiContent = {
            id: Date.now().toString(),
            task: AITask.QUIZ_FEEDBACK,
            label: `${quizType} Performance Summary`,
            content: feedbackSummary,
        };
        
        const currentSaved = editedTopic.savedAiContent || [];
        const updatedTopic = { ...editedTopic, savedAiContent: [...currentSaved, newSavedItem] };
        setEditedTopic(updatedTopic);
        onUpdateTopic(updatedTopic);
        alert('Quiz feedback has been saved to your "Saved AI Content" list.');
    };

    const renderAiOutput = () => {
        if (editedTopic.flashcards) {
            return <FlashcardViewer 
                flashcards={editedTopic.flashcards} 
                onUpdateFlashcards={handleUpdateFlashcards} 
                onClear={() => {
                    const updatedTopic = { ...editedTopic, flashcards: undefined };
                    setEditedTopic(updatedTopic);
                    onUpdateTopic(updatedTopic);
                }}
            />;
        }
        
        if (editedTopic.quiz) {
            const quizType = isUltimateTestActive ? 'Ultimate Test' : (
                editedTopic.quiz.mcqs && editedTopic.quiz.mcqs.length > 0 ? 'MCQ Quiz' :
                editedTopic.quiz.short_answers && editedTopic.quiz.short_answers.length > 0 ? 'Short Answer Quiz' :
                'Long Answer Quiz'
            );

            return <QuizViewer 
                quiz={editedTopic.quiz} 
                isUltimateTest={isUltimateTestActive} 
                onQuizSubmit={handleQuizSubmitted}
                learningContext={getLearningContext()}
                onClear={() => {
                    const updatedTopic = { ...editedTopic, quiz: undefined };
                    setEditedTopic(updatedTopic);
                    onUpdateTopic(updatedTopic);
                }}
                quizType={quizType}
                onSaveFeedback={handleSaveQuizFeedback}
            />;
        }

        if (typeof aiOutput === 'string') {
             if (aiOutput.toLowerCase().includes('error')) {
                 return (
                    <div className="p-6 flex flex-col items-center justify-center text-center h-full">
                        <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mb-4" />
                        <h3 className="text-lg font-semibold text-red-300">Generation Failed</h3>
                        <p className="text-sm text-slate-400 mt-2">{aiOutput}</p>
                    </div>
                 )
             }
             const canBeSaved = lastGeneratedTask !== null;
             const isAscii = lastGeneratedTask && [AITask.FLOWCHART, AITask.DIAGRAM].includes(lastGeneratedTask.task as AITask);

            return (
                <div className="p-4 sm:p-6 h-full flex flex-col">
                    {canBeSaved && (
                        <div className="mb-4 text-right flex-shrink-0">
                            <button onClick={handleSaveAiContent} className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md shadow-sm transition-colors">
                                Save Content
                            </button>
                        </div>
                    )}
                    {isAscii ? (
                        <pre className="flex-grow overflow-auto text-slate-300 text-xs whitespace-pre-wrap font-mono bg-slate-900/50 p-2 rounded-md">{aiOutput}</pre>
                    ) : (
                        <div className="flex-grow overflow-y-auto prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatAiResponse(aiOutput) }} />
                    )}
                    <AiRefinementPanel onRefine={handleRefineResponse} isLoading={isAiLoading} />
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="grid place-items-center h-16 w-16 rounded-full bg-slate-700/50 mb-4">
                    <SparklesIcon className="h-8 w-8 text-cyan-300"/>
                </div>
                <h3 className="text-xl font-bold text-white">AI Output Panel</h3>
                <p className="text-slate-400 mt-2">Your AI-generated content will appear here.</p>
            </div>
        );
    }

    const aiTools = [
        { task: AITask.OVERVIEW, label: "Overview", icon: <NewspaperIcon className="w-5 h-5"/> },
        { task: AITask.IN_DEPTH, label: "In-depth Explanation", icon: <BrainCircuitIcon className="w-5 h-5"/> },
        { task: AITask.KEY_TAKEAWAYS, label: "Key Takeaways", icon: <LightbulbIcon className="w-5 h-5"/> },
        { task: AITask.ANECDOTES, label: "Anecdotes & Hacks", icon: <GraduationCapIcon className="w-5 h-5"/> },
        { task: AITask.RESOURCES, label: "Find Resources", icon: <SearchIcon className="w-5 h-5"/> },
        { task: AITask.FLASHCARDS, label: "Generate Flashcards", icon: <StickyNoteIcon className="w-5 h-5"/> },
        { task: AITask.FLOWCHART, label: "Flowchart", icon: <SitemapIcon className="w-5 h-5" /> },
        { task: AITask.DIAGRAM, label: "Diagram", icon: <ComponentIcon className="w-5 h-5" /> },
    ];

    const TabButton: React.FC<{tabName: 'toolkit' | 'pdf' | 'audio', label: string}> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors -mb-px ${
                activeTab === tabName
                    ? 'text-cyan-300 border-b-2 border-cyan-300'
                    : 'text-slate-400 hover:text-white'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
             <SourceSelectionModal
                isOpen={isSourceModalOpen}
                onClose={() => setIsSourceModalOpen(false)}
                onSelectSource={handleSourceSelected}
                taskLabel={selectedAiTask?.label || ''}
                hasNotes={editedTopic.notes.trim().length > 0}
                hasPdfs={editedTopic.pdfResources.length > 0}
            />
            {/* Header */}
            <header className="mb-6">
                 <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors mb-4">
                    <ArrowLeftIcon className="h-5 w-5" />
                    Back to Topics
                </button>
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <div className="text-slate-400 text-sm">
                            <span className="cursor-pointer hover:underline" onClick={onBack}>{subject.name}</span>
                            <span className="mx-2">/</span>
                        </div>
                        <input 
                            type="text"
                            value={editedTopic.title}
                            onBlur={handleBlur('title')}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            className="text-3xl sm:text-4xl font-bold text-white bg-transparent border-none focus:ring-0 p-0 w-full"
                            placeholder="Topic Title"
                        />
                    </div>
                     <div className="flex-shrink-0 flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 mt-2">
                        <label htmlFor="targetScore" className="text-sm font-medium text-slate-300">Target Score:</label>
                        <input
                            type="number"
                            id="targetScore"
                            value={editedTopic.targetScore || 80}
                            min="0" max="100" step="5"
                            onChange={e => handleInputChange('targetScore', parseInt(e.target.value, 10))}
                            onBlur={handleBlur('targetScore')}
                            className="bg-slate-700 text-white font-bold w-16 text-center rounded-md border-slate-600 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                     </div>
                </div>
            </header>
            
            {/* Main Content */}
            <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Resources & Notes */}
                <div className="flex flex-col gap-6">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex-grow flex flex-col">
                        <label className="text-lg font-semibold text-white mb-2 block">My Notes</label>
                        <textarea 
                            value={editedTopic.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            onBlur={handleBlur('notes')}
                            className="w-full flex-grow p-3 bg-slate-700/50 border border-slate-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 transition text-slate-300"
                            placeholder="Type or paste your study notes here..."
                        />
                    </div>
                    
                    <QuizHistoryViewer history={editedTopic.quizHistory || []} />
                    
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-3">Saved AI Content</h3>
                        {(editedTopic.savedAiContent && editedTopic.savedAiContent.length > 0) ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {editedTopic.savedAiContent.map(item => (
                                    <div key={item.id} className="group flex items-center justify-between bg-slate-700/80 p-2 rounded-md">
                                        <button onClick={() => handleViewSavedContent(item)} className="text-left font-medium text-slate-200 hover:text-cyan-300 transition-colors">
                                            {item.label}
                                        </button>
                                        <button onClick={() => handleDeleteSavedContent(item.id)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity">
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">No content saved yet. Use the AI Toolkit to generate and save content.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* PDFs */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                            <h4 className="font-semibold text-slate-300 mb-2 text-sm">PDFs ({editedTopic.pdfResources.length}/{MAX_PDFS})</h4>
                            <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                                {editedTopic.pdfResources.map(resource => (
                                    <div key={resource.name} className="flex items-center justify-between bg-slate-700/80 p-1.5 rounded text-xs group">
                                        <a href={loadedResourceUrls[resource.name]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 overflow-hidden">
                                            <FileTextIcon className="h-4 w-4 text-cyan-400 flex-shrink-0"/>
                                            <span className="truncate text-slate-300 hover:underline">{resource.name}</span>
                                        </a>
                                        <button onClick={() => handleRemoveResource('pdfResources', resource.name)} className="opacity-0 group-hover:opacity-100 ml-2 text-slate-500 hover:text-red-500 transition-opacity"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => pdfInputRef.current?.click()} disabled={editedTopic.pdfResources.length >= MAX_PDFS} className="mt-2 w-full flex items-center justify-center gap-2 text-xs bg-slate-600/70 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <UploadCloudIcon className="h-4 w-4"/> Add PDF
                            </button>
                            <input type="file" ref={pdfInputRef} onChange={(e) => handleFileChange(e, 'pdfResources')} className="hidden" accept=".pdf" multiple />
                        </div>
                        {/* Audio */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                           <h4 className="font-semibold text-slate-300 mb-2 text-sm">Audio ({editedTopic.audioResources.length}/{MAX_AUDIO_FILES})</h4>
                            <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                                {editedTopic.audioResources.map(resource => (
                                    <div key={resource.name} className="flex items-center justify-between bg-slate-700/80 p-1.5 rounded text-xs group">
                                        <a href={loadedResourceUrls[resource.name]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 overflow-hidden">
                                            <AudioWaveformIcon className="h-4 w-4 text-cyan-400 flex-shrink-0"/>
                                            <span className="truncate text-slate-300 hover:underline">{resource.name}</span>
                                        </a>
                                        <button onClick={() => handleRemoveResource('audioResources', resource.name)} className="opacity-0 group-hover:opacity-100 ml-2 text-slate-500 hover:text-red-500 transition-opacity"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => audioInputRef.current?.click()} disabled={editedTopic.audioResources.length >= MAX_AUDIO_FILES} className="mt-2 w-full flex items-center justify-center gap-2 text-xs bg-slate-600/70 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <UploadCloudIcon className="h-4 w-4"/> Add Audio
                            </button>
                            <input type="file" ref={audioInputRef} onChange={(e) => handleFileChange(e, 'audioResources')} className="hidden" accept="audio/*" multiple />
                        </div>
                        {/* Links */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                           <h4 className="font-semibold text-slate-300 mb-2 text-sm">Links</h4>
                           <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
                                 {editedTopic.links.map(link => (
                                    <div key={link} className="flex items-center justify-between bg-slate-700/80 p-1.5 rounded text-xs group">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <LinkIcon className="h-4 w-4 text-cyan-400 flex-shrink-0"/>
                                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline truncate">{link}</a>
                                        </div>
                                        <button onClick={() => handleRemoveResource('links', link)} className="opacity-0 group-hover:opacity-100 ml-2 text-slate-500 hover:text-red-500 transition-opacity"><TrashIcon className="h-4 w-4"/></button>
                                    </div>
                                ))}
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); handleAddLink(); }} className="mt-2 flex gap-1">
                                <input type="url" value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="Add link..." className="flex-grow shadow-sm bg-slate-700/80 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 block w-full text-xs rounded"/>
                                <button type="submit" className="bg-slate-600/70 text-white px-2 text-xs rounded font-semibold hover:bg-slate-600 transition-colors">Add</button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right: Analysis Hub */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col overflow-hidden">
                    <div className="flex-shrink-0 border-b border-slate-700 px-4">
                        <div className="flex items-center gap-2">
                            <TabButton tabName="toolkit" label="AI Toolkit" />
                            <TabButton tabName="pdf" label="PDF Analysis" />
                            <TabButton tabName="audio" label="Audio Analysis" />
                        </div>
                    </div>

                    <div className="overflow-y-auto h-full flex flex-col">
                        {isAiLoading && activeTab !== 'audio' ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <SparklesIcon className="h-12 w-12 text-cyan-400 animate-pulse" />
                                <p className="mt-4 text-lg text-cyan-400 font-semibold">{getLoadingMessage().title}</p>
                                <p className="text-slate-400">{getLoadingMessage().message}</p>
                            </div>
                        ) : (
                          <>
                            {activeTab === 'toolkit' && (
                                <div className="p-4 flex flex-col gap-6 flex-grow">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className="text-lg font-semibold text-white">Content Generation</h3>
                                            {aiOutput && !isAiLoading && (
                                                <button onClick={() => { setAiOutput(null); setLastGeneratedTask(null); }} className="text-xs text-slate-400 hover:text-red-400 font-semibold transition-colors">Clear Output</button>
                                            )}
                                        </div>
                                        <button onClick={() => handleAiToolClick(AITask.ULTIMATE_TEST, 'Ultimate Test')} disabled={isAiLoading} className="w-full flex items-center text-left p-3 bg-gradient-to-r from-cyan-600 to-violet-600 hover:opacity-90 rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                                            <div className="grid place-items-center h-8 w-8 rounded-md bg-white/20 mr-3 text-white"><TargetIcon className="w-5 h-5"/></div>
                                            <span className="font-bold text-white text-base">The Ultimate Test</span>
                                        </button>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {aiTools.map(tool => (
                                                <AIToolButton key={tool.task} icon={tool.icon} label={tool.label} onClick={() => handleAiToolClick(tool.task, tool.label)} disabled={isAiLoading}/>
                                            ))}
                                            <QuizGenerationMenu onGenerate={(task) => handleAiToolClick(task, "Quiz")} disabled={isAiLoading} />
                                        </div>
                                    </div>
                                    <div className="bg-slate-800 border border-slate-700 rounded-lg flex-grow flex flex-col overflow-hidden -m-4 mt-2">
                                        {renderAiOutput()}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'pdf' && (
                                <div className="p-4 sm:p-6 flex flex-col flex-grow">
                                    <h3 className="text-lg font-semibold text-white mb-2">PDF Analysis</h3>
                                    <p className="text-sm text-slate-400 mb-4">Extract and synthesize topic-relevant information from all uploaded PDFs.</p>
                                    <div className="flex gap-4 mb-4">
                                        <button onClick={handleAnalyzePdfs} disabled={isAiLoading || editedTopic.pdfResources.length === 0} className="flex-1 flex items-center justify-center gap-2 text-base bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2.5 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                            <SparklesIcon className="h-5 w-5"/> Analyze PDFs
                                        </button>
                                        {editedTopic.pdfAnalysis && !editedTopic.pdfAnalysis.startsWith('**Error:**') && !isAiLoading && (
                                            <button onClick={handleSavePdfAnalysis} className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2.5 px-4 rounded transition-colors">
                                                Save Analysis
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-grow overflow-y-auto prose prose-invert prose-sm max-w-none bg-slate-900/50 p-4 rounded-md border border-slate-700">
                                        {editedTopic.pdfAnalysis ? (
                                            <div dangerouslySetInnerHTML={{ __html: formatAiResponse(editedTopic.pdfAnalysis) }} />
                                        ) : (
                                            <p className="text-slate-400">Click the button above to analyze your uploaded PDFs and extract information relevant to this topic.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                             {activeTab === 'audio' && (
                                <div className="p-4 sm:p-6 flex flex-col flex-grow">
                                    <h3 className="text-lg font-semibold text-white mb-2">Audio Analysis</h3>
                                    <p className="text-sm text-slate-400 mb-4">Transcribe your audio files and get an AI-powered analysis with a summary and learning points.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
                                        <div className="bg-slate-900/50 p-3 rounded-md border border-slate-700 max-h-96 overflow-y-auto">
                                            <h4 className="font-semibold text-cyan-300 text-sm mb-2">Your Audio Files</h4>
                                            {editedTopic.audioResources.length > 0 ? (
                                                <div className="space-y-2">
                                                {(editedTopic.audioAnalyses || []).map(analysis => {
                                                    const isProcessingThis = processingAudio === analysis.resourceName;
                                                    return (
                                                    <div key={analysis.resourceName} className="flex items-center justify-between bg-slate-700/80 p-2 rounded text-sm">
                                                        <span className="truncate text-slate-300">{analysis.resourceName}</span>
                                                        {analysis.status === 'pending' && <button onClick={() => handleAnalyzeAudio(analysis.resourceName)} disabled={!!processingAudio} className="text-xs bg-cyan-600 text-white px-2 py-1 rounded hover:bg-cyan-500 disabled:opacity-50">Analyze</button>}
                                                        {analysis.status === 'processing' || isProcessingThis && <span className="text-xs text-yellow-400">Processing...</span>}
                                                        {analysis.status === 'completed' && <button onClick={() => setSelectedAudioAnalysis(analysis)} className="text-xs text-green-400 font-semibold hover:underline">View</button>}
                                                        {analysis.status === 'failed' && <span className="text-xs text-red-400">Failed</span>}
                                                    </div>
                                                    )
                                                })}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400">Upload audio files on the left to begin analysis.</p>
                                            )}
                                        </div>
                                        <div className="bg-slate-900/50 p-3 rounded-md border border-slate-700 max-h-96 overflow-y-auto prose prose-invert prose-sm max-w-none">
                                            {selectedAudioAnalysis ? (
                                                <div>
                                                    <div className="flex justify-between items-center not-prose mb-2">
                                                        <h4 className="font-semibold text-cyan-300 text-sm">Analysis: {selectedAudioAnalysis.resourceName}</h4>
                                                        {selectedAudioAnalysis.analysis && (
                                                            <button onClick={handleSaveAudioAnalysis} className="text-xs bg-slate-600 text-white px-2 py-1 rounded hover:bg-slate-500">
                                                                Save Analysis
                                                            </button>
                                                         )}
                                                    </div>
                                                    {selectedAudioAnalysis.analysis ? (
                                                        <>
                                                            <div dangerouslySetInnerHTML={{ __html: `<strong>Summary:</strong><br/>${formatAiResponse(selectedAudioAnalysis.analysis?.summary || '')}`}} />
                                                            <div dangerouslySetInnerHTML={{ __html: `<br/><strong>Strong Points:</strong><br/>${formatAiResponse(selectedAudioAnalysis.analysis?.strongPoints || '')}`}} />
                                                            <div dangerouslySetInnerHTML={{ __html: `<br/><strong>Areas for Improvement:</strong><br/>${formatAiResponse(selectedAudioAnalysis.analysis?.weakPoints || '')}`}} />
                                                            <div dangerouslySetInnerHTML={{ __html: `<br/><strong>Helpful Links:</strong><br/>${formatAiResponse(selectedAudioAnalysis.analysis?.hyperlinks || '')}`}} />
                                                        </>
                                                    ) : selectedAudioAnalysis.errorMessage ? (
                                                        <p className="text-red-400">Analysis failed: {selectedAudioAnalysis.errorMessage}</p>
                                                    ) : (
                                                        <p className="text-yellow-400">Analysis is pending or in progress.</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-slate-400">Select a completed analysis to view its details.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                          </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TopicWorkspace;