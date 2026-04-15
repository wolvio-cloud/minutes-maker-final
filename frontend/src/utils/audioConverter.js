/**
 * Converts an MP4 (or any audio/video) File to a WAV Blob using the Web Audio API.
 * Fully frontend — no server round-trip needed for conversion.
 */
export async function convertMp4ToWav(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 30)); // 0-30% = reading
      }
    };

    reader.onload = async (e) => {
      try {
        if (onProgress) onProgress(35);

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = e.target.result;

        if (onProgress) onProgress(45);

        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        if (onProgress) onProgress(70);

        const wavBlob = audioBufferToWav(audioBuffer);

        if (onProgress) onProgress(100);

        audioCtx.close();
        resolve(wavBlob);
      } catch (err) {
        reject(new Error("Failed to decode audio: " + err.message));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Encode an AudioBuffer into a WAV Blob.
 */
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let channelData = [];
  for (let i = 0; i < numChannels; i++) {
    channelData.push(buffer.getChannelData(i));
  }

  const numSamples = channelData[0].length;
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = numSamples * blockAlign;

  const bufferSize = 44 + dataSize;
  const arrayBuf = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuf);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuf], { type: "audio/wav" });
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
