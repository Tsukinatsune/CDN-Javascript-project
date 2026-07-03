(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    define([], factory);
  } else {
    root.TrueWalletQR = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var TEMPLATE =
    "00020101021229390016A000000677010111031514000{phonenumber}5802TH54{amount_length}{amount}530376481{hex_length}{hex_message}";
  var MAX_MESSAGE_LENGTH = 24;
  var TAG_LABELS = {
    "00": "Payload Format Indicator",
    "01": "Point of Initiation Method",
    "29": "Merchant Account Information",
    "53": "Transaction Currency",
    "54": "Transaction Amount",
    "58": "Country Code",
    "62": "Additional Data Field Template",
    "81": "Additional Data (TrueMoney message)",
    "63": "CRC Checksum"
  };

  function crc16xmodem(str) {
    var crc = 0xffff;
    for (var i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (var j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }
    return crc & 0xffff;
  }

  function generateCRC(payload) {
    var crcValue = crc16xmodem(payload + "6304")
      .toString(16)
      .padStart(4, "0");
    return ("63" + String(crcValue.length).padStart(2, "0") + crcValue).toUpperCase();
  }

  function encodeMessage(message) {
    var chars = Array.from(String(message));
    var hexLength = String(4 * chars.length).padStart(2, "0");
    var hexMessage = chars
      .map(function (ch) {
        return ch.charCodeAt(0).toString(16).padStart(4, "0");
      })
      .join("");
    return { hexLength: hexLength, hexMessage: hexMessage };
  }

  function decodeMessage(hex) {
    var msg = "";
    for (var i = 0; i < hex.length; i += 4) {
      var code = parseInt(hex.substr(i, 4), 16);
      msg += String.fromCharCode(code);
    }
    return msg;
  }

  function formatAmount(amount) {
    var formatted = Number(amount).toFixed(2);
    return {
      value: formatted,
      length: String(formatted.length).padStart(2, "0")
    };
  }

  function validateMessage(message) {
    if (String(message).length > MAX_MESSAGE_LENGTH) {
      throw new Error(
        "Message must be " + MAX_MESSAGE_LENGTH + " characters or fewer"
      );
    }
  }

  function validatePhoneNumber(phoneNumber) {
    if (!phoneNumber || String(phoneNumber).length !== 10) {
      throw new Error("Phone number must be exactly 10 digits");
    }
  }

  function buildPayload(phoneNumber, amount, message) {
    var amt = formatAmount(amount);
    var msg = encodeMessage(message);
    return TEMPLATE.replace("{phonenumber}", phoneNumber)
      .replace("{amount_length}", amt.length)
      .replace("{amount}", amt.value)
      .replace("{hex_message}", msg.hexMessage)
      .replace("{hex_length}", msg.hexLength);
  }

  function encode(opts) {
    opts = opts || {};
    var phoneNumber = opts.phoneNumber;
    var amount = opts.amount;
    var message = opts.message || "";
    validatePhoneNumber(phoneNumber);
    validateMessage(message);
    var payload = buildPayload(phoneNumber, amount, message);
    return payload.toUpperCase() + generateCRC(payload);
  }

  function parseTLV(str) {
    var pos = 0;
    var result = [];
    while (pos < str.length) {
      var id = str.substr(pos, 2);
      var len = parseInt(str.substr(pos + 2, 2), 10);
      var value = str.substr(pos + 4, len);
      result.push({ id: id, len: len, value: value });
      pos += 4 + len;
    }
    return result;
  }

  function decode(data) {
    var fields = parseTLV(data);
    var out = {
      raw: data,
      fields: [],
      payloadFormatIndicator: null,
      pointOfInitiationMethod: null,
      countryCode: null,
      currency: null,
      amount: null,
      message: null,
      crc: null,
      merchantAccountInfo: null
    };
    fields.forEach(function (f) {
      var entry = {
        tag: f.id,
        length: f.len,
        label: TAG_LABELS[f.id] || "Unknown",
        value: f.value
      };
      out.fields.push(entry);
      switch (f.id) {
        case "00":
          out.payloadFormatIndicator = f.value;
          break;
        case "01":
          out.pointOfInitiationMethod = f.value;
          break;
        case "58":
          out.countryCode = f.value;
          break;
        case "53":
          out.currency = f.value;
          break;
        case "54":
          out.amount = f.value;
          break;
        case "63":
          out.crc = f.value;
          break;
        case "29": {
          var sub = parseTLV(f.value);
          out.merchantAccountInfo = sub.map(function (s) {
            return { tag: s.id, length: s.len, value: s.value };
          });
          break;
        }
        case "81":
          try {
            out.message = decodeMessage(f.value);
          } catch (e) {
            out.message = null;
          }
          break;
        default:
          break;
      }
    });
    return out;
  }

  return {
    encode: encode,
    decode: decode,
    _internal: {
      crc16xmodem: crc16xmodem,
      generateCRC: generateCRC,
      encodeMessage: encodeMessage,
      decodeMessage: decodeMessage,
      parseTLV: parseTLV,
      MAX_MESSAGE_LENGTH: MAX_MESSAGE_LENGTH
    }
  };
});
