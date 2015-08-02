'use strict';

class SpreadsheetHelper {
    /**
     * Return range of column cells
     * @example SpreadsheetHelper.columnRange('A', 1, 3) // ['A1', 'A2', A3']
     */
    columnRange(column, start, end) {
        const results = [];
        for (var i = start; i <= end; i++) {
            results.push(column + i);
        }
        return results;
    }
}

module.exports = new SpreadsheetHelper();
