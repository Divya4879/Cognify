import React from 'react';
import { FileTextIcon } from '../icons/FileTextIcon';
import { StickyNoteIcon } from '../icons/StickyNoteIcon';

interface SourceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSource: (source: 'notes' | 'pdfs') => void;
  taskLabel: string;
  hasNotes: boolean;
  hasPdfs: boolean;
}

const SourceSelectionModal: React.FC<SourceSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectSource,
  taskLabel,
  hasNotes,
  hasPdfs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Generate {taskLabel}</h2>
            <p className="mt-2 text-slate-400">What should the AI use as a source for this task?</p>
        </div>

        <div className="mt-6 space-y-4">
            <button
                onClick={() => onSelectSource('notes')}
                disabled={!hasNotes}
                className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-700/50"
            >
                <div className="grid place-items-center h-12 w-12 rounded-lg bg-slate-600 text-cyan-300">
                    <StickyNoteIcon className="w-6 h-6"/>
                </div>
                <div>
                    <h3 className="font-semibold text-white text-left">My Notes</h3>
                    <p className="text-sm text-slate-400 text-left">{hasNotes ? 'Use the written notes for this topic.' : 'No notes available for this topic.'}</p>
                </div>
            </button>
            <button
                onClick={() => onSelectSource('pdfs')}
                disabled={!hasPdfs}
                className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-700/50"
            >
                 <div className="grid place-items-center h-12 w-12 rounded-lg bg-slate-600 text-cyan-300">
                    <FileTextIcon className="w-6 h-6"/>
                </div>
                <div>
                    <h3 className="font-semibold text-white text-left">Uploaded PDFs</h3>
                    <p className="text-sm text-slate-400 text-left">{hasPdfs ? 'Analyze the content of uploaded PDF files.' : 'No PDFs uploaded for this topic.'}</p>
                </div>
            </button>
        </div>

        <div className="mt-6 text-center">
            <button onClick={onClose} className="text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default SourceSelectionModal;
