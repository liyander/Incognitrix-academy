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
    const token = `\uE000${codeTokens.length}\uE001`
    codeTokens.push(code)
    return token
  })

  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // Avoid turning identifiers_like_this into italic text.
  result = result.replace(/(^|[^\w])_([^_]+)_([^\w]|$)/g, '$1<em>$2</em>$3')

  result = result.replace(/\uE000(\d+)\uE001/g, (_match, index) => {
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

function isStandardIndentedCodeLine(line) {
  return /^( {4,}|\t)/.test(line)
}

function isContextualIndentedCodeLine(line, lines, index) {
  if (!/^ {2,}\S/.test(line) || isStandardIndentedCodeLine(line)) {
    return false
  }

  if (index < 1 || lines[index - 1].trim()) {
    return false
  }

  let previousNonEmptyIndex = index - 2
  while (previousNonEmptyIndex >= 0 && !lines[previousNonEmptyIndex].trim()) {
    previousNonEmptyIndex -= 1
  }

  if (previousNonEmptyIndex < 0) {
    return false
  }

  return /[:：]$/.test(lines[previousNonEmptyIndex].trim())
}

function isIndentedCodeLine(line, lines, index) {
  return (
    isStandardIndentedCodeLine(line) ||
    isContextualIndentedCodeLine(line, lines, index)
  )
}

function stripCodeIndent(line) {
  if (line.startsWith('\t')) {
    return line.slice(1)
  }

  const spaces = (line.match(/^ +/) || [''])[0].length
  if (spaces >= 4) {
    return line.slice(4)
  }

  if (spaces >= 2) {
    return line.slice(2)
  }

  return line
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

    // Support standard indented code blocks and contextual 2-space blocks after labels.
    if (isIndentedCodeLine(line, lines, i)) {
      flushParagraph(paragraphLines, output)
      flushList(listItems, output, listType)
      listType = null

      const indentedLines = [stripCodeIndent(line)]
      while (
        i + 1 < lines.length &&
        (isIndentedCodeLine(lines[i + 1], lines, i + 1) || !lines[i + 1].trim())
      ) {
        i += 1
        const nextLine = lines[i]
        indentedLines.push(nextLine.trim() ? stripCodeIndent(nextLine) : '')
      }

      const code = escapeHtml(indentedLines.join('\n').replace(/\n+$/, ''))
      output.push(`<pre><code>${code}</code></pre>`)
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
