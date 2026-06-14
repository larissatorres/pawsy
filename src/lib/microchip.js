// ─── Microchip validation (ISO 11784/11785) ───
// Standard pet microchip = 15 numeric digits.
// First 3 digits = country code (ICAR) OR manufacturer code (900–999).
// Legacy chips: 10-digit FECAVA/FDX-A, 9–10 digit AVID (US). We accept but flag.

const COUNTRY = {
  '076': 'Brasil', '036': 'Australia', '724': 'España', '620': 'Portugal',
  '250': 'France', '276': 'Germany', '380': 'Italy', '826': 'United Kingdom',
  '840': 'United States', '528': 'Netherlands', '056': 'Belgium', '372': 'Ireland',
  '756': 'Switzerland', '040': 'Austria', '208': 'Denmark', '752': 'Sweden',
  '578': 'Norway', '246': 'Finland', '616': 'Poland', '203': 'Czechia',
  '124': 'Canada', '484': 'Mexico', '554': 'New Zealand',
}

// Common ICAR manufacturer codes (900–999 range)
const MANUFACTURER = {
  '900': 'Trovan / shared', '941': 'Datamars', '981': 'Datamars (Tierchip)',
  '985': 'Destron / Digital Angel', '977': 'BTS / Planet ID', '982': 'Allflex / Pethealth',
  '956': 'Trovan', '953': 'Trovan', '978': 'Animalltag', '952': 'Vietnam (shared)',
  '991': 'Free Reseller', '992': 'AEG ID', '999': 'Test / non-unique',
}

export function validateChip(raw) {
  const chip = String(raw || '').replace(/\s|-/g, '').trim()

  if (!chip) return { valid: false, reason: 'empty' }
  if (!/^\d+$/.test(chip)) return { valid: false, reason: 'non_numeric', chip }

  // 15-digit ISO standard
  if (chip.length === 15) {
    const prefix = chip.slice(0, 3)
    const num = parseInt(prefix, 10)
    if (num >= 900 && num <= 999) {
      return {
        valid: true, standard: 'ISO 11784/85', chip, length: 15,
        type: 'manufacturer', code: prefix,
        label: MANUFACTURER[prefix] || `Manufacturer ${prefix}`,
        manufacturer: MANUFACTURER[prefix] || `Code ${prefix}`,
      }
    }
    return {
      valid: true, standard: 'ISO 11784/85', chip, length: 15,
      type: 'country', code: prefix,
      label: COUNTRY[prefix] || `Country code ${prefix}`,
      country: COUNTRY[prefix] || `Code ${prefix}`,
    }
  }

  // Legacy formats — accepted but flagged (no country decoding)
  if (chip.length === 10) {
    return { valid: true, standard: 'Legacy (FECAVA/FDX-A)', chip, length: 10, type: 'legacy', label: 'Legacy 10-digit chip' }
  }
  if (chip.length === 9) {
    return { valid: true, standard: 'Legacy (AVID 9-digit)', chip, length: 9, type: 'legacy', label: 'Legacy AVID chip' }
  }

  return { valid: false, reason: 'bad_length', chip, length: chip.length }
}

export function chipReason(reason, length) {
  switch (reason) {
    case 'empty': return 'Enter a chip number'
    case 'non_numeric': return 'Chip number must contain only digits'
    case 'bad_length': return `${length} digits — must be 15 (ISO) or 9–10 (legacy)`
    default: return 'Invalid chip number'
  }
}
