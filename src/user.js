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
            collection.findOne({type: "pass"}, (err, data) => {
                if (data) {
                    if (bcrypt.compareSync(password, data.pass) === true) {
                        console.log('Пароль подтвержден');
                        resolve(true);
                    } else {
                        console.log('Пароль не подтвержден');
                        resolve(false);
                    }
                }
                if (err) return reject(err);
            })
        });
    });
};

exports.comparePasswords = (password) => {
    return new Promise((resolve, reject) => {
        mongoClient.connect(function (err, client) {
            const db = client.db("heroku_gj1rg06b");
            const collection = db.collection("loginData");
            collection.findOne({type: "pass"}, (err, data) => {
                if (data) {
                    if (data.pass === password) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                }
                if (err) return reject(err);
            })
        });
    });
};
