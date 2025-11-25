

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



김강일 - 학력, 경력등 더보기 이후 데이터가 누락 ( 강동경희대학교병원 )
김동환 - 학력, 경력등 더보기 이후 데이터가 누락 ( 강동경희대학교병원 )
김상범 - 학력, 경력등 더보기 이후 데이터가 누락 ( 강동경희대학교병원 )
김용찬 - 학력, 경력등 더보기 이후 데이터가 누락 ( 강동경희대학교병원 )
문상웅 - 학력, 경력등 더보기 이후 데이터가 누락 ( 강동경희대학교병원 )
문화숙 - 학력, 경력 섞여 있음 그외 문제 없음, 수동으로 정리 ( 좋은문화병원 ) 
민병우 - 학력, 경력 섞여 있음 그외 문제 없음, 수동으로 정리 ( W병원 )


동해물과 백두산이 마르고 닳도록 하느님이 보우