const ENDPOINTS = {
    query: "/query",
    validate: "/validate",
    login: "/login"
}

var url = "https://localhost:8888"

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
                element: document.getElementById("requestName"),
                error: document.getElementById("requestNameErr"),
                required: true
            },
            email: {
                element: document.getElementById("requestEmail"),
                error: document.getElementById("requestEmailErr"),
                required: true
            },
            pos: {
                element: document.getElementById("requestPos"),
                error: document.getElementById("requestPosErr"),
                required: true
            },
            photo: {
                element: document.getElementById("requestPhoto"),
                error: document.getElementById("requestPhotoErr"),
                required: false
            },
            desc: {
                element: document.getElementById("requestDesc"),
                error: document.getElementById("requestDescErr"),
                required: false
            }
        }
        var requestSent = document.getElementById("requestSent");

        var err = false;
        for(item in requestVars){ requestVars[item].error.innerText=''; }
        requestSent.innerHTML = '';
        for(item in requestVars){
            if(requestVars[item].required && requestVars[item].element.value == ''){
                err = true;
                requestVars[item].error.innerText = "Campo richiesto"
            }
        }
        if (err) return;
        var response;
        var responseBody = {
            type:'insertRequest',
            tableName: visibleId.substring(6),
            params:{
                name:requestVars.name.element.value,
                email:requestVars.email.element.value,
                pos:requestVars.pos.element.value,
                desc: requestVars.desc.element.value,
                file: {
                    data: null,
                    filename: null
                }
            }
        }
        if(requestVars.photo.element.files && requestVars.photo.element.files[0]){
            const reader = new FileReader();
            reader.onload = (ev) => {
                responseBody.params.file.data = ev.target.result;
                var name = requestVars.photo.element.value.split("\\");
                name = name[name.length - 1];
                responseBody.params.file.filename = name;
            }
            reader.readAsDataURL(requestVars.photo.element.files[0]);
            response = await sendPOST(responseBody, ENDPOINTS.query);
        }
        else{
            response = await sendPOST(responseBody, ENDPOINTS.query);
        }
        if(response){
            await response.text().then((text)=>{
                requestSent.innerHTML = "Verifica la richiesta andando su questo <a href="+text+">link</a>";
            })
        }
    }
}

const resetValues = {
    "Richiesta": ()=>{
        document.getElementById("requestName").value = '';
        document.getElementById("requestNameErr").value = '';
        document.getElementById("requestEmail").value = '';
        document.getElementById("requestEmailErr").value = '';
        document.getElementById("requestPos").value = '';
        document.getElementById("requestPosErr").value = '';
        document.getElementById("requestPhoto").value = '';
        document.getElementById("requestPhotoErr").value = '';
        document.getElementById("requestDesc").value = '';
        document.getElementById("requestDescErr").value = '';
    }
}

var visibleId = 'insertRichiesta';
document.getElementById(visibleId).className = 'enabled';

var activeTable = '';

for(const element of switchBtns){
    element.onclick = switchTab
}

for (const element of loadBtns){
    element.onclick = loadTable
}

for (const element of submitBtns){
    element.onclick = submit
}

function submit(){
    submitHandlers[visibleId.substring(6)]();
}

function switchTab(event){
    var id = event.currentTarget.id;
    if(visibleId == id) return;
    document.getElementById(visibleId).className = 'disabled';
    visibleId = "insert"+event.currentTarget.id.substring(6);
    resetValues[visibleId.substring(6)]();
    document.getElementById(visibleId).className = 'enabled';
}

async function extraButton(event){
    await loadExtra(event.currentTarget.id, event.currentTarget.name);
    extraModal.style.display = 'block';
}

function updateRecords(res){
    res.json().then((data)=>{
        var dataTable = [];
        for(var i = 0; i<data.headers.length; i++){
            var col = [];
            var header = data.headers[i];
            col.push(header.name);
            for(var item of data.entries){
                if(header.isExtKey && item[i]){
                    var button = document.createElement("button");
                    button.id = item[i];
                    button.innerText = 'Vedi';
                    button.name = header.name;
                    button.onclick = extraButton;
                    col.push(button);
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