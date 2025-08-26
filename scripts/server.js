var https = require("https"), path = require("path"), fs = require("fs"), mysql = require("mysql"), port = 8888;

var connection = mysql.createConnection({ //TODO: Remove
    host     : 'localhost',
    user     : 'admin',
    password : '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    database : 'soccorso'
});

connection.connect();

//TODO: look into paging data (unlikely to happen)
//TODO: limit team selection to teams that are not in active missions and do the same for vehicles and materials

const options = {
    key: fs.readFileSync(process.cwd()+"/certs/server.key"),
    cert: fs.readFileSync(process.cwd()+"/certs/server.cert")
}

const headers = {
    'Access-Control-Allow-Origin': 'https://localhost:8888',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    'Access-Control-Max-Age': 2592000,
    'Access-Control-Allow-Headers': '*'
};

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

function paramQuery(sql, params){
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err,res)=>{
            if(err) reject(err.code);
            resolve(res);
        })
    })
}

const customSelect = {
    Richiesta: 'SELECT r.nome as Nome, r.email as Email, r.IP, r.stato as Stato, r.verificato as Verificato, r.`data` as `Data`, d.ID as EXT_Descrizione FROM Richiesta r JOIN Desc_richiesta d ON r.ID = d.ID_RICHIESTA;',
    Missione: 'SELECT m.ID_RICHIESTA as EXT_Richiesta, u.nome_utente as Responsabile, m.obiettivo as Obiettivo, m.inizio as Inizio, m.fine as Fine, m.durata as Durata, m.completata as Completata,m.successo as Successo, u2.nome_utente as Caposquadra, m.ID as EXT_Materiale, m.ID as EXT_Mezzo, m.ID as ADD_Commento, m.ID as ADD_Aggiornamento FROM Missione m JOIN Utente u ON m.ID_ADMIN = u.ID JOIN Squadra s ON m.ID_SQUADRA = s.ID JOIN Utente u2 ON u2.ID = s.ID_CAPO;',
    Squadra: 'SELECT s.ID as "Numero squadra", u.nome_utente as "Nome utente", s.ID as EXT_Membri FROM Utente u JOIN Squadra s ON s.ID_CAPO = u.ID ORDER BY s.ID ASC;',
    Utente: 'SELECT u.nome_utente AS "Nome utente", u.admin AS Admin, u.in_squadra AS "In squadra", u.monte_ore as "Monte ore", u.ID as EXT_Anagrafica, u.ID as EXT_Abilita, u.ID as EXT_Patente FROM Utente u;',
    Abilita: 'SELECT a.`desc` as Descrizione FROM Abilita a;',
    Patente: 'SELECT p.numero as Numero, p.tipo as Tipo FROM Patente p;',
    Mezzo: 'SELECT m.nome as Nome, m.`desc` as Descrizione, m.targa as Targa from Mezzo m;',
    Materiale: 'SELECT m.nome as Nome, m.`desc` as Descrizione, m.cod_mat as "Codice materiale" FROM Materiale m;'
}

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
            .then(()=>{
                respond(response, 200, result[0].link);
            })
            .catch((err)=>{
                respond(response, 500, err);
            })
        }
    },
    Missione: {
        handler: (data, response) => {
            connection.beginTransaction((err)=>{
                if(err) {
                    respond(response, 500, err.code);
                    return;
                }
                paramQuery('SELECT CreaMissione(?, ?, ?, ?) as id_missione', [data.params.richiesta, data.params.admin, data.params.squadra, data.params.obiettivo])
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
                .then((res)=>{
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
    }
}

const customQueries = {
    Richiesta:{
        Descrizione: 'SELECT d.posizione as Posizione, d.foto as Foto, d.descrizione as Descrizione FROM Desc_richiesta d WHERE d.ID = ?'
    },
    insMissione: {
        Richieste: 'SELECT r.nome as Nome, r.email as Email, r.IP, r.stato as Stato, r.verificato as Verificato, r.`data` as `Data`, d.ID as EXT_Descrizione, r.ID as SEL_Richiesta FROM (Richiesta r JOIN Desc_richiesta d ON r.ID = d.ID_RICHIESTA) WHERE r.verificato = 1 AND r.ID not in (SELECT r1.ID FROM Richiesta r1 JOIN Missione m WHERE r1.ID = m.ID_RICHIESTA ) AND r.stato = "in attesa";',
        Admin: 'SELECT u.nome_utente as "Nome utente", u.ID as SEL_Utente FROM Utente u WHERE u.admin = true;',
        Squadre: 'SELECT s.ID as "Numero squadra", u.nome_utente AS Caposquadra, s.ID as EXT_Membri, s.ID as SEL_Squadra FROM Squadra s JOIN Utente u WHERE s.ID_CAPO = u.ID ORDER BY s.ID ASC;',
        Mezzi:'SELECT m.nome as Nome, m.`desc` as Descrizione, m.targa as Targa, m.ID as MSEL_Mezzo from Mezzo m;',
        Materiali: 'SELECT m.nome as Nome, m.`desc` as Descrizione, m.cod_mat as "Codice materiale", m.ID as MSEL_Materiale FROM Materiale m;'
    },
    Missione: {
        Richiesta: 'SELECT r.nome as Nome, r.email as Email, r.IP, r.stato as Stato, r.verificato as Verificato, r.`data` as `Data` FROM Richiesta r JOIN Desc_richiesta d ON r.ID = d.ID_RICHIESTA WHERE r.ID = ?;',
        Mezzo: 'SELECT m.nome as Nome, m.`desc` as Descrizione, m.targa as Targa FROM Mezzo m JOIN assegna_mezzo am ON am.ID_MISSIONE = ? AND m.ID = am.ID_MEZZO;',
        Materiale: 'SELECT m.nome as Nome, m.`desc` as Descrizione, m.cod_mat as "Codice Materiale" FROM Materiale m JOIN assegna_materiale am ON am.ID_MISSIONE = ? AND m.ID = am.ID_MATERIALE;',
        Commento: 'SELECT c.testo as Testo, u.nome_utente as "Inserito da" FROM Commento c JOIN Utente u ON c.ID_ADMIN = u.ID WHERE c.ID_MISSIONE = ?;',
        Aggiornamento: 'SELECT a.testo as Testo, a.`timestamp` as "Creato" FROM Aggiornamento a WHERE a.ID_MISSIONE = ?;'
    },
    insUtente: {
        Abilita: 'SELECT a.desc as Descrizione, a.ID as MSEL_Abilita FROM Abilita a;',
        Patente: 'SELECT p.tipo as TIPO, p.numero as Numero, p.ID as MSEL_Patente from Patente p;'
    },
    Utente: {
        Anagrafica: 'SELECT a.nome as Nome, a.cognome as Cognome, a.cf as "Codice fiscale", a.luogo_nasc as "Luogo di nascita", a.data_nasc as "Data di nascita" From Anagrafica a WHERE a.ID_UTENTE = ?;',
        Abilita: 'SELECT a.`desc` as Descrizione FROM Abilita a JOIN assegna_abilita aa ON a.ID = aa.ID_ABILITA WHERE aa.ID_UTENTE = ?;',
        Patente: 'SELECT p.numero as Numero, p.tipo as Tipo FROM Patente p JOIN assegna_patente ap ON p.ID = ap.ID_PATENTE WHERE ap.ID_UTENTE = ?'
    },
    insSquadra: {
        Caposquadra: 'SELECT u.nome_utente as "Nome utente", u.ID as SEL_Caposquadra FROM Utente u;',
        Membri: 'SELECT u.nome_utente as "Nome utente", u.ID as MSEL_Utenti FROM Utente u;'
    },
    Squadra: {
        Membri: 'SELECT u.nome_utente as "Nome utente" FROM Utente u JOIN (SELECT ass.ID_UTENTE, ass.ID_SQUADRA FROM Squadra s JOIN assegna_squadra ass ON s.ID = ass.ID_SQUADRA AND s.ID = ? ) s ON u.ID = s.ID_UTENTE'
    }
}

var contentTypes = { // Works without it but this gets rid of a warning about missing types on scripts
    '.html': "text/html",
    '.css':  "text/css",
    '.js':   "text/javascript"
};

function serveFile(filename, response){
    fs.readFile(filename, "UTF-8", function(err, file) {
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
        var contentType = contentTypes[path.extname(filename)];
        if (contentType) typeHeaders["Content-Type"] = contentType;
        respond(response, 200, file, typeHeaders);
    });
}

function respond(response, statusCode, body, customHeaders){
    //console.log(`running with context ${statusCode}, ${body}`);
    var resHeaders = headers;
    if(customHeaders){
        for(var key in customHeaders){
            resHeaders[key] = customHeaders[key];
        }
    }
    response.writeHead(statusCode, resHeaders);
    if(body) response.write(body);
    response.end();
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
                break;
            case 'selectRequest':
                var sql = customSelect[data.tableName];
                if(!sql) {
                    respond(response, 403);
                    break;
                }
                paramQuery(sql)
                .then((result)=>{
                    var res = {headers:[],entries:[]};
                    for(const field in result[0]){
                        res.headers.push(getTableHeader(field));
                    }
                    for(const row of result){
                        var rowFinal = [];
                        for(const field in row){
                            rowFinal.push(row[field]);
                        }
                        res.entries.push(rowFinal);
                    }
                    respond(response, 200, JSON.stringify(res));
                    
                })
                .catch((err)=>{respond(response, 500, err)})
                break;
            case 'queryRequest':
                var sql = customQueries[data.tableName][data.fieldName];
                if(!sql){
                    respond(response, 403);
                    return;
                }
                paramQuery(sql, data.id)
                .then((result)=>{
                    var res = {headers:[],entries:[]};
                    for(const field in result[0]){
                        res.headers.push(getTableHeader(field));
                    }
                    for(const row of result){
                        var rowFinal = [];
                        for(const field in row){
                            rowFinal.push(row[field]);
                        }
                        res.entries.push(rowFinal);
                    }
                    respond(response, 200, JSON.stringify(res));
                    
                })
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
        if(connection){
            if(connection.state == "connected") connection.end();
        }
        connection = mysql.createConnection({
            host     : 'localhost',
            user     : value.username,
            password : value.password,
            database : 'soccorso'
        });
        connection.connect((err)=>{
            if(err){
                respond(response, 403, err.code);
            }
            else respond(response, 200, JSON.stringify({token: "tokenValue"}));
        });
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
            serveFile(path.join(process.cwd(), uri), response);
            break;
        default:
            serveFile(path.join(process.cwd(), uri), response);
    }
}

https.createServer(options, function(request, response) {
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