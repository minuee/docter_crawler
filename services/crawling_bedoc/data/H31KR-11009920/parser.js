
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  const doctorName = process.argv[3];

  if (!url || !doctorName) {
    console.error('Please provide a URL and a doctor name as command-line arguments.');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const doctorData = await page.evaluate((name) => {
      const result = {
        "학력": [],
        "경력": [],
        "학술": [],
      };

      // 모든 블록을 가져옵니다.
      const blocks = Array.from(document.querySelectorAll('.fe-block'));

      // 의사 이름이 포함된 블록의 인덱스를 찾습니다.
      let doctorNameBlockIndex = -1;
      blocks.forEach((block, index) => {
        const h2 = block.querySelector('h2');
        if (h2 && h2.textContent.trim().includes(name)) {
          doctorNameBlockIndex = index;
        }
      });

      if (doctorNameBlockIndex === -1) {
        return null; // Doctor not found
      }

      // 이름 블록 다음부터 순회하며 정보 추출
      for (let i = doctorNameBlockIndex + 1; i < blocks.length; i++) {
        const currentBlock = blocks[i];
        const h3 = currentBlock.querySelector('h3');
        if (!h3) continue;

        const sectionTitle = h3.textContent.trim();
        const items = Array.from(currentBlock.querySelectorAll('p')).map(p => p.textContent.trim());

        if (sectionTitle.includes('학력')) {
            result["학력"] = items.map(item => ({ content: item }));
        } else if (sectionTitle.includes('경력')) {
            result["경력"] = items.map(item => ({ content: item }));
        } else if (sectionTitle.includes('학회활동')) {
            result["학술"] = items.map(item => ({ content: item }));
        } else {
            // 다른 의사 이름이 나오면 중단
            const nextDoctorH2 = currentBlock.querySelector('h2');
            if(nextDoctorH2) break;
        }
      }

      return result;
    }, doctorName);

    if (doctorData) {
      console.log(JSON.stringify(doctorData, null, 2));
    } else {
      console.error(`Could not find doctor: ${doctorName}`);
      process.exit(1);
    }

  } catch (error) {
    console.error(`Error during parsing: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
