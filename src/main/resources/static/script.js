/* ================================================
   QuizMaster — Main Script
   Vanilla JS quiz engine with REST API integration
   ================================================ */

// ================= CONFIGURATION =================
const API_BASE = window.location.origin; // Same origin as Spring Boot serves the static files
const TIMER_SECONDS = 15; // Time per question

// ================= DOM ELEMENTS =================
const startScreen    = document.getElementById('start-screen');
const quizScreen     = document.getElementById('quiz-screen');
const resultScreen   = document.getElementById('result-screen');

// Start Screen
const setupForm      = document.getElementById('quiz-setup-form');
const categorySelect = document.getElementById('category-select');
const numQuestionsIn = document.getElementById('num-questions');
const startLoading   = document.getElementById('start-loading');

// Quiz Screen
const progressText   = document.getElementById('progress-text');
const scoreBadge     = document.getElementById('score-badge');
const timerBar       = document.getElementById('timer-bar');
const timerText      = document.getElementById('timer-text');
const questionText   = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const nextBtn        = document.getElementById('next-btn');

// Result Screen
const resultIcon     = document.getElementById('result-icon');
const resultTitle    = document.getElementById('result-title');
const resultSubtitle = document.getElementById('result-subtitle');
const scoreCircle    = document.getElementById('score-circle-fill');
const scorePercent   = document.getElementById('score-percent');
const scoreDetail    = document.getElementById('score-detail');
const reviewContainer = document.getElementById('review-container');
const restartBtn     = document.getElementById('restart-btn');

// Error Toast
const errorToast     = document.getElementById('error-toast');
const errorMessage   = document.getElementById('error-message');

// ================= STATE =================
let quizId = null;                // ID of the created quiz
let questions = [];               // Array of QuestionsWrapper objects from API
let answerKey = {};               // Map of question id → rightAnswer (from /allQuestion)
let currentIndex = 0;             // Current question index
let score = 0;                    // Running score
let userResponses = [];           // Array of { id, response } for submission
let timerInterval = null;         // Timer interval reference
let timeLeft = TIMER_SECONDS;     // Countdown value
let answered = false;             // Has the user answered the current question?

// ================= UTILITY FUNCTIONS =================

/**
 * Switch to a specific screen with animation
 */
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Trigger reflow for re-animation
    void screen.offsetWidth;
    screen.classList.add('active');
}

/**
 * Show an error toast notification
 */
function showError(msg) {
    errorMessage.textContent = msg;
    errorToast.classList.remove('hidden');
    errorToast.classList.add('show');
    setTimeout(() => {
        errorToast.classList.remove('show');
        setTimeout(() => errorToast.classList.add('hidden'), 300);
    }, 4000);
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        // Check content type to decide how to parse
        const contentType = response.headers.get('Content-Type') || '';
        const text = await response.text();
        if (!text) return text;
        // Only parse as JSON if the response is actually JSON
        if (contentType.includes('application/json')) {
            return JSON.parse(text);
        }
        // Return plain text as-is (e.g. "Success" from /quiz/create)
        return text;
    } catch (error) {
        if (error.name === 'TypeError') {
            throw new Error('Network error — is the server running?');
        }
        throw error;
    }
}

// ================= API FUNCTIONS =================

/**
 * Fetch all questions to build the answer key
 * GET /question/allQuestion → [{id, questionTitle, option1-4, rightAnswer, category, ...}]
 */
async function fetchAllQuestions() {
    return apiFetch(`${API_BASE}/question/allQuestion`);
}

/**
 * Create a new quiz
 * POST /quiz/create?category=X&numQ=N&title=T → "Success"
 */
async function createQuiz(category, numQ, title) {
    return apiFetch(`${API_BASE}/quiz/create?category=${encodeURIComponent(category)}&numQ=${numQ}&title=${encodeURIComponent(title)}`, {
        method: 'POST'
    });
}

