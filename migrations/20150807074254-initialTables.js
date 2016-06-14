'use strict';
const Promise = require('bluebird');

/**
 * Migration script that sets up the initial tables + views (using db-migrate)
 */
exports.up = function(db, done) {
    Promise.promisifyAll(db);

    db.createTableAsync('stock_asset_allocation', {
        date: {
            type: 'date',
            primaryKey: true
        },
        percentage: 'numeric(6,5)'
    }).then(function() {
        return db.createTableAsync('sp_500_monthly', {
            date: {
                type: 'date',
                primaryKey: true
            },
            close: 'numeric(10,2)',
            dividend: 'numeric(15,12)',
            earnings: 'numeric(15,12)',
            cpi: 'numeric(12,8)',
            gs10: 'numeric(4,2)',
            pe10: 'numeric(4,2)',
            adjusted_close: 'double precision'
        });
    }).then(function() {
        done();
    })
};

exports.down = function(db, done) {
    Promise.promisifyAll(db);

    Promise.all([
        db.dropTableAsync('stock_asset_allocation'),
        db.dropTableAsync('sp_500_monthly')
    ]).then(function() {
        done();
    });
};
