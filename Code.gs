/**
 * Google Apps Script Server Side Code
 * 모의고사 문제집 앱 - 백엔드 API
 */

const SHEET_PROBLEMS = '문제DB';
const SHEET_RECORDS = '학습기록';
const SHEET_SETTINGS = '설정';

/**
 * Serves the HTML file for the web app or handles API calls.
 */
function doGet(e) {
  // API 호출 처리
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e);
  }
  
  // HTML 페이지 반환
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('모의고사 문제집 앱')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * API 요청 처리
 */
function handleApiRequest(e) {
  const action = e.parameter.action;
  const argsStr = e.parameter.args || '[]';
  let args = [];
  
  try {
    args = JSON.parse(decodeURIComponent(argsStr));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid args' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  let result;
  
  try {
    switch (action) {
      case 'getProblems':
        result = getProblems(args[0]);
        break;
      case 'uploadProblems':
        result = uploadProblems(args[0]);
        break;
      case 'updateProblem':
        result = updateProblem(args[0]);
        break;
      case 'deleteProblem':
        result = deleteProblem(args[0]);
        break;
      case 'deleteWorkbook':
        result = deleteWorkbook(args[0]);
        break;
      case 'updateWorkbookTitle':
        result = updateWorkbookTitle(args[0], args[1]);
        break;
      case 'saveRecord':
        result = saveRecord(args[0]);
        break;
      case 'getRecords':
        result = getRecords();
        break;
      case 'getUserSettings':
        result = getUserSettings();
        break;
      case 'saveUserSettings':
        result = saveUserSettings(args[0]);
        break;
      case 'getWorkbooks':
        result = getWorkbooks();
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Includes the content of a file.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/******************************************
 * 유틸리티 함수
 ******************************************/

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  
  // 시트가 없으면 생성
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initializeSheet(sheet, name);
  }
  
  return sheet;
}

function initializeSheet(sheet, name) {
  if (name === SHEET_PROBLEMS) {
    sheet.appendRow(['problemId', 'workbookTitle', 'subject', 'question', 'imageUrl', 
                     'choice1', 'choice2', 'choice3', 'choice4', 'answer', 'explanation']);
  } else if (name === SHEET_RECORDS) {
    sheet.appendRow(['recordId', 'date', 'workbookTitle', 'score', 'totalProblems', 
                     'correctCount', 'wrongAnswers', 'subjectAnalysis']);
  } else if (name === SHEET_SETTINGS) {
    sheet.appendRow(['key', 'value']);
    sheet.appendRow(['dDay', '2026-12-31']);
    sheet.appendRow(['userName', '수험생']);
  }
}

function generateId() {
  return 'id-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 9);
}

/******************************************
 * 문제 관련 API
 ******************************************/

/**
 * 문제 목록 조회
 */
function getProblems(workbookTitle) {
  const sheet = getSheet(SHEET_PROBLEMS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return []; // 헤더만 있는 경우
  
  const problems = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const problem = {
      problemId: row[0],
      workbookTitle: row[1],
      subject: row[2],
      question: row[3],
      imageUrl: row[4],
      choices: [row[5], row[6], row[7], row[8]],
      answer: parseInt(row[9]),
      explanation: row[10]
    };
    
    // 필터링
    if (!workbookTitle || problem.workbookTitle === workbookTitle) {
      problems.push(problem);
    }
  }
  
  return problems;
}

/**
 * 문제 일괄 업로드
 */
function uploadProblems(problems) {
  const sheet = getSheet(SHEET_PROBLEMS);
  
  const rows = problems.map(p => [
    p.problemId || generateId(),
    p.workbookTitle,
    p.subject,
    p.question,
    p.imageUrl || '',
    p.choices[0],
    p.choices[1],
    p.choices[2],
    p.choices[3],
    p.answer,
    p.explanation || ''
  ]);
  
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 11).setValues(rows);
  }
  
  return { success: true, count: rows.length };
}

/**
 * 문제 수정
 */
