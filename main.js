#!/usr/bin/env node --harmony --harmony_arrow_functions
'use strict';
const Util2 = require('./Util2');
const Program = require('commander');
const Logger = require('winston2');
const LiabilityScraper = require('./scrapers/LiabilityScraper');

Program.version('1.0.0');

Program
    .command('fetch [name]')
    .description('fetch data and update the target collection')
    .option('-f, --fresh', 'clean collection and pull from scratch')
    .action(function(name, options) {
        name = name || 'all';
        let promise;
        switch (name) {
            case 'liabilities':
                promise = LiabilityScraper.fetch();
                break;
            case 'totalMarketCap':
                break;
            case 'totalReturnIndex':
                break;
            case 'all':
                break;
            default:
                Logger.info('Target collection not found!');
        }
        if (!promise) {
            process.exit(1);
        } else {
            promise
                .catch(() => Logger.error('Fetch failed!'))
                .finally(() => process.exit(1));
        }
    });

Program.parse(process.argv);
