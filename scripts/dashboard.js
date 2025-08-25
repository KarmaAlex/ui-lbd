const ENDPOINTS = {
    query: "/query",
    validate: "/validate",
    login: "/login"
}

var url = "https://localhost:8888"

var inputData = {};

var errorCodes = {
    ER_DUP_ENTRY: 'Elemento duplicato',
    ER_TABLEACCESS_DENIED_ERROR: 'Permessi insufficienti per vedere o modificare la tabella'
}

var outputTable = document.getElementById("outputTable");

var extraModal = document.getElementById("extraModal");
var extraClose = document.getElementById("extraClose");
extraClose.onclick = (ev) => { extraModal.style.display = "none"; }
window.onclick = (ev) => { if(ev.target == extraModal) extraModal.style.display = "none"; }
var extraLabel = document.getElementById("extraLabel");

const switchBtns = document.getElementsByClassName("switch");
const loadBtns = document.getElementsByClassName("load");
const submitBtns = document.getElementsByClassName("submit");

function checkRequired(requestVars){
    var err = false;
    for(item in requestVars){ requestVars[item].error.innerText=''; }
    for(item in requestVars){
        if(requestVars[item].required && inputData[item] == ''){
            err = true;
            requestVars[item].error.innerText = "Campo richiesto"
        }
    }
    return !err;
}

