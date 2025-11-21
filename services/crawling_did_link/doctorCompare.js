const stringSimilarity = require('string-similarity');

// 데이터 정규화 함수 (사용자 제안 기반)
function normalize(entry) {
  if (!entry) return "";
  // 연도 형식 통일 (예: 20082015 -> 2008-2015)
  entry = entry.replace(/(\d{4})(\d{4})/, '$1-$2');
  // 소문자 변환 및 공백 정리
  return entry.toLowerCase().replace(/\s+/g, ' ').trim();
}

// info 필드에서 JSON 구조를 파싱하여 실제 텍스트 "항목 배열"을 추출
function extractInfoEntries(infoStr) {
  if (!infoStr) return []; // Return empty array
  try {
    const parsed = JSON.parse(infoStr);
    if (Array.isArray(parsed)) {
      return parsed.map(item => item.text || "");
    }
  } catch (e) {
    // If not JSON, assume it's plain text and split by new line
    return infoStr.split('\n');
  }
  return [infoStr]; // Fallback for single string
}

// info 필드에서 과거 근무 병원 및 진료과 정보를 추출하는 헬퍼 함수
function extractPastEmployment(infoStr) {
  const pastEmployments = [];
  const entries = extractInfoEntries(infoStr);

  const hospitalKeywords = ['병원', '의원', '클리닉', '센터', '의료원', '대학']; // '대학' 추가
  const deptKeywords = ['과', '진료과', '클리닉']; // 진료과 키워드

  for (const entry of entries) {
    let hospitalName = '';
    let deptName = '';

    // 병원명 추출 시도 (가장 긴 매칭 우선)
    let bestHospitalMatch = { name: '', index: -1 };
    for (const keyword of hospitalKeywords) {
      const regex = new RegExp(`([^\\s]{2,})${keyword}`, 'g'); // 최소 2글자 이상 + 키워드
      let match;
      while ((match = regex.exec(entry)) !== null) {
        // 더 긴 매치 또는 더 앞선 매치를 선호
        if (match[1].length > bestHospitalMatch.name.length || (match[1].length === bestHospitalMatch.name.length && match.index < bestHospitalMatch.index)) {
          bestHospitalMatch = { name: match[1] + keyword, index: match.index };
        }
      }
    }
    if (bestHospitalMatch.name) {
      hospitalName = bestHospitalMatch.name.trim();
    }


    // 진료과 추출 시도 (가장 긴 매칭 우선)
    let bestDeptMatch = { name: '', index: -1 };
    for (const keyword of deptKeywords) {
      const regex = new RegExp(`([^\\s]{1,})${keyword}`, 'g'); // 최소 1글자 이상 + 키워드
      let match;
      while ((match = regex.exec(entry)) !== null) {
        if (match[1].length > bestDeptMatch.name.length || (match[1].length === bestDeptMatch.name.length && match.index < bestDeptMatch.index)) {
          bestDeptMatch = { name: match[1] + keyword, index: match.index };
        }
      }
    }
    if (bestDeptMatch.name) {
      deptName = bestDeptMatch.name.trim();
    }
    
    // "근무", "재직" 등의 키워드가 포함된 경우 과거 이력으로 간주
    const workKeywordMatch = /(근무|재직|역임|원장|부원장|과장|전문의|수련|연수|수료|졸업)/.test(entry);

    if (hospitalName || deptName || workKeywordMatch) {
      pastEmployments.push({
        hospitalname: hospitalName,
        deptname: deptName,
        entry: entry // 원본 항목도 함께 저장
      });
    }
  }
  return pastEmployments;
}

// 텍스트에서 날짜 범위 (예: 2008-2015, 2008~2015, 2008)를 추출하는 헬퍼 함수
function extractDateRanges(text) {
  const years = [];
  // YYYY-YYYY 또는 YYYY~YYYY 패턴
  const rangeRegex = /(\d{4})[~-](\d{4})/;
  let match;
  while ((match = rangeRegex.exec(text)) !== null) {
    years.push({ start: parseInt(match[1]), end: parseInt(match[2]) });
    text = text.substring(0, match.index) + text.substring(match.index + match[0].length); // Remove matched part
  }

  // YYYY 단일 연도 패턴
  const singleYearRegex = /\b(\d{4})\b/g;
  while ((match = singleYearRegex.exec(text)) !== null) {
    years.push({ start: parseInt(match[1]), end: parseInt(match[1]) });
  }
  return years;
}

