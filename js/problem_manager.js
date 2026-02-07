/**
 * Problem Management Module
 * Allows editing, deleting, and managing problems and workbooks.
 */
const ProblemManager = {
    currentWorkbook: null,

    render() {
        const contentArea = document.getElementById('content-area');

        // Fetch all unique workbooks
        const problems = api.mockHandlers.getProblems();
        const titles = [...new Set(problems.map(p => p.workbookTitle))];
        const optionsHtml = titles.map(t => `<option value="${t}">${t}</option>`).join('');

        contentArea.innerHTML = `
            <div class="card">
                <h2>문제 관리</h2>
                <div class="form-group" style="margin-top:20px;">
                    <label>관리할 회차 선택</label>
                    <div style="display:flex; gap:10px; margin-top:5px;">
                        <select id="manage-workbook-select" style="flex:1; padding: 10px;" onchange="ProblemManager.loadProblems(this.value)">
                            <option value="">회차를 선택하세요</option>
                            ${optionsHtml}
                        </select>
                        <button class="btn btn-primary" onclick="ProblemManager.promptRename()">회차 이름 수정</button>
                        <button class="btn" style="border:1px solid var(--border-color); color:var(--danger-color, red);" onclick="ProblemManager.deleteWorkbook()">회차 삭제</button>
                    </div>
                </div>
            </div>
            
            <div id="manage-list-area" style="margin-top:20px;"></div>
        `;
    },

    loadProblems(workbookTitle) {
        this.currentWorkbook = workbookTitle;
        const listArea = document.getElementById('manage-list-area');

        if (!workbookTitle) {
            listArea.innerHTML = '';
            return;
        }

        const problems = api.mockHandlers.getProblems(workbookTitle);

        if (problems.length === 0) {
            listArea.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">해당 회차에 문제가 없습니다.</p>';
            return;
        }

        listArea.innerHTML = problems.map((p, idx) => `
            <div class="card" id="card-${p.problemId}" style="margin-bottom:15px; border:1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-weight:bold; color:var(--primary-color);">Q.${idx + 1} (${p.problemId})</span>
                    <div>
                        <button class="btn" style="padding:5px 10px; border:1px solid var(--border-color);" onclick="ProblemManager.editProblem('${p.problemId}')">수정</button>
                        <button class="btn" style="padding:5px 10px; background:#fee2e2; color:red;" onclick="ProblemManager.deleteProblem('${p.problemId}')">삭제</button>
                    </div>
                </div>
                <div class="problem-content">
                    <p><strong>[과목]</strong> ${p.subject}</p>
                    <div style="margin-bottom:10px;">
                        ${p.imageUrl ? `<img src="${p.imageUrl}" style="max-width:100%; max-height:300px; border-radius:5px; border:1px solid #eee; display:block;">` : ''}
                    </div>
                    <p><strong>[문제]</strong> ${p.question}</p>
                    <div style="margin:10px 0; padding:10px; background:#f9fafb;">
                        ${p.choices.map((c, i) => `<div class="${i + 1 === p.answer ? 'text-primary font-bold' : ''}">${i + 1}. ${c}</div>`).join('')}
                    </div>
                    <p><strong>[정답]</strong> ${p.answer}</p>
                    <p><strong>[해설]</strong> ${p.explanation || '-'}</p>
                </div>
            </div>
        `).join('');

        // Render Math
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(listArea, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            });
        }
    },

    promptRename() {
        const selector = document.getElementById('manage-workbook-select');
        const oldTitle = selector.value;
        if (!oldTitle) {
            UI.modal.alert("이름을 수정할 회차를 선택해주세요.");
            return;
        }

        const newTitle = prompt("새로운 회차 이름을 입력하세요:", oldTitle);
        if (newTitle && newTitle !== oldTitle) {
            api.run('updateWorkbookTitle', oldTitle, newTitle).then(() => {
                UI.modal.alert("회차 이름이 변경되었습니다.");
                this.render(); // Refresh
            });
        }
    },

    editProblem(problemId) {
        const problems = api.mockHandlers.getProblems();
        const p = problems.find(prob => prob.problemId === problemId);
        if (!p) return;

        const card = document.getElementById(`card-${problemId}`);
        card.innerHTML = `
            <div style="margin-bottom:15px;">
                <label style="font-size:0.8rem;">과목</label>
                <input type="text" id="edit-subj-${problemId}" value="${p.subject}" class="input-field" style="width:100%; margin-bottom:10px;">
                
                <label style="font-size:0.8rem;">문제</label>
                <textarea id="edit-q-${problemId}" class="input-field" style="width:100%; min-height:60px;">${p.question}</textarea>
                
                <div style="margin-top:10px; padding:10px; background:#f8f9fa; border-radius:5px;">
                    <label style="font-size:0.8rem; display:block; margin-bottom:5px;">문제 이미지 (도표, 그림 문제)</label>
                    <div id="preview-container-${problemId}" style="margin-bottom:5px;">
                        ${p.imageUrl ? `<img src="${p.imageUrl}" style="max-width:100%; max-height:150px; border:1px solid #ddd; border-radius:4px;">` : '<span style="font-size:0.8rem; color:#888;">등록된 이미지가 없습니다.</span>'}
                    </div>
                    <input type="file" id="edit-img-${problemId}" accept="image/*" style="font-size:0.8rem;" onchange="ProblemManager.handleImageSelect(this, '${problemId}')">
                    <input type="hidden" id="edit-img-base64-${problemId}" value="${p.imageUrl || ''}">
                </div>

                <label style="font-size:0.8rem; margin-top:10px; display:block;">보기</label>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                    ${p.choices.map((c, i) => `
                        <input type="text" id="edit-c-${problemId}-${i}" value="${c}" class="input-field" placeholder="보기 ${i + 1}">
                    `).join('')}
                </div>

                <div style="display:grid; grid-template-columns: 100px 1fr; gap:10px; margin-top:10px;">
                    <div>
                        <label style="font-size:0.8rem;">정답</label>
                        <select id="edit-ans-${problemId}" class="input-field" style="width:100%;">
                            ${[1, 2, 3, 4].map(n => `<option value="${n}" ${p.answer === n ? 'selected' : ''}>${n}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:0.8rem;">해설</label>
                        <textarea id="edit-exp-${problemId}" class="input-field" style="width:100%; min-height:40px;">${p.explanation || ''}</textarea>
                    </div>
                </div>

                <div style="margin-top:15px; text-align:right;">
                    <button class="btn" style="margin-right:5px;" onclick="ProblemManager.cancelEdit('${problemId}')">취소</button>
                    <button class="btn btn-primary" onclick="ProblemManager.saveProblem('${problemId}')">저장</button>
                </div>
            </div>
        `;
    },

    cancelEdit(problemId) {
        // Just reload the current list to restore view
        this.loadProblems(this.currentWorkbook);
    },

    handleImageSelect(input, problemId) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                // Basic compression/resize logic could go here
                // For now, simple pass
                const base64 = e.target.result;
                document.getElementById(`edit-img-base64-${problemId}`).value = base64;
                document.getElementById(`preview-container-${problemId}`).innerHTML = `<img src="${base64}" style="max-width:100%; max-height:150px; border:1px solid #ddd; border-radius:4px;">`;
            };
            reader.readAsDataURL(file);
        }
    },

    async saveProblem(problemId) {
        const subject = document.getElementById(`edit-subj-${problemId}`).value;
        const question = document.getElementById(`edit-q-${problemId}`).value;
        const answer = parseInt(document.getElementById(`edit-ans-${problemId}`).value);
        const explanation = document.getElementById(`edit-exp-${problemId}`).value;
        const imageUrl = document.getElementById(`edit-img-base64-${problemId}`).value;

        const choices = [];
        for (let i = 0; i < 4; i++) {
            choices.push(document.getElementById(`edit-c-${problemId}-${i}`).value);
        }

        const updatedData = {
            id: problemId,
            subject, question, choices, answer, explanation, imageUrl
        };

        try {
            await api.run('updateProblem', updatedData);
            UI.modal.alert("수정되었습니다.");
            this.loadProblems(this.currentWorkbook);
        } catch (e) {
            console.error(e);
            if (e.name === 'QuotaExceededError' || e.message.includes('Quota')) {
                UI.modal.alert("저장 용량이 부족합니다. 이미지가 너무 큽니다.");
            } else {
                UI.modal.alert("저장 중 오류가 발생했습니다.");
            }
        }
    },

    async deleteProblem(problemId) {
        if (confirm("정말 이 문제를 삭제하시겠습니까?")) {
            await api.run('deleteProblem', problemId);
            this.loadProblems(this.currentWorkbook);
        }
    },

    async deleteWorkbook() {
        const selector = document.getElementById('manage-workbook-select');
        const title = selector.value;
        if (!title) {
            UI.modal.alert("삭제할 회차를 선택해주세요.");
            return;
        }

        if (confirm(`'${title}' 회차의 모든 문제가 삭제됩니다.\n정말 삭제하시겠습니까?`)) {
            await api.run('deleteWorkbook', title);
            UI.modal.alert("삭제되었습니다.");
            this.currentWorkbook = null;
            this.render(); // Refresh list to remove deleted workbook from dropdown
        }
    }
};
