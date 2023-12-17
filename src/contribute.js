const { invoke } = window.__TAURI__.tauri;
const { appDir } = window.__TAURI__.path;
const { open } = window.__TAURI__.dialog;
const { listen } = window.__TAURI__.event;

let isContributing = false;
let ws;

function handleError(e) {
    alert(e);
    appWindow.close();
}

function setStatusReport(status, totalTranslations, started, lastTask, response) {
    let statusReport = '';
    statusReport += `<strong>Total translations completed:</strong> ${totalTranslations}`;
    statusReport += `<br><strong>Translations per minute:</strong> ${(totalTranslations / ((Date.now() - started) / 60000)).toFixed(2)}`;
    if (lastTask && response) {
        statusReport += `<br><strong>Last task:</strong> <i>${lastTask}</i>`;
        statusReport += `<br><strong>Last translation:</strong> <i>${response}</i>`;
    }
    status.innerHTML = statusReport;
}

function beginContribution() {
    let totalTranslations = 0;
    let started = Date.now();
    if (isContributing) {
        ws?.close();
        let control = document.querySelector("#control");
        control.innerHTML = "Stopping...";
        control.className = "";
        control.disabled = true;
        isContributing = false;
        document.querySelector("#spinner").style.display = "none";
    } else {
        let control = document.querySelector("#control");
        control.innerHTML = "Stop";
        control.className = "red";
        console.log("Connecting");
        ws = new WebSocket('ws://' + document.querySelector("#begin-input").value);
        let status = document.querySelector("#status-msg");
        status.innerText = '';
        setStatusReport(status, totalTranslations, started - 1);
        status.style.display = "block";
        ws.onmessage = async msg => {
            document.querySelector("#spinner").style.display = "block";
            let translation = await invoke('create_translation_response', { inputString: msg.data }).catch(handleError);
            if (isContributing) {
                totalTranslations++;
                if (translation[1] != '') {
                    setStatusReport(status, totalTranslations, started, msg.data, translation[1]);
                }
                ws.send(translation[0]);
            } else {
                let status = document.querySelector("#status-msg");
                status.style.display = "block";
                status.innerHTML = `Translation stopped.`;
                control.innerHTML = "Begin";
                control.className = "green";
                control.disabled = false;
            }
        };

        isContributing = true;
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    isContributing = false;
    document.querySelector("#begin-form").addEventListener("submit", (e) => {
        e.preventDefault();
        beginContribution();
    });
});
