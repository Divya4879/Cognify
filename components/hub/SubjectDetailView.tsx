import React, { useState, useRef } from 'react';
import { Subject, Topic } from '../../types';
import { generateTopicsFromSyllabus } from '../../services/geminiService';
import { dbService } from '../../services/db';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface SubjectDetailViewProps {
  subject: Subject;
  setSubject: React.Dispatch<React.SetStateAction<Subject | null>>;
  onUpdateSubject: (subject: Subject) => void;
  onSelectTopic: (topicId: string) => void;
  onBack: () => void;
}

const MAX_TOPICS = 100;

const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({ subject, setSubject, onUpdateSubject, onSelectTopic, onBack }) => {
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [isSyllabusProcessing, setIsSyllabusProcessing] = useState(false);
  const syllabusInputRef = useRef<HTMLInputElement>(null);
  
  const handleAddTopic = () => {
    if (newTopicTitle.trim() && subject.topics.length < MAX_TOPICS) {
      const newTopic: Topic = {
        id: Date.now().toString(),
        title: newTopicTitle.trim(),
        description: "",
        notes: "",
        pdfResources: [],
        audioResources: [],
        links: [],
        savedAiContent: [],
        status: 'in_progress',
        targetScore: 80,
      };
      const updatedSubject = { ...subject, topics: [...subject.topics, newTopic] };
      setSubject(updatedSubject);
      onUpdateSubject(updatedSubject);
      setNewTopicTitle('');
    }
  };

  const handleDeleteTopic = async (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    try {
        await dbService.deleteResourcesForTopic(topicId);
        const updatedTopics = subject.topics.filter(t => t.id !== topicId);
        const updatedSubject = { ...subject, topics: updatedTopics };
        setSubject(updatedSubject);
        onUpdateSubject(updatedSubject);
    } catch (error) {
        console.error("Failed to delete topic resources from DB", error);
        alert("Could not delete topic data. Please try again.");
    }
  };

  const handleSyllabusUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];

    if (file.size > 4 * 1024 * 1024) { // 4MB limit
        alert("Image file is too large. Please use an image under 4MB.");
        return;
    }

    setIsSyllabusProcessing(true);

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (e) => {
            try {
                if (typeof e.target?.result !== 'string') {
                    throw new Error("Failed to read image file.");
                }
                const imageBase64 = e.target.result;

                const syllabusTopics = await generateTopicsFromSyllabus(subject.name, imageBase64);

                if (syllabusTopics.length === 0) {
                    alert("The AI couldn't find any topics in the syllabus. Please try a clearer image.");
                    return;
                }
                
                const newTopics: Topic[] = [];
                const existingTitles = new Set(subject.topics.map(t => t.title.toLowerCase()));

                const createNewTopic = (title: string): Topic => ({
                    id: `${Date.now()}-${title.replace(/\s+/g, '-')}-${Math.random()}`,
                    title: title,
                    description: "",
                    notes: "",
                    pdfResources: [],
                    audioResources: [],
                    links: [],
                    savedAiContent: [],
                    status: 'in_progress',
                    targetScore: 80,
                });

                syllabusTopics.forEach(unit => {
                    const mainTitle = unit.title.trim();
                    if (mainTitle && !existingTitles.has(mainTitle.toLowerCase())) {
                        newTopics.push(createNewTopic(mainTitle));
                        existingTitles.add(mainTitle.toLowerCase());
                    }

                    unit.sub_topics.forEach(subTopicTitleRaw => {
                        const subTopicTitleClean = subTopicTitleRaw.trim();
                        const indentedTitle = `  • ${subTopicTitleClean}`;
                        if (subTopicTitleClean && !existingTitles.has(indentedTitle.toLowerCase())) {
                            newTopics.push(createNewTopic(indentedTitle));
                            existingTitles.add(indentedTitle.toLowerCase());
                        }
                    });
                });
                
                let finalNewTopics = newTopics;
                if (subject.topics.length + newTopics.length > MAX_TOPICS) {
                    const availableSlots = MAX_TOPICS - subject.topics.length;
                    finalNewTopics = newTopics.slice(0, availableSlots);
                    alert(`Syllabus generated ${newTopics.length} new topics. ${finalNewTopics.length} topics were added to stay within the ${MAX_TOPICS} limit.`);
                }
                
                if(finalNewTopics.length > 0) {
                    const updatedSubject = { ...subject, topics: [...subject.topics, ...finalNewTopics] };
                    setSubject(updatedSubject);
                    onUpdateSubject(updatedSubject);
                } else {
                    alert("No new topics were found in the syllabus, or they already exist.");
                }

            } catch(err) {
                 console.error("Error processing syllabus:", err);
                 alert("An error occurred while analyzing the syllabus. Please check the image or try again.");
            } finally {
                 setIsSyllabusProcessing(false);
                 if (event.target) event.target.value = '';
            }
        };
        reader.onerror = (error) => {
             console.error("File reading error:", error);
             alert("Could not read the selected file.");
             setIsSyllabusProcessing(false);
             if (event.target) event.target.value = '';
        };

    } catch (error) {
        console.error("Syllabus upload setup error:", error);
        alert("An unexpected error occurred. Please try again.");
        setIsSyllabusProcessing(false);
        if (event.target) event.target.value = '';
    }
  };

  return (
    <section id="subject-detail" className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Subjects
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl break-words">
            {subject.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-400 mx-auto">
            Manage your topics for this subject. Click on a topic to view its resources and use AI tools.
          </p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-medium text-white">Add a New Topic</h3>
           <form onSubmit={(e) => { e.preventDefault(); handleAddTopic(); }} className="mt-4 flex gap-2">
            <input
              type="text"
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="e.g., Schrödinger's Cat"
              className="flex-grow shadow-sm text-white bg-slate-700 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm rounded-md"
              disabled={subject.topics.length >= MAX_TOPICS}
            />
            <button type="submit" disabled={subject.topics.length >= MAX_TOPICS || !newTopicTitle.trim()} className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              <PlusIcon className="h-5 w-5" />
            </button>
          </form>
          <p className="mt-2 text-sm text-slate-500">
            {subject.topics.length} / {MAX_TOPICS} topics added.
          </p>
        </div>
        
        <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative bg-slate-900 px-4 text-sm text-slate-400">OR</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-lg shadow-md mb-12 text-center">
            <h3 className="text-lg font-medium text-white">Create Topics from Syllabus</h3>
            <p className="text-sm text-slate-400 mt-2 mb-4 max-w-prose mx-auto">Upload an image of your syllabus and let AI automatically generate the topic list for you.</p>
            <button
                onClick={() => syllabusInputRef.current?.click()}
                disabled={isSyllabusProcessing || subject.topics.length >= MAX_TOPICS}
                className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-600 to-violet-600 hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
            >
                {isSyllabusProcessing ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                    </>
                ) : (
                    <>
                        Upload Syllabus Image
                        <SparklesIcon className="h-5 w-5 ml-2" />
                    </>
                )}
            </button>
            <input
                type="file"
                ref={syllabusInputRef}
                onChange={handleSyllabusUpload}
                className="hidden"
                accept="image/*"
            />
        </div>

        <div className="space-y-4">
          {subject.topics.map(topic => (
            <div key={topic.id} onClick={() => onSelectTopic(topic.id)} className="group bg-slate-800/50 border border-slate-700 p-4 rounded-lg flex justify-between items-center hover:border-cyan-400 hover:bg-slate-800 transition-all duration-200 cursor-pointer">
              <div className="flex items-center">
                <h4 className="font-semibold text-white text-lg whitespace-pre-wrap">{topic.title}</h4>
                {topic.status === 'done' && (
                    <span title="Mastered!" className="ml-3 flex-shrink-0">
                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    </span>
                )}
              </div>
              <button onClick={(e) => handleDeleteTopic(e, topic.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
          {subject.topics.length === 0 && (
             <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-lg">
                <h3 className="text-xl font-semibold text-white">No Topics Yet</h3>
                <p className="text-slate-400 mt-2">Add your first topic manually or upload a syllabus to get started.</p>
           </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SubjectDetailView;