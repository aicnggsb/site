(function () {
    const data = window.PROJECT_EVALUATION_DATA;
    if (!data) return;

    const projectRolesStudentsElement = document.getElementById('project-roles-students');
    const modelEvaluationTitle = document.getElementById('model-evaluation-title');
    const commandEvaluationTitle = document.getElementById('command-evaluation-title');
    const mockupEvaluationTitle = document.getElementById('mockup-evaluation-title');
    const presentationEvaluationTitle = document.getElementById('presentation-evaluation-title');
    const modelEvaluationCriteriaElement = document.getElementById('model-evaluation-criteria');
    const commandEvaluationCriteriaElement = document.getElementById('command-evaluation-criteria');
    const mockupEvaluationCriteriaElement = document.getElementById('mockup-evaluation-criteria');
    const presentationEvaluationCriteriaElement = document.getElementById('presentation-evaluation-criteria');
    const teamworkEvaluationTitle = document.getElementById('teamwork-evaluation-title');
    const teamworkEvaluationStudentsElement = document.getElementById('teamwork-evaluation-students');
    const saveProjectRolesButton = document.getElementById('save-project-roles');
    const closeProjectEvaluationTabButton = document.getElementById('close-project-evaluation-tab');

    function readStorageMap(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '{}');
        } catch (error) {
            return {};
        }
    }

    function getEvaluationScore(container, criteria) {
        if (!container) return 0;
        const values = Array.from(container.querySelectorAll('.model-evaluation-level[aria-pressed="true"]'))
            .map((button) => Number(button.dataset.value));
        return values.reduce((sum, value) => sum + value, 0) / (criteria.length * 3) * 8;
    }

    function getTeamworkEvaluations() {
        return readStorageMap(data.storageKeys.teamwork);
    }

    function getSelectedTeamworkScore(studentName) {
        if (teamworkEvaluationStudentsElement) {
            const studentRow = Array.from(teamworkEvaluationStudentsElement.querySelectorAll('.teamwork-evaluation-student'))
                .find((row) => row.dataset.student === studentName);
            const selected = studentRow && studentRow.querySelector('.teamwork-evaluation-level[aria-pressed="true"]');
            if (selected) return Number(selected.dataset.value);
        }
        const teamEvaluations = getTeamworkEvaluations()[data.teamIndex] || {};
        const studentEvaluation = teamEvaluations[studentName] || {};
        return Number(studentEvaluation.score || 0);
    }

    function saveTeamworkEvaluations() {
        if (!teamworkEvaluationStudentsElement) return;
        const teamworkEvaluations = getTeamworkEvaluations();
        teamworkEvaluations[data.teamIndex] = {};
        teamworkEvaluationStudentsElement.querySelectorAll('.teamwork-evaluation-student').forEach((row) => {
            const selected = row.querySelector('.teamwork-evaluation-level[aria-pressed="true"]');
            const comment = row.querySelector('.teamwork-evaluation-comment');
            teamworkEvaluations[data.teamIndex][row.dataset.student] = {
                score: selected ? Number(selected.dataset.value) : 0,
                comment: comment ? comment.value.trim() : ''
            };
        });
        localStorage.setItem(data.storageKeys.teamwork, JSON.stringify(teamworkEvaluations));
    }

    function updateStudentProjectScores() {
        if (!projectRolesStudentsElement) return;
        const roleScores = {
            '3D': getEvaluationScore(modelEvaluationCriteriaElement, data.modelCriteria),
            PC: getEvaluationScore(commandEvaluationCriteriaElement, data.commandCriteria),
            Prez: getEvaluationScore(presentationEvaluationCriteriaElement, data.presentationCriteria),
            MQ: getEvaluationScore(mockupEvaluationCriteriaElement, data.mockupCriteria)
        };
        projectRolesStudentsElement.querySelectorAll('.project-role-student').forEach((row) => {
            const selectedRoles = Array.from(row.querySelectorAll('.project-role-button[aria-pressed="true"]'));
            const scoreElement = row.querySelector('.project-role-score');
            if (!scoreElement) return;
            if (!selectedRoles.length) {
                const teamworkScore = getSelectedTeamworkScore(row.dataset.student);
                scoreElement.textContent = `${Math.round(teamworkScore * 10) / 10}/2`;
                return;
            }
            const roleAverage = selectedRoles.reduce((sum, button) => sum + roleScores[button.dataset.role], 0) / selectedRoles.length;
            const teamworkScore = getSelectedTeamworkScore(row.dataset.student);
            const total = roleAverage + teamworkScore;
            scoreElement.textContent = `${Math.round(total * 10) / 10}/10 (${Math.round(roleAverage * 10) / 10}/8 + ${Math.round(teamworkScore * 10) / 10}/2)`;
        });
    }

    function updateEvaluationTitle(title, container, criteria, label) {
        if (!title || !container) return;
        const score = getEvaluationScore(container, criteria);
        title.textContent = `${label} — ${Math.ceil(score)}/8`;
        updateStudentProjectScores();
    }

    function renderEvaluationCriteria(container, criteria, savedValues, onChange) {
        if (!container) return;
        container.innerHTML = '';
        criteria.forEach((criterion, criterionIndex) => {
            const row = document.createElement('div');
            row.className = 'model-evaluation-criterion';
            const label = document.createElement('span');
            label.textContent = criterion;
            const actions = document.createElement('div');
            actions.className = 'model-evaluation-levels';
            data.levels.forEach((level, value) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'model-evaluation-level';
                button.textContent = level;
                button.dataset.criterion = String(criterionIndex);
                button.dataset.value = String(value);
                button.setAttribute('aria-pressed', String(savedValues[criterionIndex] === value));
                button.addEventListener('click', () => {
                    actions.querySelectorAll('.model-evaluation-level').forEach((item) => item.setAttribute('aria-pressed', 'false'));
                    button.setAttribute('aria-pressed', 'true');
                    if (onChange) onChange();
                });
                actions.appendChild(button);
            });
            row.append(label, actions);
            container.appendChild(row);
        });
    }

    function renderStudents() {
        if (!projectRolesStudentsElement) return;
        const rolesMap = readStorageMap(data.storageKeys.roles);
        projectRolesStudentsElement.innerHTML = '';
        data.students.forEach((studentName) => {
            const row = document.createElement('div');
            row.className = 'project-role-student';
            row.dataset.student = studentName;
            const name = document.createElement('strong');
            name.textContent = studentName;
            row.appendChild(name);
            const score = document.createElement('strong');
            score.className = 'project-role-score';
            score.textContent = '—/10';
            row.appendChild(score);
            const actions = document.createElement('div');
            actions.className = 'project-role-actions';
            data.roles.forEach((role) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'project-role-button';
                button.dataset.student = studentName;
                button.dataset.role = role.key;
                button.setAttribute('aria-pressed', String((rolesMap[studentName] || []).includes(role.key)));
                button.title = `${role.key} — ${studentName}`;
                button.textContent = role.key;
                button.addEventListener('click', () => {
                    button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
                    updateStudentProjectScores();
                });
                actions.appendChild(button);
            });
            row.appendChild(actions);
            projectRolesStudentsElement.appendChild(row);
        });
    }


    function updateTeamworkTitle() {
        if (!teamworkEvaluationTitle || !teamworkEvaluationStudentsElement) return;
        const selectedScores = Array.from(teamworkEvaluationStudentsElement.querySelectorAll('.teamwork-evaluation-level[aria-pressed="true"]'))
            .map((button) => Number(button.dataset.value));
        const average = selectedScores.length ? selectedScores.reduce((sum, value) => sum + value, 0) / selectedScores.length : 0;
        teamworkEvaluationTitle.textContent = `Evaluation du travail d'équipe — ${Math.round(average * 10) / 10}/2`;
        updateStudentProjectScores();
    }

    function renderTeamworkEvaluation() {
        if (!teamworkEvaluationStudentsElement) return;
        const savedTeamwork = getTeamworkEvaluations()[data.teamIndex] || {};
        teamworkEvaluationStudentsElement.innerHTML = '';
        data.students.forEach((studentName) => {
            const savedEvaluation = savedTeamwork[studentName] || {};
            const row = document.createElement('div');
            row.className = 'teamwork-evaluation-student';
            row.dataset.student = studentName;
            const name = document.createElement('strong');
            name.textContent = studentName;
            const actions = document.createElement('div');
            actions.className = 'model-evaluation-levels';
            data.levels.forEach((level, value) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'model-evaluation-level teamwork-evaluation-level';
                button.textContent = level;
                button.dataset.student = studentName;
                button.dataset.value = String(value / 3 * 2);
                button.setAttribute('aria-pressed', String(Number(savedEvaluation.score || 0) === Number(button.dataset.value)));
                button.addEventListener('click', () => {
                    actions.querySelectorAll('.teamwork-evaluation-level').forEach((item) => item.setAttribute('aria-pressed', 'false'));
                    button.setAttribute('aria-pressed', 'true');
                    saveTeamworkEvaluations();
                    updateTeamworkTitle();
                });
                actions.appendChild(button);
            });
            const comment = document.createElement('textarea');
            comment.className = 'teamwork-evaluation-comment';
            comment.rows = 2;
            comment.placeholder = 'Commentaire...';
            comment.value = savedEvaluation.comment || '';
            comment.addEventListener('input', saveTeamworkEvaluations);
            row.append(name, actions, comment);
            teamworkEvaluationStudentsElement.appendChild(row);
        });
        updateTeamworkTitle();
    }

    function renderEvaluations() {
        renderEvaluationCriteria(modelEvaluationCriteriaElement, data.modelCriteria, readStorageMap(data.storageKeys.model)[data.teamIndex] || [], () => updateEvaluationTitle(modelEvaluationTitle, modelEvaluationCriteriaElement, data.modelCriteria, 'Evaluation du modèle 3D'));
        updateEvaluationTitle(modelEvaluationTitle, modelEvaluationCriteriaElement, data.modelCriteria, 'Evaluation du modèle 3D');
        renderEvaluationCriteria(commandEvaluationCriteriaElement, data.commandCriteria, readStorageMap(data.storageKeys.command)[data.teamIndex] || [], () => updateEvaluationTitle(commandEvaluationTitle, commandEvaluationCriteriaElement, data.commandCriteria, 'Evaluation de la partie commande (PC)'));
        updateEvaluationTitle(commandEvaluationTitle, commandEvaluationCriteriaElement, data.commandCriteria, 'Evaluation de la partie commande (PC)');
        renderEvaluationCriteria(mockupEvaluationCriteriaElement, data.mockupCriteria, readStorageMap(data.storageKeys.mockup)[data.teamIndex] || [], () => updateEvaluationTitle(mockupEvaluationTitle, mockupEvaluationCriteriaElement, data.mockupCriteria, 'Evaluation de la maquette'));
        updateEvaluationTitle(mockupEvaluationTitle, mockupEvaluationCriteriaElement, data.mockupCriteria, 'Evaluation de la maquette');
        renderEvaluationCriteria(presentationEvaluationCriteriaElement, data.presentationCriteria, readStorageMap(data.storageKeys.presentation)[data.teamIndex] || [], () => updateEvaluationTitle(presentationEvaluationTitle, presentationEvaluationCriteriaElement, data.presentationCriteria, 'Evaluation de la présentation'));
        updateEvaluationTitle(presentationEvaluationTitle, presentationEvaluationCriteriaElement, data.presentationCriteria, 'Evaluation de la présentation');
        renderTeamworkEvaluation();
    }

    function saveEvaluation() {
        if (!projectRolesStudentsElement) return;
        const rolesMap = readStorageMap(data.storageKeys.roles);
        projectRolesStudentsElement.querySelectorAll('.project-role-student').forEach((row) => {
            const buttons = Array.from(row.querySelectorAll('.project-role-button'));
            if (!buttons.length) return;
            const studentName = buttons[0].dataset.student;
            rolesMap[studentName] = buttons
                .filter((button) => button.getAttribute('aria-pressed') === 'true')
                .map((button) => button.dataset.role);
        });
        localStorage.setItem(data.storageKeys.roles, JSON.stringify(rolesMap));

        saveTeamworkEvaluations();

        [
            [data.storageKeys.model, data.modelCriteria, modelEvaluationCriteriaElement],
            [data.storageKeys.command, data.commandCriteria, commandEvaluationCriteriaElement],
            [data.storageKeys.mockup, data.mockupCriteria, mockupEvaluationCriteriaElement],
            [data.storageKeys.presentation, data.presentationCriteria, presentationEvaluationCriteriaElement]
        ].forEach(([storageKey, criteria, container]) => {
            if (!container) return;
            const evaluations = readStorageMap(storageKey);
            evaluations[data.teamIndex] = criteria.map((_, criterionIndex) => {
                const selected = container.querySelector(`.model-evaluation-level[data-criterion="${criterionIndex}"][aria-pressed="true"]`);
                return selected ? Number(selected.dataset.value) : 0;
            });
            localStorage.setItem(storageKey, JSON.stringify(evaluations));
        });
        window.close();
    }

    document.querySelectorAll('.project-evaluation-toggle').forEach((button) => {
        button.addEventListener('click', () => {
            const section = button.closest('[data-project-collapsible]');
            const isCollapsed = section.classList.toggle('is-collapsed');
            button.textContent = isCollapsed ? '+' : '−';
            button.setAttribute('aria-expanded', String(!isCollapsed));
        });
    });

    closeProjectEvaluationTabButton?.addEventListener('click', () => window.close());
    saveProjectRolesButton?.addEventListener('click', saveEvaluation);

    renderStudents();
    renderEvaluations();
    updateStudentProjectScores();
}());
