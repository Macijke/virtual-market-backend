const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const env = require('dotenv').config();
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const {
    registerFormValidationRules, validateRegister, validateEdit, editFormValidationRules
} = require("./src/validation");
const tokenVerify = require('./src/tokenVerify');
const models = {
    User: require('./src/user-module'),
    Offer: require('./src/offer-module'),
    Item: require('./src/item-module'),
    Skin: require('./src/skin-module'),
    PriceHistory: require('./src/priceHistory-module')
}

app.use(cors());
app.use(bodyParser.json());

app.use(cookieParser(), bodyParser.urlencoded({extended: true}), bodyParser.json());
app.use(express.static('public'));
app.set('trust proxy', 1);

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect("mongodb://127.0.0.1:27017/virtual-market").then(() => {
        console.log('Connected to the database');
    });
}

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});


// app.get('/', function (req, res) {
//     let privateKey = env.parsed.SECRET_KEY;
//
//     const token = jwt.sign({login: 'test', password: 'testos'}, privateKey, {expiresIn: '1d'});
//     console.log(token);
//     jwt.verify(token, privateKey, function(err, decoded) {
//         if (err) {
//             console.log(err);
//         } else {
//             console.log(decoded);
//         }
//     });
//     res.send('Hello World')
// });

app.post('/signup', registerFormValidationRules, validateRegister, async (req, res) => {
    const {login, password, email} = req.body;
    if (await models.User.findOne({login: login}).exec()) {
        res.status(200).json({message: 'Użytkownik o podanym loginie już istnieje!'});
    } else if (await models.User.findOne({email: email}).exec()) {
        res.status(200).json({message: 'Ten adres e-mail jest już zajęty!'});
    } else {
        let passwordHash = bcrypt.hashSync(password, 10);
        const user = new models.User({
            _id: new mongoose.Types.ObjectId(), login: login, email: email, password: passwordHash
        });
        user.save();
        res.status(200).json({message: 'Użytkownik został dodany do bazy danych!'});
    }

});

app.post('/login', async (req, res) => {
    const {login, password} = req.body;
    const user = await models.User.findOne({login: login}).exec();
    if (!user) {
        res.status(200).json({message: 'Niepoprawny login lub hasło!'});
    } else {
        const isMatch = user.validatePassword(password);
        if (isMatch) {
            const privateKey = env.parsed.SECRET_KEY;
            const token = jwt.sign({login: user.login, email: user.email}, privateKey, {expiresIn: '1d'});
            res.status(200).json({message: 'Zalogowano pomyślnie!', token: token});
        } else {
            res.status(200).json({message: 'Niepoprawny login lub hasło!'});
        }
    }


});

app.get('/offers', async (req, res) => {
    const offers = await models.Offer.find({isAvailable: true}).exec();

    res.status(200).json(offers);
});

app.get('/offers/:login', async (req, res) => {
    const login = req.params.login;
    const offers = await models.Offer.find({$and: [{isAvailable: true}, {sellerLogin: login}]});

    res.status(200).json(offers);
});

app.get('/offers/:sort', async (req, res) => {
    const sort = req.params.sort;
    if (sort === 'asc') {
        const offers = await models.Offer.find({isAvailable: true}).sort({price: 1}).exec();
        res.status(200).json(offers);
    } else if (sort === 'desc') {
        const offers = await models.Offer.find({isAvailable: true}).sort({price: -1}).exec();
        res.status(200).json(offers);
    } else {
        res.status(200).json({message: 'Niepoprawne zapytanie!'});
    }

});

