/**
 * API Wrapper for Firebase Firestore
 * Handles separation between local development and production environments.
 */
const STORAGE_KEY = 'gemini_cbt_data_v1';

// Set to true to use Firebase backend, false for localStorage only
const USE_FIREBASE_BACKEND = true;

const api = {
    init: function () {
        // Firebase가 활성화되어 있으면 로컬 데이터를 Firebase와 동기화 시도
        if (USE_FIREBASE_BACKEND && typeof db !== 'undefined') {
            console.log("[Firebase API] Firebase backend enabled");
            this.syncLocalToFirebase();
        } else if (typeof MOCK_DATA !== 'undefined') {
            // 로컬 개발 모드
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
            }
        }
    },

    // 로컬 데이터를 Firebase로 한 번 동기화 (마이그레이션용)
    syncLocalToFirebase: async function () {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;

        try {
            const parsed = JSON.parse(saved);
            if (parsed.problems && parsed.problems.length > 0) {
                // 이미 Firebase에 데이터가 있는지 확인
                const snapshot = await db.collection('problems').limit(1).get();
                if (snapshot.empty) {
                    console.log("[Firebase API] Migrating local data to Firebase...");
                    await this.firebaseHandlers.uploadProblems(parsed.problems);
                    console.log("[Firebase API] Migration complete!");
                }
            }
        } catch (e) {
            console.error("[Firebase API] Migration error:", e);
        }
    },

    run: function (functionName, ...args) {
        return new Promise((resolve, reject) => {
            // Firebase 백엔드 사용
            if (USE_FIREBASE_BACKEND && typeof db !== 'undefined') {
                console.log(`[Firebase API] Calling ${functionName} with args:`, args);

                if (this.firebaseHandlers[functionName]) {
                    this.firebaseHandlers[functionName](...args)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(`Function ${functionName} not implemented for Firebase`);
                }
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

    // Firebase Firestore 핸들러
    firebaseHandlers: {
        // 문제 목록 조회
        getProblems: async (workbookTitle) => {
            try {
                let query = db.collection('problems');

                if (workbookTitle) {
                    query = query.where('workbookTitle', '==', workbookTitle);
                }

                const snapshot = await query.get();
                const problems = [];

                snapshot.forEach(doc => {
                    problems.push({ problemId: doc.id, ...doc.data() });
                });

                console.log(`[Firebase] Loaded ${problems.length} problems`);
                return problems;
            } catch (e) {
                console.error("[Firebase] getProblems error:", e);
                return [];
            }
        },

        // 문제 일괄 업로드
        uploadProblems: async (problems) => {
            try {
                const batch = db.batch();

                problems.forEach(p => {
                    const id = p.problemId || `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    const docRef = db.collection('problems').doc(id);

                    batch.set(docRef, {
                        workbookTitle: p.workbookTitle || '',
                        subject: p.subject || '',
                        question: p.question || '',
                        imageUrl: p.imageUrl || '',
                        choices: p.choices || [],
                        answer: parseInt(p.answer) || 1,
                        explanation: p.explanation || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });

                await batch.commit();
                console.log(`[Firebase] Uploaded ${problems.length} problems`);
                return { success: true, count: problems.length };
            } catch (e) {
                console.error("[Firebase] uploadProblems error:", e);
                return { success: false, error: e.message };
            }
        },

        // 문제 수정
        updateProblem: async (data) => {
            try {
                await db.collection('problems').doc(data.id).update({
                    subject: data.subject,
                    question: data.question,
                    choices: data.choices,
                    answer: parseInt(data.answer),
                    explanation: data.explanation || '',
                    ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
                    ...(data.workbookTitle && { workbookTitle: data.workbookTitle })
                });

                console.log(`[Firebase] Updated problem ${data.id}`);
                return { success: true };
            } catch (e) {
                console.error("[Firebase] updateProblem error:", e);
                return { success: false, error: e.message };
            }
        },

        // 문제 삭제
        deleteProblem: async (id) => {
            try {
                await db.collection('problems').doc(id).delete();
                console.log(`[Firebase] Deleted problem ${id}`);
                return { success: true };
            } catch (e) {
                console.error("[Firebase] deleteProblem error:", e);
                return { success: false, error: e.message };
            }
        },

        // 문제집 삭제 (해당 문제집의 모든 문제 삭제)
        deleteWorkbook: async (title) => {
            try {
                const snapshot = await db.collection('problems')
                    .where('workbookTitle', '==', title)
                    .get();

                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                console.log(`[Firebase] Deleted workbook "${title}" (${snapshot.size} problems)`);
                return { success: true, count: snapshot.size };
            } catch (e) {
                console.error("[Firebase] deleteWorkbook error:", e);
                return { success: false, error: e.message };
            }
        },

        // 문제집 제목 변경
        updateWorkbookTitle: async (oldTitle, newTitle) => {
            try {
                const snapshot = await db.collection('problems')
                    .where('workbookTitle', '==', oldTitle)
                    .get();

                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.update(doc.ref, { workbookTitle: newTitle });
                });

                await batch.commit();
                console.log(`[Firebase] Renamed workbook "${oldTitle}" to "${newTitle}"`);
                return { success: true };
            } catch (e) {
                console.error("[Firebase] updateWorkbookTitle error:", e);
                return { success: false, error: e.message };
            }
        },

        // 학습 기록 저장
        saveRecord: async (record) => {
            try {
                const id = record.recordId || `r-${Date.now()}`;
                await db.collection('records').doc(id).set({
                    date: record.date || new Date().toISOString(),
                    workbookTitle: record.workbookTitle || '',
                    score: record.score || 0,
                    totalProblems: record.totalProblems || 0,
                    correctCount: record.correctCount || 0,
                    wrongAnswers: record.wrongAnswers || [],
                    subjectAnalysis: record.subjectAnalysis || {}
                });

                console.log(`[Firebase] Saved record ${id}`);
                return { success: true };
            } catch (e) {
                console.error("[Firebase] saveRecord error:", e);
                return { success: false, error: e.message };
            }
        },

        // 학습 기록 조회
        getRecords: async () => {
            try {
                const snapshot = await db.collection('records')
                    .orderBy('date', 'desc')
                    .get();

                const records = [];
                snapshot.forEach(doc => {
                    records.push({ recordId: doc.id, ...doc.data() });
                });

                console.log(`[Firebase] Loaded ${records.length} records`);
                return records;
            } catch (e) {
                console.error("[Firebase] getRecords error:", e);
                return [];
            }
        },

        // 사용자 설정 조회
        getUserSettings: async () => {
            try {
                const doc = await db.collection('settings').doc('user').get();
                if (doc.exists) {
                    return doc.data();
                }
                // 기본값 반환
                return { dDay: '2026-12-31', userName: '수험생' };
            } catch (e) {
                console.error("[Firebase] getUserSettings error:", e);
                return { dDay: '2026-12-31', userName: '수험생' };
            }
        },

        // 사용자 설정 저장
        saveUserSettings: async (settings) => {
            try {
                await db.collection('settings').doc('user').set(settings, { merge: true });
                console.log("[Firebase] Saved user settings");
                return { success: true };
            } catch (e) {
                console.error("[Firebase] saveUserSettings error:", e);
                return { success: false, error: e.message };
            }
        },

        // 기록 동기화 (전체 교체)
        syncRecords: async (records) => {
            try {
                // 기존 기록 삭제
                const snapshot = await db.collection('records').get();
                const batch = db.batch();
                snapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();

                // 새 기록 추가
                const newBatch = db.batch();
                records.forEach(r => {
                    const id = r.recordId || `r-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                    const docRef = db.collection('records').doc(id);
                    newBatch.set(docRef, {
                        date: r.date,
                        workbookTitle: r.workbookTitle,
                        score: r.score,
                        totalProblems: r.totalProblems,
                        correctCount: r.correctCount,
                        wrongAnswers: r.wrongAnswers || [],
                        subjectAnalysis: r.subjectAnalysis || {}
                    });
                });
                await newBatch.commit();

                console.log(`[Firebase] Synced ${records.length} records`);
                return { success: true };
            } catch (e) {
                console.error("[Firebase] syncRecords error:", e);
                return { success: false, error: e.message };
            }
        }
    },

    // 로컬 Mock 핸들러 (백업용)
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
                if (data.imageUrl !== undefined) p.imageUrl = data.imageUrl;
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
        },
        syncRecords: (records) => {
            MOCK_DATA.records = records;
            api.mockHandlers._persist();
            return { success: true };
        }
    }
};
