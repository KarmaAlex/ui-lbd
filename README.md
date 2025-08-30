## Interfaccia grafica per il progetto di Laboratorio di basi di dati
### Descrizione
Interfaccia web per il progetto di Laboratorio di basi di dati, in particolare per la specifica "Soccorso".

Presenta una pagina web che permette di eseguire alcune operazioni sul database quali:
- Visualizzazione dei dati delle tabelle di base
- Aggiunta di record
- Visualizzazione di dati correlati ad alcune entry (ad esempio lo storico dei mezzi/materiali, membri dei team etc...)
- Login tramite il sistema di utenti di mysql
- Altre operazioni come la chiusura delle missioni e visualizzazione di dati più complessi richiesti nelle query
 
### Requisiti
Una versione di node.js per il server (testato con Node v24.7.0) ed il suo package manager npm
### Istruzioni per l'uso
Scaricare il sorgente ed installare la libreria mysql con
```
npm install
```
Eseguire il server con
```
npm run exec
```
Seguire il link stampato dalla console, oppure andare su localhost alla porta 8888 (importante usare il protocollo https)

Fare il login come uno dei due utenti inclusi nel DB
1. Utente base: username: user, password: user
2. Admin: username: admin, password: admin

Alternativamente si può andare direttamente alla pagina dashboard.html e verrà fatto automaticamente il login da admin per convenienza.
### Possibili problemi
Per evitare errori per quanto riguarda le CORS il server usa il protocollo https, potrebbe essere necessario aggiungere il certificato (certs/server.cert) nel proprio browser prima di caricare la pagina.

Il certificato è creato e firmato da me.

Browser testati:
- Firefox 142.0: necessita il certificato
