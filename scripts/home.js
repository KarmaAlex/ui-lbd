var requestModal = document.getElementById("requestModal");
var requestBtn = document.getElementById("queryButton2");
var requestClose = document.getElementById("requestClose");
var queryBtn = document.getElementById("queryButton");  

var outputTable = document.getElementById("outputTable");
var outputHead = document.getElementById("outputHead");
var outputBody = document.getElementById("outputBody");

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
var requestSubmit = document.getElementById("requestSubmit");
var requestSent = document.getElementById("requestSent");

const ENDPOINTS = {
    query: "/query",
    validate: "/validate",
    login: "/login"
}

var url = "https://localhost:8888"

// Modal setup
requestBtn.onclick = (ev) => {
    for(item in requestVars){
        requestVars[item].element.value = '';
        requestVars[item].error.innerText = '';
    }
    requestSent.innerText = '';
    requestPhoto.value = '';
    requestModal.style.display = "block";
}
requestClose.onclick = (ev) => { requestModal.style.display = "none"; }
window.onclick = (ev) => {
    if(ev.target == requestModal){
        requestModal.style.display = "none";
    }
}
// Assign query functions
queryBtn.onclick = async (ev) => {
    var res = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ value1:"test1", value2:"test2"})
    });
    res.json().then((json)=>{
        updateTable(json)
    })
}
// Print query output on table
function updateTable(res){
    var children = outputHead.children
    while(children.length>0){children[0].remove()}
    for(var key in res[0]){
        var th = document.createElement("th")
        th.innerText = key
        outputHead.appendChild(th)
    }
    children = outputBody.children
    while(children.length>0){children[0].remove()}
    for(var item of res){
        var tr = document.createElement("tr")
        for(var key in item){
            var td = document.createElement("td")
            td.innerText = item[key]
            tr.appendChild(td)
        }
        outputBody.appendChild(tr)
    }
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

requestSubmit.onclick = async (ev)=>{
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
    var responseBody = {
        type:'insertRequest',
        name:requestVars.name.element.value,
        email:requestVars.email.element.value,
        pos:requestVars.pos.element.value,
        desc: requestVars.desc.element.value,
        photo: {
            file: null,
            filename: null
        }
    }
    if(requestVars.photo.element.files && requestVars.photo.element.files[0]){
        const reader = new FileReader();
        reader.onload = (ev) => {
            responseBody.photo.file = ev.target.result;
            var name = requestVars.photo.element.value.split("\\");
            name = name[name.length - 1];
            responseBody.photo.filename = name;
            sendPOST(responseBody, ENDPOINTS.query);
        }
        reader.readAsDataURL(requestVars.photo.element.files[0]);
    }
    else{
        const response = await sendPOST(responseBody, ENDPOINTS.query);
        if(response){
            await response.text().then((text)=>{
                requestSent.innerHTML = "Verifica la richiesta andando su questo <a href="+text+">link</a>";
            })
        }
    }
}


