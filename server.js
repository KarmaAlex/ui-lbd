const port = 8888;

import {createServer} from 'https';
import {extname, join} from 'path';
import {readFileSync, readFile} from 'fs';
import mysql from 'mysql';

import customSelect from './queries/customSelect.json' with {type: 'json'};
import customQueries from './queries/customQueries.json' with {type: 'json'};

const customInsert = {
    Richiesta: {
        handler: (data, response, request)=>{
            var fileLink = null
            if(data.params.file && data.params.file.data){
                var ext = null
                const buffer = Buffer.from(data.params.file.data.split(",")[1], "base64");
                var i = 1;
                var filename = path.basename(data.params.file.filename).split(".");
                filename.pop();
                filename = filename.join(".");
                ext = path.extname(data.params.file.filename);
                fileLink = filename
                if(!fs.existsSync('./res')) fs.mkdirSync('./res');
                while(fs.existsSync("./res/" + fileLink + ext)){
                    fileLink = filename + "(" + i + ")";
                    i++;
                }
                fs.writeFileSync("./res/" + fileLink + ext, buffer, {flag:"w+"});
                //override file to set up data properly for use in query
                fileLink = path.resolve("./res/" + fileLink + ext);
            }
            var ip = request.socket.remoteAddress.split(":");
            ip = ip[ip.length - 1];
            paramQuery('SELECT InserisciRichiesta(?, ?, ?, ?, ?, ?) as link;',
                [data.params.name, data.params.email, ip, data.params.pos, fileLink, data.params.desc])
            .then(([result, fields])=>{respond(response, 200, result[0].link)})
            .catch((err)=>{respond(response, 500, err)})
        }
    },
    Missione: {
        handler: (data, response) => {
            connection.beginTransaction((err)=>{
                if(err) {
                    respond(response, 500, err.code);
                    return;
                }
                paramQuery('SELECT creaMissione(?, ?, ?, ?) as id_missione', [data.params.richiesta, data.params.admin, data.params.squadra, data.params.obiettivo])
                .then((res)=>{
                    var id_missione = res[0].id_missione;
                    recursiveQuery('INSERT INTO assegna_mezzo(ID_MEZZO, ID_MISSIONE) VALUES (?, ?);', data.params.mezzo, id_missione)
                    .then(()=>{
                        recursiveQuery('INSERT INTO assegna_materiale(ID_MATERIALE, ID_MISSIONE) VALUES (?, ?);', data.params.materiale, id_missione)
                        .then(()=>{connection.commit(()=>{respond(response, 200)})})
                        .catch((err)=>{respond(response, 500, err)})
                    })
                    .catch((err)=>{respond(response, 500, err)})
                })
                .catch((err)=>{respond(response, 500, err)})
            })
        }
    },
    Squadra: {
        handler: (data, response) => {
            if(data.params.caposquadra && data.params.membri){
                connection.beginTransaction((err)=>{
                    if(err){
                        respond(response, 500, err.code);
                        return;
                    }
                    paramQuery('SELECT creaSquadra(?) AS id_squadra', data.params.caposquadra)
                    .then(()=>{
                        var id_squadra = res[0].id_squadra;
                        recursiveQuery('INSERT INTO assegna_squadra(ID_UTENTE, ID_SQUADRA) VALUES (?, ?);', data.params.membri, id_squadra)
                        .then(()=>{ connection.commit(()=>{ respond(response, 200) }) })
                        .catch((err)=>{ connection.rollback(()=>{ respond(response, 500, err) }) })
                    })
                    .catch((err)=>{ connection.rollback(()=>{ respond(response, 500, err) }) })
                })
            }
        }
    },
    Utente: {
        handler: (data, response) => {
            var id_utente;
            connection.beginTransaction((err) => {
                if(err){
                    respond(response, 500, err.code);
                    return;
                } 
                paramQuery('SELECT creaUtente(?, ?, ?, ?, ?, ?) AS id_utente', 
                    [data.params.nome_utente, data.params.nome, data.params.cognome, data.params.cf, data.params.data_nasc, data.params.luogo_nasc])
                .then(([res, fields])=>{
                    id_utente = res[0].id_utente;
                    recursiveQuery('INSERT INTO assegna_patente(ID_PATENTE, ID_UTENTE) VALUES (?, ?);', data.params.patente, id_utente)
                    .then(()=>{
                        recursiveQuery('INSERT INTO assegna_abilita(ID_ABILITA, ID_UTENTE) VALUES (?, ?);', data.params.abilita, id_utente)
                        .then(()=>{ connection.commit(()=>{ respond(response, 200); }) })
                        .catch((err)=>{ connection.rollback(()=>{ respond(response, 500, err); })
                        })
                    })
                    .catch((err)=>{ connection.rollback(()=>{ respond(response, 500, err); }) })
                })
                .catch((err)=>{ connection.rollback(()=>{ respond(response, 500, err.code); })
                })
            })
        }
    },
    Abilita: {
        handler: (data, response) => { 
            paramQuery('INSERT INTO Abilita(`desc`) values (?);', data.params.desc)
            .then(()=>{ respond(response, 200); })
            .catch((err)=>{ respond(response, 500, err); })
        }
    },
    Patente: {
        handler: (data, response) => {
            paramQuery('INSERT INTO Patente(tipo, numero) values(?, ?);', [data.params.tipo, data.params.numero])
            .then(()=>{respond(response, 200)})
            .catch((err)=>{respond(response, 500, err)})
        }
    },
    Mezzo: {
        handler: (data, response) => { 
            paramQuery('INSERT INTO Mezzo(nome, desc, targa) values (?, ?, ?);', [data.params.nome, data.params.desc, data.params.targa])
            .then(()=>{respond(response, 200)})
            .catch((err)=>{respond(response, 500, err)})
        }
    },
    Materiale: {
        handler: (data, response) => {
            paramQuery('INSERT INTO Materiale(nome, `desc`, cod_mat) values (?, ?, ?);', [data.params.nome, data.params.desc, data.params.cod_mat])
            .then(()=>{respond(response, 200)})
            .catch((err)=>{respond(response, 500, err)})
        }
    },
    Aggiornamento: {
        handler: (data, response) => {
            paramQuery('CALL aggiungiAggiornamento(?, ?, ?)', [data.params.admin, data.params.testo, data.params.id])
            .then(()=>{respond(response, 200)})
            .catch((err)=>{respond(response, 500, err)})
        }
    },
    Commento: {
        handler: (data, response) => {
            paramQuery('INSERT INTO Commento(ID_MISSIONE, testo, ID_ADMIN) VALUES (?, ?, ?)', [data.params.id, data.params.testo, data.params.admin])
            .then(()=>{respond(response, 200)})
            .catch((err)=>{respond(response, 500, err)})
        }
    },
    ChiudiMissione: {
        handler: (data, response) => {
            paramQuery('CALL ChiudiMissione(?, ?)', [data.params.missione, data.params.successo])
            .then(()=>{respond(response, 200)})
            .catch((err)=>{respond(response, 500, err)})
        }
    }
}

