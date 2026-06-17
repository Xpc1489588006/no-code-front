interface StreamSseOptions {
  url: string
  signal?: AbortSignal
  withCredentials?: boolean
  onMessage: (payload: string, event: string) => void
}

const parseErrorMessage = async (response: Response) => {
  const text = await response.text()
  if (!text) {
    return `请求失败（${response.status}）`
  }

  try {
    const data = JSON.parse(text)
    return data?.message || data?.msg || text
  } catch {
    return text
  }
}

export const streamSse = async ({ url, signal, withCredentials, onMessage }: StreamSseOptions) => {
  const response = await fetch(url, {
    method: 'GET',
    credentials: withCredentials ? 'include' : 'same-origin',
    headers: {
      Accept: 'text/event-stream',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream')) {
    throw new Error(await parseErrorMessage(response))
  }

  if (!response.body) {
    throw new Error('服务端未返回可读取的数据流')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let eventName = 'message'
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })

    let lineBreakIndex = buffer.indexOf('\n')
    while (lineBreakIndex !== -1) {
      const rawLine = buffer.slice(0, lineBreakIndex)
      buffer = buffer.slice(lineBreakIndex + 1)
      const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine

      if (!line) {
        eventName = 'message'
      } else if (line.startsWith('event:')) {
        eventName = line.slice(6).trim() || 'message'
      } else if (line.startsWith('data:')) {
        onMessage(line.slice(5).trimStart(), eventName)
      }

      lineBreakIndex = buffer.indexOf('\n')
    }

    if (done) {
      if (buffer.trim()) {
        const trailingLine = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer
        if (trailingLine.startsWith('data:')) {
          onMessage(trailingLine.slice(5).trimStart(), eventName)
        }
      }
      break
    }
  }
}
