import { AITask, Flashcard, McqQuestion, ShortAnswerQuestion, LongAnswerQuestion, Quiz, Resource, SyllabusTopic, QuizFeedback } from '../types';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateContentWithRetry(requestPayload: any): Promise<any> {
    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            const response = await fetch('/.netlify/functions/gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error: any) {
            // A simple string check for the 429 status code in the error message
            if (error.message && error.message.includes('429')) {
                retries++;
                if (retries >= MAX_RETRIES) {
                    console.error("Max retries reached for rate limited request.", error);
                    // Throw a more user-friendly error after the last retry.
                    throw new Error("API rate limit exceeded. Please wait a minute and try again.");
                }
                // Exponential backoff: 1s, 2s, 4s
                const delayTime = INITIAL_DELAY_MS * Math.pow(2, retries - 1);
                console.warn(`Rate limit hit. Retrying in ${delayTime}ms... (Attempt ${retries}/${MAX_RETRIES})`);
                await delay(delayTime);
            } else {
                // Not a rate limit error, rethrow it immediately.
                console.error("An unhandled API error occurred:", error);
                throw error;
            }
        }
    }
    // This should be unreachable if MAX_RETRIES > 0, but is a safeguard.
    throw new Error("Failed to get a response from the AI after multiple retries.");
}

const getPrompt = (task: AITask, text: string, learningContext: string, subjectName: string, topicTitle: string, revisionContext?: string): string => {
    const contextInstruction = `The user is a ${learningContext}. Tailor the response to be perfectly suitable for their level and context.`;
    const topicContext = `The user is studying the topic "${topicTitle}" within the subject "${subjectName}".`;
    
    let sourceInstruction: string;
    if (text.startsWith("the content of")) {
        sourceInstruction = `Base your response on ${text}.`;
    } else if (text) {
        sourceInstruction = `Base your response on the following notes: "${text}"`;
    } else {
        sourceInstruction = `You are a world-class educator with decades of experience. Generate the content based on your own deep knowledge of the subject. Do not mention that you are generating this from your own knowledge; simply provide the content directly.`;
    }

    const revisionInstruction = revisionContext ? ` IMPORTANT: The user has previously struggled with certain concepts. Pay special attention to providing a clear and simple explanation for the topics related to the following: ${revisionContext}` : '';

    switch (task) {
        case AITask.OVERVIEW:
            return `${contextInstruction} ${topicContext} Provide a concise, high-level overview. It should be a summary that captures the main concepts, key terms, and the essence of the topic. ${sourceInstruction}`;
        case AITask.IN_DEPTH:
            return `${contextInstruction} ${topicContext} Provide a comprehensive, in-depth explanation, between 1000 and 4000 words. Structure the explanation with clear headings and paragraphs. Break down complex concepts, elaborate on key points, and explain the underlying principles in detail. Use analogies if helpful. ${sourceInstruction} ${revisionInstruction}`;
        case AITask.KEY_TAKEAWAYS:
            return `${contextInstruction} ${topicContext} Create a detailed "quick revision" summary. It must include: a list of the most critical key takeaways, a list of important keywords with definitions, and simple ASCII diagrams or flowcharts to visually represent core concepts for effective revision. ${sourceInstruction}`;
        case AITask.ANECDOTES:
            return `${contextInstruction} ${topicContext} Generate clever and memorable learning aids. Include acronyms, simple anecdotes, and learning hacks to help remember key terms and concepts. ${sourceInstruction}`;
        case AITask.RESOURCES:
            return `${contextInstruction} ${topicContext} Find 5-10 relevant, helpful, and high-quality learning resources on the web. Provide direct hyperlinks to specific articles, blogs, research papers, or free online courses, not just homepages. ${sourceInstruction}`;
        case AITask.FLASHCARDS:
            return `${contextInstruction} ${topicContext} Generate a set of 15-25 high-quality flashcards. Each flashcard should have a clear 'front' (a question or term) and a concise 'back' (the answer or definition). ${sourceInstruction}`;
        case AITask.QUIZ_MCQ:
             return `${contextInstruction} ${topicContext} Generate a challenging multiple-choice quiz with 10-15 questions. Each question must have 4 options, a single correct answer, and a brief, clear explanation for why the correct answer is correct. ${sourceInstruction}`;
        case AITask.QUIZ_SHORT:
             return `${contextInstruction} ${topicContext} Generate a quiz with 5-8 short-answer questions. The expected answer for each question should be up to 100 words. Provide a model correct answer for each question. ${sourceInstruction}`;
        case AITask.QUIZ_LONG:
             return `${contextInstruction} ${topicContext} Generate a quiz with 3-5 long-answer or essay-style questions. The expected answer for each question should be between 300 and 700 words. For each question, provide a list of key points the answer should cover and a concise model answer. ${sourceInstruction}`;
        case AITask.ULTIMATE_TEST:
            return `${contextInstruction} ${topicContext} Generate a comprehensive 'Ultimate Test'. It must contain a balanced mix of 10-15 multiple-choice questions (each with an explanation), 5-8 short-answer questions, and 3-5 long-answer questions to thoroughly assess the user's understanding. ${sourceInstruction}`;
        case AITask.FLOWCHART:
            return `${contextInstruction} ${topicContext} Generate a detailed and well-structured ASCII flowchart to visually represent the core processes, sequences, or decision points of the topic. Use standard ASCII characters like ->, +, |, etc. ${sourceInstruction}`;
        case AITask.DIAGRAM:
            return `${contextInstruction} ${topicContext} Generate a helpful ASCII diagram to illustrate the key components, structures, or relationships within the topic. Label the parts clearly. ${sourceInstruction}`;
        default:
            return text;
    }
}