const submitHandlers = {
    Richiesta : async () => {
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
                required: true
            }
        }
        var requestSent = document.getElementById("richiestaSent");

        if(!checkRequired(requestVars)) return;

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

        var response = await sendPOST(responseBody, ENDPOINTS.query);
        if(response.ok){
            await response.text().then((text)=>{
                requestSent.innerHTML = "Verifica la richiesta andando su questo <a href="+text+">link</a>";
                resetValues[responseBody.tableName]();
            })
        }
        else{
            await response.text().then((text)=>{
                requestSent.innerText = text;
            })
        }
    },
    Mezzo: async () => {
        const requestVars = {
            nome: {
                error: document.getElementById("mezzoNomeErr"),
                required: true
            },
            targa: {
                error: document.getElementById("mezzoTargaErr"),
                required: true
            },
            desc: {
                error: document.getElementById("mezzoDescErr"),
                required: false
            }
        };

        if(!checkRequired(requestVars)) return;

        var responseBody = {
            type:'insertRequest',
            tableName: visibleId.substring(6),
            params:{
                nome:inputData.nome,
                targa: inputData.targa,
                desc: inputData.desc
            }
        }
        var response = await sendPOST(responseBody, ENDPOINTS.query);
        if(!response.ok){
            await response.text().then((text)=>{
                alert(errorCodes[text]);
            })
        }
        else resetValues[responseBody.tableName]();
    },
    Materiale: async () => {
        const requestVars = {
            nome: {
                error: document.getElementById("materialeNomeErr"),
                required: true
            },
            cod_mat: {
                error: document.getElementById("materialeCod_matErr"),
                required: true
            },
            desc: {
                error: document.getElementById("materialeDescErr"),
                required: false
            }
        };

        if(!checkRequired(requestVars)) return;

        var responseBody = {
            type:'insertRequest',
            tableName: visibleId.substring(6),
            params:{
                nome:inputData.nome,
                cod_mat: inputData.cod_mat,
                desc: inputData.desc
            }
        }
        var response = await sendPOST(responseBody, ENDPOINTS.query);
        if(!response.ok){
            await response.text().then((text)=>{
                alert(errorCodes[text]);
            })
        }
        else resetValues[responseBody.tableName]();
    },
    Abilita: async () => {
        const requestVars = {
            desc: {
                error: document.getElementById("abilitaDescErr"),
                required: true
            }
        };

        if(!checkRequired(requestVars)) return;

        var responseBody = {
            type:'insertRequest',
            tableName: visibleId.substring(6),
            params:{
                desc: inputData.desc
            }
        }
        var response = await sendPOST(responseBody, ENDPOINTS.query);
        if(!response.ok){
            await response.text().then((text)=>{
                alert(errorCodes[text]);
            })
        }
        else resetValues[responseBody.tableName]();
    },
    Patente: async () => {
        const requestVars = {
            tipo: {
                error: document.getElementById("patenteTipoErr"),
                required: true
            },
            numero: {
                error: document.getElementById("patenteNumeroErr"),
                required: true
            }
        };

        if(!checkRequired(requestVars)) return;

        var responseBody = {
            type:'insertRequest',
            tableName: visibleId.substring(6),
            params:{
                tipo: inputData.tipo,
                numero: inputData.numero
            }
        }
        var response = await sendPOST(responseBody, ENDPOINTS.query);
        if(!response.ok){
            await response.text().then((text)=>{
                alert(errorCodes[text]);
            })
        }
        else {
            resetValues[responseBody.tableName]();
            document.getElementById('patenteSent').innerText = 'Patente inviata con successo'
        }
    },
    Missione: async () => {

    },
    Squadra: async () => {
        var caposquadraErr = document.getElementById('squadraCaposquadraErr');
        var membriErr = document.getElementById('squadraMembriErr');
        var squadraSent = document.getElementById('squadraSent');
        caposquadraErr.innerText = '';
        membriErr.innerText = '';
        var error = false;
        if(!inputData.currentSelected.Caposquadra){
            caposquadraErr.innerText = 'Selezionare un caposquadra';
            error = true;
        }
        if(!inputData.currentSelected.Utenti){
            membriErr.innerText = 'Selezionare almeno un membro';
            error = true;
        }
        if(error) return;

        var responseBody = {
            type: 'insertRequest',
            tableName: visibleId.substring(6),
            params: {
                caposquadra: inputData.currentSelected.Caposquadra,
                membri: inputData.currentSelected.Utenti
            }
        }

        var response = await sendPOST(responseBody, ENDPOINTS.query);
        if(response.ok){
            squadraSent.innerHTML = 'Squadra creata con successo'
            resetValues[responseBody.tableName]();
        }
        else{
            await response.text().then((text)=>{
                squadraSent.innerText = text;
            })
        }
    },
    Utente: async () => {
        const requestVars = {
            nome_utente: {
                error: document.getElementById("utenteNome_utenteErr"),
                required: true
            },
            nome: {
                error: document.getElementById("utenteNomeErr"),
                required: true
            },
            cognome: {
                error: document.getElementById("utenteCognomeErr"),
                required: true
            },
            cf: {
                error: document.getElementById("utenteCFErr"),
                required: true
            },
            luogo_nasc: {
                error: document.getElementById("utenteLuogo_nascErr"),
                required: true
            },
            data_nasc: {
                error: document.getElementById("utenteData_nascErr"),
                required: true
            }
        };

        if(!checkRequired(requestVars)) return;

        var responseBody = {
            type:'insertRequest',
            tableName: visibleId.substring(6),
            params:{
                nome_utente: inputData.nome_utente,
                nome: inputData.nome,
                cognome: inputData.cognome,
                cf: inputData.cf,
                luogo_nasc: inputData.luogo_nasc,
                data_nasc: inputData.data_nasc,
                abilita: inputData.currentSelected.Abilita,
                patente: inputData.currentSelected.Patente
            }
        }
        var response = await sendPOST(responseBody, ENDPOINTS.query);
        if(!response.ok){
            await response.text().then((text)=>{
                alert(errorCodes[text]);
            })
        }
        else {
            resetValues[responseBody.tableName]();
            document.getElementById('patenteSent').innerText = 'Utente creato con successo'
        }
    }
}

