/**
 * Review Module (Incorrect Answer Note)
 * Firebase API 사용하도록 수정됨
 */
const Review = {
    // 캐시된 데이터
    cachedRecords: [],
    cachedProblems: [],

    async render() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>데이터 로딩 중...</p></div>';

        // Firebase에서 데이터 가져오기
        const [records, problems] = await Promise.all([
            api.run('getRecords'),
            api.run('getProblems')
        ]);

        this.cachedRecords = records || [];
        this.cachedProblems = problems || [];

        // 1. Collect all wrong answers
        // Map: ProblemID -> { problem, wrongCount, lastWrongDate }
        const wrongMap = new Map();

        this.cachedRecords.forEach(record => {
            const date = new Date(record.date);

            if (!record.userAnswers) return;

            for (const [pId, answer] of Object.entries(record.userAnswers)) {
                // Find problem in DB
                const problem = this.cachedProblems.find(p => p.problemId === pId);
                if (problem) {
                    if (answer !== problem.answer) {
                        // It's a wrong answer
                        if (!wrongMap.has(pId)) {
                            wrongMap.set(pId, {
                                problem: problem,
                                wrongCount: 0,
                                lastWrongDate: date,
                                myLastAnswer: answer
                            });
                        }
                        const entry = wrongMap.get(pId);
                        entry.wrongCount++;
                        if (date > entry.lastWrongDate) {
                            entry.lastWrongDate = date;
                            entry.myLastAnswer = answer;
                        }
                    }
                }
            }
        });

        const wrongList = Array.from(wrongMap.values()).sort((a, b) => b.lastWrongDate - a.lastWrongDate);

        // 2. Render List
        if (wrongList.length === 0) {
            contentArea.innerHTML = `
                <div style="text-align:center; padding:50px;">
                    <span class="material-icons-round" style="font-size:48px; color:var(--text-secondary); margin-bottom:10px;">assignment_turned_in</span>
                    <h3>오답 노트가 비어있습니다.</h3>
                    <p style="color:var(--text-secondary);">문제를 풀고 틀린 문제가 생기면 여기에 자동으로 정리됩니다.</p>
                </div>
            `;
            return;
        }

        contentArea.innerHTML = `
            <div style="max-width:100%; overflow-x:hidden; padding:0 20px; box-sizing:border-box;">
                <div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <p style="color:var(--text-secondary); margin:0;">총 ${wrongList.length}개의 틀린 문제가 있습니다.</p>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">
                        <button class="btn" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca;" onclick="Review.resetAllWrongAnswers()">오답 초기화</button>
                        <button class="btn btn-primary" onclick="Review.startReviewSession()">전체 다시 풀기</button>
                    </div>
                </div>

                <div class="review-grid" style="display:grid; gap:15px;">
                    ${wrongList.map((item, idx) => this.renderReviewCard(item, idx)).join('')}
                </div>
            </div>
        `;
    },

    renderReviewCard(item, idx) {
        const p = item.problem;
        return `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; gap:15px; padding:16px; border-left:4px solid ${item.wrongCount >= 5 ? 'var(--danger-color)' : item.wrongCount >= 3 ? '#f59e0b' : 'var(--primary-color)'}; overflow:hidden; max-width:100%; box-sizing:border-box;">
                <!-- Left: Content -->
                <div style="flex:1; min-width:0; overflow:hidden;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; flex-wrap:wrap;">
                        <span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:0.75rem; padding:4px 8px; flex-shrink:0;">${item.wrongCount}회 틀림</span>
                        <span style="font-size:0.8rem; color:var(--text-secondary);">${p.subject}</span>
                    </div>
                    <h4 style="margin-bottom:6px; font-size:0.95rem; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; word-break:break-word;">${p.question}</h4>
                    <div style="font-size:0.75rem; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${p.workbookTitle} • 마지막 오답: ${new Date(item.lastWrongDate).toLocaleDateString()}
                    </div>
                </div>
                <!-- Right: Action Button -->
                <button class="btn btn-primary" style="flex-shrink:0; padding:8px 16px; font-size:0.85rem;" onclick="event.stopPropagation(); Review.openProblemDetail('${p.problemId}')">
                    다시 풀기
                </button>
            </div>
        `;
    },

    async startReviewSession() {
        // 캐시된 데이터 사용 (없으면 다시 로드)
        if (this.cachedRecords.length === 0 || this.cachedProblems.length === 0) {
            const [records, problems] = await Promise.all([
                api.run('getRecords'),
                api.run('getProblems')
            ]);
            this.cachedRecords = records || [];
            this.cachedProblems = problems || [];
        }

        const pIds = new Set();

        this.cachedRecords.forEach(r => {
            if (!r.userAnswers) return;
            for (const [pId, ans] of Object.entries(r.userAnswers)) {
                const p = this.cachedProblems.find(x => x.problemId === pId);
                if (p && p.answer !== ans) pIds.add(pId);
            }
        });

        const problems = this.cachedProblems.filter(p => pIds.has(p.problemId));

        if (problems.length === 0) {
            UI.modal.alert("풀 문제가 없습니다.");
            return;
        }

        // 'practice' 모드로 시작하여 실제로 문제를 다시 풀 수 있게 함
        store.startExam(problems, 'practice', '오답 노트 전체 다시 풀기');
        store.setState({ currentPage: 'exam_running', examMode: 'practice' });
        router.navigate('exam_running');
    },

    async openProblemDetail(problemId) {
        // 캐시된 문제 사용 (없으면 로드)
        if (this.cachedProblems.length === 0) {
            this.cachedProblems = await api.run('getProblems');
        }

        const p = this.cachedProblems.find(x => x.problemId === problemId);
        if (p) {
            store.startExam([p], 'practice', '오답 다시 풀기');
            store.setState({ currentPage: 'exam_running', examMode: 'practice' });
            router.navigate('exam_running');
        }
    },

    async resetAllWrongAnswers() {
        const confirmed = await UI.modal.confirm("정말로 오답 노트를 초기화하시겠습니까?\n모든 틀린 문제 기록이 삭제됩니다.");
        if (!confirmed) return;

        // 캐시된 데이터 사용 (없으면 로드)
        if (this.cachedRecords.length === 0 || this.cachedProblems.length === 0) {
            const [records, problems] = await Promise.all([
                api.run('getRecords'),
                api.run('getProblems')
            ]);
            this.cachedRecords = records || [];
            this.cachedProblems = problems || [];
        }

        // 모든 records의 오답을 정답으로 변경하여 오답 노트에서 제외
        this.cachedRecords.forEach(record => {
            if (record.userAnswers) {
                for (const [pId, ans] of Object.entries(record.userAnswers)) {
                    const problem = this.cachedProblems.find(p => p.problemId === pId);
                    if (problem && ans !== problem.answer) {
                        // 오답을 정답으로 변경
                        record.userAnswers[pId] = problem.answer;
                    }
                }
            }
        });

        // Firebase에 저장
        await api.run('syncRecords', this.cachedRecords);

        await UI.modal.alert("오답 노트가 초기화되었습니다.");

        // 화면 새로고침
        this.render();
    }
};