// Schemas for structured JSON output
const flashcardSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        front: { type: Type.STRING, description: "The front of the flashcard (question/term)." },
        back: { type: Type.STRING, description: "The back of the flashcard (answer/definition)." }
      },
      required: ["front", "back"]
    }
};

const mcqQuizSchema = {
    type: Type.OBJECT,
    properties: {
        mcqs: {
            type: Type.ARRAY, description: "Multiple choice questions.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    answer: { type: Type.STRING },
                    explanation: { type: Type.STRING, description: "A brief, clear explanation of why the correct answer is correct." }
                }, required: ["question", "options", "answer", "explanation"]
            }
        }
    }, required: ["mcqs"]
};

const shortAnswerQuizSchema = {
    type: Type.OBJECT,
    properties: {
        short_answers: {
            type: Type.ARRAY, description: "Short answer questions.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING, description: "A concise, correct answer." }
                }, required: ["question", "answer"]
            }
        }
    }, required: ["short_answers"]
};

const longAnswerQuizSchema = {
    type: Type.OBJECT,
    properties: {
        long_answers: {
            type: Type.ARRAY, description: "Long answer questions that require detailed explanations.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    points_to_cover: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of key points the user's answer should include." },
                    modelAnswer: { type: Type.STRING, description: "A concise model answer that covers the key points."}
                }, required: ["question", "points_to_cover", "modelAnswer"]
            }
        }
    }, required: ["long_answers"]
};

const ultimateTestSchema = {
    type: Type.OBJECT,
    properties: {
        mcqs: mcqQuizSchema.properties.mcqs,
        short_answers: shortAnswerQuizSchema.properties.short_answers,
        long_answers: longAnswerQuizSchema.properties.long_answers,
    },
    required: ["mcqs", "short_answers", "long_answers"],
};

const syllabusSchema = {
    type: Type.OBJECT,
    properties: {
        topics: {
            type: Type.ARRAY,
            description: "An array of topic objects extracted from the syllabus.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: 'The main title of the topic, including the unit number (e.g., "Unit 1: Introduction"). Must be clear, concise, and grammatically correct.' },
                    sub_topics: {
                        type: Type.ARRAY,
                        description: 'A list of key concepts, keywords, or sub-topics listed under the main topic title.',
                        items: { type: Type.STRING }
                    }
                },
                required: ["title", "sub_topics"]
            }
        }
    },
    required: ["topics"]
};

const batchAnswerEvaluationSchema = {
    type: Type.OBJECT,
    properties: {
        evaluations: {
            type: Type.ARRAY,
            description: "An array of evaluation objects for each question.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question_id: { type: Type.NUMBER, description: "The original index (0, 1, 2, ...) of the question being evaluated." },
                    feedback: { type: Type.STRING, description: "Constructive feedback for the student's answer." },
                    assessment: { type: Type.STRING, description: "A single-word assessment: 'correct', 'partially_correct', or 'incorrect'." }
                },
                required: ["question_id", "feedback", "assessment"]
            }
        }
    },
    required: ["evaluations"]
};

