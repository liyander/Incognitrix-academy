function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function parseInlineMarkdown(text) {
  let result = escapeHtml(text)
  const codeTokens = []

  result = result.replace(/`([^`]+)`/g, (_match, code) => {
    const token = `@@CODE_TOKEN_${codeTokens.length}@@`
    codeTokens.push(code)
    return token
  })

  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>')

  result = result.replace(/@@CODE_TOKEN_(\d+)@@/g, (_match, index) => {
    const code = codeTokens[Number(index)] || ''
    return `<code>${code}</code>`
  })

  return result
}

function flushParagraph(lines, output) {
  if (!lines.length) return
  output.push(`<p>${parseInlineMarkdown(lines.join('\n')).replace(/\n/g, '<br />')}</p>`)
  lines.length = 0
}

function flushList(items, output, listType) {
  if (!items.length) return
  const tag = listType === 'ol' ? 'ol' : 'ul'
  output.push(`<${tag}>${items.map((item) => `<li>${parseInlineMarkdown(item)}</li>`).join('')}</${tag}>`)
  items.length = 0
}

function splitTableRow(row) {
  const normalized = row.trim().replace(/^\|/, '').replace(/\|$/, '')
  return normalized.split('|').map((cell) => cell.trim())
}

function isTableSeparator(line) {
  return /^\|?\s*:?-{3,}:?(\s*\|\s*:?-{3,}:?)+\s*\|?$/.test(line.trim())
}

export function parseMarkdownToHtml(markdown) {
  const source = String(markdown || '').replace(/\r\n/g, '\n')
  if (!source.trim()) {
    return '<p></p>'
  }

  const lines = source.split('\n')
  const output = []
  const paragraphLines = []
  const listItems = []
  let listType = null
  let inCodeBlock = false
  let codeBlockLines = []
  let codeLanguage = ''

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      flushParagraph(paragraphLines, output)
      flushList(listItems, output, listType)
      listType = null

      if (!inCodeBlock) {
        inCodeBlock = true
        codeBlockLines = []
        codeLanguage = trimmed.slice(3).trim().toLowerCase()
      } else {
        const code = escapeHtml(codeBlockLines.join('\n'))
        const className = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ''
        output.push(`<pre><code${className}>${code}</code></pre>`)
        inCodeBlock = false
        codeBlockLines = []
        codeLanguage = ''
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    if (!trimmed) {
      flushParagraph(paragraphLines, output)
      flushList(listItems, output, listType)
      listType = null
      continue
    }

    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      flushParagraph(paragraphLines, output)
      flushList(listItems, output, listType)
      listType = null
      output.push('<hr />')
      continue
    }

    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushParagraph(paragraphLines, output)
      flushList(listItems, output, listType)
      listType = null

      const headerCells = splitTableRow(trimmed)
      const bodyRows = []
      i += 2

      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim()) {
        bodyRows.push(splitTableRow(lines[i]))
        i += 1
      }

      i -= 1

      const headerHtml = `<tr>${headerCells
        .map((cell) => `<th>${parseInlineMarkdown(cell)}</th>`)
        .join('')}</tr>`
      const bodyHtml = bodyRows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${parseInlineMarkdown(cell)}</td>`)
              .join('')}</tr>`,
        )
        .join('')

      output.push(`<table><thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody></table>`)
      continue
    }

    if (trimmed.startsWith('>')) {
      flushParagraph(paragraphLines, output)
      flushList(listItems, output, listType)
      listType = null

      const blockquoteLines = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        blockquoteLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i += 1
      }
      i -= 1

      output.push(`<blockquote>${parseMarkdownToHtml(blockquoteLines.join('\n'))}</blockquote>`)
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph(paragraphLines, output)
      flushList(listItems, output, listType)
      listType = null
      const level = headingMatch[1].length
      output.push(`<h${level}>${parseInlineMarkdown(headingMatch[2])}</h${level}>`)
      continue
    }

    const unorderedListMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    if (unorderedListMatch) {
      flushParagraph(paragraphLines, output)
      if (listType && listType !== 'ul') {
        flushList(listItems, output, listType)
      }
      listType = 'ul'
      listItems.push(unorderedListMatch[1])
      continue
    }

    const orderedListMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (orderedListMatch) {
      flushParagraph(paragraphLines, output)
      if (listType && listType !== 'ol') {
        flushList(listItems, output, listType)
      }
      listType = 'ol'
      listItems.push(orderedListMatch[1])
      continue
    }

    flushList(listItems, output, listType)
    listType = null
    paragraphLines.push(trimmed)
  }

  if (inCodeBlock) {
    const code = escapeHtml(codeBlockLines.join('\n'))
    const className = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ''
    output.push(`<pre><code${className}>${code}</code></pre>`)
  }

  flushParagraph(paragraphLines, output)
  flushList(listItems, output, listType)

  return output.join('')
}
