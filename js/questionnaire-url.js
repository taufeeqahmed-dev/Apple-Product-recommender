import {
  MAX_SERIALIZED_QUESTIONNAIRE_STATE_BYTES,
  parseQuestionnaireState,
  serializeQuestionnaireState,
  serializedQuestionnaireStateByteLength,
} from "./questionnaire-serialization.js";

export const QUESTIONNAIRE_URL_TRANSPORT_VERSION = 1;
export const QUESTIONNAIRE_URL_FRAGMENT_KEY = "northstar";
export const MAX_QUESTIONNAIRE_URL_PAYLOAD_LENGTH = Math.ceil(
  (MAX_SERIALIZED_QUESTIONNAIRE_STATE_BYTES * 4) / 3,
);

const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const BASE64URL_VALUES = new Map(
  [...BASE64URL_ALPHABET].map((character, index) => [character, index]),
);
const SHARE_FRAGMENT_PREFIX = `${QUESTIONNAIRE_URL_FRAGMENT_KEY}=`;
const SUPPORTED_TRANSPORT_PREFIX = `v${QUESTIONNAIRE_URL_TRANSPORT_VERSION}.`;
const MAX_TRANSPORT_METADATA_LENGTH = 16;

function result(status, details = {}) {
  return Object.freeze({ status, ...details });
}

function parseUrl(urlInput) {
  try {
    return new URL(urlInput instanceof URL ? urlInput.href : String(urlInput));
  } catch {
    return null;
  }
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let encoded = "";
  let index = 0;

  while (index + 2 < bytes.length) {
    const group = (bytes[index] << 16) | (bytes[index + 1] << 8) | bytes[index + 2];
    encoded += BASE64URL_ALPHABET[(group >> 18) & 63];
    encoded += BASE64URL_ALPHABET[(group >> 12) & 63];
    encoded += BASE64URL_ALPHABET[(group >> 6) & 63];
    encoded += BASE64URL_ALPHABET[group & 63];
    index += 3;
  }

  const remaining = bytes.length - index;
  if (remaining === 1) {
    const group = bytes[index];
    encoded += BASE64URL_ALPHABET[group >> 2];
    encoded += BASE64URL_ALPHABET[(group & 3) << 4];
  } else if (remaining === 2) {
    const group = (bytes[index] << 8) | bytes[index + 1];
    encoded += BASE64URL_ALPHABET[(group >> 10) & 63];
    encoded += BASE64URL_ALPHABET[(group >> 4) & 63];
    encoded += BASE64URL_ALPHABET[(group & 15) << 2];
  }

  return encoded;
}

function decodeBase64Url(value) {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return null;

  const bytes = new Uint8Array(Math.floor((value.length * 6) / 8));
  let buffer = 0;
  let bitCount = 0;
  let byteIndex = 0;

  for (const character of value) {
    const sixBits = BASE64URL_VALUES.get(character);
    if (sixBits === undefined) return null;
    buffer = (buffer << 6) | sixBits;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      bytes[byteIndex] = (buffer >> bitCount) & 255;
      byteIndex += 1;
      buffer &= (1 << bitCount) - 1;
    }
  }

  if (byteIndex !== bytes.length || buffer !== 0) return null;
  return bytes;
}

function decodeUtf8(bytes) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function shareFragmentForState(input) {
  const serialized = serializeQuestionnaireState(input);
  const payload = encodeBase64Url(serialized);
  if (payload.length > MAX_QUESTIONNAIRE_URL_PAYLOAD_LENGTH) {
    throw new RangeError("The questionnaire URL payload is too large.");
  }
  return `${SHARE_FRAGMENT_PREFIX}${SUPPORTED_TRANSPORT_PREFIX}${payload}`;
}

export function createQuestionnaireShareUrl(input, baseUrl) {
  const url = parseUrl(baseUrl);
  if (!url || !["http:", "https:"].includes(url.protocol)) {
    throw new TypeError("A valid HTTP(S) application URL is required.");
  }
  url.hash = shareFragmentForState(input);
  return url.href;
}

export function parseQuestionnaireShareUrl(urlInput) {
  const url = parseUrl(urlInput);
  if (!url) return result("invalid-url", { present: false, valid: false });

  const fragment = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (!fragment.startsWith(SHARE_FRAGMENT_PREFIX)) {
    return result("absent", { present: false, valid: false });
  }

  const transport = fragment.slice(SHARE_FRAGMENT_PREFIX.length);
  if (transport.length > MAX_TRANSPORT_METADATA_LENGTH + MAX_QUESTIONNAIRE_URL_PAYLOAD_LENGTH) {
    return result("payload-too-large", { present: true, valid: false });
  }
  const separatorIndex = transport.indexOf(".");
  if (separatorIndex <= 1 || transport[0] !== "v") {
    return result("malformed-transport", { present: true, valid: false });
  }

  const transportVersion = transport.slice(1, separatorIndex);
  if (transportVersion !== String(QUESTIONNAIRE_URL_TRANSPORT_VERSION)) {
    return result("unsupported-transport-version", { present: true, valid: false });
  }

  const payload = transport.slice(separatorIndex + 1);
  if (payload.length > MAX_QUESTIONNAIRE_URL_PAYLOAD_LENGTH) {
    return result("payload-too-large", { present: true, valid: false });
  }

  const bytes = decodeBase64Url(payload);
  if (!bytes) return result("malformed-encoding", { present: true, valid: false });

  const serialized = decodeUtf8(bytes);
  if (serialized === null) {
    return result("invalid-utf8", { present: true, valid: false });
  }
  if (serializedQuestionnaireStateByteLength(serialized) > MAX_SERIALIZED_QUESTIONNAIRE_STATE_BYTES) {
    return result("decoded-payload-too-large", { present: true, valid: false });
  }

  const parsed = parseQuestionnaireState(serialized);
  if (!parsed.valid) return result("invalid-state", { present: true, valid: false });

  return result("valid", {
    present: true,
    valid: true,
    transportVersion: QUESTIONNAIRE_URL_TRANSPORT_VERSION,
    state: parsed.state,
    questionnaireAnswers: parsed.questionnaireAnswers,
    canonicalUrl: createQuestionnaireShareUrl(parsed.state, url.href),
  });
}

export function removeQuestionnaireShareStateFromUrl(urlInput) {
  const url = parseUrl(urlInput);
  if (!url) throw new TypeError("A valid URL is required.");
  const fragment = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (fragment.startsWith(SHARE_FRAGMENT_PREFIX)) url.hash = "";
  return url.href;
}
