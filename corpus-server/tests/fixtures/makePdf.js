/**
 * Build a small, valid multi-page PDF with real text (Helvetica), so tests
 * don't depend on binary fixtures. `pages` is an array of arrays of lines.
 */
export function makePdf(pages) {
  const esc = s => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const objects = []
  const add = body => objects.push(body) // object number = index + 1

  add('<< /Type /Catalog /Pages 2 0 R >>')
  add(null) // pages tree, filled in below
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const kids = []
  for (const lines of pages) {
    const stream = ['BT', '/F1 12 Tf', '14 TL', '72 720 Td', ...lines.map(l => `(${esc(l)}) Tj T*`), 'ET'].join('\n')
    add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`)
    const contentNum = objects.length
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentNum} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`)
    kids.push(`${objects.length} 0 R`)
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`

  let out = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out))
    out += `${i + 1} 0 obj\n${body}\nendobj\n`
  })
  const xref = Buffer.byteLength(out)
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  out += offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(out, 'latin1')
}