app.post('/buyItem', tokenVerify, async (req, res) => {
    const {offerId, login} = req.body;
    const offer = await models.Offer.findOne({_id: new mongoose.Types.ObjectId(offerId)}).exec();
    if (offer !== null) {
        if (offer.isAvailable === false && offer.isSold === true) {
            res.status(200).json({message: "Ten przedmiot został już sprzedany."})
        } else if (offer.isAvailable === false) {
            res.status(200).json({message: "Ten przedmiot nie jest już dostępny."})
        } else {
            const item = await models.Item.findOneAndUpdate({_id: new mongoose.Types.ObjectId(offer.uniqueItemId)}, {ownerLogin: login}).exec();
            if (item !== null) {
                offer.isAvailable = false;
                offer.isSold = true;
                offer.buyerLogin = login;
                offer.sellDate = new Date();
                await offer.save();

                const priceHist = await models.PriceHistory.findOne({itemId: item.skinId}).exec();
                if (priceHist !== null) {
                    let priceHistoryTab = [];
                    for (let item of priceHist.priceHistory) {
                        priceHistoryTab.push(item);
                    }
                    priceHistoryTab.push({price: offer.price, date: new Date()});
                    priceHist.priceHistory = priceHistoryTab;
                    await priceHist.save();
                } else {
                    const priceHistory = new models.PriceHistory({_id: new mongoose.Types.ObjectId(), itemId: item.skinId, priceHistory: [{price: offer.price, date: new Date()}]});
                    await priceHistory.save();
                }

                res.status(200).json({message: 'Zakupiono przedmiot!'});
            } else {
                res.status(200).json({message: 'Nie udało się zakupić przedmiotu! Jeżeli przedmiot jest dostępny a problem będzie się powtarzał skontaktuj się z administratorem.'});
            }
        }
    } else {
        res.status(200).json({message: 'Nie udało się zakupić przedmiotu!'});
    }
});

app.post('/cancelOffer', tokenVerify, async (req, res) => {
    const {offerId, login} = req.body;
    const offer = await models.Offer.findOne({_id: new mongoose.Types.ObjectId(offerId)}).exec();
    if (offer.sellerLogin === login) {
        if (offer.isAvailable === true && offer.isSold === false) {
            offer.isAvailable = false;
            offer.message = "Oferta anulowana.";
            await offer.save();

            res.status(200).json({message: 'Oferta została anulowana.'});
        } else {
            res.status(200).json({message: 'Nie udało się anulować oferty!'});
        }
    } else {
        res.status(200).json({message: 'Coś poszło nie tak podczas próby anulowania oferty!'});
    }

});

app.post('/createOffer', tokenVerify, async (req, res) => {
    const {uniqueId, price, login} = req.body;
    const item = await models.Item.findOne({_id: new mongoose.Types.ObjectId(uniqueId)}).exec();
    if (item !== null) {
        const offer = new models.Offer({
            _id: new mongoose.Types.ObjectId(),
            uniqueItemId: item._id,
            sellerLogin: login,
            price: price,
            creationDate: new Date(),
            isAvailable: true,
            isSold: false
        });

        await offer.save();
        res.status(200).json({message: 'Oferta została dodana!'});
    } else {
        res.status(200).json({message: 'Nie udało się dodać oferty!'});
    }
});

app.get('/itemInfo/:id', async (req, res) => {
    const id = req.params.id;
    const item = await models.Item.findOne({_id: new mongoose.Types.ObjectId(id)}).exec();
    const skin = await models.Skin.findOne({skinId: item.skinId}).exec();
    if (item !== null) {
        res.status(200).json({item: item, skin: skin});
    } else {
        res.status(200).json({message: 'Nie znaleziono przedmiotu o podanym id!'});
    }
});

app.get('/inventory/:login', async (req, res) => {
    const login = req.params.login;
    let inventory = [];
    const items = await models.Item.find({ownerLogin: login}).exec();
    for (let item of items) {
        const skin = await models.Skin.findOne({skinId: item.skinId}).exec();
        inventory.push({
            uniqueId: item._id,
            skinId: item.skinId,
            float: item.float,
            seed: item.seed,
            addons: item.addons,
            weapon: skin.weapon,
            name: skin.name,
            rarity: skin.rarity,
            image: skin.image
        });
    }
    res.status(200).json(inventory);
});

app.get('/itemHistoryPrice/:item', async (req, res) => {
    const item = req.params.item;
    const historyPrice = await models.PriceHistory.findOne({itemId: item}).exec();
    if (historyPrice !== null) {
        res.status(200).json(historyPrice);
    } else {
        res.status(200).json({message: 'Nie znaleziono historii cen dla tego przedmiotu!'});
    }

});

app.listen(3003)