const ultimateTestEvaluationSchema = {
    type: Type.OBJECT,
    properties: {
        evaluations: {
            type: Type.ARRAY,
            description: "An array of evaluation objects for each question.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question_id: { type: Type.NUMBER, description: "The original index (0, 1, 2, ...) of the question being evaluated." },
                    feedback: { type: Type.STRING, description: "A very brief, one-sentence justification for the assessment." },
                    assessment: { type: Type.STRING, description: "A single-word assessment: 'correct', 'incorrect', or 'needs_more_work'." }
                },
                required: ["question_id", "feedback", "assessment"]
            }
        }
    },
    required: ["evaluations"]
};


const quizFeedbackSchema = {
    type: Type.OBJECT,
    properties: {
        overallSummary: { type: Type.STRING, description: "A brief, encouraging overview of the user's performance." },
        analysisByQuestionType: {
            type: Type.OBJECT,
            properties: {
                mcq: { type: Type.STRING, description: "Analysis of MCQ performance. Omit if not present." },
                short: { type: Type.STRING, description: "Analysis of short answer performance. Omit if not present." },
                long: { type: Type.STRING, description: "Analysis of long answer performance. Omit if not present." }
            }
        },
        keyStrengths: {
            type: Type.ARRAY,
            description: "A list of specific concepts the user seems to understand well.",
            items: { type: Type.STRING }
        },
        areasForImprovement: {
            type: Type.ARRAY,
            description: "A list of specific concepts where the user struggled.",
            items: {
                type: Type.OBJECT,
                properties: {
                    concept: { type: Type.STRING, description: "The concept the user needs to work on." },
                    suggestion: { type: Type.STRING, description: "A brief, clear explanation and a suggested action (e.g., 'Generate an In-depth Explanation for...')." }
                },
                required: ["concept", "suggestion"]
            }
        }
    },
    required: ["overallSummary", "analysisByQuestionType", "keyStrengths", "areasForImprovement"]
};

const audioAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "A concise summary of the main topics discussed in the transcript. Use markdown for formatting." },
        strongPoints: { type: Type.STRING, description: "A list of concepts from the transcript that a student should feel confident about if they understood them. Use markdown bullet points." },
        weakPoints: { type: Type.STRING, description: "A list of complex or nuanced concepts from the transcript that a student might need to review. Use markdown bullet points." },
        hyperlinks: { type: Type.STRING, description: "A markdown-formatted list of 3-5 high-quality, relevant hyperlinks to external resources (articles, videos, tutorials) that would help a student better understand the weak points mentioned." }
    },
    required: ["summary", "strongPoints", "weakPoints", "hyperlinks"]
};


export const processTextWithGemini = async (
  task: AITask,
  sourceContent: string | Resource[],
  learningContext: string,
  subjectName: string,
  topicTitle: string,
  revisionContext?: string
): Promise<string | Flashcard[] | Quiz> => {
  try {
    let prompt: string;
    const requestPayload: any = { model: "gemini-2.5-flash" };

    if (typeof sourceContent === 'string') {
        prompt = getPrompt(task, sourceContent, learningContext, subjectName, topicTitle, revisionContext);
        requestPayload.contents = prompt;
    } else { // It's Resource[] for PDFs
        prompt = getPrompt(task, "the content of the attached file(s)", learningContext, subjectName, topicTitle, revisionContext);
        const textPart = { text: prompt };
        const fileParts = sourceContent.map(resource => {
            const match = resource.url?.match(/^data:(.*);base64,(.*)$/);
            if (!match) {
                console.error(`Invalid data URL format for file: ${resource.name}`);
                throw new Error(`Invalid data URL format for file: ${resource.name}`);
            }
            const mimeType = match[1];
            const data = match[2];
            return { inlineData: { mimeType, data } };
        });

        requestPayload.contents = { parts: [textPart, ...fileParts] };
    }
    
    // FIX: Refactored quiz generation to be more robust and maintainable.
    if (
        task === AITask.FLASHCARDS ||
        task === AITask.QUIZ_MCQ ||
        task === AITask.QUIZ_SHORT ||
        task === AITask.QUIZ_LONG ||
        task === AITask.ULTIMATE_TEST
    ) {
        let schema;
        switch (task) {
            case AITask.FLASHCARDS: schema = flashcardSchema; break;
            case AITask.QUIZ_MCQ: schema = mcqQuizSchema; break;
            case AITask.QUIZ_SHORT: schema = shortAnswerQuizSchema; break;
            case AITask.QUIZ_LONG: schema = longAnswerQuizSchema; break;
            case AITask.ULTIMATE_TEST: schema = ultimateTestSchema; break;
        }
        requestPayload.config = { responseMimeType: "application/json", responseSchema: schema };
        const response = await generateContentWithRetry(requestPayload);
        return JSON.parse(response.text);
    }
    
    if (task === AITask.RESOURCES) {
        requestPayload.config = { tools: [{ googleSearch: {} }] };
        const response = await generateContentWithRetry(requestPayload);
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const resourceLinks = groundingChunks
            .map(chunk => chunk.web)
            .filter(web => web?.uri && web?.title)
            .map(web => `* [${web.title}](${web.uri})`)
            .join('\n');
        
        return response.text + (resourceLinks ? `\n\n### **Suggested Resources**\n${resourceLinks}` : '');
    }

    requestPayload.config = { temperature: 0.7 };
    const response = await generateContentWithRetry(requestPayload);
    return response.text;

  } catch (error) {
    console.error("Error processing text with Gemini:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unknown error occurred while processing your request.");
  }
};

