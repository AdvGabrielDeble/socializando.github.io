export function calculateAvailableSpots(capacity, confirmedCount) {
  const safeCapacity = Number.isFinite(Number(capacity)) ? Math.max(0, Number(capacity)) : 0;
  const safeConfirmed = Number.isFinite(Number(confirmedCount)) ? Math.max(0, Number(confirmedCount)) : 0;
  return Math.max(0, Math.trunc(safeCapacity) - Math.trunc(safeConfirmed));
}

export function formatAvailabilityLabel(availableSpots) {
  const spots = Math.max(0, Math.trunc(Number(availableSpots) || 0));
  if (spots === 0) return 'Esgotada';
  if (spots === 1) return 'Última vaga';
  return `${spots} vagas disponíveis`;
}

function tlv(id, value) {
  const text = String(value ?? '');
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

function asciiUpper(value, maxLength) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .-]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

function sanitizeTxid(value) {
  const sanitized = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 25);
  return sanitized || '***';
}

export function crc16Ccitt(input) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixPayload({ key, amountCents, merchantName, merchantCity, txid }) {
  const pixKey = String(key ?? '').replace(/\D/g, '');
  if (!pixKey) throw new Error('Chave Pix inválida.');

  const cents = Math.trunc(Number(amountCents));
  if (!Number.isFinite(cents) || cents <= 0) throw new Error('Valor Pix inválido.');

  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', pixKey);
  const amount = (cents / 100).toFixed(2);
  const merchant = asciiUpper(merchantName, 25) || 'SOCIALIZANDO';
  const city = asciiUpper(merchantCity, 15) || 'BAGE';
  const additionalData = tlv('05', sanitizeTxid(txid));

  const payloadWithoutCrc = [
    tlv('00', '01'),
    tlv('26', merchantAccount),
    tlv('52', '0000'),
    tlv('53', '986'),
    tlv('54', amount),
    tlv('58', 'BR'),
    tlv('59', merchant),
    tlv('60', city),
    tlv('62', additionalData),
    '6304',
  ].join('');

  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
}
