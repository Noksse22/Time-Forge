let tasks = [];
let planning = [];
let planningCompleted = false;

if (typeof sampleData === "undefined") {
    window.sampleData = {
        tasks: [
            { id: 1, title: "Réviser les mathématiques", duration: 60, priority: "high", created: new Date().toISOString() },
            { id: 2, title: "Lire un chapitre d'histoire", duration: 45, priority: "medium", created: new Date().toISOString() }
        ]
    };
}

document.addEventListener('DOMContentLoaded', function() {
    loadData();
    renderTasks();
    renderPlanning();

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskSubmit);
    }

    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in');
    });

    document.body.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && document.activeElement.classList.contains('btn')) {
            document.activeElement.click();
        }
    });

    const markCompletedBtn = document.getElementById('markCompletedBtn');
    const exportFinalBtn = document.getElementById('exportFinalBtn');
    if (markCompletedBtn) {
        markCompletedBtn.onclick = function() {
            planningCompleted = true;
            planning = [];
            renderPlanning();
            showToast('Planning terminé. Veuillez exporter votre planning final.');
            if (exportFinalBtn) {
                exportFinalBtn.style.display = 'inline-flex';
                exportFinalBtn.focus();
            }
        };
    }
    if (exportFinalBtn) {
        exportFinalBtn.onclick = function() {
            exportFinalPlanning();
        };
    }
    const resetPlanningBtn = document.getElementById('resetPlanningBtn');
    if (resetPlanningBtn) {
        resetPlanningBtn.onclick = function() {
            resetPlanning();
        };
    }
});

function loadData() {
    try {
        const dataStr = localStorage.getItem('timeforge-data');
        if (dataStr) {
            const data = JSON.parse(dataStr);
            tasks = Array.isArray(data.tasks) ? data.tasks : [];
            planning = Array.isArray(data.planning) ? data.planning : [];
        }
    } catch (e) {
        tasks = [];
        planning = [];
    }
}

function saveData() {
    const data = { tasks, planning };
    try {
        localStorage.setItem('timeforge-data', JSON.stringify(data));
    } catch (e) {
        // fallback: rien
    }
}

function handleTaskSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    const duration = parseInt(document.getElementById('taskDuration').value);
    const priority = document.getElementById('taskPriority').value;

    if (!title || isNaN(duration) || duration <= 0) return;

    const newTask = {
        id: Date.now(),
        title,
        duration,
        priority,
        created: new Date().toISOString()
    };

    tasks.push(newTask);
    saveData();
    renderTasks();

    document.getElementById('taskForm').reset();
    document.getElementById('taskDuration').value = 60;
    document.getElementById('taskPriority').value = 'medium';

    const tasksList = document.getElementById('tasksList');
    if (tasksList) tasksList.scrollTop = tasksList.scrollHeight;

    if (document.body.classList.contains('dark-mode')) {
        document.querySelectorAll('input, select, textarea').forEach(el => {
            el.style.background = '#232a36';
            el.style.color = '#f5f6fa';
            el.style.borderColor = '#495464';
        });
    }
}

