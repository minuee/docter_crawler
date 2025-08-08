

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