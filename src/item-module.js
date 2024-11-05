const mongoose = require('mongoose');

let Schema = mongoose.Schema;
let itemSchema = new Schema({
    _id: Object,
    skinId: {
        type: String,
        ref: 'skins'
    },
    float: Number,
    seed: Number,
    addons: {
        stickers: Array,
        nameTag: String
    }
});

module.exports = mongoose.model('items', itemSchema);
