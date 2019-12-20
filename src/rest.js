const restify = require('restify');
const {InvalidCredentialsError} = require('restify-errors');
const MongoClient = require("mongodb").MongoClient;
const config = require('./config');
const server = restify.createServer({handleUpgrades: true});
const moment = require('moment');
const dateFormatForMoment = 'Do MMMM YYYY, HH:mm:ss';
const uuidv4 = require('uuid/v4');
const user = require('./user');
const bcrypt = require('bcryptjs');
const rjwt = require('restify-jwt-community');
const jwt = require('jsonwebtoken');

moment.locale('ru');

server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

server.use(rjwt(config.jwt).unless({
    path: ['/setPassword', '/getRecordsByDate', '/updateRecord', '/auth', '/setPassword'],
}));

const url = "mongodb://ROOT:shiftr123@ds019634.mlab.com:19634/heroku_gj1rg06b";
const mongoClient = new MongoClient(url, {
    useNewUrlParser: true,
    poolSize: 2,
    promiseLibrary: global.Promise,
    useUnifiedTopology: true
});

let records;
let loginData;
const returnDaysInMonth = (year) => {
    let startDay = 1;
    const days = {};
    while (startDay <= moment(year, "YYYY-MM").daysInMonth()) {
        days[startDay] = {
            1: {
                id: uuidv4(),
                time: '',
                comment: '',
                cost: 0
            },
            2: {
                id: uuidv4(),
                time: '',
                comment: '',
                cost: 0
            },
            3: {
                id: uuidv4(),
                time: '',
                comment: '',
                cost: 0
            },
            4: {
                id: uuidv4(),
                time: '',
                comment: '',
                cost: 0
            },
        };
        startDay++
    }
    return days
};

mongoClient.connect(function (err, client) {
    const db = client.db("heroku_gj1rg06b");
    records = db.collection("records");
    // records.insertOne({
    //     "year": "2020",
    //     "2020": {
    //         "01": returnDaysInMonth("2020-01"),
    //         "02": returnDaysInMonth("2020-02"),
    //         "03": returnDaysInMonth("2020-03"),
    //         "04": returnDaysInMonth("2020-04"),
    //         "05": returnDaysInMonth("2020-05"),
    //         "06": returnDaysInMonth("2020-06")
    //     }
    // });
    loginData = db.collection("loginData");
//     loginData.insertOne({type: "pass", pass: 'string'})
});

const returnUpdatedDay = (result, year, month, day, recordNumber, time, comment, cost) => {
    let response = result;
    response[year][month][day][recordNumber] = {
        id: response[year][month][day][recordNumber]["id"],
        time,
        comment,
        cost
    };
    return response
};

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

server.post('/getRecordsByDate', (req, res, next) => {
    let date = req.body; // {year, month}
    console.log(date)
    records.find({year: req.body.year}).toArray((err, result) => {
        res.send(result[0][req.body.year][req.body.month]);
        // console.log(result)
        next();
    });
});


server.post('/updateRecord', (req, res, next) => {
    records.find({year: req.body.year}).toArray((err, result) => {
        records.updateOne(
            {year: req.body.year},
            {
                $set:
                    {
                        [req.body.year]: returnUpdatedDay(
                            result[0],
                            req.body.year,
                            req.body.month,
                            req.body.day,
                            req.body.number,
                            req.body.time,
                            req.body.comment,
                            req.body.cost)[req.body.year]
                    }
            }
        );
        res.send(result[0][req.body.year][req.body.month]);
        next();
    });
});

server.get('/authToken', (req,res,next) => {
    const decodedObject = jwt.verify(req.headers.authorization.split(' ')[1], config.jwt.secret);
    user.comparePasswords(decodedObject.password).then((data, e) => {
        try {
            if (data === true) {
                res.send(true);
            } else {
                res.send(new InvalidCredentialsError())
            }
        } catch (e) {
            res.send(e)
        }
    })
});

server.post('/auth', (req, res, next) => {
    const {password} = req.body;
    user.authenticate(password).then((data, e) => {
        try {
            if (data === true) {
                const cryptPass = bcrypt.hashSync(password, 10);
                const token = jwt.sign({password: password}, config.jwt.secret, {
                    expiresIn: '7d'
                });
                console.log(token)
                res.send(token);
            } else {
                res.send(new InvalidCredentialsError())
            }
        } catch (e) {
            res.send(e)
        }
    })
});

server.post('/setPassword', (req, res, next) => {
    const {password} = req.body;
    let cryptPass = bcrypt.hashSync(password, 10);
    loginData.updateOne({type: "pass"}, {$set: {pass: cryptPass}});
    let token = jwt.sign({password: password}, config.jwt.secret,{
        expiresIn: '7d'
    });
    res.send(token);
    return next()
});

const port = process.env.PORT || 7777;

server.listen(port, () => {
    console.log('Сервер запущен', moment().format(dateFormatForMoment));
});