var connection = mysql.createConnection({ //Login di default per testare più velocemente
    host     : 'localhost',
    user     : 'admin',
    password : '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    database : 'soccorso'
});

connection.connect();

const headers = {
    'Access-Control-Allow-Origin': 'https://localhost:8888',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    'Access-Control-Max-Age': 2592000,
    'Access-Control-Allow-Headers': '*'
};

const options = {
    key: readFileSync(process.cwd()+"/certs/server.key"),
    cert: readFileSync(process.cwd()+"/certs/server.cert")
}

var contentTypes = { // Works without it but this gets rid of a warning about missing types on scripts
    '.html': "text/html",
    '.css':  "text/css",
    '.js':   "text/javascript"
};

function respond(response, statusCode, body, customHeaders){
    //console.log(`running with context ${statusCode}, ${body}`);
    var resHeaders = headers;
    if(customHeaders){
        for(var key in customHeaders){
            resHeaders[key] = customHeaders[key];
        }
    }
    response.writeHead(statusCode, resHeaders);
    if(body instanceof Error) console.error(body);
    else if(body) response.write(body);
    response.end();
}

function serveFile(filename, response){
    readFile(filename, "UTF-8", function(err, file) {
        if(err && err.code == "ENOENT") {
            respond(response, 404, "404 Not found");
            return;
        }
        else if(err) {
            console.log(err);
            respond(response, 500, err);
            return;
        }

        var typeHeaders = {};
        var contentType = contentTypes[extname(filename)];
        if (contentType) typeHeaders["Content-Type"] = contentType;
        respond(response, 200, file, typeHeaders);
    });
}

function paramQuery(sql, params){
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, res, fields)=>{
            if(err) {
                reject(err.code);
                return;
            }
            resolve([res, fields]);
        })
    })
}

