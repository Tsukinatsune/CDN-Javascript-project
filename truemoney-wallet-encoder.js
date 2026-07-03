(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TrueWalletQR = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class TrueWalletQR {
    constructor(phone, amount, message) {
      this.phone = phone || '';
      this.amount = amount || 0;
      this.message = message || '';
    }

    setPhone(phone) {
      this.phone = phone;
      return this;
    }

    setAmount(amount) {
      this.amount = amount;
      return this;
    }

    setMessage(message) {
      this.message = message;
      return this;
    }

    crc16(str) {
      let crc = 0xFFFF;
      for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
        }
      }
      return crc.toString(16).padStart(4, '0');
    }

    tlv(tag, value) {
      const len = String(value.length).padStart(2, '0');
      return `${tag}${len}${value}`;
    }

    normalizePhone() {
      let digits = String(this.phone).replace(/\D/g, '');
      if (digits.length === 11 && digits.startsWith('66')) {
        digits = '0' + digits.slice(2);
      }
      return digits;
    }

    encodeMessageHex() {
      const chars = Array.from(this.message);
      return chars.map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('');
    }

    buildBody() {
      const phoneDigits = this.normalizePhone();
      const amt = Number(this.amount).toFixed(2);
      const msgHex = this.encodeMessageHex();

      const payloadFormat = this.tlv('00', '01');
      const poi = this.tlv('01', '12');
      const merchantAccount = this.tlv(
        '29',
        this.tlv('00', '16A000000677010111') + this.tlv('03', phoneDigits)
      );
      const countryCurrency = this.tlv('58', 'TH') + this.tlv('53', '764');
      const amountTag = this.tlv('54', amt);
      const messageTag = msgHex ? this.tlv('81', msgHex) : '';

      return (
        payloadFormat +
        poi +
        merchantAccount +
        countryCurrency +
        amountTag +
        messageTag
      );
    }

    generate() {
      const body = this.buildBody();
      const crc = this.crc16(body + '6304');
      const crcTag = this.tlv('63', crc);
      return (body + crcTag).toUpperCase();
    }
  }

  return TrueWalletQR;
});
