/**
 * Bulk Upload Module
 * Handles text parsing and previewing of problems before saving.
 */
const BulkUpload = {
    parsedData: [],

    render() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="result-container" style="max-width: 1000px;">
                <div class="card">
                    <h3>문제 일괄 등록</h3>
                    <p style="color:var(--text-secondary); margin-bottom:var(--space-md);">
                        PDF, 이미지 파일을 업로드하거나 <strong>클립보드 이미지를 붙여넣기(Ctrl+V)</strong> 하세요.<br>
                        텍스트는 자동으로 추출됩니다. (이미지 인식은 시간이 걸릴 수 있습니다)
                    </p>
                    
                    <div class="form-group" style="margin-bottom:var(--space-md);">
                        <label>회차 정보</label>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                            <input type="text" id="upload-year-round" placeholder="예: 2023년 1회" style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md);">
                            <input type="text" id="upload-subject" placeholder="과목명 (예: 공기조화)" style="padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md);">
                        </div>
                    </div>

                    <div style="margin-bottom:var(--space-md); padding:20px; border:2px dashed var(--border-color); border-radius:var(--radius-md); text-align:center;">
                        <input type="file" id="pdf-upload" accept=".pdf,image/*" style="display:none" onchange="BulkUpload.handleFile(this)">
                        <button class="btn" style="background:#fff; border:1px solid var(--border-color);" onclick="document.getElementById('pdf-upload').click()">
                            <span class="material-icons-round" style="vertical-align:middle; font-size:1.2rem;">file_upload</span>
                            파일 선택 (PDF, 이미지)
                        </button>
                        <span id="file-name" style="margin-left:10px; color:var(--text-secondary); font-size:0.9rem;"></span>
                    </div>

                    <textarea id="bulk-text" style="width:100%; height:300px; padding:10px; border:1px solid var(--border-color); border-radius:var(--radius-md); font-family:monospace; line-height:1.5;" 
                        placeholder="여기에 텍스트를 입력하거나 이미지를 붙여넣기(Ctrl+V) 하세요." 
                        oninput="BulkUpload.autoCorrect(this)" 
                        onpaste="BulkUpload.handlePaste(event)"></textarea>
                    
                    <div style="margin-top:var(--space-md); text-align:right;">
                        <button class="btn btn-primary" onclick="BulkUpload.parseText()">데이터 파싱 (미리보기)</button>
                    </div>
                </div>

                <div id="preview-area" class="card hidden">
                    <!-- ... same preview area ... -->
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-md);">
                        <h4>변환 결과 미리보기 (<span id="parsed-count">0</span>문제)</h4>
                        <button class="btn btn-primary" onclick="BulkUpload.saveAll()">전체 저장</button>
                    </div>
                    <div id="parsed-list" style="display:flex; flex-direction:column; gap:var(--space-md);"></div>
                </div>
            </div>
        `;
    },

    autoCorrect(textarea) {
        // Simple 1:1 replacement, cursor handling is usually fine unless typing fast in the middle
        // but for pasting it's perfect.
        if (/[￦₩]/.test(textarea.value)) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            textarea.value = textarea.value.replace(/[￦₩]/g, '\\');
            textarea.setSelectionRange(start, end);
        }
    },

    async handleFile(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            document.getElementById('file-name').textContent = file.name;

            if (file.type.startsWith('image/')) {
                this.processImage(file);
            } else if (file.type === 'application/pdf') {
                this.processPDF(file);
            } else {
                UI.modal.alert("지원하지 않는 파일 형식입니다. (PDF 또는 이미지)");
            }
        }
    },

    handlePaste(event) {
        const items = (event.clipboardData || event.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (blob) {
                    this.processImage(blob);
                    event.preventDefault(); // Prevent pasting binary data text
                }
                return;
            }
        }
    },

    async processImage(file) {
        const textarea = document.getElementById('bulk-text');
        const originalText = textarea.value;
        textarea.value = "이미지 분석 준비 중...";
        textarea.disabled = true;

        try {
            // Check if Tesseract is loaded
            if (typeof Tesseract === 'undefined') {
                textarea.value = "OCR 라이브러리 로딩 중...";
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
                    script.onload = resolve;
                    script.onerror = () => reject(new Error("OCR 라이브러리 로드 실패"));
                    document.head.appendChild(script);
                });
            }

            // Tesseract v5 uses createWorker directly
            const worker = await Tesseract.createWorker('kor', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        textarea.value = `텍스트 변환 중... ${Math.round(m.progress * 100)}%`;
                    } else {
                        textarea.value = `준비 중... (${m.status})`;
                    }
                }
            });

            const { data: { text } } = await worker.recognize(file);
            await worker.terminate();

            textarea.value = (originalText ? originalText + "\n\n" : "") + text;
            UI.modal.alert("이미지 인식이 완료되었습니다.");
        } catch (e) {
            console.error("OCR Error:", e);
            textarea.value = originalText;
            UI.modal.alert(`이미지 인식 실패: ${e.message || "알 수 없는 오류"}\n(네트워크 문제일 수 있습니다)`);
        } finally {
            textarea.disabled = false;
        }
    },

    async processPDF(file) {
        const textarea = document.getElementById('bulk-text');
        textarea.value = "PDF 텍스트 추출 중...";
        textarea.disabled = true;

        try {
            const text = await this.extractTextFromPDF(file);
            textarea.value = text;
            UI.modal.alert("텍스트 추출이 완료되었습니다.");
        } catch (e) {
            console.error(e);
            textarea.value = "";
            UI.modal.alert("PDF 텍스트 추출에 실패했습니다.");
        } finally {
            textarea.disabled = false;
        }
    },

    async extractTextFromPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Advanced text extraction based on coordinates
            const items = textContent.items;
            let pageText = "";
            let lastY = -1;
            let lastX = -1;

            for (const item of items) {
                const str = item.str;
                const transform = item.transform; // [scaleX, skewY, skewX, scaleY, x, y]
                const x = transform[4];
                const y = transform[5];

                // Check for new line (significant Y difference)
                // Y coordinates in PDF usually grow upwards, but here we just check diff
                if (lastY !== -1 && Math.abs(y - lastY) > 5) { // 5 is a threshold, font height dependent usually
                    pageText += "\n";
                } else if (lastX !== -1 && x > lastX + 5) {
                    // Add space if X gap is significant (indicating word break)
                    // This is heuristic. Sometimes symbols are close.
                    // For math, we might NOT want spaces? 
                    // But generally text needs spaces.
                    pageText += " ";
                }
                // else: consecutive chars, no space

                pageText += str;
                lastY = y;
                lastX = x + item.width; // Approximation of end X
            }

            // cleanup common PDF math symbol issues
            // Example: "℃" might be split, or special spaces
            pageText = pageText.replace(/ \./g, '.'); // Fix dangling dots

            fullText += pageText + "\n\n";
        }

        // Auto-extract metadata
        this.extractMetadata(fullText);

        return fullText;
    },

    extractMetadata(text) {
        // 1. Extract Year/Round
        // Patterns: "2024년 3회", "2023년 제1회", "2022년 4월 24일"
        const yearRoundMatch = text.match(/20\d{2}년\s*(제?\d+회|\d+월)/);
        if (yearRoundMatch) {
            document.getElementById('upload-year-round').value = yearRoundMatch[0];
        }

        // 2. Extract Subject
        // Patterns: "제1과목: 공기조화", "1과목 공기조화설비"
        // This is tricky as there are multiple subjects in one file usually. 
        // For now, let's grab the first one we see or just leave it blank if ambiguous.
        // Actually, if we are parsing a file, it might contain multiple subjects.
        // But the input field is single. Let's try to find the first "Subject" header.
        const subjectMatch = text.match(/(제?\d+과목)[:\s]+([^\n\r]+)/);
        if (subjectMatch) {
            document.getElementById('upload-subject').value = subjectMatch[2].trim();
        }
    },

    parseText() {
        const text = document.getElementById('bulk-text').value;
        let currentSubject = document.getElementById('upload-subject').value.trim();
        const yearRound = document.getElementById('upload-year-round').value.trim();

        if (!text) {
            UI.modal.alert("텍스트를 입력해주세요.");
            return;
        }

        // 1. Pre-processing: Standardize input
        let processedText = text
            .replace(/[￦₩]/g, '\\') // Fix Korean Won symbol to backslash for LaTeX compatibility
            .replace(/(\[(문제|보기|답|정답|해설|풀이)\])/g, '\n$1'); // Ensure tags are on new lines

        const cleanLines = processedText.split('\n').map(line => {
            return line.trim();
        }).filter(line => line.length > 0);

        const parsedResults = [];

        let currentProblem = null;
        let state = 'NONE'; // NONE, QUESTION, EXPLANATION

        // Regex definitions
        const subjectRegex = /^(제?\d+과목)[:\s]+(.+)/;
        // Matches "[문제] 1. text" or just "1. text" (fallback) or "[문제] text"
        const questionTagRegex = /^\[문제\]\s*(\d+)?\.?\s*(.*)/;

        // Matches "[보기] ① ... ② ..." or just "① ..."
        const choiceTagRegex = /^\[보기\]\s*(.*)/;

        // Matches "[답] 4" or "[정답] ④"
        const answerTagRegex = /^\[(답|정답)\]\s*(\d+|[①②③④])/;

        // Matches "[해설] ..."
        const explanationTagRegex = /^\[(해설|풀이)\]\s*(.*)/;

        const saveCurrentProblem = () => {
            if (currentProblem) {
                // If answer is missing, default to 0
                if (!currentProblem.answer) currentProblem.answer = 0;

                parsedResults.push(currentProblem);
                currentProblem = null;
            }
        };

        for (let i = 0; i < cleanLines.length; i++) {
            const line = cleanLines[i];

            // 1. Check for Subject Change (e.g. "제1과목: ...")
            const subjMatch = line.match(subjectRegex);
            if (subjMatch) {
                saveCurrentProblem();
                currentSubject = subjMatch[2].trim();
                document.getElementById('upload-subject').value = currentSubject;
                state = 'NONE';
                continue;
            }

            // 2. Check for Question Start
            // Case A: Tag [문제]
            const qTagMatch = line.match(questionTagRegex);
            if (qTagMatch) {
                saveCurrentProblem();

                let qText = qTagMatch[2] || '';
                // If text starts with number like "1. ", remove it if needed, or keep it.
                // User input: "[문제] 1. ..." -> qTagMatch[2] is "1. ..."

                currentProblem = {
                    problemId: 'new-' + Date.now() + Math.random().toString(36).substr(2, 5),
                    workbookTitle: yearRound || '미분류 회차',
                    subject: currentSubject || '미분류 과목',
                    question: qText,
                    choices: [],
                    answer: 0,
                    explanation: '',
                    creatorId: 'user-upload'
                };

                state = 'QUESTION';
                continue;
            }

            // Case B: No tag, just starts with digit (Legacy support)
            // Only if we are not inside a known block that consumes digits differently (like explanation potentially? no usually exps are text)
            // But be careful not to match "1. " inside explanation.
            // Strict check: if line starts with "\d+." and we are NOT in QUESTION/CHOICE state, OR we assume new question start?
            // Safer to rely on tags if possible. 
            // Only use fallback if currentProblem is null or we are in NONE state.
            if ((!currentProblem || state === 'NONE') && /^\d+\./.test(line)) {
                saveCurrentProblem();
                const qText = line.replace(/^\d+\.\s*/, '');
                currentProblem = {
                    problemId: 'new-' + Date.now() + Math.random().toString(36).substr(2, 5),
                    workbookTitle: yearRound || '미분류 회차',
                    subject: currentSubject || '미분류 과목',
                    question: qText,
                    choices: [],
                    answer: 0,
                    explanation: '',
                    creatorId: 'user-upload'
                };
                state = 'QUESTION';
                continue;
            }

            // 3. Parsing while inside a problem
            if (!currentProblem) continue;

            // Check for Choices Tag [보기]
            const choiceTagMatch = line.match(choiceTagRegex);
            if (choiceTagMatch) {
                state = 'CHOICES';
                const content = choiceTagMatch[1];
                // Parse inline choices: ① A ② B ③ C ④ D
                // Use a regex to split but keep delimiters, then reconstruct.
                // Simple approach: split by circle numbers.

                // Note: content might be empty if [보기] is on one line and choices on next.
                if (content.trim().length > 0) {
                    const splitRegex = /([①②③④])/;
                    const parts = content.split(splitRegex);
                    // parts: ["", "①", " text ", "②", " text "...]

                    let currentIdx = -1;
                    for (let p of parts) {
                        if (p === '①') currentIdx = 0;
                        else if (p === '②') currentIdx = 1;
                        else if (p === '③') currentIdx = 2;
                        else if (p === '④') currentIdx = 3;
                        else if (currentIdx !== -1 && p.trim().length > 0) {
                            currentProblem.choices[currentIdx] = p.trim();
                        }
                    }
                }
                continue;
            }

            // Check for Answer Tag [답]
            const ansMatch = line.match(answerTagRegex);
            if (ansMatch) {
                const ansStr = ansMatch[2];
                if (['1', '①'].includes(ansStr)) currentProblem.answer = 1;
                else if (['2', '②'].includes(ansStr)) currentProblem.answer = 2;
                else if (['3', '③'].includes(ansStr)) currentProblem.answer = 3;
                else if (['4', '④'].includes(ansStr)) currentProblem.answer = 4;
                state = 'NONE';
                continue;
            }

            // Check for Explanation Tag [해설]
            const expMatch = line.match(explanationTagRegex);
            if (expMatch) {
                currentProblem.explanation = expMatch[2];
                state = 'EXPLANATION';
                continue;
            }

            // 4. Continued Text (Multi-line parsing)
            if (state === 'QUESTION') {
                currentProblem.question += ' ' + line;
            } else if (state === 'EXPLANATION') {
                currentProblem.explanation += ' ' + line;
            } else if (state === 'CHOICES') {
                // Check if line starts with circle number
                const circleMatch = line.match(/^([①②③④])\s*(.*)/);
                if (circleMatch) {
                    const idxStr = circleMatch[1];
                    const val = circleMatch[2];
                    let idx = -1;
                    if (idxStr === '①') idx = 0;
                    else if (idxStr === '②') idx = 1;
                    else if (idxStr === '③') idx = 2;
                    else if (idxStr === '④') idx = 3;

                    if (idx !== -1) currentProblem.choices[idx] = val;
                } else {
                    // Probably continuation of the last choice
                    // But which one? Assume the last one added.
                    // Or separate logic if it's inline.
                    // For now, if we have choices, append to the last one.
                    let lastIdx = currentProblem.choices.length - 1;
                    if (lastIdx >= 0) {
                        currentProblem.choices[lastIdx] += ' ' + line;
                    }
                }
            }
        }

        // Save last
        saveCurrentProblem();

        if (parsedResults.length === 0) {
            UI.modal.alert("파싱된 문제가 없습니다.\n1. 문제 형식이 올바른지 확인해주세요.");
        }

        this.parsedData = parsedResults;
        this.renderPreview();
    },

    // Old parseBlock is no longer needed but kept as empty or helper if needed. 
    // We removed it from the loop. We can delete it or leave a stub.
    parseBlock() { return null; },

    renderPreview() {
        const previewArea = document.getElementById('preview-area');
        const parsedCount = document.getElementById('parsed-count');
        const parsedList = document.getElementById('parsed-list');

        parsedCount.textContent = this.parsedData.length;
        previewArea.classList.remove('hidden');
        parsedList.innerHTML = '';

        this.parsedData.forEach((p, idx) => {
            const el = document.createElement('div');
            el.className = 'card';
            el.style.border = '1px solid var(--border-color)';

            // Generate IDs
            const qId = `q-${idx}`;
            const imgId = `img-${idx}`;
            const ansId = `ans-${idx}`;
            const expId = `exp-${idx}`;

            // Image Preview HTML
            let imagePreviewHtml = '';
            if (p.image) {
                imagePreviewHtml = `<div style="margin:10px 0;"><img src="${p.image}" style="max-width:100%; max-height:200px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
                <button class="btn" style="font-size:0.7rem; padding:2px 5px;" onclick="BulkUpload.removeImage(${idx})">이미지 삭제</button></div>`;
            }

            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-size:0.8rem; color:var(--text-secondary);">No.${idx + 1} | ${p.workbookTitle} | ${p.subject}</span>
                    <button class="btn" style="padding:2px 5px; font-size:0.7rem; background:#fee2e2; color:red;" onclick="BulkUpload.remove(${idx})">삭제</button>
                </div>

                <!-- Question -->
                <div class="form-group">
                    <label style="font-size:0.8rem; color:var(--text-secondary);">문제 지문</label>
                    <textarea id="${qId}" class="input-field" style="width:100%; min-height:60px; font-weight:bold;" onchange="BulkUpload.updateField(${idx}, 'question', this.value)">${p.question}</textarea>
                </div>

                <!-- Image Attachment -->
                <div class="form-group" style="background:#f9fafb; padding:10px; border-radius:var(--radius-sm);">
                    <label style="font-size:0.8rem; color:var(--text-secondary); display:block; margin-bottom:5px;">이미지 첨부 (문제와 보기 사이)</label>
                    ${imagePreviewHtml}
                    <input type="file" onchange="BulkUpload.handleImageUpload(${idx}, this)" accept="image/*">
                </div>

                <!-- Choices -->
                <div class="form-group">
                    <label style="font-size:0.8rem; color:var(--text-secondary);">보기</label>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                        ${p.choices.map((c, i) => `
                            <div style="display:flex; align-items:center;">
                                <span style="font-size:0.8rem; margin-right:5px; width:15px;">${i + 1}.</span>
                                <input type="text" class="input-field" value="${c}" style="width:100%; padding:5px;" onchange="BulkUpload.updateChoice(${idx}, ${i}, this.value)">
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 100px 1fr; gap:10px;">
                    <!-- Answer -->
                    <div class="form-group">
                        <label style="font-size:0.8rem; color:var(--text-secondary);">정답</label>
                        <select id="${ansId}" class="input-field" style="width:100%;" onchange="BulkUpload.updateField(${idx}, 'answer', parseInt(this.value))">
                            <option value="1" ${p.answer === 1 ? 'selected' : ''}>1</option>
                            <option value="2" ${p.answer === 2 ? 'selected' : ''}>2</option>
                            <option value="3" ${p.answer === 3 ? 'selected' : ''}>3</option>
                            <option value="4" ${p.answer === 4 ? 'selected' : ''}>4</option>
                        </select>
                    </div>
                    
                    <!-- Explanation -->
                    <div class="form-group">
                        <label style="font-size:0.8rem; color:var(--text-secondary);">해설</label>
                        <textarea id="${expId}" class="input-field" style="width:100%; min-height:40px;" onchange="BulkUpload.updateField(${idx}, 'explanation', this.value)">${p.explanation || ''}</textarea>
                    </div>
                </div>
            `;
            parsedList.appendChild(el);
        });

        // Trigger Math Rendering in Preview
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(document.getElementById('parsed-list'), {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ]
            });
        }
    },

    updateField(index, field, value) {
        this.parsedData[index][field] = value;
    },

    updateChoice(index, choiceIdx, value) {
        this.parsedData[index].choices[choiceIdx] = value;
    },

    handleImageUpload(index, input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                this.parsedData[index].image = e.target.result; // Base64
                this.renderPreview(); // Re-render to show preview
            };
            reader.readAsDataURL(file);
        }
    },

    removeImage(index) {
        delete this.parsedData[index].image;
        this.renderPreview();
    },

    remove(index) {
        if (confirm("이 문제를 삭제하시겠습니까?")) {
            this.parsedData.splice(index, 1);
            this.renderPreview();
        }
    },

    async saveAll() {
        if (this.parsedData.length === 0) return;

        const confirmed = await UI.modal.confirm(`${this.parsedData.length}문제를 데이터베이스에 저장하시겠습니까?`);
        if (!confirmed) return;

        // Use API to save (triggers persistence)
        api.run('uploadProblems', this.parsedData).then(() => {
            UI.modal.alert("저장이 완료되었습니다!");
            this.parsedData = []; // Clear
            document.getElementById('bulk-text').value = '';
            document.getElementById('preview-area').classList.add('hidden');
        }).catch(err => {
            console.error(err);
            UI.modal.alert("저장 중 오류가 발생했습니다.");
        });
    }
};
