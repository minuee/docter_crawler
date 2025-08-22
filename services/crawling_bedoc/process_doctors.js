
const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

const dataDir = path.join(__dirname, 'data');

// Add hospital-specific parsing logic here
const hospitalScrapers = {
    // 부산의료원
    'H11KR-21000005': ($) => {
        const doctorNameInPage = $('.doc_name').text().trim() || '';
        const departmentInPage = $('.doc_depart').text().trim() || '';
        const education = [];
        $('.doc_career ul').eq(0).find('li').each((i, el) => {
            education.push({ date: null, content: $(el).text().trim() });
        });
        const experience = [];
        $('.doc_career ul').eq(1).find('li').each((i, el) => {
            experience.push({ date: null, content: $(el).text().trim() });
        });
        return {
            doctorName: doctorNameInPage,
            department: departmentInPage,
            education,
            experience,
            specialty: '',
            thesis: []
        };
    },
    // 계명대학교 대구동산병원
    'H11KR-23000003': ($) => {
        const doctorNameInPage = $('.doc_info_wrap .doc_name strong').text().trim();
        const departmentInPage = $('.doc_info_wrap .doc_name span').text().trim();
        const specialty = [];
        $('.doc_info_wrap .doc_info_list li').eq(0).find('p').each((i, el) => {
            specialty.push($(el).text().trim());
        });
        const education = [];
        $('.doc_info_wrap .doc_info_list li').eq(1).find('p').each((i, el) => {
            education.push({ date: null, content: $(el).text().trim() });
        });
        const experience = [];
        $('.doc_info_wrap .doc_info_list li').eq(2).find('p').each((i, el) => {
            experience.push({ date: null, content: $(el).text().trim() });
        });
        return {
            doctorName: doctorNameInPage,
            department: departmentInPage,
            specialty: specialty.join(', '),
            education,
            experience,
            thesis: []
        };
    },
    // 강릉동인병원
    'H11KR-32000010': ($) => {
        const doctorNameInPage = $('.doctor_info .name').text().trim();
        const departmentInPage = $('.doctor_info .part').text().trim();
        const specialty = $('.doctor_info .field').text().replace('전문분야', '').trim();
        const education = [];
        $('.doctor_career li:contains("학력")').next('ul').find('li').each((i, el) => {
            education.push({ date: null, content: $(el).text().trim() });
        });
        const experience = [];
        $('.doctor_career li:contains("경력")').next('ul').find('li').each((i, el) => {
            experience.push({ date: null, content: $(el).text().trim() });
        });
        return {
            doctorName: doctorNameInPage,
            department: departmentInPage,
            specialty,
            education,
            experience,
            thesis: []
        };
    },
    // Default scraper if no specific one is found
    default: ($) => {
        console.log("[WARN] Using default scraper. Results may be limited.");
        const doctorName = $('h2.doct_name').text().trim() || $('.doctor_info .name').text().trim();
        const department = $('.doct_dept').text().trim() || $('.doctor_info .part').text().trim();
        const specialty = $('.part_field dd').text().trim();
        return {
            doctorName,
            department,
            specialty,
            education: [],
            experience: [],
            thesis: []
        };
    }
};


async function main() {
    try {
        const hospitalDirs = await fs.readdir(dataDir, { withFileTypes: true });

        for (const hospitalDir of hospitalDirs) {
            if (hospitalDir.isDirectory()) {
                const hospitalId = hospitalDir.name;
                const hospitalPath = path.join(dataDir, hospitalId);
                const files = await fs.readdir(hospitalPath);

                if (files.includes('scraper.js')) {
                    console.log(`[INFO] Skipping ${hospitalId} because scraper.js exists.`);
                    continue;
                }

                console.log(`[INFO] Processing ${hospitalId}...`);

                for (const file of files) {
                    if (file.endsWith('_profile.html')) {
                        const doctorNameFromFile = file.replace('_profile.html', '');
                        const profileHtmlPath = path.join(hospitalPath, file);
                        const outputJsonPath = path.join(hospitalPath, `${doctorNameFromFile}.json`);

                        try {
                            const htmlContent = await fs.readFile(profileHtmlPath, 'utf8');
                            const $ = cheerio.load(htmlContent);
                            const bodyText = $('body').text();

                            // Check for common "not found" messages
                            const notFoundMessages = [
                                "입력하신 정보와 일치하는 의료진이 없습니다",
                                "의료진소개 게시판이 존재하지 않습니다",
                                "찾으시는 검색어를 입력하세요",
                                "Bad Request"
                            ];

                            const isDoctorNotFound = notFoundMessages.some(msg => bodyText.includes(msg)) || !bodyText.includes(doctorNameFromFile);
                            
                            let department = '';
                            try {
                                const existingJsonContent = await fs.readFile(outputJsonPath, 'utf8');
                                const existingData = JSON.parse(existingJsonContent);
                                department = existingData.department || '';
                            } catch (e) {
                                // ignore if json does not exist
                            }


                            let scrapedData;

                            if (isDoctorNotFound) {
                                console.log(`[INFO] Doctor ${doctorNameFromFile} not found on page for ${hospitalId}.`);
                                scrapedData = {
                                    isExist: false,
                                    doctorName: doctorNameFromFile,
                                    department: department,
                                };
                            } else {
                                console.log(`[INFO] Doctor ${doctorNameFromFile} FOUND on page for ${hospitalId}. Scraping...`);
                                const scraper = hospitalScrapers[hospitalId] || hospitalScrapers.default;
                                const details = scraper($);
                                scrapedData = {
                                    isExist: true,
                                    doctorName: details.doctorName || doctorNameFromFile,
                                    department: details.department || department,
                                    profileUrl: '', // Placeholder
                                    specialty: details.specialty || '',
                                    education: details.education || [],
                                    experience: details.experience || [],
                                    thesis: details.thesis || [],
                                };
                            }

                            await fs.writeFile(outputJsonPath, JSON.stringify(scrapedData, null, 2), 'utf8');
                            console.log(`[SUCCESS] Wrote to ${outputJsonPath}`);

                        } catch (error) {
                            console.error(`[ERROR] Failed to process ${profileHtmlPath}:`, error);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("[FATAL] Error reading data directory:", err);
    }
}

main();
