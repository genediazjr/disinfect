'use strict';

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

    beforeEach(async () => {

        server = new Hapi.Server({ port: 80 });

        await server.route([{
            method: 'get',
            path: '/queryTest',
            handler: (request) => {
                return request.query;
            }
        }, {
            method: 'get',
            path: '/paramsTest/{a}/{b?}',
            handler: (request) => {
                return request.params;
            }
        }, {
            method: 'post',
            path: '/payloadTest',
            handler: (request) => {
                return request.payload;
            }
        }]);
    });

    const register = async (options) => {
        return server.register({ plugin: Plugin, options });
    };

    it('registers without options', async () => {

        let err;

        try {
            await register({});

            await server.route([{
                method: 'get',
                path: '/',
                handler: () => {
                    return '';
                }
            }]);

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal('');
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('registers with error if invalid options', async () => {

        let err;

        try {
            await register({
                some: 'value'
            });
        }

        catch (error) {
            err = error;
        }

        expect(err).to.exist();
    });

    it('can be disabled per route', async () => {

        let err;

        try {
            await register({
                deleteEmpty: true
            });

            await server.route([{
                method: 'get',
                path: '/disabled',
                handler: (request) => {
                    return request.query;
                },
                options: { plugins: { disinfect: false } }
            }, {
                method: 'post',
                path: '/disabled',
                handler: (request) => {
                    return request.payload;
                },
                options: { plugins: { disinfect: false } }
            }]);

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/disabled?a=&b=&c=c'
                }).then((res) => {
                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: '', b: '', c: 'c' });
                }),

                server.inject({
                    method: 'post',
                    url: '/disabled',
                    payload: { a: '', b: '', c: 'c' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: '', b: '', c: 'c' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('removes empties', async () => {

        let err;

        try {
            await register({
                deleteEmpty: true
            });

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/queryTest?a=&b=&c=c'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ c: 'c' });
                }),

                server.inject({
                    method: 'post',
                    url: '/payloadTest',
                    payload: { a: '', b: '', c: 'c' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ c: 'c' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('removes empties on a per route options', async () => {

        let err;

        try {
            await register({
                deleteEmpty: true
            });

            await server.route([{
                method: 'get',
                path: '/queryTestPerRoute',
                handler: (request) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        disinfect: {
                            deleteEmpty: true
                        }
                    }
                }
            }, {
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        disinfect: {
                            deleteEmpty: true
                        }
                    }
                }
            }]);

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/queryTestPerRoute?a=&b=&c=c'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ c: 'c' });
                }),

                server.inject({
                    method: 'post',
                    url: '/payloadTestPerRoute',
                    payload: { a: '', b: '', c: 'c' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ c: 'c' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('removes whitespaces', async () => {

        let err;

        try {
            await register({
                deleteWhitespace: true
            });

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/queryTest?a=%20%20%20&b=%20%20%20&c=c'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ c: 'c' });
                }),

                server.inject({
                    method: 'get',
                    url: '/paramsTest/' + encodeURIComponent('      ') + '/5'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ b: '5' });
                }),

                server.inject({
                    method: 'post',
                    url: '/payloadTest',
                    payload: { a: '      ', b: '       ', c: 'c' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ c: 'c' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('removes whitespaces on a per route options', async () => {

        let err;

        try {
            await register({
                deleteEmpty: true
            });
            await server.route([{
                method: 'get',
                path: '/queryTestPerRoute',
                handler: (request) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        disinfect: {
                            deleteWhitespace: true
                        }
                    }
                }
            }, {
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        disinfect: {
                            deleteWhitespace: true
                        }
                    }
                }
            }, {
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        disinfect: {
                            deleteWhitespace: true
                        }
                    }
                }
            }]);

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/queryTestPerRoute?a=%20%20%20&b=%20%20%20&c=c'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ c: 'c' });
                }),

                server.inject({
                    method: 'get',
                    url: '/paramsTestPerRoute/' + encodeURIComponent('      ') + '/c'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ b: 'c' });
                }),

                server.inject({
                    method: 'post',
                    url: '/payloadTestPerRoute',
                    payload: { a: '      ', b: '       ', c: 'c' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ c: 'c' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('sanitizes query', async () => {

        let err;

        try {
            await register({
                disinfectQuery: true
            });

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/queryTest?a=' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('sanitizes query on a per route options', async () => {

        let err;

        try {
            await register({});

            await server.route([{
                method: 'get',
                path: '/queryTestPerRoute',
                handler: (request) => {
                    return request.query;
                },
                options: {
                    plugins: {
                        disinfect: {
                            disinfectQuery: true
                        }
                    }
                }
            }]);

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/queryTestPerRoute?a=' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });

                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('sanitizes params', async () => {

        let err;

        try {
            await register({
                disinfectParams: true
            });

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/paramsTest/' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('sanitizes params on a per route options', async () => {

        let err;

        try {
            await register({
                deleteEmpty: true
            });

            await server.route([{
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request) => {
                    return request.params;
                },
                options: {
                    plugins: {
                        disinfect: {
                            disinfectParams: true
                        }
                    }
                }
            }]);

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/paramsTestPerRoute/' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('sanitizes payload', async () => {

        let err;

        try {
            await register({
                disinfectPayload: true
            });

            await Promise.all([
                server.inject({
                    method: 'post',
                    url: '/payloadTest',
                    payload: { a: '<b>hello <i>world</i><script src=foo.js></script></b>' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('sanitizes payload and doesnt cast arrays to strings on a per route config', async () => {

        let err;

        try {
            await register({});

            await server.route([{
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        disinfect: {
                            disinfectPayload: true
                        }
                    }
                }
            }]);

            await Promise.all([
                server.inject({
                    method: 'post',
                    url: '/payloadTestPerRoute',
                    payload: {
                        text1: 'test a',
                        text2: 'test b',
                        array: [
                            { text3: 'test c', text4: 'test d' },
                            { text3: 'test e', text4: '<b>hello <i>world</i><script src=foo.js></script></b>' },
                            'eddie'
                        ],
                        array2: [
                            ['a', 'b<script src=foo.js></script>', 'c'],
                            { a: '<script src=foo.js></script>eddie' }
                        ],
                        obj: { a: '<script src=foo.js></script>eddie' }
                    }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({
                        text1: 'test a',
                        text2: 'test b',
                        array: [
                            { text3: 'test c', text4: 'test d' },
                            { text3: 'test e', text4: '<b>hello <i>world</i></b>' },
                            'eddie'
                        ],
                        array2: [
                            ['a', 'b', 'c'],
                            { a: 'eddie' }
                        ],
                        obj: { a: 'eddie' }
                    });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();

    });

    it('sanitizes payload on a per route options', async () => {

        let err;

        try {
            await register({});

            await server.route([{
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request) => {
                    return request.payload;
                },
                options: {
                    plugins: {
                        disinfect: {
                            disinfectPayload: true
                        }
                    }
                }
            }]);

            await Promise.all([
                server.inject({
                    method: 'post',
                    url: '/payloadTestPerRoute',
                    payload: { a: '<b>hello <i>world</i><script src=foo.js></script></b>' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: '<b>hello <i>world</i></b>' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('accepts custom generic sanitizer', async () => {

        let err;

        try {
            await register({
                genericSanitizer: (obj) => {

                    const keys = Object.keys(obj);

                    for (let i = 0; i < keys.length; ++i) {
                        obj[keys[i]] = obj[keys[i]] + 'x';
                    }

                    return obj;
                }
            });

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/queryTest?a=a&b=b&c=c'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'ax', b: 'bx', c: 'cx' });
                }),

                server.inject({
                    method: 'get',
                    url: '/paramsTest/a/b'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'ax', b: 'bx' });
                }),

                server.inject({
                    method: 'post',
                    url: '/payloadTest',
                    payload: { a: 'a', b: 'b', c: 'c' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'ax', b: 'bx', c: 'cx' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('accepts generic sanitizer on a per route options', async () => {

        let err;

        try {
            await register({});

            await server.route([{
                method: 'get',
                path: '/queryTestPerRoute',
                handler: (request) => {
                    return request.query;
                },
                options: {
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
            }, {
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request) => {
                    return request.params;
                },
                options: {
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
            }, {
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request) => {
                    return request.payload;
                },
                options: {
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
            }]);

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/queryTestPerRoute?a=a&b=b&c=c'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'a1', b: 'b1', c: 'c1' });
                }),

                server.inject({
                    method: 'get',
                    url: '/paramsTestPerRoute/a/b'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'a2', b: 'b2' });
                }),

                server.inject({
                    method: 'post',
                    url: '/payloadTestPerRoute',
                    payload: { a: 'a', b: 'b', c: 'c' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'a3', b: 'b3', c: 'c3' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('accepts query sanitizer', async () => {

        let err;

        try {
            await register({
                querySanitizer: (obj) => {

                    const keys = Object.keys(obj);

                    for (let i = 0; i < keys.length; ++i) {
                        obj[keys[i]] = obj[keys[i]] + 'q';
                    }

                    return obj;
                }
            });

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/queryTest?a=a&b=b&c=c'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'aq', b: 'bq', c: 'cq' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('accepts query sanitizer on a per route options', async () => {

        let err;

        try {
            await register({});

            await server.route([{
                method: 'get',
                path: '/queryTestPerRoute',
                handler: (request) => {
                    return request.query;
                },
                options: {
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
            }]);

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/queryTestPerRoute?a=a&b=b&c=c'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'aq1', b: 'bq1', c: 'cq1' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('accepts params sanitizer', async () => {

        let err;

        try {
            await register({
                paramsSanitizer: (obj) => {

                    const keys = Object.keys(obj);

                    for (let i = 0; i < keys.length; ++i) {
                        obj[keys[i]] = obj[keys[i]] + 'm';
                    }

                    return obj;
                }
            });

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/paramsTest/a/b'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'am', b: 'bm' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('accepts params sanitizer on a per route options', async () => {

        let err;

        try {
            await register({
                paramsSanitizer: (obj) => {

                    return obj;
                }
            });

            await server.route([{
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: (request) => {
                    return request.params;
                },
                options: {
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
            }]);

            await Promise.all([
                server.inject({
                    method: 'get',
                    url: '/paramsTestPerRoute/a/b'
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'am1', b: 'bm1' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('accepts payload sanitizer', async () => {

        let err;

        try {
            await register({
                payloadSanitizer: (obj) => {

                    const keys = Object.keys(obj);

                    for (let i = 0; i < keys.length; ++i) {
                        obj[keys[i]] = obj[keys[i]] + 'p';
                    }

                    return obj;
                }
            });

            await Promise.all([
                server.inject({
                    method: 'post',
                    url: '/payloadTest',
                    payload: { a: 'a', b: 'b', c: 'c' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'ap', b: 'bp', c: 'cp' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });

    it('accepts payload sanitizer a per route options', async () => {

        let err;

        try {
            await register({});

            await server.route([{
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: (request) => {
                    return request.payload;
                },
                options: {
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
            }]);

            await Promise.all([
                server.inject({
                    method: 'post',
                    url: '/payloadTestPerRoute',
                    payload: { a: 'a', b: 'b', c: 'c' }
                }).then((res) => {

                    expect(res.statusCode).to.be.equal(200);
                    expect(res.result).to.equal({ a: 'ap1', b: 'bp1', c: 'cp1' });
                })
            ]);
        }

        catch (error) {
            err = error;
        }

        expect(err).to.not.exist();
    });
});
