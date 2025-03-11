// export
const config = {
  thisServer: {
    endPointUrl: process.env.THIS_ENDPOINT_URL || 'localhost',
    port: process.env.THIS_SERVER_PORT || 1100,
    jwtSecret: process.env.THIS_SERVER_JWT_SECRET_KEY || 'HIDDEN',
    jwtOption : {
      algorithm : 'HS256'
    },
    localEncryptKey: '-HIDDEN-',
    localEncryptType: 'aes-128-cbc',
    contentsLimit : '10mb',
    apiVersion: 0.1,
  },
  database: {
    mysql: {
      host: process.env.MYSQL_HOST || 'localhost'
      ,port: process.env.MYSQL_PORT || '3306'
      ,database: process.env.MYSQL_DATABASE || 'aiga'
      ,user: process.env.MYSQL_USER || 'root'
      ,password: process.env.MYSQL_PASSWORD || '1234'
      ,charset: 'utf8mb4'
      ,multipleStatements: false
      ,waitForConnections: true
      //,connectionLimit: 16
      ,queueLimit: 0
      ,typeCast: function (field, next) {
        if (field.type == 'VAR_STRING') {
            return field.string();
        }
        return next();
      },
    },
    cassandra: {
      contactPoints: process.env.CASSANDRA_CONTACT_POINT || ''
      ,keyspace: process.env.CASSANDRA_KEYSPACE || ''
      ,user: process.env.CASSANDRA_USER || ''
      ,password: process.env.CASSANDRA_PASSWORD || ''
      ,dataCenter: process.env.CASSANDRA_DATA_CENTER || 'datacenter1'
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '-HIDDEN-'
    }
  },
  validationOption: {
      abortEarly: true,
      allowUnknown: false,
      stripUnknown: true
  },
  AWS: {
    region: process.env.AWS_S3_REGION || 'ap-northeast-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_SECRETKEY || '',
    bucket_uploaded_test: '',
  },
  limiterOption: {
    max: 150,
    windowMs: 60 * 60 * 1000,
    message: 'Too Many Request'
  },
  cspOption: {
    directives: {
      defaultSrc: ["'self'", "ws://localhost:1100"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      frameSrc: ["'self'"]
    }
  },
  caching: {
    etag: false
  },
}



module.exports = config;