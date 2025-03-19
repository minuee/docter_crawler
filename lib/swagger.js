const swaggerUi = require('swagger-ui-express');
const swaggereJsdoc = require('swagger-jsdoc');

const options = {
    swaggerDefinition: {
        info: {
            title: 'Korea Medicare Crawler API',
            version: '0.0.1',
            description: 'Korea Medicare Crawler API with express By 노성남',
        },
        servers: [
            {
                url: 'http://localhost:1100',
                description: 'Local Development'
            }
        ],
        securityDefinitions: {
	        jwt: {
	            type: 'apiKey',
        	    in: 'header',
	            name: 'access_token',
	        }
	    },
        security: [
            { jwt: [] }
        ]
    },
    apis: [
        `${global.appRoot}/services/*/route.js`
    ]
};

const specs = swaggereJsdoc(options);


const checkApiKey = function (req, res, next) {
    console.log('check 1' + req)
    
    const key = req.headers.api_key; 
    const api_key = crypto.hashing(key); // api_key = akfafjalfjasdkfjaslkdjflja(암호문)
    if (api_key && api_key === jwt.secret) { // jwt.secret = akfafjalfjasdkfjaslkdjflja(암호문)
        next();
    } else {
        res.sendStatus(401);
    }
}

module.exports = {
    swaggerUi,
    specs
};