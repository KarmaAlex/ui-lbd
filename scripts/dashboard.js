const ENDPOINTS = {
    query: "/query",
    validate: "/validate",
    login: "/login"
}

var url = "https://localhost:8888"

var inputData = {};

var outputTable = document.getElementById("outputTable");
var outputHead = document.getElementById("outputHead");
var outputBody = document.getElementById("outputBody");

var extraModal = document.getElementById("extraModal");
var extraClose = document.getElementById("extraClose");
extraClose.onclick = (ev) => { extraModal.style.display = "none"; }
window.onclick = (ev) => {
    if(ev.target == extraModal){
        extraModal.style.display = "none";
    }
}
var extraLabel = document.getElementById("extraLabel");
var extraTable = document.getElementById("extraTable");
var extraHead = document.getElementById("extraHead");
var extraBody = document.getElementById("extraBody");

const switchBtns = document.getElementsByClassName("switch");
const loadBtns = document.getElementsByClassName("load");
const submitBtns = document.getElementsByClassName("submit");

const submitHandlers = {
    'Richiesta' : async () => {
        const requestVars = {
            name: {
                error: document.getElementById("requestNameErr"),
                required: true
            },
            email: {
                error: document.getElementById("requestEmailErr"),
                required: true
            },
            pos: {
                error: document.getElementById("requestPosErr"),
                required: true
            },
            photo: {
                error: document.getElementById("requestPhotoErr"),
                required: false
            },
            desc: {
                error: document.getElementById("requestDescErr"),
                required: false
            }
        }
        var requestSent = document.getElementById("requestSent");

        var err = false;
        for(item in requestVars){ requestVars[item].error.innerText=''; }
        requestSent.innerHTML = '';
        for(item in requestVars){
            if(requestVars[item].required && inputData[item] == ''){
                err = true;
                requestVars[item].error.innerText = "Campo richiesto"
            }
        }
        if (err) return;
        var responseBody = {
            type:'insertRequest',
            tableName: visibleId.substring(6),
            params:{
                name:inputData.name,
                email:inputData.email,
                pos: inputData.pos,
                desc: inputData.desc,
                file: inputData.file ? {
                    data: inputData.file.data,
                    filename: inputData.file.filename
                } : null
            }
        }
        console.log(responseBody)
        var response = await sendPOST(responseBody, ENDPOINTS.query);
        if(response){
            await response.text().then((text)=>{
                requestSent.innerHTML = "Verifica la richiesta andando su questo <a href="+text+">link</a>";
                resetValues[responseBody.tableName]();
            })
        }
    }
}

const resetValues = {
    Richiesta: () => {
        for(var child of document.getElementById("insertRichiesta").children){
            if(child.tagName.toLowerCase() == 'label' || child.tagName.toLowerCase() == 'input' || child.tagName.toLowerCase() == 'textarea'){
                if(child.id == 'requestSent') continue;
                child.value = '';
            }
        }
    },
    Utente: () => {
        return;
    },
    Missione: () => {
        return;
    },
    Squadra: () => {
        return;
    },
    Materiale: () => {
        return;
    },
    Patente: () => {
        return;
    },
    Mezzo: () => {
        return;
    },
    Abilita: () => {
        return;
    }
}

var visibleId = 'insertRichiesta';
var inputTableName = visibleId.substring(6);
document.getElementById(visibleId).className = 'enabled';

var activeTable = '';



function init(){
    for(const element of switchBtns){
        element.onclick = switchTab
    }

    for (const element of loadBtns){
        element.onclick = loadTable
    }

    for (const element of submitBtns){
        element.onclick = submit
    }

    document.getElementById('switchRichiesta').click();
    document.getElementById('loadRichiesta').click();
}

init();

async function readFileAsync(file){
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onerror = () => {
            reader.abort();
            reject(new DOMException("Failed to parse file"));
        }
        reader.onload = () => {
            resolve(reader.result)
        }
        reader.readAsDataURL(file);
    })
}

async function loadInputVars(){
    for(var child of document.getElementById(visibleId).children){
        if(child.tagName.toLowerCase() == 'input' || child.tagName.toLowerCase() == 'textarea'){ //TODO find better solution
            if(child.type && child.type == 'file'){ //This means only one file per submission
                inputData.file = null;
                if(child.files && child.files[0]){
                    inputData.file = {};
                    var name = child.value.split("\\");
                    name = name[name.length - 1];
                    inputData.file.filename = name;
                    inputData.file.data = await readFileAsync(child.files[0]);
                }
            }
            else{
                inputData[child.id.substring(inputTableName.length).toLowerCase()] = child.value;
            }
        }
    }
}

