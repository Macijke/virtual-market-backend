const mongoose = require('mongoose');

let Schema = mongoose.Schema;
let priceHistorySchema = new Schema({
    _id: Object,
    itemId: Object,
    priceHistory: [{
        price: Number, date: Date
    }]
});

module.exports = mongoose.model('priceHistory', priceHistorySchema);