function updateProblem(data) {
  const sheet = getSheet(SHEET_PROBLEMS);
  const dataRange = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.id) {
      const rowNum = i + 1;
      sheet.getRange(rowNum, 2).setValue(data.workbookTitle || dataRange[i][1]); // workbookTitle
      sheet.getRange(rowNum, 3).setValue(data.subject);
      sheet.getRange(rowNum, 4).setValue(data.question);
      if (data.imageUrl !== undefined) {
        sheet.getRange(rowNum, 5).setValue(data.imageUrl);
      }
      sheet.getRange(rowNum, 6).setValue(data.choices[0]);
      sheet.getRange(rowNum, 7).setValue(data.choices[1]);
      sheet.getRange(rowNum, 8).setValue(data.choices[2]);
      sheet.getRange(rowNum, 9).setValue(data.choices[3]);
      sheet.getRange(rowNum, 10).setValue(data.answer);
      sheet.getRange(rowNum, 11).setValue(data.explanation || '');
      
      return { success: true };
    }
  }
  
  return { success: false, error: 'Problem not found' };
}

/**
 * 문제 삭제
 */
function deleteProblem(id) {
  const sheet = getSheet(SHEET_PROBLEMS);
  const dataRange = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { success: false, error: 'Problem not found' };
}

/**
 * 문제집 삭제 (해당 문제집의 모든 문제 삭제)
 */
function deleteWorkbook(title) {
  const sheet = getSheet(SHEET_PROBLEMS);
  const dataRange = sheet.getDataRange().getValues();
  let count = 0;
  
  // 역순으로 삭제 (행 번호 변경 방지)
  for (let i = dataRange.length - 1; i >= 1; i--) {
    if (dataRange[i][1] === title) {
      sheet.deleteRow(i + 1);
      count++;
    }
  }
  
  return { success: true, count: count };
}

/**
 * 문제집 제목 변경
 */
function updateWorkbookTitle(oldTitle, newTitle) {
  const sheet = getSheet(SHEET_PROBLEMS);
  const dataRange = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][1] === oldTitle) {
      sheet.getRange(i + 1, 2).setValue(newTitle);
    }
  }
  
  return { success: true };
}

/******************************************
 * 학습 기록 관련 API
 ******************************************/

/**
 * 학습 기록 저장
 */
function saveRecord(record) {
  const sheet = getSheet(SHEET_RECORDS);
  
  const row = [
    record.recordId || generateId(),
    record.date || new Date().toISOString(),
    record.workbookTitle,
    record.score,
    record.totalProblems,
    record.correctCount,
    JSON.stringify(record.wrongAnswers || []),
    JSON.stringify(record.subjectAnalysis || {})
  ];
  
  sheet.appendRow(row);
  
  return { success: true };
}

/**
 * 학습 기록 조회
 */
function getRecords() {
  const sheet = getSheet(SHEET_RECORDS);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const records = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    records.push({
      recordId: row[0],
      date: row[1],
      workbookTitle: row[2],
      score: row[3],
      totalProblems: row[4],
      correctCount: row[5],
      wrongAnswers: JSON.parse(row[6] || '[]'),
      subjectAnalysis: JSON.parse(row[7] || '{}')
    });
  }
  
  return records;
}

/******************************************
 * 사용자 설정 관련 API
 ******************************************/

/**
 * 설정 조회
 */
function getUserSettings() {
  const sheet = getSheet(SHEET_SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  
  return settings;
}

/**
 * 설정 저장
 */
function saveUserSettings(settings) {
  const sheet = getSheet(SHEET_SETTINGS);
  const data = sheet.getDataRange().getValues();
  
  for (const key in settings) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(settings[key]);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, settings[key]]);
    }
  }
  
  return { success: true };
}

/******************************************
 * 문제집 목록 조회
 ******************************************/

/**
 * 고유한 문제집 목록 조회
 */
function getWorkbooks() {
  const problems = getProblems();
  const workbookSet = new Set();
  
  problems.forEach(p => {
    if (p.workbookTitle) {
      workbookSet.add(p.workbookTitle);
    }
  });
  
  return Array.from(workbookSet);
}
