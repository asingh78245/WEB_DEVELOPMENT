from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)
contacts = {}
next_id = 1

@app.route('/')
def index():
    query = request.args.get('q', '').lower()
    results = {k: v for k, v in contacts.items()
               if query in v['name'].lower() or query in v['phone']} if query else contacts
    return render_template('index.html', contacts=results, query=query)

@app.route('/add', methods=['GET', 'POST'])
def add():
    error = None
    if request.method == 'POST':
        name  = request.form['name'].strip()
        phone = request.form['phone'].strip()
        email = request.form['email'].strip()
        if not (name and phone and email):
            error = "All fields are required."
        else:
            global next_id
            contacts[next_id] = {'name': name, 'phone': phone, 'email': email}
            next_id += 1
            return redirect(url_for('index'))
    return render_template('add_contact.html', error=error)

@app.route('/edit/<int:cid>', methods=['GET', 'POST'])
def edit(cid):
    contact = contacts.get(cid)
    if not contact:
        return redirect(url_for('index'))
    error = None
    if request.method == 'POST':
        name  = request.form['name'].strip()
        phone = request.form['phone'].strip()
        email = request.form['email'].strip()
        if not (name and phone and email):
            error = "All fields are required."
        else:
            contacts[cid] = {'name': name, 'phone': phone, 'email': email}
            return redirect(url_for('index'))
    return render_template('edit_contact.html', cid=cid, contact=contact, error=error)

@app.route('/delete/<int:cid>')
def delete(cid):
    contacts.pop(cid, None)
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
