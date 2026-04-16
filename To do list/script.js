const API = "http://localhost:3000/tasks";

let tasks = [];
let filter = "all";

async function loadTasks() {

    const res = await fetch(API);
    tasks = await res.json();

    renderTasks();
}

async function addTask() {

    const title = document.getElementById("taskTitle").value;
    const priority = document.getElementById("priority").value;
    const dueDate = document.getElementById("dueDate").value;
    const dueTime = document.getElementById("dueTime").value;

    if (!title) return alert("Enter task");

    await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority, dueDate, dueTime })
    });

    document.getElementById("taskTitle").value = "";

    loadTasks();
}

async function toggleStatus(id) {

    await fetch(`${API}/${id}/status`, { method: "PATCH" });
    loadTasks();
}

async function deleteTask(id) {

    await fetch(`${API}/${id}`, { method: "DELETE" });
    loadTasks();
}

async function editTask(task) {

    const newTitle = prompt("Edit task", task.title);
    if (!newTitle) return;

    await fetch(`${API}/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: newTitle,
            priority: task.priority,
            dueDate: task.dueDate,
            dueTime: task.dueTime
        })
    });

    loadTasks();
}

function setFilter(type) {
    filter = type;
    renderTasks();
}

function searchTasks() {

    const keyword = document.getElementById("searchBox").value.toLowerCase();

    const filtered = tasks.filter(t =>
        t.title.toLowerCase().includes(keyword)
    );

    renderTasks(filtered);
}

function sortPriority() {

    const order = { High: 1, Medium: 2, Low: 3 };

    tasks.sort((a, b) => order[a.priority] - order[b.priority]);

    renderTasks();
}

function renderTasks(list = tasks) {

    const ul = document.getElementById("taskList");

    ul.innerHTML = "";

    let completed = 0;

    list.forEach(t => {

        if (filter === "active" && t.isDone) return;
        if (filter === "done" && !t.isDone) return;

        if (t.isDone) completed++;

        const li = document.createElement("li");

        if (t.isDone) li.classList.add("done");

        const today = new Date().toISOString().split("T")[0];

        if (t.dueDate && t.dueDate < today) {
            li.classList.add("overdue");
        }

        li.innerHTML = `
<span class="${t.priority.toLowerCase()}">
${t.title} (${t.priority})
<br>
<small>${t.dueDate || ""} ${t.dueTime || ""}</small>
</span>

<div>

<input type="checkbox"
${t.isDone?"checked":""}
onclick="toggleStatus(${t.id})">

<button onclick='editTask(${JSON.stringify(t)})'>Edit</button>

<button onclick="deleteTask(${t.id})">Delete</button>

</div>
`;

        ul.appendChild(li);

    });

    document.getElementById("counter").innerText =
        `Completed ${completed} / Total ${list.length}`;
}

loadTasks();