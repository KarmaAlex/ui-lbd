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
    'Richiesta': 'call getRichieste()'
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

var contentTypesByExtension = { // May or may not be necessary, technically using binary with text type should work
    '.html': "text/html",
    '.css':  "text/css",
    '.js':   "text/javascript"
};

function serveFile(filename, response){
    fs.readFile(filename, "binary", function(err, file) {
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
        respond(response, 200, file);
    });
}

function respond(response, statusCode, body){
    response.writeHead(statusCode, headers);
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
                var tempname = null
                var ext = null
                if(data.photo.file){
                    const buffer = Buffer.from(data.photo.file.split(",")[1], "base64");
                    var i = 1;
                    var filename = path.basename(data.photo.filename).split(".");
                    filename.pop();
                    filename = filename.join(".");
                    ext = path.extname(data.photo.filename);
                    tempname = filename
                    while(fs.existsSync("./res/" + tempname + ext)){
                        tempname = filename + "(" + i + ")";
                        i++;
                    }
                    fs.writeFileSync("./res/" + tempname + ext, buffer, {flag:"w+"});
                }
                var ip = request.socket.remoteAddress.split(":");
                ip = ip[ip.length - 1];
                connection.query("SELECT InserisciRichiesta(?, ?, ?, ?, ?, ?) as link",
                [data.name, data.email, ip, data.pos, (tempname && ext) ? path.resolve("./res/" + tempname + ext): null, data.desc],
                (err, result) => {
                    if(err){
                        console.log(err);
                        respond(response, 500);
                        return;
                    }
                    else if(result){
                        respond(response, 200, result[0].link);
                        return;
                    }
                })
                break;
            case 'selectRequest':
                var res = {headers:[], entries:[]};
                var sql = customSelect[data.tableName];
                if(!sql) {
                    respond(response, 403);
                    break;
                }
                var query = connection.query(sql);
                query.on('fields', (fields)=>{
                    for(const field of fields){
                        if(field.name.startsWith("ID")){
                            res.headers.push({
                                name: field.name.substring(3),
                                isExtKey: true
                            })
                        }
                        else res.headers.push({
                            name:field.name,
                            isExtKey: false
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
    const code = new URL(request.url).searchParams.get("code");
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

function parsePOST(request, response){
    const uri = request.url;
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

function parseGET(request, response){
    var uri = request.url;
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
    if (request.method && request.method == "POST") {
        parsePOST(request, response);
    }
    else if(request.method && request.method == "GET"){
        parseGET(request, response);
    }
    else if(request.method && request.method == "OPTIONS"){
        respond(response, 204);
    }
    else{
        respond(response, 403);
    }
    
}).listen(port);

console.log("Server running at\n=> https://localhost:" + port + "/");