export const generateTopicsFromSyllabus = async (
    subjectName: string,
    imageBase64Url: string
): Promise<SyllabusTopic[]> => {
    try {
        const match = imageBase64Url.match(/^data:(.*);base64,(.*)$/);
        if (!match) {
            throw new Error(`Invalid data URL format for syllabus image.`);
        }
        const mimeType = match[1];
        const data = match[2];

        const prompt = `You are an expert academic assistant. Analyze the provided syllabus image for the subject '${subjectName}'. Your task is to meticulously identify and extract all distinct units or sections. For each unit, you must extract: 1. The full title, including the unit number (e.g., "Unit 1: Introduction"). Correct any spelling mistakes you find. 2. A list of all the sub-topics, keywords, or concepts listed under that main title. Return the data as a clean JSON object that adheres to the provided schema. Ignore page numbers or any other metadata not related to topics or sub-topics.`;
        
        const imagePart = { inlineData: { mimeType, data } };
        const textPart = { text: prompt };

        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, imagePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: syllabusSchema
            }
        });

        const result = JSON.parse(response.text);
        if (result && result.topics && Array.isArray(result.topics)) {
            return result.topics as SyllabusTopic[];
        }
        return [];
    } catch (error) {
        console.error("Error generating topics from syllabus:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to process syllabus image: ${error.message}`);
        }
        throw new Error("An unknown error occurred while processing the syllabus.");
    }
};

type GradedQuestionResult = {
  question_id: number;
  feedback: string;
  assessment: 'correct' | 'partially_correct' | 'incorrect' | 'needs_more_work';
};


const formatQuestionForPrompt = (q: ShortAnswerQuestion | LongAnswerQuestion, index: number) => {
    const modelAnswerText = 'answer' in q 
        ? `Model Answer: "${q.answer}"` 
        : `Key Points to Cover: ${q.points_to_cover.join(', ')}`;
    const studentAnswerText = q.userAnswer && q.userAnswer.trim() !== ''
        ? `Student's Answer: "${q.userAnswer}"`
        : "The student did not provide an answer.";

    return `
---
Question ID: ${index}
Question: "${q.question}"
${modelAnswerText}
${studentAnswerText}
---`;
};

export const evaluateMultipleAnswersWithGemini = async (
    questions: (ShortAnswerQuestion | LongAnswerQuestion)[],
    learningContext: string,
): Promise<GradedQuestionResult[]> => {
    if (questions.length === 0) return [];

    const questionsString = questions.map(formatQuestionForPrompt).join('\n');
    const prompt = `You are an expert and friendly examiner. Your task is to evaluate a student's answers for the following list of questions, each identified by a "Question ID". The user is a ${learningContext}.

    Here are the questions, model answers/key points, and the student's answers:
    ${questionsString}

    Please perform the following for each question:
    1. Compare the student's answer to the model answer/key points.
    2. Provide concise, constructive, and encouraging feedback in markdown format. If no answer was given, explain what a good answer would contain.
    3. Give a one-word assessment of the student's answer: 'correct', 'partially_correct', or 'incorrect'.
    
    Return the result ONLY as a single JSON object adhering to the provided schema. The 'evaluations' array must contain one evaluation object for each question provided, using the original "Question ID".`;
    
    try {
        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: batchAnswerEvaluationSchema,
                temperature: 0.3,
            }
        });

        const result = JSON.parse(response.text);
        return result.evaluations || [];

    } catch (error) {
        console.error("Error evaluating multiple answers:", error);
        return questions.map((q, index) => ({
            question_id: index,
            feedback: "Error: The AI evaluation service failed. Please try again.",
            assessment: 'incorrect'
        }));
    }
};

