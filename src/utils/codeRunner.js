// In-browser code runner for the Lab Research code lab.
// JavaScript runs inside a sandboxed Web Worker with a hard timeout.
// Python runs through Pyodide (CPython compiled to WebAssembly), loaded on demand.

const RUN_TIMEOUT_MS = 8000
const PYODIDE_VERSION = '0.26.4'
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

export function isRunnableInBrowser(language) {
  return ['javascript', 'python'].includes(String(language || '').toLowerCase())
}

function deepEqual(a, b) {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (typeof a === 'number') return Number.isNaN(a) && Number.isNaN(b)
  if (a === null || b === null || typeof a !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => deepEqual(a[key], b[key]))
}

// Compares the produced value with the expected output text. The expected
// output is authored as JSON when possible, so parse both sides and compare
// structurally; otherwise fall back to trimmed string comparison.
export function outputsMatch(expectedOutput, actualSerialized) {
  const expectedText = String(expectedOutput ?? '').trim()
  const actualText = String(actualSerialized ?? '').trim()
  if (expectedText === actualText) return true
  try {
    return deepEqual(JSON.parse(expectedText), JSON.parse(actualText))
  } catch {
    // Also tolerate an expected plain string vs a JSON-quoted string.
    try {
      const parsedActual = JSON.parse(actualText)
      return typeof parsedActual === 'string' && parsedActual.trim() === expectedText
    } catch {
      return false
    }
  }
}

function buildResult(testCase, index, { passed, actualOutput = '', detail = '' }) {
  return {
    index: index + 1,
    description: testCase.description || `Test case ${index + 1}`,
    input: testCase.input,
    expectedOutput: testCase.expectedOutput,
    actualOutput,
    passed,
    detail,
  }
}

const JS_WORKER_SOURCE = `
self.onmessage = function (event) {
  var code = event.data.code
  var tests = event.data.tests
  var results = []
  var solve
  try {
    var factory = new Function(code + '\\n;return (typeof solve === "function") ? solve : undefined;')
    solve = factory()
  } catch (error) {
    self.postMessage({ error: 'Your code failed to load: ' + (error && error.message ? error.message : String(error)) })
    return
  }
  if (typeof solve !== 'function') {
    self.postMessage({ error: 'No solve(input) function was found in your code.' })
    return
  }
  for (var i = 0; i < tests.length; i += 1) {
    try {
      var output = solve(tests[i].input)
      var serialized = output === undefined ? 'undefined' : JSON.stringify(output)
      results.push({ ok: true, output: serialized })
    } catch (error) {
      results.push({ ok: false, message: (error && error.message ? error.message : String(error)) })
    }
  }
  self.postMessage({ results: results })
}
`

