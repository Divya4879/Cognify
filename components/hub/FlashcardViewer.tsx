import React, { useState, useEffect } from 'react';
import { Flashcard } from '../../types';
import { RefreshCwIcon } from '../icons/RefreshCwIcon';
import { SquareCheckIcon } from '../icons/SquareCheckIcon';
import { SquarePenIcon } from '../icons/SquarePenIcon';

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  onUpdateFlashcards: (flashcards: Flashcard[]) => void;
  onClear: () => void;
}

const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ flashcards, onUpdateFlashcards, onClear }) => {
  const [cards, setCards] = useState<Flashcard[]>(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filter, setFilter] = useState<'all' | 'known' | 'needs_review'>('all');

  useEffect(() => {
    setCards(flashcards);
    // Reset index if it becomes out of bounds due to filtering
    if (currentIndex >= filteredCards.length) {
        setCurrentIndex(0);
    }
    setIsFlipped(false);
  }, [flashcards, filter]);

  const filteredCards = cards.filter(card => {
    if (filter === 'all') return true;
    return card.status === filter;
  });

  const currentCard = filteredCards[currentIndex];

  const goToNext = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const goToPrev = () => {
    if (filteredCards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const markStatus = (status: 'known' | 'needs_review') => {
    if (!currentCard) return;
    const updatedCards = cards.map(card => 
      card.front === currentCard.front ? { ...card, status } : card
    );
    setCards(updatedCards);
    onUpdateFlashcards(updatedCards); // Persist the change
    setTimeout(goToNext, 200); // Automatically move to next card after marking
  };

  if (filteredCards.length === 0) {
      return (
          <div className="p-6 text-center flex flex-col justify-center items-center h-full">
              <h3 className="text-lg font-semibold text-white">No Flashcards to Show</h3>
              <p className="text-slate-400 text-sm mt-1">Try changing the filter or generating new flashcards.</p>
              <div className="mt-4 flex justify-center gap-2">
                 <button onClick={() => setFilter('all')} className={`px-3 py-1 text-xs rounded-full ${filter === 'all' ? 'bg-cyan-500 text-white' : 'bg-slate-600 text-slate-300'}`}>All ({cards.length})</button>
                 <button onClick={() => setFilter('known')} className={`px-3 py-1 text-xs rounded-full ${filter === 'known' ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-300'}`}>Known ({cards.filter(c=>c.status==='known').length})</button>
                 <button onClick={() => setFilter('needs_review')} className={`px-3 py-1 text-xs rounded-full ${filter === 'needs_review' ? 'bg-yellow-500 text-white' : 'bg-slate-600 text-slate-300'}`}>Needs Review ({cards.filter(c=>c.status==='needs_review').length})</button>
              </div>
          </div>
      )
  }

  return (
    <div className="p-4 sm:p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-white">Flashcards</h3>
        <button onClick={onClear} className="text-xs text-slate-400 hover:text-red-400 font-semibold transition-colors">Clear Flashcards</button>
      </div>
       <div className="flex justify-center gap-2 mb-4">
            <button onClick={() => setFilter('all')} title="Show All" className={`px-3 py-1 text-xs rounded-full ${filter === 'all' ? 'bg-cyan-500 text-white' : 'bg-slate-600 text-slate-300'}`}>All ({cards.length})</button>
            <button onClick={() => setFilter('known')} title="Show Known" className={`px-3 py-1 text-xs rounded-full ${filter === 'known' ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-300'}`}>Known ({cards.filter(c=>c.status==='known').length})</button>
            <button onClick={() => setFilter('needs_review')} title="Show Needs Review" className={`px-3 py-1 text-xs rounded-full ${filter === 'needs_review' ? 'bg-yellow-500 text-white' : 'bg-slate-600 text-slate-300'}`}>Review ({cards.filter(c=>c.status==='needs_review').length})</button>
        </div>


      <div className="flex-grow flex flex-col justify-center items-center">
        <div 
          className="relative w-full max-w-md h-64 perspective-1000"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`absolute w-full h-full transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            {/* Front */}
            <div className="absolute w-full h-full backface-hidden bg-slate-700 border border-slate-600 rounded-lg p-6 flex items-center justify-center text-center">
              <p className="text-xl text-white">{currentCard?.front}</p>
            </div>
            {/* Back */}
            <div className="absolute w-full h-full backface-hidden bg-cyan-800/50 border border-cyan-700 rounded-lg p-6 flex items-center justify-center text-center rotate-y-180">
              <p className="text-lg text-cyan-200">{currentCard?.back}</p>
            </div>
          </div>
        </div>
        <button onClick={() => setIsFlipped(!isFlipped)} className="mt-4 flex items-center gap-2 text-slate-400 text-sm hover:text-white">
            <RefreshCwIcon className="h-4 w-4" /> Click card to flip
        </button>
      </div>

      <div className="flex items-center justify-between mt-4">
        <button onClick={goToPrev} className="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600">&lt;</button>
        <span className="text-slate-400 text-sm">{currentIndex + 1} / {filteredCards.length}</span>
        <button onClick={goToNext} className="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600">&gt;</button>
      </div>
      
       <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => markStatus('needs_review')} className="flex items-center justify-center gap-2 w-full p-2 bg-yellow-500/20 text-yellow-300 rounded-md hover:bg-yellow-500/30">
                <SquarePenIcon className="h-5 w-5"/> Needs Review
            </button>
            <button onClick={() => markStatus('known')} className="flex items-center justify-center gap-2 w-full p-2 bg-green-500/20 text-green-300 rounded-md hover:bg-green-500/30">
                <SquareCheckIcon className="h-5 w-5"/> Known
            </button>
       </div>
       <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
       `}</style>
    </div>
  );
};

export default FlashcardViewer;