export const evaluateUltimateTestAnswersWithGemini = async (
    questions: (ShortAnswerQuestion | LongAnswerQuestion)[],
    learningContext: string,
): Promise<GradedQuestionResult[]> => {
    if (questions.length === 0) return [];
    
    const questionsString = questions.map(formatQuestionForPrompt).join('\n');
    const prompt = `You are a strict but fair examiner grading a final, comprehensive 'Ultimate Test'. Your task is to evaluate a student's answers for the following list of questions, each identified by a "Question ID". The user is a ${learningContext}.

    Here are the questions, model answers/key points, and the student's answers:
    ${questionsString}

    For each question, perform the following:
    1. Compare the student's answer to the model answer/key points.
    2. Provide a very brief, one-sentence justification for your assessment.
    3. Give a single-word assessment: 'correct', 'incorrect', or 'needs_more_work'. Use 'needs_more_work' for answers that are on the right track but are incomplete or miss key details.
    
    Return the result ONLY as a single JSON object adhering to the provided schema. The 'evaluations' array must contain one evaluation object for each question provided, using the original "Question ID".`;

    try {
        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: ultimateTestEvaluationSchema,
                temperature: 0.2,
            }
        });
        const result = JSON.parse(response.text);
        return result.evaluations || [];
    } catch (error) {
        console.error("Error evaluating ultimate test answers:", error);
        return questions.map((q, index) => ({
            question_id: index,
            feedback: "Error: The AI evaluation service failed.",
            assessment: 'incorrect'
        }));
    }
};


export const generateQuizFeedbackSummary = async (
    quiz: Quiz,
    learningContext: string
): Promise<QuizFeedback> => {
     try {
        const answeredQuizString = JSON.stringify(quiz, null, 2);

        const prompt = `You are an expert learning coach. A ${learningContext} has just completed a quiz. Here is their performance data:
        ${answeredQuizString}

        Based on this data, please generate a comprehensive and encouraging feedback summary as a JSON object. The summary MUST be well-structured and adhere to the provided schema. It must include the following sections:
        - An overall performance summary.
        - A brief analysis for each question type that was present in the quiz (MCQ, Short Answer, Long Answer).
        - A bulleted list of key strengths, identifying specific concepts the user understands well.
        - A bulleted list of areas for improvement, detailing specific concepts where the user struggled and providing actionable suggestions for review.`;
        
        const response = await generateContentWithRetry({
             model: "gemini-2.5-flash",
             contents: prompt,
             config: {
                 responseMimeType: "application/json",
                 responseSchema: quizFeedbackSchema,
                 temperature: 0.5,
             }
        });
        
        return JSON.parse(response.text);
     } catch (error) {
        console.error("Error generating quiz feedback summary:", error);
        if (error instanceof Error) { throw error; }
        throw new Error("An unknown error occurred while generating the summary.");
     }
}

export const refineAiResponse = async (
    originalResponse: string,
    userFeedback: string,
    learningContext: string
): Promise<string> => {
    try {
        const prompt = `You are a helpful AI assistant. A ${learningContext} was given the following information:
        --- ORIGINAL RESPONSE ---
        ${originalResponse}
        --- END ORIGINAL RESPONSE ---

        The user was not fully satisfied and provided this feedback: "${userFeedback}".

        Your task is to rewrite the original response, taking the user's feedback into account to better meet their needs. Provide only the new, refined response.`;

        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.6,
            }
        });

        return response.text;
    } catch (error) {
        console.error("Error refining AI response:", error);
        if (error instanceof Error) { throw error; }
        throw new Error("An unknown error occurred while refining the response.");
    }
};

