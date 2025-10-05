import React, { useState } from 'react';
import type { FAQ } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

const faqs: FAQ[] = [
  {
    question: 'How does the PDF and Audio Analysis work?',
    answer: 'Simply upload your files to a topic. For PDFs, the AI reads all of them and extracts only the information relevant to your topic title. For audio, it first transcribes the speech to text, then analyzes that text to provide a summary, key points, and helpful web links.'
  },
  {
    question: 'What makes the AI quiz grading "intelligent"?',
    answer: 'Instead of just marking an answer right or wrong, the AI compares your short and long-form answers to a model answer. It provides detailed, constructive feedback on what you understood correctly, where you went wrong, and how you can improve your understanding of the concept.'
  },
  {
    question: 'Is my data private? Where is it stored?',
    answer: 'Your privacy is my priority. All of your data - your profile, subjects, topics, and even your uploaded files, is stored locally in your browser\'s high-capacity storage (IndexedDB). Nothing is sent to an external server, ensuring your study materials remain private to you.'
  },
  {
    question: 'What kind of content can I create with the AI Toolkit?',
    answer: 'The toolkit is your on-demand tutor. You can generate a wide variety of content, including high-level overviews, in-depth explanations, key takeaways for revision, flashcards, ASCII diagrams, and quizzes (MCQ, short, and long-form) tailored to your learner profile.'
  }
];

const FaqItem: React.FC<{ faq: FAQ }> = ({ faq }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-slate-700 py-6">
            <dt>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex justify-between items-start text-left text-slate-400"
                >
                    <span className="font-medium text-white">{faq.question}</span>
                    <span className="ml-6 h-7 flex items-center">
                        <ChevronDownIcon
                            className={`h-6 w-6 transform transition-transform duration-200 text-slate-500 ${isOpen ? '-rotate-180' : 'rotate-0'}`}
                        />
                    </span>
                </button>
            </dt>
            {isOpen && (
                <dd className="mt-4 pr-12">
                    <p className="text-base text-slate-400">{faq.answer}</p>
                </dd>
            )}
        </div>
    );
};


const FaqSection: React.FC = React.memo(() => {
  return (
    <section id="faq" className="bg-slate-900">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-center text-3xl font-extrabold text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-12">
            <dl className="space-y-2">
                {faqs.map((faq, index) => (
                    <FaqItem key={index} faq={faq} />
                ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
});

export default FaqSection;