'use strict'

const { parentPort, workerData } = require('worker_threads')
const pdfParse = require('pdf-parse-legacy')

const buf = Buffer.isBuffer(workerData) ? workerData : Buffer.from(workerData)

pdfParse(buf)
  .then((data) => {
    parentPort.postMessage({ ok: true, text: data && data.text != null ? String(data.text) : '' })
  })
  .catch((err) => {
    parentPort.postMessage({
      ok: false,
      error: err && err.message ? String(err.message) : String(err),
    })
  })