/**
 * Fetch quiz questions by ID
 * GET /quiz/get/{id} → [{id, questionTitle, option1-4}]
 */
async function fetchQuizQuestions(id) {
    return apiFetch(`${API_BASE}/quiz/get/${id}`);
}

/**
 * Submit quiz responses
 * POST /quiz/submit/{id} with body [{id, response}] → score (int)
 */
async function submitQuiz(id, responses) {
    return apiFetch(`${API_BASE}/quiz/submit/${id}`, {
        method: 'POST',
        body: JSON.stringify(responses)
    });
}

// ================= INITIALIZATION =================

/**
 * On page load: fetch all questions to extract unique categories and build answer key
 */
async function init() {
    try {
        const allQuestions = await fetchAllQuestions();

        // Build answer key: question ID → right answer text
        allQuestions.forEach(q => {
            answerKey[q.id] = q.rightAnswer;
        });

        // Extract unique categories
        const categories = [...new Set(allQuestions.map(q => q.category).filter(Boolean))];

        // Populate category dropdown
        categorySelect.innerHTML = '';
        if (categories.length === 0) {
            categorySelect.innerHTML = '<option value="" disabled selected>No categories found</option>';
        } else {
            categorySelect.innerHTML = '<option value="" disabled selected>Select a category</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                categorySelect.appendChild(option);
            });
        }
    } catch (err) {
        showError('Failed to load categories: ' + err.message);
        categorySelect.innerHTML = '<option value="" disabled selected>Failed to load</option>';
    }
}

// Run initialization when page loads
document.addEventListener('DOMContentLoaded', init);

// ================= EVENT HANDLERS =================

/**
 * Handle quiz setup form submission
 */
setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const category = categorySelect.value;
    const numQ = parseInt(numQuestionsIn.value, 10);

    if (!category) {
        showError('Please select a category.');
        return;
    }
    if (numQ < 1 || numQ > 20) {
        showError('Number of questions must be between 1 and 20.');
        return;
    }

    // Show loading
    startLoading.classList.remove('hidden');

    try {
        // Step 1: Create the quiz
        const title = `${category}_quiz_${Date.now()}`;
        await createQuiz(category, numQ, title);

        // Step 2: We need the quiz ID. The API returns "Success" but not the ID.
        // We need to figure out the quiz ID. Since the API doesn't return it directly,
        // we'll try fetching by incrementing IDs from a reasonable start.
        // Alternative: fetch a known recent quiz. For simplicity, let's try
        // fetching IDs starting from 1 until we find one that returns the right number of questions.
        // A better approach: try the latest quiz by iterating from a high number.
        
        // Practical approach: try IDs in descending order from a reasonable max
        let foundQuiz = false;
        // Try fetching quizzes starting from ID 1 upward — find the latest
        // Since we just created it, let's try a range
        for (let tryId = 1; tryId <= 100; tryId++) {
            try {
                const qs = await fetchQuizQuestions(tryId);
                if (qs && qs.length > 0) {
                    quizId = tryId;
                    questions = qs;
                    foundQuiz = true;
                    // Keep looking for higher IDs (latest quiz)
                }
            } catch {
                // ID not found, stop searching
                break;
            }
        }

        if (!foundQuiz) {
            throw new Error('Could not find the created quiz. Please try again.');
        }

        // Step 3: Reset state and start quiz
        currentIndex = 0;
        score = 0;
        userResponses = [];
        answered = false;

        startLoading.classList.add('hidden');
        showScreen(quizScreen);
        loadQuestion();

    } catch (err) {
        startLoading.classList.add('hidden');
        showError('Failed to create quiz: ' + err.message);
    }
});

/**
 * Handle Next button click
 */
nextBtn.addEventListener('click', () => {
    currentIndex++;
    if (currentIndex < questions.length) {
        loadQuestion();
    } else {
        finishQuiz();
    }
});

/**
 * Handle Restart button click
 */
restartBtn.addEventListener('click', () => {
    showScreen(startScreen);
});

