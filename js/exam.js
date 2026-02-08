/**
 * Exam Handling Module
 */
const Exam = {
    timerInterval: null,
    lastProblemIndex: -1,

    init() {
        // Subscribe to store changes to re-render UI
        store.subscribe((state) => {
            if (state.currentPage === 'exam_running') {
                this.render(state);
            } else if (state.currentPage === 'exam_review') {
                this.renderReviewMode(state);
            }
        });
    },

    start(mode, workbookTitle) {
        // Find workbook or use all
        // For now, mockHandlers.getProblems filters by title if provided
        const problems = api.mockHandlers.getProblems(workbookTitle);

        if (!problems || problems.length === 0) {
            UI.modal.alert("선택한 회차에 문제가 없습니다.");
            return;
        }

        store.startExam(problems, mode, workbookTitle);
        store.setState({ currentPage: 'exam_running', examMode: mode }); // Ensure mode is set
        router.navigate('exam_running');

        if (mode === 'real') {
            this.startTimer();
        }
    },

    startReview(userAnswers, problems) {
        store.setState({
            problems: problems,
            currentProblemIndex: 0,
            userAnswers: userAnswers,
            examMode: 'review',
            currentPage: 'exam_review',
            examStatus: 'review',
            workbookTitle: '오답 노트 리뷰'
        });
        router.navigate('exam_running'); // Re-use the exam layout but render differently
    },

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            const { timeLeft, examStatus } = store.getState();
            if (timeLeft <= 0 || examStatus !== 'running') {
                clearInterval(this.timerInterval);
                if (timeLeft <= 0) UI.modal.alert("시험 시간이 종료되었습니다!");
                return;
            }
            store.setState({ timeLeft: timeLeft - 1 });
        }, 1000);

        // 화면 이탈 감지
        this.visibilityHandler = () => {
            const { examStatus } = store.getState();
            if (document.hidden && examStatus === 'running') {
                clearInterval(this.timerInterval);
                store.setState({ examStatus: 'finished' });
                alert('시험 중 화면을 이탈하여 시험이 종료됩니다.');
                router.navigate('dashboard');
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);
    },

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
        }
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    },

    render(state) {
        const { problems, currentProblemIndex, userAnswers, examMode, timeLeft, workbookTitle } = state;
        const currentProblem = problems[currentProblemIndex];

        // Update Page Title Header
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = workbookTitle || (examMode === 'review' ? '오답 노트' : '실전 모의고사');
        }

        // 1. Render Layout Container if not exists
        const contentArea = document.getElementById('content-area');
        // Check if layout needs reset (e.g. if we switched from 3-col to 2-col, or if it doesn't exist)
        // Since we changed the CSS class .exam-layout structure globally, we can just check existence.
        // However, to be safe and remove old HTML structure, let's re-render if the left panel exists
        if (!document.querySelector('.exam-layout') || document.querySelector('.exam-panel-left')) {
            contentArea.innerHTML = `
                <div class="exam-layout">
                    <!-- Center: Question -->
                    <div class="exam-panel-center" id="question-container"></div>

                    <!-- Right: Info -->
                    <div class="exam-panel-right">
                        <div class="timer-box">${examMode === 'real' ? this.formatTime(timeLeft) : '연습 모드'}</div>
                        
                        <div style="margin-bottom:10px; padding:10px; background:#f9fafb; border-radius:5px; font-size:0.9rem;">
                            <label style="display:flex; align-items:center; gap:5px; cursor:pointer; margin-bottom:5px;">
                                <input type="checkbox" onchange="store.toggleAutoAdvance(this.checked)" ${state.autoAdvance ? 'checked' : ''}> 정답 선택 시 자동 넘기기
                            </label>
                            <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                                <input type="checkbox" onchange="store.toggleEditMode(this.checked)" ${state.isEditMode ? 'checked' : ''}> 문제 수정 모드
                            </label>
                        </div>

                        <h4>답안 표기 (OMR)</h4>
                        <div class="omr-grid" id="omr-container"></div>
                        <div class="exam-panel-footer">
                            <button class="btn btn-primary" style="width:100%" onclick="Exam.submit()">채점 및 시험종료</button>
                            <button class="btn" style="width:100%; margin-top:10px; background:#f3f4f6; color:#666; font-size:0.8rem;" onclick="Exam.autoSolve()">[개발용] 자동 풀이 및 제출</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Update Timer Only
            const timerBox = document.querySelector('.timer-box');
            if (timerBox) timerBox.textContent = examMode === 'real' ? this.formatTime(timeLeft) : '연습 모드';
        }

        // 2. Render Question
        const questionContainer = document.getElementById('question-container');
        if (questionContainer) {
            if (state.isEditMode) {
                // Edit Mode Render
                questionContainer.innerHTML = `
                    <div class="question-card" style="border:2px solid var(--primary-color);">
                        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                            <h4 style="color:var(--primary-color);"><span class="material-icons-round" style="vertical-align:middle">edit</span> 문제 수정 모드</h4>
                            <span style="color:var(--text-secondary)">ID: ${currentProblem.problemId}</span>
                        </div>

                        <label style="font-size:0.8rem; font-weight:bold;">질문 내용</label>
                        <textarea id="exam-edit-q" class="input-field" style="width:100%; min-height:100px; margin-bottom:15px; font-size:1.1rem;">${currentProblem.question}</textarea>
                        
                        <label style="font-size:0.8rem; font-weight:bold;">보기 설정</label>
                        <div style="margin-bottom:15px;">
                        ${currentProblem.choices.map((c, i) => `
                            <div style="display:flex; align-items:center; margin-bottom:5px;">
                                <span style="width:20px; font-weight:bold;">${i + 1}.</span>
                                <input type="text" id="exam-edit-c-${i}" value="${c}" class="input-field" style="flex:1;">
                            </div>
                        `).join('')}
                        </div>

                        <div style="display:grid; grid-template-columns: 100px 1fr; gap:15px;">
                            <div>
                                <label style="font-size:0.8rem; font-weight:bold;">정답 번호</label>
                                <input type="number" id="exam-edit-ans" value="${currentProblem.answer}" min="1" max="4" class="input-field" style="width:100%;">
                            </div>
                            <div>
                                <label style="font-size:0.8rem; font-weight:bold;">해설</label>
                                <textarea id="exam-edit-exp" class="input-field" style="width:100%; min-height:60px;">${currentProblem.explanation || ''}</textarea>
                            </div>
                        </div>

                        <div style="margin-top:20px; text-align:right; border-top:1px solid #eee; padding-top:15px;">
                            <button class="btn" onclick="store.toggleEditMode(false)">취소 (편집 종료)</button>
                            <button class="btn btn-primary" onclick="Exam.saveProblemUpdate('${currentProblem.problemId}')">저장하기</button>
                        </div>
                    </div>
                `;
            } else {
                // Normal View Render
                questionContainer.innerHTML = `
                    <div class="question-card">
                        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                            <span style="font-weight:bold; color:var(--primary-color)">Q.${currentProblemIndex + 1}</span>
                            <span style="color:var(--text-secondary)">${currentProblem.subject}</span>
                        </div>
                        
                        ${currentProblem.imageUrl ? `<div style="text-align:center; margin-bottom:20px;"><img src="${currentProblem.imageUrl}" style="max-width:100%; max-height:400px; border-radius:8px; border:1px solid #eee;"></div>` : ''}

                        <h3 style="margin-bottom:20px; line-height:1.6;">${currentProblem.question}</h3>
                        
                        <div class="choices">
                            ${currentProblem.choices.map((choice, idx) => {
                    const isSelected = userAnswers[currentProblem.problemId] === idx + 1;
                    return `
                                    <div class="choice-item ${isSelected ? 'selected' : ''}" 
                                        onclick="store.selectAnswer('${currentProblem.problemId}', ${idx + 1})">
                                        <span style="margin-right:10px; font-weight:bold;">${idx + 1}.</span>
                                        ${choice}
                                    </div>
                                `;
                }).join('')}
                        </div>

                        <div id="explanation-container" class="explanation-card hidden" style="margin-top:20px; background-color:#f0fdf4; border:1px solid #bbf7d0;">
                            <div class="explanation-title" style="color:#166534;">
                                <span class="material-icons-round">check_circle</span> 정답 및 해설
                            </div>
                            <p><strong>정답: ${currentProblem.answer}번</strong></p>
                            <p>${currentProblem.explanation || "해설이 없습니다."}</p>
                        </div>

                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:30px; gap:10px; flex-wrap:wrap;">
                            <button class="btn" style="border:1px solid var(--border-color)" 
                                    onclick="store.prevProblem()"
                                    ${currentProblemIndex === 0 ? 'disabled' : ''}>이전</button>
                            
                            <div style="flex:1; display:flex; justify-content:center; gap:10px;">
                                ${examMode !== 'real' ? `<button class="btn" style="background:#e0e7ff; color:#4338ca; border:1px solid #c7d2fe;" onclick="Exam.toggleAnswer()">정답 미리보기</button>` : ''}
                                <button class="btn" style="background:#fee2e2; color:#b91c1c; border:1px solid #fecaca;" onclick="Exam.submit()">시험 종료</button>
                            </div>

                            ${currentProblemIndex === problems.length - 1
                        ? `<button class="btn btn-primary" onclick="Exam.submit()">채점 및 종료</button>`
                        : `<button class="btn btn-primary" onclick="store.nextProblem()">다음</button>`
                    }
                        </div>
                    </div>
                `;
            }
        }

        // 3. Render OMR
        const omrContainer = document.getElementById('omr-container');
        if (omrContainer) {
            omrContainer.innerHTML = problems.map((p, idx) => {
                const selectedAns = userAnswers[p.problemId];
                const isActive = idx === currentProblemIndex;

                // Generate 4 circles
                let optionsHtml = '';
                for (let i = 1; i <= 4; i++) {
                    const isSelected = selectedAns === i;
                    optionsHtml += `
                        <div class="omr-circle ${isSelected ? 'selected' : ''}"
                             onclick="store.selectAnswer('${p.problemId}', ${i}); event.stopPropagation();">
                            ${i}
                        </div>
                    `;
                }

                return `
                    <div class="omr-row ${isActive ? 'active-row' : ''}" onclick="store.jumpToProblem(${idx})">
                        <div class="omr-num">${idx + 1}</div>
                        <div class="omr-options">
                            ${optionsHtml}
                        </div>
                    </div>
                `;
            }).join('');

            // Auto scroll logic removed as per user request
        }

        // Check if problem changed (Scroll to top)
        if (this.lastProblemIndex !== currentProblemIndex) {
            this.lastProblemIndex = currentProblemIndex;
            const contentArea = document.getElementById('content-area');
            if (contentArea) contentArea.scrollTop = 0;

            // Also ensure active element focus doesn't jump scroll
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        }

        // Trigger Math Rendering
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(document.getElementById('question-container'), {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ]
            });
        }
    },

    autoSolve() {
        const { problems } = store.getState();
        const answers = {};
        problems.forEach(p => {
            answers[p.problemId] = Math.floor(Math.random() * 4) + 1;
        });
        store.setState({ userAnswers: answers });
        // Small delay to let state update before submit logic reads it
        setTimeout(() => this.submit(), 100);
    },

    async submit() {
        const { userAnswers, problems, timeLeft } = store.getState();
        const totalProblems = problems.length;
        const answeredCount = Object.keys(userAnswers).length;

        if (answeredCount < totalProblems) {
            const confirmed = await UI.modal.confirm(`아직 풀지 않은 문제가 ${totalProblems - answeredCount}문제 있습니다.\n정말 제출하시겠습니까?`);
            if (!confirmed) return;
        } else {
            const confirmed = await UI.modal.confirm("시험을 제출하시겠습니까?");
            if (!confirmed) return;
        }

        // Calculate Score
        let correctCount = 0;
        const subjectScores = {}; // { subject: { total: 0, correct: 0 } }
        const correctProblemIds = []; // 정답 맞춘 문제 ID 목록

        problems.forEach(p => {
            const isCorrect = userAnswers[p.problemId] === p.answer;
            if (isCorrect) {
                correctCount++;
                correctProblemIds.push(p.problemId); // 정답 맞춘 문제 ID 저장
            }

            // Subject Analysis
            if (!subjectScores[p.subject]) subjectScores[p.subject] = { total: 0, correct: 0 };
            subjectScores[p.subject].total++;
            if (isCorrect) subjectScores[p.subject].correct++;
        });

        // 🎯 정답 맞춘 문제를 오답 기록에서 제거
        if (correctProblemIds.length > 0 && MOCK_DATA.records) {
            MOCK_DATA.records.forEach(record => {
                if (record.userAnswers) {
                    correctProblemIds.forEach(pId => {
                        // 해당 문제의 오답 기록 삭제 (정답으로 업데이트)
                        const problem = MOCK_DATA.problems.find(p => p.problemId === pId);
                        if (problem && record.userAnswers[pId] !== undefined) {
                            // 정답으로 업데이트하여 오답 노트에서 제외되도록 함
                            record.userAnswers[pId] = problem.answer;
                        }
                    });
                }
            });
            // 변경사항 저장
            api.run('syncRecords', MOCK_DATA.records);
        }

        const score = Math.round((correctCount / totalProblems) * 100);
        // Is pass? Average 60
        const isPass = score >= 60;

        // Save Result
        const resultData = {
            date: new Date().toISOString(),
            score: score,
            correctCount: correctCount,
            totalCount: totalProblems,
            subjectAnalysis: subjectScores,
            userAnswers: userAnswers,
            timeSpent: (problems.length * 60) - timeLeft, // approximate
            workbookTitle: store.getState().workbookTitle || '모의고사'
        };

        // Save to Store & API
        store.setState({
            examStatus: 'finished',
            lastResult: resultData
        });

        api.run('saveRecord', resultData);

        // Create Result Page rendering
        this.renderResultPage(resultData);
    },

    renderResultPage(result) {
        // Change Router/View Manually to Result
        router.navigate('result');

        const contentArea = document.getElementById('content-area');
        const isPass = result.score >= 60;

        let subjectRows = '';
        for (const [subject, data] of Object.entries(result.subjectAnalysis)) {
            const subScore = Math.round((data.correct / data.total) * 100);
            let scoreClass = 'low';
            if (subScore >= 80) scoreClass = 'high';
            else if (subScore >= 60) scoreClass = 'mid';

            subjectRows += `
                <div class="subject-row">
                    <span class="subject-name">${subject}</span>
                    <span class="subject-score ${scoreClass}">${subScore}점 (${data.correct}/${data.total})</span>
                </div>
            `;
        }

        contentArea.innerHTML = `
            <div class="result-container">
                <div class="score-card ${isPass ? 'pass' : 'fail'}">
                    <div class="score-badge ${isPass ? 'pass' : 'fail'}">
                        ${isPass ? '합격' : '불합격'}
                    </div>
                    <div class="total-score">
                        ${result.score}<span>점</span>
                    </div>
                    <p style="color:var(--text-secondary)">
                        총 ${result.totalCount}문제 중 ${result.correctCount}문제 정답
                    </p>
                </div>

                <div class="result-grid">
                    <div class="analysis-card">
                        <h4 style="margin-bottom:15px;">과목별 분석</h4>
                        ${subjectRows}
                    </div>
                    <div class="analysis-card">
                        <h4 style="margin-bottom:15px;">학습 조언</h4>
                        <p style="color:var(--text-secondary); font-size:0.9rem; line-height:1.6;">
                            ${isPass ? '축하합니다! 안정적인 점수권입니다. 틀린 문제 위주로 복습하여 실수를 줄이세요.' : '아쉽게도 합격 기준에 미치지 못했습니다. 취약한 과목을 중심으로 개념 학습이 필요합니다.'}
                        </p>
                    </div>
                </div>

                <div class="action-buttons">
                    <button class="btn" style="border:1px solid var(--border-color); background:white;"
                            onclick="Exam.reviewWrongAnswers()">
                        오답 다시 풀기
                    </button>
                    <button class="btn btn-primary" onclick="router.navigate('dashboard')">
                        대시보드로 이동
                    </button>
                </div>
            </div>
        `;
    },

    renderReviewMode(state) {
        const { problems, currentProblemIndex, userAnswers } = state;
        const currentProblem = problems[currentProblemIndex];
        const userAnswer = userAnswers[currentProblem.problemId];
        const isCorrect = userAnswer === currentProblem.answer;

        // 1. Layout (Same as Exam but Right Panel differs)
        const contentArea = document.getElementById('content-area');
        if (!document.querySelector('.exam-layout')) {
            contentArea.innerHTML = `
                <div class="exam-layout review-mode">
                    <div class="exam-panel-center" id="question-container"></div>
                    <div class="exam-panel-right">
                        <div class="card" style="text-align:center; padding:var(--space-md); margin-bottom:var(--space-md); border:1px solid var(--border-color);">
                            <h4 style="color:var(--text-secondary); margin-bottom:5px;">오답 노트 모드</h4>
                        </div>
                        <div class="omr-grid" id="omr-container"></div>
                    </div>
                </div>
            `;
        }

        // 2. Render Question with Explanations
        const questionContainer = document.getElementById('question-container');
        if (questionContainer) {
            questionContainer.innerHTML = `
                <div class="question-card review-mode">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <span style="font-weight:bold; color:var(--primary-color)">Q.${currentProblemIndex + 1}</span>
                        <div style="display:flex; gap:10px; align-items:center;">
                            ${isCorrect
                    ? '<span class="score-badge pass" style="margin:0; font-size:0.8rem;">정답</span>'
                    : '<span class="score-badge fail" style="margin:0; font-size:0.8rem;">오답</span>'}
                            <span style="color:var(--text-secondary)">${currentProblem.subject}</span>
                        </div>
                    </div>
                    
                    ${currentProblem.imageUrl ? `<div style="text-align:center; margin-bottom:20px;"><img src="${currentProblem.imageUrl}" style="max-width:100%; max-height:400px; border-radius:8px; border:1px solid #eee;"></div>` : ''}

                    <h3 style="margin-bottom:20px; line-height:1.6;">${currentProblem.question}</h3>
                    
                    <div class="choices">
                        ${currentProblem.choices.map((choice, idx) => {
                        const choiceNum = idx + 1;
                        let className = 'choice-item';
                        // Logic for highlighting styles
                        if (choiceNum === currentProblem.answer) className += ' correct-answer';
                        else if (choiceNum === userAnswer) className += ' wrong-answer';

                        // Icons for visual feedback on choices
                        let icon = '';
                        if (choiceNum === currentProblem.answer) icon = '<span class="material-icons-round" style="margin-left:auto; color:var(--secondary-color);">check_circle</span>';
                        else if (choiceNum === userAnswer) icon = '<span class="material-icons-round" style="margin-left:auto; color:var(--danger-color);">cancel</span>';

                        return `
                                <div class="choice-item ${className}">
                                    <span style="margin-right:10px; font-weight:bold;">${choiceNum}.</span>
                                    ${choice}
                                    ${icon}
                                </div>
                            `;
                    }).join('')}
                    </div>

                    <div class="explanation-card">
                        <div class="explanation-title">
                            <span class="material-icons-round">lightbulb</span> 해설
                        </div>
                        <p>${currentProblem.explanation || "해설이 등록되지 않은 문제입니다."}</p>
                    </div>

                    <div style="display:flex; justify-content:space-between; margin-top:30px;">
                        <button class="btn" style="border:1px solid var(--border-color)" 
                                onclick="store.prevProblem()"
                                ${currentProblemIndex === 0 ? 'disabled' : ''}>이전</button>
                        <button class="btn btn-primary" 
                                onclick="store.nextProblem()"
                                ${currentProblemIndex === problems.length - 1 ? 'display:none' : ''}>다음</button>
                    </div>
                </div>
            `;
        }

        // 3. Render OMR (Color coded for correctness)
        const omrContainer = document.getElementById('omr-container');
        if (omrContainer) {
            omrContainer.innerHTML = problems.map((p, idx) => {
                const userChoice = userAnswers[p.problemId];
                const isItemCorrect = userChoice === p.answer;
                const isActive = idx === currentProblemIndex;

                // Color code the number
                let numStyle = '';
                if (isItemCorrect) numStyle = 'color:var(--secondary-color);';
                else numStyle = 'color:var(--danger-color);';

                return `
                    <div class="omr-row ${isActive ? 'active-row' : ''}" onclick="store.jumpToProblem(${idx})">
                        <div class="omr-num" style="${numStyle}">${idx + 1}</div>
                        <div class="omr-options" style="justify-content:flex-end; padding-right:10px; font-size:0.8rem; color:var(--text-secondary);">
                            ${isItemCorrect ? 'O' : 'X'}
                        </div>
                    </div>
                `;
            }).join('');

            const activeRow = omrContainer.querySelector('.active-row');
            if (activeRow) activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Trigger Math Rendering
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(document.getElementById('question-container'), {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ]
            });
        }
    },

    async saveProblemUpdate(problemId) {
        const question = document.getElementById('exam-edit-q').value;
        const answer = parseInt(document.getElementById('exam-edit-ans').value);
        const explanation = document.getElementById('exam-edit-exp').value;
        const choices = [];
        for (let i = 0; i < 4; i++) {
            choices.push(document.getElementById(`exam-edit-c-${i}`).value);
        }

        const updatedData = {
            id: problemId,
            question, choices, answer, explanation
        };

        try {
            await api.run('updateProblem', updatedData);
            UI.modal.alert("문제가 수정되었습니다.");

            // Update local state problems to reflect changes immediately
            const { problems } = store.getState();
            // Since problems is an array of objects, verify if we can mutate directly or need shallow copy
            // For reactivity, store needs new object reference often. (But here store uses simple pub/sub)
            const target = problems.find(p => p.problemId === problemId);
            if (target) {
                target.question = question;
                target.choices = choices;
                target.answer = answer;
                target.explanation = explanation;
            }
            // Trigger state update
            store.setState({ problems: [...problems], isEditMode: false });
        } catch (e) {
            console.error(e);
            UI.modal.alert("수정 실패: " + e.message);
        }
    },

    toggleAnswer() {
        const el = document.getElementById('explanation-container');
        if (el) {
            el.classList.toggle('hidden');
        }
    },

    reviewWrongAnswers() {
        const state = store.getState();
        const lastResult = state.lastResult;

        // Problems are in the main state, UserAnswers are in the result (or current state if no result yet)
        const problems = state.problems;
        const userAnswers = lastResult ? lastResult.userAnswers : state.userAnswers;

        if (!problems || !userAnswers || problems.length === 0) {
            UI.modal.alert("리뷰할 데이터가 없습니다.");
            return;
        }

        this.startReview(userAnswers, problems);
    },

    reviewHistoryRecord(record) {
        if (!record || !record.userAnswers) {
            UI.modal.alert("이 회차의 문제 정보를 찾을 수 없습니다.");
            return;
        }

        // We need to find the problem objects
        // Since we don't store full problem objects in history, we look them up by ID from MOCK_DATA
        // MOCK_DATA.problems is available globally
        const allProblems = MOCK_DATA.problems;
        const wrongProblems = [];
        const userAnswers = record.userAnswers;

        for (const [pId, userAns] of Object.entries(userAnswers)) {
            const problem = allProblems.find(p => p.problemId === pId);
            if (problem && problem.answer !== userAns) {
                wrongProblems.push(problem);
            }
        }

        if (wrongProblems.length === 0) {
            UI.modal.alert("틀린 문제가 없습니다! 모두 정답입니다.");
            return;
        }

        // Start Exam with ONLY wrong problems in 'practice' mode
        const retryTitle = `[오답 다시 풀기] ${record.workbookTitle || '모의고사'}`;

        store.startExam(wrongProblems, 'practice', retryTitle);
        store.setState({ currentPage: 'exam_running', examMode: 'practice' });
        router.navigate('exam_running');
    },
};

// Initialize Exam Module
Exam.init();
