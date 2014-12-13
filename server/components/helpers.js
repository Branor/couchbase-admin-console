var bcrypt = require('bcrypt');

function randomRange(min, max) {
    return Math.floor((Math.random() * max) + min);
}

function encrypt(str) {
    return bcrypt.hashSync(str, 10);
}

function compare(hashedStr, plainStr) {
    return bcrypt.compareSync(plainStr, hashedStr);
}


module.exports = {
    randomRange : randomRange,
    encrypt : encrypt,
    compare : compare
};