export const analyzePdfsForTopic = async (
    pdfResources: Resource[],
    learningContext: string,
    subjectName: string,
    topicTitle: string,
): Promise<string> => {
    try {
        const prompt = `You are an expert research assistant. A ${learningContext} is studying the topic "${topicTitle}" for the subject "${subjectName}". Your task is to analyze the content of the attached PDF file(s).
        
        Read through all the provided text and extract ONLY the information that is directly relevant to the topic "${topicTitle}".
        
        Synthesize the extracted information into a coherent and well-structured summary. Use markdown for formatting, including headings, bullet points, and bold text to organize the content effectively. Ignore any irrelevant sections from the PDFs. Provide only the summary.`;

        const textPart = { text: prompt };
        const fileParts = pdfResources.map(resource => {
            const match = resource.url?.match(/^data:(.*);base64,(.*)$/);
            if (!match) throw new Error(`Invalid data URL for PDF: ${resource.name}`);
            const mimeType = match[1];
            const data = match[2];
            return { inlineData: { mimeType, data } };
        });

        if (fileParts.length === 0) {
            throw new Error("No PDF files provided for analysis.");
        }

        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, ...fileParts] },
            config: { temperature: 0.5 }
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing PDFs with Gemini:", error);
        if (error instanceof Error) { throw error; }
        throw new Error("An unknown error occurred while analyzing the PDFs.");
    }
};

export const analyzeTranscript = async (
    transcript: string,
    learningContext: string,
    topicTitle: string,
): Promise<{ summary: string; strongPoints: string; weakPoints: string; hyperlinks: string; }> => {
    try {
        const prompt = `You are an expert academic coach. A ${learningContext} is studying the topic "${topicTitle}" and has provided a transcript from a lecture or audio note.
        
        Your task is to analyze the following transcript and provide a structured learning guide.
        
        Transcript: """
        ${transcript}
        """

        Based on the transcript, please generate:
        1. A concise summary of the main topics discussed.
        2. A list of "Strong Points": concepts that, if understood, indicate a good grasp of the material.
        3. A list of "Areas for Improvement": complex or nuanced concepts that the student might need to review.
        4. A list of 3-5 high-quality, relevant hyperlinks to external resources (articles, videos, tutorials) that would help the student better understand the "Areas for Improvement". Use your search tool to find these links.

        Return the result ONLY as a raw JSON object, without any markdown formatting like \`\`\`json. The JSON object must have the following structure: { "summary": "...", "strongPoints": "...", "weakPoints": "...", "hyperlinks": "..." }`;

        const response = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                // FIX: Removed responseMimeType and responseSchema as they are incompatible with the googleSearch tool.
                tools: [{ googleSearch: {} }],
                temperature: 0.5
            }
        });
        
        // The response may be wrapped in markdown, so we need to clean it before parsing.
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.slice(7, -3).trim();
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.slice(3, -3).trim();
        }
        
        const parsedResult = JSON.parse(jsonStr);

        // FIX: The AI can return values as strings or arrays. This function ensures all values are strings to prevent runtime errors.
        const ensureString = (value: unknown): string => {
            if (typeof value === 'string') {
                return value;
            }
            if (Array.isArray(value)) {
                return value.filter(item => typeof item === 'string').join('\n');
            }
            return ''; // Return empty string for other types to avoid errors
        };

        const analysisResult = {
            summary: ensureString(parsedResult.summary),
            strongPoints: ensureString(parsedResult.strongPoints),
            weakPoints: ensureString(parsedResult.weakPoints),
            hyperlinks: ensureString(parsedResult.hyperlinks),
        };
        
        // Append resource links from grounding to the hyperlinks section
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const resourceLinks = groundingChunks
            .map(chunk => chunk.web)
            .filter(web => web?.uri && web?.title)
            .map(web => `* [${web.title}](${web.uri})`)
            .join('\n');
        
        if (resourceLinks.length > 0) {
            if (analysisResult.hyperlinks.trim().length > 0) {
                 analysisResult.hyperlinks += `\n\n**Additional Resources Found:**\n${resourceLinks}`;
            } else {
                 analysisResult.hyperlinks = `**Additional Resources Found:**\n${resourceLinks}`;
            }
        }
        
        return analysisResult;
    } catch (error) {
        console.error("Error analyzing transcript with Gemini:", error);
        if (error instanceof Error) { throw error; }
        throw new Error("An unknown error occurred while analyzing the transcript.");
    }
};