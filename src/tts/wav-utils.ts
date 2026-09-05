/** PCM WAV（同一フォーマット）を無音つきでつなぐ */

function readUint32(buffer: Buffer, offset: number): number {
  return buffer.readUInt32LE(offset);
}

function readUint16(buffer: Buffer, offset: number): number {
  return buffer.readUInt16LE(offset);
}

export interface WavFormat {
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  data: Buffer;
}

export function parseWav(buffer: Buffer): WavFormat {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error('WAV形式ではありません');
  }

  let offset = 12;
  let channels = 1;
  let sampleRate = 22050;
  let bitsPerSample = 16;
  let data: Buffer = Buffer.alloc(0);

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = readUint32(buffer, offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === 'fmt ') {
      channels = readUint16(buffer, chunkStart + 2);
      sampleRate = readUint32(buffer, chunkStart + 4);
      bitsPerSample = readUint16(buffer, chunkStart + 14);
    } else if (chunkId === 'data') {
      data = buffer.subarray(chunkStart, chunkStart + chunkSize);
      break;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  return { channels, sampleRate, bitsPerSample, data };
}

export function buildSilence(
  format: WavFormat,
  durationMs: number,
): Buffer {
  const bytesPerSample = format.bitsPerSample / 8;
  const bytesPerMs = (format.sampleRate * format.channels * bytesPerSample) / 1000;
  const size = Math.max(0, Math.round(bytesPerMs * durationMs));
  const aligned = size - (size % (format.channels * bytesPerSample));
  return Buffer.alloc(Math.max(0, aligned));
}

export function concatPcmWav(chunks: Buffer[]): Buffer {
  if (chunks.length === 0) {
    throw new Error('結合する音声がありません');
  }

  if (chunks.length === 1) {
    return chunks[0];
  }

  const parsed = chunks.map((chunk) => parseWav(chunk));
  const base = parsed[0];
  const pcmParts = [base.data];

  for (let index = 1; index < parsed.length; index += 1) {
    const next = parsed[index];
    if (
      next.channels !== base.channels ||
      next.sampleRate !== base.sampleRate ||
      next.bitsPerSample !== base.bitsPerSample
    ) {
      throw new Error('WAVの形式が一致しません');
    }
    pcmParts.push(next.data);
  }

  const data = Buffer.concat(pcmParts);
  const header = Buffer.alloc(44);
  const byteRate = (base.sampleRate * base.channels * base.bitsPerSample) / 8;
  const blockAlign = (base.channels * base.bitsPerSample) / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(base.channels, 22);
  header.writeUInt32LE(base.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(base.bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

export function makeSilentWav(durationMs: number, format: WavFormat): Buffer {
  const data = buildSilence(format, durationMs);
  const header = Buffer.alloc(44);
  const byteRate = (format.sampleRate * format.channels * format.bitsPerSample) / 8;
  const blockAlign = (format.channels * format.bitsPerSample) / 8;

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(format.channels, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(format.bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}
