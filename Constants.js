'use strict';
const Assert = require('assert');

class Constants {
    constructor() {
        this.PostgresConnectionString = process.env.DATABASE_URL;
        Assert(process.env.DATABASE_URL, 'ENV variable: DATABASE_URL is not set!');

        this.yahooCrumb = process.env.YAHOO_CRUMB;
        Assert(process.env.YAHOO_CRUMB, 'ENV variable: YAHOO_CRUMB is not set!');

        this.yahooCookie = process.env.YAHOO_COOKIE;
        Assert(process.env.YAHOO_COOKIE, 'ENV variable: YAHOO_COOKIE is not set!');
    }
}

module.exports = new Constants();
