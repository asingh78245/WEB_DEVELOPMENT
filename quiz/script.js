const quizzes = {
    html: [{
            question: "What does HTML stand for?",
            options: [
                "Hyper Text Markup Language",
                "High Text Machine Language",
                "Hyperlink and Text Markup Language",
                "Home Tool Markup Language"
            ],
            correct: 0
        },
        {
            question: "Which HTML tag is used to create a hyperlink?",
            options: ["<a>", "<link>", "<href>", "<hyper>"],
            correct: 0
        },
        {
            question: "Which tag is used for the largest heading?",
            options: ["<h6>", "<h1>", "<head>", "<title>"],
            correct: 1
        },
        {
            question: "Which attribute is used to provide an image path?",
            options: ["href", "src", "link", "path"],
            correct: 1
        },
        {
            question: "Which tag is used to create an unordered list?",
            options: ["<ol>", "<ul>", "<li>", "<list>"],
            correct: 1
        }
    ],

    css: [{
            question: "What does CSS stand for?",
            options: [
                "Color Style Sheets",
                "Cascading Style Sheets",
                "Computer Style Sheets",
                "Creative Style System"
            ],
            correct: 1
        },
        {
            question: "Which property is used to change text color?",
            options: ["font-style", "text-color", "color", "background"],
            correct: 2
        },
        {
            question: "Which unit is relative to the font size?",
            options: ["px", "cm", "em", "mm"],
            correct: 2
        },
        {
            question: "Which property is used for spacing inside an element?",
            options: ["margin", "padding", "border", "gap"],
            correct: 1
        },
        {
            question: "Which CSS property makes text bold?",
            options: ["font-weight", "text-style", "bold", "font-bold"],
            correct: 0
        }
    ],

    js: [{
            question: "Which keyword is used to declare a variable in JavaScript?",
            options: ["var", "int", "define", "letAll"],
            correct: 0
        },
        {
            question: "Which symbol is used for single-line comments in JavaScript?",
            options: ["<!-- -->", "/* */", "//", "#"],
            correct: 2
        },
        {
            question: "Which method prints output in the console?",
            options: ["console.print()", "console.log()", "print()", "log.console()"],
            correct: 1
        },
        {
            question: "Which operator is used for strict equality?",
            options: ["==", "=", "===", "!==="],
            correct: 2
        },
        {
            question: "Which data type is NOT primitive in JavaScript?",
            options: ["String", "Number", "Boolean", "Object"],
            correct: 3
        }
    ]
};

const startBox = document.getElementById("startBox");
const quizBox = document.getElementById("quizBox");
const resultBox = document.getElementById("resultBox");

const questionText = document.getElementById("questionText");
const optionsBox = document.getElementById("optionsBox");
const nextBtn = document.getElementById("nextBtn");

const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");

const timerText = document.getElementById("timerText");
const categoryBadge = document.getElementById("categoryBadge");

const scoreText = document.getElementById("scoreText");
const resultMessage = document.getElementById("resultMessage");

const restartBtn = document.getElementById("restartBtn");
const backBtn = document.getElementById("backBtn");

const startBtn = document.getElementById("startBtn");
const selectedCategoryText = document.getElementById("selectedCategoryText");
const categoryButtons = document.querySelectorAll(".cat-btn");

let selectedCategory = null;
let quizData = [];
let currentQuestionIndex = 0;
let score = 0;

let selectedOptionIndex = null;
let isAnswered = false;

let timer = null;
let timeLeft = 15;

categoryButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        categoryButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        selectedCategory = btn.dataset.category;
        selectedCategoryText.textContent = `Selected Category: ${selectedCategory.toUpperCase()}`;
        startBtn.disabled = false;
    });
});

startBtn.addEventListener("click", () => {
    quizData = quizzes[selectedCategory];
    categoryBadge.textContent = `Category: ${selectedCategory.toUpperCase()}`;

    startBox.classList.add("hidden");
    quizBox.classList.remove("hidden");

    startNewQuiz();
});

function startNewQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    loadQuestion();
}

function loadQuestion() {
    optionsBox.innerHTML = "";
    selectedOptionIndex = null;
    isAnswered = false;
    nextBtn.disabled = true;

    const currentQ = quizData[currentQuestionIndex];
    questionText.textContent = currentQ.question;

    progressText.textContent = `Question ${currentQuestionIndex + 1} of ${quizData.length}`;

    const progressPercent = ((currentQuestionIndex) / quizData.length) * 100;
    progressBar.style.width = `${progressPercent}%`;

    currentQ.options.forEach((opt, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt;

        btn.addEventListener("click", () => handleOptionClick(index, btn));
        optionsBox.appendChild(btn);
    });

    startTimer();
}

function handleOptionClick(index, button) {
    if (isAnswered) return;

    selectedOptionIndex = index;
    nextBtn.disabled = false;

    const allBtns = document.querySelectorAll(".option-btn");
    allBtns.forEach(b => b.classList.remove("selected"));
    button.classList.add("selected");
}

nextBtn.addEventListener("click", () => {
    if (selectedOptionIndex === null) {
        alert("Please select an option first!");
        return;
    }

    submitAnswerAndShowFeedback();
});

function submitAnswerAndShowFeedback() {
    if (isAnswered) return;
    isAnswered = true;

    clearInterval(timer);

    const correctIndex = quizData[currentQuestionIndex].correct;
    const allBtns = document.querySelectorAll(".option-btn");

    allBtns.forEach(b => b.classList.add("disabled"));

    allBtns[correctIndex].classList.add("correct");

    if (selectedOptionIndex !== correctIndex) {
        allBtns[selectedOptionIndex].classList.add("wrong");
    } else {
        score++;
    }

    setTimeout(() => {
        goNextQuestion();
    }, 900);
}

function goNextQuestion() {
    currentQuestionIndex++;

    if (currentQuestionIndex < quizData.length) {
        loadQuestion();
    } else {
        showResult();
    }
}

function startTimer() {
    clearInterval(timer);
    timeLeft = 15;
    timerText.textContent = timeLeft;

    const timerBox = document.querySelector(".timer-box");
    timerBox.classList.remove("timer-warning");

    timer = setInterval(() => {
        timeLeft--;
        timerText.textContent = timeLeft;

        if (timeLeft <= 5) {
            timerBox.classList.add("timer-warning");
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            autoSubmitWhenTimeEnds();
        }
    }, 1000);
}

function autoSubmitWhenTimeEnds() {
    if (selectedOptionIndex === null) {
        selectedOptionIndex = -1;
    }

    submitAnswerAndShowFeedback();
}

function showResult() {
    quizBox.classList.add("hidden");
    resultBox.classList.remove("hidden");

    progressBar.style.width = `100%`;

    scoreText.textContent = `Score: ${score}/${quizData.length}`;

    if (score === quizData.length) {
        resultMessage.textContent = "Excellent! 🎉 Perfect Score!";
    } else if (score >= quizData.length / 2) {
        resultMessage.textContent = "Good Job! ✅ Keep practicing!";
    } else {
        resultMessage.textContent = "Try Again! 💪 You can do better!";
    }
}

restartBtn.addEventListener("click", () => {
    resultBox.classList.add("hidden");
    quizBox.classList.remove("hidden");
    startNewQuiz();
});

backBtn.addEventListener("click", () => {
    clearInterval(timer);

    resultBox.classList.add("hidden");
    quizBox.classList.add("hidden");
    startBox.classList.remove("hidden");

    selectedCategory = null;
    startBtn.disabled = true;
    selectedCategoryText.textContent = "No category selected";

    categoryButtons.forEach(b => b.classList.remove("active"));

    progressBar.style.width = `0%`;
});