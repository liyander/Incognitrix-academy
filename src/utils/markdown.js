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

function isLikelyHtmlSnippet(lines) {
  const meaningfulLines = lines
    .map((line) => line.trim())
    .filter(Boolean)

  if (meaningfulLines.length < 2) {
    return false
  }

  const firstLine = meaningfulLines[0]
  const lastLine = meaningfulLines[meaningfulLines.length - 1]

  if (!/^<[^>]+>$/.test(firstLine) || !/^<\/[^>]+>$/.test(lastLine)) {
    return false
  }

  return meaningfulLines.some((line) => /<[^>]+>/.test(line))
}

function flushParagraph(lines, output) {
  if (!lines.length) return

  if (isLikelyHtmlSnippet(lines)) {
    output.push(`<pre><code>${escapeHtml(lines.join('\n').replace(/\n+$/, ''))}</code></pre>`)
    lines.length = 0
    return
  }

  // Treat a solitary single-backtick line as a block instead of inline code
  if (lines.length === 1) {
    const text = lines[0].trim()
    if (text.startsWith('`') && text.endsWith('`') && !text.startsWith('```')) {
      const code = text.slice(1, -1)
      output.push(`<pre><code>${escapeHtml(code)}</code></pre>`)
      lines.length = 0
      return
    }
  }

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
  let source = String(markdown || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!source.trim()) {
    return "<p></p>";
  }

  const blockTokens = [];
  source = source.replace(/^[ \t]*(`{3,}|~{3,})[ \t]*([a-zA-Z0-9_-]*)[ \t]*\n([\s\S]*?)(?:\n[ \t]*\1[ \t]*$|$)/gm, (match, fence, lang, code) => {
    const indentMatch = match.match(/^[ \t]*/);
    const indent = indentMatch ? indentMatch[0] : "";
    let processedCode = code;
    if (indent) {
      const lines = code.split("\n");
      const allIndented = lines.every(line => !line || line.startsWith(indent));
      if (allIndented) {
        processedCode = lines.map(line => line.startsWith(indent) ? line.slice(indent.length) : line).join("\n");
      }
    }
    const token = `__BLOCK_TOKEN_${blockTokens.length}__`;
    blockTokens.push({ lang: lang.trim(), code: processedCode });
    return token;
  });

  const lines = source.split("\n");
  const output = [];
  const paragraphLines = [];
  const listItems = [];
  let listType = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isIndentedCodeLine(line, lines, i)) {
      flushParagraph(paragraphLines, output);
      flushList(listItems, output, listType);
      listType = null;

      const indentedLines = [stripCodeIndent(line)];
      while (
        i + 1 < lines.length &&
        (isIndentedCodeLine(lines[i + 1], lines, i + 1) || !lines[i + 1].trim())
      ) {
        i += 1;
        if (lines[i].trim()) {
          indentedLines.push(stripCodeIndent(lines[i]));
        } else {
          indentedLines.push("");
        }
      }

      while (indentedLines.length > 0 && !indentedLines[indentedLines.length - 1].trim()) {
        indentedLines.pop();
      }

      output.push(`<pre><code>${escapeHtml(indentedLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (!trimmed) {
      flushParagraph(paragraphLines, output);
      flushList(listItems, output, listType);
      listType = null;
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph(paragraphLines, output);
      flushList(listItems, output, listType);
      listType = null;

      const blockquoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        blockquoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      i -= 1;

      output.push(`<blockquote>${parseMarkdownToHtml(blockquoteLines.join("\n"))}</blockquote>`);
      continue;
    }

    if (trimmed.startsWith("#")) {
      flushParagraph(paragraphLines, output);
      flushList(listItems, output, listType);
      listType = null;

      let level = 0;
      while (level < trimmed.length && trimmed[level] === "#") {
        level += 1;
      }
      if (level > 0 && level <= 6 && trimmed[level] === " ") {
        const text = parseInlineMarkdown(trimmed.slice(level + 1).trim());
        output.push(`<h${level}>${text}</h${level}>`);
        continue;
      }
    }

    if (trimmed.match(/^---+$/) || trimmed.match(/^\*\*\*+$/)) {
      flushParagraph(paragraphLines, output);
      flushList(listItems, output, listType);
      listType = null;
      output.push("<hr />");
      continue;
    }

    if (isTableSeparator(line)) {
      flushList(listItems, output, listType);
      listType = null;

      if (paragraphLines.length) {
        const headerRow = paragraphLines.pop();
        flushParagraph(paragraphLines, output);

        const headers = splitTableRow(headerRow);
        const alignments = splitTableRow(line).map((cell) => {
          if (cell.startsWith(":") && cell.endsWith(":")) return "center";
          if (cell.endsWith(":")) return "right";
          return "left";
        });

        output.push("<div class=\"overflow-x-auto my-4\"><table class=\"w-full text-sm border-collapse\">");
        output.push("<thead><tr>");
        headers.forEach((header, index) => {
          const align = alignments[index] || "left";
          output.push(`<th class="text-${align} p-2 border-b border-white/10">${parseInlineMarkdown(header)}</th>`);
        });
        output.push("</tr></thead><tbody>");

        while (i + 1 < lines.length) {
          const nextTrimmed = lines[i + 1].trim();
          if (!nextTrimmed.startsWith("|") && !nextTrimmed.endsWith("|")) {
            break;
          }
          i += 1;
          const cells = splitTableRow(nextTrimmed);
          output.push("<tr>");
          cells.forEach((cell, index) => {
            const align = alignments[index] || "left";
            output.push(`<td class="text-${align} p-2 border-b border-white/5">${parseInlineMarkdown(cell)}</td>`);
          });
          output.push("</tr>");
        }
        output.push("</tbody></table></div>");
        continue;
      }
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("+ ")) {
      flushParagraph(paragraphLines, output);
      if (listType === "ol") {
        flushList(listItems, output, listType);
        listType = "ul";
      } else {
        listType = "ul";
      }
      listItems.push(trimmed.slice(2).trim());
      continue;
    }

    if (trimmed.match(/^\d+\.\s/)) {
      flushParagraph(paragraphLines, output);
      if (listType === "ul") {
        flushList(listItems, output, listType);
        listType = "ol";
      } else {
        listType = "ol";
      }
      listItems.push(trimmed.replace(/^\d+\.\s/, "").trim());
      continue;
    }

    if (listType && (line.startsWith("  ") || line.startsWith("\t"))) {
      listItems[listItems.length - 1] += "\n" + trimmed;
      continue;
    }

    if (listType && !trimmed.startsWith("  ") && !trimmed.startsWith("\t")) {
      flushList(listItems, output, listType);
      listType = null;
    }

    paragraphLines.push(line);
  }

  flushParagraph(paragraphLines, output);
  flushList(listItems, output, listType);

  let html = output.join("\n");
  
  html = html.replace(/<p>\s*__BLOCK_TOKEN_(\d+)__\s*<\/p>|__BLOCK_TOKEN_(\d+)__/g, (match, id1, id2) => {
    const id = id1 !== undefined ? id1 : id2;
    if (!id) return match;
    const tokenData = blockTokens[Number(id)];
    if (!tokenData) return match;
    
    const { lang, code } = tokenData;
    const codeHtml = escapeHtml(code);
    const className = lang ? ` class="language-${escapeHtml(lang)}"` : "";
    return `<pre><code${className}>${codeHtml}</code></pre>`;
  });

  return html;
}