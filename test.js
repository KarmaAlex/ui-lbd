var mysql = require('mysql');
var test = require('./test.json')

var connection = mysql.createConnection({ //TODO: Remove
    host     : 'localhost',
    user     : 'admin',
    password : '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    database : 'soccorso'
});

connection.connect();

console.log(test);