async function recursiveQuery(sql, array, param){
    if(!array) return new Promise((resolve)=>{resolve();})
    return new Promise((resolve, reject) => {
        if(array.length < 1){
            resolve();
            return;
        }
        connection.query(sql, [array.pop(), param], async (err) => {
            if(err) {
                reject(err.message);
                return;
            }
            try {
                await recursiveQuery(sql, array, param);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });
}

function getTableHeader(field){
    const fieldTypes = {
        expand: 'EXT',
        add: 'ADD',
        select: 'SEL',
        selectMultiple: 'MSEL'
    };
    if(field.startsWith(fieldTypes.expand)){
        return{
            name: field.substring(fieldTypes.expand.length + 1),
            fieldType: fieldTypes.expand
        };
    };
    if(field.startsWith(fieldTypes.add)){
        return{
            name: field.substring(fieldTypes.add.length + 1),
            fieldType: fieldTypes.add
        };
    };
    if(field.startsWith(fieldTypes.select)){
        return{
            name: field.substring(fieldTypes.select.length + 1),
            fieldType: fieldTypes.select
        };
    };
    if(field.startsWith(fieldTypes.selectMultiple)){
        return{
            name: field.substring(fieldTypes.selectMultiple.length + 1),
            fieldType: fieldTypes.selectMultiple
        }
    }
    return {
        name:field,
        fieldType: null
    };
}

function convertType(value, type){
    switch(type){
        case 'DATETIME':
            if(!value) return null;
            var date = new Date(value);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        case 'DATE':
            if(!value) return null;
            return new Date(value).toLocaleDateString();
        default:
            return value;
    }
}

function parseRes(result, fields){
    // Fixes for when the query is a SP call instead of pure sql
    if(result[1] && result[1].constructor.name == 'OkPacket'){var result = result[0]}
    // For some reason fields turn into a matrix where the second array is undefined, instanceof is to prevent failing when query returns one field
    if(fields && !fields[1] && fields[0] instanceof Array){ var fields = fields[0]}
    var res = {headers:[],entries:[]};
    for(var field of fields){
        res.headers.push(getTableHeader(field.name));
    }
    var fieldsArray = Array.from(fields);
    for(const row of result){
        var rowFinal = [];
        for(var i = 0; i < fieldsArray.length; i++){
            rowFinal.push(convertType(Object.entries(row)[i][1], mysql.Types[fieldsArray[i].type]));
        }
        res.entries.push(rowFinal);
    }
    return res;
}

function parseQuery(request, response){
    var postValue = '';
    request.on("data", (chunk) => {
        postValue += chunk;
    })
    request.on("end", () => {
        var data = JSON.parse(postValue);
        switch(data.type){
            case 'insertRequest':
                var reqHandler = customInsert[data.tableName].handler;
                if(reqHandler) reqHandler(data, response, request);
                else respond(response, 403);
                break;
            case 'selectRequest':
                var sql = customSelect[data.tableName];
                if(!sql){
                    respond(response, 403);
                    break;
                }
                paramQuery(sql)
                .then(([result, fields])=>{respond(response, 200, JSON.stringify(parseRes(result, fields)))})
                .catch((err)=>{respond(response, 500, err)})
                break;
            case 'queryRequest':
                var sql = customQueries[data.tableName][data.fieldName];
                if(!sql){
                    respond(response, 403);
                    break;
                }
                // Special case where the query requires the same ID twice
                if(data.tableName == 'Utente' && data.fieldName == 'Storico') data.id = [data.id, data.id];
                paramQuery(sql, data.id)
                .then(([result, fields])=>{respond(response, 200, JSON.stringify(parseRes(result, fields)))})
                .catch((err)=>{respond(response, 500, err)})
                break;
            default:
                respond(response, 403);
                break;
        }
    })
}

function parseLogin(request, response){
    var value = ''
    request.on('data', (chunk) => {
        value += chunk;
    })
    request.on('end', () => {
        value = JSON.parse(value)
        connection.changeUser({
            user: value.username,
            password: value.password
        },
        (err) => {
            if(err){
                respond(response, 403, err.code);
            }
            else respond(response, 200);
        })
    })
}

function validateRequest(request, response){
    const code = new URL(`https://localhost:${port}${request.url}`).searchParams.get("code");
    if(code){
        paramQuery('UPDATE Richiesta r SET verificato = true WHERE r.ID = (SELECT r2.ID FROM Richiesta r2 WHERE r2.string = ?);', code)
        .then(()=>{respond(response, 200, "Richiesta verificata con successo")})
        .catch((err)=>{respond(response, 500, err.message)})
    } 
}

function parsePOST(request, response, uri){
    switch(uri){
        case "/query":
            if(connection && connection.state == 'authenticated'){
                    parseQuery(request,response);
                }
            else respond(response, 500, 'Database connection failed')
            break;
        case "/login":
            parseLogin(request, response);
            break;
        default:
            respond(response, 403);
    }
    
}

function parseGET(request, response, uri){
    switch(uri){
        case "/validate":
            validateRequest(request, response);
            break;
        case "/":
            uri = "/login.html";
            serveFile(join(process.cwd(), uri), response);
            break;
        default:
            serveFile(join(process.cwd(), uri), response);
    }
}

createServer(options, function(request, response) {
    var uri = new URL(`https://localhost:${port}${request.url}`).pathname;
    if (request.method && request.method == "POST") {
        parsePOST(request, response, uri);
    }
    else if(request.method && request.method == "GET"){
        parseGET(request, response, uri);
    }
    else if(request.method && request.method == "OPTIONS"){
        respond(response, 204);
    }
    else{
        respond(response, 403);
    }
    
}).listen(port);

console.log(`Server running at\n=> https://localhost:${port}/`);