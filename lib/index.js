'use strict';

const Caja = require('sanitizer');
const Hoek = require('hoek');
const Joi = require('joi');
const internals = {};

internals.whiteRegex = new RegExp(/^[\s\f\n\r\t\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff\x09\x0a\x0b\x0c\x0d\x20\xa0]+$/);

internals.noop = (obj) => {

    return obj;
};

internals.sanitize = (obj) => {

    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
        obj[keys[i]] = Caja.sanitize(obj[keys[i]]);
    }

    return obj;
};

internals.deleteEmpty = (obj) => {

    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
        if (obj[keys[i]] === '' || obj[keys[i]] === null) {
            delete obj[keys[i]];
        }
    }

    return obj;
};

internals.deleteWhitespace = (obj) => {

    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
        if (internals.whiteRegex.test(obj[keys[i]])) {
            delete obj[keys[i]];
        }
    }

    return obj;
};

internals.disinfect = (inputObj, options, firstPass, secondPass) => {

    let cleansed = inputObj;
    if (cleansed && Object.keys(cleansed).length) {

        if (options[firstPass]) {
            cleansed = internals.sanitize(cleansed);
        }
        cleansed = options.genericSanitizer(cleansed);
        cleansed = options[secondPass](cleansed);
        if (options.deleteWhitespace) {
            cleansed = internals.deleteWhitespace(cleansed);
        }
        if (options.deleteEmpty) {
            cleansed = internals.deleteEmpty(cleansed);
        }
    }

    return cleansed;
};

internals.schema = Joi.object().keys({
    deleteEmpty: Joi.boolean().optional(),
    deleteWhitespace: Joi.boolean().optional(),
    disinfectQuery: Joi.boolean().optional(),
    disinfectParams: Joi.boolean().optional(),
    disinfectPayload: Joi.boolean().optional(),
    genericSanitizer: Joi.func().optional(),
    querySanitizer: Joi.func().optional(),
    paramsSanitizer: Joi.func().optional(),
    payloadSanitizer: Joi.func().optional()
});

internals.defaults = {
    deleteEmpty: false,
    deleteWhitespace: false,
    disinfectQuery: false,
    disinfectParams: false,
    disinfectPayload: false,
    genericSanitizer: internals.noop,
    querySanitizer: internals.noop,
    paramsSanitizer: internals.noop,
    payloadSanitizer: internals.noop
};


exports.register = (server, options, next) => {

    const validateOptions = internals.schema.validate(options);
    if (validateOptions.error) {
        return next(validateOptions.error);
    }

    const serverSettings = Hoek.applyToDefaults(internals.defaults, options);

    server.ext('onPostAuth', (request, reply) => {

        if (request.route.settings.plugins.disinfect === false) {
            return reply.continue();
        }

        if (request.payload || Object.keys(request.params).length || Object.keys(request.query).length) {

            request.route.settings.plugins._disinfect = Hoek.applyToDefaults(serverSettings, request.route.settings.plugins.disinfect || {});

            request.query = internals.disinfect(request.query, request.route.settings.plugins._disinfect, 'disinfectQuery', 'querySanitizer');
            request.params = internals.disinfect(request.params, request.route.settings.plugins._disinfect, 'disinfectParams', 'paramsSanitizer');
            request.payload = internals.disinfect(request.payload, request.route.settings.plugins._disinfect, 'disinfectPayload', 'payloadSanitizer');
        }

        return reply.continue();
    });

    return next();
};


exports.register.attributes = {
    pkg: require('../package.json')
};
