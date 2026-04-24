from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Sample quiz questions database
quiz_data = {
    "aptitude": [
        {
            "id": 1,
            "question": "A train travels 360 km in 4 hours. What is its speed in m/s?",
            "options": ["20 m/s", "25 m/s", "30 m/s", "35 m/s"],
            "answer": 1,
            "explanation": "Speed = 360 km / 4 h = 90 km/h = 90 × (1000/3600) = 25 m/s"
        },
        {
            "id": 2,
            "question": "If 6 workers can build a wall in 10 days, how many days will 4 workers take?",
            "options": ["12 days", "14 days", "15 days", "18 days"],
            "answer": 2,
            "explanation": "Work = 6×10 = 60 man-days. Days for 4 workers = 60/4 = 15 days."
        },
        {
            "id": 3,
            "question": "What is 15% of 240?",
            "options": ["30", "36", "40", "45"],
            "answer": 1,
            "explanation": "15% of 240 = (15/100) × 240 = 36"
        },
        {
            "id": 4,
            "question": "Find the next number in the series: 2, 6, 12, 20, 30, ?",
            "options": ["40", "42", "44", "48"],
            "answer": 1,
            "explanation": "Differences: 4, 6, 8, 10, 12. Next = 30 + 12 = 42"
        },
        {
            "id": 5,
            "question": "A and B together can complete a job in 8 days. A alone can do it in 12 days. How long will B take alone?",
            "options": ["20 days", "24 days", "28 days", "30 days"],
            "answer": 1,
            "explanation": "B's rate = 1/8 - 1/12 = 1/24. B takes 24 days."
        }
    ],
    "technical": [
        {
            "id": 1,
            "question": "What is the time complexity of Binary Search?",
            "options": ["O(n)", "O(log n)", "O(n²)", "O(n log n)"],
            "answer": 1,
            "explanation": "Binary search halves the search space each step, giving O(log n)."
        },
        {
            "id": 2,
            "question": "Which data structure uses LIFO order?",
            "options": ["Queue", "Linked List", "Stack", "Tree"],
            "answer": 2,
            "explanation": "Stack follows Last In First Out (LIFO) principle."
        },
        {
            "id": 3,
            "question": "What does SQL stand for?",
            "options": ["Structured Query Language", "Simple Query Language", "Sequential Query Logic", "Standard Query Language"],
            "answer": 0,
            "explanation": "SQL = Structured Query Language, used to manage relational databases."
        },
        {
            "id": 4,
            "question": "Which sorting algorithm has best-case O(n) time complexity?",
            "options": ["Quick Sort", "Merge Sort", "Insertion Sort", "Heap Sort"],
            "answer": 2,
            "explanation": "Insertion sort has O(n) best-case when array is already sorted."
        },
        {
            "id": 5,
            "question": "What is the output of: print(type([])) in Python?",
            "options": ["<class 'tuple'>", "<class 'list'>", "<class 'dict'>", "<class 'array'>"],
            "answer": 1,
            "explanation": "[] creates a list object in Python."
        }
    ],
    "verbal": [
        {
            "id": 1,
            "question": "Choose the synonym of 'Eloquent':",
            "options": ["Quiet", "Articulate", "Confused", "Aggressive"],
            "answer": 1,
            "explanation": "Eloquent means fluent and persuasive in speaking — synonym: Articulate."
        },
        {
            "id": 2,
            "question": "Identify the correctly spelled word:",
            "options": ["Accomodate", "Accommodate", "Acomodate", "Acommodate"],
            "answer": 1,
            "explanation": "The correct spelling is 'Accommodate' — double 'c' and double 'm'."
        },
        {
            "id": 3,
            "question": "Choose the antonym of 'Benevolent':",
            "options": ["Kind", "Generous", "Malevolent", "Charitable"],
            "answer": 2,
            "explanation": "Benevolent means kind/generous. Its antonym is Malevolent (evil-minded)."
        },
        {
            "id": 4,
            "question": "Fill in the blank: She _____ to the gym every morning.",
            "options": ["go", "goes", "going", "gone"],
            "answer": 1,
            "explanation": "'She' is third-person singular, so we use 'goes'."
        },
        {
            "id": 5,
            "question": "What does the idiom 'Hit the nail on the head' mean?",
            "options": ["To cause injury", "To be exactly right", "To work hard", "To miss an opportunity"],
            "answer": 1,
            "explanation": "It means to describe exactly what is causing a situation or problem."
        }
    ]
}

interview_tips = [
    {"icon": "🎯", "title": "Research the Company", "tip": "Study the company's mission, products, culture, and recent news before the interview."},
    {"icon": "💼", "title": "Dress Professionally", "tip": "Wear appropriate business attire. First impressions matter significantly."},
    {"icon": "🕐", "title": "Arrive Early", "tip": "Reach the venue 10-15 minutes before your scheduled time."},
    {"icon": "📝", "title": "Prepare STAR Stories", "tip": "Use Situation-Task-Action-Result format for behavioral questions."},
    {"icon": "🤝", "title": "Ask Questions", "tip": "Prepare 3-5 thoughtful questions to ask the interviewer at the end."},
    {"icon": "💡", "title": "Know Your Resume", "tip": "Be ready to discuss every detail listed on your resume confidently."}
]

roadmap_data = {
    "dsa": ["Arrays & Strings", "Linked Lists", "Stacks & Queues", "Trees & Graphs", "Sorting Algorithms", "Dynamic Programming", "Greedy Algorithms", "Backtracking"],
    "cs_fundamentals": ["Operating Systems", "Database Management", "Computer Networks", "OOP Concepts", "System Design Basics"],
    "programming": ["Choose a Language (C++/Java/Python)", "Problem Solving on LeetCode", "Competitive Programming", "Projects & GitHub"],
    "soft_skills": ["Communication Skills", "Group Discussion Prep", "HR Interview Questions", "Resume Building", "LinkedIn Optimization"]
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/quiz/<category>')
def get_quiz(category):
    if category in quiz_data:
        return jsonify({"questions": quiz_data[category], "category": category})
    return jsonify({"error": "Category not found"}), 404

@app.route('/api/tips')
def get_tips():
    return jsonify({"tips": interview_tips})

@app.route('/api/roadmap')
def get_roadmap():
    return jsonify({"roadmap": roadmap_data})

@app.route('/api/submit-quiz', methods=['POST'])
def submit_quiz():
    data = request.json
    category = data.get('category')
    answers = data.get('answers', {})
    
    if category not in quiz_data:
        return jsonify({"error": "Invalid category"}), 400
    
    questions = quiz_data[category]
    score = 0
    results = []
    
    for q in questions:
        qid = str(q['id'])
        user_answer = answers.get(qid, -1)
        correct = q['answer']
        is_correct = user_answer == correct
        if is_correct:
            score += 1
        results.append({
            "id": q['id'],
            "question": q['question'],
            "user_answer": user_answer,
            "correct_answer": correct,
            "is_correct": is_correct,
            "explanation": q['explanation']
        })
    
    return jsonify({
        "score": score,
        "total": len(questions),
        "percentage": round((score / len(questions)) * 100),
        "results": results
    })

if __name__ == '__main__':
    app.run(debug=True)
