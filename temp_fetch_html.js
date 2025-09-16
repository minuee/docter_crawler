const axios = require('axios');

(async () => {
    try {
        const response = await axios.get('http://www.maryknoll.co.kr/03_doctor/doctor_detail_new.php?d_idx=103', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log(response.data);
    } catch (error) {
        console.error(`Error fetching content: ${error.message}`);
    }
})();