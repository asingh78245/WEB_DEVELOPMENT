from flask import Flask, render_template, jsonify, request, session, send_from_directory
import json, os, uuid, hashlib, datetime
from functools import wraps
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = 'placement_tracker_secret_2024'

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')

# ─── Data Persistence ────────────────────────────────────────────────────────

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {
        "users": {},
        "applications": {},
        "drives": [],
        "notifications": {},
        "notes": {}
    }

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def hash_password(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        data = load_data()
        user = data['users'].get(session['user_id'])
        if not user or not user.get('is_admin'):
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated

# ─── Static / Template ───────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    body = request.json
    name = body.get('name', '').strip()
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    roll = body.get('roll', '').strip()
    branch = body.get('branch', '').strip()

    if not all([name, email, password, roll, branch]):
        return jsonify({"error": "All fields are required"}), 400

    data = load_data()
    for uid, u in data['users'].items():
        if u['email'] == email:
            return jsonify({"error": "Email already registered"}), 409

    uid = str(uuid.uuid4())
    data['users'][uid] = {
        "id": uid,
        "name": name,
        "email": email,
        "password": hash_password(password),
        "roll": roll,
        "branch": branch,
        "phone": "",
        "linkedin": "",
        "github": "",
        "resume": None,
        "is_admin": False,
        "created_at": datetime.datetime.now().isoformat()
    }
    data['applications'][uid] = []
    data['notifications'][uid] = []
    data['notes'][uid] = []
    save_data(data)
    session['user_id'] = uid
    u = data['users'][uid]
    return jsonify({"message": "Account created", "user": {k: v for k, v in u.items() if k != 'password'}}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    body = request.json
    email = body.get('email', '').strip().lower()
    password = body.get('password', '')
    data = load_data()
    for uid, u in data['users'].items():
        if u['email'] == email and u['password'] == hash_password(password):
            session['user_id'] = uid
            return jsonify({"message": "Login successful", "user": {k: v for k, v in u.items() if k != 'password'}})
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

@app.route('/api/auth/me')
@login_required
def me():
    data = load_data()
    u = data['users'].get(session['user_id'])
    if not u:
        return jsonify({"error": "User not found"}), 404
    return jsonify({k: v for k, v in u.items() if k != 'password'})

# ─── Profile ──────────────────────────────────────────────────────────────────

@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    body = request.json
    data = load_data()
    u = data['users'][session['user_id']]
    for field in ['name', 'phone', 'linkedin', 'github', 'branch', 'roll']:
        if field in body:
            u[field] = body[field]
    save_data(data)
    return jsonify({k: v for k, v in u.items() if k != 'password'})

@app.route('/api/profile/password', methods=['PUT'])
@login_required
def change_password():
    body = request.json
    old_pwd = body.get('old_password', '')
    new_pwd = body.get('new_password', '')
    data = load_data()
    u = data['users'][session['user_id']]
    if u['password'] != hash_password(old_pwd):
        return jsonify({"error": "Current password is incorrect"}), 400
    if len(new_pwd) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400
    u['password'] = hash_password(new_pwd)
    save_data(data)
    return jsonify({"message": "Password updated"})

@app.route('/api/profile/resume', methods=['POST'])
@login_required
def upload_resume():
    if 'resume' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files['resume']
    if not file or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. PDF/DOC/DOCX only"}), 400
    filename = secure_filename(f"{session['user_id']}_{file.filename}")
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    data = load_data()
    data['users'][session['user_id']]['resume'] = filename
    save_data(data)
    return jsonify({"message": "Resume uploaded", "filename": filename})

# ─── Applications ─────────────────────────────────────────────────────────────

@app.route('/api/applications', methods=['GET'])
@login_required
def get_applications():
    data = load_data()
    apps = data['applications'].get(session['user_id'], [])
    q = request.args.get('q', '').lower()
    status = request.args.get('status', '')
    if q:
        apps = [a for a in apps if q in a['company'].lower() or q in a.get('role', '').lower()]
    if status:
        apps = [a for a in apps if a['status'] == status]
    return jsonify({"applications": sorted(apps, key=lambda x: x['applied_date'], reverse=True)})

@app.route('/api/applications', methods=['POST'])
@login_required
def add_application():
    body = request.json
    company = body.get('company', '').strip()
    role = body.get('role', '').strip()
    package = body.get('package', '').strip()
    deadline = body.get('deadline', '')
    interview_date = body.get('interview_date', '')
    notes = body.get('notes', '').strip()

    if not company or not role:
        return jsonify({"error": "Company and Role are required"}), 400

    data = load_data()
    uid = session['user_id']
    app_entry = {
        "id": str(uuid.uuid4()),
        "company": company,
        "role": role,
        "package": package,
        "status": "Applied",
        "deadline": deadline,
        "interview_date": interview_date,
        "notes": notes,
        "applied_date": datetime.datetime.now().isoformat(),
        "updated_date": datetime.datetime.now().isoformat()
    }
    data['applications'][uid].append(app_entry)

    # Notification
    notif = {
        "id": str(uuid.uuid4()),
        "message": f"Application added for {company} – {role}",
        "type": "new",
        "read": False,
        "created_at": datetime.datetime.now().isoformat()
    }
    data['notifications'][uid].append(notif)
    save_data(data)
    return jsonify({"application": app_entry}), 201

@app.route('/api/applications/<app_id>', methods=['PUT'])
@login_required
def update_application(app_id):
    body = request.json
    data = load_data()
    uid = session['user_id']
    apps = data['applications'].get(uid, [])
    for a in apps:
        if a['id'] == app_id:
            for field in ['company', 'role', 'package', 'status', 'deadline', 'interview_date', 'notes']:
                if field in body:
                    a[field] = body[field]
            a['updated_date'] = datetime.datetime.now().isoformat()
            # Notify status change
            if 'status' in body:
                notif = {
                    "id": str(uuid.uuid4()),
                    "message": f"{a['company']} status updated to {body['status']}",
                    "type": "status",
                    "read": False,
                    "created_at": datetime.datetime.now().isoformat()
                }
                data['notifications'][uid].append(notif)
            save_data(data)
            return jsonify({"application": a})
    return jsonify({"error": "Application not found"}), 404

@app.route('/api/applications/<app_id>', methods=['DELETE'])
@login_required
def delete_application(app_id):
    data = load_data()
    uid = session['user_id']
    apps = data['applications'].get(uid, [])
    original = len(apps)
    data['applications'][uid] = [a for a in apps if a['id'] != app_id]
    if len(data['applications'][uid]) == original:
        return jsonify({"error": "Application not found"}), 404
    save_data(data)
    return jsonify({"message": "Deleted"})

# ─── Dashboard Stats ──────────────────────────────────────────────────────────

@app.route('/api/dashboard')
@login_required
def dashboard():
    data = load_data()
    uid = session['user_id']
    apps = data['applications'].get(uid, [])
    today = datetime.date.today()

    stats = {
        "total": len(apps),
        "applied": sum(1 for a in apps if a['status'] == 'Applied'),
        "online_test": sum(1 for a in apps if a['status'] == 'Online Test'),
        "interview": sum(1 for a in apps if a['status'] == 'Interview'),
        "selected": sum(1 for a in apps if a['status'] == 'Selected'),
        "rejected": sum(1 for a in apps if a['status'] == 'Rejected'),
    }
    stats['pending'] = stats['applied'] + stats['online_test'] + stats['interview']

    # Monthly breakdown for chart (last 6 months)
    monthly = {}
    for i in range(5, -1, -1):
        d = today.replace(day=1) - datetime.timedelta(days=i*28)
        key = d.strftime('%b %Y')
        monthly[key] = 0
    for a in apps:
        try:
            d = datetime.datetime.fromisoformat(a['applied_date']).date()
            key = d.strftime('%b %Y')
            if key in monthly:
                monthly[key] += 1
        except:
            pass

    # Upcoming interviews (next 30 days)
    upcoming = []
    for a in apps:
        if a.get('interview_date'):
            try:
                idate = datetime.date.fromisoformat(a['interview_date'])
                if today <= idate <= today + datetime.timedelta(days=30):
                    upcoming.append({"company": a['company'], "role": a['role'], "date": a['interview_date']})
            except:
                pass

    # Upcoming deadlines
    deadlines = []
    for a in apps:
        if a.get('deadline') and a['status'] not in ['Selected', 'Rejected']:
            try:
                ddate = datetime.date.fromisoformat(a['deadline'])
                if today <= ddate <= today + datetime.timedelta(days=14):
                    days_left = (ddate - today).days
                    deadlines.append({"company": a['company'], "role": a['role'], "deadline": a['deadline'], "days_left": days_left})
            except:
                pass

    drives = data.get('drives', [])
    upcoming_drives = [d for d in drives if d.get('date', '') >= today.isoformat()][:5]

    return jsonify({
        "stats": stats,
        "monthly_chart": monthly,
        "upcoming_interviews": sorted(upcoming, key=lambda x: x['date'])[:5],
        "deadline_alerts": sorted(deadlines, key=lambda x: x['days_left'])[:5],
        "upcoming_drives": upcoming_drives
    })

# ─── Notifications ────────────────────────────────────────────────────────────

@app.route('/api/notifications')
@login_required
def get_notifications():
    data = load_data()
    notifs = data['notifications'].get(session['user_id'], [])
    return jsonify({"notifications": sorted(notifs, key=lambda x: x['created_at'], reverse=True)[:20]})

@app.route('/api/notifications/read', methods=['POST'])
@login_required
def mark_notifications_read():
    data = load_data()
    uid = session['user_id']
    for n in data['notifications'].get(uid, []):
        n['read'] = True
    save_data(data)
    return jsonify({"message": "All marked as read"})

# ─── Notes ────────────────────────────────────────────────────────────────────

@app.route('/api/notes', methods=['GET'])
@login_required
def get_notes():
    data = load_data()
    return jsonify({"notes": data['notes'].get(session['user_id'], [])})

@app.route('/api/notes', methods=['POST'])
@login_required
def add_note():
    body = request.json
    title = body.get('title', '').strip()
    content = body.get('content', '').strip()
    company = body.get('company', '').strip()
    if not title or not content:
        return jsonify({"error": "Title and content required"}), 400
    data = load_data()
    uid = session['user_id']
    note = {
        "id": str(uuid.uuid4()),
        "title": title,
        "content": content,
        "company": company,
        "created_at": datetime.datetime.now().isoformat()
    }
    data['notes'][uid].append(note)
    save_data(data)
    return jsonify({"note": note}), 201

@app.route('/api/notes/<note_id>', methods=['DELETE'])
@login_required
def delete_note(note_id):
    data = load_data()
    uid = session['user_id']
    data['notes'][uid] = [n for n in data['notes'].get(uid, []) if n['id'] != note_id]
    save_data(data)
    return jsonify({"message": "Deleted"})

# ─── Admin ────────────────────────────────────────────────────────────────────

@app.route('/api/admin/drives', methods=['GET'])
@login_required
def get_drives():
    data = load_data()
    return jsonify({"drives": data.get('drives', [])})

@app.route('/api/admin/drives', methods=['POST'])
@admin_required
def add_drive():
    body = request.json
    company = body.get('company', '').strip()
    role = body.get('role', '').strip()
    date = body.get('date', '')
    location = body.get('location', '').strip()
    package = body.get('package', '').strip()
    if not all([company, role, date]):
        return jsonify({"error": "Company, role, and date are required"}), 400
    data = load_data()
    drive = {
        "id": str(uuid.uuid4()),
        "company": company,
        "role": role,
        "date": date,
        "location": location,
        "package": package,
        "created_at": datetime.datetime.now().isoformat()
    }
    data['drives'].append(drive)

    # Notify all users
    for uid in data['users']:
        notif = {
            "id": str(uuid.uuid4()),
            "message": f"New placement drive: {company} – {role} on {date}",
            "type": "drive",
            "read": False,
            "created_at": datetime.datetime.now().isoformat()
        }
        data['notifications'][uid].append(notif)
    save_data(data)
    return jsonify({"drive": drive}), 201

@app.route('/api/admin/drives/<drive_id>', methods=['DELETE'])
@admin_required
def delete_drive(drive_id):
    data = load_data()
    data['drives'] = [d for d in data['drives'] if d['id'] != drive_id]
    save_data(data)
    return jsonify({"message": "Deleted"})

@app.route('/api/admin/students')
@admin_required
def get_students():
    data = load_data()
    students = []
    for uid, u in data['users'].items():
        if not u.get('is_admin'):
            app_count = len(data['applications'].get(uid, []))
            selected = sum(1 for a in data['applications'].get(uid, []) if a['status'] == 'Selected')
            students.append({
                "id": uid,
                "name": u['name'],
                "email": u['email'],
                "roll": u['roll'],
                "branch": u['branch'],
                "total_apps": app_count,
                "selected": selected
            })
    return jsonify({"students": students})

@app.route('/api/admin/reports')
@admin_required
def get_reports():
    data = load_data()
    total_students = sum(1 for u in data['users'].values() if not u.get('is_admin'))
    all_apps = []
    for uid, apps in data['applications'].items():
        all_apps.extend(apps)
    return jsonify({
        "total_students": total_students,
        "total_applications": len(all_apps),
        "total_selected": sum(1 for a in all_apps if a['status'] == 'Selected'),
        "total_rejected": sum(1 for a in all_apps if a['status'] == 'Rejected'),
        "total_drives": len(data.get('drives', []))
    })

# ─── Preparation Resources ────────────────────────────────────────────────────

@app.route('/api/resources')
def get_resources():
    resources = {
        "aptitude": [
            {"name": "IndiaBix", "url": "https://www.indiabix.com/", "desc": "Aptitude questions & answers"},
            {"name": "PrepInsta", "url": "https://prepinsta.com/", "desc": "Company-specific aptitude prep"},
            {"name": "Testbook", "url": "https://testbook.com/aptitude", "desc": "Mock tests & practice sets"},
        ],
        "coding": [
            {"name": "LeetCode", "url": "https://leetcode.com/", "desc": "DSA problems for interviews"},
            {"name": "HackerRank", "url": "https://www.hackerrank.com/", "desc": "Coding challenges & contests"},
            {"name": "GeeksforGeeks", "url": "https://www.geeksforgeeks.org/", "desc": "Tutorials & practice problems"},
            {"name": "Codeforces", "url": "https://codeforces.com/", "desc": "Competitive programming"},
        ],
        "hr_questions": [
            "Tell me about yourself.",
            "Why do you want to work here?",
            "What are your strengths and weaknesses?",
            "Where do you see yourself in 5 years?",
            "Why should we hire you?",
            "Tell me about a challenge you faced and how you overcame it.",
            "Describe a time you worked in a team.",
            "What motivates you?",
            "How do you handle pressure and deadlines?",
            "Do you have any questions for us?"
        ],
        "resume_tips": [
            "Keep your resume to 1 page as a fresher.",
            "Use action verbs: Developed, Implemented, Designed, Led.",
            "Quantify achievements: 'Improved performance by 30%'.",
            "List projects with tech stack and GitHub links.",
            "Tailor your resume for each job application.",
            "Use a clean, ATS-friendly format.",
            "Include relevant certifications and online courses.",
            "Proofread for grammar and spelling errors.",
            "Use consistent formatting throughout.",
            "Put contact info, LinkedIn, and GitHub at the top."
        ]
    }
    return jsonify(resources)

# ─── Seed Admin ───────────────────────────────────────────────────────────────

def seed_admin():
    data = load_data()
    for u in data['users'].values():
        if u.get('is_admin'):
            return
    uid = str(uuid.uuid4())
    data['users'][uid] = {
        "id": uid, "name": "Admin", "email": "admin@placement.com",
        "password": hash_password("admin123"), "roll": "ADMIN",
        "branch": "Administration", "phone": "", "linkedin": "", "github": "",
        "resume": None, "is_admin": True,
        "created_at": datetime.datetime.now().isoformat()
    }
    data['applications'][uid] = []
    data['notifications'][uid] = []
    data['notes'][uid] = []
    save_data(data)
    print("Admin seeded: admin@placement.com / admin123")

if __name__ == '__main__':
    seed_admin()
    app.run(debug=True, port=5000)