// 집합 기반 유사도(Jaccard) 계산 (e.g., 진료 분야)
function setSimilarity(strA, strB) {
  if (!strA || !strB) return { similarity: 0, intersection: new Set() };
  const setA = new Set(strA.split(',').map(s => normalize(s)).filter(s => s));
  const setB = new Set(strB.split(',').map(s => normalize(s)).filter(s => s));

  if (setA.size === 0 || setB.size === 0) {
    return { similarity: 0, intersection: new Set() };
  }

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return { similarity: intersection.size / union.size, intersection };
}

// 학력/경력 항목들을 비교하여 유사도 계산 (사용자 제안 기반)
function compareHistory(infoA, infoB, threshold = 0.6) { // 기준값 0.7 -> 0.6으로 수정
  const rawEntriesA = extractInfoEntries(infoA);
  const rawEntriesB = extractInfoEntries(infoB);

  const entriesA = rawEntriesA.map(s => normalize(s)).filter(s => s);
  const entriesB = rawEntriesB.map(s => normalize(s)).filter(s => s);

  if (entriesA.length === 0 || entriesB.length === 0) {
    return { matchCount: 0, similarity: 0, matchedEntries: [], entriesA, entriesB };
  }

  let matchedBIndices = new Set();
  let matchCount = 0;
  let matchedEntries = [];

  // 기간이 겹치거나 선행하는지 확인하는 헬퍼 함수
  const checkDateOverlap = (datesA, datesB) => {
    if (datesA.length === 0 || datesB.length === 0) return false;

    for (const dARange of datesA) {
      for (const dBRange of datesB) {
        // A의 기간이 B의 기간보다 선행하거나 (B.start <= A.end)
        // A의 기간과 B의 기간이 겹치는지 (A.start <= B.end && A.end >= B.start)
        // 여기서는 A(summaryData)가 과거 이력이므로 dBRange의 end가 dARange의 start보다 커야 함.
        // 즉, 후보의 학력/경력 기간이 summaryData의 학력/경력 기간보다 선행하거나 겹치는 부분이 있어야 함.
        if (dBRange.end < dARange.start) { // 후보의 기간이 summaryData의 기간보다 완전히 선행
          return true;
        }
        if (dARange.start <= dBRange.end && dARange.end >= dBRange.start) { // 기간이 겹침
          return true;
        }
      }
    }
    return false;
  };

  for (let i = 0; i < rawEntriesA.length; i++) {
    const entryA = entriesA[i];
    const rawEntryA = rawEntriesA[i];
    const datesA = extractDateRanges(rawEntryA);

    let bestMatch = { score: 0, index: -1, matchedTextB: '', dateOverlap: false };

    for (let j = 0; j < rawEntriesB.length; j++) {
      if (matchedBIndices.has(j)) continue;

      const entryB = entriesB[j];
      const rawEntryB = rawEntriesB[j];
      const datesB = extractDateRanges(rawEntryB);

      const currentScore = stringSimilarity.compareTwoStrings(entryA, entryB);
      const hasDateOverlap = checkDateOverlap(datesA, datesB);

      // 내용 유사도가 높고, 기간 겹침/선행 조건도 만족하는 경우
      if (currentScore > bestMatch.score && hasDateOverlap) {
        bestMatch.score = currentScore;
        bestMatch.index = j;
        bestMatch.matchedTextB = rawEntryB;
        bestMatch.dateOverlap = true;
      }
    }

    if (bestMatch.score >= threshold && bestMatch.dateOverlap) {
      matchCount++;
      if (bestMatch.index !== -1) {
        matchedBIndices.add(bestMatch.index);
        matchedEntries.push({
          entryA: rawEntryA,
          entryB: bestMatch.matchedTextB,
          score: bestMatch.score,
          dateOverlap: bestMatch.dateOverlap
        });
      }
    }
  }

  // 유사도 계산은 매칭된 항목 수 / 둘 중 더 많은 항목 수
  const similarity = matchCount / Math.max(entriesA.length, entriesB.length);
  return { matchCount, similarity, matchedEntries, entriesA, entriesB };
}

