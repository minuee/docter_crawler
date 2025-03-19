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


module.exports = new functions();