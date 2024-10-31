const {body, validationResult} = require('express-validator');

const editFormValidationRules = () => {
    return [
        body('adressCity').notEmpty().trim().withMessage('Proszę podać miejscowość.'),
        body('adressStreet').notEmpty().trim().withMessage('Proszę podać ulicę.'),
        body('adressNumber').notEmpty().trim().withMessage('Proszę podać numer budynku.'),
        body('adressLocal').optional()
    ];
};

const registerFormValidationRules = () => {
    return [
        body('login').isLength({min: 5}).trim().withMessage('Login musi być dłuższy niż 4 znaki.'),
        body('email').isEmail().trim().withMessage('Proszę podać prawidłowy adres e-mail.'),
        body('password').isLength({min: 8}).withMessage('Hasło musi zawierać co najmniej 8 znaków.'),
        body('rPassword').custom((value, {req}) => {
            if (value !== req.body.password) {
                throw new Error('Hasła się nie zgadzają.');
            }
            return true;
        }),
    ];
};

const validateRegister = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const {login, password, email} = req.body;
        let extractedErrors = {};
        errors.array().map(error => extractedErrors[error.path] = error.msg);
        return res.status(200).json({
            errors: extractedErrors,
            values: {login, password, email},
        });

    }
    next();
};

const validateEdit = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const {adressCity, adressStreet, adressNumber, adressLocal} = req.body;
        let extractedErrors = {};
        errors.array().map(error => extractedErrors[error.path] = error.msg);
        return res.status(200).json({
            errors: extractedErrors,
            values: {adressCity, adressStreet, adressNumber, adressLocal},
        });

    }
    next();
}

module.exports = {validateRegister, validateEdit, registerFormValidationRules, editFormValidationRules}
