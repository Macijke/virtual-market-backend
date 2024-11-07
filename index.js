const express = require('express')
const app = express()
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const env = require('dotenv').config();
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const {registerFormValidationRules, validateRegister, validateEdit, editFormValidationRules} = require("./src/validation");
const models = {
    User: require('./src/user-module'),
    Offer: require('./src/offer-module'),
    Item: require('./src/item-module')
}
const tokenVerify = require('./src/tokenVerify');

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

app.post('/signup', registerFormValidationRules(), validateRegister, async (req, res) => {
    const {login, password, email} = req.body;
    if (await models.User.findOne({login: login}).exec()) {
        res.status(200).json({message: 'Użytkownik o podanym loginie już istnieje!'});
    } else if (await models.User.findOne({email: email}).exec()) {
        res.status(200).json({message: 'Ten adres e-mail jest już zajęty!'});
    } else {
        let passwordHash = bcrypt.hashSync(password, 10);
        const user = new models.User({
            _id: new mongoose.Types.ObjectId(),
            login: login,
            email: email,
            password: passwordHash
        });
        user.save();
        res.status(200).json({message: 'Użytkownik został dodany do bazy danych!'});
    }

});

app.post('/login', async (req, res) => {
    const user = await models.User.findOne({login: req.body.login}).exec();
    const isMatch = user.validatePassword(req.body.password);
    if (isMatch) {
        const privateKey = env.parsed.SECRET_KEY;
        const token = jwt.sign({login: user.login, email: user.email}, privateKey, {expiresIn: '1d'});
        res.cookie('token', token, {httpOnly: true});
        res.status(200).json({message: 'Zalogowano pomyślnie!'});
    } else {
        res.status(200).json({message: 'Niepoprawny login lub hasło!'});
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
    console.log(offer);
    if (offer !== null) {
        const item = await models.Item.findOne({_id: new mongoose.Types.ObjectId(offer.uniqueItemId)}).exec();
        console.log(item)
        if (item !== null) {
            offer.isAvailable = false;
            offer.isSold = true;
            offer.buyerLogin = login;
            offer.sellDate = new Date();
            await offer.save();

            item.owenerLogin = login;
            await item.save();

            res.status(200).json({message: 'Zakupiono przedmiot!'});
        } else {
            res.status(200).json({message: 'Nie udało się zakupić przedmiotu! in item'});
        }
    } else {
        res.status(200).json({message: 'Nie udało się zakupić przedmiotu!'});
    }
});

app.listen(3003)
