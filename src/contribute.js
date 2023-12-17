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
        let statusEl = document.querySelector("#status-msg");
        statusEl.innerText = '';
        setStatusReport(statusEl, totalTranslations, started - 1);
        statusEl.style.display = "block";
        ws.onclose = event => {
            let reason;
            if (event.code == 1000)
                reason = "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
            else if (event.code == 1001)
                reason = "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.";
            else if (event.code == 1002)
                reason = "An endpoint is terminating the connection due to a protocol error";
            else if (event.code == 1003)
                reason = "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
            else if (event.code == 1004)
                reason = "Reserved. The specific meaning might be defined in the future.";
            else if (event.code == 1005)
                reason = "No status code was actually present.";
            else if (event.code == 1006)
                reason = "The connection was closed abnormally, e.g., without sending or receiving a Close control frame";
            else if (event.code == 1007)
                reason = "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [https://www.rfc-editor.org/rfc/rfc3629] data within a text message).";
            else if (event.code == 1008)
                reason = "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.";
            else if (event.code == 1009)
                reason = "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
            else if (event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
                reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + event.reason;
            else if (event.code == 1011)
                reason = "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
            else if (event.code == 1015)
                reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
            else
                reason = "Unknown reason";
            handleError(reason);
        };
        ws.onmessage = async msg => {
            document.querySelector("#spinner").style.display = "block";
            let translation = await invoke('create_translation_response', { inputString: msg.data }).catch(handleError);
            if (isContributing) {
                totalTranslations++;
                if (translation[1] != '') {
                    setStatusReport(statusEl, totalTranslations, started, msg.data, translation[1]);
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
