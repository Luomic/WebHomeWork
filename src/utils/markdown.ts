function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** 轻量 Markdown 渲染器：先转义文本，再只生成受控标签，避免执行模型返回的 HTML。 */
export function renderMarkdown(source: string) {
  const lines = source.split(/\r?\n/)
  const html: string[] = []
  let inList = false
  for (const raw of lines) {
    const line = raw.trimEnd()
    const list = line.match(/^\s*[-*]\s+(.+)$/)
    if (list) {
      if (!inList) { html.push('<ul>'); inList = true }
      html.push('<li>' + inline(list[1]!) + '</li>')
      continue
    }
    if (inList) { html.push('</ul>'); inList = false }
    if (!line.trim()) { html.push('<br>'); continue }
    const heading = line.match(/^\s*(#{1,3})\s+(.+)$/)
    if (heading) { html.push(`<h${heading[1]!.length}>${inline(heading[2]!)}</h${heading[1]!.length}>`); continue }
    html.push('<p>' + inline(line) + '</p>')
  }
  if (inList) html.push('</ul>')
  return html.join('')
}

function inline(value: string) {
  let text = escapeHtml(value)
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>')
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  return text
}
