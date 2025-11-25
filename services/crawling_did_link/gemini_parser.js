
const fs = require('fs');
const path = require('path');

class GeminiParser {
  constructor(filePath) {
    this.filePath = filePath;
    try {
      this.data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
      throw new Error(`Error reading or parsing file: ${filePath}`);
    }
  }

  analyze() {
    const { summaryData, summaryData2 } = this.data;

    // 0단계: 동일 병원(hospitalname, hid) 최우선 매칭
    const sameHospitalMatches = summaryData2.filter(candidate => 
      candidate.hid === summaryData.hid && candidate.hospitalname === summaryData.hospitalname
    );

    if (sameHospitalMatches.length === 1) {
      console.log('[Analysis] Step 0: Matched by same hospital.');
      return { result: 'match', match: sameHospitalMatches[0] };
    }
    
    // 1단계: 진료과(deptname) 필터링
    let candidates = summaryData2.filter(candidate => candidate.deptname === summaryData.deptname);
    if (candidates.length === 0) {
      console.log('[Analysis] Step 1: No candidates with the same department.');
      return { result: 'notmatch' };
    }
    console.log(`[Analysis] Step 1: ${candidates.length} candidates remaining after department filtering.`);

    // 2단계: 진료분야(specialties) 유사도 필터링
    const summarySpecialties = summaryData.specialties.split(',').map(s => s.trim());
    candidates = candidates.map(candidate => {
      const candidateSpecialties = candidate.specialties.split(',').map(s => s.trim());
      const score = summarySpecialties.filter(s => candidateSpecialties.includes(s)).length;
      return { ...candidate, score };
    });
    const maxScore = Math.max(...candidates.map(c => c.score));
    candidates = candidates.filter(c => c.score === maxScore);
    if (candidates.length === 0) {
      console.log('[Analysis] Step 2: No candidates remaining after specialties filtering.');
      return { result: 'notmatch' };
    }
    console.log(`[Analysis] Step 2: ${candidates.length} candidates remaining after specialties filtering.`);


    // 3단계: 과거 근무 이력 교차 확인 (합리적 의심)
    try {
      const summaryInfo = JSON.parse(summaryData.info);
      const pastWorkplaces = summaryInfo
        .filter(item => item.type === '경력' && item.text.includes('(전)'))
        .map(item => {
          // A naive way to extract hospital name from text like "서울대학교병원 (전)"
          const match = item.text.match(/(.+?)\s*\(전\)/);
          return match ? match[1].trim() : null;
        })
        .filter(name => name);
  
      let strongCandidates = candidates.filter(candidate => 
        pastWorkplaces.some(workplace => candidate.hospitalname.includes(workplace))
      );
  
      if (strongCandidates.length === 1) {
        candidates = strongCandidates;
        console.log('[Analysis] Step 3: Found one strong candidate based on past work history.');
      }
    } catch (e) {
      console.log('[Analysis] Step 3: Could not parse summaryData.info, skipping.');
    }
    

    // 3.1단계: 상세 정보(info) 내용 유사도 및 기간 일치 필터링
    // This is a complex step, for now we will assume the first candidate is the best.
    // A more sophisticated implementation would be needed here for a real-world scenario.
    if (candidates.length > 1) {
        console.log('[Analysis] Step 3.1: Multiple candidates remaining. Selecting the first one as a simplification.');
    }


    const finalCandidate = candidates[0];
    
    // 4단계: 최소 정보량 원칙 (최종 판별)
    if (summaryData.info.length < 10 && finalCandidate.info.length < 10) {
      console.log('[Analysis] Step 4: Not enough information in info fields.');
      return { result: 'notmatch' };
    }

    return { result: 'match', match: finalCandidate };
  }

  updateFile() {
    const analysisResult = this.analyze();

    if (analysisResult.result === 'match') {
      this.data.isResult = {
        result: 'match',
        userInfo: analysisResult.match
      };
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
      console.log(`[File Update] Updated with match: ${this.filePath}`);
    } else {
      const newPath = this.filePath.replace('.json', '_notmatch.json');
      fs.renameSync(this.filePath, newPath);
      console.log(`[File Update] Renamed to notmatch: ${newPath}`);
    }
  }
}

// This allows the script to be run from the command line
if (require.main === module) {
  if (process.argv.length < 3) {
    console.log("Usage: node gemini_parser.js <file_path>");
    process.exit(1);
  }
  const filePath = process.argv[2];
  try {
    const parser = new GeminiParser(filePath);
    parser.updateFile();
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
  }
}

module.exports = GeminiParser;
