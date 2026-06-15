import { useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

function App() {
  const [startUrl, setStartUrl] = useState('https://sece.ac.in')
  const [question, setQuestion] = useState('Has anyone in the college done the Gradient pattern?')
  const [answer, setAnswer] = useState('')
  const [evidence, setEvidence] = useState([])
  const [status, setStatus] = useState('')

  const reindex = async () => {
    setStatus('Indexing website...')
    const response = await fetch(`${API_BASE}/api/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startUrl, maxPages: 20 })
    })

    const data = await response.json()
    if (!response.ok) {
      setStatus(data.error || 'Indexing failed')
      return
    }

    setStatus(`Indexed ${data.pagesIndexed} pages and ${data.chunksIndexed} chunks`)
  }

  const ask = async () => {
    setStatus('Finding answer from official records...')
    const response = await fetch(`${API_BASE}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, topK: 3 })
    })

    const data = await response.json()
    if (!response.ok) {
      setStatus(data.error || 'Query failed')
      return
    }

    setAnswer(data.answer)
    setEvidence(data.evidence || [])
    setStatus('')
  }

  return (
    <main className="app-shell">
      <h1>SECE Intelligent RAG Assistant</h1>
      <p className="subtitle">Queries are answered only from indexed Sri Eshwar College official records.</p>

      <section className="card">
        <h2>Knowledge Sync</h2>
        <label htmlFor="url">Start URL</label>
        <input id="url" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} />
        <button onClick={reindex}>Re-index Website</button>
      </section>

      <section className="card">
        <h2>Ask a Deep Context Query</h2>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} />
        <button onClick={ask}>Ask</button>
      </section>

      <section className="card">
        <h2>Answer</h2>
        <p>{answer || 'No answer yet.'}</p>
        {evidence.length > 0 && (
          <ul>
            {evidence.map((item) => (
              <li key={`${item.sourceUrl}-${item.score}`}>
                {item.sourceUrl} (score: {item.score})
              </li>
            ))}
          </ul>
        )}
        {status && <p className="status">{status}</p>}
      </section>
    </main>
  )
}

export default App
