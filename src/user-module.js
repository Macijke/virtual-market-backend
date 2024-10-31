const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

let Schema = mongoose.Schema;
let userSchema = new Schema({
    _id: Object,
    login: String,
    password: String,
    email: String,
    funds: Number,

});

userSchema.method('validatePassword', async function (password) {
    return await bcrypt.compare(password, this.password);
});

module.exports = mongoose.model('users', userSchema);
