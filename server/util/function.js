'use strict';

let functions = function() {

};

functions.prototype.isEmpty = function(str){
    return str === null || str === undefined || str === '' || (typeof str === 'object' && Array.isArray(str) === false && Object.keys(str).length === 0);
};

functions.prototype.isNull = function(data,replace){
    return data === undefined ? replace : data;
};

functions.prototype.getTodayformatDate = function(){
    const ddate = new Date();
    let month = '' + (ddate.getMonth() + 1);
    let day = '' + ddate.getDate();
    const year = ddate.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
};
functions.prototype.strip_tags = function(){
    return str.replace(/(<([^>]+)>)/ig,"");
}

functions.prototype.autoScroll = async function(page){
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight - window.innerHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

functions.prototype.checkHospitalId = function(pageCode, req, res,next) {

    const HOSPITAL_ID = req.body.hid;
    if ( this.isEmpty(HOSPITAL_ID) ) { 
        console.log("병원코드를 입력해주세요1111!");
        return {
            code : 200,
            success: false,
            message: "병원코드를 입력해주세요!"
        };
    }

    if ( HOSPITAL_ID !== pageCode ) { 
        return {
            code : 200,
            success: false,
            message: "잘못된 병원코드입니다. 정확한 코드를 입력해주세요!"
        };
    }
    return {
        code : 200,
        success: true,
    };;
    
}


functions.prototype.checkLocalPassWord = function(pageCode, req, res,next) {

    const PASSWORD_KEY = req.body.passwd;
    if ( this.isEmpty(PASSWORD_KEY) ) {
        return {
            code : 200,
            success: false,
            message: "비밀번호를 입력해주세요!"
        };
    }

    if ( PASSWORD_KEY !== pageCode ) { 
        return {
            code : 200,
            success: false,
            message: "잘못된 값입니다. 너 누구야?!!"
        };
    }
    return {
        code : 200,
        success: true,
    }
    
}

functions.prototype.myBatisResult =  function( DBError, RS ) {
    if (DBError) {
        console.log(`error on ${query} DBError return: ${JSON.stringify(DBError)}`);
        return {
            code : 200,
            success: true,
            message: `error : ${DBError}`
        }
    }else{
        return {
            code : 200,
            success: true,
            totalCount :  RS.length ? RS.length : 0,
            data: RS
        }
    }
}

functions.prototype.formatPublishDate = function(input) {
    if ( this.isEmpty(input) ) {
        return null;
    }

    // 정규식으로 연도, 월, 일을 추출 (YYYY, YYYY.MM, YYYY.M, YYYY.MM.DD)
    const match = input.match(/^(\d{4})(?:\.(\d{1,2}))?(?:\.(\d{1,2}))?$/);
    
    if (!match) {
        return null;
        console.error('올바른 형식이 아닙니다. 예: 2025.01, 2024.11 또는 2025.01.01')
    }
    
    let year = match[1];
    let month = match[2] ? match[2].padStart(2, '0') : '01'; // 월이 없으면 01 기본값
    let day = match[3] ? match[3].padStart(2, '0') : '01'; // 일이 없으면 01 기본값
    
    return `${year}.${month}.${day}`;
}

module.exports = new functions();