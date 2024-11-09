const jwt = require('jsonwebtoken');
const env = require('dotenv').config();

const tokenVerify = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Brak dostępu. Niezalogowany użytkownik!' });
    }

    try {
        req.user = jwt.verify(token, env.parsed.SECRET_KEY);
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token nieprawidłowy lub wygasł' });
    }
};

module.exports = tokenVerify;
