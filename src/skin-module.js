const mongoose = require('mongoose');

let Schema = mongoose.Schema;
let skinSchema = new Schema({
    _id: Object,
    skinId: String,
    weapon: String,
    rarity: String,
    image: String,
    name: String,
});

module.exports = mongoose.model('skins', skinSchema);
