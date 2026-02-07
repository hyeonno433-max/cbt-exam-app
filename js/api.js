/**
 * API Wrapper for Google Apps Script
 * Handles separation between local development and production environments.
 */
const STORAGE_KEY = 'gemini_cbt_data_v1';
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxpAXACMrXchcSixEPnxeM3JtWRRYUbOT4lw0gO9oguU1fvuhm5gtDV5HjFSr2VAQA/exec';

// Set to true to use Google Sheets backend, false for localStorage only
const USE_SHEETS_BACKEND = true;

const api = {
    isProduction: typeof google !== 'undefined' && google.script,

    init: function () {
        if (typeof MOCK_DATA !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.problems) MOCK_DATA.problems = parsed.problems;
                    if (parsed.records) MOCK_DATA.records = parsed.records;
                    if (parsed.user) MOCK_DATA.user = parsed.user;
                    console.log("[MockAPI] Loaded data from localStorage");
                } catch (e) {
                    console.error("Failed to load local data", e);
                }
            } else {
                console.log("[MockAPI] No local data found, using defaults");
            }
        }
    },

    run: function (functionName, ...args) {
        return new Promise((resolve, reject) => {
            // GAS iframe 환경 (Apps Script 내부에서 실행)
            if (this.isProduction) {
                google.script.run
                    .withSuccessHandler(resolve)
                    .withFailureHandler(reject)
                [functionName](...args);
            }
            // GitHub Pages 등 외부에서 Sheets 백엔드 사용
            else if (USE_SHEETS_BACKEND && GAS_WEB_APP_URL) {
                const url = `${GAS_WEB_APP_URL}?action=${functionName}&args=${encodeURIComponent(JSON.stringify(args))}`;
                fetch(url)
                    .then(res => res.json())
                    .then(data => {
                        console.log(`[GAS API] ${functionName} response:`, data);
                        resolve(data);
                    })
                    .catch(err => {
                        console.error(`[GAS API] ${functionName} error:`, err);
                        // Fallback to mock
                        if (this.mockHandlers[functionName]) {
                            resolve(this.mockHandlers[functionName](...args));
                        } else {
                            reject(err);
                        }
                    });
            }
            // 로컬 개발 (Mock 데이터 사용)
            else {
                console.log(`[MockAPI] Calling ${functionName} with args:`, args);
                setTimeout(() => {
                    this.mockHandlers[functionName]
                        ? resolve(this.mockHandlers[functionName](...args))
                        : reject(`Function ${functionName} not mocked`);
                }, 200);
            }
        });
    },

    mockHandlers: {
        _persist: () => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DATA));
            } catch (e) {
                console.error("LocalStorage Save Failed:", e);
                if (e.name === 'QuotaExceededError') {
                    alert("저장 공간이 부족합니다! 이미지를 줄이거나 데이터를 정리해주세요.");
                }
            }
        },
        getProblems: (workbookTitle) => {
            if (!workbookTitle) return MOCK_DATA.problems;
            return MOCK_DATA.problems.filter(p => p.workbookTitle === workbookTitle);
        },
        saveRecord: (record) => {
            console.log("Record saved:", record);
            MOCK_DATA.records.push(record);
            api.mockHandlers._persist();
            return { success: true };
        },
        getUserSettings: () => {
            return MOCK_DATA.user.settings;
        },
        getRecords: () => {
            return MOCK_DATA.records || [];
        },
        updateWorkbookTitle: (oldTitle, newTitle) => {
            MOCK_DATA.problems.forEach(p => {
                if (p.workbookTitle === oldTitle) p.workbookTitle = newTitle;
            });
            api.mockHandlers._persist();
            return { success: true };
        },
        updateProblem: (data) => {
            const p = MOCK_DATA.problems.find(p => p.problemId === data.id);
            if (p) {
                p.subject = data.subject;
                p.question = data.question;
                p.choices = data.choices;
                p.answer = parseInt(data.answer);
                p.explanation = data.explanation;
                if (data.imageUrl !== undefined) p.imageUrl = data.imageUrl; // Update image if provided
                api.mockHandlers._persist();
            }
            return { success: true };
        },
        deleteProblem: (id) => {
            const idx = MOCK_DATA.problems.findIndex(p => p.problemId === id);
            if (idx !== -1) {
                MOCK_DATA.problems.splice(idx, 1);
                api.mockHandlers._persist();
            }
            return { success: true };
        },
        deleteWorkbook: (title) => {
            const initialCount = MOCK_DATA.problems.length;
            for (let i = MOCK_DATA.problems.length - 1; i >= 0; i--) {
                if (MOCK_DATA.problems[i].workbookTitle === title) {
                    MOCK_DATA.problems.splice(i, 1);
                }
            }
            api.mockHandlers._persist();
            return { success: true, count: initialCount - MOCK_DATA.problems.length };
        },
        uploadProblems: (problems) => {
            MOCK_DATA.problems.push(...problems);
            api.mockHandlers._persist();
            return { success: true, count: problems.length };
        }
    }
};
