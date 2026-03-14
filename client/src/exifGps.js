function getString(dataView, start, length) {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += String.fromCharCode(dataView.getUint8(start + index));
  }
  return result;
}

function readUnsignedRational(dataView, offset, littleEndian) {
  const numerator = dataView.getUint32(offset, littleEndian);
  const denominator = dataView.getUint32(offset + 4, littleEndian);
  if (!denominator) {
    return 0;
  }
  return numerator / denominator;
}

function getTypeByteSize(type) {
  if (type === 2) return 1;
  if (type === 3) return 2;
  if (type === 4) return 4;
  if (type === 5) return 8;
  return 0;
}

function readTagValue(dataView, tiffStart, type, count, valueFieldOffset, littleEndian) {
  const byteSize = getTypeByteSize(type) * count;
  const valueOffset = byteSize <= 4
    ? valueFieldOffset
    : tiffStart + dataView.getUint32(valueFieldOffset, littleEndian);

  if (type === 2) {
    return getString(dataView, valueOffset, count).replace(/\0/g, "").trim();
  }

  if (type === 5) {
    const values = [];
    for (let index = 0; index < count; index += 1) {
      values.push(readUnsignedRational(dataView, valueOffset + (index * 8), littleEndian));
    }
    return values;
  }

  if (type === 3) {
    return count === 1 ? dataView.getUint16(valueOffset, littleEndian) : null;
  }

  if (type === 4) {
    return count === 1 ? dataView.getUint32(valueOffset, littleEndian) : null;
  }

  return null;
}

function readIfd(dataView, tiffStart, ifdOffset, littleEndian) {
  const entryCount = dataView.getUint16(tiffStart + ifdOffset, littleEndian);
  const entries = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = tiffStart + ifdOffset + 2 + (index * 12);
    const tag = dataView.getUint16(entryOffset, littleEndian);
    const type = dataView.getUint16(entryOffset + 2, littleEndian);
    const count = dataView.getUint32(entryOffset + 4, littleEndian);
    entries.set(tag, readTagValue(dataView, tiffStart, type, count, entryOffset + 8, littleEndian));
  }

  return entries;
}

function convertDmsToDecimal(values, reference) {
  if (!Array.isArray(values) || values.length < 3) {
    return null;
  }

  const decimal = values[0] + (values[1] / 60) + (values[2] / 3600);
  if (["S", "W"].includes(String(reference || "").toUpperCase())) {
    return -decimal;
  }
  return decimal;
}

function parseGpsFromJpeg(buffer) {
  const dataView = new DataView(buffer);
  if (dataView.getUint16(0) !== 0xffd8) {
    return null;
  }

  let offset = 2;
  while (offset < dataView.byteLength) {
    const marker = dataView.getUint16(offset);
    offset += 2;

    if (marker === 0xffe1) {
      const segmentLength = dataView.getUint16(offset);
      const segmentStart = offset + 2;
      const exifHeader = getString(dataView, segmentStart, 6);
      if (exifHeader !== "Exif\0\0") {
        offset += segmentLength;
        continue;
      }

      const tiffStart = segmentStart + 6;
      const littleEndian = getString(dataView, tiffStart, 2) === "II";
      const firstIfdOffset = dataView.getUint32(tiffStart + 4, littleEndian);
      const ifd0 = readIfd(dataView, tiffStart, firstIfdOffset, littleEndian);
      const gpsIfdOffset = ifd0.get(0x8825);
      if (!gpsIfdOffset) {
        return null;
      }

      const gpsIfd = readIfd(dataView, tiffStart, gpsIfdOffset, littleEndian);
      const latitude = convertDmsToDecimal(gpsIfd.get(0x0002), gpsIfd.get(0x0001));
      const longitude = convertDmsToDecimal(gpsIfd.get(0x0004), gpsIfd.get(0x0003));

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return {
        lat: Number(latitude.toFixed(6)),
        lng: Number(longitude.toFixed(6)),
      };
    }

    if (marker === 0xffda || marker === 0xffd9) {
      break;
    }

    const segmentLength = dataView.getUint16(offset);
    offset += segmentLength;
  }

  return null;
}

export async function extractGpsFromFile(file) {
  if (!file) {
    return null;
  }

  const buffer = await file.arrayBuffer();
  return parseGpsFromJpeg(buffer);
}