// ================= QUIZ ENGINE =================

/**
 * Load the current question into the UI
 */
function loadQuestion() {
    answered = false;
    nextBtn.classList.add('hidden');

    const q = questions[currentIndex];
    const total = questions.length;

    // Update header
    progressText.textContent = `Question ${currentIndex + 1} of ${total}`;
    scoreBadge.textContent = `Score: ${score}`;

    // Update question text
    questionText.textContent = q.questionTitle;

    // Build option buttons
    const optionTexts = [q.option1, q.option2, q.option3, q.option4];
    const letters = ['A', 'B', 'C', 'D'];
    optionsContainer.innerHTML = '';

    optionTexts.forEach((text, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `
            <span class="option-letter">${letters[i]}</span>
            <span class="option-text">${text}</span>
        `;
        btn.addEventListener('click', () => selectOption(btn, text, q));
        // Stagger animation
        btn.style.animationDelay = `${i * 0.08}s`;
        btn.style.animation = 'fadeSlideIn 0.35s ease forwards';
        btn.style.opacity = '0';
        optionsContainer.appendChild(btn);
    });

    // Start timer
    startTimer();
}

/**
 * Handle option selection
 */
function selectOption(selectedBtn, selectedText, question) {
    if (answered) return;
    answered = true;

    // Stop timer
    clearInterval(timerInterval);

    // Disable all option buttons
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(btn => btn.disabled = true);

    // Record the user's response
    userResponses.push({ id: question.id, response: selectedText });

    // Get correct answer from answer key
    const correctAnswer = answerKey[question.id];
    const isCorrect = selectedText === correctAnswer;

    if (isCorrect) {
        score++;
        selectedBtn.classList.add('correct');
        selectedBtn.innerHTML += '<span class="status-icon">✓</span>';
    } else {
        selectedBtn.classList.add('wrong');
        selectedBtn.innerHTML += '<span class="status-icon">✗</span>';

        // Highlight the correct answer
        allBtns.forEach(btn => {
            const btnText = btn.querySelector('.option-text').textContent;
            if (btnText === correctAnswer) {
                btn.classList.add('correct');
                btn.innerHTML += '<span class="status-icon">✓</span>';
            }
        });
    }

    // Update score badge
    scoreBadge.textContent = `Score: ${score}`;

    // Show next button
    nextBtn.classList.remove('hidden');

    // Update next button text for last question
    if (currentIndex === questions.length - 1) {
        nextBtn.querySelector('span').textContent = 'See Results';
    } else {
        nextBtn.querySelector('span').textContent = 'Next Question';
    }
}

// ================= TIMER =================

/**
 * Start the countdown timer for the current question
 */
function startTimer() {
    clearInterval(timerInterval);
    timeLeft = TIMER_SECONDS;
    updateTimerUI();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, 1000);
}

/**
 * Update timer bar width and color
 */
function updateTimerUI() {
    const pct = (timeLeft / TIMER_SECONDS) * 100;
    timerBar.style.width = pct + '%';
    timerText.textContent = timeLeft + 's';

    // Color transitions
    timerBar.classList.remove('mid', 'low');
    if (pct <= 33) {
        timerBar.classList.add('low');
    } else if (pct <= 66) {
        timerBar.classList.add('mid');
    }
}

/**
 * Handle timer expiration (auto-skip)
 */
function handleTimeout() {
    if (answered) return;
    answered = true;

    // Disable all option buttons
    const allBtns = optionsContainer.querySelectorAll('.option-btn');
    allBtns.forEach(btn => btn.disabled = true);

    // Record no response (timeout)
    const q = questions[currentIndex];
    userResponses.push({ id: q.id, response: '' });

    // Highlight the correct answer
    const correctAnswer = answerKey[q.id];
    allBtns.forEach(btn => {
        const btnText = btn.querySelector('.option-text').textContent;
        if (btnText === correctAnswer) {
            btn.classList.add('correct');
            btn.innerHTML += '<span class="status-icon">✓</span>';
        }
    });

    // Show next button
    nextBtn.classList.remove('hidden');
    if (currentIndex === questions.length - 1) {
        nextBtn.querySelector('span').textContent = 'See Results';
    } else {
        nextBtn.querySelector('span').textContent = 'Next Question';
    }
}

