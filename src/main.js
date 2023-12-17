const { invoke } = window.__TAURI__.tauri;
const { appDir } = window.__TAURI__.path;
const { open } = window.__TAURI__.dialog;
const { listen } = window.__TAURI__.event;
const { appWindow } = window.__TAURI__.window;

let statusMsgEl;
let spinnerEl;
let memEl;
let progressEl;

function handleError(e) {
    alert(e);
    appWindow.close();
}

async function openModel() {
    const selected = await open({
        multiple: false,
    });
    if (selected) {
        statusMsgEl.innerHTML += `Loading model at <code>${selected}</code>...`;
        statusMsgEl.style.display = "block";
        spinnerEl.style.display = "block";
        document.querySelectorAll('button[name="setup"]').forEach(el => el.disabled = true);
        console.log(selected);
        let seconds = await invoke('load_model', { modelLocation: selected }).catch(handleError);
        statusMsgEl.innerHTML += `<br>Model loaded! Took ${Math.round(seconds)} seconds`;
        spinnerEl.style.display = "none";
        document.querySelector("#done-form").style.display = "block";
    }
}

async function installModel() {
    document.querySelectorAll('button[name="setup"]').forEach(el => el.disabled = true);
    let path = await invoke('download_model').catch(handleError);
    progressEl.style.display = "none";
    spinnerEl.style.display = "block";
    statusMsgEl.style.display = "block";
    statusMsgEl.innerHTML += `<br>Loading model at <code>${path}</code>...`;
    let seconds = await invoke('load_model', { modelLocation: path }).catch(handleError);
    spinnerEl.style.display = "none";
    statusMsgEl.innerHTML += `<br>Model loaded! Took ${Math.round(seconds)} seconds`;
    document.querySelector("#done-form").style.display = "block";
}

window.addEventListener("DOMContentLoaded", async () => {
    statusMsgEl = document.querySelector("#status-msg");
    spinnerEl = document.querySelector("#spinner");
    memEl = document.querySelector("#memory");
    progressEl = document.querySelector("#progress");
    let barEl = document.querySelector("#bar");
    await listen('starting-download', (event) => {
        statusMsgEl.innerHTML += `Starting download to <code>${event.payload}</code>`;
        statusMsgEl.style.display = "block";
    });
    await listen('download-progress', (event) => {
        progressEl.style.display = "block";
        let downloaded = event.payload[0];
        let downloadSize = event.payload[1];
        let completed = downloaded / downloadSize;
        barEl.style.width = Math.max(completed * 100, 10) + "%";
        barEl.innerHTML = `<p class="progress-label">${(completed * 100).toFixed(2)}% complete - ${(downloaded / 1e+6).toFixed(2)}/${(downloadSize / 1e+6).toFixed(2)} MB</p>`;
    });
    document.querySelector("#open-form").addEventListener("submit", (e) => {
        e.preventDefault();
        openModel();
    });

    document.querySelector("#install-form").addEventListener("submit", (e) => {
        e.preventDefault();
        installModel();
    });

    document.querySelector("#done-form").addEventListener("submit", (e) => {
        e.preventDefault();
        window.location.href = "contribute.html";
    })

    setInterval(async () => {
        let mem = await invoke('get_memory').catch(handleError);
        memEl.innerHTML = `Current physical memory available: <strong>${Math.round(mem / 1e+8) / 10} GB</strong>`;
    }, 1000)
});
