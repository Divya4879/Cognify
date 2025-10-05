import React, { useState } from 'react';
import { Subject } from '../../types';
import { dbService } from '../../services/db';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';

interface SubjectListViewProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  onSelectSubject: (subjectId: string) => void;
}

const MAX_SUBJECTS = 10;

const SubjectListView: React.FC<SubjectListViewProps> = ({ subjects, setSubjects, onSelectSubject }) => {
  const [newSubjectName, setNewSubjectName] = useState('');

  const handleAddSubject = () => {
    if (newSubjectName.trim() && subjects.length < MAX_SUBJECTS) {
      const newSubject: Subject = {
        id: Date.now().toString(),
        name: newSubjectName.trim(),
        topics: [],
      };
      setSubjects([...subjects, newSubject]);
      setNewSubjectName('');
    }
  };

  const handleDeleteSubject = async (e: React.MouseEvent, subjectId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this subject and all its topics?')) {
      try {
        // Clean up resources from IndexedDB before removing from state
        await dbService.deleteResourcesForSubject(subjectId);
        setSubjects(subjects.filter((s) => s.id !== subjectId));
      } catch (error) {
        console.error("Failed to delete subject resources from DB", error);
        alert("Could not delete all subject data. Please try again.");
      }
    }
  };

  return (
    <section id="learning-hub-subjects" className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
            My Learning Hub
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-400 mx-auto">
            Organize your academic life. Add subjects to build your personal knowledge base.
          </p>
        </div>

        <div className="max-w-xl mx-auto bg-slate-800/50 border border-slate-700 p-6 rounded-lg shadow-md mb-12">
          <h3 className="text-lg font-medium text-white">Add a New Subject</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleAddSubject(); }} className="mt-4 flex gap-2">
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder=" e.g., Quantum Physics"
              className="flex-grow shadow-sm text-white bg-slate-700 border-slate-600 focus:ring-cyan-500 focus:border-cyan-500 block w-full sm:text-sm rounded-md"
              disabled={subjects.length >= MAX_SUBJECTS}
            />
            <button type="submit" disabled={subjects.length >= MAX_SUBJECTS || !newSubjectName.trim()} className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              <PlusIcon className="h-5 w-5" />
            </button>
          </form>
          <p className="mt-2 text-sm text-slate-500">
            {subjects.length} / {MAX_SUBJECTS} subjects added.
          </p>
        </div>

        {subjects.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {subjects.map((subject) => (
              <div key={subject.id} onClick={() => onSelectSubject(subject.id)} className="group relative bg-slate-800/50 border border-slate-700 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center aspect-square text-center hover:border-cyan-400 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <h3 className="text-xl font-bold text-white break-words">{subject.name}</h3>
                <p className="text-slate-400 mt-2">{subject.topics.length} topic{subject.topics.length !== 1 && 's'}</p>
                <button onClick={(e) => handleDeleteSubject(e, subject.id)} className="absolute top-3 right-3 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
           <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-lg">
                <h3 className="text-xl font-semibold text-white">Your Hub is Empty</h3>
                <p className="text-slate-400 mt-2">Start by adding your first subject above.</p>
           </div>
        )}
      </div>
    </section>
  );
};

export default SubjectListView;