function deleteTask(taskId) {
    if (confirm('Supprimer cette tâche ?')) {
        tasks = tasks.filter(task => task.id !== taskId);
        saveData();
        renderTasks();
        if (planning.length > 0) {
            generatePlanning();
        }
        showToast('Tâche supprimée.');
    }
}

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const taskCount = document.getElementById('taskCount');
    if (!tasksList || !taskCount) return;

    taskCount.textContent = tasks.length;
    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <h3>Aucune tâche ajoutée</h3>
                <p>Ajoutez une tâche ou importez un exemple.</p>
            </div>
        `;
        return;
    }
    const sortedTasks = [...tasks].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.created) - new Date(a.created);
    });
    tasksList.innerHTML = sortedTasks.map(task => `
        <div class="task-item priority-${task.priority} fade-in">
            <div class="task-info">
                <div class="task-title">${task.title}</div>
                <div class="task-meta">
                    ${task.duration} min • 
                    <span class="priority-badge ${task.priority}">${getPriorityText(task.priority)}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="btn-delete-task" onclick="deleteTask(${task.id})" aria-label="Supprimer la tâche">
                    Supprimer
                </button>
            </div>
        </div>
    `).join('');
    if (document.body.classList.contains('dark-mode')) {
        document.querySelectorAll('input, select, textarea').forEach(el => {
            el.style.background = '#232a36';
            el.style.color = '#f5f6fa';
            el.style.borderColor = '#495464';
        });
    }
}

function generatePlanning() {
    if (tasks.length === 0) {
        alert('Ajoutez d\'abord des tâches pour générer un planning !');
        return;
    }
    planningCompleted = false;

    const startTime = document.getElementById('startTime').value;

    const sortedTasks = [...tasks].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    planning = [];
    let currentTime = parseTime(startTime);

    for (let i = 0; i < sortedTasks.length; i++) {
        const task = sortedTasks[i];
        planning.push({
            ...task,
            startTime: formatTime(currentTime),
            endTime: formatTime(addMinutes(currentTime, task.duration))
        });
        currentTime = addMinutes(currentTime, task.duration + 10);
    }

    renderPlanning();
    saveData();
}

function renderPlanning() {
    const timeline = document.getElementById('timeline');
    const totalPlannedDiv = document.getElementById('totalPlannedTime');
    const planningActions = document.getElementById('planningActions');
    const markCompletedBtn = document.getElementById('markCompletedBtn');
    const exportFinalBtn = document.getElementById('exportFinalBtn');
    if (!timeline || !totalPlannedDiv) return;

    let total = 0;
    if (planning.length === 0) {
        timeline.innerHTML = `
            <div class="empty-state">
                <h3>Aucun planning généré</h3>
                <p>Configurez votre temps et cliquez sur "Générer le planning"</p>
            </div>
        `;
        totalPlannedDiv.textContent = "Temps total planifié : 0 min";
        if (planningActions) planningActions.style.display = "none";
        return;
    }
    planning.forEach(item => { total += item.duration; });
    totalPlannedDiv.textContent = `Temps total planifié : ${total} min`;
    timeline.innerHTML = planning.map(item => `
        <div class="timeline-item priority-${item.priority} fade-in" tabindex="0">
            <div class="timeline-time">${item.startTime} - ${item.endTime}</div>
            <div class="timeline-title">${item.title}</div>
            <div class="timeline-duration">${item.duration} minutes • ${getPriorityText(item.priority)}</div>
        </div>
    `).join('');
    if (document.body.classList.contains('dark-mode')) {
        document.querySelectorAll('input, select, textarea').forEach(el => {
            el.style.background = '#232a36';
            el.style.color = '#f5f6fa';
            el.style.borderColor = '#495464';
        });
    }
    if (planningActions) {
        planningActions.style.display = "flex";
        if (markCompletedBtn) markCompletedBtn.style.display = planningCompleted ? "none" : "inline-flex";
        if (exportFinalBtn) exportFinalBtn.style.display = planningCompleted ? "inline-flex" : "none";
    }
}

function resetPlanning() {
    planning = [];
    planningCompleted = false;
    renderPlanning();
    saveData();
    showToast('Planning réinitialisé.');
}
window.resetPlanning = resetPlanning;

function clearAllTasks() {
    tasks = [];
    planning = [];
    planningCompleted = false;
    saveData();
    renderTasks();
    renderPlanning();
    showToast('Toutes les tâches ont été supprimées.');
}
window.clearAllTasks = clearAllTasks;

function exportFinalPlanning() {
    if (planning.length === 0) {
        alert('Aucun planning à exporter.');
        return;
    }
    const data = { planning, completed: true, exportedAt: new Date().toISOString() };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `timeforge-planning-final-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('Planning final exporté.');
}

function showToast(msg) {
    let toast = document.getElementById('toast-notif');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notif';
        toast.style.position = 'fixed';
        toast.style.bottom = '40px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = '#232a36';
        toast.style.color = '#fff';
        toast.style.padding = '12px 28px';
        toast.style.borderRadius = '8px';
        toast.style.fontSize = '1rem';
        toast.style.zIndex = 9999;
        toast.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2200);
}

function exportData() {
    const data = { tasks, planning };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `timeforge-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.tasks) {
                tasks = data.tasks;
                planning = data.planning || [];
                saveData();
                renderTasks();
                renderPlanning();
                alert('Données importées avec succès !');
            } else {
                alert('Format de fichier invalide !');
            }
        } catch (error) {
            alert('Erreur lors de l\'importation : ' + error.message);
        }
    };
    reader.readAsText(file);
}

function loadSampleData() {
    if (confirm('Cela remplacera vos données actuelles. Continuer ?')) {
        tasks = sampleData.tasks;
        planning = [];
        saveData();
        renderTasks();
        renderPlanning();
        alert('Données d\'exemple chargées !');
    }
}

function getPriorityText(priority) {
    const priorityMap = {
        high: 'Haute',
        medium: 'Moyenne',
        low: 'Basse'
    };
    return priorityMap[priority] || priority;
}

function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function addMinutes(timeInMinutes, minutesToAdd) {
    return timeInMinutes + minutesToAdd;
}