function scoreBreakdown(d1, d2) {
  console.log('\n--- DEBUGGING scoreBreakdown V-FINAL ---');

  const nameMatch = normalize(d1.doctorname) === normalize(d2.doctorname);
  console.log(`1. nameMatch: ${nameMatch}`);

  const deptResult = setSimilarity(d1.deptname, d2.deptname);
  const deptSim = deptResult.similarity;
  console.log(`2. deptSim: ${deptSim}`);

  const specResult = setSimilarity(d1.specialties, d2.specialties);
  const specSim = specResult.similarity;
  console.log(`3. specSim: ${specSim}, Intersection size: ${specResult.intersection.size}`);

  console.log('\n--- Analyzing INFO field (using string-similarity) ---');
  const historyComparison = compareHistory(d1.info, d2.info);
  const infoSim = historyComparison.similarity;
  console.log(`4. infoSim (from compareHistory): ${infoSim}, Match count: ${historyComparison.matchCount}`);
  console.log('History Comparison Details:', JSON.stringify(historyComparison, null, 2));

  let score = 0;
  console.log(`Initial score: ${score}`);

  if (normalize(d1.hospitalname) === normalize(d2.hospitalname) && deptSim === 1) {
    score = 5;
    console.log('Special Rule Applied: hospital & dept match. Score set to 5.');
  } else {
    if (nameMatch) {
      score += 1;
      console.log(`+1 for nameMatch. Current score: ${score}`);
    }
    const deptSimPercent = Math.round(deptSim * 100);
    if (deptSimPercent > 60) {
      score += 1;
      console.log(`+1 for deptSim > 60% (${deptSimPercent}%). Current score: ${score}`);
    }

    console.log('\nScoring Specialties...');
    if (!d1.specialties || normalize(d1.specialties) === '') {
        score += 1;
        console.log('+1 because target specialties is empty.');
    } else {
        const specSimPercent = Math.round(specSim * 100);
        console.log(`specSimPercent: ${specSimPercent}%`);
        if (specSimPercent >= 50) {
            score += 1.5;
            console.log(`+1.5 for specSim >= 50%. Current score: ${score}`);
        } else if (specSimPercent >= 20) {
            score += 1;
            console.log(`+1 for specSim >= 20%. Current score: ${score}`);
        } else {
            console.log('Tiered specSim score is 0. Checking fallback...');
            if (specResult.intersection.size > 0) {
                score += 1;
                console.log(`+1 from fallback (intersection size > 0). Current score: ${score}`);
            }
        }
    }

    console.log('\nScoring Info...');
    if (!d1.info || normalize(d1.info) === '') {
        score += 1;
        console.log('+1 because target info is empty.');
    } else {
        const infoSimPercent = Math.round(infoSim * 100);
        console.log(`infoSimPercent: ${infoSimPercent}%`);
        if (infoSimPercent >= 50) {
            score += 1.5;
            console.log(`+1.5 for infoSim >= 50%. Current score: ${score}`);
        } else if (infoSimPercent >= 20) {
            score += 1;
            console.log(`+1 for infoSim >= 20%. Current score: ${score}`);
        } else {
            console.log('Tiered infoSim score is 0. Checking fallback...');
            if (historyComparison.matchCount > 0) {
                score += 1;
                console.log(`+1 from fallback (matchCount > 0). Current score: ${score}`);
            }
        }
    }
  }
  console.log(`\nFINAL SCORE: ${score}`);
  console.log('--- END DEBUGGING ---\n');

  return {
    score,
    maxScore: 5,
    breakdown: {
      nameMatch,
      deptSim: Number(deptSim.toFixed(3)),
      infoSim: Number(infoSim.toFixed(3)),
      specSim: Number(specSim.toFixed(3)),
      historyComparison,
    },
  };
}

