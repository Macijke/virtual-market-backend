const mongoose = require('mongoose');

let Schema = mongoose.Schema;
let offerSchema = new Schema({
    _id: Object,
    skinId: Object,
    uniqueItemId: {
        type: Schema.Types.ObjectId,
        ref: 'items'
    },
    sellerLogin: String,
    price: Number,
    creationDate: Date,
    isAvailable: Boolean,
    buyerLogin: String,
    sellDate: Date,
    message: String,
    isSold: Boolean
});

module.exports = mongoose.model('offers', offerSchema);
