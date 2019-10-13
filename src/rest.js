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
moment.locale('ru');

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

let records;

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
    //     "year": "2019",
    //     "2019": {
    //         "10": returnDaysInMonth("2019-10"),
    //         "11": returnDaysInMonth("2019-11"),
    //         "12": returnDaysInMonth("2019-12")
    //     }
    // })
    records.find({year: "2019"}).toArray(function (err, result) {
        let response = result[0];
        records.updateOne({year: "2019"}, {$set: { "2019": returnUpdatedDay(result[0], 2019, 10, 1, 3, '9:00', 'comment', 500)["2019"]}})
    });
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


const port = process.env.PORT || 7777;

server.listen(port, () => {
    console.log('Сервер запущен', moment().format(dateFormatForMoment));
});