// ================= RESULTS =================

/**
 * Finish the quiz: submit answers and display results
 */
async function finishQuiz() {
    clearInterval(timerInterval);

    // Submit answers to the server (for record-keeping)
    try {
        await submitQuiz(quizId, userResponses);
    } catch (err) {
        showError('Failed to submit quiz: ' + err.message);
    }
    // Use locally-calculated score (already tracked in selectOption)

    const total = questions.length;
    const pct = Math.round((score / total) * 100);

    // Choose icon & title based on score
    if (pct >= 80) {
        resultIcon.textContent = '🏆';
        resultTitle.textContent = 'Outstanding!';
        resultSubtitle.textContent = 'You absolutely aced it!';
    } else if (pct >= 60) {
        resultIcon.textContent = '🎉';
        resultTitle.textContent = 'Great Job!';
        resultSubtitle.textContent = 'You did really well!';
    } else if (pct >= 40) {
        resultIcon.textContent = '💪';
        resultTitle.textContent = 'Good Effort!';
        resultSubtitle.textContent = 'Keep practicing to improve!';
    } else {
        resultIcon.textContent = '📚';
        resultTitle.textContent = 'Keep Learning!';
        resultSubtitle.textContent = 'Review the material and try again.';
    }

    // Animate score circle
    const circumference = 2 * Math.PI * 52; // radius=52 from SVG
    const offset = circumference - (pct / 100) * circumference;

    // Set stroke color based on score
    if (pct >= 70) {
        scoreCircle.style.stroke = 'var(--correct)';
    } else if (pct >= 40) {
        scoreCircle.style.stroke = 'var(--timer-mid)';
    } else {
        scoreCircle.style.stroke = 'var(--wrong)';
    }

    // Animate after a brief delay
    setTimeout(() => {
        scoreCircle.style.strokeDashoffset = offset;
    }, 100);

    scorePercent.textContent = pct + '%';
    scoreDetail.textContent = `You scored ${score} out of ${total}`;

    // Build review items
    reviewContainer.innerHTML = '';
    questions.forEach((q, i) => {
        const userAnswer = userResponses[i]?.response || '';
        const correctAnswer = answerKey[q.id] || 'N/A';
        const isTimeout = userAnswer === '';
        const isCorrect = userAnswer === correctAnswer;

        const item = document.createElement('div');
        item.className = `review-item ${isTimeout ? 'review-timeout' : (isCorrect ? 'review-correct' : 'review-wrong')}`;
        item.style.animationDelay = `${i * 0.05}s`;

        let answerHTML;
        if (isTimeout) {
            answerHTML = `
                <span class="timeout-label">⏱ Time's up!</span> — 
                Correct answer: <span class="correct-label">${correctAnswer}</span>
            `;
        } else if (isCorrect) {
            answerHTML = `
                Your answer: <span class="correct-label">✓ ${userAnswer}</span>
            `;
        } else {
            answerHTML = `
                Your answer: <span class="wrong-label">✗ ${userAnswer}</span> — 
                Correct: <span class="correct-label">✓ ${correctAnswer}</span>
            `;
        }

        item.innerHTML = `
            <p class="review-question">${i + 1}. ${q.questionTitle}</p>
            <p class="review-answer">${answerHTML}</p>
        `;
        reviewContainer.appendChild(item);
    });

    // Reset circle for re-animation
    scoreCircle.style.strokeDashoffset = circumference;

    showScreen(resultScreen);

    // Trigger circle animation after screen transition
    setTimeout(() => {
        scoreCircle.style.strokeDashoffset = offset;
    }, 300);
}
