

# :cloud:  BE.Crawler
###### 병원 의사 정보 크롤러
###### version 20240513
#
#
기능들은 controller, route 구성되어 있다. api 엔드포인트는 각 폴더의 route 참조

#### Features
###### basic, biography information
- https://www.amc.seoul.kr
- https://snuh.org
- https://kbsmc.co.kr
- https://samsunghospital.com
- https://cmcseoul.or.kr
- https://sev.severance.healthcare
- https://www.data.go.kr


#### Tech (open Sources)

- [node.js]
- [express]
- [puppeteer]
- [axios]
- [cheerio]
- [mysql2]
- [xlsx]


#### Installation

requires [Node.js](https://nodejs.org/) v20.12+ to run.
Install the dependencies and devDependencies and start the server.

```sh
cd *application Installed folder*
npm install
node api.worker
```

> End Point: using postman for tseting.

```sh
127.0.0.1:1100
```

## License
Korea Medicare


# Read more about SSH config files: https://linux.die.net/man/5/ssh_config
Host PRMagnet
    HostName 13.209.158.207
    User ec2-user
    IdentityFile /Users/kormedi/Documents/WorkPlace/Docfile/pemkey/fpr-prod-cloud9.pem

Host Aiga-Web-dev
    HostName 115.165.71.58
    User ubuntu
    IdentityFile /Users/kormedi/Documents/WorkPlace/Docfile/pemkey/aiga2025.pem
    IdentitiesOnly no
    LogLevel DEBUG3
    ConnectTimeout 60

Host Dev-Aiga-Web
    HostName 115.165.71.58
    User ubuntu
    IdentityFile /Users/kormedi/.ssh/aiga2025.pem


 1. llm systemPrompt 간략화등의 input token 절약화
 2. llm( with api-server ) token 세부관리시스템 변경 
 3. llm( with api-server ) 논문 제외 처리 등 관련된 모든 작업
 4. llm history 저장매체 inmemory > file 구조로 변경
 5. llm cache System - Redis 도입 s
 6. llm Summary System(llm) 도입
 7. llm server 구동방식과 로그관리 변경
 8. llm sql-agent 보안관련작업 및 고도화
 9. api guest session_id 16시간에서 30일로 변경 구조변경
10. 그외 고도화 기능


hid           |baseName    |shortName   |address                  |lat       |lon        |telephone   |createAt           |updateAt|yoyang_giho                                                                     |
--------------+------------+------------+-------------------------+----------+-----------+------------+-------------------+--------+--------------------------------------------------------------------------------+
H11KR-31000059|차의과학대학교분당차병원|차의과학대학교분당차병원|경기도 성남시 분당구 야탑로 59, (야탑동)|37.4102384|127.1254535|031-780-5000|2025-08-19 17:52:50|        |JDQ4MTYyMiM1MSMkMSMkMCMkODkkMzgxMzUxIzExIyQxIyQzIyQ3MiQyNjEwMDIjNDEjJDEjJDgjJDgz|


공창배 - 완료
곽미선 - 완료
곽충환 - 완료
구경희 - 완료
구태본 - 완료
권겸일 - 완료
권기한 - 완료
권성원 - 완료
권오웅 - 완료
권창일 - 완료
권태찬 - 완료 - 이미지 
권혁상 - 완료
권혁찬 - 완료
권형민 - 완료
기경도 - 완료 - 이미지등 복합적임
김갑중 - 완료
김강성 - 완료
김강일 - 완료
김광기 - 완료
김광남 - 완료
김구상 - 완료
김권배 - 완료
김규보 - 완료
김균형 - 완료
김기봉 - 완료
김기철 - 완료 -이미지
김기택 - 완료
김기혁 - 완료
김기환 - 완료
김남규 - 완료
김남수 - 완료 
김달수 - 완료
김대근 - 완료
김대용 - 완료
김동욱 - 완료
김동호 - 완료
김동환 - 완료
김두일 - 완료
김리석 - 완료
김만수 - 완료
김명환 - 완료
김문영 - 완료
김문홍 - 완료
김미숙 - 완료
김민형 - 완료 - 이미지 
김병건 - 완료
김상범 - 완료
김상현 - 완료
김상현 - 완료
김석권 - 완료
김석화 - 완료
김선희 - 완료
김성용 - 완료
김성원 - 완료
김성윤 - 완료
김성재 - 완료
김성주 - 완료
김성철 - 완료
김성호 - 완료
김성훈 - 완료
김숙자 - 완료 - 이미지
김순현 - 완료
김승기 - 완료
김시열 - 완료
김신윤 - 완료
김암  - 완료
김영수 - 완료
김영옥 - 완료
김영우 - 완료
김영진 - 완료
김영호 - 완료 - 이미지
김영호 - 완료
김영후 - 완료
김용기 - 완료 - 이미지
김용복 - 완료
김용욱 - 완료
김용진 - 완료
김용찬 - 완료
김재범 - 완료
김재현 - 완료
김재홍 - 완료
김재화 - 완료
김정수 - 완료
김종우 - 완료
김주영 - 완료
김준혁 - 완료
김지수 - 완료
김지훈 - 완료
김진구 - 완료
김진섭 - 완료
김진수 - 완료
김진수 - 완료
김진수 - 완료
김진우 - 완료
김창근 - 완료
김천수 - 완료
김철 - 완료
김철홍 - 완료
김태현 - 완료
김태형 - 완료
김하경 - 완료
김하영 - 완료
김하용 - 완료
김현숙 - 완료
김현정 - 완료
김현철 - 완료
김현희 - 완료
김현희 - 완료
김형근 - 완료
김형년 - 완료
김형식 - 완료
김형진 - 완료
김혜옥 - 완료
김호연 - 완료 - 이미지
김호진 - 완료
김효철 - 완료 - 이미지 블로그
나경욱 - 완료
나성훈 - 완료
남기세 - 완료
남영수 - 완료
남재현 - 완료
노동영 - 완료
노시영 - 완료
노영수 - 완료
노우철 - 완료
동헌종 - 완료
류근원 - 완료
류성렬 - 완료
류승완 - 완료
류준선 - 완료
