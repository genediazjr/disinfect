'use strict';

const Async = require('async');
const Hapi = require('hapi');
const Code = require('code');
const Lab = require('lab');
const Plugin = require('../');

const expect = Code.expect;
const lab = exports.lab = Lab.script();
const beforeEach = lab.beforeEach;
const describe = lab.describe;
const it = lab.it;

describe('registration and functionality', () => {

    let server;

    beforeEach((done) => {

        server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'get',
            path: '/queryTest',
            handler: (request, reply) => {

                return reply(request.query);
            }
        });

        server.route({
            method: 'get',
            path: '/paramsTest/{a}/{b?}',
            handler: (request, reply) => {

                return reply(request.params);
            }
        });

        server.route({
            method: 'post',
            path: '/payloadTest',
            handler: (request, reply) => {

                return reply(request.payload);
            }
        });

        return done();
    });

    const register = (options, next) => {

        server.register({
            register: Plugin,
            options: options
        }, (err) => {

            return next(err);
        });
    };

    it('registers without options', (done) => {

        register({}, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/',
                handler: (request, reply) => {

                    return reply('');
                }
            });

            server.inject({
                method: 'get',
                url: '/'
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal(null);

                return done();
            });
        });
    });

    it('registers with error if invalid options', (done) => {

        register({
            some: 'value'
        }, (err) => {

            expect(err).to.exist();

            return done();
        });
    });

    it('can be disabled per route', (done) => {

        register({
            deleteEmpty: true
        }, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/disabled',
                handler: (request, reply) => {

                    return reply(request.query);
                },
                config: { plugins: { disinfect: false } }
            });

            server.route({
                method: 'post',
                path: '/disabled',
                handler: (request, reply) => {

                    return reply(request.payload);
                },
                config: { plugins: { disinfect: false } }
            });

            Async.series([
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/disabled?a=&b=&c=c'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ a: '', b: '', c: 'c' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'post',
                        url: '/disabled',
                        payload: { a: '', b: '', c: 'c' }
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ a: '', b: '', c: 'c' });

                        return doneTest();
                    });
                }
            ], () => {

                return done();
            });
        });
    });

    it('removes empties', (done) => {

        register({
            deleteEmpty: true
        }, (err) => {

            expect(err).to.not.exist();

            Async.series([
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/queryTest?a=&b=&c=c'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ c: 'c' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'post',
                        url: '/payloadTest',
                        payload: { a: '', b: '', c: 'c' }
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ c: 'c' });

                        return doneTest();
                    });
                }
            ], () => {

                return done();
            });
        });
    });

    it('removes empties on a per route config', (done) => {

        register({}, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/queryTestPerRoute',
                handler: (request, reply) => {

                    return reply(request.query);
                },
                config: {
                    plugins: {
                        disinfect: {
                            deleteEmpty: true
                        }
                    }
                }
            });

            server.route({
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request, reply) => {

                    return reply(request.payload);
                },
                config: {
                    plugins: {
                        disinfect: {
                            deleteEmpty: true
                        }
                    }
                }
            });

            Async.series([
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/queryTestPerRoute?a=&b=&c=c'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ c: 'c' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'post',
                        url: '/payloadTestPerRoute',
                        payload: { a: '', b: '', c: 'c' }
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ c: 'c' });

                        return doneTest();
                    });
                }
            ], () => {

                return done();
            });
        });
    });

    it('removes whitespaces', (done) => {

        register({
            deleteWhitespace: true
        }, (err) => {

            expect(err).to.not.exist();

            Async.series([
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/queryTest?a=%20%20%20&b=%20%20%20&c=c'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ c: 'c' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/paramsTest/' + encodeURIComponent('      ') + '/5'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ b: '5' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'post',
                        url: '/payloadTest',
                        payload: { a: '      ', b: '       ', c: 'c' }
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ c: 'c' });

                        return doneTest();
                    });
                }
            ], () => {

                return done();
            });
        });
    });

    it('removes whitespaces on a per route config', (done) => {

        register({}, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/queryTestPerRoute',
                handler: (request, reply) => {

                    return reply(request.query);
                },
                config: {
                    plugins: {
                        disinfect: {
                            deleteWhitespace: true
                        }
                    }
                }
            });

            server.route({
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, reply) => {

                    return reply(request.params);
                },
                config: {
                    plugins: {
                        disinfect: {
                            deleteWhitespace: true
                        }
                    }
                }
            });

            server.route({
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request, reply) => {

                    return reply(request.payload);
                },
                config: {
                    plugins: {
                        disinfect: {
                            deleteWhitespace: true
                        }
                    }
                }
            });

            Async.series([
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/queryTestPerRoute?a=%20%20%20&b=%20%20%20&c=c'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ c: 'c' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/paramsTestPerRoute/' + encodeURIComponent('      ') + '/c'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ b: 'c' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'post',
                        url: '/payloadTestPerRoute',
                        payload: { a: '      ', b: '       ', c: 'c' }
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ c: 'c' });

                        return doneTest();
                    });
                }
            ], () => {

                return done();
            });
        });
    });

    it('sanitizes query', (done) => {

        register({
            disinfectQuery: true
        }, (err) => {

            expect(err).to.not.exist();

            server.inject({
                method: 'get',
                url: '/queryTest?a=' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('sanitizes query on a per route config', (done) => {

        register({}, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/queryTestPerRoute',
                handler: (request, reply) => {

                    return reply(request.query);
                },
                config: {
                    plugins: {
                        disinfect: {
                            disinfectQuery: true
                        }
                    }
                }
            });

            server.inject({
                method: 'get',
                url: '/queryTestPerRoute?a=' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('sanitizes params', (done) => {

        register({
            disinfectParams: true
        }, (err) => {

            expect(err).to.not.exist();

            server.inject({
                method: 'get',
                url: '/paramsTest/' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('sanitizes params on a per route config', (done) => {

        register({}, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, reply) => {

                    return reply(request.params);
                },
                config: {
                    plugins: {
                        disinfect: {
                            disinfectParams: true
                        }
                    }
                }
            });

            server.inject({
                method: 'get',
                url: '/paramsTestPerRoute/' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('sanitizes payload', (done) => {

        register({
            disinfectPayload: true
        }, (err) => {

            expect(err).to.not.exist();

            server.inject({
                method: 'post',
                url: '/payloadTest',
                payload: { a: '<b>hello <i>world</i><script src=foo.js></script></b>' }
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('sanitizes payload on a per route config', (done) => {

        register({}, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request, reply) => {

                    return reply(request.payload);
                },
                config: {
                    plugins: {
                        disinfect: {
                            disinfectPayload: true
                        }
                    }
                }
            });

            server.inject({
                method: 'post',
                url: '/payloadTestPerRoute',
                payload: { a: '<b>hello <i>world</i><script src=foo.js></script></b>' }
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('accepts custom generic sanitizer', (done) => {

        register({
            genericSanitizer: (obj) => {

                const keys = Object.keys(obj);

                for (let i = 0; i < keys.length; ++i) {
                    obj[keys[i]] = obj[keys[i]] + 'x';
                }

                return obj;
            }
        }, (err) => {

            expect(err).to.not.exist();

            Async.series([
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/queryTest?a=a&b=b&c=c'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ a: 'ax', b: 'bx', c: 'cx' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/paramsTest/a/b'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ a: 'ax', b: 'bx' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'post',
                        url: '/payloadTest',
                        payload: { a: 'a', b: 'b', c: 'c' }
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ a: 'ax', b: 'bx', c: 'cx' });

                        return doneTest();
                    });
                }
            ], () => {

                return done();
            });
        });
    });

    it('accepts generic sanitizer on a per route config', (done) => {

        register({}, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/queryTestPerRoute',
                handler: (request, reply) => {

                    return reply(request.query);
                },
                config: {
                    plugins: {
                        disinfect: {
                            genericSanitizer: (obj) => {

                                const keys = Object.keys(obj);

                                for (let i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + '1';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            server.route({
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, reply) => {

                    return reply(request.params);
                },
                config: {
                    plugins: {
                        disinfect: {
                            genericSanitizer: (obj) => {

                                const keys = Object.keys(obj);

                                for (let i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + '2';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            server.route({
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request, reply) => {

                    return reply(request.payload);
                },
                config: {
                    plugins: {
                        disinfect: {
                            genericSanitizer: (obj) => {

                                const keys = Object.keys(obj);

                                for (let i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + '3';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            Async.series([
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/queryTestPerRoute?a=a&b=b&c=c'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ a: 'a1', b: 'b1', c: 'c1' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'get',
                        url: '/paramsTestPerRoute/a/b'
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ a: 'a2', b: 'b2' });

                        return doneTest();
                    });
                },
                (doneTest) => {

                    server.inject({
                        method: 'post',
                        url: '/payloadTestPerRoute',
                        payload: { a: 'a', b: 'b', c: 'c' }
                    }, (res) => {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.equal({ a: 'a3', b: 'b3', c: 'c3' });

                        return doneTest();
                    });
                }
            ], () => {

                return done();
            });
        });
    });

    it('accepts query sanitizer', (done) => {

        register({
            querySanitizer: (obj) => {

                const keys = Object.keys(obj);

                for (let i = 0; i < keys.length; ++i) {
                    obj[keys[i]] = obj[keys[i]] + 'q';
                }

                return obj;
            }
        }, (err) => {

            expect(err).to.not.exist();

            server.inject({
                method: 'get',
                url: '/queryTest?a=a&b=b&c=c'
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: 'aq', b: 'bq', c: 'cq' });

                return done();
            });
        });
    });

    it('accepts query sanitizer on a per route config', (done) => {

        register({}, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/queryTestPerRoute',
                handler: (request, reply) => {

                    return reply(request.query);
                },
                config: {
                    plugins: {
                        disinfect: {
                            querySanitizer: (obj) => {

                                const keys = Object.keys(obj);

                                for (let i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + 'q1';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            server.inject({
                method: 'get',
                url: '/queryTestPerRoute?a=a&b=b&c=c'
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: 'aq1', b: 'bq1', c: 'cq1' });

                return done();
            });
        });
    });

    it('accepts params sanitizer', (done) => {

        register({
            paramsSanitizer: (obj) => {

                const keys = Object.keys(obj);

                for (let i = 0; i < keys.length; ++i) {
                    obj[keys[i]] = obj[keys[i]] + 'm';
                }

                return obj;
            }
        }, (err) => {

            expect(err).to.not.exist();

            server.inject({
                method: 'get',
                url: '/paramsTest/a/b'
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: 'am', b: 'bm' });

                return done();
            });
        });
    });

    it('accepts params sanitizer on a per route config', (done) => {

        register({
            paramsSanitizer: (obj) => {

                return obj;
            }
        }, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request, reply) => {

                    return reply(request.params);
                },
                config: {
                    plugins: {
                        disinfect: {
                            paramsSanitizer: (obj) => {

                                const keys = Object.keys(obj);

                                for (let i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + 'm1';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            server.inject({
                method: 'get',
                url: '/paramsTestPerRoute/a/b'
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: 'am1', b: 'bm1' });

                return done();
            });
        });
    });

    it('accepts payload sanitizer', (done) => {

        register({
            payloadSanitizer: (obj) => {

                const keys = Object.keys(obj);

                for (let i = 0; i < keys.length; ++i) {
                    obj[keys[i]] = obj[keys[i]] + 'p';
                }

                return obj;
            }
        }, (err) => {

            expect(err).to.not.exist();

            server.inject({
                method: 'post',
                url: '/payloadTest',
                payload: { a: 'a', b: 'b', c: 'c' }
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: 'ap', b: 'bp', c: 'cp' });

                return done();
            });
        });
    });

    it('accepts payload sanitizer a per route config', (done) => {

        register({}, (err) => {

            expect(err).to.not.exist();

            server.route({
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request, reply) => {

                    return reply(request.payload);
                },
                config: {
                    plugins: {
                        disinfect: {
                            payloadSanitizer: (obj) => {

                                const keys = Object.keys(obj);

                                for (let i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + 'p1';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            server.inject({
                method: 'post',
                url: '/payloadTestPerRoute',
                payload: { a: 'a', b: 'b', c: 'c' }
            }, (res) => {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal({ a: 'ap1', b: 'bp1', c: 'cp1' });

                return done();
            });
        });
    });
});