function clearInputs(tableName){
    inputData = {};
    for(var child of document.getElementById("insert"+tableName).children){
            if(child.tagName.toLowerCase() == 'label' || child.tagName.toLowerCase() == 'input' || child.tagName.toLowerCase() == 'textarea'){
                if(child.id == tableName.toLowerCase() + 'Sent') continue;
                child.value = '';
            }
        }
}

const resetValues = {
    Richiesta: () => {
        clearInputs('Richiesta');
    },
    Utente: async () => {
        clearInputs('Utente');
        var res = await sendPOST({
            type: 'queryRequest',
            tableName: 'insUtente',
            fieldName: 'Abilita'
        }, ENDPOINTS.query);
        updateTable(res, document.getElementById('utenteAbilita'));
        var res = await sendPOST({
            type: 'queryRequest',
            tableName: 'insUtente',
            fieldName: 'Patente'
        }, ENDPOINTS.query);
        if(res.ok){
            updateTable(res, document.getElementById('utentePatente'));
        }
        else{
            res.text().then((text)=>{
                alert(errorCodes[text] + ' Patente');
            })
        }
        
    },
    Missione: async () => {
        var res = await sendPOST({
            type: 'queryRequest',
            tableName: 'insMissione',
            fieldName: 'Admin'
        }, ENDPOINTS.query);
        updateTable(res, document.getElementById('missioneAdmin'));
        var res = await sendPOST({
            type: 'queryRequest',
            tableName: 'insMissione',
            fieldName: 'Richieste'
        }, ENDPOINTS.query);
        updateTable(res, document.getElementById('missioneRichiesta'));
        var res = await sendPOST({
            type: 'queryRequest',
            tableName: 'insMissione',
            fieldName: 'Squadre'
        }, ENDPOINTS.query);
        updateTable(res, document.getElementById('missioneSquadra'));
    },
    Squadra: async () => {
        var res = await sendPOST({
            type: 'queryRequest',
            tableName: 'insSquadra',
            fieldName: 'Caposquadra'
        }, ENDPOINTS.query);
        updateTable(res, document.getElementById('squadraCaposquadra'));
        var res = await sendPOST({
            type: 'queryRequest',
            tableName: 'insSquadra',
            fieldName: 'Membri'
        }, ENDPOINTS.query);
        updateTable(res, document.getElementById('squadraMembri'));
    },
    Materiale: () => {
        clearInputs('Materiale');
    },
    Patente: () => {
        clearInputs('Patente');
    },
    Mezzo: () => {
        clearInputs('Mezzo');
    },
    Abilita: () => {
        clearInputs('Abilita');
    }
}

var visibleId = '';
var inputTableName = '';
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
    if(visibleId) document.getElementById(visibleId).className = 'formDisabled';
    visibleId = "insert"+event.currentTarget.id.substring(6);
    inputTableName = visibleId.substring(6);
    resetValues[visibleId.substring(6)]();
    document.getElementById(visibleId).className = 'formEnabled';
}

async function extraButton(event){
    var tableName = '';
    var curElement = event.currentTarget;
    while(curElement.parentElement){
        if(curElement.parentElement.tagName == 'TABLE'){
            tableName = curElement.parentElement.getAttribute('name');
            break;
        }
        curElement = curElement.parentElement;
    }
    if(!tableName) tableName = activeTable;

    var res = await sendPOST({
        type: 'queryRequest',
        tableName: tableName,
        fieldName: event.currentTarget.name,
        id: event.currentTarget.parentElement.id.substring(event.currentTarget.name.length+3)
    }, ENDPOINTS.query);
    if(res.ok) {
        updateTable(res, document.getElementById('extraTable'));
        extraModal.style.display = 'block';
    }
    else {
        res.text().then((value)=>{
            alert(errorCodes[value]);
        })
    }
    
}

function addEntry(event){
    console.log(event.currentTarget.parentElement.id);
}

