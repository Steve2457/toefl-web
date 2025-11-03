// src/parser.js
const mammoth = window.mammoth;

/**
 * Parse a single question block
 * @param {HTMLElement[]} paragraphs - Array of paragraph elements containing a question and its options
 * @param {number} number - Question number
 * @returns {object|null} - Parsed question object
 */
function parseSingleQuestion(paragraphs, number) {
    let content = '';
    let imageHtml = '';
    const options = [];
    let optionsStarted = false;
    
    paragraphs.forEach(p => {
        const text = p.textContent.trim();
        const optionMatch = text.match(/^([A-F])[\.\)、]\s*(.*)/);

        if (optionMatch) {
            optionsStarted = true;
            const optionTextHtml = p.innerHTML.replace(/^\s*[A-F][\.\)、]\s*/, '').trim();
            options.push({
                label: optionMatch[1],
                text: optionTextHtml
            });
        } else {
            if (!optionsStarted) {
                if (p.querySelector('img')) {
                    imageHtml += p.outerHTML;
                } else {
                    content += p.outerHTML;
                }
            }
        }
    });

    if (imageHtml && options.length === 0) {
        ['A', 'B', 'C', 'D'].forEach(label => {
            options.push({ label: label, text: '' });
        });
    }

    return {
        number: number,
        content: content.trim(),
        imageHtml: imageHtml,
        options: options
    };
}

/**
 * Parse questions from an array of paragraph elements
 * @param {HTMLElement[]} paragraphs - Paragraphs containing all questions
 * @param {number} questionNumberOffset - Starting number for questions
 * @returns {object[]} - Array of parsed questions
 */
function parseQuestions(paragraphs, questionNumberOffset = 0) {
    if (!paragraphs || paragraphs.length === 0) {
        return [];
    }

    const questions = [];
    let currentQuestionBlock = [];
    let questionNumber = questionNumberOffset + 1;

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const text = p.textContent.trim();
        const isNewQuestion = /^\s*(\d+)[\.\)、]/.test(text);

        if (isNewQuestion && currentQuestionBlock.length > 0) {
            const parsed = parseSingleQuestion(currentQuestionBlock, questionNumber - 1);
            if (parsed) {
                questions.push(parsed);
            }
            currentQuestionBlock = [];
            questionNumber++;
        }
        currentQuestionBlock.push(p);
    }

    if (currentQuestionBlock.length > 0) {
        const parsed = parseSingleQuestion(currentQuestionBlock, questionNumber -1);
        if (parsed) {
            questions.push(parsed);
        }
    }
    
    return questions.map((q, index) => {
        q.number = questionNumberOffset + index + 1;
        return q;
    });
}

/**
 * Parse Word file
 * @param {File} file - Word file uploaded by user
 * @returns {Promise<string>} - Converted HTML content
 */
export async function parseWordFile(file) {
    if (!mammoth) {
        throw new Error("Mammoth.js library is not loaded. Please check your internet connection.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
}

/**
 * Separate reading passage and questions from HTML string
 * @param {string} htmlString - HTML content of the entire document
 * @param {number} questionNumberOffset - Starting number for questions
 * @returns {{readingContent: string, questions: object[]}}
 */
export function parseReadingAndQuestions(htmlString, questionNumberOffset = 0) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const allParagraphs = Array.from(doc.body.children);

    let readingContentHtml = '';
    let questionsHtml = [];
    let splitIndex = -1;

    for (let i = 0; i < allParagraphs.length; i++) {
        const p = allParagraphs[i];
        const text = p.textContent.trim();
        if (/^\s*1[\.\)、]/.test(text)) {
            splitIndex = i;
            break;
        }
    }

    if (splitIndex !== -1) {
        readingContentHtml = allParagraphs.slice(0, splitIndex).map(p => p.outerHTML).join('');
        questionsHtml = allParagraphs.slice(splitIndex);
    } else {
        readingContentHtml = htmlString;
    }

    const questions = parseQuestions(questionsHtml, questionNumberOffset);

    return {
        readingContent: readingContentHtml,
        questions: questions
    };
}
