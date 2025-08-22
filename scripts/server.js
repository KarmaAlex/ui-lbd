var https = require("https"), path = require("path"), fs = require("fs"), mysql = require("mysql"), port = 8888;

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

const customSelect = {
    'Richiesta': 'SELECT r.nome as Nome, r.email as Email, r.IP, r.stato as Stato, r.verificato as Verificato, r.`data` as `Data`, d.ID as EXT_Descrizione FROM Richiesta r JOIN Desc_richiesta d ON r.ID = d.ID_RICHIESTA;'
}

const customInsert = {
    'Richiesta': {
        prepareData: (data, request)=>{
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
            return [data.params.name, data.params.email, ip, data.params.pos, fileLink, data.params.desc];
        },
        sql: 'SELECT InserisciRichiesta(?, ?, ?, ?, ?, ?) as link',
        responseHandler: (response, result) => {
            respond(response, 200, result[0].link);
        }
    }
}

const customQueries = {
    "Richiesta":{
        "Descrizione": "SELECT d.posizione as Posizione, d.foto as Foto, d.descrizione as Descrizione FROM Desc_richiesta d WHERE d.ID = ?"
    }
}

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'user',
  password : 'user',
  database : 'soccorso'
});

connection.connect();

var contentTypesByExtension = { // Works without it but this gets rid of a warning about missing types on scripts
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
        var contentType = contentTypesByExtension[path.extname(filename)];
        if (contentType) typeHeaders["Content-Type"] = contentType;
        respond(response, 200, file, typeHeaders);
    });
}

function respond(response, statusCode, body, customHeaders){
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

async function parseQuery(request, response){
    var postValue = '';
    request.on("data", function(chunk){
        postValue += chunk;
    })
    request.on("end",_ => {
        var data = JSON.parse(postValue);
        switch(data.type){
            case 'insertRequest':
                var params = customInsert[data.tableName].prepareData(data, request);
                connection.query(customInsert[data.tableName].sql, params,
                (err, result) => {
                    if(err){
                        console.log(err);
                        respond(response, 500);
                        return;
                    }
                    else if(result){
                        customInsert[data.tableName].responseHandler(response, result);
                        return;
                    }
                })
                break;
            case 'selectRequest':
                const fieldTypes = {
                    expand: 'EXT',
                    add: 'ADD',
                    select: 'SEL'
                }
                var res = {headers:[], entries:[]};
                var sql = customSelect[data.tableName];
                if(!sql) {
                    respond(response, 403);
                    break;
                }
                var query = connection.query(sql);
                query.on('fields', (fields)=>{
                    for(const field of fields){
                        if(field.name.startsWith(fieldTypes.expand)){
                            res.headers.push({
                                name: field.name.substring(fieldTypes.expand.length + 1),
                                fieldType: fieldTypes.expand
                            })
                        }
                        else if(field.name.startsWith(fieldTypes.add)){
                            res.headers.push({
                                name: field.name.substring(fieldTypes.add.length + 1),
                                fieldType: fieldTypes.add
                            })
                        }
                        else if(field.name.startsWith(fieldTypes.select)){
                            res.headers.push({
                                name: field.name.substring(fieldTypes.select.length + 1),
                                fieldType: fieldTypes.select
                            })
                        }
                        else res.headers.push({
                            name:field.name,
                            fieldType: null
                        });
                    }
                })
                query.on('result',(packet)=>{
                    if(packet.constructor.name === "OkPacket") return;
                    var row = [];
                    for(const entry in packet){
                        row.push(packet[entry]);
                    }
                    res.entries.push(row);
                })
                query.on('end', ()=>{
                    respond(response, 200, JSON.stringify(res));
                    res.headers = [];
                    res.entries = [];
                })
                break;
            case 'queryRequest':
                var res = {headers:[],entries:[]};
                var sql = customQueries[data.tableName][data.fieldName];
                if(!sql){
                    respond(response, 403);
                    return;
                }
                var query = connection.query(sql, data.id);
                query.on('fields', (fields)=>{
                    for(const field of fields){
                        res.headers.push(field.name);
                    }
                })
                query.on('result',(packet)=>{
                    if(packet.constructor.name === "OkPacket") return;
                    var row = [];
                    for(const entry in packet){
                        row.push(packet[entry]);
                    }
                    res.entries.push(row);
                })
                query.on('end', ()=>{
                    respond(response, 200, JSON.stringify(res));
                    res.headers = [];
                    res.entries = [];
                })
                break;
            default:
                respond(response, 403);
                break;
        }
    })
}

function parseLogin(request, response){
    //TODO: make this
    respond(response, 200, JSON.stringify({token: "tokenValue"}))
}

function validateRequest(request, response){
    const code = new URL(`https://localhost:${port}${request.url}`).searchParams.get("code");
    if(code){
        connection.query("UPDATE Richiesta r SET verificato = true WHERE r.ID = (SELECT r2.ID FROM Richiesta r2 WHERE r2.string = ?);", code,
        (err)=>{ 
            if(err){
                respond(response, 500, err.message);
            }
            else{
                respond(response, 200, "Richiesta verificata con successo");
            }
        })
    } 
}

function parsePOST(request, response, uri){
    switch(uri){
        case "/query":
            parseQuery(request,response);
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