function selectSingle(event){
    var name = event.currentTarget.name;
    var curId = event.currentTarget.id.substring(name.length+3);
    if(!inputData.currentSelected)inputData.currentSelected = {};
    if(!inputData.currentSelected[name]) inputData.currentSelected[name] = '';
    if (name == 'Caposquadra' && checkLeader(curId)) return;
    if(inputData.currentSelected[name]) document.getElementById('ins'+name+inputData.currentSelected[name]).className = '';
    inputData.currentSelected[name] = curId;
    event.currentTarget.className = 'selected'
}

function checkLeader(curId){
    if(inputData.currentSelected.Caposquadra){
        // Don't let user select leader to also be on the team
        if (curId == inputData.currentSelected.Caposquadra) return true
    }
    var array = inputData.currentSelected.Utenti;
    // De-select user if selected as leader
    if(array && array.includes(curId)){
        document.getElementById('insUtenti'+curId).className = '';
        inputData.currentSelected.Utenti = array.filter(item => item != curId)
    }
    return false;
}

function selectMultiple(event){
    var name = event.currentTarget.name;
    var curId = event.currentTarget.id.substring(name.length+3)
    if(!inputData.currentSelected) inputData.currentSelected = {};
    if(!inputData.currentSelected[name]) inputData.currentSelected[name] = [];
    var array = inputData.currentSelected[name];
    if(name == 'Utenti' && checkLeader(curId)) return;
    if(array.includes(curId)) {
        document.getElementById('ins'+name+curId).className = '';
        inputData.currentSelected[name] = array.filter(item => item != curId);
    }
    else{
        array.push(curId);
        event.currentTarget.className = 'selected';
    }
    //console.log(`pressed button with name ${event.currentTarget.name} and id ${event.currentTarget.id}`);
}

function updateTable(res, table){
    var id = '';
    if (table.id == 'extraTable') id = 'ext';
    else if (table.id == 'outputTable') id = 'out';
    else id = 'ins';
    const fieldTypes = {
        expand: 'EXT',
        add: 'ADD',
        select: 'SEL',
        selectMultiple: 'MSEL'
    };
    res.json().then((data)=>{
        var dataTable = [];
        for(var i = 0; i<data.headers.length; i++){
            var col = [];
            var header = data.headers[i];
            if(header.fieldType == fieldTypes.selectMultiple || header.fieldType == fieldTypes.select) col.push('Seleziona');
            else col.push(header.name);
            for(var item of data.entries){
                if(item[i] && header.fieldType == fieldTypes.expand || header.fieldType == fieldTypes.add){
                    var viewBtn = document.createElement("button");
                    viewBtn.innerText = 'Vedi';
                    viewBtn.name = header.name;
                    viewBtn.onclick = extraButton;
                    var div = document.createElement("div");
                    div.id = id+header.name+item[i];
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
                else if(item[i] && header.fieldType == fieldTypes.selectMultiple || header.fieldType == fieldTypes.select){
                    var selBtn = document.createElement("button");
                    selBtn.innerText = 'Seleziona';
                    selBtn.name = header.name;
                    selBtn.id = id+header.name+item[i];
                    if(header.fieldType == fieldTypes.select) selBtn.onclick = selectSingle;
                    else selBtn.onclick = selectMultiple;
                    col.push(selBtn);
                }
                else col.push(item[i]);
            }
            dataTable.push(col);
        }

        while(table.children.length > 0) table.children[0].remove();

        var outputHead = document.createElement('thead');
        var outputBody = document.createElement('tbody');
        table.appendChild(outputHead);
        table.appendChild(outputBody);

        for(var i = 0; i < dataTable.length; i++){
            var th = document.createElement("th");
            th.innerText = dataTable[i][0];
            outputHead.appendChild(th);
        }

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
    if(res.ok) {
        updateTable(res, document.getElementById('outputTable'));
        activeTable = tableName;
    }
    else{
        res.text().then((data)=>{
            alert(errorCodes[data]);
        })
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
    return res;
}