async function submit(){
    await loadInputVars();
    submitHandlers[inputTableName]();
}

function switchTab(event){
    var id = event.currentTarget.id;
    if(visibleId == id) return;
    document.getElementById(visibleId).className = 'formDisabled';
    visibleId = "insert"+event.currentTarget.id.substring(6);
    inputTableName = visibleId.substring(6);
    resetValues[visibleId.substring(6)]();
    inputData = {};
    document.getElementById(visibleId).className = 'formEnabled';
}

async function extraButton(event){
    await loadExtra(event.currentTarget.parentElement.id, event.currentTarget.name);
    extraModal.style.display = 'block';
}

function addEntry(event){
    console.log(event.currentTarget.parentElement.id);
}

function updateRecords(res){
    const fieldTypes = {
        expand: 'EXT',
        add: 'ADD',
        select: 'SEL'
    }
    res.json().then((data)=>{
        var dataTable = [];
        for(var i = 0; i<data.headers.length; i++){
            var col = [];
            var header = data.headers[i];
            col.push(header.name);
            for(var item of data.entries){
                if(item[i] && header.fieldType && (header.fieldType == fieldTypes.expand || header.fieldType == fieldTypes.add)){
                    var viewBtn = document.createElement("button");
                    viewBtn.innerText = 'Vedi';
                    viewBtn.name = header.name;
                    viewBtn.onclick = extraButton;
                    var div = document.createElement("div");
                    div.id = item[i];
                    div.appendChild(viewBtn);
                    if(header.fieldType == fieldTypes.add){
                        var addBtn = document.createElement("button");
                        addBtn.innerText = 'Aggiungi';
                        addBtn.name = header.name;
                        addBtn.onclick = addEntry;
                        div.appendChild(addBtn);
                    }
                    col.push(div);
                }
                else col.push(item[i]);
            }
            dataTable.push(col);
        }

        var children = outputHead.children
        while(children.length>0){children[0].remove()}

        for(var i = 0; i < dataTable.length; i++){
            var th = document.createElement("th");
            th.innerText = dataTable[i][0];
            outputHead.appendChild(th);
        }
        
        children = outputBody.children;
        while(children.length>0){children[0].remove()}

        for(var i = 1; i < dataTable[0].length; i++){
            var tr = document.createElement("tr");
            for(var j = 0; j < dataTable.length; j++){
                var td = document.createElement("td");
                if(dataTable[j][i] instanceof HTMLElement){
                    td.appendChild(dataTable[j][i]);
                }
                else td.innerText = dataTable[j][i];
                tr.appendChild(td);
            }
            outputBody.appendChild(tr);
        }
    })
    
}

async function loadTable(event){
    const tableName = event.currentTarget.id.substring(4);
    var res = await sendPOST({
        type: 'selectRequest',
        tableName: tableName
    }, ENDPOINTS.query);
    updateRecords(res);
    activeTable = tableName;
}

function updateExtra(response){
    response.json().then((data)=>{
        var children = extraHead.children
        while(children.length>0){ children[0].remove() }

        for(var key of data.headers){
            var th = document.createElement("th")
            th.innerText = key
            extraHead.appendChild(th)
        }
        
        children = extraBody.children;
        while(children.length>0){ children[0].remove() }

        for(var entry of data.entries){
            var tr = document.createElement("tr");
            for(var item of entry){
                var td = document.createElement("td");
                td.innerText = item;
                tr.appendChild(td);
            }
            extraBody.appendChild(tr);
        }
    })
}

async function loadExtra(id, fieldName){
    var res = await sendPOST({
        type: 'queryRequest',
        tableName: activeTable,
        fieldName: fieldName,
        id: id
    }, ENDPOINTS.query);
    updateExtra(res);
}

async function sendPOST(responseBody, endpoint){
    var finalUrl = url;
    if(endpoint) finalUrl+=endpoint;
    const res = await fetch(finalUrl,
    {
        method:"POST",
        body: JSON.stringify(responseBody)
    });
    if(res.ok){
        return res;
    }
    else{
        return null;
        //TODO: Error handling
    }
}