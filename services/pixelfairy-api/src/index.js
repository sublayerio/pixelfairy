const pkg = require('../package.json')
const uuid = require('uuid')
const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const app = express()
const auth = require('./middleware/auth')
const handleCreateDiffReport = require('./handleCreateDiffReport')

const PORT = process.env.PORT || 3000

app.use(
    morgan('combined')
)

app.use('/assets', express.static(__dirname + '/assets'))

let jobs = []

const perf = require('execution-time')()
const createJob = ({ handler, payload }) => {

    const jobId = uuid.v4()
    perf.start(jobId)

    const job = {
        id: jobId,
        output: [],
        state: 'in_progress',
        payload,
        result: null,
        href: `${process.env.HOST}/jobs/${jobId}`
    }

    jobs.push(job)

    const logger = input => {
        console.log(input)
        job.output.push(input)
    }

    handler(job, logger)
        .then(result => {

            job.state = 'completed'
            job.result = result
        })
        .catch(e => {

            job.state = 'error'
            job.error = e.message
        })
        .finally(() => {
            const results = perf.stop(jobId)
            job.time = results.time
        })

    return job
}

app.get('/jobs/:id', async (req, res) => {

    const job = jobs.find(job => job.id === req.params.id)

    res.send({
        status: 'success',
        data: job
    })
})

app.post('/create', bodyParser.json(), async (req, res) => {

    const result = createJob({
        handler: handleCreateDiffReport,
        payload: {
            prevUrl: req.body.prevUrl,
            nextUrl: req.body.nextUrl,
        }
    })

    res.send({
        status: 'success',
        data: result
    })
})

app.get("/", (req, res) => {
    res.send({
        name: pkg.name,
        version: pkg.version
    })
})

app.listen(PORT, () =>
    console.log(`${pkg.name}@${pkg.version} running at port ${PORT}`)
)