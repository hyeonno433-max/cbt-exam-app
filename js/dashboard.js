/**
 * Dashboard & Analytics Module
 */
const Dashboard = {
    render() {
        // 1. Fetch Data
        const user = MOCK_DATA.user;
        const records = MOCK_DATA.records || [];

        // 2. Calculate Stats
        const totalExams = records.length;
        const passedExams = records.filter(r => r.score >= 60).length;
        const passRate = totalExams > 0 ? Math.round((passedExams / totalExams) * 100) : 0;

        let totalScore = 0;
        let totalProblemsSolved = 0;
        let correctProblems = 0;

        // Subject Analysis
        const subjectStats = {}; // { subject: { total: 0, correct: 0 } }

        records.forEach(r => {
            totalScore += r.score;
            totalProblemsSolved += r.totalCount;
            correctProblems += r.correctCount;

            if (r.subjectAnalysis) {
                for (const [subj, data] of Object.entries(r.subjectAnalysis)) {
                    if (!subjectStats[subj]) subjectStats[subj] = { total: 0, correct: 0 };
                    subjectStats[subj].total += data.total;
                    subjectStats[subj].correct += data.correct;
                }
            }
        });

        const avgScore = totalExams > 0 ? Math.round(totalScore / totalExams) : 0;

        // Calculate D-Day
        const today = new Date();
        const dDayDate = new Date(user.settings.dDay);
        const diffTime = dDayDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const dDayLabel = diffDays > 0 ? `D-${diffDays}` : (diffDays === 0 ? "D-Day" : `D+${Math.abs(diffDays)}`);

        // 3. Render
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="dashboard-header" style="margin-bottom:30px;">
                <h2>반갑습니다, ${user.name}님!</h2>
                <p style="color:var(--text-secondary)">오늘도 합격을 향해 달려보세요.</p>
            </div>

            <div class="dashboard-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px; margin-bottom:30px;">
                <!-- D-Day Card - Teal/Cyan (darker) -->
                <div class="card stat-card" style="background: linear-gradient(135deg, #319795 0%, #2c7a7b 50%, #234e52 100%); color:white; cursor:pointer; position:relative; overflow:hidden; padding:28px; text-shadow: 0 1px 3px rgba(0,0,0,0.3);" onclick="Dashboard.editDDay()" title="클릭하여 시험 날짜 변경">
                    <div class="card-pattern" style="position:absolute; top:0; right:0; width:100%; height:100%; background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22rgba(255,255,255,0.08)%22 x=%2250%22 y=%220%22 width=%2260%22 height=%2260%22 transform=%22rotate(45 50 50)%22/><rect fill=%22rgba(255,255,255,0.05)%22 x=%2270%22 y=%2220%22 width=%2240%22 height=%2240%22 transform=%22rotate(45 70 40)%22/></svg>') no-repeat right top; background-size:cover; pointer-events:none;"></div>
                    <div style="position:relative; z-index:1;">
                        <div style="margin-bottom:12px;"><span class="material-icons-round" style="font-size:36px;">event</span></div>
                        <div style="font-size:2.2rem; font-weight:bold; margin-bottom:6px;">${dDayLabel}</div>
                        <div style="font-size:1.1rem;">시험까지</div>
                        <div style="margin-top:18px; font-size:0.95rem; display:flex; align-items:center; gap:8px;">
                            <span class="material-icons-round" style="font-size:18px;">calendar_today</span>
                            ${user.settings.dDay}
                            <span class="material-icons-round" style="font-size:18px; margin-left:auto;">edit</span>
                        </div>
                    </div>
                </div>

                <!-- 평균 점수 Card - Orange (darker) -->
                <div class="card stat-card" style="background: linear-gradient(135deg, #dd6b20 0%, #c05621 50%, #9c4221 100%); color:white; position:relative; overflow:hidden; padding:28px; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                    <div class="card-pattern" style="position:absolute; top:0; right:0; width:100%; height:100%; background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22rgba(255,255,255,0.08)%22 x=%2250%22 y=%220%22 width=%2260%22 height=%2260%22 transform=%22rotate(45 50 50)%22/><rect fill=%22rgba(255,255,255,0.05)%22 x=%2270%22 y=%2220%22 width=%2240%22 height=%2240%22 transform=%22rotate(45 70 40)%22/></svg>') no-repeat right top; background-size:cover; pointer-events:none;"></div>
                    <div style="position:relative; z-index:1;">
                        <div style="margin-bottom:12px;"><span class="material-icons-round" style="font-size:36px;">analytics</span></div>
                        <div style="font-size:2.2rem; font-weight:bold; margin-bottom:6px;">${avgScore}<span style="font-size:1.2rem; font-weight:normal;">점</span></div>
                        <div style="font-size:1.1rem;">평균 점수</div>
                        <div style="margin-top:18px; font-size:0.95rem; display:flex; align-items:center; gap:8px;">
                            <span class="material-icons-round" style="font-size:18px;">history</span>
                            ${totalExams}회 응시
                        </div>
                    </div>
                </div>

                <!-- 합격률 Card - Blue (darker) -->
                <div class="card stat-card" style="background: linear-gradient(135deg, #3182ce 0%, #2b6cb0 50%, #1a365d 100%); color:white; position:relative; overflow:hidden; padding:28px; text-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                    <div class="card-pattern" style="position:absolute; top:0; right:0; width:100%; height:100%; background:url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22rgba(255,255,255,0.08)%22 x=%2250%22 y=%220%22 width=%2260%22 height=%2260%22 transform=%22rotate(45 50 50)%22/><rect fill=%22rgba(255,255,255,0.05)%22 x=%2270%22 y=%2220%22 width=%2240%22 height=%2240%22 transform=%22rotate(45 70 40)%22/></svg>') no-repeat right top; background-size:cover; pointer-events:none;"></div>
                    <div style="position:relative; z-index:1;">
                        <div style="margin-bottom:12px;"><span class="material-icons-round" style="font-size:36px;">emoji_events</span></div>
                        <div style="font-size:2.2rem; font-weight:bold; margin-bottom:6px;">${passRate}<span style="font-size:1.2rem; font-weight:normal;">%</span></div>
                        <div style="font-size:1.1rem;">합격률</div>
                        <div style="margin-top:18px; font-size:0.95rem; display:flex; align-items:center; gap:8px;">
                            <span class="material-icons-round" style="font-size:18px;">check_circle</span>
                            ${passedExams}회 합격 / ${totalExams}회 전체
                        </div>
                    </div>
                </div>
            </div>

            <div class="dashboard-layout" style="display:grid; grid-template-columns: 1.5fr 1fr; gap:20px;">
                <!-- Recent History -->
                <div class="card">
                    <h3 style="margin-bottom:20px;">최근 학습 기록</h3>
                    ${this.renderRecentHistory(records)}
                </div>

                <!-- Weakness Analysis -->
                <div class="card">
                    <h3 style="margin-bottom:20px;">과목별 성취도</h3>
                    ${this.renderWeaknessChart(subjectStats)}
                </div>
            </div>
        `;
    },

    renderRecentHistory(records) {
        if (records.length === 0) {
            return `<div style="text-align:center; padding:30px; color:var(--text-secondary);">아직 기록이 없습니다.</div>`;
        }

        // Sort by date desc and take top 5 (fits on screen without scrolling)
        const recent = [...records].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

        window.toggleHistoryDetail = (index) => {
            const detailRow = document.getElementById(`history-detail-${index}`);
            const icon = document.getElementById(`history-icon-${index}`);
            if (detailRow && icon) {
                const isHidden = detailRow.classList.contains('hidden');
                if (isHidden) {
                    detailRow.classList.remove('hidden');
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    detailRow.classList.add('hidden');
                    icon.style.transform = 'rotate(0deg)';
                }
            }
        };

        return `
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom:2px solid #eee; text-align:left; color:var(--text-secondary);">
                        <th style="padding:10px;">시험명 (날짜)</th>
                        <th style="padding:10px; text-align:center;">평균 점수</th>
                        <th style="padding:10px; text-align:center;">결과</th>
                        <th style="padding:10px; width:40px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map((r, idx) => {
            const date = new Date(r.date).toLocaleDateString();
            const isPass = r.score >= 60;
            const title = r.workbookTitle || '모의고사'; // Fallback

            // Calculate Subject Scores for Detail View
            let subjectDetails = '';
            if (r.subjectAnalysis) {
                subjectDetails = Object.entries(r.subjectAnalysis).map(([subj, data]) => {
                    const subScore = Math.round((data.correct / data.total) * 100);
                    let color = 'var(--text-primary)';
                    if (subScore < 40) color = 'var(--danger-color)'; // F

                    return `
                                    <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed #eee;">
                                        <span style="color:var(--text-secondary); font-size:0.9rem;">${subj}</span>
                                        <span style="font-weight:bold; color:${color};">${subScore}점</span>
                                    </div>
                                `;
                }).join('');
            }

            return `
                            <tr style="border-bottom:1px solid #f9fafb; cursor:pointer;" onclick="toggleHistoryDetail(${idx})">
                                <td style="padding:12px 10px;">
                                    <div style="font-weight:bold; font-size:0.95rem; margin-bottom:2px;">${title}</div>
                                    <div style="font-size:0.8rem; color:var(--text-secondary);">${date}</div>
                                </td>
                                <td style="padding:12px 10px; font-weight:bold; font-size:1.1rem; text-align:center;">${r.score}점</td>
                                <td style="padding:12px 10px; text-align:center;">
                                    <span class="score-badge ${isPass ? 'pass' : 'fail'}" style="margin:0; font-size:0.75rem; padding: 4px 10px;">
                                        ${isPass ? '합격' : '불합격'}
                                    </span>
                                </td>
                                <td style="padding:12px 10px; text-align:center;">
                                     <span id="history-icon-${idx}" class="material-icons-round" style="color:var(--text-secondary); transition:transform 0.2s;">expand_more</span>
                                </td>
                            </tr>
                            <tr id="history-detail-${idx}" class="hidden" style="background-color:#f9fafb;">
                                <td colspan="4" style="padding:0;">
                                    <div style="padding:15px; border-bottom:1px solid #eee;">
                                        <h5 style="margin-bottom:10px; color:var(--primary-color);">과목별 상세 점수</h5>
                                        ${subjectDetails}
                                        <div style="text-align:right; margin-top:10px;">
                                            <button class="btn" style="padding:4px 12px; font-size:0.8rem; background:white; border:1px solid var(--border-color);" onclick="event.stopPropagation(); Exam.reviewWrongAnswers()">오답 다시 풀기 (이 회차)</button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
            <button class="btn" style="width:100%; margin-top:15px; border:1px solid #eee;" onclick="router.navigate('history')">최근 학습 기록 전체 보기</button>
        `;
    },

    renderWeaknessChart(subjectStats) {
        const subjects = Object.keys(subjectStats);
        if (subjects.length === 0) {
            return `<div style="text-align:center; padding:30px; color:var(--text-secondary);">데이터가 부족합니다.</div>`;
        }

        let html = '<div style="display:flex; flex-direction:column; gap:15px;">';

        for (const [subj, data] of Object.entries(subjectStats)) {
            const percent = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
            let color = '#3b82f6'; // blue
            if (percent < 40) color = '#ef4444'; // red (gwarak)
            else if (percent < 60) color = '#f59e0b'; // orange (warning)
            else if (percent >= 80) color = '#10b981'; // green (good)

            html += `
                <div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.9rem;">
                        <span>${subj}</span>
                        <span style="font-weight:bold; color:${color}">${percent}%</span>
                    </div>
                    <div style="background:#f3f4f6; height:8px; border-radius:4px; overflow:hidden;">
                        <div style="background:${color}; width:${percent}%; height:100%; border-radius:4px;"></div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    },

    editDDay() {
        const currentDate = MOCK_DATA.user.settings.dDay;

        // Create modal content with date input
        const modalContent = `
            <div style="text-align:center;">
                <p style="margin-bottom:15px; color:var(--text-secondary);">시험 날짜를 선택해주세요</p>
                <input type="date" id="dday-input" value="${currentDate}" 
                    style="padding:12px 20px; font-size:1.1rem; border:2px solid var(--primary-color); border-radius:8px; width:100%; box-sizing:border-box;">
            </div>
        `;

        // Show modal
        document.getElementById('modal-title').textContent = '📅 시험 날짜 설정';
        document.getElementById('modal-content').innerHTML = modalContent;
        document.getElementById('modal-actions').innerHTML = `
            <button class="btn" onclick="document.getElementById('modal-overlay').classList.add('hidden')">취소</button>
            <button class="btn btn-primary" onclick="Dashboard.saveDDay()">저장</button>
        `;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    saveDDay() {
        const newDate = document.getElementById('dday-input').value;
        if (newDate) {
            // Update MOCK_DATA
            MOCK_DATA.user.settings.dDay = newDate;

            // Save to localStorage
            localStorage.setItem('cbt_dday', newDate);

            // Close modal and re-render dashboard
            document.getElementById('modal-overlay').classList.add('hidden');
            this.render();
        }
    }
};
