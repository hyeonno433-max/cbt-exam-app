/**
 * Automated Verification Test Runner
 */
async function runVerificationTest() {
    const logArea = document.createElement('div');
    logArea.id = 'test-logs';
    logArea.style.padding = '20px';
    logArea.style.background = '#000';
    logArea.style.color = '#0f0';
    logArea.style.fontFamily = 'monospace';
    logArea.style.whiteSpace = 'pre-wrap';
    logArea.style.zIndex = '9999';
    logArea.style.position = 'fixed';
    logArea.style.bottom = '0';
    logArea.style.left = '0';
    logArea.style.right = '0';
    logArea.style.height = '300px';
    logArea.style.overflow = 'auto';
    document.body.appendChild(logArea);

    function log(msg, type = 'INFO') {
        const line = `[${type}] ${msg}\n`;
        logArea.textContent += line;
        console.log(line);
        if (type === 'ERROR') logArea.style.background = '#300';
    }

    log("Starting Verification Test...");

    try {
        // 1. Setup
        const initialRecordCount = MOCK_DATA.records.length;
        const testWorkbook = MOCK_DATA.problems[0].workbookTitle; // Use first available workbook

        if (!testWorkbook) throw new Error("No problems available for testing");

        log(`Target Workbook: ${testWorkbook}`);
        log(`Initial Records: ${initialRecordCount}`);

        // 2. Start Exam
        log("Action: Starting Exam...");
        Exam.start('practice', testWorkbook);

        await new Promise(r => setTimeout(r, 1000)); // Wait for render

        if (store.getState().currentPage !== 'exam_running') {
            throw new Error("Failed to switch to exam_running page");
        }

        // 3. Simulate Answers (Auto Solve)
        log("Action: Auto Solving...");
        // Force specific answers to ensure passing/failing mixed results if needed, 
        // but autoSolve is random. Let's use autoSolve for now.
        Exam.autoSolve();

        // 4. Wait for Submission and Result
        log("Action: Waiting for submission...");
        await new Promise(r => setTimeout(r, 2000)); // Wait for submit delay + logic

        const state = store.getState();
        const lastResult = state.lastResult;

        if (!lastResult) {
            throw new Error("Submission failed: No result found in state");
        }

        log(`Exam Finished. Score: ${lastResult.score}`);

        // 5. Verify Persistence
        const finalRecordCount = MOCK_DATA.records.length;
        if (finalRecordCount !== initialRecordCount + 1) {
            // Check localStorage directly just in case MOCK_DATA Ref wasn't updated (though it should be)
            const saved = JSON.parse(localStorage.getItem('gemini_cbt_data_v1'));
            if (saved.records.length !== initialRecordCount + 1) {
                throw new Error(`Persistence Failed: Record count didn't increase. Expected ${initialRecordCount + 1}, Got ${finalRecordCount}`);
            } else {
                log("NOTE: LocalStorage updated but in-memory MOCK_DATA might be stale (acceptable if reloaded)");
            }
        }
        log("SUCCESS: Record saved successfully.");

        // 6. Verify Dashboard Data (Mock check)
        // Check if the statistics logic sees the new record
        const recentRecord = MOCK_DATA.records[MOCK_DATA.records.length - 1];
        if (recentRecord.date !== lastResult.date) {
            throw new Error("Last saved record does not match current result date.");
        }

        // 7. Verify Incorrect Answers (if any)
        const wrongCount = lastResult.totalCount - lastResult.correctCount;
        log(`Wrong Answers: ${wrongCount}`);

        if (wrongCount > 0) {
            // Check if we can start review
            log("Action: Attempting to start Review Mode...");
            Exam.reviewWrongAnswers();
            await new Promise(r => setTimeout(r, 500));

            if (store.getState().examMode !== 'review') {
                throw new Error("Failed to enter Review Mode");
            }
            log("SUCCESS: Review Mode started.");
        } else {
            log("Perfect Score! Skipping Review Mode check.");
        }

        log("ALL TESTS PASSED");
        const successDiv = document.createElement('div');
        successDiv.id = 'test-result-success';
        successDiv.textContent = 'TEST_PASSED';
        document.body.appendChild(successDiv);

    } catch (e) {
        log(e.message, 'ERROR');
        log(e.stack, 'ERROR');
        const failDiv = document.createElement('div');
        failDiv.id = 'test-result-fail';
        failDiv.textContent = 'TEST_FAILED';
        document.body.appendChild(failDiv);
    }
}

// Run after a short delay to ensure everything loaded
setTimeout(runVerificationTest, 1000);
