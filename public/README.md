

# :cloud:  BE.Crawler
###### 병원 의사 정보 크롤러 이력관리
###### version 20250311 by noh.seongnam


#### Features
###### basic, biography information
- https://www.amc.seoul.kr
- https://snuh.org
- https://kbsmc.co.kr
- https://samsunghospital.com
- https://cmcseoul.or.kr
- https://sev.severance.healthcare
- https://www.data.go.kr


## 진행현황
1. 개발환경 Setup
 ㄴ 소스 다운 - bitbucket에서 zip Download후 별도 WorkSpace(Bitbucket에 repository 구성)
 ㄴ Node 20^환경으로 구축
 ㄴ Mysql 설치, Redis설치
 ㄴ 기본 라이브러리 추가 ( npm -g 글로벌 버전 ) pm2 , nodemon등
 
2. 데이터베이스 
 ㄴ 스키마 정도 덤프라일 입수
 ㄴ 실데이터 조회권한으로 디비 연결
 ㄴ 프로시저 소스 확인
 ㄴ 안내 문서등이 없어서 검토 결과 불필요한 테이블/프로시저도 있는 듯함 

3. 소스 분석
 ㄴ 기존 Node Express 분석
 ㄴ 구조 변경 add Swagger
 ㄴ Swagger 구성 작업
 ㄴ 도메인(병원)별 라우트 구성 분석
   1) 호출 순서
    step01 > step02 > step03 등의 순으로 API호출
    일부 병원추가정보? 논문 정보 조회
 ㄴ 안내 문서등이 없어서 검토 결과 불필요한 메소드등이 존재


## License
Korea Medicare