async function findMatchingDoctor(summaryData, summaryData2Array) {
  if (!Array.isArray(summaryData2Array) || summaryData2Array.length === 0) {
    return { result: "not match", matchDoctor: null, score: null };
  }

  // 0단계: 동일 병원(hospitalname, hid) 최우선 매칭
  for (const candidate of summaryData2Array) {
    if (normalize(summaryData.hospitalname) === normalize(candidate.hospitalname) &&
        normalize(summaryData.hid) === normalize(candidate.hid)) {
      console.log(`\n결과: match (0단계: 동일 병원/HID 매칭) -> ${candidate?.hospitalname}:${candidate?.doctorname}`);
      return { result: "match", matchDoctor: candidate, score: 5, debug: { step: 0, reason: "Exact hospital and HID match" } };
    }
  }

  // 1단계: 진료과(deptname) 필터링
  let candidatesStep1 = summaryData2Array.filter(candidate =>
    normalize(summaryData.deptname) === normalize(candidate.deptname)
  );

  if (candidatesStep1.length === 0) {
    console.log("\n결과: not match (1단계: 진료과 매칭 실패)");
    return { result: "not match", matchDoctor: null, score: null };
  }

  // 2단계: 진료분야(specialties) 유사도 필터링
  if (candidatesStep1.length > 1) { // 후보가 1명 이하면 필터링 불필요
    let maxSpecialtiesSimilarity = -1;
    const candidatesWithSimilarity = candidatesStep1.map(candidate => {
      const { similarity } = setSimilarity(summaryData.specialties, candidate.specialties);
      maxSpecialtiesSimilarity = Math.max(maxSpecialtiesSimilarity, similarity);
      return { candidate, similarity };
    });

    candidatesStep1 = candidatesWithSimilarity
      .filter(item => item.similarity === maxSpecialtiesSimilarity)
      .map(item => item.candidate);
  }

  if (candidatesStep1.length === 0) {
    console.log("\n결과: not match (2단계: 진료분야 유사도 필터링 실패)");
    return { result: "not match", matchDoctor: null, score: null };
  }

  // 3단계: 상세 정보(info) 내용 유사도 및 기간 일치 필터링
  let candidatesStep2 = candidatesStep1; // 2단계에서 넘어온 후보들

  let candidatesWithInfoMatch = [];
  for (const candidate of candidatesStep2) {
    const historyComparison = compareHistory(summaryData.info, candidate.info);
    if (historyComparison.matchCount > 0) { // 최소 1개 이상 일치
      candidatesWithInfoMatch.push({ candidate, historyComparison });
    }
  }

  if (candidatesWithInfoMatch.length === 0) {
    console.log("\n결과: not match (3단계: 상세 정보 매칭 실패)");
    return { result: "not match", matchDoctor: null, score: null };
  }

  let finalCandidatesStep3 = [];
  if (candidatesWithInfoMatch.length === 1) {
    finalCandidatesStep3 = [candidatesWithInfoMatch[0].candidate];
  } else {
    // 후보가 2명 이상이면, 가장 많은 학력/경력 항목이 겹치는 후보 선택
    candidatesWithInfoMatch.sort((a, b) => b.historyComparison.matchCount - a.historyComparison.matchCount);
    const maxMatchCount = candidatesWithInfoMatch[0].historyComparison.matchCount;
    finalCandidatesStep3 = candidatesWithInfoMatch
      .filter(item => item.historyComparison.matchCount === maxMatchCount)
      .map(item => item.candidate);

    // 만약 여전히 여러 명이라면, 첫 번째 후보를 선택 (기간 일치 판단은 현재 단순화)
    if (finalCandidatesStep3.length > 1) {
      console.log("3단계: 여러 후보가 남았지만, 기간 일치 판단이 복잡하여 첫 번째 후보를 선택합니다.");
      finalCandidatesStep3 = [finalCandidatesStep3[0]];
    }
  }

  if (finalCandidatesStep3.length === 0) {
    console.log("\n결과: not match (3단계: 최종 후보 선택 실패)");
    return { result: "not match", matchDoctor: null, score: null };
  }

  // 4단계: 최소 정보량 원칙 (최종 판별)
  const finalCandidate = finalCandidatesStep3[0]; // 3단계에서 선택된 잠정 후보

  const summaryDataInfoLength = summaryData.info ? summaryData.info.length : 0;
  const finalCandidateInfoLength = finalCandidate.info ? finalCandidate.info.length : 0;

  if (summaryDataInfoLength < 10 && finalCandidateInfoLength < 10) {
    console.log("\n결과: not match (4단계: 정보량 부족)");
    return { result: "not match", matchDoctor: null, score: null };
  }

  console.log(`\n결과: match (4단계 통과, 최종 확정) -> ${finalCandidate?.hospitalname}:${finalCandidate?.doctorname}`);
  return { result: "match", matchDoctor: finalCandidate, score: 4, debug: { step: 4, reason: "Final confirmation" } };
}


module.exports = {
  setSimilarity,
  compareHistory,
  extractInfoEntries,
  findMatchingDoctor,
};
