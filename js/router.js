/**
 * Simple Hash-based Router
 */
const router = {
    routes: {
        'dashboard': () => Dashboard.render(),
        'cbt': renderCBTAuth,
        'exam_running': () => { }, // Handled by Exam.js subscription
        'result': () => { }, // Handled by Exam.js render logic mostly, but good to have entry
        'review': () => Review.render(),
        'history': () => renderFullHistory(), // Full study history page
        'bulk-upload': () => BulkUpload.render(),
        'manage': () => ProblemManager.render()
    },

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute(); // Initial load
    },

    handleRoute() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const page = hash.split('/')[0]; // simple handling for nested params later

        // Update Sidebar UI
        document.querySelectorAll('.menu-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });

        // Update Title
        const titles = {
            'dashboard': '대시보드',
            'cbt': '실전 모의고사',
            'review': '오답 노트',
            'bulk-upload': '문제 등록'
        };
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = titles[page] || '모의고사 문제집 앱';
        }

        // Render Page
        const renderFunction = this.routes[page];
        if (renderFunction) {
            renderFunction();
        } else {
            document.getElementById('content-area').innerHTML = '<h2>404 Page Not Found</h2>';
        }
    },

    navigate(page) {
        window.location.hash = page;
    }
};

// Placeholder Render Functions
// Placeholder Render Functions


async function renderCBTAuth() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>데이터 로딩 중...</p></div>';

    // Firebase에서 문제 가져오기
    const problems = await api.run('getProblems');
    const titles = [...new Set(problems.map(p => p.workbookTitle))];

    // Card Grid Layout (ID Card Style with Attempt Count)

    // 1. Get History for Attempt Counts (from Firebase)
    let records = [];
    try {
        records = await api.run('getRecords') || [];
    } catch (e) {
        console.error("Failed to load records", e);
    }

    // Count attempts per title
    const attemptCounts = {};
    records.forEach(r => {
        if (r.workbookTitle) {
            attemptCounts[r.workbookTitle] = (attemptCounts[r.workbookTitle] || 0) + 1;
        }
    });

    const cardsHtml = titles.map(t => {
        const count = attemptCounts[t] || 0;
        const countText = count > 0 ? `현재까지 ${count}회 응시함` : '아직 응시 기록이 없습니다.';

        // Format Title: Insert line break after "Year Round "
        // Example: "2024년 3회 공조냉동..." -> "2024년 3회<br>공조냉동..."
        const formattedTitle = t.replace(/^(\d{4}년\s+\d+회)\s+(.*)$/, '$1<br>$2');

        return `
        <div class="workbook-card" onclick="Exam.start('real', '${t}')">
            <!-- 1. Image Area -->
            <div class="wb-card-image"></div>

            <!-- 2. Content Area -->
            <div class="wb-card-content">
                <!-- Heading -->
                <div class="wb-card-title">${formattedTitle}</div>
                
                <!-- Description (Attempt Count) -->
                <div class="wb-card-info">${countText}</div>

                <!-- Action Button -->
                <button class="wb-card-btn">시험 시작</button>
            </div>
        </div>
        `;
    }).join('');

    contentArea.innerHTML = `
        <div style="max-width: 1600px; margin: 0 auto; padding: 0 20px;">
            <div style="text-align:center; margin-bottom:40px;">
                <h2 style="margin-bottom:10px;">실전 모의고사 응시</h2>
                <p style="color:var(--text-secondary);">
                    응시할 기출문제 회차를 선택해주세요.<br>
                    선택 즉시 시험이 시작되며 타이머가 작동합니다.
                </p>
            </div>
            
            <div class="workbook-grid">
                ${cardsHtml}
            </div>
        </div>
    `;
}

function renderBulkUpload() {
    if (typeof BulkUpload !== 'undefined') BulkUpload.render();
}

async function renderFullHistory() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>데이터 로딩 중...</p></div>';

    // Firebase에서 기록 가져오기
    const records = await api.run('getRecords') || [];

    // Sort by date desc (most recent first)
    const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

    let historyHtml = '';
    if (sortedRecords.length === 0) {
        historyHtml = `<div style="text-align:center; padding:50px; color:var(--text-secondary);">아직 학습 기록이 없습니다.</div>`;
    } else {
        historyHtml = `
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom:2px solid #eee; text-align:left; color:var(--text-secondary);">
                        <th style="padding:12px;">#</th>
                        <th style="padding:12px;">시험명</th>
                        <th style="padding:12px;">날짜</th>
                        <th style="padding:12px; text-align:center;">점수</th>
                        <th style="padding:12px; text-align:center;">결과</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedRecords.map((r, idx) => {
            const date = new Date(r.date).toLocaleString();
            const isPass = r.score >= 60;
            const title = r.workbookTitle || '모의고사';
            return `
                            <tr style="border-bottom:1px solid #f0f0f0;">
                                <td style="padding:12px; color:var(--text-secondary);">${idx + 1}</td>
                                <td style="padding:12px; font-weight:500;">${title}</td>
                                <td style="padding:12px; color:var(--text-secondary); font-size:0.9rem;">${date}</td>
                                <td style="padding:12px; text-align:center; font-weight:bold;">${r.score}점</td>
                                <td style="padding:12px; text-align:center;">
                                    <span style="padding:4px 10px; border-radius:20px; font-size:0.85rem; color:white; background:${isPass ? 'var(--secondary-color)' : 'var(--danger-color)'};">
                                        ${isPass ? '합격' : '불합격'}
                                    </span>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    }

    contentArea.innerHTML = `
        <div class="card" style="max-width:1000px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2><span class="material-icons-round" style="vertical-align:middle; margin-right:8px; color:var(--primary-color);">history</span>전체 학습 기록</h2>
                <button class="btn" style="border:1px solid #eee;" onclick="router.navigate('dashboard')">
                    ← 대시보드로 돌아가기
                </button>
            </div>
            <p style="color:var(--text-secondary); margin-bottom:20px;">총 ${sortedRecords.length}개의 학습 기록이 있습니다.</p>
            ${historyHtml}
        </div>
    `;
}
