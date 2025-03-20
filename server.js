const http = require('http');
const app =  require("./app");
const config = require(`${global.appRoot}/server/config/configuration`);
const moment = require('moment-timezone');
const port = process.env.THIS_SERVER_PORT || 1100; 


const listeningServer = http.createServer(app)
listeningServer.listen(port, err => {
  if(err) throw err
  //process.env.NODE_ENV === 'development' ? console.log(process.env) : {}
  console.log(`> API Worker is running on : ${port} `);
  console.log(`> UTC : ${moment.utc(new Date().toISOString()).format()}`);
  console.log(`> KST : ${moment.utc(new Date().toISOString()).tz("Asia/Seoul").format()}`);
  console.log(`> Worker setting is ${process.env.NODE_ENV} Mode`);


  if (process.send) {
    process.send('ready')
    console.log('> sent ready for PM2')
  }
});

