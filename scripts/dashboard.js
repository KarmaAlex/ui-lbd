const ENDPOINTS = {
    query: "/query",
    validate: "/validate",
    login: "/login"
}

var url = "https://localhost:8888"

var outputTable = document.getElementById("outputTable");
var outputHead = document.getElementById("outputHead");
var outputBody = document.getElementById("outputBody");

const switchBtns = document.getElementsByClassName("switch");
const loadBtns = document.getElementsByClassName("load");

var visibleId = 'insertRichiesta';
document.getElementById(visibleId).className = 'enabled';

for(const element of switchBtns){
    element.onclick = switchTab
}

for (const element of loadBtns){
    element.onclick = loadTable
}

function switchTab(event){
    var id = event.currentTarget.id;
    if(visibleId == id) return;
    document.getElementById(visibleId).className = 'disabled';
    visibleId = "insert"+event.currentTarget.id.substring(6)
    document.getElementById(visibleId).className = 'enabled';
}

function updateTable(res){
    res.json().then((data)=>{
        var children = outputHead.children
        while(children.length>0){children[0].remove()}
        for(const key of data.headers){
            var th = document.createElement("th");
            th.innerText = key;
            outputHead.appendChild(th);
        }
        children = outputBody.children;
        while(children.length>0){children[0].remove()}
        for(var item of data.entries){
            var tr = document.createElement("tr");
            for(var value of item){
                var td = document.createElement("td");
                td.innerText = value;
                tr.appendChild(td);
            }
            outputBody.appendChild(tr);
        }
    })
    
}

async function loadTable(event){
    const tableName = event.currentTarget.id.substring(4);
    const res = await sendPOST({
        type: 'selectRequest',
        tableName: tableName
    }, ENDPOINTS.query);
    //console.log(res);
    updateTable(res);
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