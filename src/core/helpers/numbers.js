const { BigNumber } = require('bignumber.js');

exports.toString = a => BigNumber(a).toString();

exports.toNumber = a => BigNumber(a).toNumber();

exports.toFixedToFloat = (a, decimalPlaces = 2) => parseFloat(BigNumber(a).toFixed(decimalPlaces));

exports.multiply = (...nums) => nums.reduce((acc, n) => BigNumber(acc).multipliedBy(n).toString(), 1);

exports.divide = (a, b) => BigNumber(a).dividedBy(b).toString();

exports.add = (...nums) => nums.reduce((acc, n) => BigNumber(acc).plus(n).toString(), 0);

exports.subtract = (a, b) => BigNumber(a).minus(b).toString();

exports.isEqualTo = (a, b) => BigNumber(a).isEqualTo(b);

exports.isLessThan = (a, b) => BigNumber(a).isLessThan(b);

exports.isGreaterThan = (a, b) => BigNumber(a).isGreaterThan(b);

exports.isGreaterThanOrEqual = (a, b) => this.isGreaterThan(a, b) || this.isEqualTo(a, b);
