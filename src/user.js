"use strict";

const {BadRequestError, NotFoundError, InvalidCredentialsError} = require('restify-errors');

const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://ROOT:shiftr123@ds019634.mlab.com:19634/heroku_gj1rg06b";
const mongoClient = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true });
const bcrypt = require('bcryptjs');
const moment = require('moment');
moment.locale('ru');
const dateFormatForMoment = 'Do MMMM YYYY, HH:mm:ss';

exports.authenticate = (password) => {
    return new Promise((resolve, reject) => {
        mongoClient.connect(function (err, client) {
            const db = client.db("heroku_gj1rg06b");
            const collection = db.collection("loginData");
            collection.findOne({type: "pass"}, (err, data) => { //  в data возвращается объект
                if (err) return reject(err);
                let objectToSend = null;
                if (data) {
                    if (bcrypt.compareSync(password, data.pass) === true) {
                        objectToSend = data;
                        console.log('OBJECT SEND authenticate');
                        resolve(true);
                    } else {
                        console.log('not confirmed')
                        resolve(false);
                    }
                }
            })
        });
    });
};


exports.returnUpdatedObject = (username, password) => {
    return new Promise((resolve, reject) => {
        mongoClient.connect(function (err, client) {
            const db = client.db("heroku_ww8906l5");
            const collection = db.collection("users");
            collection.findOne({username, password}, (err, data) => { //  в data возвращается объект
                if (err) return reject(err);
                let objectToSend = null;
                if (data !== null) {
                    if (password === data.password) {
                        objectToSend = data;
                        console.log('OBJECT SEND returnUpdatedObject')
                    }
                    if (password !== data.password) {
                        console.log('Старый пароль был изменен');
                    }
                }
                resolve(objectToSend);
            })
        });
    });
};
