const newUser = require('./newUser');
const restify = require('restify');
const {InvalidCredentialsError} = require('restify-errors');
const MongoClient = require("mongodb").MongoClient;
const rjwt = require('restify-jwt-community');
const jwt = require('jsonwebtoken');
const config = require('./config');
const server = restify.createServer({handleUpgrades: true});
const bcrypt = require('bcryptjs');
const moment = require('moment');
const dateFormatForMoment = 'Do MMMM YYYY, HH:mm:ss';
const uuidv4 = require('uuid/v4');

server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

server.use(rjwt(config.jwt).unless({
    path: ['/sync'],
}));

const url = "mongodb://ROOT:shiftr123@ds019634.mlab.com:19634/heroku_gj1rg06b";
const mongoClient = new MongoClient(url, {
    useNewUrlParser: true,
    poolSize: 2,
    promiseLibrary: global.Promise,
    useUnifiedTopology: true
});

let collection;
let news;
let log;

mongoClient.connect(function (err, client) {
        const db = client.db("heroku_gj1rg06b");
        collection = db.collection("records");
    }
);


server.pre((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // * - разрешаем всем
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { // Preflight
        res.send();
        next(false);
        return;
    }
    next();
});


server.get('/getSupportList', (req, res, next) => {
    collection.find().toArray(function (err, results) {
        res.send(results);
        next();
    });
});

server.get('/getNewsList', (req, res, next) => {
    news.find().toArray(function (err, results) {
        res.send(results);
        next();
    });
});

server.post('/removeNews', (req, res, next) => {
    news.deleteOne({body: req.body.body}, function (err, result) {
    });
    res.send(true)
});

server.post('/editNews', (req, res, next) => {
    console.log(req.body);
    news.replaceOne({body: req.body.oldBody, header: req.body.oldHeader}, {
        body: req.body.body,
        header: req.body.header,
        author: req.body.author,
        img: req.body.img,
        data: moment().format(dateFormatForMoment)
    }, () => {
        res.send(true)
    });
});


server.post('/addAdmin', (req, res, next) => {
    collection.find({email: req.body.email}).toArray((err, result) => {
        if (result[0] !== undefined) {
            collection.updateOne({email: req.body.email}, {$set: {admin: true}});
            res.send(true)
        }
    });
    collection.find({email: req.body.email}).toArray((err, result) => {
        if (result.length === 0) {
            res.send('false')
        }
    });
    next()
});

server.post('/getUserDataFromAdmin', (req, res, next) => {
    collection.find({email: req.body.email}).toArray((err, result) => {
        if (result[0] !== undefined) {
            res.send(result[0])
        }
    });
    collection.find({email: req.body.email}).toArray((err, result) => {
        if (result.length === 0) {
            res.send('false')
        }
    });
    next()
});

server.post('/removeUserAdmin', (req, res, next) => {
    collection.find({email: req.body.email}).toArray((err, result) => {
        if (result[0] !== undefined) {
            collection.updateOne({email: req.body.email}, {$set: {admin: false}});
            res.send(true)
        }
    });
    collection.find({email: req.body.email}).toArray((err, result) => {
        if (result.length === 0) {
            res.send('false')
        }
    });
    next()
});

moment.locale('ru');
console.log(moment().utcOffset())

server.post('/deleteAccount', (req, res, next) => {
    collection.remove({email: req.body.email});
    res.send(true);
    next()
});

server.post('/addNews', (req, res, next) => {
    let object = {
        header: req.body.header,
        author: req.body.author,
        body: req.body.body,
        img: req.body.img,
        data: moment().format(dateFormatForMoment)
    };

    news.insertOne(object, function (err, result) {
        res.send(true);
        if (err) {
            return console.log(err);
        }
    });
});

server.get('/user', (req, res, next) => {
    console.log('GET USER');
    console.log(req.user.username, req.user.password);
    const decodedObject = jwt.verify(req.headers.authorization.split(' ')[1], config.jwt.secret);
    console.log(decodedObject);
    user.returnUpdatedObject(decodedObject.username, decodedObject.password).then((data, e) => {
        try {
            if (data === null) {
                res.send('Null');
            }
            res.send(data);
            collection.updateOne({email: data.email}, {$set: {lastLoginDate: moment().format(dateFormatForMoment)}});
            next()
        } catch (e) {
            return next(new InvalidCredentialsError());
        }
    });
});

