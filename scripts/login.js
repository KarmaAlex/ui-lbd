const submitBtn = document.getElementById("submit");
const passwdField = document.getElementById("password");
const usernameField = document.getElementById("username");
const errorLabel = document.getElementById("error");

const url = "https://localhost:8888"

submitBtn.onclick = async (e)=>{
    errorLabel.innerText = '';
    if(passwdField.value != '' && usernameField.value != ''){
        const username = usernameField.value;
        const passArrayBuffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(passwdField.value));
        const hashHex = Array.from(new Uint8Array(passArrayBuffer)).map(
            (b)=>{
                return b.toString(16).padStart(2, "0");
            }
        ).join("");
        console.log(`username: ${username}; password hash: ${hashHex}`);
        //make request for authentication
        const res = await fetch(url+"/login",{
            method: "POST",
            body:JSON.stringify({
                username: username,
                password: hashHex
            })
        })
        //response in case of insuccesful login
        if(!res.ok){
            errorLabel.innerText = "Username o password incorretti";
            passwdField.value = '';
        }
        else{
            const response = await res.json();
            sessionStorage.setItem("sessionToken", response.token);
            //await new Promise(r => setTimeout(r, 5000));
            window.location.href = "https://localhost:8888/home.html";
            
        }
        
    }
    else{
        errorLabel.innerText = "Inserire username e password";
    }
}