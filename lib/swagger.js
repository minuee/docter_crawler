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

module.exports = {
    swaggerUi,
    specs
};