function runJavaScriptTests(code, testCases) {
  return new Promise((resolve) => {
    const blob = new Blob([JS_WORKER_SOURCE], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    const worker = new Worker(workerUrl)
    let settled = false

    const finish = (value) => {
      if (settled) return
      settled = true
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
      resolve(value)
    }

    const timeoutId = setTimeout(() => {
      finish(testCases.map((testCase, index) => buildResult(testCase, index, {
        passed: false,
        detail: `Execution timed out after ${RUN_TIMEOUT_MS / 1000}s — check for infinite loops.`,
      })))
    }, RUN_TIMEOUT_MS)

    worker.onmessage = (event) => {
      clearTimeout(timeoutId)
      if (event.data?.error) {
        finish(testCases.map((testCase, index) => buildResult(testCase, index, {
          passed: false,
          detail: event.data.error,
        })))
        return
      }
      const runs = Array.isArray(event.data?.results) ? event.data.results : []
      finish(testCases.map((testCase, index) => {
        const run = runs[index]
        if (!run) {
          return buildResult(testCase, index, { passed: false, detail: 'The test did not run.' })
        }
        if (!run.ok) {
          return buildResult(testCase, index, { passed: false, detail: `Runtime error: ${run.message}` })
        }
        const passed = outputsMatch(testCase.expectedOutput, run.output)
        return buildResult(testCase, index, {
          passed,
          actualOutput: run.output,
          detail: passed ? '' : 'Output does not match the expected output.',
        })
      }))
    }

    worker.onerror = (event) => {
      clearTimeout(timeoutId)
      finish(testCases.map((testCase, index) => buildResult(testCase, index, {
        passed: false,
        detail: `Your code failed to load: ${event.message || 'unknown error'}`,
      })))
    }

    worker.postMessage({ code, tests: testCases.map((testCase) => ({ input: testCase.input })) })
  })
}

let pyodidePromise = null

function loadPyodideRuntime() {
  if (pyodidePromise) return pyodidePromise
  pyodidePromise = new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      resolve(window.loadPyodide({ indexURL: PYODIDE_BASE_URL }))
      return
    }
    const script = document.createElement('script')
    script.src = `${PYODIDE_BASE_URL}pyodide.js`
    script.onload = () => {
      window.loadPyodide({ indexURL: PYODIDE_BASE_URL }).then(resolve, reject)
    }
    script.onerror = () => {
      reject(new Error('Failed to load the Python runtime. Check your internet connection and try again.'))
    }
    document.head.appendChild(script)
  }).catch((error) => {
    pyodidePromise = null
    throw error
  })
  return pyodidePromise
}

async function runPythonTests(code, testCases, { onStatus } = {}) {
  onStatus?.('Loading Python runtime (first run only)...')
  let pyodide
  try {
    pyodide = await loadPyodideRuntime()
  } catch (error) {
    return testCases.map((testCase, index) => buildResult(testCase, index, {
      passed: false,
      detail: error.message,
    }))
  }
  onStatus?.('Running tests...')

  try {
    pyodide.runPython(`
import json
__lab_namespace = {}
`)
    pyodide.globals.set('__lab_code', code)
    pyodide.runPython('exec(__lab_code, __lab_namespace)')
    const hasSolve = pyodide.runPython('"solve" in __lab_namespace and callable(__lab_namespace["solve"])')
    if (!hasSolve) {
      return testCases.map((testCase, index) => buildResult(testCase, index, {
        passed: false,
        detail: 'No solve(input) function was found in your code.',
      }))
    }
  } catch (error) {
    const message = String(error?.message || error).split('\n').filter(Boolean).slice(-3).join(' ')
    return testCases.map((testCase, index) => buildResult(testCase, index, {
      passed: false,
      detail: `Your code failed to load: ${message}`,
    }))
  }

  const results = []
  for (const [index, testCase] of testCases.entries()) {
    try {
      pyodide.globals.set('__lab_input', testCase.input)
      const serialized = pyodide.runPython(
        'json.dumps(__lab_namespace["solve"](__lab_input))',
      )
      const passed = outputsMatch(testCase.expectedOutput, serialized)
      results.push(buildResult(testCase, index, {
        passed,
        actualOutput: serialized,
        detail: passed ? '' : 'Output does not match the expected output.',
      }))
    } catch (error) {
      const message = String(error?.message || error).split('\n').filter(Boolean).slice(-3).join(' ')
      results.push(buildResult(testCase, index, { passed: false, detail: `Runtime error: ${message}` }))
    }
  }
  return results
}

// Runs the submitted code against every test case in the browser.
// Returns { results, passed } where each result mirrors the backend shape.
export async function runCodeAgainstTests({ language, code, testCases, onStatus }) {
  const cases = Array.isArray(testCases) ? testCases : []
  if (!cases.length) {
    return { passed: false, results: [] }
  }
  const normalizedLanguage = String(language || '').toLowerCase()
  let results
  if (normalizedLanguage === 'python') {
    results = await runPythonTests(code, cases, { onStatus })
  } else {
    results = await runJavaScriptTests(code, cases)
  }
  return {
    passed: results.length > 0 && results.every((item) => item.passed),
    results,
  }
}
