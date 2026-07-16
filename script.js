const videoPreview = document.getElementById('preview');
const statusBadge = document.getElementById('status-badge');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnResume = document.getElementById('btn-resume');
const btnStop = document.getElementById('btn-stop');
const btnDownload = document.getElementById('btn-download');

let mediaRecorder = null;
let recordedChunks = [];
let screenStream = null;
let voiceStream = null;
let combinedStream = null;

function updateUI(state) {
    switch(state) {
        case 'idle':
            statusBadge.innerText = 'Ready';
            statusBadge.style.color = '#f8fafc';
            btnStart.disabled = false;
            btnPause.disabled = true;
            btnResume.classList.add('hidden');
            btnStop.disabled = true;
            break;
        case 'recording':
            statusBadge.innerText = 'Recording';
            statusBadge.style.color = '#ef4444';
            btnStart.disabled = true;
            btnPause.disabled = false;
            btnPause.classList.remove('hidden');
            btnResume.classList.add('hidden');
            btnStop.disabled = false;
            btnDownload.disabled = true;
            break;
        case 'paused':
            statusBadge.innerText = 'Paused';
            statusBadge.style.color = '#eab308';
            btnPause.classList.add('hidden');
            btnResume.classList.remove('hidden');
            btnResume.disabled = false;
            break;
        case 'stopped':
            statusBadge.innerText = 'Recording Saved';
            statusBadge.style.color = '#22c55e';
            btnStart.disabled = false;
            btnPause.disabled = true;
            btnResume.classList.add('hidden');
            btnStop.disabled = true;
            btnDownload.disabled = false;
            break;
    }
}

async function startRecording() {
    recordedChunks = [];
    
    try {
        // 1. Screen Capture (Isme audio permission ko default simple rakha hai)
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        // 2. Microphone Capture (Fail-safe wrapper ke saath)
        try {
            voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (micErr) {
            console.warn("Mic not available or permission denied. Recording only screen.", micErr);
            voiceStream = null; // Agar mic nahi mila toh safe null rakhein
        }

        // 3. Streams ko safe tarike se combine karna
        const tracks = [];
        
        if (screenStream && screenStream.getVideoTracks().length > 0) {
            tracks.push(screenStream.getVideoTracks()[0]);
        }
        
        // Agar mic permissions mil gayi hain toh mic use karo, warna system ka screen audio check karo
        if (voiceStream && voiceStream.getAudioTracks().length > 0) {
            tracks.push(voiceStream.getAudioTracks()[0]);
        } else if (screenStream && screenStream.getAudioTracks().length > 0) {
            tracks.push(screenStream.getAudioTracks()[0]);
        }

        combinedStream = new MediaStream(tracks);
        videoPreview.srcObject = combinedStream;

        // 4. Recorder initialization checking best supported type
        let options = { mimeType: 'video/webm; codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm' }; // Fallback options
        }

        mediaRecorder = new MediaRecorder(combinedStream, options);

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            stopAllTracks();
            updateUI('stopped');
        };

        // Chrome ka native 'Stop Sharing' button handle karne ke liye
        if (screenStream.getVideoTracks()[0]) {
            screenStream.getVideoTracks()[0].onended = () => {
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                }
            };
        }

        mediaRecorder.start(1000); 
        updateUI('recording');

    } catch (error) {
        console.error("Error global start:", error);
        alert("Permission dynamic error or user cancelled sharing.");
        stopAllTracks();
        updateUI('idle');
    }
}

function pauseRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        updateUI('paused');
    }
}

function resumeRecording() {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        updateUI('recording');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function downloadRecording() {
    if (recordedChunks.length === 0) return;

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `ScreenRecord_${Date.now()}.webm`;
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}

function stopAllTracks() {
    if (screenStream) screenStream.getTracks().forEach(track => track.stop());
    if (voiceStream) voiceStream.getTracks().forEach(track => track.stop());
    if (videoPreview.srcObject) videoPreview.srcObject = null;
}

btnStart.addEventListener('click', startRecording);
btnPause.addEventListener('click', pauseRecording);
btnResume.addEventListener('click', resumeRecording);
btnStop.addEventListener('click', stopRecording);
btnDownload.addEventListener('click', downloadRecording);
