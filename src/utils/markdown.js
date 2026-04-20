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

  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')

  return result
}

function flushParagraph(lines, output) {
  if (!lines.length) return
  output.push(`<p>${parseInlineMarkdown(lines.join(' '))}</p>`)
  lines.length = 0
}

function flushList(items, output) {
  if (!items.length) return
  output.push(`<ul>${items.map((item) => `<li>${parseInlineMarkdown(item)}</li>`).join('')}</ul>`)
  items.length = 0
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
  let inCodeBlock = false
  let codeBlockLines = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      flushParagraph(paragraphLines, output)
      flushList(listItems, output)

      if (!inCodeBlock) {
        inCodeBlock = true
        codeBlockLines = []
      } else {
        const code = escapeHtml(codeBlockLines.join('\n'))
        output.push(`<pre><code>${code}</code></pre>`)
        inCodeBlock = false
        codeBlockLines = []
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    if (!trimmed) {
      flushParagraph(paragraphLines, output)
      flushList(listItems, output)
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph(paragraphLines, output)
      flushList(listItems, output)
      const level = headingMatch[1].length
      output.push(`<h${level}>${parseInlineMarkdown(headingMatch[2])}</h${level}>`)
      continue
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (listMatch) {
      flushParagraph(paragraphLines, output)
      listItems.push(listMatch[1])
      continue
    }

    flushList(listItems, output)
    paragraphLines.push(trimmed)
  }

  if (inCodeBlock) {
    const code = escapeHtml(codeBlockLines.join('\n'))
    output.push(`<pre><code>${code}</code></pre>`)
  }

  flushParagraph(paragraphLines, output)
  flushList(listItems, output)

  return output.join('')
}
