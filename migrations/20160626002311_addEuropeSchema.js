
exports.up = function(Knex, Promise) {
    return Knex.schema.raw('CREATE SCHEMA europe').then(function() {
        return Knex.schema.withSchema('europe').createTable('total_liabilities', function (table) {
            table.date('date').primary();
            table.bigInteger('value');
        });
    });
};

exports.down = function(Knex, Promise) {
    return Knex.schema.raw('DROP SCHEMA europe CASCADE');
};
