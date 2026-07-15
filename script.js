let mediaRecorder;
let recordedChunks = [];

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const pauseBtn = document.getElementById("pause");
const resumeBtn = document.getElementById("resume");
const preview = document.getElementById("preview");
const download = document.getElementById("download");

startBtn.onclick = async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
    });

    const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true
    });

    const stream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...micStream.getAudioTracks()
    ]);

    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        preview.src = url;
        preview.controls = true;

        download.href = url;
        download.download = "recording.webm";
        download.innerText = "Download Recording";
        download.style.display = "inline";
    };

    mediaRecorder.start();
};

pauseBtn.onclick = () => {
    if (mediaRecorder) mediaRecorder.pause();
};

resumeBtn.onclick = () => {
    if (mediaRecorder) mediaRecorder.resume();
};

stopBtn.onclick = () => {
    if (mediaRecorder) mediaRecorder.stop();
};