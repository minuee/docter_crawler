module.exports = {
  apps: [{
    name: 'BE.Crawling',
    script: './api.worker.js',
    instances: 1,
    exec_mode: 'cluster',
    max_memory_restart : "500M",
    wait_ready: true,
    listen_timeout: 6000,
    kill_timeout: 4800,
    autorestart: true,
    watch: true,
    ignore_watch: ['node_modules','temp_upload_files','public','logs', 'uploads/gpx', 'uploads/excel', 'uploads/factory', 'uploads/temp'],
    watch_options: {
      followSymlinks: false
    },
    env: {
      COMMON_VARIABLE: 'true',
      NODE_ENV: "development",
    },
    env_local: {
      COMMON_VARIABLE: 'true',
      NODE_ENV: "development",
      THIS_SERVER_PORT: 1100,
      THIS_SERVER_JWT_SECRET_KEY: "~@#a$vz^!%18",
      // MYSQL_HOST: "aiga-dev.cwa3afxsno1l.ap-northeast-2.rds.amazonaws.com",
      // MYSQL_USER: "becrawling",
      // MYSQL_PASSWORD: "1918",
      // MYSQL_DATABASE: "aiga",
      MYSQL_HOST: "localhost",
      MYSQL_USER: "tony",
      MYSQL_PASSWORD: "3339",
      MYSQL_DATABASE: "doctoratlas",
      MYSQL_PORT: 3306,
    },
  }]
}