server.post('/auth', (req, res, next) => {
    let {email, password} = req.body;
    console.log(email, password);
    user.authenticate(email, password).then((data, e) => {
        try {
            if (data === null) {
                return next(new InvalidCredentialsError());
            }
            const dataForToken = {
                password: data.password,
                email: data.email
            }
            let token = jwt.sign(dataForToken, config.jwt.secret, {
                expiresIn: '7d'
            });

            let {iat, exp} = jwt.decode(token);
            res.send({iat, exp, token});
            next()
        } catch (e) {
            return next(new InvalidCredentialsError());

        }
    });
});

let resultFlag = '';

server.post('/changePassword', (req, res, next) => {
    console.log('CHANGE PASSWORD');
    let userData = req.body;
    let oldPassword = req.body.oldPassword;
    let newPassword = req.body.newPassword;
    let confirmNewPassword = req.body.confirmNewPassword;
    if (newPassword.length < 7) {
        console.log('Длина пароля меньше 8');
        res.send('Bad password length');
        next();
        return;
    }
    if (newPassword !== confirmNewPassword) {
        console.log('Пароли не совпадают');
        res.send('Bad confirm');
        next();
        return;
    }
    mongoClient.connect(async function (err, client) {
        const db = client.db("heroku_gj1rg06b");
        const collection = db.collection("users");
        collection.find({username: req.body.username}).toArray(function (err, result) {
            if (result.length !== 0) {
                userData = result[0];
                if (bcrypt.compareSync(newPassword, userData.password) === true) {
                    console.log('Старый и новый пароль совпадает');
                    res.send('Passwords matches');
                    next();
                    return;
                }
                if (bcrypt.compareSync(oldPassword, userData.password) === true) {
                    console.log('Пароль обновлен');
                    let newData = {
                        username: userData.username,
                        password: confirmNewPassword
                    };
                    collection.updateOne({username: userData.username}, {$set: {password: bcrypt.hashSync(confirmNewPassword, 10)}});
                    // console.log(newData);
                    res.send('Updated');
                    return;
                }
                if (bcrypt.compareSync(oldPassword, userData.password) === false) {
                    console.log('Старый пароль не совпадает');
                    res.send('Not confirmed');
                    return;
                }
            }
        });
    });
    next();
});

server.post('/updateData', (req, res, next) => {
    console.log('UPDATE DATA');
    let userData = req.body;
    console.log(userData);


    collection.replaceOne({email: req.body.email}, {
        email: req.body.email,
        password: req.body.password,
        registrationDate: req.body.registrationDate,
        lastLoginDate: req.body.lastLoginDate,
        admin: req.body.admin,
        lessons: req.body.lessons,
        lessonTasks: req.body.lessonTasks,
        teachers: req.body.teachers,
        lessonTime: req.body.lessonTime
    });
    console.log('Data updated');
    res.send(req.body);
    next();
});

server.post('/registration', (req, res, next) => {
    console.log('РЕГИСТРАЦИЯ');
    let hashedPassword = bcrypt.hashSync(req.body.password, 10);

    if (req.body.password.length < 8) {
        res.send('8 symbols');
        next();
        return;
    }

    if (req.body.password !== req.body.confirmPassword) {
        console.log('Пароли не совпадают');
        res.send('Passwords Not Confirmed');
        next();
        return;
    }


    // TODO: ввести проверку валидности мыла

    const userForDataBase = newUser.newUserConstructor(hashedPassword, req.body.email);

    mongoClient.connect(function (err, client) {
        const db = client.db("heroku_gj1rg06b");
        const collection = db.collection("users");
        collection.find({email: req.body.email}).toArray(function (err, result) {
            if (result.length === 0) {
                resultFlag = 'true';
                console.log('Копий нет');
                collection.insertOne(userForDataBase, function (err, result) {
                    console.log('Добавлено');

                    let token = jwt.sign(userForDataBase, config.jwt.secret, {
                        expiresIn: '1d'
                    });

                    let {iat, exp} = jwt.decode(token);
                    console.log('token', token);
                    res.send({iat, exp, token});
                    next()
                    if (err) {
                        return console.log(err);
                    }
                });
            } else {
                resultFlag = 'false';
                console.log(resultFlag);
                console.log('Есть копия, не добавлено');
                res.send('This email already registered');
                if (err) {
                    return console.log(err);
                }
            }
        });
    });
    next();
});

const port = process.env.PORT || 7777;

server.listen(port, () => {
    console.log('Сервер запущен');
});


