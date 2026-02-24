export interface ClozeMarker {
  index: number
  word: string
}

/**
 * Parse {{cN::text}} markers from a cloze template.
 * Returns array of { index, word } sorted by index.
 */
export function parseClozeMarkers(template: string): ClozeMarker[] {
  const regex = /\{\{c(\d+)::([^}]+)\}\}/g
  const markers: ClozeMarker[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(template)) !== null) {
    markers.push({ index: parseInt(match[1], 10), word: match[2] })
  }

  return markers.sort((a, b) => a.index - b.index)
}

/**
 * Render a cloze question: replace ALL cloze markers with ___.
 */
export function renderClozeQuestion(template: string): string {
  return template.replace(/\{\{c\d+::([^}]+)\}\}/g, '___')
}

/**
 * Render a cloze answer: show ALL omitted words highlighted.
 */
export function renderClozeAnswer(template: string): string {
  return template.replace(/\{\{c\d+::([^}]+)\}\}/g, '【$1】')
}

/**
 * Build an annotated template from raw text and selected word indices.
 * Words are split by whitespace. Each selected word gets a cloze marker.
 * selectedIndices is a Map<wordIndex, clozeNumber> (1-based).
 */
export function buildClozeTemplate(
  rawText: string,
  selectedIndices: Map<number, number>
): string {
  const words = rawText.split(/(\s+)/)
  let wordIdx = 0

  return words
    .map((token) => {
      if (/^\s+$/.test(token)) return token
      const clozeNum = selectedIndices.get(wordIdx)
      wordIdx++
      if (clozeNum !== undefined) {
        return `{{c${clozeNum}::${token}}}`
      }
      return token
    })
    .join('')
}

/**
 * Strip cloze markers from template, showing all words normally.
 * Useful for display_pergunta in browse mode.
 */
export function stripClozeMarkers(template: string): string {
  return template.replace(/\{\{c\d+::([^}]+)\}\}/g, '[$1]')
}
